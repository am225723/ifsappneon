import { getCurrentAppUserFromClerk, sql } from './_auth.js';

const LEGACY_MODULE_ID = 'parts_map';
const SAFE_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,99}$/;
const MAX_TEXT = 2000;

function sendMethodNotAllowed(res) {
  res.setHeader('Allow', 'POST');
  return res.status(405).json({ error: { message: 'Method not allowed' } });
}

function sanitizeText(value, limit = MAX_TEXT) {
  const text = value === undefined || value === null ? '' : String(value).trim();
  return text ? text.slice(0, limit) : null;
}

function normalizeName(value) {
  return sanitizeText(value, 255);
}

function slugify(value) {
  const slug = String(value || 'part')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return slug || 'part';
}

function safeNumber(value, fallback = null) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function safeTimestamp(value, fallback) {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function isSafeLegacyId(value) {
  return typeof value === 'string' && SAFE_ID_PATTERN.test(value.trim());
}

function normalizeJson(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return null; }
  }
  return null;
}

function getLegacyParts(row) {
  const data = normalizeJson(row?.data);
  return Array.isArray(data?.parts) ? data.parts : [];
}

function normalizeExistingName(value) {
  return String(value || '').trim().toLowerCase();
}

function createStableId(part, index, usedIds) {
  const rawId = typeof part?.id === 'string' ? part.id.trim() : '';
  let base = isSafeLegacyId(rawId) ? rawId : `legacy-${index + 1}-${slugify(part?.name || part?.part_name || 'part')}`;
  if (base.length > 100) base = base.slice(0, 100);
  let candidate = base;
  let counter = 2;
  while (usedIds.has(candidate)) {
    const suffix = `-${counter}`;
    candidate = `${base.slice(0, 100 - suffix.length)}${suffix}`;
    counter += 1;
  }
  usedIds.add(candidate);
  return { id: candidate, usedFallback: candidate !== rawId };
}

async function authorizeOwnProfile(req, requestedClientId) {
  const appUser = await getCurrentAppUserFromClerk(req);
  if (!requestedClientId) throw Object.assign(new Error('clientId is required'), { statusCode: 400 });
  if (!appUser?.id || String(appUser.id) !== String(requestedClientId)) {
    throw Object.assign(new Error('You can import only your own Inner System Map.'), { statusCode: 403 });
  }
  return appUser;
}

async function loadRows(clientId) {
  const [legacyRows, existingParts] = await Promise.all([
    sql.query(
      `SELECT id, client_id, module_id, data, created_at, updated_at
       FROM ifs_interactive_data
       WHERE client_id = $1 AND module_id = $2
       ORDER BY updated_at DESC
       LIMIT 1`,
      [clientId, LEGACY_MODULE_ID]
    ),
    sql.query(
      `SELECT id, client_id, name, part_name, type, part_type, role, description, x, y, size, color, notes, updated_at
       FROM ifs_parts
       WHERE client_id = $1`,
      [clientId]
    )
  ]);
  return { legacyRow: legacyRows[0] || null, existingParts };
}

function buildPreview({ legacyRow, existingParts = [] }) {
  const existingIds = new Set(existingParts.map((part) => String(part.id)));
  const existingNames = new Set(existingParts.map((part) => normalizeExistingName(part.part_name || part.name)).filter(Boolean));
  const usedPreviewIds = new Set(existingIds);
  const legacyParts = getLegacyParts(legacyRow);
  const importable = [];
  const skipped = [];

  legacyParts.forEach((part, index) => {
    const legacyId = part?.id === undefined || part?.id === null ? null : String(part.id);
    const name = normalizeName(part?.name || part?.part_name);
    if (!name) {
      skipped.push({ legacyId, name: '', reason: 'missing_name', message: 'Missing or invalid part name' });
      return;
    }

    const { id, usedFallback } = createStableId(part, index, usedPreviewIds);
    const normalizedName = normalizeExistingName(name);
    if (legacyId && isSafeLegacyId(legacyId) && existingIds.has(legacyId)) {
      skipped.push({ legacyId, id, name, reason: 'duplicate_id', message: 'A current part already uses this legacy id' });
      return;
    }
    if (existingNames.has(normalizedName)) {
      skipped.push({ legacyId, id, name, reason: 'duplicate_name', message: 'A current part already uses this part name' });
      return;
    }

    importable.push({
      legacyId,
      id,
      name,
      type: sanitizeText(part?.type || part?.part_type, 50),
      role: sanitizeText(part?.role, MAX_TEXT),
      notes: sanitizeText(part?.notes || part?.description, MAX_TEXT),
      x: safeNumber(part?.x),
      y: safeNumber(part?.y),
      size: safeNumber(part?.size),
      color: sanitizeText(part?.color, 50),
      usedFallbackId: usedFallback
    });
  });

  const onlySelf = legacyParts.length === 1 && normalizeExistingName(legacyParts[0]?.name || legacyParts[0]?.part_name) === 'self';
  return {
    legacyFound: Boolean(legacyRow),
    legacyPartCount: legacyParts.length,
    persistentPartCount: existingParts.length,
    onlySelf,
    importable,
    skipped,
    legacyPreserved: true
  };
}

function buildInsertRow(clientId, item, sourcePart) {
  const now = new Date().toISOString();
  const createdAt = safeTimestamp(sourcePart?.createdAt || sourcePart?.created_at, now);
  const type = sanitizeText(sourcePart?.type || sourcePart?.part_type || item.type, 50);
  const notes = sanitizeText(sourcePart?.notes || sourcePart?.description || item.notes, MAX_TEXT);
  return {
    client_id: clientId,
    id: String(item.id),
    name: item.name,
    part_name: item.name,
    type,
    part_type: type,
    role: sanitizeText(sourcePart?.role || item.role, MAX_TEXT),
    description: notes,
    notes,
    x: safeNumber(sourcePart?.x),
    y: safeNumber(sourcePart?.y),
    size: safeNumber(sourcePart?.size, 60),
    color: sanitizeText(sourcePart?.color, 50),
    is_active: true,
    created_at: createdAt,
    updated_at: now
  };
}

async function importSelected({ clientId, selectedPartIds = [], overwrite = false }) {
  if (overwrite) throw Object.assign(new Error('Overwrite import is not supported in this phase.'), { statusCode: 400 });
  if (!Array.isArray(selectedPartIds) || selectedPartIds.length === 0) {
    throw Object.assign(new Error('Choose at least one part to import.'), { statusCode: 400 });
  }

  const { legacyRow, existingParts } = await loadRows(clientId);
  const preview = buildPreview({ legacyRow, existingParts });
  const selected = new Set(selectedPartIds.map(String));
  const legacyParts = getLegacyParts(legacyRow);
  const sourceByLegacyId = new Map(legacyParts.map((part) => [String(part?.id ?? ''), part]));
  const sourceByName = new Map(legacyParts.map((part) => [normalizeExistingName(part?.name || part?.part_name), part]));
  const imported = [];
  const skipped = [...preview.skipped];
  const errors = [];

  for (const item of preview.importable) {
    if (!selected.has(String(item.id)) && !selected.has(String(item.legacyId))) {
      skipped.push({ legacyId: item.legacyId, id: item.id, name: item.name, reason: 'not_selected', message: 'Not selected for this import' });
      continue;
    }

    const sourcePart = sourceByLegacyId.get(String(item.legacyId ?? '')) || sourceByName.get(normalizeExistingName(item.name)) || {};
    const row = buildInsertRow(clientId, item, sourcePart);
    try {
      const inserted = await sql.query(
        `INSERT INTO ifs_parts
          (client_id, id, name, part_name, type, part_type, role, description, notes, x, y, size, color, is_active, created_at, updated_at)
         VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         ON CONFLICT DO NOTHING
         RETURNING id, client_id, name, part_name, type, part_type, role, description, notes, x, y, size, color, is_active, created_at, updated_at`,
        [row.client_id, row.id, row.name, row.part_name, row.type, row.part_type, row.role, row.description, row.notes, row.x, row.y, row.size, row.color, row.is_active, row.created_at, row.updated_at]
      );

      if (inserted.length) imported.push(inserted[0]);
      else skipped.push({ legacyId: item.legacyId, id: item.id, name: item.name, reason: 'duplicate_during_import', message: 'A matching current part appeared before import finished' });
    } catch (error) {
      errors.push({ legacyId: item.legacyId, id: item.id, name: item.name, message: error.message });
    }
  }

  return { imported, skipped, errors, legacyPreserved: true };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendMethodNotAllowed(res);

  try {
    const { action, clientId, selectedPartIds, overwrite = false } = req.body || {};
    await authorizeOwnProfile(req, clientId);

    if (action === 'preview_legacy_parts_map') {
      const rows = await loadRows(clientId);
      return res.status(200).json({ data: buildPreview(rows) });
    }

    if (action === 'import_legacy_parts_map') {
      const result = await importSelected({ clientId, selectedPartIds, overwrite });
      return res.status(200).json({ data: result });
    }

    return res.status(400).json({ error: { message: 'Unsupported parts import action' } });
  } catch (error) {
    const status = error.statusCode || 400;
    return res.status(status).json({
      error: { message: error.message },
      data: { imported: [], skipped: [], errors: [{ message: error.message }], legacyPreserved: true }
    });
  }
}
