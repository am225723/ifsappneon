import { getCurrentAppUserFromClerk, isTherapistUser, sql } from './_auth.js';

const WRITE_FIELDS = new Set([
  'practice_id',
  'title',
  'description',
  'category',
  'level',
  'duration_label',
  'practice_type',
  'audio_url',
  'cover_image_url',
  'uploadthing_audio_key',
  'uploadthing_image_key',
  'is_active',
  'sort_order'
]);

function send(res, status, payload) {
  res.status(status).json(payload);
}

function safeError(error, fallback = 'Meditation media request failed.') {
  const status = error.statusCode || error.status || 500;
  const message = status >= 500 ? fallback : (error.message || fallback);
  return { status, message };
}

function cleanString(value) {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed || null;
}

function normalizeRecord(input = {}, existing = {}) {
  const record = {};
  Object.entries(input || {}).forEach(([key, value]) => {
    if (!WRITE_FIELDS.has(key)) return;
    if (key === 'is_active') {
      record[key] = Boolean(value);
      return;
    }
    if (key === 'sort_order') {
      const number = Number.parseInt(value, 10);
      record[key] = Number.isFinite(number) ? number : 0;
      return;
    }
    record[key] = cleanString(value);
  });

  const title = record.title ?? existing.title;
  const practiceId = record.practice_id ?? existing.practice_id;
  if ('title' in record && !title) throw Object.assign(new Error('Title is required.'), { statusCode: 400 });
  if ('practice_id' in record && !practiceId) throw Object.assign(new Error('Practice selection is required.'), { statusCode: 400 });
  return record;
}

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    practice_id: row.practice_id,
    title: row.title,
    description: row.description,
    category: row.category,
    level: row.level,
    duration_label: row.duration_label,
    practice_type: row.practice_type,
    audio_url: row.audio_url,
    cover_image_url: row.cover_image_url,
    uploadthing_audio_key: row.uploadthing_audio_key,
    uploadthing_image_key: row.uploadthing_image_key,
    is_active: row.is_active,
    sort_order: row.sort_order,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function assertWriter(appUser) {
  if (!isTherapistUser(appUser)) {
    throw Object.assign(new Error('Advisor, supervisor, or admin access is required.'), { statusCode: 403 });
  }
}

async function listActive() {
  const rows = await sql`
    SELECT *
    FROM ifs_meditation_media
    WHERE is_active = TRUE
    ORDER BY sort_order ASC, created_at DESC
  `;
  return rows.map(mapRow);
}

async function listAllForAdmin(appUser) {
  assertWriter(appUser);
  const rows = await sql`
    SELECT *
    FROM ifs_meditation_media
    ORDER BY is_active DESC, sort_order ASC, created_at DESC
  `;
  return rows.map(mapRow);
}

async function createMedia(appUser, payload) {
  assertWriter(appUser);
  const record = normalizeRecord(payload);
  if (!record.practice_id) throw Object.assign(new Error('Practice selection is required.'), { statusCode: 400 });
  if (!record.title) throw Object.assign(new Error('Title is required.'), { statusCode: 400 });

  const rows = await sql`
    INSERT INTO ifs_meditation_media (
      practice_id, title, description, category, level, duration_label, practice_type,
      audio_url, cover_image_url, uploadthing_audio_key, uploadthing_image_key,
      is_active, sort_order, created_by, updated_at
    ) VALUES (
      ${record.practice_id}, ${record.title}, ${record.description}, ${record.category}, ${record.level}, ${record.duration_label}, ${record.practice_type},
      ${record.audio_url}, ${record.cover_image_url}, ${record.uploadthing_audio_key}, ${record.uploadthing_image_key},
      ${record.is_active ?? true}, ${record.sort_order ?? 0}, ${appUser.id}, NOW()
    )
    RETURNING *
  `;
  return mapRow(rows[0]);
}

async function updateMedia(appUser, id, payload) {
  assertWriter(appUser);
  const existingRows = await sql`SELECT * FROM ifs_meditation_media WHERE id = ${id} LIMIT 1`;
  if (!existingRows.length) throw Object.assign(new Error('Meditation media record not found.'), { statusCode: 404 });
  const record = normalizeRecord(payload, existingRows[0]);

  const rows = await sql`
    UPDATE ifs_meditation_media
    SET
      practice_id = COALESCE(${record.practice_id}, practice_id),
      title = COALESCE(${record.title}, title),
      description = ${Object.prototype.hasOwnProperty.call(record, 'description') ? record.description : existingRows[0].description},
      category = ${Object.prototype.hasOwnProperty.call(record, 'category') ? record.category : existingRows[0].category},
      level = ${Object.prototype.hasOwnProperty.call(record, 'level') ? record.level : existingRows[0].level},
      duration_label = ${Object.prototype.hasOwnProperty.call(record, 'duration_label') ? record.duration_label : existingRows[0].duration_label},
      practice_type = ${Object.prototype.hasOwnProperty.call(record, 'practice_type') ? record.practice_type : existingRows[0].practice_type},
      audio_url = ${Object.prototype.hasOwnProperty.call(record, 'audio_url') ? record.audio_url : existingRows[0].audio_url},
      cover_image_url = ${Object.prototype.hasOwnProperty.call(record, 'cover_image_url') ? record.cover_image_url : existingRows[0].cover_image_url},
      uploadthing_audio_key = ${Object.prototype.hasOwnProperty.call(record, 'uploadthing_audio_key') ? record.uploadthing_audio_key : existingRows[0].uploadthing_audio_key},
      uploadthing_image_key = ${Object.prototype.hasOwnProperty.call(record, 'uploadthing_image_key') ? record.uploadthing_image_key : existingRows[0].uploadthing_image_key},
      is_active = ${Object.prototype.hasOwnProperty.call(record, 'is_active') ? record.is_active : existingRows[0].is_active},
      sort_order = ${Object.prototype.hasOwnProperty.call(record, 'sort_order') ? record.sort_order : existingRows[0].sort_order},
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return mapRow(rows[0]);
}

async function archiveMedia(appUser, id) {
  return updateMedia(appUser, id, { is_active: false });
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed.' });

  try {
    const appUser = await getCurrentAppUserFromClerk(req);
    const { action, id, record, updates } = req.body || {};

    if (action === 'list_active') return send(res, 200, { data: await listActive() });
    if (action === 'list_all_for_admin') return send(res, 200, { data: await listAllForAdmin(appUser) });
    if (action === 'create') return send(res, 200, { data: await createMedia(appUser, record) });
    if (action === 'update') return send(res, 200, { data: await updateMedia(appUser, id, updates) });
    if (action === 'archive') return send(res, 200, { data: await archiveMedia(appUser, id) });

    return send(res, 400, { error: 'Unsupported meditation media action.' });
  } catch (error) {
    const { status, message } = safeError(error);
    return send(res, status, { error: message });
  }
}
