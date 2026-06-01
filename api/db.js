/* global process */
import { sql, isAdminUser, isTherapistUser } from './_auth.js';

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
  'ifs_uploads',
  'ifs_therapist_clients',
  'ifs_assigned_homework',
  'ifs_session_agendas',
  'ifs_generated_reports',
  'ifs_treatment_plans'
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
    if (filter.raw) return `(${filter.raw})`;
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
    if (filter.op === 'gte' || filter.op === 'lte') {
      params.push(filter.value);
      return `${column} ${filter.op === 'gte' ? '>=' : '<='} $${params.length}`;
    }
    if (filter.op === 'is') {
      if (filter.value === null) return `${column} IS NULL`;
      if (filter.value === true) return `${column} IS TRUE`;
      if (filter.value === false) return `${column} IS FALSE`;
      throw new Error('Unsupported IS filter value');
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

async function getCurrentAppUserFromClerk(req) {
  if (process.env.ALLOW_PIN_AUTH_WITHOUT_CLERK === 'true') return null;
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) throw Object.assign(new Error('Missing Clerk bearer token'), { statusCode: 401 });

  const { verifyToken } = await import('@clerk/backend');
  const payload = await verifyToken(token, {
    secretKey: process.env.CLERK_SECRET_KEY,
    authorizedParties: process.env.CLERK_AUTHORIZED_PARTIES?.split(',').map((v) => v.trim()).filter(Boolean)
  });

  const rows = await sql.query('SELECT * FROM ifs_clients WHERE clerk_user_id = $1 LIMIT 1', [payload.sub]);
  if (!rows[0]) throw Object.assign(new Error('No IFS app user is linked to this Clerk account'), { statusCode: 403 });
  return rows[0];
}

const CLIENT_SCOPED_TABLES = new Set([
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
  'ifs_mood_entries',
  'ifs_therapy_sessions',
  'ifs_therapy_homework',
  'ifs_messages',
  'ifs_parts_dialogue',
  'ifs_gamification',
  'ifs_client_preferences',
  'ifs_therapist_feedback',
  'ifs_therapy_activity_progress',
  'ifs_uploads',
  'ifs_assigned_homework',
  'ifs_session_agendas',
  'ifs_generated_reports',
  'ifs_treatment_plans'
]);


const ASSIGNED_HOMEWORK_CLIENT_UPDATE_COLUMNS = new Set(['status', 'started_at', 'completed_at', 'updated_at']);
const SESSION_AGENDA_CLIENT_INSERT_COLUMNS = new Set(['client_id', 'therapist_id', 'topics', 'active_parts', 'stuck_points', 'goals_for_session', 'current_stress_level', 'current_mood_label', 'safety_concerns', 'session_date', 'session_datetime', 'status', 'created_at', 'updated_at']);
const SESSION_AGENDA_CLIENT_UPDATE_COLUMNS = new Set(['topics', 'active_parts', 'stuck_points', 'goals_for_session', 'current_stress_level', 'current_mood_label', 'safety_concerns', 'session_date', 'session_datetime', 'status', 'updated_at']);
const SESSION_AGENDA_THERAPIST_UPDATE_COLUMNS = new Set(['therapist_notes', 'reviewed_at', 'status', 'updated_at']);
const SESSION_AGENDA_CLIENT_STATUSES = new Set(['draft', 'submitted', 'archived']);
const SESSION_AGENDA_THERAPIST_STATUSES = new Set(['reviewed', 'archived']);
const ASSIGNED_HOMEWORK_THERAPIST_INSERT_COLUMNS = new Set(['therapist_id', 'client_id', 'module_id', 'title', 'instructions', 'status', 'assigned_at', 'created_at', 'updated_at']);
const ASSIGNED_HOMEWORK_THERAPIST_UPDATE_COLUMNS = new Set(['therapist_feedback', 'reviewed_at', 'status', 'updated_at']);
const ASSIGNED_HOMEWORK_CLIENT_STATUSES = new Set(['assigned', 'in_progress', 'completed']);
const ASSIGNED_HOMEWORK_THERAPIST_STATUSES = new Set(['assigned', 'in_progress', 'completed', 'reviewed', 'archived']);

function assertOnlyColumns(values, allowed, message) {
  const keys = [...new Set(getValueRows(values).flatMap((row) => Object.keys(row || {})))];
  const blocked = keys.filter((key) => !allowed.has(key));
  if (blocked.length) {
    throw Object.assign(new Error(`${message}: ${blocked.join(', ')}`), { statusCode: 403 });
  }
}

function assertAllowedStatuses(values, allowed, label = 'status') {
  const statuses = getValueRows(values).map((row) => row?.status).filter(Boolean);
  const blocked = statuses.filter((status) => !allowed.has(status));
  if (blocked.length) {
    throw Object.assign(new Error(`Unsupported ${label}: ${blocked.join(', ')}`), { statusCode: 403 });
  }
}

function getFilterValues(filters, column) {
  const values = [];
  (filters || []).forEach((filter) => {
    if (filter.column !== column) return;
    if (filter.op === 'eq') values.push(filter.value);
    if (filter.op === 'in' && Array.isArray(filter.value)) values.push(...filter.value);
  });
  return [...new Set(values.filter(Boolean).map(String))];
}

function getValueRows(values) {
  if (!values) return [];
  return Array.isArray(values) ? values : [values];
}

async function hasActiveAssignment(therapistId, clientId) {
  const rows = await sql.query(`
    SELECT 1
    FROM ifs_therapist_clients
    WHERE therapist_id = $1
      AND client_id = $2
      AND COALESCE(status, 'active') = 'active'
    LIMIT 1
  `, [therapistId, clientId]);
  return rows.length > 0;
}

async function assertAssignedClients(appUser, clientIds) {
  const ids = [...new Set((clientIds || []).filter(Boolean).map(String))];
  if (!ids.length) throw Object.assign(new Error('A client_id filter or value is required for this operation'), { statusCode: 403 });
  for (const clientId of ids) {
    if (!(await hasActiveAssignment(appUser.id, clientId))) {
      throw Object.assign(new Error('Client is not assigned to this therapist'), { statusCode: 403 });
    }
  }
}

async function authorizePayload({ appUser, table, action, filters, values }) {
  if (!appUser || isAdminUser(appUser)) return;

  if (table === 'ifs_therapist_clients') {
    if (appUser.user_role === 'client') {
      if (action !== 'select') throw Object.assign(new Error('Clients cannot modify therapist assignments'), { statusCode: 403 });
      return;
    }
    if (!isTherapistUser(appUser)) throw Object.assign(new Error('Access denied'), { statusCode: 403 });
    const rows = getValueRows(values);
    if ((action === 'insert' || action === 'upsert') && rows.some((row) => String(row.therapist_id) !== String(appUser.id))) {
      throw Object.assign(new Error('Therapists may only manage their own assignments'), { statusCode: 403 });
    }
    return;
  }

  if (table === 'ifs_session_agendas') {
    const rows = getValueRows(values);
    const valueClientIds = rows.map((row) => row.client_id).filter(Boolean);
    const filterClientIds = getFilterValues(filters, 'client_id');
    const clientIds = valueClientIds.length ? valueClientIds : filterClientIds;

    if (appUser.user_role === 'client') {
      if (action === 'select') return;
      if (action === 'delete' || action === 'upsert') {
        throw Object.assign(new Error('Clients may only create, read, update, or archive their own session agendas'), { statusCode: 403 });
      }
      if (action === 'insert') {
        assertOnlyColumns(values, SESSION_AGENDA_CLIENT_INSERT_COLUMNS, 'Clients cannot set session agenda fields');
        assertAllowedStatuses(values, SESSION_AGENDA_CLIENT_STATUSES, 'session agenda status');
        const therapistIds = rows.map((row) => row.therapist_id).filter(Boolean);
        if (!clientIds.length || clientIds.some((id) => String(id) !== String(appUser.id))) {
          throw Object.assign(new Error('Clients may only create their own session agendas'), { statusCode: 403 });
        }
        if (!therapistIds.length) {
          throw Object.assign(new Error('therapist_id is required'), { statusCode: 403 });
        }
        for (const row of rows) {
          if (!(await hasActiveAssignment(row.therapist_id, row.client_id))) {
            throw Object.assign(new Error('Session agenda therapist must be actively assigned to the client'), { statusCode: 403 });
          }
        }
        return;
      }
      if (action === 'update') {
        assertOnlyColumns(values, SESSION_AGENDA_CLIENT_UPDATE_COLUMNS, 'Clients cannot update session agenda fields');
        assertAllowedStatuses(values, SESSION_AGENDA_CLIENT_STATUSES, 'session agenda status');
        if (clientIds.length && clientIds.some((id) => String(id) !== String(appUser.id))) {
          throw Object.assign(new Error('Clients may only access their own session agendas'), { statusCode: 403 });
        }
        return;
      }
    }

    if (isTherapistUser(appUser)) {
      if (action === 'select') {
        if (clientIds.length) await assertAssignedClients(appUser, clientIds);
        return;
      }
      if (action !== 'update') {
        throw Object.assign(new Error('Therapists may only read or review session agendas'), { statusCode: 403 });
      }
      assertOnlyColumns(values, SESSION_AGENDA_THERAPIST_UPDATE_COLUMNS, 'Therapists cannot update session agenda fields');
      assertAllowedStatuses(values, SESSION_AGENDA_THERAPIST_STATUSES, 'session agenda status');
      if (clientIds.length) await assertAssignedClients(appUser, clientIds);
      return;
    }
  }

  if (table === 'ifs_assigned_homework') {
    const rows = getValueRows(values);
    const valueClientIds = rows.map((row) => row.client_id).filter(Boolean);
    const filterClientIds = getFilterValues(filters, 'client_id');
    const clientIds = valueClientIds.length ? valueClientIds : filterClientIds;

    if (appUser.user_role === 'client') {
      if (action === 'select') return;
      if (action !== 'update') {
        throw Object.assign(new Error('Clients may only read or update their assigned homework progress'), { statusCode: 403 });
      }
      assertOnlyColumns(values, ASSIGNED_HOMEWORK_CLIENT_UPDATE_COLUMNS, 'Clients cannot update assigned homework fields');
      assertAllowedStatuses(values, ASSIGNED_HOMEWORK_CLIENT_STATUSES);
      if (clientIds.length && clientIds.some((id) => String(id) !== String(appUser.id))) {
        throw Object.assign(new Error('Clients may only access their own assigned homework'), { statusCode: 403 });
      }
      return;
    }

    if (isTherapistUser(appUser)) {
      if (action === 'delete') {
        throw Object.assign(new Error('Assigned homework should be archived instead of deleted'), { statusCode: 403 });
      }
      if (action === 'insert' || action === 'upsert') {
        assertOnlyColumns(values, ASSIGNED_HOMEWORK_THERAPIST_INSERT_COLUMNS, 'Therapists cannot set assigned homework fields');
        assertAllowedStatuses(values, ASSIGNED_HOMEWORK_THERAPIST_STATUSES);
        const therapistIds = rows.map((row) => row.therapist_id).filter(Boolean);
        if (!rows.length || rows.some((row) => String(row.therapist_id) !== String(appUser.id))) {
          throw Object.assign(new Error('Therapists may only create their own assigned homework'), { statusCode: 403 });
        }
        if (therapistIds.some((id) => String(id) !== String(appUser.id))) {
          throw Object.assign(new Error('Therapists may only create their own assigned homework'), { statusCode: 403 });
        }
        await assertAssignedClients(appUser, clientIds);
        return;
      }
      if (action === 'update') {
        assertOnlyColumns(values, ASSIGNED_HOMEWORK_THERAPIST_UPDATE_COLUMNS, 'Therapists cannot update assigned homework fields');
        assertAllowedStatuses(values, ASSIGNED_HOMEWORK_THERAPIST_STATUSES);
        if (clientIds.length) await assertAssignedClients(appUser, clientIds);
        return;
      }
      return;
    }
  }

  if (table === 'ifs_clients') {
    if (appUser.user_role === 'client') {
      if (action === 'insert') throw Object.assign(new Error('Clients cannot create client profiles'), { statusCode: 403 });
      return;
    }
    if (isTherapistUser(appUser)) {
      if (action === 'insert') return;
      const ids = getFilterValues(filters, 'id');
      const clientIds = ids.filter((id) => id !== String(appUser.id));
      if (clientIds.length) await assertAssignedClients(appUser, clientIds);
      return;
    }
  }

  if (CLIENT_SCOPED_TABLES.has(table)) {
    const valueClientIds = getValueRows(values).map((row) => row.client_id).filter(Boolean);
    const filterClientIds = getFilterValues(filters, 'client_id');
    const clientIds = valueClientIds.length ? valueClientIds : filterClientIds;
    if (appUser.user_role === 'client') {
      if ((action === 'insert' || action === 'upsert') && !clientIds.length) {
        throw Object.assign(new Error('client_id is required'), { statusCode: 403 });
      }
      if (clientIds.some((id) => String(id) !== String(appUser.id))) {
        throw Object.assign(new Error('Clients may only access their own rows'), { statusCode: 403 });
      }
      return;
    }
    if (isTherapistUser(appUser)) {
      if (action === 'insert' || action === 'upsert') await assertAssignedClients(appUser, clientIds);
      else if (clientIds.length) await assertAssignedClients(appUser, clientIds);
      return;
    }
  }
}

function buildAuthClause(table, appUser, params, action = 'select') {
  if (!appUser || isAdminUser(appUser)) return '';
  if (table === 'ifs_therapist_clients') {
    params.push(appUser.id);
    return appUser.user_role === 'client'
      ? `${quoteIdent('client_id')} = $${params.length}`
      : `${quoteIdent('therapist_id')} = $${params.length}`;
  }
  if (table === 'ifs_clients') {
    if (appUser.user_role === 'client') {
      params.push(appUser.id);
      return `${quoteIdent('id')} = $${params.length}`;
    }
    if (isTherapistUser(appUser)) {
      params.push(appUser.id, appUser.id);
      return `(${quoteIdent('id')} = $${params.length - 1} OR ${quoteIdent('id')} IN (SELECT client_id FROM ifs_therapist_clients WHERE therapist_id = $${params.length} AND COALESCE(status, 'active') = 'active'))`;
    }
  }
  if (CLIENT_SCOPED_TABLES.has(table)) {
    if (appUser.user_role === 'client') {
      params.push(appUser.id);
      const ownRows = `${quoteIdent('client_id')} = $${params.length}`;
      if (table === 'ifs_session_agendas' && action === 'update') {
        return `(${ownRows} AND COALESCE(${quoteIdent('status')}, 'submitted') IN ('draft', 'submitted'))`;
      }
      return ownRows;
    }
    if (isTherapistUser(appUser)) {
      params.push(appUser.id);
      return `${quoteIdent('client_id')} IN (SELECT client_id FROM ifs_therapist_clients WHERE therapist_id = $${params.length} AND COALESCE(status, 'active') = 'active')`;
    }
  }
  return '';
}

function appendAuthFilter(filters, authClause) {
  if (!authClause) return filters;
  return [...(filters || []), { raw: authClause }];
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  try {
    const appUser = await getCurrentAppUserFromClerk(req);
    const { table, action, columns = '*', filters = [], order = [], limit, values, onConflict, single, maybeSingle } = req.body || {};
    if (!TABLES.has(table)) throw new Error(`Unsupported table: ${table}`);
    await authorizePayload({ appUser, table, action, filters, values });

    const params = [];
    const scopedFilters = appendAuthFilter(filters, action === 'select' || action === 'update' || action === 'delete' ? buildAuthClause(table, appUser, params, action) : '');
    let query;

    if (action === 'select') {
      query = `SELECT ${normalizeColumns(columns)} FROM ${quoteIdent(table)}${buildWhere(scopedFilters, params)}${buildOrder(order)}${buildLimit(limit, single, maybeSingle)}`;
    } else if (action === 'insert') {
      query = buildInsert(table, values, params);
    } else if (action === 'update') {
      query = buildUpdate(table, values, scopedFilters, params);
    } else if (action === 'delete') {
      query = buildDelete(table, scopedFilters, params);
    } else if (action === 'upsert') {
      query = buildUpsert(table, values, onConflict, params);
    } else {
      throw new Error(`Unsupported action: ${action}`);
    }

    const rows = await sql.query(query, params);

    if (appUser && isTherapistUser(appUser) && table === 'ifs_clients' && action === 'insert') {
      for (const row of rows) {
        if (row?.id && row.user_role === 'client') {
          await sql.query(`
            INSERT INTO ifs_therapist_clients (therapist_id, client_id, status)
            VALUES ($1, $2, 'active')
            ON CONFLICT (therapist_id, client_id) DO UPDATE
            SET status = 'active', discharged_at = NULL, updated_at = CURRENT_TIMESTAMP
          `, [appUser.id, row.id]);
        }
      }
    }

    return res.status(200).json({ data: normalizeRows(rows, single, maybeSingle) });
  } catch (error) {
    const status = error.statusCode || 400;
    return res.status(status).json({ error: { message: error.message } });
  }
}
