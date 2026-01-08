import { jsPDF } from "jspdf";

// Workspace type for report PDF generation
export interface WorkspaceForReportPdf {
  id: string;
  name: string;
  orgName?: string | null;
  orgNumber?: string | null;
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
}

// Period info for reports
export interface ReportPeriodInfo {
  label: string;
  startDate: string;
  endDate: string;
}

// Format currency in Swedish format (SEK)
export function formatCurrency(value: number): string {
  return value.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Format date in Swedish format
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("sv-SE");
}

// Add standard report header
export function addHeader(
  doc: jsPDF,
  workspace: WorkspaceForReportPdf,
  title: string,
  period: ReportPeriodInfo
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = margin;

  // Left side - Company info
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(workspace.orgName || workspace.name, margin, y);

  y += 7;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  if (workspace.orgNumber) {
    doc.text(`Org.nr: ${workspace.orgNumber}`, margin, y);
    y += 5;
  }
  if (workspace.address) {
    doc.text(workspace.address, margin, y);
    y += 5;
  }
  if (workspace.postalCode || workspace.city) {
    doc.text(`${workspace.postalCode || ""} ${workspace.city || ""}`.trim(), margin, y);
    y += 5;
  }

  // Right side - Report title and period
  const rightX = pageWidth - margin;
  let rightY = margin;

  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text(title, rightX, rightY, { align: "right" });

  rightY += 10;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(period.label, rightX, rightY, { align: "right" });

  rightY += 6;
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`${formatDate(period.startDate)} - ${formatDate(period.endDate)}`, rightX, rightY, { align: "right" });
  doc.setTextColor(0);

  // Return y position after header
  return Math.max(y, rightY) + 10;
}

// Add standard footer
export function addFooter(doc: jsPDF, workspace: WorkspaceForReportPdf): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);

  const now = new Date();
  const footerText = `Genererad av ${workspace.name} - ${now.toLocaleDateString("sv-SE")} ${now.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })}`;
  doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: "center" });

  doc.setTextColor(0);
}

// Add section title
export function addSectionTitle(doc: jsPDF, title: string, y: number, margin = 20): number {
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(title, margin, y);

  return y + 8;
}

// Table drawing options
export interface TableColumn {
  header: string;
  width: number;
  align?: "left" | "right" | "center";
}

export interface TableRow {
  values: string[];
  isBold?: boolean;
  isSubtotal?: boolean;
  isTotal?: boolean;
  isGroupHeader?: boolean;
}

export interface TableOptions {
  columns: TableColumn[];
  rows: TableRow[];
  startY: number;
  margin?: number;
}

// Draw a table with automatic pagination
export function drawTable(doc: jsPDF, options: TableOptions): number {
  const { columns, rows, startY, margin = 20 } = options;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxY = pageHeight - 30; // Leave room for footer

  let y = startY;

  // Draw table header
  function drawTableHeader(yPos: number): number {
    // Draw top border
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos - 5, pageWidth - margin, yPos - 5);

    // Draw bottom border
    doc.line(margin, yPos + 3, pageWidth - margin, yPos + 3);

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);

    let colX = margin + 2;
    columns.forEach((col, index) => {
      const align = col.align || "left";
      if (align === "right" && index === columns.length - 1) {
        doc.text(col.header, pageWidth - margin - 2, yPos, { align: "right" });
      } else {
        doc.text(col.header, colX, yPos);
      }
      colX += col.width;
    });

    return yPos + 8;
  }

  y = drawTableHeader(y);

  // Draw table rows
  for (const row of rows) {
    // Check if we need a new page
    if (y > maxY) {
      doc.addPage();
      y = margin + 10;
      y = drawTableHeader(y);
    }

    // Apply row styling
    if (row.isTotal) {
      // Draw double line above total
      doc.setDrawColor(0);
      doc.setLineWidth(0.5);
      doc.line(margin, y - 7, pageWidth - margin, y - 7);
      doc.line(margin, y - 5, pageWidth - margin, y - 5);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
    } else if (row.isSubtotal) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      // Draw single line above subtotal
      doc.setDrawColor(0);
      doc.setLineWidth(0.3);
      doc.line(margin, y - 6, pageWidth - margin, y - 6);
    } else if (row.isGroupHeader) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(0);
    } else if (row.isBold) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
    }
    doc.setTextColor(0);

    // Draw row values
    let colX = margin + 2;
    row.values.forEach((value, index) => {
      const col = columns[index];
      const align = col?.align || "left";

      if (align === "right" && index === columns.length - 1) {
        doc.text(value, pageWidth - margin - 2, y, { align: "right" });
      } else if (align === "center") {
        doc.text(value, colX + col.width / 2, y, { align: "center" });
      } else {
        doc.text(value, colX, y);
      }

      if (col) {
        colX += col.width;
      }
    });

    doc.setTextColor(0);
    y += row.isGroupHeader ? 5 : 6;
  }

  return y;
}
