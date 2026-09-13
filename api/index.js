// Vercel serverless entry point. An Express app is itself a valid
// (req, res) handler, so it can be exported directly without an adapter.
import app from '../backend/app.js';

export default app;
