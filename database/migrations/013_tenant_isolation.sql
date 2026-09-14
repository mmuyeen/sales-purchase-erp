-- Adds tenant ownership to every business table, then safely migrates the
-- existing (pre-multi-tenant) data to a single "bootstrap owner" account
-- rather than deleting it or leaving it ownerless.
--
-- Line-item tables (purchase_order_items, sales_order_items,
-- sales_invoice_items) intentionally do NOT get their own user_id column —
-- ownership is preserved through their parent (purchase_order_id /
-- sales_order_id / sales_invoice_id), per the chosen multi-tenant strategy,
-- avoiding a duplicated, driftable copy of the tenant id.

alter table customers          add column user_id uuid references users(id);
alter table suppliers          add column user_id uuid references users(id);
alter table products           add column user_id uuid references users(id);
alter table purchase_orders    add column user_id uuid references users(id);
alter table sales_orders       add column user_id uuid references users(id);
alter table sales_invoices     add column user_id uuid references users(id);
alter table customer_payments  add column user_id uuid references users(id);
alter table supplier_payments  add column user_id uuid references users(id);

-- pgcrypto provides crypt()/gen_salt('bf') to hash a password directly in
-- SQL. The resulting $2a$ bcrypt hash is fully compatible with the
-- application's own bcryptjs verification (same standard algorithm).
create extension if not exists pgcrypto;

do $$
declare
  v_user_id uuid;
  v_email text := 'owner@mrenterprises.local';
  v_password text;
  v_password_hash text;
begin
  -- Idempotency guard: if this migration is ever re-run (or run against a
  -- database that already has users), skip bootstrap entirely rather than
  -- creating a duplicate owner or re-touching already-owned rows.
  if exists (select 1 from users limit 1) then
    raise notice 'users table already has data; skipping bootstrap owner creation and backfill.';
  else
    v_password := encode(gen_random_bytes(18), 'base64');
    v_password_hash := crypt(v_password, gen_salt('bf'));

    insert into users (email, password_hash)
    values (lower(v_email), v_password_hash)
    returning id into v_user_id;

    -- This is the application's real current company (previously only in
    -- .env) — preserved as this bootstrap owner's company profile, per the
    -- chosen existing-data migration strategy. Not a hardcoded default for
    -- new tenants; new registrations supply their own company details.
    insert into companies (user_id, company_name, company_address, company_gst_number, company_state, company_state_code)
    values (
      v_user_id,
      'M.R ENTERPRISES',
      'NO: 3, 2nd Floor Lala Kutty Street, Periamet, Chennai - 600003, TAMIL NADU',
      '33CAIPR3152A1Z4',
      'Tamil Nadu',
      '33'
    );

    update customers          set user_id = v_user_id where user_id is null;
    update suppliers          set user_id = v_user_id where user_id is null;
    update products            set user_id = v_user_id where user_id is null;
    update purchase_orders    set user_id = v_user_id where user_id is null;
    update sales_orders       set user_id = v_user_id where user_id is null;
    update sales_invoices     set user_id = v_user_id where user_id is null;
    update customer_payments  set user_id = v_user_id where user_id is null;
    update supplier_payments  set user_id = v_user_id where user_id is null;

    raise notice '=== BOOTSTRAP OWNER CREATED — shown once, not stored in plaintext anywhere ===';
    raise notice 'Email: %', lower(v_email);
    raise notice 'Temporary password: %', v_password;
  end if;
end $$;

-- Now that every existing row has an owner, enforce it going forward.
alter table customers          alter column user_id set not null;
alter table suppliers          alter column user_id set not null;
alter table products           alter column user_id set not null;
alter table purchase_orders    alter column user_id set not null;
alter table sales_orders       alter column user_id set not null;
alter table sales_invoices     alter column user_id set not null;
alter table customer_payments  alter column user_id set not null;
alter table supplier_payments  alter column user_id set not null;

create index idx_customers_user on customers(user_id);
create index idx_suppliers_user on suppliers(user_id);
create index idx_products_user on products(user_id);
create index idx_po_user on purchase_orders(user_id);
create index idx_so_user on sales_orders(user_id);
create index idx_inv_user on sales_invoices(user_id);
create index idx_cp_user on customer_payments(user_id);
create index idx_sp_user on supplier_payments(user_id);

-- Composite indexes matching real query patterns (tenant-scoped list/report
-- filtering combined with a date range).
create index idx_po_user_date on purchase_orders(user_id, po_date);
create index idx_so_user_date on sales_orders(user_id, so_date);
create index idx_inv_user_date on sales_invoices(user_id, invoice_date);
create index idx_cp_user_date on customer_payments(user_id, payment_date);
create index idx_sp_user_date on supplier_payments(user_id, payment_date);
