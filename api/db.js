/* global process */
import { sql, isAdminUser, isTherapistUser, getCurrentAppUserFromClerk } from './_auth.js';
import { safeCreateInAppNotification } from './_notifications.js';

const TABLES = new Set([
  'ifs_clients',
  'ifs_assessment_results',
  'ifs_personalized_curriculum',
  'ifs_client_progress',
  'ifs_module_answers',
  'ifs_journal_entries',
  'ifs_parts',
  'ifs_part_relationships',
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
  'ifs_treatment_plans',
  'ifs_notifications',
  'ifs_life_integration_reflections'
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

const CLIENT_SCOPED_TABLES = new Set([
  'ifs_assessment_results',
  'ifs_personalized_curriculum',
  'ifs_client_progress',
  'ifs_module_answers',
  'ifs_journal_entries',
  'ifs_parts',
  'ifs_part_relationships',
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
  'ifs_treatment_plans',
  'ifs_life_integration_reflections'
]);


const SELF_OWNED_CLIENT_DATA_TABLES = new Set([
  'ifs_assessment_results',
  'ifs_interactive_data',
  'ifs_client_progress',
  'ifs_parts',
  'ifs_part_relationships',
  'ifs_journal_entries',
  'ifs_mood_entries',
  'ifs_life_integration_reflections',
  'ifs_assigned_homework',
  'ifs_session_agendas',
  'ifs_treatment_plans',
  'ifs_module_answers',
  'ifs_exercise_progress',
  'ifs_milestones',
  'ifs_parts_dialogue',
  'ifs_gamification',
  'ifs_client_preferences',
  'ifs_therapy_activity_progress',
  'ifs_uploads'
]);


const GENERATED_REPORT_INSERT_COLUMNS = new Set(['therapist_id', 'client_id', 'generated_by', 'report_type', 'title', 'sections_included', 'date_range_start', 'date_range_end', 'format', 'status', 'storage_url', 'file_name', 'generated_at', 'created_at', 'updated_at']);
const GENERATED_REPORT_UPDATE_COLUMNS = new Set(['status', 'updated_at']);
const GENERATED_REPORT_STATUSES = new Set(['generated', 'downloaded', 'archived', 'failed']);

const PART_RELATIONSHIP_INSERT_COLUMNS = new Set(['client_id', 'from_part_id', 'to_part_id', 'relationship_type', 'label', 'description', 'created_by', 'confirmed_by_client', 'created_at', 'updated_at']);
const PART_RELATIONSHIP_UPDATE_COLUMNS = new Set(['from_part_id', 'to_part_id', 'relationship_type', 'label', 'description', 'confirmed_by_client', 'updated_at']);
const PART_RELATIONSHIP_TYPES = new Set(['close_to', 'protects', 'concerned_about', 'polarized_with', 'supports', 'needs_space_from', 'unknown']);

const ASSIGNED_HOMEWORK_CLIENT_UPDATE_COLUMNS = new Set(['status', 'started_at', 'completed_at', 'updated_at']);
const TREATMENT_PLAN_THERAPIST_INSERT_COLUMNS = new Set(['therapist_id', 'client_id', 'goal_title', 'goal_description', 'target_wounds', 'target_parts', 'objectives', 'interventions', 'status', 'review_date', 'completed_at', 'created_at', 'updated_at']);
const TREATMENT_PLAN_THERAPIST_UPDATE_COLUMNS = new Set(['goal_title', 'goal_description', 'target_wounds', 'target_parts', 'objectives', 'interventions', 'status', 'review_date', 'completed_at', 'updated_at']);
const TREATMENT_PLAN_STATUSES = new Set(['active', 'paused', 'completed', 'archived']);
const THERAPIST_NOTE_INSERT_COLUMNS = new Set(['therapist_id', 'client_id', 'note_type', 'clinical_summary', 'content', 'session_date', 'tagged_parts', 'tagged_treatment_goals', 'created_at', 'updated_at']);
const THERAPIST_NOTE_UPDATE_COLUMNS = new Set(['note_type', 'clinical_summary', 'content', 'session_date', 'tagged_parts', 'tagged_treatment_goals', 'updated_at']);
const SESSION_AGENDA_CLIENT_INSERT_COLUMNS = new Set(['client_id', 'therapist_id', 'topics', 'active_parts', 'stuck_points', 'goals_for_session', 'current_stress_level', 'current_mood_label', 'safety_concerns', 'session_date', 'session_datetime', 'status', 'created_at', 'updated_at']);
const SESSION_AGENDA_CLIENT_UPDATE_COLUMNS = new Set(['topics', 'active_parts', 'stuck_points', 'goals_for_session', 'current_stress_level', 'current_mood_label', 'safety_concerns', 'session_date', 'session_datetime', 'status', 'updated_at']);
const SESSION_AGENDA_THERAPIST_UPDATE_COLUMNS = new Set(['therapist_notes', 'reviewed_at', 'status', 'updated_at']);
const SESSION_AGENDA_CLIENT_STATUSES = new Set(['draft', 'submitted', 'archived']);
const SESSION_AGENDA_THERAPIST_STATUSES = new Set(['reviewed', 'archived']);
const ASSIGNED_HOMEWORK_THERAPIST_INSERT_COLUMNS = new Set(['therapist_id', 'client_id', 'module_id', 'title', 'instructions', 'status', 'assigned_at', 'created_at', 'updated_at']);
const ASSIGNED_HOMEWORK_THERAPIST_UPDATE_COLUMNS = new Set(['therapist_feedback', 'reviewed_at', 'status', 'updated_at']);
const ASSIGNED_HOMEWORK_CLIENT_STATUSES = new Set(['assigned', 'in_progress', 'completed']);
const ASSIGNED_HOMEWORK_THERAPIST_STATUSES = new Set(['assigned', 'in_progress', 'completed', 'reviewed', 'archived']);
const NOTIFICATION_UPDATE_COLUMNS = new Set(['read_at', 'archived_at', 'updated_at']);

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


async function loadClientIdsFromRows(table, filters) {
  const ids = getFilterValues(filters, 'id');
  if (!ids.length) return [];
  const rows = await sql.query(`SELECT DISTINCT client_id FROM ${quoteIdent(table)} WHERE id::text = ANY($1::text[])`, [ids]);
  return rows.map((row) => row.client_id).filter(Boolean);
}

function isSelfOwnedClientData({ table, appUser, clientIds }) {
  if (!SELF_OWNED_CLIENT_DATA_TABLES.has(table) || !appUser?.id) return false;
  const ids = [...new Set((clientIds || []).filter(Boolean).map(String))];
  return ids.length > 0 && ids.every((requestedClientId) => requestedClientId === String(appUser.id));
}

async function getRequestedClientIds({ table, action, filters, values }) {
  const valueClientIds = getValueRows(values).map((row) => row.client_id).filter(Boolean);
  const filterClientIds = getFilterValues(filters, 'client_id');
  if (valueClientIds.length) return [...new Set(valueClientIds.map(String))];
  if (filterClientIds.length) return filterClientIds;
  if ((action === 'update' || action === 'delete') && CLIENT_SCOPED_TABLES.has(table)) {
    return loadClientIdsFromRows(table, filters);
  }
  return [];
}

async function authorizeSelfOwnedClientData({ appUser, table, action, filters, values, clientIds }) {
  if (!isSelfOwnedClientData({ table, appUser, clientIds })) return false;

  if (table === 'ifs_assigned_homework') {
    if (action === 'select') return true;
    if (action !== 'update') {
      throw Object.assign(new Error('Users may only read or update their own assigned homework progress'), { statusCode: 403 });
    }
    assertOnlyColumns(values, ASSIGNED_HOMEWORK_CLIENT_UPDATE_COLUMNS, 'Users cannot update assigned homework fields');
    assertAllowedStatuses(values, ASSIGNED_HOMEWORK_CLIENT_STATUSES);
    return true;
  }

  if (table === 'ifs_treatment_plans') {
    if (action !== 'select') throw Object.assign(new Error('Users cannot modify their client-safe treatment goals'), { statusCode: 403 });
    return true;
  }

  if (table === 'ifs_session_agendas') {
    const rows = getValueRows(values);
    if (action === 'select') return true;
    if (action === 'delete' || action === 'upsert') {
      throw Object.assign(new Error('Users may only create, read, update, or archive their own session agendas'), { statusCode: 403 });
    }
    if (action === 'insert') {
      assertOnlyColumns(values, SESSION_AGENDA_CLIENT_INSERT_COLUMNS, 'Users cannot set session agenda fields');
      assertAllowedStatuses(values, SESSION_AGENDA_CLIENT_STATUSES, 'session agenda status');
      if (rows.some((row) => !row.therapist_id || String(row.client_id) !== String(appUser.id))) {
        throw Object.assign(new Error('A valid self-owned session agenda client_id and therapist_id are required'), { statusCode: 403 });
      }
      for (const row of rows) {
        if (!(await hasActiveAssignment(row.therapist_id, row.client_id))) {
          throw Object.assign(new Error('Session agenda therapist must be actively assigned to the client'), { statusCode: 403 });
        }
      }
      return true;
    }
    if (action === 'update') {
      assertOnlyColumns(values, SESSION_AGENDA_CLIENT_UPDATE_COLUMNS, 'Users cannot update session agenda fields');
      assertAllowedStatuses(values, SESSION_AGENDA_CLIENT_STATUSES, 'session agenda status');
      return true;
    }
  }

  if (table === 'ifs_part_relationships') {
    const rows = getValueRows(values);
    if (action === 'select') return true;
    if ((action === 'insert' || action === 'upsert') && !clientIds.length) throw Object.assign(new Error('client_id is required'), { statusCode: 403 });
    if (action === 'insert' || action === 'upsert') {
      assertOnlyColumns(values, PART_RELATIONSHIP_INSERT_COLUMNS, 'Users cannot set relationship fields');
      await assertRelationshipPartsBelongToClient(rows);
    }
    if (action === 'update') {
      assertOnlyColumns(values, PART_RELATIONSHIP_UPDATE_COLUMNS, 'Users cannot update relationship fields');
      await assertRelationshipUpdatesBelongToExistingClient(filters, values);
    }
    return true;
  }

  if ((action === 'insert' || action === 'upsert') && !clientIds.length) {
    throw Object.assign(new Error('client_id is required'), { statusCode: 403 });
  }
  return true;
}

function extractTagIds(tags = []) {
  if (!Array.isArray(tags)) return [];
  return [...new Set(tags.map((tag) => tag?.id).filter(Boolean).map(String))];
}

async function assertTagsBelongToClients(clientIds, rows) {
  const ids = [...new Set((clientIds || []).filter(Boolean).map(String))];
  if (!ids.length) throw Object.assign(new Error('client_id is required for tagged notes'), { statusCode: 403 });

  const partIds = extractTagIds(rows.flatMap((row) => row?.tagged_parts || []));
  if (partIds.length) {
    const partRows = await sql.query('SELECT id, client_id FROM ifs_parts WHERE id = ANY($1::text[])', [partIds]);
    if (partRows.length !== partIds.length || partRows.some((row) => !ids.includes(String(row.client_id)))) {
      throw Object.assign(new Error('Tagged parts must belong to the selected assigned client'), { statusCode: 403 });
    }
  }

  const goalIds = extractTagIds(rows.flatMap((row) => row?.tagged_treatment_goals || []));
  if (goalIds.length) {
    const goalRows = await sql.query('SELECT id, client_id FROM ifs_treatment_plans WHERE id = ANY($1::uuid[])', [goalIds]);
    if (goalRows.length !== goalIds.length || goalRows.some((row) => !ids.includes(String(row.client_id)))) {
      throw Object.assign(new Error('Tagged treatment goals must belong to the selected assigned client'), { statusCode: 403 });
    }
  }
}


async function assertRelationshipPartsBelongToClient(rows) {
  for (const row of getValueRows(rows)) {
    const clientId = row.client_id;
    const fromPartId = row.from_part_id;
    const toPartId = row.to_part_id;
    if (!clientId || !fromPartId || !toPartId) {
      throw Object.assign(new Error('client_id, from_part_id, and to_part_id are required'), { statusCode: 403 });
    }
    if (String(fromPartId) === String(toPartId)) {
      throw Object.assign(new Error('Relationship must connect two different parts'), { statusCode: 400 });
    }
    const partRows = await sql.query('SELECT id, client_id FROM ifs_parts WHERE client_id = $1 AND id = ANY($2::text[])', [clientId, [fromPartId, toPartId].map(String)]);
    if (partRows.length !== 2) {
      throw Object.assign(new Error('Relationship parts must belong to the selected client'), { statusCode: 403 });
    }
    const type = row.relationship_type || 'unknown';
    if (!PART_RELATIONSHIP_TYPES.has(type)) {
      throw Object.assign(new Error('Unsupported relationship_type'), { statusCode: 400 });
    }
    if (row.description && String(row.description).length > 500) {
      throw Object.assign(new Error('Relationship description must be 500 characters or fewer'), { statusCode: 400 });
    }
  }
}

async function assertRelationshipUpdatesBelongToExistingClient(filters, values) {
  const ids = getFilterValues(filters, 'id');
  if (!ids.length) throw Object.assign(new Error('Relationship id filter is required'), { statusCode: 403 });
  const existing = await sql.query('SELECT id, client_id, from_part_id, to_part_id FROM ifs_part_relationships WHERE id = ANY($1::uuid[])', [ids]);
  if (existing.length !== ids.length) throw Object.assign(new Error('Relationship not found'), { statusCode: 404 });
  const rows = getValueRows(values);
  for (const row of rows) {
    if (row.relationship_type && !PART_RELATIONSHIP_TYPES.has(row.relationship_type)) {
      throw Object.assign(new Error('Unsupported relationship_type'), { statusCode: 400 });
    }
    if (row.description && String(row.description).length > 500) {
      throw Object.assign(new Error('Relationship description must be 500 characters or fewer'), { statusCode: 400 });
    }
  }
  const checks = existing.map((relationship) => ({
    client_id: relationship.client_id,
    from_part_id: rows[0]?.from_part_id || relationship.from_part_id,
    to_part_id: rows[0]?.to_part_id || relationship.to_part_id
  }));
  await assertRelationshipPartsBelongToClient(checks);
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
  if (!appUser) return;
  const requestedClientIds = await getRequestedClientIds({ table, action, filters, values });
  if (await authorizeSelfOwnedClientData({ appUser, table, action, filters, values, clientIds: requestedClientIds })) return;
  if (isAdminUser(appUser)) return;

  if (table === 'ifs_notifications') {
    if (action === 'delete') throw Object.assign(new Error('Notifications should be archived instead of deleted'), { statusCode: 403 });
    if (action === 'insert' || action === 'upsert') throw Object.assign(new Error('Use server workflow hooks to create notifications'), { statusCode: 403 });
    if (action === 'update') assertOnlyColumns(values, NOTIFICATION_UPDATE_COLUMNS, 'Users cannot update notification fields');
    return;
  }

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

  if (table === 'ifs_part_relationships') {
    const rows = getValueRows(values);
    const valueClientIds = rows.map((row) => row.client_id).filter(Boolean);
    const filterClientIds = getFilterValues(filters, 'client_id');
    const relationshipClientIds = action === 'update' || action === 'delete' ? await loadClientIdsFromRows(table, filters) : [];
    const clientIds = valueClientIds.length ? valueClientIds : relationshipClientIds.length ? relationshipClientIds : filterClientIds;

    if (appUser.user_role === 'client') {
      if (action === 'select') return;
      if ((action === 'insert' || action === 'upsert') && !clientIds.length) throw Object.assign(new Error('client_id is required'), { statusCode: 403 });
      if (clientIds.some((id) => String(id) !== String(appUser.id))) throw Object.assign(new Error('Clients may only manage their own part relationships'), { statusCode: 403 });
      if (action === 'insert' || action === 'upsert') {
        assertOnlyColumns(values, PART_RELATIONSHIP_INSERT_COLUMNS, 'Clients cannot set relationship fields');
        await assertRelationshipPartsBelongToClient(rows);
      }
      if (action === 'update') {
        assertOnlyColumns(values, PART_RELATIONSHIP_UPDATE_COLUMNS, 'Clients cannot update relationship fields');
        await assertRelationshipUpdatesBelongToExistingClient(filters, values);
      }
      return;
    }
    if (isTherapistUser(appUser)) {
      if (action !== 'select') throw Object.assign(new Error('Advisors can read assigned clients’ relationships; relationship changes require client confirmation'), { statusCode: 403 });
      if (clientIds.length) await assertAssignedClients(appUser, clientIds);
      return;
    }
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


  if (table === 'ifs_generated_reports') {
    const rows = getValueRows(values);
    const valueClientIds = rows.map((row) => row.client_id).filter(Boolean);
    const filterClientIds = getFilterValues(filters, 'client_id');
    const existingClientIds = action === 'update' ? await loadClientIdsFromRows(table, filters) : [];
    const clientIds = valueClientIds.length ? valueClientIds : (filterClientIds.length ? filterClientIds : existingClientIds);

    if (appUser.user_role === 'client') {
      throw Object.assign(new Error('Clients cannot access generated clinical report metadata'), { statusCode: 403 });
    }

    if (isTherapistUser(appUser)) {
      if (action === 'delete' || action === 'upsert') {
        throw Object.assign(new Error('Generated report metadata cannot be deleted or upserted'), { statusCode: 403 });
      }
      if (action === 'insert') {
        assertOnlyColumns(values, GENERATED_REPORT_INSERT_COLUMNS, 'Therapists cannot set generated report fields');
        assertAllowedStatuses(values, GENERATED_REPORT_STATUSES, 'generated report status');
        if (!rows.length || rows.some((row) => String(row.therapist_id) !== String(appUser.id) || String(row.generated_by || appUser.id) !== String(appUser.id))) {
          throw Object.assign(new Error('Therapists may only create their own generated report metadata'), { statusCode: 403 });
        }
        await assertAssignedClients(appUser, clientIds);
        return;
      }
      if (action === 'update') {
        assertOnlyColumns(values, GENERATED_REPORT_UPDATE_COLUMNS, 'Therapists cannot update generated report fields');
        assertAllowedStatuses(values, new Set(['archived']), 'generated report status');
        await assertAssignedClients(appUser, clientIds);
        return;
      }
      if (action === 'select') {
        if (clientIds.length) await assertAssignedClients(appUser, clientIds);
        return;
      }
    }
  }


  if (table === 'ifs_treatment_plans') {
    const rows = getValueRows(values);
    const valueClientIds = rows.map((row) => row.client_id).filter(Boolean);
    const filterClientIds = getFilterValues(filters, 'client_id');
    const existingClientIds = action === 'update' ? await loadClientIdsFromRows(table, filters) : [];
    const clientIds = valueClientIds.length ? valueClientIds : (filterClientIds.length ? filterClientIds : existingClientIds);

    if (appUser.user_role === 'client') {
      if (action !== 'select') throw Object.assign(new Error('Clients cannot modify treatment plans'), { statusCode: 403 });
      return;
    }

    if (isTherapistUser(appUser)) {
      if (action === 'delete' || action === 'upsert') throw Object.assign(new Error('Treatment plans should be archived instead of deleted'), { statusCode: 403 });
      if (action === 'insert') {
        assertOnlyColumns(values, TREATMENT_PLAN_THERAPIST_INSERT_COLUMNS, 'Therapists cannot set treatment plan fields');
        assertAllowedStatuses(values, TREATMENT_PLAN_STATUSES, 'treatment plan status');
        if (!rows.length || rows.some((row) => String(row.therapist_id) !== String(appUser.id))) {
          throw Object.assign(new Error('Therapists may only create their own treatment plans'), { statusCode: 403 });
        }
        await assertAssignedClients(appUser, clientIds);
        return;
      }
      if (action === 'update') {
        assertOnlyColumns(values, TREATMENT_PLAN_THERAPIST_UPDATE_COLUMNS, 'Therapists cannot update treatment plan fields');
        assertAllowedStatuses(values, TREATMENT_PLAN_STATUSES, 'treatment plan status');
        await assertAssignedClients(appUser, clientIds);
        return;
      }
      if (action === 'select') {
        if (clientIds.length) await assertAssignedClients(appUser, clientIds);
        return;
      }
    }
  }

  if (table === 'ifs_therapist_notes') {
    const rows = getValueRows(values);
    const valueClientIds = rows.map((row) => row.client_id).filter(Boolean);
    const filterClientIds = getFilterValues(filters, 'client_id');
    const existingClientIds = action === 'update' ? await loadClientIdsFromRows(table, filters) : [];
    const clientIds = valueClientIds.length ? valueClientIds : (filterClientIds.length ? filterClientIds : existingClientIds);

    if (appUser.user_role === 'client') throw Object.assign(new Error('Clients cannot access therapist clinical notes'), { statusCode: 403 });

    if (isTherapistUser(appUser)) {
      if (action === 'delete' || action === 'upsert') throw Object.assign(new Error('Therapist notes should be archived instead of deleted'), { statusCode: 403 });
      if (action === 'insert') {
        assertOnlyColumns(values, THERAPIST_NOTE_INSERT_COLUMNS, 'Therapists cannot set therapist note fields');
        if (!rows.length || rows.some((row) => String(row.therapist_id) !== String(appUser.id))) {
          throw Object.assign(new Error('Therapists may only create their own clinical notes'), { statusCode: 403 });
        }
        await assertAssignedClients(appUser, clientIds);
        await assertTagsBelongToClients(clientIds, rows);
        return;
      }
      if (action === 'update') {
        assertOnlyColumns(values, THERAPIST_NOTE_UPDATE_COLUMNS, 'Therapists cannot update therapist note fields');
        await assertAssignedClients(appUser, clientIds);
        await assertTagsBelongToClients(clientIds, rows);
        return;
      }
      if (action === 'select') {
        if (clientIds.length) await assertAssignedClients(appUser, clientIds);
        return;
      }
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

  if (table === 'ifs_notifications') {
    params.push(appUser.id);
    return `${quoteIdent('recipient_id')} = $${params.length}`;
  }

  if (table === 'ifs_treatment_plans') {
    if (appUser.user_role === 'client') {
      params.push(appUser.id);
      return `${quoteIdent('client_id')} = $${params.length} AND COALESCE(${quoteIdent('status')}, 'active') IN ('active', 'completed')`;
    }
    if (isTherapistUser(appUser)) {
      params.push(appUser.id, appUser.id, appUser.id);
      const selfOwned = `(${quoteIdent('client_id')} = $${params.length - 2} AND COALESCE(${quoteIdent('status')}, 'active') IN ('active', 'completed'))`;
      const assignedClient = `(${quoteIdent('therapist_id')} = $${params.length - 1} AND ${quoteIdent('client_id')} IN (SELECT client_id FROM ifs_therapist_clients WHERE therapist_id = $${params.length} AND COALESCE(status, 'active') = 'active'))`;
      return `(${selfOwned} OR ${assignedClient})`;
    }
  }
  if (table === 'ifs_therapist_notes') {
    if (appUser.user_role === 'client') return 'false';
    if (isTherapistUser(appUser)) {
      params.push(appUser.id, appUser.id);
      return `${quoteIdent('therapist_id')} = $${params.length - 1} AND ${quoteIdent('client_id')} IN (SELECT client_id FROM ifs_therapist_clients WHERE therapist_id = $${params.length} AND COALESCE(status, 'active') = 'active')`;
    }
  }
  if (table === 'ifs_generated_reports') {
    if (appUser.user_role === 'client') return 'false';
    if (isTherapistUser(appUser)) {
      params.push(appUser.id, appUser.id);
      return `${quoteIdent('therapist_id')} = $${params.length - 1} AND ${quoteIdent('client_id')} IN (SELECT client_id FROM ifs_therapist_clients WHERE therapist_id = $${params.length} AND COALESCE(status, 'active') = 'active')`;
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
      if (SELF_OWNED_CLIENT_DATA_TABLES.has(table)) {
        params.push(appUser.id, appUser.id);
        const selfOwnedClientData = `${quoteIdent('client_id')} = $${params.length - 1}`;
        const assignedClientData = `${quoteIdent('client_id')} IN (SELECT client_id FROM ifs_therapist_clients WHERE therapist_id = $${params.length} AND COALESCE(status, 'active') = 'active')`;
        if (table === 'ifs_session_agendas' && action === 'update') {
          return `((${selfOwnedClientData} AND COALESCE(${quoteIdent('status')}, 'submitted') IN ('draft', 'submitted')) OR ${assignedClientData})`;
        }
        return `(${selfOwnedClientData} OR ${assignedClientData})`;
      }
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


async function createWorkflowNotifications({ appUser, table, action, rows }) {
  if (!appUser || !rows?.length) return;

  for (const row of rows) {
    if (table === 'ifs_assigned_homework') {
      if (action === 'insert') {
        await safeCreateInAppNotification({
          recipientId: row.client_id,
          actorId: appUser.id,
          clientId: row.client_id,
          therapistId: row.therapist_id,
          notificationType: 'homework_assigned',
          title: 'New homework assigned',
          message: 'Your therapist assigned a new module for you to review.',
          entityType: 'assigned_homework',
          entityId: row.id,
          priority: 'normal',
          metadata: { moduleId: row.module_id }
        }, 'homework assigned notification');
      }
      if (action === 'update' && row.status === 'completed') {
        await safeCreateInAppNotification({
          recipientId: row.therapist_id,
          actorId: row.client_id,
          clientId: row.client_id,
          therapistId: row.therapist_id,
          notificationType: 'homework_completed',
          title: 'Homework completed',
          message: 'Your client completed assigned homework.',
          entityType: 'assigned_homework',
          entityId: row.id,
          priority: 'normal',
          metadata: { moduleId: row.module_id }
        }, 'homework completed notification');
      }
      if (action === 'update' && row.status === 'reviewed') {
        await safeCreateInAppNotification({
          recipientId: row.client_id,
          actorId: appUser.id,
          clientId: row.client_id,
          therapistId: row.therapist_id,
          notificationType: 'homework_reviewed',
          title: 'Homework reviewed',
          message: 'Your therapist reviewed your homework.',
          entityType: 'assigned_homework',
          entityId: row.id,
          priority: 'normal',
          metadata: { moduleId: row.module_id }
        }, 'homework reviewed notification');
      }
    }

    if (table === 'ifs_session_agendas') {
      if (action === 'insert' && row.status === 'submitted') {
        await safeCreateInAppNotification({
          recipientId: row.therapist_id,
          actorId: row.client_id,
          clientId: row.client_id,
          therapistId: row.therapist_id,
          notificationType: 'session_agenda_submitted',
          title: 'Pre-session check-in submitted',
          message: 'Your client submitted a check-in for the next session.',
          entityType: 'session_agenda',
          entityId: row.id,
          priority: 'normal'
        }, 'session agenda submitted notification');
      }
      if (action === 'update' && row.status === 'reviewed') {
        await safeCreateInAppNotification({
          recipientId: row.client_id,
          actorId: appUser.id,
          clientId: row.client_id,
          therapistId: row.therapist_id,
          notificationType: 'session_agenda_reviewed',
          title: 'Pre-session check-in reviewed',
          message: 'Your therapist reviewed your pre-session check-in.',
          entityType: 'session_agenda',
          entityId: row.id,
          priority: 'normal'
        }, 'session agenda reviewed notification');
      }
    }

    if (table === 'ifs_treatment_plans') {
      const completed = row.status === 'completed';
      if (action === 'insert' || action === 'update') {
        await safeCreateInAppNotification({
          recipientId: row.client_id,
          actorId: appUser.id,
          clientId: row.client_id,
          therapistId: row.therapist_id,
          notificationType: action === 'insert' ? 'treatment_goal_created' : completed ? 'treatment_goal_completed' : 'treatment_goal_updated',
          title: action === 'insert' ? 'Treatment goal added' : completed ? 'Treatment goal completed' : 'Treatment goal updated',
          message: action === 'insert' ? 'A therapy goal was added to your care plan.' : completed ? 'A therapy goal was marked complete in your care plan.' : 'A therapy goal was updated in your care plan.',
          entityType: 'treatment_plan',
          entityId: row.id,
          priority: completed ? 'important' : 'normal'
        }, 'treatment goal notification');
      }
    }

    if (table === 'ifs_generated_reports' && action === 'insert') {
      await safeCreateInAppNotification({
        recipientId: row.therapist_id,
        actorId: appUser.id,
        clientId: row.client_id,
        therapistId: row.therapist_id,
        notificationType: 'report_generated',
        title: 'Clinical report generated',
        message: 'A clinical report was generated and audit metadata was saved.',
        entityType: 'generated_report',
        entityId: row.id,
        priority: 'low',
        metadata: { reportType: row.report_type }
      }, 'report generated notification');
    }

    if (table === 'ifs_therapist_notes' && action === 'insert') {
      await safeCreateInAppNotification({
        recipientId: row.therapist_id,
        actorId: appUser.id,
        clientId: row.client_id,
        therapistId: row.therapist_id,
        notificationType: 'therapist_note_created',
        title: 'Therapist note saved',
        message: 'A therapist note was saved to the client record.',
        entityType: 'therapist_note',
        entityId: row.id,
        priority: 'low',
        metadata: { noteType: row.note_type }
      }, 'therapist note notification');
    }
  }
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

    await createWorkflowNotifications({ appUser, table, action, rows });

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
