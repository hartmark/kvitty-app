import type { BalanceSheetPdfData } from "../report-pdf/balance-sheet-pdf";

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

export function generateBalanceSheetCsv(data: BalanceSheetPdfData): string {
  const { workspace, period, assets, equityLiabilities, isBalanced } = data;
  const lines: string[] = [];

  // Header section
  lines.push(`Balansrapport;${escapeCSV(workspace.orgName || workspace.name)};${escapeCSV(period.label)}`);
  lines.push(`Period;${period.startDate} - ${period.endDate}`);

  // Balance indicator
  if (!isBalanced) {
    const difference = assets.total - equityLiabilities.total;
    lines.push(`OBS! Balansräkningen är inte i balans;Skillnad: ${formatNumber(Math.abs(difference))}`);
  }

  lines.push(""); // Empty line

  // Two-column header
  lines.push("TILLGÅNGAR;;EGET KAPITAL & SKULDER;");
  lines.push("Konto;Belopp;Konto;Belopp");

  // Flatten asset groups
  const assetRows: string[][] = [];
  assets.groups.forEach((group) => {
    if (group.rows.length === 0) return;

    assetRows.push([group.name, ""]);

    group.rows.forEach((row) => {
      if (Math.abs(row.amount) > 0.01) {
        assetRows.push([
          `${row.accountNumber} ${escapeCSV(row.accountName)}`,
          formatNumber(row.amount),
        ]);
      }
    });

    if (Math.abs(group.subtotal) > 0.01) {
      assetRows.push([`Summa ${escapeCSV(group.name)}`, formatNumber(group.subtotal)]);
    }
  });

  // Flatten equity & liability groups
  const equityRows: string[][] = [];
  equityLiabilities.groups.forEach((group) => {
    if (group.rows.length === 0) return;

    equityRows.push([group.name, ""]);

    group.rows.forEach((row) => {
      if (Math.abs(row.amount) > 0.01) {
        equityRows.push([
          `${row.accountNumber} ${escapeCSV(row.accountName)}`,
          formatNumber(row.amount),
        ]);
      }
    });

    if (Math.abs(group.subtotal) > 0.01) {
      equityRows.push([`Summa ${escapeCSV(group.name)}`, formatNumber(group.subtotal)]);
    }
  });

  // Combine rows side by side
  const maxRowCount = Math.max(assetRows.length, equityRows.length);
  for (let i = 0; i < maxRowCount; i++) {
    const assetRow = assetRows[i] || ["", ""];
    const equityRow = equityRows[i] || ["", ""];
    lines.push(`${assetRow[0]};${assetRow[1]};${equityRow[0]};${equityRow[1]}`);
  }

  lines.push(""); // Empty line

  // Totals
  lines.push(
    `SUMMA TILLGÅNGAR;${formatNumber(assets.total)};SUMMA EGET KAPITAL & SKULDER;${formatNumber(equityLiabilities.total)}`
  );

  // Join with CRLF
  return lines.join("\r\n");
}
