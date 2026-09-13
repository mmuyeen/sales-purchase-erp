-- Adds HSN Code support. Safe to run against an existing, populated database:
-- every column added below is nullable with no default, so it is a metadata-only
-- change in PostgreSQL — existing rows simply get NULL, nothing is rewritten,
-- nothing existing breaks.
--
-- HSN Code is stored as text (not integer) so leading zeros are preserved, and
-- constrained to exactly 4, 6, or 8 digits (or NULL) per GST HSN conventions.

alter table products
  add column hsn_code varchar(8)
    constraint products_hsn_code_check
    check (hsn_code is null or hsn_code ~ '^([0-9]{4}|[0-9]{6}|[0-9]{8})$');

-- Historical snapshots: the HSN Code applicable when each line was created,
-- independent of later changes to the product master. This mirrors how these
-- tables already snapshot description/uom/tax_percentage.
alter table purchase_order_items
  add column hsn_code varchar(8)
    constraint purchase_order_items_hsn_code_check
    check (hsn_code is null or hsn_code ~ '^([0-9]{4}|[0-9]{6}|[0-9]{8})$');

alter table sales_order_items
  add column hsn_code varchar(8)
    constraint sales_order_items_hsn_code_check
    check (hsn_code is null or hsn_code ~ '^([0-9]{4}|[0-9]{6}|[0-9]{8})$');

alter table sales_invoice_items
  add column hsn_code varchar(8)
    constraint sales_invoice_items_hsn_code_check
    check (hsn_code is null or hsn_code ~ '^([0-9]{4}|[0-9]{6}|[0-9]{8})$');
