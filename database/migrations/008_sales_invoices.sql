create table sales_invoices (
  id                   bigserial primary key,
  invoice_number       text unique not null,
  invoice_date         date not null,
  customer_id          bigint not null references customers(id) on delete restrict,
  sales_order_id       bigint references sales_orders(id) on delete restrict,
  customer_address     text,
  customer_gst_number  text,
  customer_state       text,
  payment_terms        text check (payment_terms in ('Cash','Immediate','7 Days','15 Days','30 Days','45 Days','60 Days','90 Days')),
  remarks              text,
  subtotal             numeric(18,2) not null default 0,
  discount_amount      numeric(18,2) not null default 0,
  taxable_amount       numeric(18,2) not null default 0,
  tax_amount           numeric(18,2) not null default 0,
  grand_total          numeric(18,2) not null default 0,
  paid_amount          numeric(18,2) not null default 0,
  balance_amount       numeric(18,2) not null default 0,
  status               text not null default 'Draft'
                          check (status in ('Draft','Issued','Partially Paid','Paid','Cancelled')),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index idx_inv_customer on sales_invoices(customer_id);
create index idx_inv_so on sales_invoices(sales_order_id);
create index idx_inv_status on sales_invoices(status);
create index idx_inv_date on sales_invoices(invoice_date);

create trigger trg_inv_updated_at
  before update on sales_invoices
  for each row execute function set_updated_at();

create table sales_invoice_items (
  id                   bigserial primary key,
  sales_invoice_id     bigint not null references sales_invoices(id) on delete cascade,
  sales_order_item_id  bigint references sales_order_items(id) on delete restrict,
  product_id           bigint not null references products(id) on delete restrict,
  line_no              integer not null,
  description          text,
  uom                  text not null,
  quantity             numeric(18,3) not null check (quantity > 0),
  rate                 numeric(18,2) not null check (rate >= 0),
  discount_amount      numeric(18,2) not null default 0 check (discount_amount >= 0),
  tax_percentage       numeric(5,2) not null,
  tax_amount           numeric(18,2) not null default 0,
  line_total           numeric(18,2) not null default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index idx_invi_invoice on sales_invoice_items(sales_invoice_id);
create index idx_invi_product on sales_invoice_items(product_id);

create trigger trg_invi_updated_at
  before update on sales_invoice_items
  for each row execute function set_updated_at();
