import { z } from "zod";

export const bankTransactionSchema = z.object({
  office: z.string().optional().nullable(),
  accountingDate: z.string().date().optional().nullable(),
  ledgerDate: z.string().date().optional().nullable(),
  currencyDate: z.string().date().optional().nullable(),
  reference: z.string().optional().nullable(),
  amount: z.number().optional().nullable(),
  bookedBalance: z.number().optional().nullable(),
});

export const createBankTransactionsSchema = z.object({
  fiscalPeriodId: z.string().min(1, "Period krävs"),
  bankAccountId: z.string().optional(),
  importedAt: z.string().optional(),
  bankTransactions: z
    .array(bankTransactionSchema)
    .min(1, "Minst en transaktion krävs")
    .max(50, "Max 50 transaktioner åt gången"),
});

export const updateBankTransactionSchema = bankTransactionSchema;

export type BankTransactionInput = z.infer<typeof bankTransactionSchema>;
export type CreateBankTransactionsInput = z.infer<typeof createBankTransactionsSchema>;
export type UpdateBankTransactionInput = z.infer<typeof updateBankTransactionSchema>;

