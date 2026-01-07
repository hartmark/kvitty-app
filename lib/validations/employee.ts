import { z } from "zod";

// Swedish personal number validation (YYYYMMDDXXXX or YYMMDDXXXX)
const personalNumberSchema = z
  .string()
  .regex(
    /^(\d{12}|\d{10})$/,
    "Personnummer måste vara 10 eller 12 siffror"
  )
  .refine(
    (val) => {
      const cleaned = val.replace(/\D/g, "");
      if (cleaned.length === 12) {
        const month = parseInt(cleaned.substring(4, 6), 10);
        const day = parseInt(cleaned.substring(6, 8), 10);
        return month >= 1 && month <= 12 && day >= 1 && day <= 31;
      }
      if (cleaned.length === 10) {
        const month = parseInt(cleaned.substring(2, 4), 10);
        const day = parseInt(cleaned.substring(4, 6), 10);
        return month >= 1 && month <= 12 && day >= 1 && day <= 31;
      }
      return false;
    },
    { message: "Ogiltigt personnummer" }
  );

export const createEmployeeSchema = z.object({
  workspaceId: z.string(),
  personalNumber: personalNumberSchema,
  firstName: z
    .string()
    .min(1, "Förnamn krävs")
    .max(100, "Förnamn får max vara 100 tecken"),
  lastName: z
    .string()
    .min(1, "Efternamn krävs")
    .max(100, "Efternamn får max vara 100 tecken"),
  email: z.string().email("Ogiltig e-postadress").optional().or(z.literal("")),
  phone: z.string().max(20).optional(),
  address: z.string().max(200).optional(),
  postalCode: z.string().max(10).optional(),
  city: z.string().max(100).optional(),
  employmentStartDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  taxTable: z.number().int().min(29).max(42).optional(),
  taxColumn: z.number().int().min(1).max(6).optional(),
});

export const updateEmployeeSchema = z.object({
  id: z.string(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  phone: z.string().max(20).optional().nullable(),
  address: z.string().max(200).optional().nullable(),
  postalCode: z.string().max(10).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  employmentStartDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  employmentEndDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  taxTable: z.number().int().min(29).max(42).optional().nullable(),
  taxColumn: z.number().int().min(1).max(6).optional().nullable(),
  isActive: z.boolean().optional(),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
