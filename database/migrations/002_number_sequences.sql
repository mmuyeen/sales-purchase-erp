-- Backs sequential business-number generation (CUS-000001, PO-2026-000001, etc).
-- One row per sequence key: non-yearly keys are the prefix itself ('CUS', 'SUP', 'PROD'),
-- yearly keys are "<PREFIX>-<YEAR>" ('PO-2026', 'SO-2026', 'INV-2026', 'CP-2026', 'SP-2026').
create table number_sequences (
  sequence_key text primary key,
  last_value   integer not null default 0,
  updated_at   timestamptz not null default now()
);

-- Atomically reserves and returns the next value for a sequence key.
-- The INSERT ... ON CONFLICT ... DO UPDATE ... RETURNING is a single atomic
-- statement, so concurrent callers never receive the same number.
create or replace function next_sequence_value(p_key text) returns integer as $$
declare
  v_value integer;
begin
  insert into number_sequences (sequence_key, last_value)
  values (p_key, 1)
  on conflict (sequence_key)
  do update set last_value = number_sequences.last_value + 1, updated_at = now()
  returning last_value into v_value;

  return v_value;
end;
$$ language plpgsql;
