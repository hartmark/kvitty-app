// Swedish tax tables (Skattetabeller) for employee income tax deduction
// Tables 29-42, columns 1-6
// Data sourced from Skatteverket: https://skatteverket.entryscape.net/rowstore/dataset/88320397-5c32-4c16-ae79-d36d95b17b95

import taxTables2026 from "@/public/tax-tables-2026.json";

export const TAX_TABLE_OPTIONS = [
  29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42,
] as const;

export const TAX_COLUMN_OPTIONS = [1, 2, 3, 4, 5, 6] as const;

export type TaxTable = (typeof TAX_TABLE_OPTIONS)[number];
export type TaxColumn = (typeof TAX_COLUMN_OPTIONS)[number];

// Tax table descriptions for UI
export const TAX_TABLE_DESCRIPTIONS: Record<number, string> = {
  29: "Tabell 29",
  30: "Tabell 30",
  31: "Tabell 31",
  32: "Tabell 32",
  33: "Tabell 33",
  34: "Tabell 34",
  35: "Tabell 35",
  36: "Tabell 36",
  37: "Tabell 37",
  38: "Tabell 38",
  39: "Tabell 39",
  40: "Tabell 40",
  41: "Tabell 41",
  42: "Tabell 42",
};

// Tax column descriptions for UI
export const TAX_COLUMN_DESCRIPTIONS: Record<number, string> = {
  1: "Kolumn 1",
  2: "Kolumn 2",
  3: "Kolumn 3",
  4: "Kolumn 4",
  5: "Kolumn 5",
  6: "Kolumn 6",
};

// Type definitions for tax table data
interface TaxBracket {
  incomeFrom: number;
  incomeTo: number;
  columns: number[];
}

interface TaxTablesData {
  year: number;
  period: string;
  fetchedAt: string;
  tables: Record<string, TaxBracket[]>;
}

// Get tax tables for a given year
function getTaxTables(year: number = 2026): TaxTablesData {
  if (year === 2026) {
    return taxTables2026 as TaxTablesData;
  }
  throw new Error(`Skattetabell för år ${year} finns inte`);
}

// Calculate tax deduction using tax tables
export function calculateTaxFromTable(
  grossSalary: number,
  taxTable: number,
  taxColumn: number
): number {
  const tables = getTaxTables();

  const tableData = tables.tables[taxTable.toString()];
  if (!tableData) {
    throw new Error(`Skattetabell ${taxTable} hittades inte`);
  }

  // Find the appropriate income bracket
  const bracket = tableData.find(
    (b) => grossSalary >= b.incomeFrom && grossSalary <= b.incomeTo
  );

  if (!bracket) {
    // If income exceeds all brackets, use highest bracket
    const lastBracket = tableData[tableData.length - 1];
    if (lastBracket && grossSalary > lastBracket.incomeTo) {
      const taxAmount = lastBracket.columns[taxColumn - 1];
      if (taxAmount === undefined) {
        throw new Error(`Skattekolumn ${taxColumn} hittades inte i tabell ${taxTable}`);
      }
      return taxAmount;
    }
    // Income below all brackets = 0 tax
    return 0;
  }

  // Column indices are 0-based in the array (column 1 = index 0)
  const taxAmount = bracket.columns[taxColumn - 1];
  if (taxAmount === undefined) {
    throw new Error(`Skattekolumn ${taxColumn} hittades inte i tabell ${taxTable}`);
  }
  return taxAmount;
}
