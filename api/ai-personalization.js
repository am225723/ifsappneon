import { getCurrentAppUserFromClerk } from './_auth.js';
import { callOpenRouterChat } from './_aiProvider.js';

function sendError(res, status, message, code = 'server_error') {
  return res.status(status).json({ error: { code, message } });
}

function validateWoundProfile(profile) {
  if (!profile?.primaryWound?.name) {
    throw Object.assign(new Error('primaryWound is required'), { statusCode: 400, code: 'missing_primary_wound' });
  }
  return profile;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed', 'method_not_allowed');

  try {
    await getCurrentAppUserFromClerk(req);
    const woundProfile = validateWoundProfile(req.body?.woundProfile);
    const { primaryWound, secondaryWound, intensity } = woundProfile;

    const messages = [
      {
        role: 'system',
        content: [
          'You create concise, warm Internal Family Systems (IFS) curriculum support guidance for client self-discovery.',
          'Use compassionate language about parts, Self-energy, and unburdening.',
          'Do not diagnose, provide medical advice, infer risk, or make clinical decisions.',
          'Frame everything as educational personal growth support.'
        ].join(' ')
      },
      {
        role: 'user',
        content: `Based on this assessment, provide personalized IFS Path guidance:\n\nPrimary Wound: ${primaryWound.name} (${primaryWound.score}/24 - ${intensity} intensity)\nSecondary Wound: ${secondaryWound?.name || 'None identified'} (${secondaryWound?.score || 0}/24)\n\nPlease provide:\n1. A compassionate 2-3 sentence summary of what these patterns may mean for the person\n2. 3 specific healing priorities for their IFS Path\n3. One grounding affirmation they can use daily\n4. A brief description of what their personalized Curriculum will focus on\n\nUse headings: Summary, Healing Priorities, Affirmation, Curriculum Focus.`
      }
    ];

    const result = await callOpenRouterChat({
      messages,
      temperature: 0.7,
      maxTokens: 600
    });

    return res.status(200).json({ data: { text: result.text, provider: result.provider, model: result.model }, error: null });
  } catch (error) {
    const status = error.statusCode || 500;
    const code = error.code || (status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : 'server_error');
    return sendError(res, status, error.message || 'Unable to generate personalized IFS Path guidance.', code);
  }
}
