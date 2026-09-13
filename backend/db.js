import pg from 'pg';

const { Pool, types } = pg;

// By default node-pg parses the DATE type into a JS Date at UTC midnight,
// which then shifts to the previous calendar day once serialized to JSON
// in any timezone behind UTC (e.g. IST). Business dates (po_date,
// invoice_date, payment_date, ...) must stay exactly what's stored, so
// return them as plain 'YYYY-MM-DD' strings instead.
types.setTypeParser(types.builtins.DATE, (value) => value);

let pool;

// Reused across warm serverless invocations so we don't open a new
// connection per request. Small max size, paired with Supabase's
// transaction-mode connection pooler (port 6543) on DATABASE_URL.
export function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set.');
    }
    pool = new Pool({
      connectionString,
      max: 3,
      ssl: connectionString.includes('supabase.com') ? { rejectUnauthorized: false } : false,
    });
  }
  return pool;
}

export async function withTransaction(fn) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
