import { isAdminUser, requireTherapist, requireTherapistAssignment, sql } from './_auth.js';

const ACTIONS = new Set(['list', 'create', 'toggle', 'archive']);
const PRIORITIES = new Set(['low', 'medium', 'high']);
const MAX_LIMIT = 200;

function sendError(res, status, message, code = 'tasks_error') {
  return res.status(status).json({ error: { code, message } });
}

function requireUuid(value, label) {
  if (!value || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(String(value))) {
    throw Object.assign(new Error(`${label} must be a valid UUID`), { statusCode: 400, code: 'invalid_uuid' });
  }
  return String(value);
}

function cleanText(value, maxLength) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function cleanDueDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw Object.assign(new Error('dueDate must be a valid date'), { statusCode: 400, code: 'invalid_due_date' });
  }
  return parsed.toISOString().slice(0, 10);
}

async function listTasks(user, body) {
  const filter = ['open', 'done', 'all'].includes(body.filter) ? body.filter : 'open';
  const limit = Math.min(Math.max(Number(body.limit) || 100, 1), MAX_LIMIT);

  return sql.query(`
    SELECT t.*, c.name AS client_name
    FROM ifs_advisor_tasks t
    LEFT JOIN ifs_clients c ON c.id = t.client_id
    WHERE t.therapist_id = $1
      AND t.archived_at IS NULL
      AND ($2::text = 'all' OR t.status = $2)
    ORDER BY (t.status = 'open') DESC, t.due_date ASC NULLS LAST, t.created_at DESC
    LIMIT $3
  `, [user.id, filter, limit]);
}

async function createTask(user, body) {
  const title = cleanText(body.title, 255);
  if (!title) throw Object.assign(new Error('A task title is required'), { statusCode: 400, code: 'title_required' });

  const clientId = body.clientId ? requireUuid(body.clientId, 'clientId') : null;
  if (clientId && !isAdminUser(user)) await requireTherapistAssignment(user.id, clientId);

  const category = cleanText(body.category, 100) || 'General';
  const priority = PRIORITIES.has(body.priority) ? body.priority : 'medium';
  const dueDate = cleanDueDate(body.dueDate);

  const rows = await sql`
    INSERT INTO ifs_advisor_tasks (therapist_id, client_id, title, category, priority, due_date)
    VALUES (${user.id}, ${clientId}, ${title}, ${category}, ${priority}, ${dueDate})
    RETURNING *
  `;
  return rows[0];
}

async function toggleTask(user, body) {
  const taskId = requireUuid(body.taskId, 'taskId');
  const rows = await sql`
    UPDATE ifs_advisor_tasks
    SET status = CASE WHEN status = 'open' THEN 'done' ELSE 'open' END, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${taskId}
      AND therapist_id = ${user.id}
    RETURNING *
  `;
  if (!rows[0]) throw Object.assign(new Error('Task not found'), { statusCode: 404, code: 'not_found' });
  return rows[0];
}

async function archiveTask(user, body) {
  const taskId = requireUuid(body.taskId, 'taskId');
  const rows = await sql`
    UPDATE ifs_advisor_tasks
    SET archived_at = COALESCE(archived_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP
    WHERE id = ${taskId}
      AND therapist_id = ${user.id}
    RETURNING *
  `;
  if (!rows[0]) throw Object.assign(new Error('Task not found'), { statusCode: 404, code: 'not_found' });
  return rows[0];
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendError(res, 405, 'Method not allowed', 'method_not_allowed');
  }

  try {
    const user = await requireTherapist(req);
    const body = req.body || {};
    const action = String(body.action || '');
    if (!ACTIONS.has(action)) return sendError(res, 400, 'Unsupported task action', 'unsupported_action');

    const handlers = {
      list: () => listTasks(user, body),
      create: () => createTask(user, body),
      toggle: () => toggleTask(user, body),
      archive: () => archiveTask(user, body),
    };

    const data = await handlers[action]();
    return res.status(200).json({ data });
  } catch (error) {
    return sendError(res, error.statusCode || 500, error.message || 'Task request failed', error.code || 'server_error');
  }
}
