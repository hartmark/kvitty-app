import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, workspaceProcedure } from "../init";
import { bankAccounts, workspaces } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import {
  createBankAccountSchema,
  updateBankAccountSchema,
} from "@/lib/validations/bank-account";
import { defaultBankAccounts } from "@/lib/consts/default-bank-accounts";
import { taxAccounts } from "@/lib/consts/tax-account";

// Helper to find account name from kontoplan
function findAccountName(accountNumber: number): string | null {
  for (const category of taxAccounts) {
    for (const subCategory of category.SubCategories) {
      const account = subCategory.Accounts.find((a) => a.Id === accountNumber);
      if (account) {
        return account.Text;
      }
    }
  }
  return null;
}

export const bankAccountsRouter = router({
  list: workspaceProcedure.query(async ({ ctx }) => {
    const accounts = await ctx.db.query.bankAccounts.findMany({
      where: eq(bankAccounts.workspaceId, ctx.workspaceId),
      orderBy: (accounts, { asc }) => [asc(accounts.sortOrder)],
    });

    return accounts;
  }),

  get: workspaceProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const account = await ctx.db.query.bankAccounts.findFirst({
        where: and(
          eq(bankAccounts.id, input.id),
          eq(bankAccounts.workspaceId, ctx.workspaceId)
        ),
      });

      if (!account) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return account;
    }),

  getByAccountNumber: workspaceProcedure
    .input(z.object({ accountNumber: z.number() }))
    .query(async ({ ctx, input }) => {
      const account = await ctx.db.query.bankAccounts.findFirst({
        where: and(
          eq(bankAccounts.accountNumber, input.accountNumber),
          eq(bankAccounts.workspaceId, ctx.workspaceId)
        ),
      });

      if (!account) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return account;
    }),

  create: workspaceProcedure
    .input(createBankAccountSchema)
    .mutation(async ({ ctx, input }) => {
      // Check for duplicate account number
      const existing = await ctx.db.query.bankAccounts.findFirst({
        where: and(
          eq(bankAccounts.workspaceId, ctx.workspaceId),
          eq(bankAccounts.accountNumber, input.accountNumber)
        ),
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Ett konto med detta nummer finns redan",
        });
      }

      // If this is set as default, unset other defaults
      if (input.isDefault) {
        await ctx.db
          .update(bankAccounts)
          .set({ isDefault: false })
          .where(eq(bankAccounts.workspaceId, ctx.workspaceId));
      }

      const [account] = await ctx.db
        .insert(bankAccounts)
        .values({
          workspaceId: ctx.workspaceId,
          accountNumber: input.accountNumber,
          name: input.name,
          description: input.description || null,
          isDefault: input.isDefault,
          sortOrder: input.sortOrder,
        })
        .returning();

      return account;
    }),

  update: workspaceProcedure
    .input(updateBankAccountSchema)
    .mutation(async ({ ctx, input }) => {
      const account = await ctx.db.query.bankAccounts.findFirst({
        where: and(
          eq(bankAccounts.id, input.id),
          eq(bankAccounts.workspaceId, ctx.workspaceId)
        ),
      });

      if (!account) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      // If setting as default, unset other defaults
      if (input.isDefault) {
        await ctx.db
          .update(bankAccounts)
          .set({ isDefault: false })
          .where(eq(bankAccounts.workspaceId, ctx.workspaceId));
      }

      const [updated] = await ctx.db
        .update(bankAccounts)
        .set({
          ...(input.name && { name: input.name }),
          ...(input.description !== undefined && { description: input.description }),
          ...(input.isDefault !== undefined && { isDefault: input.isDefault }),
          ...(input.isActive !== undefined && { isActive: input.isActive }),
          ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
          updatedAt: new Date(),
        })
        .where(eq(bankAccounts.id, input.id))
        .returning();

      return updated;
    }),

  delete: workspaceProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const account = await ctx.db.query.bankAccounts.findFirst({
        where: and(
          eq(bankAccounts.id, input.id),
          eq(bankAccounts.workspaceId, ctx.workspaceId)
        ),
      });

      if (!account) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await ctx.db.delete(bankAccounts).where(eq(bankAccounts.id, input.id));

      return { success: true };
    }),

  // Get default accounts for new workspace setup
  getDefaults: workspaceProcedure.query(async () => {
    return defaultBankAccounts.map((account) => ({
      ...account,
      kontoplanName: findAccountName(account.accountNumber),
    }));
  }),

  // Initialize default accounts for a workspace
  initializeDefaults: workspaceProcedure.mutation(async ({ ctx }) => {
    // Check if workspace is in full_bookkeeping mode
    const workspace = await ctx.db.query.workspaces.findFirst({
      where: eq(workspaces.id, ctx.workspaceId),
    });

    if (!workspace || workspace.mode !== "full_bookkeeping") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Endast tillgängligt för bokföringsläge",
      });
    }

    // Check if accounts already exist
    const existingAccounts = await ctx.db.query.bankAccounts.findMany({
      where: eq(bankAccounts.workspaceId, ctx.workspaceId),
    });

    if (existingAccounts.length > 0) {
      return existingAccounts;
    }

    // Insert default accounts
    const inserted = await ctx.db
      .insert(bankAccounts)
      .values(
        defaultBankAccounts.map((account) => ({
          workspaceId: ctx.workspaceId,
          ...account,
        }))
      )
      .returning();

    return inserted;
  }),

  // Search kontoplan for bank-related accounts
  searchKontoplan: workspaceProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ input }) => {
      const results: { accountNumber: number; name: string; category: string }[] = [];

      for (const category of taxAccounts) {
        for (const subCategory of category.SubCategories) {
          for (const account of subCategory.Accounts) {
            const matchesNumber = account.Id.toString().includes(input.query);
            const matchesText = account.Text.toLowerCase().includes(
              input.query.toLowerCase()
            );

            if (matchesNumber || matchesText) {
              results.push({
                accountNumber: account.Id,
                name: account.Text,
                category: `${category.Text} > ${subCategory.Text}`,
              });
            }

            if (results.length >= 20) break;
          }
          if (results.length >= 20) break;
        }
        if (results.length >= 20) break;
      }

      return results;
    }),
});
