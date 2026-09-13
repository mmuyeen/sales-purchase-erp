create table products (
  id              bigserial primary key,
  product_code    text unique not null,
  product_name    text not null,
  description     text,
  uom             text not null check (uom in ('PCS','NOS','BOX','KG','GRAM','LTR','MTR','SET','DOZEN')),
  tax_percentage  numeric(5,2) not null check (tax_percentage in (0,5,12,18,28)),
  payment_term    text check (payment_term in ('Cash','Immediate','7 Days','15 Days','30 Days','45 Days','60 Days','90 Days')),
  purchase_price  numeric(18,2) not null check (purchase_price >= 0),
  sales_price     numeric(18,2) not null check (sales_price >= 0),
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_products_active on products(is_active);
create index idx_products_name on products(product_name);

create trigger trg_products_updated_at
  before update on products
  for each row execute function set_updated_at();
