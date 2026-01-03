import { z } from "zod";
import { productUnits } from "./product";

export const invoiceLineSchema = z.object({
  productId: z.string().optional(),
  lineType: z.enum(["product", "text"]).default("product"),
  description: z.string().min(1, "Beskrivning krävs"),
  quantity: z.number().min(0.01, "Antal måste vara minst 0.01"),
  unit: z.enum(productUnits).optional(),
  unitPrice: z.number().min(0, "Pris måste vara minst 0"),
  vatRate: z
    .number()
    .refine((v) => [0, 6, 12, 25].includes(v), "Ogiltig momssats"),
});

// Simplified create schema - no lines required (add them on detail page)
export const createInvoiceSchema = z.object({
  customerId: z.string().min(1, "Kund krävs"),
  fiscalPeriodId: z.string().optional(),
  invoiceDate: z.string().date("Ogiltigt fakturadatum"),
  dueDate: z.string().date("Ogiltigt förfallodatum"),
  reference: z.string().max(50).optional(),
});

// Full update schema with lines
export const updateInvoiceSchema = z.object({
  id: z.string(),
  customerId: z.string().min(1, "Kund krävs"),
  fiscalPeriodId: z.string().optional(),
  invoiceDate: z.string().date("Ogiltigt fakturadatum"),
  dueDate: z.string().date("Ogiltigt förfallodatum"),
  reference: z.string().max(50).optional(),
  lines: z.array(invoiceLineSchema),
});

// Schema for adding a single line to an invoice
export const addInvoiceLineSchema = z.object({
  invoiceId: z.string(),
  productId: z.string().optional(),
  lineType: z.enum(["product", "text"]).default("product"),
  description: z.string().min(1, "Beskrivning krävs"),
  quantity: z.number().min(0.01, "Antal måste vara minst 0.01"),
  unit: z.enum(productUnits).optional(),
  unitPrice: z.number().min(0, "Pris måste vara minst 0"),
  vatRate: z
    .number()
    .refine((v) => [0, 6, 12, 25].includes(v), "Ogiltig momssats"),
});

// Schema for updating a single line
export const updateInvoiceLineSchema = z.object({
  lineId: z.string(),
  invoiceId: z.string(),
  description: z.string().min(1, "Beskrivning krävs").optional(),
  quantity: z.number().min(0.01, "Antal måste vara minst 0.01").optional(),
  unit: z.enum(productUnits).optional().nullable(),
  unitPrice: z.number().min(0, "Pris måste vara minst 0").optional(),
  vatRate: z
    .number()
    .refine((v) => [0, 6, 12, 25].includes(v), "Ogiltig momssats")
    .optional(),
});

// Schema for updating line order (drag and drop)
export const updateLineOrderSchema = z.object({
  invoiceId: z.string(),
  lineIds: z.array(z.string()),
});

// Schema for updating invoice metadata (dates, customer, reference)
export const updateInvoiceMetadataSchema = z.object({
  id: z.string(),
  customerId: z.string().min(1, "Kund krävs").optional(),
  invoiceDate: z.string().date("Ogiltigt fakturadatum").optional(),
  dueDate: z.string().date("Ogiltigt förfallodatum").optional(),
  reference: z.string().max(50).optional().nullable(),
});

export type InvoiceLineInput = z.infer<typeof invoiceLineSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type AddInvoiceLineInput = z.infer<typeof addInvoiceLineSchema>;
export type UpdateInvoiceLineInput = z.infer<typeof updateInvoiceLineSchema>;
export type UpdateLineOrderInput = z.infer<typeof updateLineOrderSchema>;
export type UpdateInvoiceMetadataInput = z.infer<typeof updateInvoiceMetadataSchema>;
