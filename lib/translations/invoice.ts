import type { InvoiceLanguage } from "@/lib/db/schema";
import type { ProductUnit } from "@/lib/validations/product";

// Available invoice languages
export const invoiceLanguages = ["sv", "en"] as const;

// Language display labels
export const invoiceLanguageLabels: Record<InvoiceLanguage, string> = {
  sv: "Svenska",
  en: "English",
};

// Translation interface for all translatable invoice content
export interface InvoiceTranslations {
  // PDF Header
  invoice: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  reference: string;
  orgNumber: string;
  vatNumber: string;

  // Customer section
  customer: string;

  // Line items table
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  vat: string;
  amount: string;

  // Totals
  subtotalExclVat: string;
  vatLabel: string;
  totalToPay: string;

  // Payment info
  paymentInfo: string;
  bankgiro: string;
  plusgiro: string;
  swish: string;
  iban: string;
  bic: string;
  payment: string;
  ocrNumber: string;
  markPaymentWith: string;

  // Swish QR
  payWithSwish: string;

  // ROT/RUT
  rotDeduction: string;
  rutDeduction: string;
  laborCostBeforeDeduction: string;
  materialAndTravelCosts: string;
  taxReduction: string;
  personalNumber: string;
  property: string;

  // Compliance notices
  vatExemptNotice: string;
  reverseChargeNotice: string;
  buyerVatNumber: string;
  marginSchemeNotice: string;

  // Delivery terms
  deliveryTerms: string;

  // Payment footer
  paymentTerms: string;
  paymentTermsTemplate: string; // "{days} days net"
  latePaymentInterest: string;
  latePaymentInterestLegal: string;

  // Email content
  emailSubject: string;
  emailGreeting: string;
  emailBody: string;
  emailViewInvoice: string;
  emailSeeAttachedPdf: string;
  emailBestRegards: string;

  // Reminder email
  reminderSubject: string;
  reminderHeader: string;
  reminderOverdue: string;
  reminderOverdueDay: string;
  reminderOverdueDays: string;
  reminderDefaultMessage: string;
  reminderInvoiceInfo: string;
  reminderSeePdf: string;
  reminderIgnoreIfPaid: string;
}

// Swedish translations
const svTranslations: InvoiceTranslations = {
  // PDF Header
  invoice: "FAKTURA",
  invoiceNumber: "Fakturanummer",
  invoiceDate: "Fakturadatum",
  dueDate: "Förfallodatum",
  reference: "Referens",
  orgNumber: "Org.nr",
  vatNumber: "VAT-nr",

  // Customer section
  customer: "Kund",

  // Line items table
  description: "Beskrivning",
  quantity: "Antal",
  unit: "Enhet",
  unitPrice: "À-pris",
  vat: "Moms",
  amount: "Belopp",

  // Totals
  subtotalExclVat: "Summa exkl. moms",
  vatLabel: "Moms",
  totalToPay: "Att betala",

  // Payment info
  paymentInfo: "Betalningsinformation",
  bankgiro: "Bankgiro",
  plusgiro: "Plusgiro",
  swish: "Swish",
  iban: "IBAN",
  bic: "BIC",
  payment: "Betalning",
  ocrNumber: "OCR-nummer",
  markPaymentWith: "Märk betalningen med: Faktura",

  // Swish QR
  payWithSwish: "Betala med Swish",

  // ROT/RUT
  rotDeduction: "ROT-avdrag",
  rutDeduction: "RUT-avdrag",
  laborCostBeforeDeduction: "Arbetskostnad före skattereduktion",
  materialAndTravelCosts: "Material och resekostnader",
  taxReduction: "Skattereduktion",
  personalNumber: "Personnr",
  property: "Fastighet",

  // Compliance notices
  vatExemptNotice: "Undantagen från skatteplikt enligt 18 kap. mervärdesskattelagen",
  reverseChargeNotice: "Omvänd betalningsskyldighet enligt 10 kap. mervärdesskattelagen",
  buyerVatNumber: "Köparens VAT-nr",
  marginSchemeNotice: "Vinstmarginalbeskattning tillämpas enligt 18 kap. mervärdesskattelagen",

  // Delivery terms
  deliveryTerms: "Leveransvillkor",

  // Payment footer
  paymentTerms: "Betalningsvillkor",
  paymentTermsTemplate: "{days} dagar netto",
  latePaymentInterest: "ränta",
  latePaymentInterestLegal: "dröjsmålsränta enligt lag",

  // Email content
  emailSubject: "Faktura #{invoiceNumber} från {company}",
  emailGreeting: "Hej {customerName}!",
  emailBody: "Vi skickar härmed faktura #{invoiceNumber}.",
  emailViewInvoice: "Visa faktura",
  emailSeeAttachedPdf: "Se bifogad PDF för detaljer.",
  emailBestRegards: "Med vänliga hälsningar,",

  // Reminder email
  reminderSubject: "Påminnelse {reminderNumber}: Obetald faktura #{invoiceNumber} från {company}",
  reminderHeader: "Påminnelse om obetald faktura",
  reminderOverdue: "Förfallodatum har passerat",
  reminderOverdueDay: "1 dag försenad",
  reminderOverdueDays: "{days} dagar försenad",
  reminderDefaultMessage: "Vi vill påminna dig om att betalning för faktura #{invoiceNumber} ännu inte har registrerats. Förfallodatumet ({dueDate}) har passerat och fakturan är nu {overdueText}.\n\nVänligen betala det utestående beloppet snarast möjligt. Om betalning redan är gjord, bortse från denna påminnelse.",
  reminderInvoiceInfo: "Fakturainformation",
  reminderSeePdf: "Se bifogad PDF för fullständiga fakturadetaljer.",
  reminderIgnoreIfPaid: "Om betalning redan är gjord, vänligen bortse från denna påminnelse.",
};

// English translations
const enTranslations: InvoiceTranslations = {
  // PDF Header
  invoice: "INVOICE",
  invoiceNumber: "Invoice number",
  invoiceDate: "Invoice date",
  dueDate: "Due date",
  reference: "Reference",
  orgNumber: "Org. no.",
  vatNumber: "VAT no.",

  // Customer section
  customer: "Customer",

  // Line items table
  description: "Description",
  quantity: "Qty",
  unit: "Unit",
  unitPrice: "Unit price",
  vat: "VAT",
  amount: "Amount",

  // Totals
  subtotalExclVat: "Subtotal excl. VAT",
  vatLabel: "VAT",
  totalToPay: "Total due",

  // Payment info
  paymentInfo: "Payment information",
  bankgiro: "Bankgiro",
  plusgiro: "Plusgiro",
  swish: "Swish",
  iban: "IBAN",
  bic: "BIC",
  payment: "Payment",
  ocrNumber: "OCR number",
  markPaymentWith: "Reference: Invoice",

  // Swish QR
  payWithSwish: "Pay with Swish",

  // ROT/RUT
  rotDeduction: "ROT deduction",
  rutDeduction: "RUT deduction",
  laborCostBeforeDeduction: "Labor cost before tax deduction",
  materialAndTravelCosts: "Materials and travel costs",
  taxReduction: "Tax reduction",
  personalNumber: "Personal ID",
  property: "Property",

  // Compliance notices
  vatExemptNotice: "VAT exempt pursuant to Chapter 18 of the Swedish VAT Act",
  reverseChargeNotice: "Reverse charge applies pursuant to Chapter 10 of the Swedish VAT Act",
  buyerVatNumber: "Buyer's VAT no.",
  marginSchemeNotice: "Margin scheme applies pursuant to Chapter 18 of the Swedish VAT Act",

  // Delivery terms
  deliveryTerms: "Delivery terms",

  // Payment footer
  paymentTerms: "Payment terms",
  paymentTermsTemplate: "{days} days net",
  latePaymentInterest: "interest",
  latePaymentInterestLegal: "late payment interest according to law",

  // Email content
  emailSubject: "Invoice #{invoiceNumber} from {company}",
  emailGreeting: "Hello {customerName}!",
  emailBody: "Please find attached invoice #{invoiceNumber}.",
  emailViewInvoice: "View invoice",
  emailSeeAttachedPdf: "Please see the attached PDF for details.",
  emailBestRegards: "Best regards,",

  // Reminder email
  reminderSubject: "Reminder {reminderNumber}: Unpaid invoice #{invoiceNumber} from {company}",
  reminderHeader: "Payment reminder",
  reminderOverdue: "Payment overdue",
  reminderOverdueDay: "1 day overdue",
  reminderOverdueDays: "{days} days overdue",
  reminderDefaultMessage: "We would like to remind you that payment for invoice #{invoiceNumber} has not yet been received. The due date ({dueDate}) has passed and the invoice is now {overdueText}.\n\nPlease arrange payment at your earliest convenience. If payment has already been made, please disregard this reminder.",
  reminderInvoiceInfo: "Invoice details",
  reminderSeePdf: "Please see the attached PDF for complete invoice details.",
  reminderIgnoreIfPaid: "If payment has already been made, please disregard this reminder.",
};

// Translation object for all languages
const translations: Record<InvoiceLanguage, InvoiceTranslations> = {
  sv: svTranslations,
  en: enTranslations,
};

// Get translations for a specific language
export function getTranslations(language: InvoiceLanguage = "sv"): InvoiceTranslations {
  return translations[language] || translations.sv;
}

// Get locale string for date formatting
export function getLocaleForLanguage(language: InvoiceLanguage = "sv"): string {
  const locales: Record<InvoiceLanguage, string> = {
    sv: "sv-SE",
    en: "en-US",
  };
  return locales[language] || "sv-SE";
}

// Unit labels per language (for PDF)
const unitLabelsSv: Record<ProductUnit, string> = {
  styck: "st",
  timmar: "tim",
  dagar: "dagar",
  manader: "mån",
  kilogram: "kg",
  gram: "g",
  liter: "l",
  meter: "m",
  centimeter: "cm",
  millimeter: "mm",
  m2: "m²",
  m3: "m³",
  mil: "mil",
  kilometer: "km",
  ha: "ha",
  ton: "ton",
  ord: "ord",
  ar: "år",
  veckor: "v",
  minuter: "min",
  MB: "MB",
  GB: "GB",
};

const unitLabelsEn: Record<ProductUnit, string> = {
  styck: "pcs",
  timmar: "hrs",
  dagar: "days",
  manader: "mo",
  kilogram: "kg",
  gram: "g",
  liter: "l",
  meter: "m",
  centimeter: "cm",
  millimeter: "mm",
  m2: "m²",
  m3: "m³",
  mil: "mi",
  kilometer: "km",
  ha: "ha",
  ton: "ton",
  ord: "words",
  ar: "yrs",
  veckor: "wks",
  minuter: "min",
  MB: "MB",
  GB: "GB",
};

const unitLabelsTranslations: Record<InvoiceLanguage, Record<ProductUnit, string>> = {
  sv: unitLabelsSv,
  en: unitLabelsEn,
};

// Get unit labels for a specific language
export function getUnitLabels(language: InvoiceLanguage = "sv"): Record<ProductUnit, string> {
  return unitLabelsTranslations[language] || unitLabelsTranslations.sv;
}

// Helper to format a template string with variables
export function formatTemplate(template: string, variables: Record<string, string | number>): string {
  return Object.entries(variables).reduce(
    (result, [key, value]) => result.replace(new RegExp(`\\{${key}\\}`, "g"), String(value)),
    template
  );
}
