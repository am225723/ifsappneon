import { requireClientAccess } from './_auth.js';
import { callOpenRouterChat } from './_aiProvider.js';

const PART_PROMPTS = {
  exile: 'You are supporting an IFS Parts Work reflection with a vulnerable inner child part. Be gentle, concise, and compassionate. Encourage curiosity and Self-energy. Do not diagnose, provide medical advice, infer risk, or claim safety.',
  manager: 'You are supporting an IFS Parts Work reflection with a manager/protector part. Be organized, protective, and compassionate. Encourage curiosity and Self-energy. Do not diagnose, provide medical advice, infer risk, or claim safety.',
  firefighter: 'You are supporting an IFS Parts Work reflection with a firefighter/protector part. Be direct, protective, and compassionate. Encourage unblending and Self-energy. Do not diagnose, provide medical advice, infer risk, or claim safety.',
  self: 'You are supporting an IFS reflection from Self-energy: compassionate, curious, calm, confident, courageous, creative, clear, and connected. Do not diagnose, provide medical advice, infer risk, or claim safety.'
};

function sendError(res, status, message, code = 'server_error') {
  return res.status(status).json({ error: { code, message } });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed', 'method_not_allowed');

  try {
    const { clientId, partId, message, conversationHistory = [] } = req.body || {};
    if (!clientId) return sendError(res, 400, 'clientId is required', 'missing_client_id');
    if (!message?.trim()) return sendError(res, 400, 'message is required', 'missing_message');
    await requireClientAccess(req, clientId);

    const safeHistory = Array.isArray(conversationHistory)
      ? conversationHistory.slice(-10).map((entry) => ({
        role: entry.role === 'assistant' ? 'assistant' : 'user',
        content: String(entry.content || '').slice(0, 1000)
      })).filter((entry) => entry.content)
      : [];

    const messages = [
      { role: 'system', content: PART_PROMPTS[partId] || PART_PROMPTS.self },
      ...safeHistory,
      { role: 'user', content: String(message).slice(0, 1000) }
    ];

    const result = await callOpenRouterChat({
      messages,
      temperature: 0.8,
      maxTokens: 350
    });

    return res.status(200).json({ data: { text: result.text, provider: result.provider, model: result.model }, error: null });
  } catch (error) {
    const status = error.statusCode || 500;
    const code = error.code || (status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : 'server_error');
    return sendError(res, status, error.message || 'Unable to generate Parts Work guidance.', code);
  }
}
