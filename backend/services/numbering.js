// Generates sequential business numbers safely on the database, e.g.
// CUS-000001 (non-yearly) or PO-2026-000001 (yearly). Must be called with
// a client that is inside an open transaction so the insert/update that
// consumes the number and the number reservation commit or roll back together.
export async function generateNumber(client, prefix, { yearly = false, padWidth = 6 } = {}) {
  const key = yearly ? `${prefix}-${new Date().getFullYear()}` : prefix;
  const { rows } = await client.query('select next_sequence_value($1) as val', [key]);
  const padded = String(rows[0].val).padStart(padWidth, '0');
  return `${key}-${padded}`;
}
