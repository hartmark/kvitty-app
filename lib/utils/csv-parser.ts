import type { CsvConfig, CsvFieldMapping } from "@/lib/validations/csv-import";

/**
 * Decode base64-encoded content if present
 */
export function decodeBase64Content(content: string): string {
  if (!content.includes("base64,")) {
    return content;
  }
  const base64Data = content.split("base64,")[1];
  return Buffer.from(base64Data, "base64").toString("utf-8");
}

export interface CsvParseResult {
  separator: string;
  headers: string[];
  rows: string[][];
  hasHeaderRow: boolean;
  skipRows: number;
  totalRows: number;
}

/**
 * Detects the CSV separator from content
 * Checks for explicit "sep=X" declaration or auto-detects
 */
export function detectSeparator(content: string): { separator: string; skipFirstLine: boolean } {
  const lines = content.split("\n");
  const firstLine = lines[0]?.trim() || "";

  // Check for explicit separator declaration (common in Excel exports)
  const sepMatch = firstLine.match(/^sep=(.)/i);
  if (sepMatch) {
    return { separator: sepMatch[1], skipFirstLine: true };
  }

  // Auto-detect separator from first few lines
  const sampleLines = lines.slice(0, 5).join("\n");

  // Count occurrences of common separators
  const semicolonCount = (sampleLines.match(/;/g) || []).length;
  const commaCount = (sampleLines.match(/,/g) || []).length;
  const tabCount = (sampleLines.match(/\t/g) || []).length;

  // Pick the most common separator
  if (semicolonCount >= commaCount && semicolonCount >= tabCount) {
    return { separator: ";", skipFirstLine: false };
  }
  if (tabCount > commaCount) {
    return { separator: "\t", skipFirstLine: false };
  }
  return { separator: ",", skipFirstLine: false };
}

/**
 * Parse a CSV line handling quoted values
 */
function parseCsvLine(line: string, separator: string): string[] {
  const parts: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      // Check for escaped quote (double quote)
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === separator && !inQuotes) {
      parts.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  // Add last part
  if (current || parts.length > 0) {
    parts.push(current.trim());
  }

  return parts;
}

/**
 * Parse raw CSV content into structured data
 */
export function parseRawCsv(content: string): CsvParseResult {
  const { separator, skipFirstLine } = detectSeparator(content);
  const lines = content.split("\n").filter((line) => line.trim());

  if (lines.length === 0) {
    return {
      separator,
      headers: [],
      rows: [],
      hasHeaderRow: false,
      skipRows: 0,
      totalRows: 0,
    };
  }

  const startIndex = skipFirstLine ? 1 : 0;
  const dataLines = lines.slice(startIndex);

  if (dataLines.length === 0) {
    return {
      separator,
      headers: [],
      rows: [],
      hasHeaderRow: false,
      skipRows: skipFirstLine ? 1 : 0,
      totalRows: 0,
    };
  }

  // Parse all lines
  const allRows = dataLines.map((line) => parseCsvLine(line, separator));

  // First row is assumed to be headers
  const headers = allRows[0] || [];
  const rows = allRows.slice(1);

  return {
    separator,
    headers,
    rows,
    hasHeaderRow: true,
    skipRows: skipFirstLine ? 1 : 0,
    totalRows: rows.length,
  };
}

/**
 * Parse Swedish-formatted amount (comma as decimal separator)
 * Examples: "-699,00" -> -699.00, "50 881,00" -> 50881.00
 */
export function parseSwedishAmount(value: string, decimalSeparator: "," | "." = ","): number | null {
  if (!value || value.trim() === "") {
    return null;
  }

  let cleaned = value.trim();

  // Remove any currency symbols
  cleaned = cleaned.replace(/[SEK\s]/gi, "");

  // Handle Swedish thousand separator (space or dot when comma is decimal)
  if (decimalSeparator === ",") {
    // Remove spaces (thousand separator)
    cleaned = cleaned.replace(/\s/g, "");
    // Remove dots used as thousand separator (only if comma is decimal)
    // Be careful: only remove dots that aren't the last separator
    const lastCommaIndex = cleaned.lastIndexOf(",");
    if (lastCommaIndex > 0) {
      // Remove all dots before the comma (thousand separators)
      cleaned = cleaned.substring(0, lastCommaIndex).replace(/\./g, "") + cleaned.substring(lastCommaIndex);
    }
    // Convert decimal comma to dot
    cleaned = cleaned.replace(",", ".");
  } else {
    // Comma is thousand separator, dot is decimal
    cleaned = cleaned.replace(/,/g, "");
  }

  // Remove any remaining non-numeric characters except minus and dot
  cleaned = cleaned.replace(/[^\d.-]/g, "");

  const amount = parseFloat(cleaned);
  return isNaN(amount) ? null : amount;
}

/**
 * Parse various Swedish date formats
 * Supported: YYYY-MM-DD, YYYYMMDD, DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, DD/MM/YY
 * Returns: YYYY-MM-DD format or null
 */
export function parseSwedishDate(value: string): string | null {
  if (!value || value.trim() === "") {
    return null;
  }

  const cleaned = value.replace(/"/g, "").trim();

  const formats = [
    // YYYY-MM-DD (ISO format - most common in Swedish banks)
    { regex: /^(\d{4})-(\d{2})-(\d{2})$/, groups: [1, 2, 3], order: "ymd" },
    // YYYYMMDD
    { regex: /^(\d{4})(\d{2})(\d{2})$/, groups: [1, 2, 3], order: "ymd" },
    // DD/MM/YYYY
    { regex: /^(\d{2})\/(\d{2})\/(\d{4})$/, groups: [3, 2, 1], order: "dmy" },
    // DD-MM-YYYY
    { regex: /^(\d{2})-(\d{2})-(\d{4})$/, groups: [3, 2, 1], order: "dmy" },
    // DD.MM.YYYY
    { regex: /^(\d{2})\.(\d{2})\.(\d{4})$/, groups: [3, 2, 1], order: "dmy" },
    // DD/MM/YY (2-digit year)
    { regex: /^(\d{2})\/(\d{2})\/(\d{2})$/, groups: [3, 2, 1], order: "dmy", shortYear: true },
  ];

  for (const format of formats) {
    const match = cleaned.match(format.regex);
    if (match) {
      let year = match[format.groups[0]];
      const month = match[format.groups[1]];
      const day = match[format.groups[2]];

      // Handle 2-digit year
      if (format.shortYear) {
        const yearNum = parseInt(year, 10);
        year = (yearNum < 50 ? "20" : "19") + year;
      }

      // Validate date parts
      const yearNum = parseInt(year, 10);
      const monthNum = parseInt(month, 10);
      const dayNum = parseInt(day, 10);

      if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) {
        continue;
      }

      // Validate the date is real
      const testDate = new Date(yearNum, monthNum - 1, dayNum);
      if (
        testDate.getFullYear() !== yearNum ||
        testDate.getMonth() !== monthNum - 1 ||
        testDate.getDate() !== dayNum
      ) {
        continue;
      }

      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
  }

  return null;
}

/**
 * Apply field mapping to parse a row into a transaction
 */
export function applyMapping(
  row: string[],
  mapping: CsvFieldMapping,
  config: CsvConfig
): {
  accountingDate: string | null;
  amount: number | null;
  reference: string | null;
  bookedBalance: number | null;
  validationErrors: string[];
} {
  const errors: string[] = [];

  // Parse accounting date (required)
  let accountingDate: string | null = null;
  if (mapping.accountingDate !== null && row[mapping.accountingDate] !== undefined) {
    accountingDate = parseSwedishDate(row[mapping.accountingDate]);
    if (!accountingDate && row[mapping.accountingDate]?.trim()) {
      errors.push(`Ogiltigt datumformat: "${row[mapping.accountingDate]}"`);
    }
  }

  // Parse amount (required)
  let amount: number | null = null;
  if (mapping.amount !== null && row[mapping.amount] !== undefined) {
    amount = parseSwedishAmount(row[mapping.amount], config.decimalSeparator);
    if (amount === null && row[mapping.amount]?.trim()) {
      errors.push(`Ogiltigt beloppsformat: "${row[mapping.amount]}"`);
    }
  }

  // Parse reference (optional)
  let reference: string | null = null;
  if (mapping.reference !== null && row[mapping.reference] !== undefined) {
    reference = row[mapping.reference]?.trim() || null;
  }

  // Parse booked balance (optional)
  let bookedBalance: number | null = null;
  if (mapping.bookedBalance !== null && row[mapping.bookedBalance] !== undefined) {
    bookedBalance = parseSwedishAmount(row[mapping.bookedBalance], config.decimalSeparator);
  }

  // Validation for required fields
  if (!accountingDate) {
    errors.push("Datum saknas");
  }
  if (amount === null) {
    errors.push("Belopp saknas");
  }

  return {
    accountingDate,
    amount,
    reference,
    bookedBalance,
    validationErrors: errors,
  };
}

/**
 * Get sample value from a column for preview
 */
export function getSampleValue(rows: string[][], columnIndex: number, maxSamples = 3): string[] {
  const samples: string[] = [];
  for (let i = 0; i < Math.min(rows.length, maxSamples); i++) {
    const value = rows[i]?.[columnIndex];
    if (value?.trim()) {
      samples.push(value.trim());
    }
  }
  return samples;
}

/**
 * Create a simple hash key for client-side duplicate detection
 * Uses the same normalization as the server-side hash
 */
export function createTransactionKey(
  date: string | null,
  amount: number | null,
  reference: string | null
): string | null {
  if (!date || amount === null) return null;

  // Normalize date
  const normalizedDate = date.trim();

  // Normalize amount to 2 decimal places
  const normalizedAmount = amount.toFixed(2);

  // Normalize reference: lowercase, trim, collapse whitespace
  const normalizedReference = (reference || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

  return `${normalizedDate}|${normalizedAmount}|${normalizedReference}`;
}

/**
 * Detect intra-batch duplicates (duplicates within the same import)
 * Returns a map of rowIndex -> first occurrence rowIndex
 */
export function detectIntraBatchDuplicates(
  transactions: Array<{
    rowIndex: number;
    accountingDate: string | null;
    amount: number | null;
    reference: string | null;
  }>
): Map<number, number> {
  const keyToFirstRow = new Map<string, number>();
  const duplicates = new Map<number, number>();

  for (const t of transactions) {
    const key = createTransactionKey(t.accountingDate, t.amount, t.reference);
    if (!key) continue;

    if (keyToFirstRow.has(key)) {
      // This is a duplicate - map it to the first occurrence
      duplicates.set(t.rowIndex, keyToFirstRow.get(key)!);
    } else {
      keyToFirstRow.set(key, t.rowIndex);
    }
  }

  return duplicates;
}
