import { sql, getCurrentAppUserFromClerk, isTherapistUser } from './_auth.js';

const REFLECTION_TYPES = new Set([
  'notice_part',
  'return_to_self',
  'trigger_reflection',
  'repair_after_conflict',
  'protector_check_in',
  'needs_boundaries'
]);

const WRITABLE_FIELDS = new Set([
  'reflection_type',
  'title',
  'situation',
  'part_noticed',
  'part_id',
  'body_sensation',
  'emotion_words',
  'need_words',
  'self_energy_quality',
  'next_step',
  'shared_with_advisor'
]);

function toArray(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean);
  return [];
}

function cleanString(value) {
  if (typeof value !== 'string') return value ?? null;
  const trimmed = value.trim();
  return trimmed || null;
}

function pickPayload(payload = {}, appUser) {
  const blocked = Object.keys(payload).filter((key) => !WRITABLE_FIELDS.has(key));
  if (blocked.length) {
    throw Object.assign(new Error(`Unsupported reflection fields: ${blocked.join(', ')}`), { statusCode: 403 });
  }

  const reflectionType = payload.reflection_type;
  if (!REFLECTION_TYPES.has(reflectionType)) {
    throw Object.assign(new Error('Unsupported Life Integration reflection type'), { statusCode: 400 });
  }

  return {
    client_id: appUser.id,
    reflection_type: reflectionType,
    title: cleanString(payload.title),
    situation: cleanString(payload.situation),
    part_noticed: cleanString(payload.part_noticed),
    part_id: cleanString(payload.part_id),
    body_sensation: cleanString(payload.body_sensation),
    emotion_words: toArray(payload.emotion_words),
    need_words: toArray(payload.need_words),
    self_energy_quality: cleanString(payload.self_energy_quality),
    next_step: cleanString(payload.next_step),
    is_private: true,
    shared_with_advisor: payload.shared_with_advisor === true
  };
}

function pickUpdates(updates = {}) {
  const allowedUpdateFields = new Set([...WRITABLE_FIELDS].filter((field) => field !== 'reflection_type'));
  const blocked = Object.keys(updates).filter((key) => !allowedUpdateFields.has(key));
  if (blocked.length) {
    throw Object.assign(new Error(`Unsupported reflection fields: ${blocked.join(', ')}`), { statusCode: 403 });
  }

  const normalized = {};
  for (const [key, value] of Object.entries(updates)) {
    if (key === 'emotion_words' || key === 'need_words') {
      normalized[key] = toArray(value);
    } else if (key === 'shared_with_advisor') {
      normalized.shared_with_advisor = value === true;
    } else {
      normalized[key] = cleanString(value);
    }
  }
  return normalized;
}

async function assertPartBelongsToClient(partId, clientId) {
  if (!partId) return;
  const rows = await sql`
    SELECT 1
    FROM ifs_parts
    WHERE id = ${partId}
      AND client_id = ${clientId}
    LIMIT 1
  `;
  if (!rows.length) {
    throw Object.assign(new Error('Linked part must belong to the current client'), { statusCode: 403 });
  }
}

async function assertAdvisorAssignment(advisorId, clientId) {
  const rows = await sql`
    SELECT 1
    FROM ifs_therapist_clients
    WHERE therapist_id = ${advisorId}
      AND client_id = ${clientId}
      AND COALESCE(status, 'active') = 'active'
    LIMIT 1
  `;
  if (!rows.length) {
    throw Object.assign(new Error('Client is not assigned to this Advisor'), { statusCode: 403 });
  }
}

async function loadReflectionForClient(id, clientId) {
  const rows = await sql`
    SELECT r.*, p.part_name AS linked_part_name, p.name AS linked_part_alias, p.part_type AS linked_part_type
    FROM ifs_life_integration_reflections r
    LEFT JOIN ifs_parts p ON p.id = r.part_id
    WHERE r.id = ${id}
      AND r.client_id = ${clientId}
    LIMIT 1
  `;
  return rows[0] || null;
}

async function handleList(appUser, body) {
  const type = body.type;
  const includeArchived = body.includeArchived === true;

  if (type && !REFLECTION_TYPES.has(type)) {
    throw Object.assign(new Error('Unsupported Life Integration reflection type'), { statusCode: 400 });
  }

  if (appUser.user_role === 'client') {
    return sql.query(`
      SELECT r.*, p.part_name AS linked_part_name, p.name AS linked_part_alias, p.part_type AS linked_part_type
      FROM ifs_life_integration_reflections r
      LEFT JOIN ifs_parts p ON p.id = r.part_id
      WHERE r.client_id = $1
        AND ($2::text IS NULL OR r.reflection_type = $2)
        AND ($3::boolean IS TRUE OR r.archived_at IS NULL)
      ORDER BY r.created_at DESC
      LIMIT 50
    `, [appUser.id, type || null, includeArchived]);
  }

  if (isTherapistUser(appUser)) {
    const clientId = body.client_id;
    if (!clientId) throw Object.assign(new Error('client_id is required for Advisor access'), { statusCode: 403 });
    await assertAdvisorAssignment(appUser.id, clientId);
    return sql.query(`
      SELECT r.*, p.part_name AS linked_part_name, p.name AS linked_part_alias, p.part_type AS linked_part_type
      FROM ifs_life_integration_reflections r
      LEFT JOIN ifs_parts p ON p.id = r.part_id
      WHERE r.client_id = $1
        AND r.shared_with_advisor IS TRUE
        AND ($2::text IS NULL OR r.reflection_type = $2)
        AND ($3::boolean IS TRUE OR r.archived_at IS NULL)
      ORDER BY r.created_at DESC
      LIMIT 50
    `, [clientId, type || null, includeArchived]);
  }

  return [];
}

async function handleGet(appUser, body) {
  if (!body.id) throw Object.assign(new Error('Reflection id is required'), { statusCode: 400 });

  if (appUser.user_role === 'client') {
    const row = await loadReflectionForClient(body.id, appUser.id);
    if (!row) throw Object.assign(new Error('Reflection not found'), { statusCode: 404 });
    return row;
  }

  if (isTherapistUser(appUser)) {
    const rows = await sql`
      SELECT r.*, p.part_name AS linked_part_name, p.name AS linked_part_alias, p.part_type AS linked_part_type
      FROM ifs_life_integration_reflections r
      LEFT JOIN ifs_parts p ON p.id = r.part_id
      WHERE r.id = ${body.id}
        AND r.shared_with_advisor IS TRUE
      LIMIT 1
    `;
    const row = rows[0] || null;
    if (!row) throw Object.assign(new Error('Reflection not found'), { statusCode: 404 });
    await assertAdvisorAssignment(appUser.id, row.client_id);
    return row;
  }

  throw Object.assign(new Error('Access denied'), { statusCode: 403 });
}

async function handleCreate(appUser, body) {
  if (appUser.user_role !== 'client') {
    throw Object.assign(new Error('Only clients can create Life Integration reflections'), { statusCode: 403 });
  }
  const payload = pickPayload(body.payload || {}, appUser);
  await assertPartBelongsToClient(payload.part_id, payload.client_id);

  const rows = await sql`
    INSERT INTO ifs_life_integration_reflections (
      client_id, reflection_type, title, situation, part_noticed, part_id,
      body_sensation, emotion_words, need_words, self_energy_quality,
      next_step, is_private, shared_with_advisor
    ) VALUES (
      ${payload.client_id}, ${payload.reflection_type}, ${payload.title}, ${payload.situation},
      ${payload.part_noticed}, ${payload.part_id}, ${payload.body_sensation}, ${JSON.stringify(payload.emotion_words)}::jsonb,
      ${JSON.stringify(payload.need_words)}::jsonb, ${payload.self_energy_quality}, ${payload.next_step},
      ${payload.is_private}, ${payload.shared_with_advisor}
    )
    RETURNING *
  `;
  return rows[0];
}

async function handleUpdate(appUser, body) {
  if (appUser.user_role !== 'client') {
    throw Object.assign(new Error('Only clients can update Life Integration reflections'), { statusCode: 403 });
  }
  if (!body.id) throw Object.assign(new Error('Reflection id is required'), { statusCode: 400 });
  const updates = pickUpdates(body.updates || {});
  if (!Object.keys(updates).length) throw Object.assign(new Error('No updates provided'), { statusCode: 400 });
  await assertPartBelongsToClient(updates.part_id, appUser.id);

  const existing = await loadReflectionForClient(body.id, appUser.id);
  if (!existing) throw Object.assign(new Error('Reflection not found'), { statusCode: 404 });

  const merged = { ...existing, ...updates };
  const rows = await sql`
    UPDATE ifs_life_integration_reflections
    SET reflection_type = ${merged.reflection_type},
        title = ${merged.title},
        situation = ${merged.situation},
        part_noticed = ${merged.part_noticed},
        part_id = ${merged.part_id},
        body_sensation = ${merged.body_sensation},
        emotion_words = ${JSON.stringify(merged.emotion_words || [])}::jsonb,
        need_words = ${JSON.stringify(merged.need_words || [])}::jsonb,
        self_energy_quality = ${merged.self_energy_quality},
        next_step = ${merged.next_step},
        shared_with_advisor = ${merged.shared_with_advisor === true},
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${body.id}
      AND client_id = ${appUser.id}
    RETURNING *
  `;
  return rows[0];
}

async function handleDelete(appUser, body) {
  if (appUser.user_role !== 'client') {
    throw Object.assign(new Error('Only clients can archive Life Integration reflections'), { statusCode: 403 });
  }
  if (!body.id) throw Object.assign(new Error('Reflection id is required'), { statusCode: 400 });
  const rows = await sql`
    UPDATE ifs_life_integration_reflections
    SET archived_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${body.id}
      AND client_id = ${appUser.id}
    RETURNING *
  `;
  if (!rows.length) throw Object.assign(new Error('Reflection not found'), { statusCode: 404 });
  return rows[0];
}

async function handleShare(appUser, body, shared) {
  if (appUser.user_role !== 'client') {
    throw Object.assign(new Error('Only clients can change Advisor sharing'), { statusCode: 403 });
  }
  if (!body.id) throw Object.assign(new Error('Reflection id is required'), { statusCode: 400 });
  const rows = await sql`
    UPDATE ifs_life_integration_reflections
    SET shared_with_advisor = ${shared},
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${body.id}
      AND client_id = ${appUser.id}
    RETURNING *
  `;
  if (!rows.length) throw Object.assign(new Error('Reflection not found'), { statusCode: 404 });
  return rows[0];
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const appUser = await getCurrentAppUserFromClerk(req);
    const body = req.body || {};
    let data;

    if (body.action === 'list') data = await handleList(appUser, body);
    else if (body.action === 'get') data = await handleGet(appUser, body);
    else if (body.action === 'create') data = await handleCreate(appUser, body);
    else if (body.action === 'update') data = await handleUpdate(appUser, body);
    else if (body.action === 'archive' || body.action === 'delete') data = await handleDelete(appUser, body);
    else if (body.action === 'share_with_advisor') data = await handleShare(appUser, body, true);
    else if (body.action === 'unshare_with_advisor') data = await handleShare(appUser, body, false);
    else throw Object.assign(new Error('Unsupported Life Integration action'), { statusCode: 400 });

    return res.status(200).json({ data });
  } catch (error) {
    const status = error.statusCode || 400;
    return res.status(status).json({ error: error.message });
  }
}
