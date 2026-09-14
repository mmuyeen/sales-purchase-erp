import axios from 'axios';

// withCredentials is required so the httpOnly auth cookie is sent with
// every request — this app uses cookie-based auth, never a token in
// localStorage/JS-accessible storage.
const client = axios.create({ baseURL: '/api', withCredentials: true });

// Set by AuthProvider on mount so a 401 from ANY request (not just
// /auth/me) immediately reflects "logged out" in the UI — e.g. an expired
// token discovered mid-session — without a circular import between this
// plain module and the React auth context.
let unauthorizedHandler = null;
export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = fn;
}

client.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || 'Something went wrong. Please try again.';
    if (status === 401) {
      unauthorizedHandler?.();
    }
    const wrapped = new Error(message);
    wrapped.status = status;
    return Promise.reject(wrapped);
  }
);

export default client;
