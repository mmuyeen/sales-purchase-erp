-- Password reset tokens: exactly one row per reset request. Only a hash of
-- the raw token is ever stored — the raw token exists only in the emailed
-- link and in memory for the duration of a single request.
create table password_reset_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  token_hash  text not null,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index idx_password_reset_tokens_user on password_reset_tokens(user_id);
create index idx_password_reset_tokens_hash on password_reset_tokens(token_hash);
create index idx_password_reset_tokens_expires on password_reset_tokens(expires_at);

-- Lets requireAuth reject a JWT issued before the user's most recent
-- password change, without maintaining a separate token-blacklist table —
-- the stateless JWT carries a standard "issued at" (iat) claim, compared
-- against this column on every authenticated request.
--
-- Defaults to now() so existing rows (bootstrap owner, test accounts) get a
-- real timestamp instead of NULL. One-time side effect of running this
-- migration: every currently logged-in user's existing session token
-- becomes invalid, since no token issued before this column existed can
-- have been issued "at or after" a timestamp set to the moment this
-- migration runs. That is expected and benign — they simply log in again.
alter table users add column password_changed_at timestamptz not null default now();
