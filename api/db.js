import { neon } from '@neondatabase/serverless';
import { verifyToken } from '@clerk/backend';

const sql = neon(process.env.DATABASE_URL);

const TABLES = new Set([
  'ifs_clients',
  'ifs_assessment_results',
  'ifs_personalized_curriculum',
  'ifs_client_progress',
  'ifs_module_answers',
  'ifs_journal_entries',
  'ifs_parts',
  'ifs_interactive_data',
  'ifs_exercise_progress',
  'ifs_therapist_notes',
  'ifs_milestones',
  'ifs_content_library',
  'ifs_mood_entries',
  'ifs_therapy_sessions',
  'ifs_therapy_homework',
  'ifs_messages',
  'ifs_parts_dialogue',
  'ifs_gamification',
  'ifs_client_preferences',
  'ifs_therapist_feedback',
  'ifs_therapy_activity_progress',
  'ifs_uploads'
]);

const IDENT = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function quoteIdent(identifier) {
  if (!IDENT.test(identifier)) throw new Error(`Invalid identifier: ${identifier}`);
  return `"${identifier}"`;
}

function normalizeColumns(columns) {
  if (!columns || columns === '*') return '*';
  return columns
    .split(',')
    .map((column) => column.trim())
    .filter(Boolean)
    .map(quoteIdent)
    .join(', ');
}

function buildWhere(filters = [], params) {
  if (!filters.length) return '';
  const clauses = filters.map((filter) => {
    const column = quoteIdent(filter.column);
    if (filter.op === 'eq') {
      params.push(filter.value);
      return `${column} = $${params.length}`;
    }
    if (filter.op === 'in') {
      const values = Array.isArray(filter.value) ? filter.value : [];
      if (!values.length) return 'false';
      const placeholders = values.map((value) => {
        params.push(value);
        return `$${params.length}`;
      });
      return `${column} IN (${placeholders.join(', ')})`;
    }
    if (filter.op === 'like' || filter.op === 'ilike') {
      params.push(filter.value);
      return `${column} ${filter.op.toUpperCase()} $${params.length}`;
    }
    throw new Error(`Unsupported filter operation: ${filter.op}`);
  });
  return ` WHERE ${clauses.join(' AND ')}`;
}

function buildOrder(order = []) {
  if (!order.length) return '';
  return ` ORDER BY ${order.map((item) => `${quoteIdent(item.column)} ${item.ascending ? 'ASC' : 'DESC'}`).join(', ')}`;
}

function buildLimit(limit, single, maybeSingle) {
  if (single || maybeSingle) return ' LIMIT 1';
  return Number.isInteger(limit) && limit > 0 ? ` LIMIT ${limit}` : '';
}

function normalizeRows(rows, single, maybeSingle) {
  if (single || maybeSingle) return rows[0] || null;
  return rows;
}

function ensureValues(values) {
  if (Array.isArray(values)) return values;
  return [values];
}

function buildInsert(table, values, params) {
  const rows = ensureValues(values);
  if (!rows.length) throw new Error('Insert requires at least one row');
  const keys = Object.keys(rows[0]);
  if (!keys.length) throw new Error('Insert requires values');

  const columns = keys.map(quoteIdent).join(', ');
  const rowSql = rows.map((row) => {
    const placeholders = keys.map((key) => {
      params.push(row[key] ?? null);
      return `$${params.length}`;
    });
    return `(${placeholders.join(', ')})`;
  });

  return `INSERT INTO ${quoteIdent(table)} (${columns}) VALUES ${rowSql.join(', ')} RETURNING *`;
}

function buildUpdate(table, values, filters, params) {
  const keys = Object.keys(values || {});
  if (!keys.length) throw new Error('Update requires values');
  const assignments = keys.map((key) => {
    params.push(values[key] ?? null);
    return `${quoteIdent(key)} = $${params.length}`;
  });
  return `UPDATE ${quoteIdent(table)} SET ${assignments.join(', ')}${buildWhere(filters, params)} RETURNING *`;
}

function buildDelete(table, filters, params) {
  return `DELETE FROM ${quoteIdent(table)}${buildWhere(filters, params)} RETURNING *`;
}

function buildUpsert(table, values, onConflict, params) {
  if (!onConflict) throw new Error('Upsert requires onConflict');
  const rows = ensureValues(values);
  if (!rows.length) throw new Error('Upsert requires at least one row');
  const keys = Object.keys(rows[0]);
  const conflictKeys = onConflict.split(',').map((key) => key.trim()).filter(Boolean);
  const updateKeys = keys.filter((key) => !conflictKeys.includes(key));

  const insertSql = buildInsert(table, rows, params).replace(' RETURNING *', '');
  const conflictSql = conflictKeys.map(quoteIdent).join(', ');
  const updateSql = updateKeys.length
    ? `DO UPDATE SET ${updateKeys.map((key) => `${quoteIdent(key)} = EXCLUDED.${quoteIdent(key)}`).join(', ')}`
    : 'DO NOTHING';

  return `${insertSql} ON CONFLICT (${conflictSql}) ${updateSql} RETURNING *`;
}

async function requireAuth(req) {
  if (process.env.ALLOW_PIN_AUTH_WITHOUT_CLERK === 'true') return null;
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) throw Object.assign(new Error('Missing Clerk bearer token'), { statusCode: 401 });

  const payload = await verifyToken(token, {
    secretKey: process.env.CLERK_SECRET_KEY,
    authorizedParties: process.env.CLERK_AUTHORIZED_PARTIES?.split(',').map((v) => v.trim()).filter(Boolean)
  });
  return payload;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  try {
    await requireAuth(req);
    const { table, action, columns = '*', filters = [], order = [], limit, values, onConflict, single, maybeSingle } = req.body || {};
    if (!TABLES.has(table)) throw new Error(`Unsupported table: ${table}`);

    const params = [];
    let query;

    if (action === 'select') {
      query = `SELECT ${normalizeColumns(columns)} FROM ${quoteIdent(table)}${buildWhere(filters, params)}${buildOrder(order)}${buildLimit(limit, single, maybeSingle)}`;
    } else if (action === 'insert') {
      query = buildInsert(table, values, params);
    } else if (action === 'update') {
      query = buildUpdate(table, values, filters, params);
    } else if (action === 'delete') {
      query = buildDelete(table, filters, params);
    } else if (action === 'upsert') {
      query = buildUpsert(table, values, onConflict, params);
    } else {
      throw new Error(`Unsupported action: ${action}`);
    }

    const rows = await sql.query(query, params);
    return res.status(200).json({ data: normalizeRows(rows, single, maybeSingle) });
  } catch (error) {
    const status = error.statusCode || 400;
    return res.status(status).json({ error: { message: error.message } });
  }
}
