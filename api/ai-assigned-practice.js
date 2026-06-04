import { requireTherapist, requireTherapistAssignment } from './_auth.js';
import { callOpenRouterChat } from './_aiProvider.js';

const CATEGORY_LABELS = {
  general: 'General',
  journaling: 'Journaling',
  'parts-work': 'Parts Work',
  meditation: 'Meditation',
  exercise: 'Exercise',
  reading: 'Reading',
  'self-care': 'Self-Care'
};

function sendError(res, status, message, code = 'server_error') {
  return res.status(status).json({ error: { code, message } });
}

function buildSingleMessages({ woundType, secondaryWound, category, guidance, clientName }) {
  const systemPrompt = `You are an expert Internal Family Systems (IFS) Advisor creating an Assigned IFS Practice idea for ${clientName || 'the client'}.

The practice must be INTERACTIVE and ENGAGING — not passive reading or generic advice. Every practice should include:
- A hands-on activity the client physically does (writing, drawing, speaking aloud, movement, visualization)
- Clear step-by-step instructions with specific prompts or questions to answer
- An estimated time (10-30 minutes)
- A reflection component where the client processes what they discovered

Ground everything in IFS concepts: Parts Work, Self-energy, exiles, protectors, managers, firefighters, unburdening, blending/unblending.
Write in a warm, direct second-person tone ("You will..." / "Notice how...").
Do not diagnose, give medical advice, infer risk, or finalize assignment. Advisor review is required.`;

  const categoryInstruction = category && category !== 'general'
    ? `The practice should be in the "${CATEGORY_LABELS[category] || category}" category.`
    : 'Choose the most appropriate category.';

  const woundContext = woundType
    ? `${clientName || 'This client'}'s primary wound is "${woundType}"${secondaryWound ? ` with a secondary wound of "${secondaryWound}"` : ''}. Tailor the practice to this pattern with compassion.`
    : `No wound assessment is available. Create a general IFS practice to build Self-energy and parts awareness for ${clientName || 'the client'}.`;

  const guidanceNote = guidance ? `The Advisor specifically requests: "${guidance}". Weave this into the practice.` : '';

  const userPrompt = `Create ONE Assigned IFS Practice idea.

${woundContext}
${categoryInstruction}
${guidanceNote}

Return EXACTLY this format:
TITLE: [Engaging title]
CATEGORY: [One of: general, journaling, parts-work, meditation, exercise, reading, self-care]
PRIORITY: [One of: low, normal, high]
DESCRIPTION: [5-8 sentences with numbered steps, materials if any, time estimate, and reflection questions.]`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
}

function buildBatchMessages({ woundType, secondaryWound, guidance, clientName, count }) {
  const systemPrompt = `You are an expert Internal Family Systems (IFS) Advisor creating Assigned IFS Practice ideas for ${clientName || 'the client'}.

Each practice must be INTERACTIVE and ENGAGING. Include hands-on activity, clear steps, 10-30 minute estimate, and reflection. Use diverse approaches such as letter-writing, body-based practice, parts dialogue, creative/art activity, or Self-energy practice.

Ground everything in IFS: parts, Self-energy, exiles, protectors, unburdening, blending/unblending. Write warmly in second person. Do not diagnose, infer risk, give medical advice, or finalize assignment. Advisor review is required.`;

  const woundContext = woundType
    ? `${clientName || 'This client'}'s primary wound is "${woundType}"${secondaryWound ? ` with a secondary wound of "${secondaryWound}"` : ''}. Each practice should directly address this wound with specific feelings, triggers, and healing strategies.`
    : `No wound assessment is available. Create diverse IFS practices to build Self-energy and parts awareness for ${clientName || 'the client'}.`;

  const guidanceNote = guidance ? `The Advisor specifically requests: "${guidance}". Weave this into the practices.` : '';

  const userPrompt = `Create ${count} DIFFERENT Assigned IFS Practice ideas for ${clientName || 'the client'}. Each should use a different category and approach.

${woundContext}
${guidanceNote}

For EACH practice use EXACTLY this format, separated by ---:

TITLE: [Creative, specific title]
CATEGORY: [One of: general, journaling, parts-work, meditation, exercise, reading, self-care]
PRIORITY: [One of: low, normal, high]
DESCRIPTION: [5-8 sentences with numbered steps. Materials needed, specific prompts/questions, time estimate, reflection.]

---

TITLE: [Next practice]
CATEGORY: [different category]
PRIORITY: [low/normal/high]
DESCRIPTION: [different approach and activity type]`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
}

function extractField(text, fieldName) {
  const regex = new RegExp(`${fieldName}:\\s*(.+?)(?=\\n(?:TITLE|CATEGORY|PRIORITY|DESCRIPTION):|$)`, 'is');
  const match = text.match(regex);
  if (!match) return '';
  return match[1].trim().replace(/^\*\*|\*\*$/g, '').replace(/^["']|["']$/g, '').replace(/\*\*/g, '').trim();
}

function normalizeCategory(raw) {
  if (!raw) return 'general';
  const lower = raw.toLowerCase().replace(/\s+/g, '-');
  const valid = ['general', 'journaling', 'parts-work', 'meditation', 'exercise', 'reading', 'self-care'];
  if (valid.includes(lower)) return lower;
  for (const value of valid) {
    if (lower.includes(value.replace('-', '')) || lower.includes(value)) return value;
  }
  return 'general';
}

function normalizePriority(raw) {
  if (!raw) return 'normal';
  const lower = raw.toLowerCase();
  if (lower.includes('high')) return 'high';
  if (lower.includes('low')) return 'low';
  return 'normal';
}

function parseSinglePractice(text) {
  const title = extractField(text, 'TITLE');
  const category = normalizeCategory(extractField(text, 'CATEGORY'));
  const priority = normalizePriority(extractField(text, 'PRIORITY'));
  const description = extractField(text, 'DESCRIPTION');
  if (!title || !description) throw Object.assign(new Error('AI response was not in the expected format. Please try again.'), { statusCode: 502, code: 'openrouter_parse_failed' });
  return { title, category, priority, description };
}

function parseBatchPractice(text) {
  const results = text.split(/---+/).filter(Boolean).map((block) => {
    const title = extractField(block, 'TITLE');
    const description = extractField(block, 'DESCRIPTION');
    if (!title || !description) return null;
    return {
      title,
      category: normalizeCategory(extractField(block, 'CATEGORY')),
      priority: normalizePriority(extractField(block, 'PRIORITY')),
      description
    };
  }).filter(Boolean);

  if (!results.length) throw Object.assign(new Error('Could not parse any practice suggestions from the AI response. Please try again.'), { statusCode: 502, code: 'openrouter_parse_failed' });
  return results;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed', 'method_not_allowed');

  try {
    const currentUser = await requireTherapist(req);
    const body = req.body || {};
    const clientId = body.clientId || body.client_id;
    if (!clientId) return sendError(res, 400, 'clientId is required', 'missing_client_id');
    await requireTherapistAssignment(currentUser.id, clientId);

    const mode = body.mode === 'batch' ? 'batch' : 'single';
    const count = Math.min(Math.max(Number.parseInt(body.count, 10) || 4, 1), 6);
    const messages = mode === 'batch'
      ? buildBatchMessages({ ...body, count })
      : buildSingleMessages(body);

    const result = await callOpenRouterChat({
      messages,
      temperature: mode === 'batch' ? 0.85 : 0.8,
      maxTokens: mode === 'batch' ? 2000 : 600
    });

    const practice = mode === 'batch' ? parseBatchPractice(result.text) : parseSinglePractice(result.text);
    return res.status(200).json({ data: { result: practice, provider: result.provider, model: result.model }, error: null });
  } catch (error) {
    const status = error.statusCode || 500;
    const code = error.code || (status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : 'server_error');
    return sendError(res, status, error.message || 'Unable to generate Assigned IFS Practice draft.', code);
  }
}
