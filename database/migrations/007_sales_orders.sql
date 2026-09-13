create table sales_orders (
  id                   bigserial primary key,
  so_number            text unique not null,
  so_date              date not null,
  customer_id          bigint not null references customers(id) on delete restrict,
  customer_gst_number  text,
  customer_state       text,
  payment_terms        text check (payment_terms in ('Cash','Immediate','7 Days','15 Days','30 Days','45 Days','60 Days','90 Days')),
  delivery_date        date,
  remarks              text,
  subtotal             numeric(18,2) not null default 0,
  discount_amount      numeric(18,2) not null default 0,
  taxable_amount       numeric(18,2) not null default 0,
  tax_amount           numeric(18,2) not null default 0,
  grand_total          numeric(18,2) not null default 0,
  status               text not null default 'Draft'
                          check (status in ('Draft','Confirmed','Partially Invoiced','Completed','Cancelled')),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index idx_so_customer on sales_orders(customer_id);
create index idx_so_status on sales_orders(status);
create index idx_so_date on sales_orders(so_date);

create trigger trg_so_updated_at
  before update on sales_orders
  for each row execute function set_updated_at();

create table sales_order_items (
  id              bigserial primary key,
  sales_order_id  bigint not null references sales_orders(id) on delete cascade,
  product_id      bigint not null references products(id) on delete restrict,
  line_no         integer not null,
  description     text,
  uom             text not null,
  quantity        numeric(18,3) not null check (quantity > 0),
  rate            numeric(18,2) not null check (rate >= 0),
  discount_amount numeric(18,2) not null default 0 check (discount_amount >= 0),
  tax_percentage  numeric(5,2) not null,
  tax_amount      numeric(18,2) not null default 0,
  line_total      numeric(18,2) not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_soi_so on sales_order_items(sales_order_id);
create index idx_soi_product on sales_order_items(product_id);

create trigger trg_soi_updated_at
  before update on sales_order_items
  for each row execute function set_updated_at();
