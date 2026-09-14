# Sales & Purchase Management

A multi-tenant Sales and Purchase Management application. Each vendor/company registers its own
account and sees only its own customers, suppliers, products, orders, invoices, and payments — no
vendor can ever see or modify another vendor's data.

## 1. Architecture

```
React (Vite) frontend  ──►  Express API (single serverless function on Vercel)  ──►  PostgreSQL on Supabase
                              │
                              ├─ httpOnly-cookie JWT auth (stateless — safe for serverless)
                              └─ every business query filtered by the authenticated user's id
```

- **Frontend**: React + Vite, plain CSS, React Router. Auth state lives in `AuthContext`
  (`frontend/src/context/AuthContext.jsx`), restored on load via `GET /api/auth/me`.
- **Backend**: Express app (`backend/`), one serverless function on Vercel (`api/index.js`). Uses `pg`
  directly — no ORM, no ODBC-style abstraction.
- **Database**: PostgreSQL on Supabase. Migrations are plain `.sql` files in `database/migrations/`, run
  in numeric order.

## 2. Authentication

- Email + password, hashed with **bcryptjs** (never stored or returned in plaintext).
- On login/register, the backend issues a JWT (`{ sub: userId }` only — no company or business data in the
  token) signed with `JWT_SECRET`, and sets it as an **httpOnly cookie** (`spm_token`). It is never stored
  in `localStorage`/`sessionStorage` or any JS-readable place.
- `backend/middleware/auth.js`'s `requireAuth` verifies that cookie on every protected request and attaches
  `req.user = { id }` — every controller trusts **only** this, never a client-supplied `user_id`.
- Because the token is self-contained (stateless JWT, no server-side session store), this works correctly
  across Vercel's independent serverless instances with no shared memory required.
- Login/registration endpoints have a basic in-memory rate limit (`backend/middleware/rateLimit.js`) as a
  deterrent against brute force. **Limitation**: this is per-process memory, so it resets across cold
  starts and isn't shared across concurrent serverless instances — a real production deployment under
  sustained attack would want a shared store (e.g. Redis) instead.

## 3. Multi-Tenancy

- Every business table (`customers`, `suppliers`, `products`, `purchase_orders`, `sales_orders`,
  `sales_invoices`, `customer_payments`, `supplier_payments`) has a `user_id` column. Line-item tables
  (`*_items`) do **not** duplicate it — ownership is inherited through their parent row.
- **Every** `SELECT`/`UPDATE`/`DELETE` is filtered by `WHERE ... AND user_id = $authenticatedUserId`.
  Fetching another tenant's record by ID returns a generic `404`, never a `403` that would confirm the
  record exists.
- **Every foreign key supplied by the client is re-validated for ownership before use** — e.g. creating an
  invoice re-checks that the `customerId` and every line's `productId` actually belong to the authenticated
  user, not just that they exist. Without this, a vendor who merely *knew* another vendor's numeric ID
  could reference their data; existence alone was never sufficient.
- **Company information** lives in the `companies` table (one row per user, enforced by
  `UNIQUE(user_id)`) — never in environment variables. Invoice/order GST calculation always loads the
  authenticated user's own company row for the seller side of the CGST/SGST/IGST determination.
- **Business numbering** (`CUS-000001`, `INV-2026-000001`, ...) is scoped per tenant — the underlying
  `number_sequences` key is `"<user_id>:<prefix>"`, so two vendors independently start at 1. The
  corresponding uniqueness constraints on `customer_code`/`invoice_number`/etc. are `UNIQUE(user_id, code)`,
  not globally unique, so this is legitimate and expected.

## 4. Registration

`POST /api/auth/register` collects both account fields (email, password, confirm password) and company
fields (name, address, GST number, state, state code) in one call, and creates the `users` row and the
`companies` row in a **single database transaction** — if anything fails, neither row is left behind.
On success, the user is immediately logged in (cookie set) and redirected to the dashboard.

## 5. Database Schema (multi-tenancy additions)

```sql
users        (id UUID PK, email UNIQUE, password_hash, is_active, timestamps)
companies    (id UUID PK, user_id UUID UNIQUE → users.id, company_name, company_address,
              company_gst_number, company_state, company_state_code, timestamps)

-- existing business tables gained:
customers.user_id, suppliers.user_id, products.user_id, purchase_orders.user_id,
sales_orders.user_id, sales_invoices.user_id, customer_payments.user_id, supplier_payments.user_id
  (all UUID, NOT NULL, references users(id), indexed; several also have a composite
   (user_id, <date column>) index matching real report/list query patterns)
```

See `database/migrations/012_users_and_companies.sql`, `013_tenant_isolation.sql`, and
`014_scope_business_numbers_by_tenant.sql` for the exact DDL.

## 6. Technology Stack

- React 18, Vite, React Router, Axios
- Node.js, Express, `pg`, `bcryptjs`, `jsonwebtoken`, `cookie-parser`
- PostgreSQL (Supabase)
- Vercel (serverless functions + static hosting)

## 7. Project Structure

```
frontend/            React app (Vite) — includes pages/auth (Login/Register), pages/settings (Company)
api/index.js         Vercel serverless entry (wraps the Express app)
backend/             Express app, routes, controllers, validators, auth middleware, db access
shared/              Hard-coded UOM/Tax/Payment Terms/Payment Modes/Indian States/GST helpers
database/migrations  Numbered SQL migration files, run in order
vercel.json          Build + routing config for Vercel
.env.example         Environment variable template (no real secrets)
```

## 8. Prerequisites

- Node.js 18+, npm
- A Supabase account — https://supabase.com
- Git and GitHub (for source control / Vercel deploy)

## 9. Supabase Setup

Unchanged from before: create a project at https://supabase.com/dashboard, then use the **Connection
pooling** (transaction mode, port 6543) URI from Project Settings → Database → Connection string as your
`DATABASE_URL`.

## 10. Database Migration

Run every file in `database/migrations/` **in order** (001 through 014) against your Supabase database —
via `psql "<connection string>" -f database/migrations/00X_....sql` for each, or by pasting each file's
contents into the Supabase SQL Editor in order. All 14 have been verified to apply cleanly, in order,
against a live PostgreSQL instance.

### Existing-data migration strategy (read this if you already have data)

If you are migrating a database that already has customers/suppliers/products/orders/invoices/payments
from **before** multi-tenancy existed, migration `013_tenant_isolation.sql` handles this automatically and
safely:

1. It adds a nullable `user_id` column to every business table (no data touched yet).
2. If the `users` table is currently empty, it creates exactly **one bootstrap owner account**, using
   `pgcrypto`'s `crypt()`/`gen_salt('bf')` to generate a real bcrypt password hash **directly in SQL** — no
   password is ever hardcoded anywhere. The password is a fresh random value, printed **once**, via a
   PostgreSQL `NOTICE`, when the migration runs. If you ran this migration yourself, check your migration
   tool/psql output for a block starting `=== BOOTSTRAP OWNER CREATED ===`; capture it immediately, log in,
   and treat it as sensitive.
3. That bootstrap account's `companies` row is seeded with whatever company info previously lived in
   `.env` (if you're running this exact repo's history, that's `M.R ENTERPRISES` / `33CAIPR3152A1Z4` /
   Tamil Nadu / `33`) — this is business-public information (the same thing printed on that vendor's own
   invoices), not a secret, and is the correct place for it to live going forward.
4. Every pre-existing row in every business table is assigned to that bootstrap owner (`UPDATE ... SET
   user_id = <owner> WHERE user_id IS NULL`) — **nothing is deleted**.
5. Only once every row has an owner does the migration add the `NOT NULL` constraint.
6. The whole migration is idempotent: if `users` already has rows (e.g. you run it a second time by
   mistake), step 2–4 are skipped entirely with a `NOTICE` rather than creating a duplicate owner or
   re-touching already-owned data.

If you need to identify which rows belonged to the pre-multi-tenant data afterward, they're simply every
row owned by that one bootstrap account — query `select * from users where email = 'owner@mrenterprises.local'`
to find its id.

## 11. Environment Variables

```
DATABASE_URL=     # Supabase pooled Postgres connection string (port 6543) — required
JWT_SECRET=       # long random string used to sign auth tokens — required, generate with e.g. `openssl rand -base64 48`
PORT=4000         # local dev API port only; unused on Vercel
```

**`COMPANY_NAME` / `COMPANY_ADDRESS` / `COMPANY_GST_NUMBER` / `COMPANY_STATE` / `COMPANY_STATE_CODE` no
longer exist and are not read by any runtime code.** Company information is per-tenant, stored in the
`companies` table, and managed from the Company Settings screen after login.

## 12. Local Development

```bash
npm install
cp .env.example .env    # then fill in DATABASE_URL and JWT_SECRET
npm run dev
```

Starts the Express API on `http://localhost:4000` and the Vite dev server on `http://localhost:5173`
(proxying `/api/*`, cookies flow through the proxy correctly since the browser sees one origin). Open
`http://localhost:5173`, register an account, and you're in.

## 13. Build

```bash
npm run build
```

Builds the frontend to `frontend/dist`. No build step is needed for the backend.

## 14. GitHub / Vercel Deployment

Same as before: push to GitHub, import into Vercel, keep the repo root as the Vercel project root (so
`/api` is auto-detected). Set these two environment variables in Vercel Project Settings:

```
DATABASE_URL
JWT_SECRET
```

Nothing else is required for normal operation — company information is entirely user-managed at runtime.

## 15. Security Notes

- Passwords: bcrypt-hashed (`bcryptjs`, 10 rounds), never logged, never returned by any API response.
- Login errors are always the generic *"Invalid email or password."* — the API never reveals whether an
  email exists. A dummy bcrypt comparison runs even when no user is found, so a missing-vs-wrong-password
  response takes a comparable amount of time.
- Every protected route requires a valid session (`requireAuth`); every business query is tenant-filtered
  at the database level, never left to the frontend.
- All input is validated server-side regardless of what the frontend already checked; all SQL is
  parameterized.
- `.env` is git-ignored; `.env.example` never contains a real secret.

## 16. Test Tenants (created during implementation/verification)

Two throwaway vendor accounts were created while verifying tenant isolation for this feature:

```
vendor-a@example.com / PasswordA123   (Vendor A Trading Co, Tamil Nadu)
vendor-b@example.com / PasswordB123   (Vendor B Exports, Karnataka)
```

Each has its own customer/supplier/product/invoice. Feel free to delete both (and their data) once you've
confirmed isolation yourself, or keep them as a standing demonstration.

## 17. Troubleshooting

- **"DATABASE_URL environment variable is not set"** — confirm `.env` exists at the repo root.
- **401 immediately after logging in** — confirm `JWT_SECRET` is set; the token can't be verified without it.
- **Connection errors to Supabase** — use the **pooled** connection string (port 6543), not the direct one.
- **"Cannot determine GST type"** on order/invoice creation — the authenticated user hasn't completed
  Company Settings yet (no `companies` row), or the counterpart customer/supplier has neither a state nor
  a GST number set.
- **Dates look one day off** — shouldn't happen; `backend/db.js` parses PostgreSQL `DATE` columns as plain
  strings specifically to avoid timezone shifting.

## 18. What's Deliberately Not Included

Inventory/stock tracking, a general ledger, payroll/HR, a full GST engine (CGST/SGST/IGST splitting beyond
the two-state comparison already implemented), multi-currency support, and complex role-based access
control (each tenant currently has exactly one user/login — no team members or roles within a company).
Supabase Auth was deliberately not introduced — authentication is handled entirely within this project's
own Node/Express backend, per the existing architecture.
