# Sales & Purchase Management

A simple, practical Sales and Purchase Management application for a small business: Customer, Supplier and
Product masters; Purchase Orders; Sales Orders; Sales Invoices with printable output; Customer and Supplier
payments; and Sales/Purchase reports. Deliberately kept lean — no inventory, no accounting ledger, no GST
engine, no multi-company/multi-currency support.

## 1. Architecture

```
React (Vite) frontend  ──►  Express API (single serverless function on Vercel)  ──►  PostgreSQL on Supabase
```

- **Frontend**: React + Vite, plain CSS, React Router. Talks to the backend only via `/api/*`.
- **Backend**: Express app (`backend/`), exposed to Vercel as one serverless function (`api/index.js`). Uses
  `pg` (node-postgres) directly — no Supabase client SDK, no PostgREST.
- **Database**: PostgreSQL hosted on Supabase. Migrations are plain `.sql` files in `database/migrations/`.
- **Hard-coded configuration** (by design — no database master tables for these): UOM, Tax rates, Payment
  Terms, Payment Modes, Indian States. All defined in `shared/constants.js`, imported by both frontend and
  backend so there is one source of truth.

## 2. Technology Stack

- React 18, Vite, React Router, Axios
- Node.js, Express, `pg`
- PostgreSQL (Supabase)
- Vercel (serverless functions + static hosting)

## 3. Project Structure

```
frontend/          React app (Vite)
api/index.js        Vercel serverless entry (wraps the Express app)
backend/             Express app, routes, controllers, validators, db access
shared/constants.js  Hard-coded UOM/Tax/Payment Terms/Payment Modes/Indian States
database/migrations  Numbered SQL migration files, run in order
vercel.json          Build + routing config for Vercel
.env.example         Environment variable template (no real secrets)
```

## 4. Prerequisites

- Node.js 18 or later
- npm
- A Supabase account (free tier is enough) — https://supabase.com
- Git and a GitHub account (for source control / Vercel deploy)

## 5. Supabase Setup

1. Create a new project at https://supabase.com/dashboard.
2. Once it's provisioned, go to **Project Settings → Database → Connection string**.
3. Choose the **Connection pooling** tab (not "Direct connection") and copy the **URI** — it should use
   port `6543` and look like:
   ```
   postgresql://postgres.xxxxxxxx:[YOUR-PASSWORD]@aws-0-<region>.pooler.supabase.com:6543/postgres
   ```
   Using the pooled (transaction mode) connection is important — the backend runs as short-lived serverless
   functions on Vercel and a small pooled connection avoids exhausting Postgres' connection limit.
4. Replace `[YOUR-PASSWORD]` with your actual database password (set when the project was created, or reset
   it from the same page).

## 6. Database Migration

Run the migration files **in order** against your Supabase database. From the `database/migrations/`
directory, using `psql`:

```bash
psql "<your Supabase connection string>" -f database/migrations/001_functions.sql
psql "<your Supabase connection string>" -f database/migrations/002_number_sequences.sql
psql "<your Supabase connection string>" -f database/migrations/003_customers.sql
psql "<your Supabase connection string>" -f database/migrations/004_suppliers.sql
psql "<your Supabase connection string>" -f database/migrations/005_products.sql
psql "<your Supabase connection string>" -f database/migrations/006_purchase_orders.sql
psql "<your Supabase connection string>" -f database/migrations/007_sales_orders.sql
psql "<your Supabase connection string>" -f database/migrations/008_sales_invoices.sql
psql "<your Supabase connection string>" -f database/migrations/009_payments.sql
```

Or, simplest: open the Supabase Dashboard → **SQL Editor**, and paste/run each file's contents in order
(001 through 009). Each has been verified to apply cleanly, in order, against a real PostgreSQL instance.

There is no seed data — the app starts with empty masters, which you populate through the UI.

## 7. Local Environment Configuration

Copy the example file and fill in your own values:

```bash
cp .env.example .env
```

Edit `.env`:

```
DATABASE_URL=<your Supabase pooled connection string from step 5>
PORT=4000
COMPANY_NAME=<your company name>
COMPANY_ADDRESS=<your company address>
COMPANY_GST_NUMBER=<your company GST number>
```

`COMPANY_NAME` / `COMPANY_ADDRESS` / `COMPANY_GST_NUMBER` appear on the printable invoice header. Never
commit `.env` — it's already in `.gitignore`.

## 8. Running Locally

```bash
npm install
npm run dev
```

This starts:
- the Express API on `http://localhost:4000` (reading `DATABASE_URL` from `.env`)
- the Vite dev server on `http://localhost:5173`, which proxies `/api/*` requests to the API above

Open `http://localhost:5173` in your browser.

Run them separately if you prefer:
```bash
npm run dev:api          # API only, port 4000
npm run dev:frontend     # Vite only, port 5173
```

## 9. Build

```bash
npm run build
```

Builds the frontend to `frontend/dist`. (The backend needs no build step — it runs directly as Node/ESM.)

## 10. GitHub Setup

```bash
git init                      # if not already a repo
git add .
git commit -m "Initial commit: Sales & Purchase Management application"
git branch -M main
git remote add origin <your GitHub repository URL>
git push -u origin main
```

Double-check `git status` before your first push — `.env` should **not** appear (it's git-ignored); only
`.env.example` should be tracked.

## 11. Vercel Deployment

1. Go to https://vercel.com and **Import Project** from your GitHub repository.
2. Vercel will detect `vercel.json` at the repo root — leave the root directory as the repo root (do **not**
   set it to `frontend/`), since `/api` must stay at the project root for Vercel to detect it as a
   serverless function.
3. Under **Project Settings → Environment Variables**, add:
   - `DATABASE_URL` — your Supabase pooled connection string (same as local `.env`)
   - `COMPANY_NAME`, `COMPANY_ADDRESS`, `COMPANY_GST_NUMBER` — for the invoice header
4. Deploy. Vercel runs `npm run build` (per `vercel.json`) and serves `frontend/dist` as static content,
   with `/api/*` routed to the Express app in `api/index.js`.
5. After the first deploy, open the site and confirm the Dashboard loads (this proves the API can reach
   Supabase) before using the app for real data.

**Never** set `SUPABASE_SERVICE_ROLE_KEY` or any Supabase API key on the frontend — this app doesn't use
the Supabase client SDK at all, only a direct PostgreSQL connection from the backend, so no such key is
needed anywhere.

## 12. Troubleshooting

- **"DATABASE_URL environment variable is not set"** — `.env` is missing or wasn't loaded; confirm the file
  exists at the repo root and you're running `npm run dev` from there.
- **Connection errors / timeouts to Supabase** — confirm you copied the **pooled** connection string (port
  `6543`), not the direct connection (port `5432`); serverless functions should always use the pooler.
  Also confirm the project isn't paused (Supabase free-tier projects pause after inactivity — resume it
  from the dashboard).
- **Dates look one day off** — shouldn't happen; the backend explicitly parses PostgreSQL `DATE` columns as
  plain strings (`backend/db.js`) to avoid timezone shifting. If you see this, check any code path that
  bypasses `getPool()`.
- **"Payment amount exceeds outstanding balance"** — by design; partial and full payments are allowed but
  never an overpayment. Check the invoice/PO balance shown in its detail page.
- **Vercel build succeeds but `/api/*` returns 404** — confirm the Vercel project's root directory is the
  repository root (not `frontend/`), since `vercel.json` and `/api` must be visible at that root.

## 13. What's Deliberately Not Included

Per the project's scope, the following are intentionally absent and should stay out unless explicitly
requested later: inventory/stock tracking, a general ledger, payroll/HR, a full GST engine (CGST/SGST/IGST
splitting), multi-company or multi-currency support, and complex role-based access control. There is
currently no login/authentication layer either.
