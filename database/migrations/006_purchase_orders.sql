create table purchase_orders (
  id                      bigserial primary key,
  po_number               text unique not null,
  po_date                 date not null,
  supplier_id             bigint not null references suppliers(id) on delete restrict,
  supplier_gst_number     text,
  supplier_state          text,
  payment_terms           text check (payment_terms in ('Cash','Immediate','7 Days','15 Days','30 Days','45 Days','60 Days','90 Days')),
  expected_delivery_date  date,
  remarks                 text,
  subtotal                numeric(18,2) not null default 0,
  discount_amount         numeric(18,2) not null default 0,
  taxable_amount          numeric(18,2) not null default 0,
  tax_amount              numeric(18,2) not null default 0,
  grand_total             numeric(18,2) not null default 0,
  paid_amount             numeric(18,2) not null default 0,
  balance_amount          numeric(18,2) not null default 0,
  status                  text not null default 'Draft'
                             check (status in ('Draft','Confirmed','Partially Received','Completed','Cancelled')),
  payment_status          text not null default 'Unpaid'
                             check (payment_status in ('Unpaid','Partially Paid','Paid')),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index idx_po_supplier on purchase_orders(supplier_id);
create index idx_po_status on purchase_orders(status);
create index idx_po_date on purchase_orders(po_date);

create trigger trg_po_updated_at
  before update on purchase_orders
  for each row execute function set_updated_at();

create table purchase_order_items (
  id                 bigserial primary key,
  purchase_order_id  bigint not null references purchase_orders(id) on delete cascade,
  product_id         bigint not null references products(id) on delete restrict,
  line_no            integer not null,
  description        text,
  uom                text not null,
  quantity           numeric(18,3) not null check (quantity > 0),
  rate               numeric(18,2) not null check (rate >= 0),
  discount_amount    numeric(18,2) not null default 0 check (discount_amount >= 0),
  tax_percentage     numeric(5,2) not null,
  tax_amount         numeric(18,2) not null default 0,
  line_total         numeric(18,2) not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index idx_poi_po on purchase_order_items(purchase_order_id);
create index idx_poi_product on purchase_order_items(product_id);

create trigger trg_poi_updated_at
  before update on purchase_order_items
  for each row execute function set_updated_at();
