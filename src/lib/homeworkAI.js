const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

const CATEGORY_LABELS = {
  'general': 'General',
  'journaling': 'Journaling',
  'parts-work': 'Parts Work',
  'meditation': 'Meditation',
  'exercise': 'Exercise',
  'reading': 'Reading',
  'self-care': 'Self-Care',
};

function getApiKey() {
  return import.meta.env.VITE_PERPLEXITY_API_KEY || null;
}

async function generateHomework({ woundType, secondaryWound, category, guidance, clientName }) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('AI features require a Perplexity API key. Add VITE_PERPLEXITY_API_KEY to your environment.');
  }

  const systemPrompt = `You are an expert Internal Family Systems (IFS) therapist creating homework for a client named ${clientName || 'the client'}.

Your homework must be INTERACTIVE and ENGAGING — not passive reading or generic advice. Every assignment should include:
- A hands-on activity the client physically does (writing, drawing, speaking aloud, movement, visualization)
- Clear step-by-step instructions with specific prompts or questions to answer
- An estimated time (10-30 minutes)
- A reflection component where the client processes what they discovered

Ground everything in IFS concepts: parts work, Self-energy, exiles, protectors, managers, firefighters, unburdening, blending/unblending.
Write in a warm, direct second-person tone ("You will..." / "Notice how...").
Do not diagnose or give medical advice.`;

  const categoryInstruction = category && category !== 'general'
    ? `The homework should be in the "${CATEGORY_LABELS[category] || category}" category.`
    : 'Choose the most appropriate category from: General, Journaling, Parts Work, Meditation, Exercise, Reading, Self-Care.';

  const woundContext = woundType
    ? `${clientName || 'This client'}'s primary wound is "${woundType}"${secondaryWound ? ` with a secondary wound of "${secondaryWound}"` : ''}. Directly address this wound pattern in the homework — reference specific feelings, triggers, and protective strategies associated with this wound.`
    : `No wound assessment completed yet. Create engaging general IFS homework that helps ${clientName || 'the client'} build Self-energy and get to know their parts.`;

  const guidanceNote = guidance
    ? `The advisor specifically requests: "${guidance}". Prioritize this guidance in your homework design.`
    : '';

  const userPrompt = `Create ONE interactive homework assignment for ${clientName || 'the client'}.

${woundContext}
${categoryInstruction}
${guidanceNote}

Make it hands-on and specific. Include numbered steps, reflection questions, or creative prompts the client actually responds to.

Respond in EXACTLY this format:
TITLE: [Creative, inviting title that sparks curiosity — not generic]
CATEGORY: [One of: general, journaling, parts-work, meditation, exercise, reading, self-care]
PRIORITY: [One of: low, normal, high]
DESCRIPTION: [Write 5-8 sentences with clear numbered steps. Start with what the client needs (pen, quiet space, etc). Give specific prompts or questions. Include time estimate. End with a reflection question. Make it feel like a meaningful experience, not a chore.]`;

  const response = await fetch(PERPLEXITY_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 500,
      temperature: 0.8,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`AI request failed (${response.status}): ${errText || 'Unknown error'}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('AI returned an empty response. Please try again.');
  }

  return parseSingleHomework(content);
}

async function generateHomeworkBatch({ woundType, secondaryWound, guidance, clientName, count = 4 }) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('AI features require a Perplexity API key. Add VITE_PERPLEXITY_API_KEY to your environment.');
  }

  const systemPrompt = `You are an expert Internal Family Systems (IFS) therapist creating homework for a client named ${clientName || 'the client'}.

Your homework must be INTERACTIVE and ENGAGING. Each assignment should include:
- A hands-on activity (writing, drawing, speaking aloud, movement, body scan, visualization, creative expression)
- Clear step-by-step instructions with specific prompts or questions
- An estimated time (10-30 minutes)
- A reflection component

Use diverse approaches: one might be a letter-writing exercise, another a body-based practice, another a parts dialogue, another a creative/art activity.
Ground everything in IFS: parts, Self-energy, exiles, protectors, unburdening, blending.
Write warmly in second person. Do not diagnose.`;

  const woundContext = woundType
    ? `${clientName || 'This client'}'s primary wound is "${woundType}"${secondaryWound ? ` with a secondary wound of "${secondaryWound}"` : ''}. Each assignment should directly address this wound with specific feelings, triggers, and healing strategies.`
    : `No wound assessment yet. Create diverse IFS homework to build Self-energy and parts awareness for ${clientName || 'the client'}.`;

  const guidanceNote = guidance
    ? `The advisor specifically requests: "${guidance}". Weave this into the assignments.`
    : '';

  const userPrompt = `Create ${count} DIFFERENT interactive homework assignments for ${clientName || 'the client'}. Each should use a different category and approach.

${woundContext}
${guidanceNote}

Make each one hands-on with numbered steps, specific prompts, and reflection questions.

For EACH assignment use EXACTLY this format, separated by ---:

TITLE: [Creative, specific title]
CATEGORY: [One of: general, journaling, parts-work, meditation, exercise, reading, self-care]
PRIORITY: [One of: low, normal, high]
DESCRIPTION: [5-8 sentences with numbered steps. Materials needed, specific prompts/questions, time estimate, reflection.]

---

TITLE: [Next assignment]
CATEGORY: [different category]
PRIORITY: [low/normal/high]
DESCRIPTION: [different approach and activity type]`;

  const response = await fetch(PERPLEXITY_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 2000,
      temperature: 0.85,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`AI request failed (${response.status}): ${errText || 'Unknown error'}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('AI returned an empty response. Please try again.');
  }

  return parseBatchHomework(content);
}

function parseSingleHomework(text) {
  const title = extractField(text, 'TITLE');
  const category = normalizeCategory(extractField(text, 'CATEGORY'));
  const priority = normalizePriority(extractField(text, 'PRIORITY'));
  const description = extractField(text, 'DESCRIPTION');

  if (!title || !description) {
    throw new Error('AI response was not in the expected format. Please try again.');
  }

  return { title, category, priority, description };
}

function parseBatchHomework(text) {
  const blocks = text.split(/---+/).filter(b => b.trim());
  const results = [];

  for (const block of blocks) {
    try {
      const title = extractField(block, 'TITLE');
      const category = normalizeCategory(extractField(block, 'CATEGORY'));
      const priority = normalizePriority(extractField(block, 'PRIORITY'));
      const description = extractField(block, 'DESCRIPTION');

      if (title && description) {
        results.push({ title, category, priority, description });
      }
    } catch {
      continue;
    }
  }

  if (results.length === 0) {
    throw new Error('Could not parse any homework suggestions from the AI response. Please try again.');
  }

  return results;
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
  for (const v of valid) {
    if (lower.includes(v.replace('-', '')) || lower.includes(v)) return v;
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

export { generateHomework, generateHomeworkBatch };
