import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, workspaceProcedure } from "../init";
import { categorizationRules } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  createCategorizationRuleSchema,
  updateCategorizationRuleSchema,
  updateRulePrioritiesSchema,
} from "@/lib/validations/categorization-rules";
import { evaluateCondition } from "@/lib/utils/rule-engine";
import type { ConditionType, ActionType } from "@/lib/validations/categorization-rules";

export const categorizationRulesRouter = router({
  // List all rules for a workspace
  list: workspaceProcedure
    .input(
      z.object({
        activeOnly: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(categorizationRules.workspaceId, ctx.workspaceId)];

      if (input.activeOnly) {
        conditions.push(eq(categorizationRules.isActive, true));
      }

      const rules = await ctx.db.query.categorizationRules.findMany({
        where: and(...conditions),
        orderBy: [desc(categorizationRules.priority), desc(categorizationRules.usageCount)],
      });

      return rules;
    }),

  // Get a single rule
  get: workspaceProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const rule = await ctx.db.query.categorizationRules.findFirst({
        where: and(
          eq(categorizationRules.id, input.id),
          eq(categorizationRules.workspaceId, ctx.workspaceId)
        ),
      });

      if (!rule) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return rule;
    }),

  // Create a new rule
  create: workspaceProcedure
    .input(createCategorizationRuleSchema)
    .mutation(async ({ ctx, input }) => {
      // Get the current max priority to set as default if not provided
      const existingRules = await ctx.db.query.categorizationRules.findMany({
        where: eq(categorizationRules.workspaceId, ctx.workspaceId),
        columns: { priority: true },
      });

      const maxPriority = existingRules.length > 0
        ? Math.max(...existingRules.map((r) => r.priority))
        : 0;

      const [rule] = await ctx.db
        .insert(categorizationRules)
        .values({
          workspaceId: ctx.workspaceId,
          name: input.name,
          description: input.description ?? null,
          priority: input.priority ?? maxPriority + 1,
          isActive: input.isActive ?? true,
          conditionType: input.conditionType as ConditionType,
          conditionValue: input.conditionValue,
          actionType: input.actionType as ActionType,
          actionValue: input.actionValue,
          createdBy: ctx.session.user.id,
        })
        .returning();

      return rule;
    }),

  // Update an existing rule
  update: workspaceProcedure
    .input(updateCategorizationRuleSchema.extend({ workspaceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.categorizationRules.findFirst({
        where: and(
          eq(categorizationRules.id, input.id),
          eq(categorizationRules.workspaceId, ctx.workspaceId)
        ),
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.priority !== undefined) updateData.priority = input.priority;
      if (input.isActive !== undefined) updateData.isActive = input.isActive;
      if (input.conditionType !== undefined) updateData.conditionType = input.conditionType;
      if (input.conditionValue !== undefined) updateData.conditionValue = input.conditionValue;
      if (input.actionType !== undefined) updateData.actionType = input.actionType;
      if (input.actionValue !== undefined) updateData.actionValue = input.actionValue;

      const [updated] = await ctx.db
        .update(categorizationRules)
        .set(updateData)
        .where(eq(categorizationRules.id, input.id))
        .returning();

      return updated;
    }),

  // Delete a rule
  delete: workspaceProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.categorizationRules.findFirst({
        where: and(
          eq(categorizationRules.id, input.id),
          eq(categorizationRules.workspaceId, ctx.workspaceId)
        ),
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await ctx.db
        .delete(categorizationRules)
        .where(eq(categorizationRules.id, input.id));

      return { success: true };
    }),

  // Batch update priorities (for drag-drop reordering)
  updatePriorities: workspaceProcedure
    .input(updateRulePrioritiesSchema)
    .mutation(async ({ ctx, input }) => {
      // Use transaction to ensure atomicity
      await ctx.db.transaction(async (tx) => {
        for (const { id, priority } of input.priorities) {
          await tx
            .update(categorizationRules)
            .set({ priority, updatedAt: new Date() })
            .where(
              and(
                eq(categorizationRules.id, id),
                eq(categorizationRules.workspaceId, ctx.workspaceId)
              )
            );
        }
      });

      return { success: true };
    }),

  // Test a transaction against all active rules
  evaluate: workspaceProcedure
    .input(
      z.object({
        description: z.string(),
        amount: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const rules = await ctx.db.query.categorizationRules.findMany({
        where: and(
          eq(categorizationRules.workspaceId, ctx.workspaceId),
          eq(categorizationRules.isActive, true)
        ),
        orderBy: [desc(categorizationRules.priority)],
      });

      const matches = rules
        .filter((rule) =>
          evaluateCondition(
            rule.conditionType as ConditionType,
            rule.conditionValue,
            { description: input.description, amount: input.amount }
          )
        )
        .map((rule) => ({
          ruleId: rule.id,
          ruleName: rule.name,
          actionType: rule.actionType,
          actionValue: rule.actionValue,
          priority: rule.priority,
        }));

      return matches;
    }),

  // Record a rule match (for usage tracking)
  recordMatch: workspaceProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Use SQL increment to avoid race conditions
      const [updated] = await ctx.db
        .update(categorizationRules)
        .set({
          usageCount: sql`${categorizationRules.usageCount} + 1`,
          lastMatchedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(categorizationRules.id, input.id),
            eq(categorizationRules.workspaceId, ctx.workspaceId)
          )
        )
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return updated;
    }),
});
