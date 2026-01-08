import type { VatReportPdfData } from "../report-pdf/vat-report-pdf";

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

export function generateVatReportCsv(data: VatReportPdfData): string {
  const { workspace, period, frequency, outputVat, inputVat, netVat, deadline, payment } = data;
  const lines: string[] = [];

  // Frequency labels
  const frequencyLabels = {
    monthly: "Månadsvis",
    quarterly: "Kvartalsvis",
    yearly: "Årsvis",
  };

  // Header section
  lines.push(`Momsrapport;${escapeCSV(workspace.orgName || workspace.name)};${escapeCSV(period.label)}`);
  lines.push(`Period;${period.startDate} - ${period.endDate}`);
  lines.push(`Rapporteringsfrekvens;${frequencyLabels[frequency]}`);
  lines.push(""); // Empty line

  // Payment information
  lines.push("BETALNINGSINFORMATION");
  lines.push(`Bankgiro;${payment.bankgiro}`);
  lines.push(`Mottagare;${escapeCSV(payment.recipient)}`);
  lines.push(`Sista betalningsdag;${deadline}`);
  lines.push(`${netVat >= 0 ? "Att betala" : "Att få tillbaka"};${formatNumber(Math.abs(netVat))}`);
  lines.push(""); // Empty line

  // Table header
  lines.push("Beskrivning;Belopp");

  // Output VAT
  lines.push("UTGÅENDE MOMS;");
  if (outputVat.vat25 > 0.01) {
    lines.push(`Försäljning 25% moms;${formatNumber(outputVat.vat25)}`);
  }
  if (outputVat.vat12 > 0.01) {
    lines.push(`Försäljning 12% moms;${formatNumber(outputVat.vat12)}`);
  }
  if (outputVat.vat6 > 0.01) {
    lines.push(`Försäljning 6% moms;${formatNumber(outputVat.vat6)}`);
  }
  lines.push(`Summa utgående moms;${formatNumber(outputVat.total)}`);
  lines.push(""); // Empty line

  // Input VAT
  lines.push("INGÅENDE MOMS;");
  if (inputVat > 0.01) {
    lines.push(`Inköp med moms;${formatNumber(inputVat)}`);
  }
  lines.push(`Summa ingående moms;${formatNumber(inputVat)}`);
  lines.push(""); // Empty line

  // Net VAT
  lines.push(
    `${netVat >= 0 ? "ATT BETALA TILL SKATTEVERKET" : "ATT FÅ TILLBAKA FRÅN SKATTEVERKET"};${formatNumber(Math.abs(netVat))}`
  );

  // Join with CRLF
  return lines.join("\r\n");
}
