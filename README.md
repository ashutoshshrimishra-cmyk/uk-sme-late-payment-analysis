# Fast Finance UK

Fast Finance UK is a prototype invoice-financing app for UK small businesses. It helps an SME submit an invoice, see a financing offer and its costs, and request an advance. A financer reviews the invoice and makes the funding decision; the app can then record repayment and settlement.

## Project flow

1. An SME uploads or enters an invoice.
2. Gemini can extract invoice details from an uploaded document. The SME should review the extracted fields.
3. The app calculates pricing and a rule-based buyer-risk score. Where eligible company information is available, Gemini can provide a bounded risk adjustment.
4. The buyer may confirm the invoice.
5. A financer reviews the invoice and decides whether to approve it.
6. On approval, the app can initiate a PayPal payout for the advance and later record payment and settlement.

## PayPal integration

The app integrates with the PayPal Developer Platform through the PayPal REST API. It obtains an OAuth 2.0 access token using a PayPal REST app client ID and secret. By default, API requests use the **PayPal Sandbox** (`https://api-m.sandbox.paypal.com`); setting `PAYPAL_MODE=live` switches to PayPal's live API, so use `sandbox` while developing and testing.

The PayPal capabilities used by the application are:

- **Invoicing API** — creates and sends an invoice to the buyer.
- **Invoice payments endpoint** — records an external payment against a PayPal invoice.
- **Payouts API** — initiates a payout to the SME after financer approval.

Configure Sandbox credentials to make requests against PayPal Sandbox. If PayPal credentials are absent, or an API call cannot be completed, the app can fall back to simulated records. A simulated result is not a real PayPal transaction. The deployed app's actual mode depends on its environment variables.

## AI integration

The app uses the **Google Gemini API**, with the model selected by `GEMINI_MODEL` (the risk-assessment default is `gemini-flash-latest`).

- **Invoice extraction:** Gemini can read an uploaded invoice document and return structured fields such as supplier, buyer, invoice number, amount, currency, and due date. The app validates the returned fields and asks the SME to review them.
- **Buyer-risk assistance:** Gemini can provide a bounded adjustment to the baseline risk score using available company information. It is decision support only; the financer makes the funding decision. If the API key is missing or the service fails, the app uses mock or no-adjustment behavior as appropriate.

## Other tools and technologies

- **Next.js, React, and TypeScript** — application UI, server-rendered pages, and API routes.
- **PostgreSQL and Drizzle ORM** — persistent application data and schema migrations.
- **Tailwind CSS** — styling.
- **Postman** — used to test API requests; it is a development/testing tool, not a runtime integration.
- **Render** — hosts the deployed web application. Deployment availability depends on the Render service configuration.

The project does **not** currently integrate APIMatic, Astro, Zapier, or WhatsApp messaging. WhatsApp notifications are a possible future feature, not a working integration.

## Requirements

- Node.js compatible with the installed Next.js version
- npm
- A PostgreSQL database
- Optional: PayPal Developer Sandbox REST app credentials
- Optional: Google Gemini API key
- Optional: Companies House API key for company lookups

## Local setup

1. Clone the repository and install dependencies:

   ```bash
   git clone https://github.com/ashutoshshrimishra-cmyk/uk-sme-late-payment-analysis.git
   cd uk-sme-late-payment-analysis
   npm install
   ```

2. Create a local environment file:

   ```bash
   cp .env.example .env.local
   ```

3. Set the required database and application values in `.env.local`:

   - `DATABASE_URL` — PostgreSQL connection string.
   - `SESSION_SECRET` — a secret of at least 32 bytes.
   - `SME_PASSCODE`, `FINANCER_PASSCODE`, and `INVESTOR_PASSCODE` — demo role passcodes.

   For PayPal Sandbox, set `PAYPAL_MODE=sandbox`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, and (optionally) `PAYPAL_BUSINESS_EMAIL`. For Gemini features, set `GEMINI_API_KEY` and `GEMINI_MODEL`. See [`.env.example`](./.env.example) for all supported variables. Do not commit `.env.local` or real credentials.

4. Apply database migrations:

   ```bash
   npx drizzle-kit migrate
   ```

5. Start the development server:

   ```bash
   npm run dev
   ```

   Open <http://localhost:3000>.

## Useful commands

```bash
npm run lint
npm run typecheck
npm run test:pricing
npm run build
```

## License

This project is released under the [MIT License](./LICENSE).
