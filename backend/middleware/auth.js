import jwt from 'jsonwebtoken';
import { ApiError } from './ApiError.js';

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
// tenant-scoped, on every request.
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
export function requireAuth(req, res, next) {
  const token = req.cookies?.[AUTH_COOKIE_NAME];
  if (!token) {
    return next(new ApiError(401, 'Not authenticated.'));
  }
  try {
    const payload = jwt.verify(token, getJwtSecret());
    if (!payload?.sub) {
      return next(new ApiError(401, 'Not authenticated.'));
    }
    req.user = { id: payload.sub };
    next();
  } catch {
    next(new ApiError(401, 'Not authenticated.'));
  }
}
