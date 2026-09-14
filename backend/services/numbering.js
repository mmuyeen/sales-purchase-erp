// Generates sequential business numbers safely on the database, e.g.
// CUS-000001 (non-yearly) or PO-2026-000001 (yearly). Must be called with
// a client that is inside an open transaction so the insert/update that
// consumes the number and the number reservation commit or roll back together.
//
// Scoped per tenant (userId is folded into the sequence key) so different
// vendors independently start their own numbering from 1 — Vendor A's
// PO-2026-000001 has no relationship to Vendor B's PO-2026-000001.
export async function generateNumber(client, userId, prefix, { yearly = false, padWidth = 6 } = {}) {
  if (!userId) {
    throw new Error('generateNumber requires a userId to keep sequences tenant-scoped.');
  }
  const base = yearly ? `${prefix}-${new Date().getFullYear()}` : prefix;
  const key = `${userId}:${base}`;
  const { rows } = await client.query('select next_sequence_value($1) as val', [key]);
  const padded = String(rows[0].val).padStart(padWidth, '0');
  return `${base}-${padded}`;
}
