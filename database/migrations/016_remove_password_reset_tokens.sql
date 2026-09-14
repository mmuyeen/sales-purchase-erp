-- The application now uses a simple, explicitly-requested Forgot Password
-- flow that identifies the account by registered email alone (no reset
-- token/link/OTP/email delivery). password_reset_tokens is therefore unused
-- dead schema left over from the previous token-based implementation and is
-- dropped here. users.password_changed_at is kept — it is still used by
-- requireAuth to invalidate sessions issued before a password reset.
drop table if exists password_reset_tokens;
