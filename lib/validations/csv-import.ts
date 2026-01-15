import { z } from "zod";

// Field mapping configuration - column indices (0-based)
export const csvFieldMappingSchema = z.object({
  accountingDate: z.number().nullable(), // Required field
  amount: z.number().nullable(), // Required field
  reference: z.number().nullable(), // Optional
  bookedBalance: z.number().nullable(), // Optional
});

export type CsvFieldMapping = z.infer<typeof csvFieldMappingSchema>;

// AI-suggested mapping with confidence scores
export const aiFieldMappingSchema = z.object({
  mapping: csvFieldMappingSchema,
  confidence: z.object({
    accountingDate: z.number().min(0).max(1),
    amount: z.number().min(0).max(1),
    reference: z.number().min(0).max(1),
    bookedBalance: z.number().min(0).max(1),
  }),
});

export type AiFieldMapping = z.infer<typeof aiFieldMappingSchema>;

// CSV parsing configuration
export const csvConfigSchema = z.object({
  separator: z.string().default(";"),
  hasHeaderRow: z.boolean().default(true),
  skipRows: z.number().min(0).default(0), // e.g., skip "sep=;" line
  decimalSeparator: z.enum([",", "."]).default(","),
});

export type CsvConfig = z.infer<typeof csvConfigSchema>;

// Parsed CSV result
export const csvParseResultSchema = z.object({
  separator: z.string(),
  headers: z.array(z.string()),
  rows: z.array(z.array(z.string())),
  hasHeaderRow: z.boolean(),
  skipRows: z.number(),
  totalRows: z.number(),
});

export type CsvParseResult = z.infer<typeof csvParseResultSchema>;

// Parsed transaction row for preview
export const parsedCsvRowSchema = z.object({
  rowIndex: z.number(),
  rawValues: z.array(z.string()),
  parsed: z.object({
    accountingDate: z.string().nullable(),
    amount: z.number().nullable(),
    reference: z.string().nullable(),
    bookedBalance: z.number().nullable(),
  }),
  isDuplicate: z.boolean(),
  duplicateMatches: z.array(z.object({
    transactionId: z.string(),
    accountingDate: z.string().nullable(),
    amount: z.string().nullable(),
    reference: z.string().nullable(),
  })).optional(),
  validationErrors: z.array(z.string()),
  isSelected: z.boolean(),
});

export type ParsedCsvRow = z.infer<typeof parsedCsvRowSchema>;

// Preview result
export const csvPreviewResultSchema = z.object({
  transactions: z.array(parsedCsvRowSchema),
  total: z.number(),
  validCount: z.number(),
  duplicateCount: z.number(),
  errorCount: z.number(),
});

export type CsvPreviewResult = z.infer<typeof csvPreviewResultSchema>;

// Import result
export const csvImportResultSchema = z.object({
  imported: z.number(),
  duplicatesSkipped: z.number(),
  errors: z.number(),
  batchId: z.string(),
});

export type CsvImportResult = z.infer<typeof csvImportResultSchema>;
