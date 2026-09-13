import { ApiError } from './ApiError.js';

// Never expose raw database errors or stack traces to the client.
export function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ success: false, message: err.message, errors: err.errors });
  }

  if (err.code === '23505') {
    return res.status(409).json({ success: false, message: 'A record with this value already exists.', errors: [] });
  }
  if (err.code === '23503') {
    return res.status(409).json({ success: false, message: 'This record is referenced by other data and cannot be changed.', errors: [] });
  }
  if (err.code === '23514') {
    return res.status(400).json({ success: false, message: 'One or more values do not meet validation rules.', errors: [] });
  }

  console.error(err);
  return res.status(500).json({ success: false, message: 'An unexpected error occurred. Please try again.', errors: [] });
}
