import type { IncomeStatementPdfData } from "../report-pdf/income-statement-pdf";

// Format number with Swedish decimal separator (comma)
function formatNumber(value: number): string {
  return value.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Escape CSV field if it contains semicolon, quotes, or newlines
// Also protect against CSV injection (formula injection)
function escapeCSV(value: string): string {
  // Protect against formula injection by prefixing dangerous characters
  const formulaChars = ['=', '+', '-', '@', '\t', '\r'];
  if (formulaChars.some(char => value.startsWith(char))) {
    value = "'" + value; // Prefix with single quote to neutralize
  }

  // Escape quotes and wrap in quotes if needed
  if (value.includes(";") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function generateIncomeStatementCsv(data: IncomeStatementPdfData): string {
  const { workspace, period, groups, totals } = data;
  const lines: string[] = [];

  // Header section
  lines.push(`Resultatrapport;${escapeCSV(workspace.orgName || workspace.name)};${escapeCSV(period.label)}`);
  lines.push(`Period;${period.startDate} - ${period.endDate}`);
  lines.push(""); // Empty line

  // Summary section
  lines.push("Sammanfattning");
  lines.push(`Intäkter;${formatNumber(totals.revenue)}`);
  lines.push(`Kostnader;${formatNumber(totals.expenses)}`);
  lines.push(`Resultat före skatt;${formatNumber(totals.profitBeforeTax)}`);
  lines.push(`Årets resultat;${formatNumber(totals.profit)}`);
  lines.push(""); // Empty line

  // Table header
  lines.push("Konto;Beskrivning;Belopp");

  // Groups and rows
  groups.forEach((group) => {
    // Only include groups with data
    if (group.rows.length === 0) {
      return;
    }

    // Group name
    lines.push(`;${escapeCSV(group.name)};`);

    // Account rows
    group.rows.forEach((row) => {
      if (Math.abs(row.amount) > 0.01) {
        lines.push(
          `${row.accountNumber};${escapeCSV(row.accountName)};${formatNumber(row.amount)}`
        );
      }
    });

    // Subtotal
    if (Math.abs(group.subtotal) > 0.01) {
      lines.push(`;Summa ${escapeCSV(group.name)};${formatNumber(group.subtotal)}`);
    }

    lines.push(""); // Empty line between groups
  });

  // Total
  lines.push(`;ÅRETS RESULTAT;${formatNumber(totals.profit)}`);

  // Join with CRLF and add UTF-8 BOM for proper Excel encoding
  return lines.join("\r\n");
}
