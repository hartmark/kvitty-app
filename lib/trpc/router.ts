import { router } from "./init";
import { workspacesRouter } from "./routers/workspaces";
import { periodsRouter } from "./routers/periods";
import { verificationsRouter } from "./routers/verifications";
import { attachmentsRouter } from "./routers/attachments";
import { commentsRouter } from "./routers/comments";
import { invitesRouter } from "./routers/invites";
import { membersRouter } from "./routers/members";
import { usersRouter } from "./routers/users";
// Full bookkeeping routers
import { bankAccountsRouter } from "./routers/bank-accounts";
import { journalEntriesRouter } from "./routers/journal-entries";
import { employeesRouter } from "./routers/employees";
import { payrollRouter } from "./routers/payroll";
import { lockedPeriodsRouter } from "./routers/locked-periods";
import { customersRouter } from "./routers/customers";
import { invoicesRouter } from "./routers/invoices";
import { productsRouter } from "./routers/products";

export const appRouter = router({
  workspaces: workspacesRouter,
  periods: periodsRouter,
  verifications: verificationsRouter,
  attachments: attachmentsRouter,
  comments: commentsRouter,
  invites: invitesRouter,
  members: membersRouter,
  users: usersRouter,
  // Full bookkeeping routers
  bankAccounts: bankAccountsRouter,
  journalEntries: journalEntriesRouter,
  employees: employeesRouter,
  payroll: payrollRouter,
  lockedPeriods: lockedPeriodsRouter,
  customers: customersRouter,
  invoices: invoicesRouter,
  products: productsRouter,
});

export type AppRouter = typeof appRouter;
