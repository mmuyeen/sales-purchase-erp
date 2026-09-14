-- Multi-tenancy: one users table (login identity) and one companies table
-- (exactly one company profile per user, enforced by UNIQUE(user_id)).
-- UUID primary keys per the requested schema — existing business tables
-- keep their BIGSERIAL ids; they gain a UUID user_id FK in the next migration.

create table users (
  id             uuid primary key default gen_random_uuid(),
  email          varchar(255) unique not null,
  password_hash  text not null,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index idx_users_email on users(email);

create trigger trg_users_updated_at
  before update on users
  for each row execute function set_updated_at();

create table companies (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null unique references users(id) on delete cascade,
  company_name         varchar(255) not null,
  company_address      text not null,
  company_gst_number   varchar(15)
                          check (company_gst_number is null or company_gst_number ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$'),
  company_state        varchar(100) not null,
  -- text, not integer, so a leading zero (e.g. state code "07") is preserved.
  company_state_code   varchar(2) not null check (company_state_code ~ '^[0-9]{2}$'),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index idx_companies_user on companies(user_id);

create trigger trg_companies_updated_at
  before update on companies
  for each row execute function set_updated_at();
