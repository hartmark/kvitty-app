import { z } from "zod";

// Supported currencies (matches the database enum)
export const currencies = ["SEK", "EUR", "USD", "GBP", "NOK", "DKK"] as const;
export type Currency = (typeof currencies)[number];

// Currency labels (Swedish)
export const currencyLabels: Record<Currency, string> = {
  SEK: "SEK - Svensk krona",
  EUR: "EUR - Euro",
  USD: "USD - US Dollar",
  GBP: "GBP - Brittiskt pund",
  NOK: "NOK - Norsk krona",
  DKK: "DKK - Dansk krona",
};

// Currency symbols
export const currencySymbols: Record<Currency, string> = {
  SEK: "kr",
  EUR: "€",
  USD: "$",
  GBP: "£",
  NOK: "kr",
  DKK: "kr",
};

// Locale mapping for each currency (for Intl.NumberFormat)
export const currencyLocales: Record<Currency, string> = {
  SEK: "sv-SE",
  EUR: "de-DE",
  USD: "en-US",
  GBP: "en-GB",
  NOK: "nb-NO",
  DKK: "da-DK",
};

// Zod schema for currency validation
export const currencySchema = z.enum(currencies);
