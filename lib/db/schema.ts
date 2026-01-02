import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  boolean,
  date,
  decimal,
  integer,
  jsonb,
  unique,
} from "drizzle-orm/pg-core";
import { createCuid } from "@/lib/utils/cuid";

// ============================================
// Enums
// ============================================

export const workspaceModeEnum = pgEnum("workspace_mode", [
  "simple",
  "full_bookkeeping",
]);

export const businessTypeEnum = pgEnum("business_type", [
  "aktiebolag",
  "enskild_firma",
  "handelsbolag",
  "kommanditbolag",
  "ekonomisk_forening",
  "ideell_forening",
  "stiftelse",
  "other",
]);

export const journalEntryTypeEnum = pgEnum("journal_entry_type", [
  "kvitto",
  "inkomst",
  "leverantorsfaktura",
  "lon",
  "annat",
]);

export const payrollRunStatusEnum = pgEnum("payroll_run_status", [
  "draft",
  "calculated",
  "approved",
  "paid",
  "reported",
]);

export const fiscalYearTypeEnum = pgEnum("fiscal_year_type", [
  "calendar",
  "broken",
]);

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "sent",
  "paid",
]);
import { relations } from "drizzle-orm";

// ============================================
// Better-Auth Tables
// ============================================

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  name: text("name"),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  idToken: text("id_token"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================
// Kvitty Business Tables
// ============================================

export const workspaces = pgTable("workspaces", {
  id: text("id").primaryKey().$defaultFn(() => createCuid()),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(), // 4 chars, a-z0-9
  mode: workspaceModeEnum("mode").default("simple").notNull(),
  businessType: businessTypeEnum("business_type"),
  // Organization info (for AGI XML and invoicing)
  orgNumber: text("org_number"), // Organisationsnummer (e.g., "165592540321")
  orgName: text("org_name"), // Företagsnamn
  contactName: text("contact_name"),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  address: text("address"),
  postalCode: text("postal_code"),
  city: text("city"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: text("created_by").references(() => user.id),
});

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: text("id").primaryKey().$defaultFn(() => createCuid()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (table) => [unique().on(table.workspaceId, table.userId)]
);

export const workspaceInvites = pgTable("workspace_invites", {
  id: text("id").primaryKey().$defaultFn(() => createCuid()),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  createdBy: text("created_by")
    .notNull()
    .references(() => user.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
  usedAt: timestamp("used_at"),
  usedBy: text("used_by").references(() => user.id),
});

export const fiscalPeriods = pgTable(
  "fiscal_periods",
  {
    id: text("id").primaryKey().$defaultFn(() => createCuid()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    label: text("label").notNull(), // e.g., "Räkenskapsår 2025"
    urlSlug: text("url_slug").notNull(), // e.g., "2025"
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    fiscalYearType: fiscalYearTypeEnum("fiscal_year_type").default("calendar").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [unique().on(table.workspaceId, table.urlSlug)]
);

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey().$defaultFn(() => createCuid()),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  fiscalPeriodId: text("fiscal_period_id")
    .notNull()
    .references(() => fiscalPeriods.id, { onDelete: "cascade" }),
  office: text("office"), // Kontor
  accountingDate: date("accounting_date"), // Bokföringsdag
  ledgerDate: date("ledger_date"), // Reskontradag
  currencyDate: date("currency_date"), // Valutadag
  reference: text("reference"), // Referens
  amount: decimal("amount", { precision: 15, scale: 2 }), // Insättning/Uttag
  bookedBalance: decimal("booked_balance", { precision: 15, scale: 2 }), // Bokfört saldo
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: text("created_by")
    .notNull()
    .references(() => user.id),
});

export const attachments = pgTable("attachments", {
  id: text("id").primaryKey().$defaultFn(() => createCuid()),
  verificationId: text("verification_id")
    .notNull()
    .references(() => verifications.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(), // Vercel Blob URL
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: text("created_by")
    .notNull()
    .references(() => user.id),
});

export const comments = pgTable("comments", {
  id: text("id").primaryKey().$defaultFn(() => createCuid()),
  verificationId: text("verification_id")
    .notNull()
    .references(() => verifications.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: text("created_by")
    .notNull()
    .references(() => user.id),
});

export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey().$defaultFn(() => createCuid()),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  action: text("action").notNull(), // 'create', 'update', 'delete'
  entityType: text("entity_type").notNull(), // 'verification', 'attachment', 'comment'
  entityId: text("entity_id").notNull(),
  changes: jsonb("changes"), // Store before/after values
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// ============================================
// Full Bookkeeping Tables
// ============================================

// Bank accounts per workspace
export const bankAccounts = pgTable(
  "bank_accounts",
  {
    id: text("id").primaryKey().$defaultFn(() => createCuid()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    accountNumber: integer("account_number").notNull(), // BAS konto: 1630, 1930, etc.
    name: text("name").notNull(), // Custom name or default from kontoplan
    description: text("description"),
    isDefault: boolean("is_default").default(false).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [unique().on(table.workspaceId, table.accountNumber)]
);

// Journal entries (multi-line verifications for full bookkeeping)
export const journalEntries = pgTable("journal_entries", {
  id: text("id").primaryKey().$defaultFn(() => createCuid()),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  fiscalPeriodId: text("fiscal_period_id")
    .notNull()
    .references(() => fiscalPeriods.id, { onDelete: "cascade" }),
  verificationNumber: integer("verification_number").notNull(), // V1, V2, etc. per period
  entryDate: date("entry_date").notNull(),
  description: text("description").notNull(),
  entryType: journalEntryTypeEnum("entry_type").notNull(),
  sourceType: text("source_type"), // 'manual', 'ai_assisted', 'payroll', 'bank_import'
  isLocked: boolean("is_locked").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: text("created_by")
    .notNull()
    .references(() => user.id),
});

// Journal entry lines (debit/credit rows)
export const journalEntryLines = pgTable("journal_entry_lines", {
  id: text("id").primaryKey().$defaultFn(() => createCuid()),
  journalEntryId: text("journal_entry_id")
    .notNull()
    .references(() => journalEntries.id, { onDelete: "cascade" }),
  accountNumber: integer("account_number").notNull(), // BAS konto
  accountName: text("account_name").notNull(), // Cached account name
  debit: decimal("debit", { precision: 15, scale: 2 }),
  credit: decimal("credit", { precision: 15, scale: 2 }),
  description: text("description"), // Optional line description
  vatCode: text("vat_code"), // Moms: 25, 12, 6, 0
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Employees for payroll
export const employees = pgTable(
  "employees",
  {
    id: text("id").primaryKey().$defaultFn(() => createCuid()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    personalNumber: text("personal_number").notNull(), // Personnummer (YYYYMMDDXXXX)
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email"),
    phone: text("phone"),
    address: text("address"),
    postalCode: text("postal_code"),
    city: text("city"),
    employmentStartDate: date("employment_start_date"),
    employmentEndDate: date("employment_end_date"),
    taxTable: integer("tax_table"), // Skattetabell
    taxColumn: integer("tax_column"), // Kolumn i skattetabellen
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [unique().on(table.workspaceId, table.personalNumber)]
);

// Payroll runs (Lönekörningar)
export const payrollRuns = pgTable("payroll_runs", {
  id: text("id").primaryKey().$defaultFn(() => createCuid()),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  fiscalPeriodId: text("fiscal_period_id")
    .notNull()
    .references(() => fiscalPeriods.id, { onDelete: "cascade" }),
  period: text("period").notNull(), // Format: YYYYMM (e.g., "202511")
  runNumber: integer("run_number").notNull(), // 1, 2, etc. for multiple runs per month
  paymentDate: date("payment_date").notNull(),
  status: payrollRunStatusEnum("status").default("draft").notNull(),
  totalGrossSalary: decimal("total_gross_salary", { precision: 15, scale: 2 }),
  totalTaxDeduction: decimal("total_tax_deduction", { precision: 15, scale: 2 }),
  totalEmployerContributions: decimal("total_employer_contributions", { precision: 15, scale: 2 }),
  totalNetSalary: decimal("total_net_salary", { precision: 15, scale: 2 }),
  journalEntryId: text("journal_entry_id")
    .references(() => journalEntries.id), // Links to generated verification
  agiXml: text("agi_xml"), // Generated AGI XML content
  agiSubmittedAt: timestamp("agi_submitted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: text("created_by")
    .notNull()
    .references(() => user.id),
});

// Payroll entries (individual employee payments per run)
export const payrollEntries = pgTable("payroll_entries", {
  id: text("id").primaryKey().$defaultFn(() => createCuid()),
  payrollRunId: text("payroll_run_id")
    .notNull()
    .references(() => payrollRuns.id, { onDelete: "cascade" }),
  employeeId: text("employee_id")
    .notNull()
    .references(() => employees.id),
  grossSalary: decimal("gross_salary", { precision: 15, scale: 2 }).notNull(),
  taxDeduction: decimal("tax_deduction", { precision: 15, scale: 2 }).notNull(),
  employerContributions: decimal("employer_contributions", { precision: 15, scale: 2 }).notNull(),
  netSalary: decimal("net_salary", { precision: 15, scale: 2 }).notNull(),
  benefitsCar: decimal("benefits_car", { precision: 15, scale: 2 }).default("0"),
  benefitsOther: decimal("benefits_other", { precision: 15, scale: 2 }).default("0"),
  otherExpenses: decimal("other_expenses", { precision: 15, scale: 2 }).default("0"),
  workplaceAddress: text("workplace_address"),
  workplaceCity: text("workplace_city"),
  specificationNumber: integer("specification_number").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Locked periods/months
export const lockedPeriods = pgTable(
  "locked_periods",
  {
    id: text("id").primaryKey().$defaultFn(() => createCuid()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    fiscalPeriodId: text("fiscal_period_id")
      .notNull()
      .references(() => fiscalPeriods.id, { onDelete: "cascade" }),
    month: text("month").notNull(), // Format: YYYY-MM
    lockedAt: timestamp("locked_at").defaultNow().notNull(),
    lockedBy: text("locked_by")
      .notNull()
      .references(() => user.id),
    reason: text("reason"),
  },
  (table) => [unique().on(table.workspaceId, table.fiscalPeriodId, table.month)]
);

// ============================================
// Customers & Invoices
// ============================================

export const customers = pgTable("customers", {
  id: text("id").primaryKey().$defaultFn(() => createCuid()),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  orgNumber: text("org_number"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  postalCode: text("postal_code"),
  city: text("city"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const invoices = pgTable("invoices", {
  id: text("id").primaryKey().$defaultFn(() => createCuid()),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  fiscalPeriodId: text("fiscal_period_id").references(() => fiscalPeriods.id),
  customerId: text("customer_id")
    .notNull()
    .references(() => customers.id),
  invoiceNumber: integer("invoice_number").notNull(),
  invoiceDate: text("invoice_date").notNull(), // YYYY-MM-DD
  dueDate: text("due_date").notNull(),
  reference: text("reference"),
  subtotal: decimal("subtotal", { precision: 15, scale: 2 }).notNull(),
  vatAmount: decimal("vat_amount", { precision: 15, scale: 2 }).notNull(),
  total: decimal("total", { precision: 15, scale: 2 }).notNull(),
  status: invoiceStatusEnum("status").default("draft").notNull(),
  paidDate: text("paid_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const invoiceLines = pgTable("invoice_lines", {
  id: text("id").primaryKey().$defaultFn(() => createCuid()),
  invoiceId: text("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
  unitPrice: decimal("unit_price", { precision: 15, scale: 2 }).notNull(),
  vatRate: integer("vat_rate").notNull().default(25), // 25, 12, 6, 0
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  sortOrder: integer("sort_order").default(0),
});

// ============================================
// Relations
// ============================================

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  workspaceMembers: many(workspaceMembers),
  createdWorkspaces: many(workspaces),
  verifications: many(verifications),
  attachments: many(attachments),
  comments: many(comments),
  auditLogs: many(auditLogs),
  journalEntries: many(journalEntries),
  payrollRuns: many(payrollRuns),
  lockedPeriods: many(lockedPeriods),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  createdBy: one(user, {
    fields: [workspaces.createdBy],
    references: [user.id],
  }),
  members: many(workspaceMembers),
  invites: many(workspaceInvites),
  fiscalPeriods: many(fiscalPeriods),
  verifications: many(verifications),
  auditLogs: many(auditLogs),
  // Full bookkeeping relations
  bankAccounts: many(bankAccounts),
  journalEntries: many(journalEntries),
  employees: many(employees),
  payrollRuns: many(payrollRuns),
  lockedPeriods: many(lockedPeriods),
  customers: many(customers),
  invoices: many(invoices),
}));

export const workspaceMembersRelations = relations(
  workspaceMembers,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [workspaceMembers.workspaceId],
      references: [workspaces.id],
    }),
    user: one(user, {
      fields: [workspaceMembers.userId],
      references: [user.id],
    }),
  })
);

export const workspaceInvitesRelations = relations(
  workspaceInvites,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [workspaceInvites.workspaceId],
      references: [workspaces.id],
    }),
    createdByUser: one(user, {
      fields: [workspaceInvites.createdBy],
      references: [user.id],
    }),
    usedByUser: one(user, {
      fields: [workspaceInvites.usedBy],
      references: [user.id],
    }),
  })
);

export const fiscalPeriodsRelations = relations(
  fiscalPeriods,
  ({ one, many }) => ({
    workspace: one(workspaces, {
      fields: [fiscalPeriods.workspaceId],
      references: [workspaces.id],
    }),
    verifications: many(verifications),
    journalEntries: many(journalEntries),
    payrollRuns: many(payrollRuns),
    lockedPeriods: many(lockedPeriods),
  })
);

export const verificationsRelations = relations(
  verifications,
  ({ one, many }) => ({
    workspace: one(workspaces, {
      fields: [verifications.workspaceId],
      references: [workspaces.id],
    }),
    fiscalPeriod: one(fiscalPeriods, {
      fields: [verifications.fiscalPeriodId],
      references: [fiscalPeriods.id],
    }),
    createdByUser: one(user, {
      fields: [verifications.createdBy],
      references: [user.id],
    }),
    attachments: many(attachments),
    comments: many(comments),
  })
);

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  verification: one(verifications, {
    fields: [attachments.verificationId],
    references: [verifications.id],
  }),
  createdByUser: one(user, {
    fields: [attachments.createdBy],
    references: [user.id],
  }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  verification: one(verifications, {
    fields: [comments.verificationId],
    references: [verifications.id],
  }),
  createdByUser: one(user, {
    fields: [comments.createdBy],
    references: [user.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [auditLogs.workspaceId],
    references: [workspaces.id],
  }),
  user: one(user, {
    fields: [auditLogs.userId],
    references: [user.id],
  }),
}));

// ============================================
// Full Bookkeeping Relations
// ============================================

export const bankAccountsRelations = relations(bankAccounts, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [bankAccounts.workspaceId],
    references: [workspaces.id],
  }),
}));

export const journalEntriesRelations = relations(
  journalEntries,
  ({ one, many }) => ({
    workspace: one(workspaces, {
      fields: [journalEntries.workspaceId],
      references: [workspaces.id],
    }),
    fiscalPeriod: one(fiscalPeriods, {
      fields: [journalEntries.fiscalPeriodId],
      references: [fiscalPeriods.id],
    }),
    createdByUser: one(user, {
      fields: [journalEntries.createdBy],
      references: [user.id],
    }),
    lines: many(journalEntryLines),
  })
);

export const journalEntryLinesRelations = relations(
  journalEntryLines,
  ({ one }) => ({
    journalEntry: one(journalEntries, {
      fields: [journalEntryLines.journalEntryId],
      references: [journalEntries.id],
    }),
  })
);

export const employeesRelations = relations(employees, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [employees.workspaceId],
    references: [workspaces.id],
  }),
  payrollEntries: many(payrollEntries),
}));

export const payrollRunsRelations = relations(
  payrollRuns,
  ({ one, many }) => ({
    workspace: one(workspaces, {
      fields: [payrollRuns.workspaceId],
      references: [workspaces.id],
    }),
    fiscalPeriod: one(fiscalPeriods, {
      fields: [payrollRuns.fiscalPeriodId],
      references: [fiscalPeriods.id],
    }),
    createdByUser: one(user, {
      fields: [payrollRuns.createdBy],
      references: [user.id],
    }),
    journalEntry: one(journalEntries, {
      fields: [payrollRuns.journalEntryId],
      references: [journalEntries.id],
    }),
    entries: many(payrollEntries),
  })
);

export const payrollEntriesRelations = relations(payrollEntries, ({ one }) => ({
  payrollRun: one(payrollRuns, {
    fields: [payrollEntries.payrollRunId],
    references: [payrollRuns.id],
  }),
  employee: one(employees, {
    fields: [payrollEntries.employeeId],
    references: [employees.id],
  }),
}));

export const lockedPeriodsRelations = relations(lockedPeriods, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [lockedPeriods.workspaceId],
    references: [workspaces.id],
  }),
  fiscalPeriod: one(fiscalPeriods, {
    fields: [lockedPeriods.fiscalPeriodId],
    references: [fiscalPeriods.id],
  }),
  lockedByUser: one(user, {
    fields: [lockedPeriods.lockedBy],
    references: [user.id],
  }),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [customers.workspaceId],
    references: [workspaces.id],
  }),
  invoices: many(invoices),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [invoices.workspaceId],
    references: [workspaces.id],
  }),
  fiscalPeriod: one(fiscalPeriods, {
    fields: [invoices.fiscalPeriodId],
    references: [fiscalPeriods.id],
  }),
  customer: one(customers, {
    fields: [invoices.customerId],
    references: [customers.id],
  }),
  lines: many(invoiceLines),
}));

export const invoiceLinesRelations = relations(invoiceLines, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceLines.invoiceId],
    references: [invoices.id],
  }),
}));

// ============================================
// Type Exports
// ============================================

export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
export type WorkspaceMode = (typeof workspaceModeEnum.enumValues)[number];
export type BusinessType = (typeof businessTypeEnum.enumValues)[number];

export type BankAccount = typeof bankAccounts.$inferSelect;
export type NewBankAccount = typeof bankAccounts.$inferInsert;

export type JournalEntry = typeof journalEntries.$inferSelect;
export type NewJournalEntry = typeof journalEntries.$inferInsert;
export type JournalEntryType = (typeof journalEntryTypeEnum.enumValues)[number];

export type JournalEntryLine = typeof journalEntryLines.$inferSelect;
export type NewJournalEntryLine = typeof journalEntryLines.$inferInsert;

export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;

export type PayrollRun = typeof payrollRuns.$inferSelect;
export type NewPayrollRun = typeof payrollRuns.$inferInsert;
export type PayrollRunStatus = (typeof payrollRunStatusEnum.enumValues)[number];

export type PayrollEntry = typeof payrollEntries.$inferSelect;
export type NewPayrollEntry = typeof payrollEntries.$inferInsert;

export type LockedPeriod = typeof lockedPeriods.$inferSelect;
export type NewLockedPeriod = typeof lockedPeriods.$inferInsert;

export type FiscalYearType = (typeof fiscalYearTypeEnum.enumValues)[number];

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;

export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
export type InvoiceStatus = (typeof invoiceStatusEnum.enumValues)[number];

export type InvoiceLine = typeof invoiceLines.$inferSelect;
export type NewInvoiceLine = typeof invoiceLines.$inferInsert;
