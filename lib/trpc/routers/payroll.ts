import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, workspaceProcedure } from "../init";
import {
  payrollRuns,
  payrollEntries,
  employees,
  workspaces,
  journalEntries,
  journalEntryLines,
  auditLogs,
} from "@/lib/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import {
  createPayrollRunSchema,
  addPayrollEntrySchema,
  updatePayrollEntrySchema,
} from "@/lib/validations/payroll";
import {
  calculateEmployerContributions,
  extractBirthYear,
} from "@/lib/consts/employer-contribution-rates";
import { generateAGIXml } from "@/lib/utils/agi-generator";
import { decrypt } from "@/lib/utils/encryption";

export const payrollRouter = router({
  listRuns: workspaceProcedure
    .input(
      z.object({
        fiscalPeriodId: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const runs = await ctx.db.query.payrollRuns.findMany({
        where: input.fiscalPeriodId
          ? and(
              eq(payrollRuns.workspaceId, ctx.workspaceId),
              eq(payrollRuns.fiscalPeriodId, input.fiscalPeriodId)
            )
          : eq(payrollRuns.workspaceId, ctx.workspaceId),
        with: {
          entries: {
            with: {
              employee: true,
            },
          },
          createdByUser: true,
        },
        orderBy: [desc(payrollRuns.period), desc(payrollRuns.runNumber)],
        limit: input.limit,
      });

      return runs.map((run) => ({
        ...run,
        entries: run.entries.map((entry) => ({
          ...entry,
          employee: {
            ...entry.employee,
            personalNumber: decrypt(entry.employee.personalNumber),
          },
        })),
      }));
    }),

  getRun: workspaceProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const run = await ctx.db.query.payrollRuns.findFirst({
        where: and(
          eq(payrollRuns.id, input.id),
          eq(payrollRuns.workspaceId, ctx.workspaceId)
        ),
        with: {
          entries: {
            with: {
              employee: true,
            },
          },
          fiscalPeriod: true,
          journalEntry: {
            with: {
              lines: true,
            },
          },
          createdByUser: true,
        },
      });

      if (!run) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return {
        ...run,
        entries: run.entries.map((entry) => ({
          ...entry,
          employee: {
            ...entry.employee,
            personalNumber: decrypt(entry.employee.personalNumber),
          },
        })),
      };
    }),

  createRun: workspaceProcedure
    .input(createPayrollRunSchema)
    .mutation(async ({ ctx, input }) => {
      // Get next run number for this period
      const existingRuns = await ctx.db
        .select({ maxRunNumber: sql<number>`MAX(${payrollRuns.runNumber})` })
        .from(payrollRuns)
        .where(
          and(
            eq(payrollRuns.workspaceId, ctx.workspaceId),
            eq(payrollRuns.period, input.period)
          )
        );

      const runNumber = (existingRuns[0]?.maxRunNumber || 0) + 1;

      const [run] = await ctx.db
        .insert(payrollRuns)
        .values({
          workspaceId: ctx.workspaceId,
          fiscalPeriodId: input.fiscalPeriodId,
          period: input.period,
          runNumber,
          paymentDate: input.paymentDate,
          status: "draft",
          createdBy: ctx.session.user.id,
        })
        .returning();

      return run;
    }),

  addEntry: workspaceProcedure
    .input(addPayrollEntrySchema)
    .mutation(async ({ ctx, input }) => {
      const run = await ctx.db.query.payrollRuns.findFirst({
        where: and(
          eq(payrollRuns.id, input.payrollRunId),
          eq(payrollRuns.workspaceId, ctx.workspaceId)
        ),
      });

      if (!run) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (run.status !== "draft") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Kan endast lägga till anställda i utkast",
        });
      }

      // Get employee for tax calculation
      const employee = await ctx.db.query.employees.findFirst({
        where: eq(employees.id, input.entry.employeeId),
      });

      if (!employee) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Anställd hittades inte",
        });
      }

      // Calculate tax and employer contributions
      const decryptedPersonalNumber = decrypt(employee.personalNumber);
      const birthYear = extractBirthYear(decryptedPersonalNumber);
      const employerContributions = calculateEmployerContributions(
        input.entry.grossSalary,
        birthYear
      );

      // Simple tax calculation (30% default if no tax table specified)
      const taxDeduction = employee.taxTable
        ? Math.round(input.entry.grossSalary * 0.3) // Simplified - would use tax tables
        : Math.round(input.entry.grossSalary * 0.3);

      const netSalary = input.entry.grossSalary - taxDeduction;

      // Get next specification number
      const existingEntries = await ctx.db
        .select({ maxSpec: sql<number>`MAX(${payrollEntries.specificationNumber})` })
        .from(payrollEntries)
        .where(eq(payrollEntries.payrollRunId, input.payrollRunId));

      const specificationNumber = (existingEntries[0]?.maxSpec || 0) + 1;

      const [entry] = await ctx.db
        .insert(payrollEntries)
        .values({
          payrollRunId: input.payrollRunId,
          employeeId: input.entry.employeeId,
          grossSalary: input.entry.grossSalary.toString(),
          taxDeduction: taxDeduction.toString(),
          employerContributions: employerContributions.toString(),
          netSalary: netSalary.toString(),
          benefitsCar: (input.entry.benefitsCar || 0).toString(),
          benefitsOther: (input.entry.benefitsOther || 0).toString(),
          otherExpenses: (input.entry.otherExpenses || 0).toString(),
          workplaceAddress: input.entry.workplaceAddress || null,
          workplaceCity: input.entry.workplaceCity || null,
          specificationNumber,
        })
        .returning();

      // Update run totals
      await updateRunTotals(ctx.db, input.payrollRunId);

      return entry;
    }),

  updateEntry: workspaceProcedure
    .input(updatePayrollEntrySchema)
    .mutation(async ({ ctx, input }) => {
      const entry = await ctx.db.query.payrollEntries.findFirst({
        where: eq(payrollEntries.id, input.id),
        with: {
          payrollRun: true,
          employee: true,
        },
      });

      if (!entry || entry.payrollRun.workspaceId !== ctx.workspaceId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (entry.payrollRun.status !== "draft") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Kan endast ändra poster i utkast",
        });
      }

      const grossSalary = input.grossSalary ?? parseFloat(entry.grossSalary);
      const decryptedPersonalNumber = decrypt(entry.employee.personalNumber);
      const birthYear = extractBirthYear(decryptedPersonalNumber);
      const employerContributions = calculateEmployerContributions(grossSalary, birthYear);
      const taxDeduction = Math.round(grossSalary * 0.3);
      const netSalary = grossSalary - taxDeduction;

      const [updated] = await ctx.db
        .update(payrollEntries)
        .set({
          ...(input.grossSalary !== undefined && {
            grossSalary: input.grossSalary.toString(),
            taxDeduction: taxDeduction.toString(),
            employerContributions: employerContributions.toString(),
            netSalary: netSalary.toString(),
          }),
          ...(input.benefitsCar !== undefined && {
            benefitsCar: input.benefitsCar.toString(),
          }),
          ...(input.benefitsOther !== undefined && {
            benefitsOther: input.benefitsOther.toString(),
          }),
          ...(input.otherExpenses !== undefined && {
            otherExpenses: input.otherExpenses.toString(),
          }),
          ...(input.workplaceAddress !== undefined && {
            workplaceAddress: input.workplaceAddress,
          }),
          ...(input.workplaceCity !== undefined && {
            workplaceCity: input.workplaceCity,
          }),
        })
        .where(eq(payrollEntries.id, input.id))
        .returning();

      // Update run totals
      await updateRunTotals(ctx.db, entry.payrollRunId);

      return updated;
    }),

  removeEntry: workspaceProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const entry = await ctx.db.query.payrollEntries.findFirst({
        where: eq(payrollEntries.id, input.id),
        with: {
          payrollRun: true,
        },
      });

      if (!entry || entry.payrollRun.workspaceId !== ctx.workspaceId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (entry.payrollRun.status !== "draft") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Kan endast ta bort poster från utkast",
        });
      }

      await ctx.db.delete(payrollEntries).where(eq(payrollEntries.id, input.id));

      // Update run totals
      await updateRunTotals(ctx.db, entry.payrollRunId);

      return { success: true };
    }),

  calculateRun: workspaceProcedure
    .input(z.object({ payrollRunId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const run = await ctx.db.query.payrollRuns.findFirst({
        where: and(
          eq(payrollRuns.id, input.payrollRunId),
          eq(payrollRuns.workspaceId, ctx.workspaceId)
        ),
        with: {
          entries: {
            with: {
              employee: true,
            },
          },
        },
      });

      if (!run) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      // Recalculate all entries
      for (const entry of run.entries) {
        const grossSalary = parseFloat(entry.grossSalary);
        const decryptedPersonalNumber = decrypt(entry.employee.personalNumber);
        const birthYear = extractBirthYear(decryptedPersonalNumber);
        const employerContributions = calculateEmployerContributions(grossSalary, birthYear);
        const taxDeduction = Math.round(grossSalary * 0.3);
        const netSalary = grossSalary - taxDeduction;

        await ctx.db
          .update(payrollEntries)
          .set({
            taxDeduction: taxDeduction.toString(),
            employerContributions: employerContributions.toString(),
            netSalary: netSalary.toString(),
          })
          .where(eq(payrollEntries.id, entry.id));
      }

      // Update status and totals
      await updateRunTotals(ctx.db, input.payrollRunId);

      const [updated] = await ctx.db
        .update(payrollRuns)
        .set({
          status: "calculated",
          updatedAt: new Date(),
        })
        .where(eq(payrollRuns.id, input.payrollRunId))
        .returning();

      return updated;
    }),

  approveRun: workspaceProcedure
    .input(z.object({ payrollRunId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const run = await ctx.db.query.payrollRuns.findFirst({
        where: and(
          eq(payrollRuns.id, input.payrollRunId),
          eq(payrollRuns.workspaceId, ctx.workspaceId)
        ),
        with: {
          entries: {
            with: {
              employee: true,
            },
          },
        },
      });

      if (!run) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (run.entries.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Lönekörningen har inga anställda",
        });
      }

      // Create journal entry for the payroll
      const nextNumber = await ctx.db
        .select({ maxNumber: sql<number>`MAX(${journalEntries.verificationNumber})` })
        .from(journalEntries)
        .where(
          and(
            eq(journalEntries.workspaceId, ctx.workspaceId),
            eq(journalEntries.fiscalPeriodId, run.fiscalPeriodId)
          )
        );

      const verificationNumber = (nextNumber[0]?.maxNumber || 0) + 1;

      const totalGross = parseFloat(run.totalGrossSalary || "0");
      const totalTax = parseFloat(run.totalTaxDeduction || "0");
      const totalEmployer = parseFloat(run.totalEmployerContributions || "0");
      const totalNet = parseFloat(run.totalNetSalary || "0");

      const [journalEntry] = await ctx.db
        .insert(journalEntries)
        .values({
          workspaceId: ctx.workspaceId,
          fiscalPeriodId: run.fiscalPeriodId,
          verificationNumber,
          entryDate: run.paymentDate,
          description: `Lönekörning ${run.period} - Körning ${run.runNumber}`,
          entryType: "lon",
          sourceType: "payroll",
          createdBy: ctx.session.user.id,
        })
        .returning();

      // Create journal entry lines
      await ctx.db.insert(journalEntryLines).values([
        {
          journalEntryId: journalEntry.id,
          accountNumber: 7010,
          accountName: "Löner till tjänstemän",
          debit: totalGross.toString(),
          sortOrder: 0,
        },
        {
          journalEntryId: journalEntry.id,
          accountNumber: 7510,
          accountName: "Arbetsgivaravgifter",
          debit: totalEmployer.toString(),
          sortOrder: 1,
        },
        {
          journalEntryId: journalEntry.id,
          accountNumber: 2710,
          accountName: "Personalskatt",
          credit: totalTax.toString(),
          sortOrder: 2,
        },
        {
          journalEntryId: journalEntry.id,
          accountNumber: 2731,
          accountName: "Avräkning arbetsgivaravgifter",
          credit: totalEmployer.toString(),
          sortOrder: 3,
        },
        {
          journalEntryId: journalEntry.id,
          accountNumber: 1930,
          accountName: "Företagskonto",
          credit: totalNet.toString(),
          sortOrder: 4,
        },
      ]);

      // Update payroll run
      const [updated] = await ctx.db
        .update(payrollRuns)
        .set({
          status: "approved",
          journalEntryId: journalEntry.id,
          updatedAt: new Date(),
        })
        .where(eq(payrollRuns.id, input.payrollRunId))
        .returning();

      return { run: updated, journalEntry };
    }),

  generateAGI: workspaceProcedure
    .input(z.object({ payrollRunId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const run = await ctx.db.query.payrollRuns.findFirst({
        where: and(
          eq(payrollRuns.id, input.payrollRunId),
          eq(payrollRuns.workspaceId, ctx.workspaceId)
        ),
        with: {
          entries: {
            with: {
              employee: true,
            },
          },
        },
      });

      if (!run) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const workspace = await ctx.db.query.workspaces.findFirst({
        where: eq(workspaces.id, ctx.workspaceId),
      });

      if (!workspace) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (!workspace.orgNumber) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organisationsnummer krävs för AGI-generering",
        });
      }

      const entriesWithDecryptedPersonalNumbers = run.entries.map((entry) => ({
        ...entry,
        employee: {
          ...entry.employee,
          personalNumber: decrypt(entry.employee.personalNumber),
        },
      }));

      const agiXml = generateAGIXml({
        workspace,
        payrollRun: run,
        entries: entriesWithDecryptedPersonalNumbers,
      });

      const [updated] = await ctx.db
        .update(payrollRuns)
        .set({
          agiXml,
          updatedAt: new Date(),
        })
        .where(eq(payrollRuns.id, input.payrollRunId))
        .returning();

      return { run: updated, agiXml };
    }),

  downloadAGI: workspaceProcedure
    .input(z.object({ payrollRunId: z.string() }))
    .query(async ({ ctx, input }) => {
      const run = await ctx.db.query.payrollRuns.findFirst({
        where: and(
          eq(payrollRuns.id, input.payrollRunId),
          eq(payrollRuns.workspaceId, ctx.workspaceId)
        ),
      });

      if (!run || !run.agiXml) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "AGI-fil har inte genererats",
        });
      }

      return {
        xml: run.agiXml,
        filename: `AGI_${run.period}_${run.runNumber}.xml`,
      };
    }),
});

// Helper function to update run totals
async function updateRunTotals(db: typeof import("@/lib/db").db, runId: string) {
  const totals = await db
    .select({
      totalGross: sql<string>`COALESCE(SUM(${payrollEntries.grossSalary}), 0)`,
      totalTax: sql<string>`COALESCE(SUM(${payrollEntries.taxDeduction}), 0)`,
      totalEmployer: sql<string>`COALESCE(SUM(${payrollEntries.employerContributions}), 0)`,
      totalNet: sql<string>`COALESCE(SUM(${payrollEntries.netSalary}), 0)`,
    })
    .from(payrollEntries)
    .where(eq(payrollEntries.payrollRunId, runId));

  await db
    .update(payrollRuns)
    .set({
      totalGrossSalary: totals[0]?.totalGross || "0",
      totalTaxDeduction: totals[0]?.totalTax || "0",
      totalEmployerContributions: totals[0]?.totalEmployer || "0",
      totalNetSalary: totals[0]?.totalNet || "0",
      updatedAt: new Date(),
    })
    .where(eq(payrollRuns.id, runId));
}

