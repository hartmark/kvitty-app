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

interface IncomeStatementGroup {
  name: string;
  rows: Array<{
    accountNumber: number;
    accountName: string;
    amount: number;
  }>;
  subtotal: number;
}

interface IncomeStatementTotals {
  revenue: number;
  expenses: number;
  tax: number;
  profitBeforeTax: number;
  profit: number;
}

export interface IncomeStatementPdfData {
  workspace: WorkspaceForReportPdf;
  period: ReportPeriodInfo;
  groups: IncomeStatementGroup[];
  totals: IncomeStatementTotals;
}

export function generateIncomeStatementPdf(data: IncomeStatementPdfData): jsPDF {
  const { workspace, period, groups, totals } = data;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;

  // Add header
  let y = addHeader(doc, workspace, "RESULTATRAPPORT", period);
  y += 5;

  // Add summary section
  const cardWidth = (pageWidth - 2 * margin - 9) / 4; // 4 cards with 3px spacing
  const cardHeight = 18;
  const cardY = y;

  // Draw summary cards with minimal styling
  const summaryData = [
    { label: "Intäkter", value: totals.revenue },
    { label: "Kostnader", value: totals.expenses },
    { label: "Resultat före skatt", value: totals.profitBeforeTax },
    { label: "Årets resultat", value: totals.profit },
  ];

  summaryData.forEach((item, index) => {
    const cardX = margin + index * (cardWidth + 3);

    // Simple border
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    doc.rect(cardX, cardY, cardWidth, cardHeight);

    // Label
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0);
    doc.text(item.label, cardX + cardWidth / 2, cardY + 6, { align: "center" });

    // Value
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    const valueText = formatCurrency(item.value);
    doc.text(valueText, cardX + cardWidth / 2, cardY + 13, { align: "center" });
  });

  doc.setTextColor(0);
  y = cardY + cardHeight + 12;

  // Build table rows
  const tableRows: TableRow[] = [];

  groups.forEach((group) => {
    // Only include groups with data
    if (group.rows.length === 0) {
      return;
    }

    // Group header
    tableRows.push({
      values: [group.name, ""],
      isGroupHeader: true,
    });

    // Account rows
    group.rows.forEach((row) => {
      if (Math.abs(row.amount) > 0.01) {
        tableRows.push({
          values: [
            `${row.accountNumber} ${row.accountName}`,
            formatCurrency(row.amount),
          ],
        });
      }
    });

    // Subtotal
    if (Math.abs(group.subtotal) > 0.01) {
      tableRows.push({
        values: [`Summa ${group.name}`, formatCurrency(group.subtotal)],
        isSubtotal: true,
      });
      // Add spacing
      tableRows.push({
        values: ["", ""],
      });
    }
  });

  // Add total row
  tableRows.push({
    values: ["ÅRETS RESULTAT", formatCurrency(totals.profit)],
    isTotal: true,
  });

  // Draw table
  if (tableRows.length > 0) {
    drawTable(doc, {
      columns: [
        { header: "Konto", width: 120, align: "left" },
        { header: "Belopp (kr)", width: 50, align: "right" },
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
