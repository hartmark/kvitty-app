import { jsPDF } from "jspdf";
import {
  WorkspaceForReportPdf,
  ReportPeriodInfo,
  formatCurrency,
  addHeader,
  addFooter,
  drawTable,
  type TableRow,
} from "./common";

interface BalanceSheetGroup {
  name: string;
  rows: Array<{
    accountNumber: number;
    accountName: string;
    amount: number;
  }>;
  subtotal: number;
}

interface BalanceSheetSection {
  groups: BalanceSheetGroup[];
  total: number;
}

export interface BalanceSheetPdfData {
  workspace: WorkspaceForReportPdf;
  period: ReportPeriodInfo;
  assets: BalanceSheetSection;
  equityLiabilities: BalanceSheetSection;
  currentYearProfit: number;
  isBalanced: boolean;
}

export function generateBalanceSheetPdf(data: BalanceSheetPdfData): jsPDF {
  const { workspace, period, assets, equityLiabilities, isBalanced } = data;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;

  // Add header
  let y = addHeader(doc, workspace, "BALANSRAPPORT", period);
  y += 5;

  // Balance indicator
  if (!isBalanced) {
    // Draw border for warning
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.rect(margin, y, pageWidth - 2 * margin, 12);

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    const difference = assets.total - equityLiabilities.total;
    doc.text(
      `OBS: Balansräkningen är inte i balans. Skillnad: ${formatCurrency(Math.abs(difference))}`,
      pageWidth / 2,
      y + 8,
      { align: "center" }
    );
    doc.setTextColor(0);
    y += 18;
  }

  // Build table rows for two-column layout
  const tableRows: TableRow[] = [];

  // Header row
  tableRows.push({
    values: ["TILLGÅNGAR", "", "EGET KAPITAL & SKULDER", ""],
    isBold: true,
    isGroupHeader: true,
  });
  tableRows.push({
    values: ["", "", "", ""],
  });

  // Get max rows to iterate
  const maxAssetRows = assets.groups.reduce(
    (sum, g) => sum + g.rows.length + 2,
    0
  );
  const maxEquityRows = equityLiabilities.groups.reduce(
    (sum, g) => sum + g.rows.length + 2,
    0
  );
  const maxRows = Math.max(maxAssetRows, maxEquityRows);

  // Flatten asset groups into rows
  const assetRows: string[][] = [];
  assets.groups.forEach((group) => {
    if (group.rows.length === 0) return;

    // Group header
    assetRows.push([group.name, ""]);

    // Account rows
    group.rows.forEach((row) => {
      if (Math.abs(row.amount) > 0.01) {
        assetRows.push([
          `  ${row.accountNumber} ${row.accountName}`,
          formatCurrency(row.amount),
        ]);
      }
    });

    // Subtotal
    if (Math.abs(group.subtotal) > 0.01) {
      assetRows.push([`Summa ${group.name}`, formatCurrency(group.subtotal)]);
    }
  });

  // Flatten equity & liability groups into rows
  const equityRows: string[][] = [];
  equityLiabilities.groups.forEach((group) => {
    if (group.rows.length === 0) return;

    // Group header
    equityRows.push([group.name, ""]);

    // Account rows
    group.rows.forEach((row) => {
      if (Math.abs(row.amount) > 0.01) {
        equityRows.push([
          `  ${row.accountNumber} ${row.accountName}`,
          formatCurrency(row.amount),
        ]);
      }
    });

    // Subtotal
    if (Math.abs(group.subtotal) > 0.01) {
      equityRows.push([`Summa ${group.name}`, formatCurrency(group.subtotal)]);
    }
  });

  // Combine rows side by side
  const maxRowCount = Math.max(assetRows.length, equityRows.length);
  for (let i = 0; i < maxRowCount; i++) {
    const assetRow = assetRows[i] || ["", ""];
    const equityRow = equityRows[i] || ["", ""];
    tableRows.push({
      values: [...assetRow, ...equityRow],
    });
  }

  // Add spacing before totals
  tableRows.push({
    values: ["", "", "", ""],
  });

  // Total row
  tableRows.push({
    values: [
      "SUMMA TILLGÅNGAR",
      formatCurrency(assets.total),
      "SUMMA EGET KAPITAL & SKULDER",
      formatCurrency(equityLiabilities.total),
    ],
    isTotal: true,
  });

  // Draw table
  if (tableRows.length > 0) {
    drawTable(doc, {
      columns: [
        { header: "Tillgång", width: 60, align: "left" },
        { header: "Belopp", width: 25, align: "right" },
        { header: "Eget kapital & skulder", width: 60, align: "left" },
        { header: "Belopp", width: 25, align: "right" },
      ],
      rows: tableRows,
      startY: y,
      margin,
    });
  } else {
    // Empty report
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100);
    doc.text("Inga transaktioner för denna period", margin, y);
  }

  // Add footer
  addFooter(doc, workspace);

  return doc;
}
