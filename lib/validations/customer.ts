import { z } from "zod";
import { deliveryMethods } from "./invoice";

export const createCustomerSchema = z.object({
  name: z.string().min(1, "Namn krävs").max(100, "Max 100 tecken"),
  contactPerson: z.string().max(100).optional(),
  orgNumber: z.string().max(20).optional(),
  email: z.string().email("Ogiltig e-post").optional().or(z.literal("")),
  phone: z.string().max(20).optional(),
  address: z.string().max(200).optional(),
  postalCode: z.string().max(10).optional(),
  city: z.string().max(100).optional(),
  preferredDeliveryMethod: z.enum(deliveryMethods).optional().nullable(),
  einvoiceAddress: z.string().max(100).optional().nullable(),
});

export const updateCustomerSchema = createCustomerSchema.extend({
  id: z.string(),
});

// Schema for updating only delivery preferences
export const updateCustomerDeliverySchema = z.object({
  id: z.string(),
  preferredDeliveryMethod: z.enum(deliveryMethods).optional().nullable(),
  einvoiceAddress: z.string().max(100).optional().nullable(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type UpdateCustomerDeliveryInput = z.infer<typeof updateCustomerDeliverySchema>;
