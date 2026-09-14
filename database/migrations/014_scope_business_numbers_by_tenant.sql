-- Fixes a gap introduced by tenant-scoping the number sequences in
-- migration 013's application code: business-number columns
-- (customer_code, po_number, invoice_number, ...) were still globally
-- UNIQUE, but different tenants now legitimately generate the same code
-- (e.g. both starting at CUS-000001) — which the old global constraint
-- would reject as a collision. Per the numbering requirement, this is
-- expected and must be allowed: Vendor A's INV-2026-000001 and Vendor B's
-- INV-2026-000001 are two different, unrelated documents.
--
-- Replaces each single-column UNIQUE constraint with a composite
-- UNIQUE(user_id, code) constraint — unique within a tenant, freely
-- repeatable across tenants.

alter table customers drop constraint customers_customer_code_key;
alter table customers add constraint customers_user_code_key unique (user_id, customer_code);

alter table suppliers drop constraint suppliers_supplier_code_key;
alter table suppliers add constraint suppliers_user_code_key unique (user_id, supplier_code);

alter table products drop constraint products_product_code_key;
alter table products add constraint products_user_code_key unique (user_id, product_code);

alter table purchase_orders drop constraint purchase_orders_po_number_key;
alter table purchase_orders add constraint purchase_orders_user_number_key unique (user_id, po_number);

alter table sales_orders drop constraint sales_orders_so_number_key;
alter table sales_orders add constraint sales_orders_user_number_key unique (user_id, so_number);

alter table sales_invoices drop constraint sales_invoices_invoice_number_key;
alter table sales_invoices add constraint sales_invoices_user_number_key unique (user_id, invoice_number);

alter table customer_payments drop constraint customer_payments_payment_number_key;
alter table customer_payments add constraint customer_payments_user_number_key unique (user_id, payment_number);

alter table supplier_payments drop constraint supplier_payments_payment_number_key;
alter table supplier_payments add constraint supplier_payments_user_number_key unique (user_id, payment_number);
