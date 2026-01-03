import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, workspaceProcedure } from "../init";
import { products, invoiceLines } from "@/lib/db/schema";
import { eq, and, like, or, desc } from "drizzle-orm";
import {
  createProductSchema,
  updateProductSchema,
} from "@/lib/validations/product";

export const productsRouter = router({
  // List all products with optional search
  list: workspaceProcedure
    .input(
      z.object({
        search: z.string().optional(),
        includeInactive: z.boolean().optional().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      const productList = await ctx.db.query.products.findMany({
        where: and(
          eq(products.workspaceId, ctx.workspaceId),
          input?.includeInactive ? undefined : eq(products.isActive, true),
          input?.search
            ? or(
                like(products.name, `%${input.search}%`),
                like(products.description, `%${input.search}%`)
              )
            : undefined
        ),
        orderBy: (p, { asc }) => [asc(p.name)],
      });
      return productList;
    }),

  // Get single product
  get: workspaceProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const product = await ctx.db.query.products.findFirst({
        where: and(
          eq(products.id, input.id),
          eq(products.workspaceId, ctx.workspaceId)
        ),
      });

      if (!product) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return product;
    }),

  // Create product
  create: workspaceProcedure
    .input(createProductSchema)
    .mutation(async ({ ctx, input }) => {
      const [product] = await ctx.db
        .insert(products)
        .values({
          workspaceId: ctx.workspaceId,
          name: input.name,
          description: input.description || null,
          defaultQuantity: String(input.defaultQuantity),
          unit: input.unit,
          unitPrice: String(input.unitPrice),
          vatRate: input.vatRate,
          type: input.type,
        })
        .returning();

      return product;
    }),

  // Update product
  update: workspaceProcedure
    .input(updateProductSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.products.findFirst({
        where: and(
          eq(products.id, input.id),
          eq(products.workspaceId, ctx.workspaceId)
        ),
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined)
        updateData.description = input.description || null;
      if (input.defaultQuantity !== undefined)
        updateData.defaultQuantity = String(input.defaultQuantity);
      if (input.unit !== undefined) updateData.unit = input.unit;
      if (input.unitPrice !== undefined)
        updateData.unitPrice = String(input.unitPrice);
      if (input.vatRate !== undefined) updateData.vatRate = input.vatRate;
      if (input.type !== undefined) updateData.type = input.type;
      if (input.isActive !== undefined) updateData.isActive = input.isActive;

      const [updated] = await ctx.db
        .update(products)
        .set(updateData)
        .where(eq(products.id, input.id))
        .returning();

      return updated;
    }),

  // Delete/archive product
  delete: workspaceProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if product is used in any invoice lines
      const usedInInvoice = await ctx.db.query.invoiceLines.findFirst({
        where: eq(invoiceLines.productId, input.id),
      });

      if (usedInInvoice) {
        // Archive instead of delete
        await ctx.db
          .update(products)
          .set({ isActive: false, updatedAt: new Date() })
          .where(
            and(
              eq(products.id, input.id),
              eq(products.workspaceId, ctx.workspaceId)
            )
          );

        return { success: true, archived: true };
      }

      // Safe to delete
      await ctx.db
        .delete(products)
        .where(
          and(
            eq(products.id, input.id),
            eq(products.workspaceId, ctx.workspaceId)
          )
        );

      return { success: true, archived: false };
    }),

  // Search products for combobox (optimized for quick search)
  search: workspaceProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!input.query || input.query.length < 1) {
        // Return recent products if no query
        return ctx.db.query.products.findMany({
          where: and(
            eq(products.workspaceId, ctx.workspaceId),
            eq(products.isActive, true)
          ),
          orderBy: [desc(products.updatedAt)],
          limit: 10,
        });
      }

      const searchTerm = `%${input.query}%`;
      return ctx.db.query.products.findMany({
        where: and(
          eq(products.workspaceId, ctx.workspaceId),
          eq(products.isActive, true),
          or(like(products.name, searchTerm), like(products.description, searchTerm))
        ),
        orderBy: (p, { asc }) => [asc(p.name)],
        limit: 20,
      });
    }),
});
