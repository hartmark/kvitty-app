import { z } from "zod";

export const createCustomerSchema = z.object({
  name: z.string().min(1, "Namn krävs").max(100, "Max 100 tecken"),
  contactPerson: z.string().max(100).optional(),
  orgNumber: z.string().max(20).optional(),
  email: z.string().email("Ogiltig e-post").optional().or(z.literal("")),
  phone: z.string().max(20).optional(),
  address: z.string().max(200).optional(),
  postalCode: z.string().max(10).optional(),
  city: z.string().max(100).optional(),
});

export const updateCustomerSchema = createCustomerSchema.extend({
  id: z.string(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
