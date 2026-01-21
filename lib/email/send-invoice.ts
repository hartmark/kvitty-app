import { mailer } from "./mailer";
import type { Invoice, Customer, Workspace, InvoiceLanguage } from "@/lib/db/schema";
import { generateInvoicePdf } from "@/lib/utils/invoice-pdf";
import { getTranslations, getLocaleForLanguage, formatTemplate } from "@/lib/translations/invoice";

interface SendInvoiceEmailParams {
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
  invoiceUrl?: string;
  /** Invoice language for customer-facing content (defaults to invoice.language or "sv") */
  language?: InvoiceLanguage;
}

export async function sendInvoiceEmailWithPdf({
  to,
  invoice,
  customer,
  workspace,
  invoiceLines,
  language,
}: SendInvoiceEmailParams): Promise<void> {
  // Get language from parameter, invoice, or default to "sv"
  const lang = language || (invoice.language as InvoiceLanguage) || "sv";
  const t = getTranslations(lang);
  const locale = getLocaleForLanguage(lang);
  const companyName = workspace.orgName || workspace.name;

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

  const subject = formatTemplate(t.emailSubject, {
    invoiceNumber: invoice.invoiceNumber,
    company: companyName,
  });

  const greeting = formatTemplate(t.emailGreeting, { customerName: customer.name });
  const body = formatTemplate(t.emailBody, { invoiceNumber: invoice.invoiceNumber });
  const formattedTotal = parseFloat(invoice.total).toLocaleString(locale, { minimumFractionDigits: 2 });
  const currencyLabel = invoice.currency || "SEK";

  const textContent = `
${greeting}

${body}

${t.invoiceDate}: ${invoice.invoiceDate}
${t.dueDate}: ${invoice.dueDate}
${t.totalToPay}: ${formattedTotal} ${currencyLabel}

${t.emailSeeAttachedPdf}

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
  <h2 style="color: #1a1a1a;">${t.invoice} #${invoice.invoiceNumber}</h2>
  <p style="color: #4a4a4a; line-height: 1.6;">
    ${greeting.replace(customer.name, `<strong>${customer.name}</strong>`)}
  </p>
  <p style="color: #4a4a4a; line-height: 1.6;">
    ${body}
  </p>
  <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin: 24px 0;">
    <p style="margin: 8px 0; color: #4a4a4a;">
      <strong>${t.invoiceDate}:</strong> ${invoice.invoiceDate}
    </p>
    <p style="margin: 8px 0; color: #4a4a4a;">
      <strong>${t.dueDate}:</strong> ${invoice.dueDate}
    </p>
    <p style="margin: 8px 0; color: #4a4a4a;">
      <strong>${t.totalToPay}:</strong> ${formattedTotal} ${currencyLabel}
    </p>
  </div>
  <p style="color: #6b7280; font-size: 14px;">
    ${t.emailSeeAttachedPdf}
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

export async function sendInvoiceEmailWithLink({
  to,
  invoice,
  customer,
  workspace,
  invoiceUrl,
  language,
}: SendInvoiceEmailParams): Promise<void> {
  if (!invoiceUrl) {
    throw new Error("Invoice URL is required for link method");
  }

  // Get language from parameter, invoice, or default to "sv"
  const lang = language || (invoice.language as InvoiceLanguage) || "sv";
  const t = getTranslations(lang);
  const locale = getLocaleForLanguage(lang);
  const companyName = workspace.orgName || workspace.name;

  const subject = formatTemplate(t.emailSubject, {
    invoiceNumber: invoice.invoiceNumber,
    company: companyName,
  });

  const greeting = formatTemplate(t.emailGreeting, { customerName: customer.name });
  const body = formatTemplate(t.emailBody, { invoiceNumber: invoice.invoiceNumber });
  const formattedTotal = parseFloat(invoice.total).toLocaleString(locale, { minimumFractionDigits: 2 });
  const currencyLabel = invoice.currency || "SEK";

  const textContent = `
${greeting}

${body}

${t.invoiceDate}: ${invoice.invoiceDate}
${t.dueDate}: ${invoice.dueDate}
${t.totalToPay}: ${formattedTotal} ${currencyLabel}

${t.emailViewInvoice}: ${invoiceUrl}

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
  <h2 style="color: #1a1a1a;">${t.invoice} #${invoice.invoiceNumber}</h2>
  <p style="color: #4a4a4a; line-height: 1.6;">
    ${greeting.replace(customer.name, `<strong>${customer.name}</strong>`)}
  </p>
  <p style="color: #4a4a4a; line-height: 1.6;">
    ${body}
  </p>
  <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin: 24px 0;">
    <p style="margin: 8px 0; color: #4a4a4a;">
      <strong>${t.invoiceDate}:</strong> ${invoice.invoiceDate}
    </p>
    <p style="margin: 8px 0; color: #4a4a4a;">
      <strong>${t.dueDate}:</strong> ${invoice.dueDate}
    </p>
    <p style="margin: 8px 0; color: #4a4a4a;">
      <strong>${t.totalToPay}:</strong> ${formattedTotal} ${currencyLabel}
    </p>
  </div>
  <p style="margin: 24px 0;">
    <a href="${invoiceUrl}"
       style="display: inline-block; background-color: #0f172a; color: #ffffff;
              padding: 12px 24px; text-decoration: none; border-radius: 6px;
              font-weight: 500;">
      ${t.emailViewInvoice}
    </a>
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
  });
}

