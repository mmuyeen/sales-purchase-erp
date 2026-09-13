create table suppliers (
  id             bigserial primary key,
  supplier_code  text unique not null,
  supplier_name  text not null,
  address        text,
  state          text not null,
  city           text not null,
  pincode        char(6) not null check (pincode ~ '^[1-9][0-9]{5}$'),
  gst_number     text check (
                   gst_number is null
                   or gst_number ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$'
                 ),
  phone          text,
  email          text,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index idx_suppliers_active on suppliers(is_active);
create index idx_suppliers_name on suppliers(supplier_name);

create trigger trg_suppliers_updated_at
  before update on suppliers
  for each row execute function set_updated_at();
