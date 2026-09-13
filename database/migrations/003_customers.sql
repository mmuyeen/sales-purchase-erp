create table customers (
  id             bigserial primary key,
  customer_code  text unique not null,
  customer_name  text not null,
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

create index idx_customers_active on customers(is_active);
create index idx_customers_name on customers(customer_name);

create trigger trg_customers_updated_at
  before update on customers
  for each row execute function set_updated_at();
