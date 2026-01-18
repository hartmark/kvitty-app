import { generateObject } from "ai";
import { z } from "zod";
import { bankTransactionModel } from "./models";
import type { AiFieldMapping, CsvFieldMapping } from "@/lib/validations/csv-import";

// Schema for AI response
const aiFieldDetectionResponseSchema = z.object({
  accountingDate: z.object({
    columnIndex: z.number().nullable(),
    confidence: z.number().min(0).max(1),
  }),
  amount: z.object({
    columnIndex: z.number().nullable(),
    confidence: z.number().min(0).max(1),
  }),
  reference: z.object({
    columnIndex: z.number().nullable(),
    confidence: z.number().min(0).max(1),
  }),
  bookedBalance: z.object({
    columnIndex: z.number().nullable(),
    confidence: z.number().min(0).max(1),
  }),
});

/**
 * Build the AI prompt for field detection
 */
function buildFieldDetectionPrompt(headers: string[], sampleRows: string[][]): string {
  const headerList = headers.map((h, i) => `  ${i}: "${h}"`).join("\n");

  const sampleData = sampleRows
    .slice(0, 5)
    .map((row, rowIdx) => {
      const values = row.map((v, i) => `[${i}]="${v}"`).join("  ");
      return `  Row ${rowIdx + 1}: ${values}`;
    })
    .join("\n");

  return `Analysera följande CSV-data från en svensk bank och identifiera vilken kolumn som innehåller varje fält.

## Kolumnrubriker (index börjar på 0):
${headerList}

## Exempeldata (första ${sampleRows.slice(0, 5).length} rader):
${sampleData}

## Svenska banktermer att känna igen:
- **Bokföringsdag** / Bokföringsdatum / Transaktionsdatum / Datum → accountingDate (datum för bokföring)
- **Insättning/Uttag** / Belopp / Summa / Amount → amount (transaktionsbelopp, negativt för utgifter)
- **Referens** / Text / Beskrivning / Meddelande / Memo → reference (beskrivning av transaktionen)
- **Bokfört saldo** / Saldo / Balance → bookedBalance (saldo efter transaktionen)

## Datummönster att känna igen:
- YYYY-MM-DD (t.ex. 2026-01-13)
- YYYYMMDD
- DD/MM/YYYY

## Beloppsmönster att känna igen:
- Svenska format med komma som decimalseparator: -699,00 eller 50 881,00
- Negativt = uttag/utgift, positivt = insättning

## Instruktioner:
1. Returnera kolumnindex (0-baserat) för varje fält
2. Om ett fält inte hittas, returnera null för columnIndex
3. Ange confidence (0-1) baserat på hur säker du är:
   - 0.9-1.0: Mycket säker (exakt matchning på rubrik)
   - 0.7-0.9: Ganska säker (liknande rubrik eller tydligt datamönster)
   - 0.5-0.7: Osäker (endast baserat på datamönster)
   - <0.5: Gissning

Analysera noggrant både rubriker OCH exempeldata för att göra rätt mappning.`;
}

/**
 * Detect CSV field mappings using AI
 */
export async function detectCsvFieldMapping(
  headers: string[],
  sampleRows: string[][]
): Promise<AiFieldMapping> {
  const prompt = buildFieldDetectionPrompt(headers, sampleRows);

  const result = await generateObject({
    model: bankTransactionModel,
    schema: aiFieldDetectionResponseSchema,
    prompt,
  });

  // Transform AI response to our format
  const aiResponse = result.object;

  const mapping: CsvFieldMapping = {
    accountingDate: aiResponse.accountingDate.columnIndex,
    amount: aiResponse.amount.columnIndex,
    reference: aiResponse.reference.columnIndex,
    bookedBalance: aiResponse.bookedBalance.columnIndex,
  };

  const confidence = {
    accountingDate: aiResponse.accountingDate.confidence,
    amount: aiResponse.amount.confidence,
    reference: aiResponse.reference.confidence,
    bookedBalance: aiResponse.bookedBalance.confidence,
  };

  return { mapping, confidence };
}

/**
 * Get the overall confidence level for the mapping
 */
export function getOverallConfidence(confidence: AiFieldMapping["confidence"]): {
  level: "high" | "medium" | "low";
  percentage: number;
} {
  // Focus on required fields (accountingDate, amount)
  const requiredConfidence = (confidence.accountingDate + confidence.amount) / 2;

  if (requiredConfidence >= 0.8) {
    return { level: "high", percentage: Math.round(requiredConfidence * 100) };
  }
  if (requiredConfidence >= 0.6) {
    return { level: "medium", percentage: Math.round(requiredConfidence * 100) };
  }
  return { level: "low", percentage: Math.round(requiredConfidence * 100) };
}

/**
 * Get confidence color for UI display
 */
export function getConfidenceColor(confidence: number): "green" | "yellow" | "red" {
  if (confidence >= 0.8) return "green";
  if (confidence >= 0.5) return "yellow";
  return "red";
}
