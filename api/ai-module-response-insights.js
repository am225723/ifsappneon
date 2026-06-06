import { isAdminUser, requireTherapist, requireTherapistAssignment, sql } from './_auth.js';
import { callOpenRouterChat } from './_aiProvider.js';
import { cleanModuleResponses } from './_moduleResponseCleaning.js';

const DISCLAIMER = 'AI-generated preparation aid for Advisor review only. Not a diagnosis, risk assessment, or clinical conclusion.';

function sendError(res, status, message, code = 'server_error') {
  return res.status(status).json({ error: { code, message } });
}

function clampRangeDays(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 30;
  return Math.min(parsed, 180);
}

function truncateText(value, max = 700) {
  if (!value) return null;
  const text = String(value).replace(/\s+/g, ' ').trim();
  if (!text) return null;
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function parseDataPayload(value) {
  if (!value) return {};
  if (typeof value !== 'string') return value || {};
  try {
    return JSON.parse(value || '{}');
  } catch {
    return {};
  }
}

function mergeModuleResponseGroups(...groups) {
  return groups.reduce((acc, group = {}) => {
    Object.entries(group || {}).forEach(([moduleId, responses]) => {
      acc[moduleId] = [...(acc[moduleId] || []), ...(Array.isArray(responses) ? responses : [responses])];
    });
    return acc;
  }, {});
}

function sanitizeResponses(rows = []) {
  const grouped = {};
  rows.forEach((row) => {
    const moduleId = row.module_id || 'unknown_module';
    const data = parseDataPayload(row.data);
    const answers = data.answers || data.responses || data.reflections || data;
    if (!grouped[moduleId]) grouped[moduleId] = [];
    grouped[moduleId].push({ step_id: row.step_id || 'module', answers });
  });
  return cleanModuleResponses(grouped);
}

async function loadScopedData(clientId, since, moduleIds = []) {
  const moduleFilter = Array.isArray(moduleIds) && moduleIds.length ? moduleIds : null;
  const interactiveRows = moduleFilter
    ? await sql`
      SELECT module_id, data, updated_at
      FROM ifs_interactive_data
      WHERE client_id = ${clientId}
        AND module_id = ANY(${moduleFilter})
        AND COALESCE(updated_at, created_at) >= ${since}
      ORDER BY COALESCE(updated_at, created_at) DESC
      LIMIT 120
    `
    : await sql`
      SELECT module_id, data, updated_at
      FROM ifs_interactive_data
      WHERE client_id = ${clientId}
        AND module_id LIKE 'module-%'
        AND COALESCE(updated_at, created_at) >= ${since}
      ORDER BY COALESCE(updated_at, created_at) DESC
      LIMIT 120
    `;

  const progressRows = await sql`
    SELECT module_id, completed, current_step, responses, insights, updated_at
    FROM ifs_client_progress
    WHERE client_id = ${clientId}
      AND COALESCE(updated_at, created_at) >= ${since}
    ORDER BY COALESCE(updated_at, created_at) DESC
    LIMIT 80
  `;

  let reflectionRows = [];
  try {
    reflectionRows = await sql`
      SELECT module_id, prompt, response, created_at
      FROM ifs_curriculum_reflections
      WHERE client_id = ${clientId}
        AND created_at >= ${since}
      ORDER BY created_at DESC
      LIMIT 80
    `;
  } catch {
    reflectionRows = [];
  }

  const cleanedInteractive = sanitizeResponses(interactiveRows);
  const cleanedProgress = cleanModuleResponses(progressRows.reduce((acc, row) => {
    if (!row.responses && !row.insights) return acc;
    acc[row.module_id] = acc[row.module_id] || [];
    acc[row.module_id].push({ step_id: 'progress', answers: row.responses || { insights: row.insights } });
    return acc;
  }, {}));

  return {
    moduleResponses: mergeModuleResponseGroups(cleanedInteractive, cleanedProgress),
    curriculumProgress: progressRows.map((row) => ({ module_id: row.module_id, completed: row.completed, current_step: row.current_step })),
    curriculumReflections: (Array.isArray(reflectionRows) ? reflectionRows : []).map((row) => ({ module_id: row.module_id, prompt: truncateText(row.prompt, 160), response: truncateText(row.response, 500) }))
  };
}

function buildMessages({ client, currentUser, rangeDays, data }) {
  return [
    {
      role: 'system',
      content: [
        'You create Advisor-facing IFS preparation insights from cleaned module responses.',
        'Do not diagnose, do not assign risk scores, do not make safety conclusions, and do not write a treatment plan or final clinical note.',
        'Use cautious language. Distinguish observed client language from tentative patterns.',
        'For plain text sections, markdown-lite formatting is allowed: **bold labels**, bullets, numbered lists, and blank lines. Do not use raw HTML or markdown tables.',
        'Include the required disclaimer verbatim at the top. If data is sparse, say so and explain what not to over-interpret.'
      ].join(' ')
    },
    {
      role: 'user',
      content: JSON.stringify({
        task: 'Analyze cleaned module responses for Advisor preparation.',
        required_disclaimer: DISCLAIMER,
        required_sections: [
          '1. Common themes across module responses',
          '2. Parts/protector patterns that may be useful to explore',
          '3. Self-energy strengths or gaps',
          '4. Repeated triggers, needs, or boundaries',
          '5. Suggested session questions',
          '6. Possible flags for Advisor attention, phrased cautiously',
          '7. What not to over-interpret'
        ],
        context: { client_id: client.id, client_name: client.name || null, generated_for_role: currentUser.user_role, range_days: rangeDays },
        data
      }, null, 2)
    }
  ];
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed', 'method_not_allowed');
  try {
    const { clientId, client_id: legacyClientId, rangeDays: requestedRangeDays, moduleIds } = req.body || {};
    const requestedClientId = clientId || legacyClientId;
    if (!requestedClientId) return sendError(res, 400, 'clientId is required', 'missing_client_id');

    const currentUser = await requireTherapist(req);
    if (!isAdminUser(currentUser)) await requireTherapistAssignment(currentUser.id, requestedClientId);

    const clientRows = await sql`SELECT id, name, user_role FROM ifs_clients WHERE id = ${requestedClientId} LIMIT 1`;
    const client = clientRows[0];
    if (!client || client.user_role !== 'client') return sendError(res, 404, 'Client not found', 'client_not_found');

    const rangeDays = clampRangeDays(requestedRangeDays);
    const since = new Date(Date.now() - rangeDays * 86400000).toISOString();
    const data = await loadScopedData(client.id, since, moduleIds);
    const messages = buildMessages({ client, currentUser, rangeDays, data });
    const result = await callOpenRouterChat({ messages, temperature: 0.2, maxTokens: 1300 });

    return res.status(200).json({ data: { insights: result.text, disclaimer: DISCLAIMER, generatedAt: new Date().toISOString(), rangeDays, dataSources: { moduleResponseGroups: Object.keys(data.moduleResponses || {}).length, curriculumProgress: data.curriculumProgress.length, curriculumReflections: data.curriculumReflections.length }, provider: result.provider, model: result.model }, error: null });
  } catch (error) {
    const status = error.statusCode || 500;
    const code = error.code || (status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : 'server_error');
    return sendError(res, status, error.message || 'Unable to generate module response insights.', code);
  }
}
