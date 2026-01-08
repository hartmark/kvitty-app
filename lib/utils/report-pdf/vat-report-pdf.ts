import { jsPDF } from "jspdf";
import {
  WorkspaceForReportPdf,
  ReportPeriodInfo,
  formatCurrency,
  formatDate,
  addHeader,
  addFooter,
  drawTable,
  type TableRow,
} from "./common";

interface VatOutputData {
  vat25: number;
  vat12: number;
  vat6: number;
  total: number;
}

interface VatPaymentData {
  bankgiro: string;
  recipient: string;
}

export interface VatReportPdfData {
  workspace: WorkspaceForReportPdf;
  period: ReportPeriodInfo;
  frequency: "monthly" | "quarterly" | "yearly";
  outputVat: VatOutputData;
  inputVat: number;
  netVat: number;
  deadline: string;
  payment: VatPaymentData;
}

export function generateVatReportPdf(data: VatReportPdfData): jsPDF {
  const { workspace, period, frequency, outputVat, inputVat, netVat, deadline, payment } = data;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;

  // Add header
  let y = addHeader(doc, workspace, "MOMSRAPPORT", period);
  y += 5;

  // Frequency
  const frequencyLabels = {
    monthly: "Månadsvis",
    quarterly: "Kvartalsvis",
    yearly: "Årsvis",
  };
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0);
  doc.text(`Rapporteringsfrekvens: ${frequencyLabels[frequency]}`, margin, y);
  y += 10;

  // Payment info box with border
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.rect(margin, y, pageWidth - 2 * margin, 28);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text("Betalningsinformation", margin + 5, y + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Bankgiro: ${payment.bankgiro}`, margin + 5, y + 15);
  doc.text(`Mottagare: ${payment.recipient}`, margin + 5, y + 21);

  // Right side - amount and deadline
  const rightX = pageWidth - margin - 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const amountLabel = netVat >= 0 ? "Att betala:" : "Att få tillbaka:";
  doc.text(amountLabel, rightX, y + 12, { align: "right" });
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  const amountText = formatCurrency(Math.abs(netVat));
  doc.text(amountText, rightX, y + 20, { align: "right" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Sista betalningsdag: ${formatDate(deadline)}`, rightX, y + 25, { align: "right" });

  y += 38;

  // Build table rows
  const tableRows: TableRow[] = [];

  // Output VAT section
  tableRows.push({
    values: ["UTGÅENDE MOMS", ""],
    isGroupHeader: true,
  });

  if (outputVat.vat25 > 0.01) {
    tableRows.push({
      values: ["Försäljning 25% moms", formatCurrency(outputVat.vat25)],
    });
  }

  if (outputVat.vat12 > 0.01) {
    tableRows.push({
      values: ["Försäljning 12% moms", formatCurrency(outputVat.vat12)],
    });
  }

  if (outputVat.vat6 > 0.01) {
    tableRows.push({
      values: ["Försäljning 6% moms", formatCurrency(outputVat.vat6)],
    });
  }

  tableRows.push({
    values: ["Summa utgående moms", formatCurrency(outputVat.total)],
    isSubtotal: true,
  });

  // Spacing
  tableRows.push({
    values: ["", ""],
  });

  // Input VAT section
  tableRows.push({
    values: ["INGÅENDE MOMS", ""],
    isGroupHeader: true,
  });

  if (inputVat > 0.01) {
    tableRows.push({
      values: ["Inköp med moms", formatCurrency(inputVat)],
    });
  }

  tableRows.push({
    values: ["Summa ingående moms", formatCurrency(inputVat)],
    isSubtotal: true,
  });

  // Spacing
  tableRows.push({
    values: ["", ""],
  });

  // Net VAT
  tableRows.push({
    values: [
      netVat >= 0 ? "ATT BETALA TILL SKATTEVERKET" : "ATT FÅ TILLBAKA FRÅN SKATTEVERKET",
      formatCurrency(Math.abs(netVat)),
    ],
    isTotal: true,
  });

  // Draw table
  drawTable(doc, {
    columns: [
      { header: "Beskrivning", width: 120, align: "left" },
      { header: "Belopp (kr)", width: 50, align: "right" },
    ],
    rows: tableRows,
    startY: y,
    margin,
  });

  // Add footer
  addFooter(doc, workspace);

  return doc;
}
