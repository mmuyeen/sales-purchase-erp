import bcrypt from 'bcryptjs';
import { getPool, withTransaction } from '../db.js';
import { ApiError } from '../middleware/ApiError.js';
import { signAuthToken, setAuthCookie, clearAuthCookie } from '../middleware/auth.js';
import { validateLoginInput, validateRegisterInput } from '../validators/auth.js';

const BCRYPT_ROUNDS = 10;
// Used to keep login response time similar whether or not the email exists,
// so an attacker can't distinguish "no such user" from "wrong password"
// by timing. Never a valid hash for a real account.
const DUMMY_HASH = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8Q8T8Q8T8Q8T8Q8T8Q8T8Q8T8Q8T8Q';

function mapUser(row) {
  return { id: row.id, email: row.email };
}

export async function register(req, res) {
  const input = validateRegisterInput(req.body);

  const result = await withTransaction(async (client) => {
    const { rows: existing } = await client.query('select id from users where email = $1', [input.email]);
    if (existing.length) {
      throw new ApiError(409, 'An account with this email already exists.');
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

    const { rows: userRows } = await client.query(
      'insert into users (email, password_hash) values ($1, $2) returning id, email',
      [input.email, passwordHash]
    );
    const user = userRows[0];

    await client.query(
      `insert into companies (user_id, company_name, company_address, company_gst_number, company_state, company_state_code)
       values ($1, $2, $3, $4, $5, $6)`,
      [user.id, input.companyName, input.companyAddress, input.companyGstNumber, input.companyState, input.companyStateCode]
    );

    return user;
  });

  const token = signAuthToken(result.id);
  setAuthCookie(res, token);
  res.status(201).json({ success: true, data: mapUser(result) });
}

export async function login(req, res) {
  const { email, password } = validateLoginInput(req.body);

  const { rows } = await getPool().query('select * from users where email = $1', [email]);
  const user = rows[0];

  const hashToCompare = user ? user.password_hash : DUMMY_HASH;
  const passwordMatches = await bcrypt.compare(password, hashToCompare);

  if (!user || !passwordMatches || !user.is_active) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  const token = signAuthToken(user.id);
  setAuthCookie(res, token);
  res.json({ success: true, data: mapUser(user) });
}

export async function logout(req, res) {
  clearAuthCookie(res);
  res.json({ success: true, data: null });
}

export async function me(req, res) {
  const { rows } = await getPool().query('select id, email from users where id = $1', [req.user.id]);
  if (!rows.length) throw new ApiError(401, 'Not authenticated.');
  res.json({ success: true, data: mapUser(rows[0]) });
}
