create table customer_payments (
  id                bigserial primary key,
  payment_number    text unique not null,
  payment_date      date not null,
  customer_id       bigint not null references customers(id) on delete restrict,
  sales_invoice_id  bigint not null references sales_invoices(id) on delete restrict,
  amount            numeric(18,2) not null check (amount > 0),
  payment_mode      text not null check (payment_mode in ('Cash','Bank Transfer','UPI','Cheque','Card','Other')),
  reference_number  text,
  remarks           text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_cp_customer on customer_payments(customer_id);
create index idx_cp_invoice on customer_payments(sales_invoice_id);
create index idx_cp_date on customer_payments(payment_date);

create trigger trg_cp_updated_at
  before update on customer_payments
  for each row execute function set_updated_at();

create table supplier_payments (
  id                 bigserial primary key,
  payment_number     text unique not null,
  payment_date       date not null,
  supplier_id        bigint not null references suppliers(id) on delete restrict,
  purchase_order_id  bigint not null references purchase_orders(id) on delete restrict,
  amount             numeric(18,2) not null check (amount > 0),
  payment_mode       text not null check (payment_mode in ('Cash','Bank Transfer','UPI','Cheque','Card','Other')),
  reference_number   text,
  remarks            text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index idx_sp_supplier on supplier_payments(supplier_id);
create index idx_sp_po on supplier_payments(purchase_order_id);
create index idx_sp_date on supplier_payments(payment_date);

create trigger trg_sp_updated_at
  before update on supplier_payments
  for each row execute function set_updated_at();
