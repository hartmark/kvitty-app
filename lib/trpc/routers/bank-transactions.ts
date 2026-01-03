import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { generateObject } from "ai";
import { router, workspaceProcedure } from "../init";
import { bankTransactions, fiscalPeriods, auditLogs, bankAccounts, journalEntries } from "@/lib/db/schema";
import { eq, and, isNull, or } from "drizzle-orm";
import {
  createBankTransactionsSchema,
  updateBankTransactionSchema,
} from "@/lib/validations/bank-transaction";
import { bankTransactionModel } from "@/lib/ai";
import { parseCSV, parseOFX, detectFileFormat } from "@/lib/utils/bank-import";

export const bankTransactionsRouter = router({
  list: workspaceProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        periodId: z.string().optional(),
        bankAccountId: z.string().optional(),
        unmappedOnly: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(bankTransactions.workspaceId, ctx.workspaceId)];

      if (input.periodId) {
        conditions.push(eq(bankTransactions.fiscalPeriodId, input.periodId));
      }

      if (input.bankAccountId) {
        conditions.push(eq(bankTransactions.bankAccountId, input.bankAccountId));
      }

      if (input.unmappedOnly) {
        conditions.push(isNull(bankTransactions.mappedToJournalEntryId));
      }

      const items = await ctx.db.query.bankTransactions.findMany({
        where: and(...conditions),
        orderBy: (v, { desc }) => [desc(v.accountingDate), desc(v.createdAt)],
        with: {
          createdByUser: {
            columns: { id: true, name: true, email: true },
          },
          bankAccount: true,
          mappedToJournalEntry: true,
        },
      });

      return items;
    }),

  get: workspaceProcedure
    .input(z.object({ workspaceId: z.string(), bankTransactionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const transaction = await ctx.db.query.bankTransactions.findFirst({
        where: and(
          eq(bankTransactions.id, input.bankTransactionId),
          eq(bankTransactions.workspaceId, ctx.workspaceId)
        ),
        with: {
          attachments: true,
          comments: {
            orderBy: (c, { desc }) => [desc(c.createdAt)],
            with: {
              createdByUser: {
                columns: { id: true, name: true, email: true },
              },
            },
          },
          createdByUser: {
            columns: { id: true, name: true, email: true },
          },
          bankAccount: true,
          mappedToJournalEntry: true,
        },
      });

      if (!transaction) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return transaction;
    }),

  create: workspaceProcedure
    .input(createBankTransactionsSchema.extend({ workspaceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify period belongs to workspace
      const period = await ctx.db.query.fiscalPeriods.findFirst({
        where: and(
          eq(fiscalPeriods.id, input.fiscalPeriodId),
          eq(fiscalPeriods.workspaceId, ctx.workspaceId)
        ),
      });

      if (!period) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid period",
        });
      }

      // Verify bank account if provided
      if (input.bankAccountId) {
        const bankAccount = await ctx.db.query.bankAccounts.findFirst({
          where: and(
            eq(bankAccounts.id, input.bankAccountId),
            eq(bankAccounts.workspaceId, ctx.workspaceId)
          ),
        });

        if (!bankAccount) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid bank account",
          });
        }
      }

      const created = await ctx.db
        .insert(bankTransactions)
        .values(
          input.bankTransactions.map((v) => ({
            workspaceId: ctx.workspaceId,
            fiscalPeriodId: input.fiscalPeriodId,
            bankAccountId: input.bankAccountId || null,
            office: v.office,
            accountingDate: v.accountingDate,
            ledgerDate: v.ledgerDate,
            currencyDate: v.currencyDate,
            reference: v.reference,
            amount: v.amount?.toString(),
            bookedBalance: v.bookedBalance?.toString(),
            importedAt: input.importedAt ? new Date(input.importedAt) : null,
            createdBy: ctx.session.user.id,
          }))
        )
        .returning();

      // Create audit logs
      await ctx.db.insert(auditLogs).values(
        created.map((v) => ({
          workspaceId: ctx.workspaceId,
          userId: ctx.session.user.id,
          action: "create",
          entityType: "bank_transaction",
          entityId: v.id,
          changes: { after: v },
        }))
      );

      return created;
    }),

  update: workspaceProcedure
    .input(
      updateBankTransactionSchema.extend({
        workspaceId: z.string(),
        bankTransactionId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.bankTransactions.findFirst({
        where: and(
          eq(bankTransactions.id, input.bankTransactionId),
          eq(bankTransactions.workspaceId, ctx.workspaceId)
        ),
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const [updated] = await ctx.db
        .update(bankTransactions)
        .set({
          office: input.office,
          accountingDate: input.accountingDate,
          ledgerDate: input.ledgerDate,
          currencyDate: input.currencyDate,
          reference: input.reference,
          amount: input.amount?.toString(),
          bookedBalance: input.bookedBalance?.toString(),
          updatedAt: new Date(),
        })
        .where(eq(bankTransactions.id, input.bankTransactionId))
        .returning();

      // Create audit log
      await ctx.db.insert(auditLogs).values({
        workspaceId: ctx.workspaceId,
        userId: ctx.session.user.id,
        action: "update",
        entityType: "bank_transaction",
        entityId: input.bankTransactionId,
        changes: { before: existing, after: updated },
      });

      return updated;
    }),

  delete: workspaceProcedure
    .input(z.object({ workspaceId: z.string(), bankTransactionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.bankTransactions.findFirst({
        where: and(
          eq(bankTransactions.id, input.bankTransactionId),
          eq(bankTransactions.workspaceId, ctx.workspaceId)
        ),
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await ctx.db
        .delete(bankTransactions)
        .where(eq(bankTransactions.id, input.bankTransactionId));

      // Create audit log
      await ctx.db.insert(auditLogs).values({
        workspaceId: ctx.workspaceId,
        userId: ctx.session.user.id,
        action: "delete",
        entityType: "bank_transaction",
        entityId: input.bankTransactionId,
        changes: { before: existing },
      });

      return { success: true };
    }),

  mapToJournalEntry: workspaceProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        bankTransactionId: z.string(),
        journalEntryId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const transaction = await ctx.db.query.bankTransactions.findFirst({
        where: and(
          eq(bankTransactions.id, input.bankTransactionId),
          eq(bankTransactions.workspaceId, ctx.workspaceId)
        ),
      });

      if (!transaction) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Bank transaction not found" });
      }

      const journalEntry = await ctx.db.query.journalEntries.findFirst({
        where: and(
          eq(journalEntries.id, input.journalEntryId),
          eq(journalEntries.workspaceId, ctx.workspaceId)
        ),
      });

      if (!journalEntry) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Journal entry not found" });
      }

      const [updated] = await ctx.db
        .update(bankTransactions)
        .set({
          mappedToJournalEntryId: input.journalEntryId,
          updatedAt: new Date(),
        })
        .where(eq(bankTransactions.id, input.bankTransactionId))
        .returning();

      await ctx.db.insert(auditLogs).values({
        workspaceId: ctx.workspaceId,
        userId: ctx.session.user.id,
        action: "update",
        entityType: "bank_transaction",
        entityId: input.bankTransactionId,
        changes: { before: transaction, after: updated },
      });

      return updated;
    }),

  unmapFromJournalEntry: workspaceProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        bankTransactionId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const transaction = await ctx.db.query.bankTransactions.findFirst({
        where: and(
          eq(bankTransactions.id, input.bankTransactionId),
          eq(bankTransactions.workspaceId, ctx.workspaceId)
        ),
      });

      if (!transaction) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const [updated] = await ctx.db
        .update(bankTransactions)
        .set({
          mappedToJournalEntryId: null,
          updatedAt: new Date(),
        })
        .where(eq(bankTransactions.id, input.bankTransactionId))
        .returning();

      await ctx.db.insert(auditLogs).values({
        workspaceId: ctx.workspaceId,
        userId: ctx.session.user.id,
        action: "update",
        entityType: "bank_transaction",
        entityId: input.bankTransactionId,
        changes: { before: transaction, after: updated },
      });

      return updated;
    }),

  analyzeContent: workspaceProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        content: z.string().min(1).max(50000),
      })
    )
    .mutation(async ({ input }) => {
      const result = await generateObject({
        model: bankTransactionModel,
        schema: z.object({
          bankTransactions: z.array(
            z.object({
              office: z.string().nullable(),
              accountingDate: z.string().nullable(),
              reference: z.string().nullable(),
              amount: z.number().nullable(),
            })
          ),
        }),
        prompt: `Extract bank transaction data from the following content.

For each row/transaction found, extract:
- office: Account number or office code (if present)
- accountingDate: Date in YYYY-MM-DD format (if present)
- reference: Description, memo, or reference text
- amount: Numeric amount (negative for debits/expenses, positive for credits)

Return only the extracted data, no explanations.

Content to analyze:
${input.content}`,
      });

      return result.object;
    }),

  import: workspaceProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        fiscalPeriodId: z.string(),
        bankAccountId: z.string().optional(),
        fileContent: z.string(),
        fileName: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const period = await ctx.db.query.fiscalPeriods.findFirst({
        where: and(
          eq(fiscalPeriods.id, input.fiscalPeriodId),
          eq(fiscalPeriods.workspaceId, ctx.workspaceId)
        ),
      });

      if (!period) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid period",
        });
      }

      if (input.bankAccountId) {
        const bankAccount = await ctx.db.query.bankAccounts.findFirst({
          where: and(
            eq(bankAccounts.id, input.bankAccountId),
            eq(bankAccounts.workspaceId, ctx.workspaceId)
          ),
        });

        if (!bankAccount) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid bank account",
          });
        }
      }

      const format = detectFileFormat(input.fileName, input.fileContent);
      let parsedTransactions: Array<{
        accountingDate: string;
        amount: number;
        reference: string;
        bookedBalance?: number;
      }>;

      try {
        if (format === "ofx") {
          parsedTransactions = parseOFX(input.fileContent);
        } else if (format === "csv") {
          parsedTransactions = parseCSV(input.fileContent);
        } else {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Filen måste vara CSV eller OFX format",
          });
        }
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Kunde inte parsa filen",
        });
      }

      if (parsedTransactions.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Inga transaktioner hittades i filen",
        });
      }

      const importedAt = new Date();
      const created = await ctx.db
        .insert(bankTransactions)
        .values(
          parsedTransactions.map((t) => ({
            workspaceId: ctx.workspaceId,
            fiscalPeriodId: input.fiscalPeriodId,
            bankAccountId: input.bankAccountId || null,
            accountingDate: t.accountingDate,
            reference: t.reference || null,
            amount: t.amount.toString(),
            bookedBalance: t.bookedBalance?.toString() || null,
            importedAt,
            createdBy: ctx.session.user.id,
          }))
        )
        .returning();

      await ctx.db.insert(auditLogs).values(
        created.map((v) => ({
          workspaceId: ctx.workspaceId,
          userId: ctx.session.user.id,
          action: "create",
          entityType: "bank_transaction",
          entityId: v.id,
          changes: { after: v, imported: true },
        }))
      );

      return { count: created.length, transactions: created };
    }),
});

