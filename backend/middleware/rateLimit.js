import { ApiError } from './ApiError.js';

// Basic in-memory rate limit for auth endpoints (login/register), keyed by
// IP. No rate-limiting existed in this project before.
//
// LIMITATION: this is per-process memory, not shared across serverless
// instances/regions. On Vercel, each cold-started function instance has its
// own counters, so this is a best-effort deterrent against casual brute
// force, not a hard guarantee — a real production deployment under attack
// would want a shared store (e.g. Redis) instead. Documented in README.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const attempts = new Map();

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
}

export function authRateLimit(req, res, next) {
  const key = getClientIp(req);
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    attempts.set(key, { windowStart: now, count: 1 });
    return next();
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return next(new ApiError(429, 'Too many attempts. Please try again later.'));
  }

  entry.count += 1;
  next();
}
