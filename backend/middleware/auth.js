import jwt from 'jsonwebtoken';
import { ApiError } from './ApiError.js';
import { getPool } from '../db.js';

export const AUTH_COOKIE_NAME = 'spm_token';
const TOKEN_TTL = '7d';
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set.');
  }
  return secret;
}

// The token carries only the user id — never company/business data — per
// the "minimal claims" requirement. Everything else is looked up fresh,
// tenant-scoped, on every request. jsonwebtoken adds a standard `iat`
// (issued-at, seconds since epoch) claim automatically; requireAuth uses
// it below to detect and reject sessions from before a password reset.
export function signAuthToken(userId) {
  return jwt.sign({ sub: userId }, getJwtSecret(), { expiresIn: TOKEN_TTL });
}

export function setAuthCookie(res, token) {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE_MS,
    path: '/',
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
}

// Verifies the JWT from the httpOnly cookie and attaches req.user = { id }.
// The authenticated identity always comes from this verified token — never
// from a client-supplied user_id/query param/body field.
//
// Also enforces session invalidation after a password reset: a stateless
// JWT can't be revoked by itself, so this compares the token's issued-at
// time against users.password_changed_at (updated by resetPassword) and
// rejects any token issued before the most recent password change. This
// also naturally re-checks is_active on every request, not just at login.
export async function requireAuth(req, res, next) {
  const token = req.cookies?.[AUTH_COOKIE_NAME];
  if (!token) {
    return next(new ApiError(401, 'Not authenticated.'));
  }

  let payload;
  try {
    payload = jwt.verify(token, getJwtSecret());
  } catch {
    return next(new ApiError(401, 'Not authenticated.'));
  }
  if (!payload?.sub || !payload?.iat) {
    return next(new ApiError(401, 'Not authenticated.'));
  }

  try {
    const { rows } = await getPool().query(
      'select is_active, password_changed_at from users where id = $1',
      [payload.sub]
    );
    const user = rows[0];
    if (!user || !user.is_active) {
      return next(new ApiError(401, 'Not authenticated.'));
    }
    const passwordChangedAtSeconds = Math.floor(new Date(user.password_changed_at).getTime() / 1000);
    if (passwordChangedAtSeconds > payload.iat) {
      return next(new ApiError(401, 'Your session has expired. Please log in again.'));
    }
  } catch (err) {
    return next(err);
  }

  req.user = { id: payload.sub };
  next();
}
