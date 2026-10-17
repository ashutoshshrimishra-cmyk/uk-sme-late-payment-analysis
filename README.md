# Fast Finance UK

Fast Finance helps UK small businesses submit invoices for financing.
SMEs can receive an advance while the buyer pays the invoice at its due date.
Financiers review invoices, approve advances, and record settlement.

## Flow

SME submit -> optional buyer confirm -> financier approve -> fund -> pay

## Built vs Simulated

- PayPal integration runs in simulated or sandbox mode; live mode is configurable.
- Credit-bureau and payment-history inputs are simulated.
- Companies House lookups and Gemini features run when their API keys are configured.

## Setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local` and configure the required values.
3. Apply database migrations: `npx drizzle-kit migrate`
4. Start the development server: `npm run dev`

## Project structure

```text
src/
  app/          Pages and API routes
  components/   Shared UI
  db/           Database connection and schema
  lib/           Pricing, risk, integrations, and helpers
drizzle/        SQL migrations and metadata
scripts/        Project checks
```
