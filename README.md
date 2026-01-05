# Kvitty

<div align="center">
  <img src="https://www.kvitty.se/assets/SCR-20260105-mywx.png" alt="Kvitty Dashboard" width="100%" />
</div>

<div align="center" style="margin-top: 1rem; opacity: 0.7; font-size: 0.9em;">
  <em>Detta är en proof-of-concept/kul sak. Denna kod reflekterar inte sajn.se-kodbasen. sajn-se org har utvecklat sajn.se (digital signeringstjänst) som är en riktig, välfungerande och battletested produkt.</em>
</div>

---

## Om Kvitty

Kvitty är en svensk bokförings- och fakturerings-SaaS-applikation byggd för småföretag. Applikationen stödjer både enkel kvittohantering ("simple" mode) och fullständig dubbel bokföring ("full_bookkeeping" mode) med lönehantering, fakturering och AGI (Arbetsgivardeklaration) XML-generering för svensk skatterapportering.

## Funktioner

### 📊 Två lägen

**Traditionell bokföring**
- Full dubbel bokföring med stöd för BAS-kontoplanen
- Verifikationer och huvudbok
- Balansräkning och resultaträkning
- SIE-export

**Kvittohantering**
- Enkel matchning mellan banktransaktioner och kvitton
- Fotouppladdning av kvitton
- Automatisk kategorisering med AI
- Exportera underlag

### 💼 Fakturering
- Skapa och hantera fakturor
- Kund- och produktregister
- Automatisk momsberäkning (25%, 12%, 6%, 0%)
- Skicka fakturor via e-post
- Påminnelser för förfallna fakturor

### 💰 Lönehantering
- Hantera anställda
- Lönekörningar
- AGI XML-generering för skatteverket
- Lönestatistik och rapporter

### 🏦 Bankintegration
- Importera banktransaktioner
- Matcha transaktioner med kvitton
- Duplikatkontroll
- Transaktionshistorik

### 🤖 AI-funktioner
- Analysera kvitton med AI
- Automatisk kategorisering
- Chat-assistent för bokföringsfrågor

## Teknisk stack

- **Framework**: Next.js 16 med App Router
- **Språk**: TypeScript
- **Database**: PostgreSQL med Drizzle ORM
- **API**: tRPC med React Query
- **Autentisering**: better-auth (magic link, e-post OTP, Google OAuth)
- **Styling**: Tailwind CSS v4 + shadcn/ui komponenter
- **Filhantering**: Vercel Blob
- **AI**: Groq SDK med AI SDK
- **Animationer**: Motion (Framer Motion)
- **Tabeller**: TanStack Table
- **Formulär**: React Hook Form + Zod

## Kom igång

### Förutsättningar

- Node.js 20 eller senare
- pnpm (eller npm/yarn)
- PostgreSQL-databas
- Vercel Blob-konto (för filuppladdningar)
- Groq API-nyckel (för AI-funktioner)

### Installation

1. Klona repot:
```bash
git clone <repository-url>
cd kvitty-app
```

2. Installera dependencies:
```bash
pnpm install
```

3. Skapa en `.env`-fil baserat på `.env.example`:
```bash
cp .env.example .env
```

4. Fyll i nödvändiga miljövariabler:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/kvitty
BETTER_AUTH_SECRET=your-secret-key-here
BETTER_AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GROQ_API_KEY=your-groq-api-key
BLOB_READ_WRITE_TOKEN=your-vercel-blob-token
```

5. Pusha databasschemat:
```bash
pnpm db:push
```

6. Starta utvecklingsservern:
```bash
pnpm dev
```

Öppna [http://localhost:3000](http://localhost:3000) i din webbläsare.

## Utvecklingskommandon

```bash
# Utveckling
pnpm dev              # Starta utvecklingsserver
pnpm build            # Bygg för produktion
pnpm start            # Starta produktionsserver
pnpm lint             # Kör ESLint
pnpm type-check       # TypeScript-typkontroll

# Databas
pnpm db:push          # Pusha schemändringar till databas
pnpm db:generate      # Generera migrationer
pnpm db:migrate       # Kör migrationer
pnpm db:studio        # Öppna Drizzle Studio
pnpm db:wipe          # Rensa databas

# Demo-data
pnpm demo:populate    # Fyll databas med demo-data
```

## Projektstruktur

```
kvitty-app/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Autentiseringssidor
│   ├── (dash)/              # Dashboard (kräver auth)
│   │   └── [workspaceSlug]/ # Workspace-scopade sidor
│   ├── (web)/               # Publika marknadsföringssidor
│   └── api/                 # API-routes
│       ├── auth/            # better-auth endpoints
│       └── trpc/            # tRPC handler
├── components/              # React-komponenter
│   ├── ui/                  # shadcn/ui komponenter
│   ├── invoices/            # Fakturakomponenter
│   ├── bank/                # Bankkomponenter
│   └── ...
├── lib/                     # Bibliotek och utilities
│   ├── db/                  # Drizzle schema och konfiguration
│   ├── trpc/                # tRPC-konfiguration och routers
│   ├── validations/         # Zod-scheman
│   └── auth.ts              # better-auth konfiguration
├── hooks/                   # React hooks
├── scripts/                 # Utility-skript
└── public/                  # Statiska filer
```

## Arkitektur

### Multi-tenant struktur

All affärsdata är workspace-scopad. Varje användare kan vara medlem i flera workspaces, och all data är isolerad per workspace.

### Datamodell

Nyckelenheter:
- **Workspaces**: Multi-tenant isolering med medlemmar/inbjudningar
- **FiscalPeriods**: Räkenskapsår (kalenderår eller brutet år)
- **JournalEntries/JournalEntryLines**: Dubbel bokföring (full mode)
- **Verifications**: Enkel kvittohantering (simple mode)
- **Invoices/InvoiceLines/Customers/Products**: Faktureringssystem
- **Employees/PayrollRuns/PayrollEntries**: Lönehantering med AGI XML-generering
- **BankAccounts/BankTransactions**: Bankintegration

### tRPC-mönster

Procedurer använder `workspaceProcedure` för workspace-scopade operationer som validerar medlemskap:

```typescript
import { workspaceProcedure } from "../init";

export const myRouter = router({
  list: workspaceProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      // ctx.workspace är automatiskt validerat och tillgängligt
    }),
});
```

### Autentisering

Applikationen använder better-auth med stöd för:
- Magic link (länk via e-post)
- E-post OTP (engångslösenord)
- Google OAuth

### Routing

- `app/(auth)/` - Publika autentiseringssidor
- `app/(dash)/` - Skyddade dashboard-sidor
  - `[workspaceSlug]/` - Workspace-scopade sidor
    - `[periodSlug]/` - Räkenskapsperiod-scopade sidor
- `app/(web)/` - Publika marknadsföringssidor

## Svenska kontext

Detta är en svensk bokföringsapplikation. Viktig terminologi:
- **Faktura** = Invoice
- **Kund** = Customer
- **Produkt** = Product
- **Moms** = VAT (25%, 12%, 6%, 0%)
- **Verifikation** = Accounting verification/voucher
- **Räkenskapsår** = Fiscal year
- **Lön** = Payroll/Salary
- **AGI** = Arbetsgivardeklaration (employer tax declaration)
- **BAS-kontoplan** = Swedish standard chart of accounts

## Miljövariabler

Se `.env.example` för alla nödvändiga variabler:

- `DATABASE_URL` - PostgreSQL-anslutning
- `BETTER_AUTH_SECRET` - Krypteringsnyckel för auth
- `BETTER_AUTH_URL` - Base URL för auth (t.ex. http://localhost:3000)
- `GOOGLE_CLIENT_ID/SECRET` - Google OAuth-uppgifter
- `GROQ_API_KEY` - API-nyckel för AI-funktioner
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob token för filuppladdningar

## Licens

Se [LICENSE](LICENSE) för mer information.

## Bidrag

Detta är en proof-of-concept/kul sak. För produktionskod, se [sajn.se](https://sajn.se) - en digital signeringstjänst utvecklad av sajn-se org.
