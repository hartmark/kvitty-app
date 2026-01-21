import { mailer } from "./mailer";
import type { Invoice, Customer, Workspace, InvoiceLanguage } from "@/lib/db/schema";
import { generateInvoicePdf } from "@/lib/utils/invoice-pdf";
import { getTranslations, getLocaleForLanguage, formatTemplate } from "@/lib/translations/invoice";

interface SendReminderEmailParams {
  to: string;
  invoice: Invoice;
  customer: Customer;
  workspace: Workspace;
  invoiceLines: Array<{
    description: string;
    quantity: string;
    unitPrice: string;
    vatRate: number;
    amount: string;
  }>;
  daysOverdue: number;
  reminderNumber: number;
  customMessage?: string;
  /** Invoice language for customer-facing content (defaults to invoice.language or "sv") */
  language?: InvoiceLanguage;
}

export async function sendReminderEmailWithPdf({
  to,
  invoice,
  customer,
  workspace,
  invoiceLines,
  daysOverdue,
  reminderNumber,
  customMessage,
  language,
}: SendReminderEmailParams): Promise<void> {
  // Get language from parameter, invoice, or default to "sv"
  const lang = language || (invoice.language as InvoiceLanguage) || "sv";
  const t = getTranslations(lang);
  const locale = getLocaleForLanguage(lang);
  const companyName = workspace.orgName || workspace.name;
  const currencyLabel = invoice.currency || "SEK";
  const formattedTotal = parseFloat(invoice.total).toLocaleString(locale, { minimumFractionDigits: 2 });

  const pdfDoc = generateInvoicePdf({
    workspace,
    invoice,
    customer,
    lines: invoiceLines.map((line) => ({
      id: "",
      invoiceId: invoice.id,
      productId: null,
      lineType: "product" as const,
      description: line.description,
      quantity: line.quantity,
      unit: null,
      unitPrice: line.unitPrice,
      vatRate: line.vatRate,
      productType: null,
      amount: line.amount,
      sortOrder: 0,
      purchasePrice: null,
      isLabor: null,
      isMaterial: null,
    })),
    language: lang,
  });

  const pdfBuffer = Buffer.from(pdfDoc.output("arraybuffer") as ArrayBuffer);
  const pdfBase64 = pdfBuffer.toString("base64");

  const subject = formatTemplate(t.reminderSubject, {
    reminderNumber,
    invoiceNumber: invoice.invoiceNumber,
    company: companyName,
  });

  const overdueText = daysOverdue === 1
    ? t.reminderOverdueDay
    : formatTemplate(t.reminderOverdueDays, { days: daysOverdue });

  const defaultMessage = formatTemplate(t.reminderDefaultMessage, {
    invoiceNumber: invoice.invoiceNumber,
    dueDate: formatDate(invoice.dueDate, locale),
    overdueText,
  });

  const messageContent = customMessage || defaultMessage;
  const greeting = formatTemplate(t.emailGreeting, { customerName: customer.name });

  const textContent = `
${t.reminderHeader}

${greeting}

${messageContent}

${t.reminderInvoiceInfo}:
- ${t.invoiceNumber}: ${invoice.invoiceNumber}
- ${t.invoiceDate}: ${formatDate(invoice.invoiceDate, locale)}
- ${t.dueDate}: ${formatDate(invoice.dueDate, locale)}
- ${t.reminderOverdue}: ${overdueText}
- ${t.totalToPay}: ${formattedTotal} ${currencyLabel}

${t.reminderSeePdf}

${t.emailBestRegards}
${companyName}
  `.trim();

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
  <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
    <h2 style="color: #991b1b; margin: 0 0 8px 0; font-size: 18px;">
      ${formatTemplate(t.reminderSubject, { reminderNumber, invoiceNumber: invoice.invoiceNumber, company: "" }).replace(` ${lang === "sv" ? "från" : "from"} `, "")}
    </h2>
    <p style="color: #dc2626; margin: 0; font-size: 14px;">
      ${t.reminderOverdue} - ${overdueText}
    </p>
  </div>

  <p style="color: #4a4a4a; line-height: 1.6;">
    ${greeting.replace(customer.name, `<strong>${customer.name}</strong>`)}
  </p>

  <p style="color: #4a4a4a; line-height: 1.6; white-space: pre-line;">
    ${messageContent}
  </p>

  <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin: 24px 0;">
    <h3 style="margin: 0 0 12px 0; color: #1a1a1a; font-size: 14px;">${t.reminderInvoiceInfo}</h3>
    <p style="margin: 8px 0; color: #4a4a4a;">
      <strong>${t.invoiceNumber}:</strong> ${invoice.invoiceNumber}
    </p>
    <p style="margin: 8px 0; color: #4a4a4a;">
      <strong>${t.invoiceDate}:</strong> ${formatDate(invoice.invoiceDate, locale)}
    </p>
    <p style="margin: 8px 0; color: #4a4a4a;">
      <strong>${t.dueDate}:</strong> <span style="color: #dc2626;">${formatDate(invoice.dueDate, locale)}</span>
    </p>
    <p style="margin: 8px 0; color: #dc2626; font-weight: 500;">
      <strong>${t.reminderOverdue}:</strong> ${overdueText}
    </p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 12px 0;">
    <p style="margin: 8px 0; color: #1a1a1a; font-size: 16px;">
      <strong>${t.totalToPay}:</strong> ${formattedTotal} ${currencyLabel}
    </p>
  </div>

  <p style="color: #6b7280; font-size: 14px;">
    ${t.reminderSeePdf}
  </p>

  <p style="color: #6b7280; font-size: 14px; margin-top: 16px;">
    ${t.reminderIgnoreIfPaid}
  </p>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
  <p style="color: #9ca3af; font-size: 12px;">
    ${t.emailBestRegards}<br>
    ${companyName}
  </p>
</body>
</html>
  `.trim();

  await mailer.sendMail({
    from: process.env.EMAIL_FROM || "noreply@kvitty.app",
    to,
    subject,
    text: textContent,
    html: htmlContent,
    attachments: [
      {
        filename: `Faktura_${invoice.invoiceNumber}.pdf`,
        content: pdfBase64,
        encoding: "base64",
      },
    ],
  });
}

function formatDate(dateStr: string, locale: string = "sv-SE"): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(locale);
}
