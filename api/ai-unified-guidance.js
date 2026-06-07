import { getCurrentAppUserFromClerk, isAdminUser, isTherapistUser, requireTherapistAssignment, sql } from './_auth.js';
import { callOpenRouterChat } from './_aiProvider.js';
import { buildUnifiedGuidanceData } from './_unifiedGuidanceData.js';
import { buildUnifiedGuidanceMessages } from './_unifiedGuidancePrompt.js';
import { fallbackAdvisorSnapshot, fallbackNextBestStep, validateUnifiedGuidance } from './_unifiedGuidanceValidation.js';
import { applyDeterministicNextBestStep, determineNextBestStep } from './_nextBestStepLogic.js';

function sendError(res, status, message, code = 'server_error') {
  return res.status(status).json({ error: { code, message } });
}

function clampRangeDays(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 30;
  return Math.min(parsed, 90);
}

const VALID_GUIDANCE_MODES = new Set(['client_next_step', 'advisor_snapshot', 'combined']);

function normalizeMode(value) {
  const mode = value || 'client_next_step';
  if (!VALID_GUIDANCE_MODES.has(mode)) {
    throw Object.assign(new Error('Invalid unified guidance mode'), { statusCode: 400, code: 'invalid_mode' });
  }
  return mode;
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
    if (currentUser.user_role !== 'client') {
      throw Object.assign(new Error('Client Next Best Step requires a client workspace'), { statusCode: 403, code: 'client_mode_required' });
    }
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
    const deterministicNextBestStep = determineNextBestStep(dataPayload);
    const messages = buildUnifiedGuidanceMessages({ mode, clientId, rangeDays, dataPayload: { ...dataPayload, nextBestStep: deterministicNextBestStep }, includeInteractivePayload });
    let result = null;
    let validated;
    let providerWarning = null;
    try {
      result = await callOpenRouterChat({ messages, temperature: 0.25, maxTokens: mode === 'client_next_step' ? 1100 : 2200 });
      validated = validateUnifiedGuidance({ rawText: result.text, mode, clientId });
      if (validated.next_best_step) validated.next_best_step = applyDeterministicNextBestStep(validated.next_best_step, deterministicNextBestStep);
    } catch (providerError) {
      providerWarning = providerError?.code || 'provider_unavailable';
      validated = {
        next_best_step: mode !== 'advisor_snapshot' ? applyDeterministicNextBestStep(fallbackNextBestStep(), deterministicNextBestStep) : undefined,
        advisor_session_snapshot: mode !== 'client_next_step' ? fallbackAdvisorSnapshot(clientId, 'The generated snapshot could not be produced right now.') : undefined,
        validation_fallback: true
      };
    }

    return res.status(200).json({
      data: {
        ...validated,
        mode,
        generatedAt: new Date().toISOString(),
        rangeDays,
        provider: result?.provider || 'fallback',
        model: result?.model || null,
        validationWarnings: [providerWarning, validated.validation_fallback ? 'safe_fallback_used' : null].filter(Boolean),
        dataSources: dataPayload.data_sources,
        deterministicNextBestStep,
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
