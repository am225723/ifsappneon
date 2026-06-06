import { getCurrentAppUserFromClerk, isAdminUser, isTherapistUser, requireTherapistAssignment, sql } from './_auth.js';
import { callOpenRouterChat } from './_aiProvider.js';
import { buildUnifiedGuidanceData } from './_unifiedGuidanceData.js';
import { buildUnifiedGuidanceMessages } from './_unifiedGuidancePrompt.js';
import { validateUnifiedGuidance } from './_unifiedGuidanceValidation.js';

function sendError(res, status, message, code = 'server_error') {
  return res.status(status).json({ error: { code, message } });
}

function clampRangeDays(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 30;
  return Math.min(parsed, 90);
}

function normalizeMode(value) {
  return ['client_next_step', 'advisor_snapshot', 'combined'].includes(value) ? value : 'client_next_step';
}

async function assertClientRecord(clientId) {
  const rows = await sql`SELECT id, user_role FROM ifs_clients WHERE id = ${clientId} LIMIT 1`;
  const client = rows[0];
  if (!client || client.user_role !== 'client') {
    throw Object.assign(new Error('Client not found'), { statusCode: 404, code: 'client_not_found' });
  }
  return client;
}

async function authorizeUnifiedGuidance(req, { clientId, mode }) {
  const currentUser = await getCurrentAppUserFromClerk(req);
  if (!currentUser?.id) throw Object.assign(new Error('Access denied'), { statusCode: 403, code: 'access_denied' });
  await assertClientRecord(clientId);

  if (mode === 'client_next_step') {
    if (String(currentUser.id) !== String(clientId)) {
      throw Object.assign(new Error('Clients may request only their own Next Best Step'), { statusCode: 403, code: 'client_scope_required' });
    }
    return { currentUser, role: 'client' };
  }

  if (!isTherapistUser(currentUser)) {
    throw Object.assign(new Error('Advisor access required'), { statusCode: 403, code: 'advisor_access_required' });
  }
  if (!isAdminUser(currentUser)) {
    await requireTherapistAssignment(currentUser.id, clientId);
  }
  return { currentUser, role: currentUser.user_role };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed', 'method_not_allowed');

  try {
    const body = req.body || {};
    const clientId = body.clientId || body.client_id;
    if (!clientId) return sendError(res, 400, 'clientId is required', 'missing_client_id');

    const mode = normalizeMode(body.mode);
    const includeInteractivePayload = body.includeInteractivePayload !== false;
    const rangeDays = clampRangeDays(body.rangeDays);
    const authContext = await authorizeUnifiedGuidance(req, { clientId, mode });
    const dataPayload = await buildUnifiedGuidanceData({ clientId, mode, rangeDays });
    const messages = buildUnifiedGuidanceMessages({ mode, clientId, rangeDays, dataPayload, includeInteractivePayload });
    const result = await callOpenRouterChat({ messages, temperature: 0.25, maxTokens: mode === 'client_next_step' ? 1100 : 2200 });
    const validated = validateUnifiedGuidance({ rawText: result.text, mode, clientId });

    return res.status(200).json({
      data: {
        ...validated,
        mode,
        generatedAt: new Date().toISOString(),
        rangeDays,
        provider: result.provider,
        model: result.model,
        dataSources: dataPayload.data_sources,
        authorization: {
          requestedByRole: authContext.role,
          advisorSnapshotIncluded: mode !== 'client_next_step',
          assignmentScoped: mode !== 'client_next_step' && !isAdminUser(authContext.currentUser)
        }
      },
      error: null
    });
  } catch (error) {
    const status = error.statusCode || 500;
    const code = error.code || (status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : 'server_error');
    return sendError(res, status, error.message || 'Unable to generate unified IFS guidance.', code);
  }
}
