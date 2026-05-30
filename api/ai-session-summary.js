/* global process */
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

function buildPrompt({ journals, moods, agenda }) {
  return `Summarize the following client data from the past week for therapist session preparation. Focus on themes, active parts, risks, stuck points, and 3 suggested session questions. Avoid diagnosis.\n\nAgenda:\n${JSON.stringify(agenda || {}, null, 2)}\n\nMoods:\n${JSON.stringify(moods, null, 2)}\n\nJournals:\n${JSON.stringify(journals.map(j => ({ date: j.created_at, title: j.title, content: String(j.content || '').slice(0, 1500) })), null, 2)}`;
}

async function streamWithAiSdk(prompt, res) {
  const { streamText } = await import('ai');
  const { openai } = await import('@ai-sdk/openai');
  const result = streamText({ model: openai(process.env.OPENAI_MODEL || 'gpt-4o-mini'), prompt });
  for await (const chunk of result.textStream) res.write(chunk);
}

async function streamWithOpenAI(prompt, res) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', stream: true, messages: [{ role: 'user', content: prompt }] })
  });
  if (!response.ok || !response.body) throw new Error(`OpenAI request failed: ${response.status}`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6);
      if (data === '[DONE]') continue;
      const json = JSON.parse(data);
      const text = json.choices?.[0]?.delta?.content;
      if (text) res.write(text);
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { client_id: clientId } = req.body || {};
  if (!clientId) return res.status(400).json({ error: 'client_id is required' });
  try {
    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    const [journals, moods, agendas] = await Promise.all([
      sql`SELECT id, title, content, created_at FROM ifs_journal_entries WHERE client_id::text = ${clientId} AND created_at >= ${since} ORDER BY created_at DESC LIMIT 20`,
      sql`SELECT mood, energy, date FROM ifs_mood_entries WHERE client_id::text = ${clientId} AND COALESCE(date::timestamptz, created_at) >= ${since} ORDER BY date DESC`,
      sql`SELECT topics, active_parts, stuck_points, session_date, created_at FROM ifs_session_agendas WHERE client_id::text = ${clientId} ORDER BY created_at DESC LIMIT 1`
    ]);
    const prompt = buildPrompt({ journals, moods, agenda: agendas[0] });
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    try { await streamWithAiSdk(prompt, res); } catch { await streamWithOpenAI(prompt, res); }
    return res.end();
  } catch (error) {
    if (!res.headersSent) return res.status(500).json({ error: error.message });
    res.write(`\n\nError: ${error.message}`);
    return res.end();
  }
}
