-- Adds CGST/SGST/IGST/round-off breakup to the three transaction header tables.
-- Safe on an existing, populated database: every column is NUMERIC(18,2) with a
-- constant DEFAULT 0, so this is a metadata-only ADD COLUMN in PostgreSQL —
-- existing rows get 0 with nothing rewritten and no existing values touched.
--
-- No line-item columns are added: CGST/SGST/IGST per line are algebraically
-- derived from the existing tax_percentage/tax_amount at calculation time
-- (50/50 split for intra-state, 100% IGST for inter-state), so storing a
-- single rate/amount per line would be redundant. Header-level amounts are
-- stored because they're aggregated across lines that may carry different
-- tax_percentage values.

alter table sales_invoices
  add column cgst_amount numeric(18,2) not null default 0,
  add column sgst_amount numeric(18,2) not null default 0,
  add column igst_amount numeric(18,2) not null default 0,
  add column total_gst   numeric(18,2) not null default 0,
  add column round_off   numeric(18,2) not null default 0;

alter table sales_orders
  add column cgst_amount numeric(18,2) not null default 0,
  add column sgst_amount numeric(18,2) not null default 0,
  add column igst_amount numeric(18,2) not null default 0,
  add column total_gst   numeric(18,2) not null default 0,
  add column round_off   numeric(18,2) not null default 0;

alter table purchase_orders
  add column cgst_amount numeric(18,2) not null default 0,
  add column sgst_amount numeric(18,2) not null default 0,
  add column igst_amount numeric(18,2) not null default 0,
  add column total_gst   numeric(18,2) not null default 0,
  add column round_off   numeric(18,2) not null default 0;
