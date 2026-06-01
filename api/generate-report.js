/* global process, Buffer */
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

function escape(value = '') {
  return String(value).replace(/[&<>]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[char]));
}

function fallbackPdf(payload) {
  const lines = ['IFS Clinical Report', `Client: ${payload.clientId}`, `Generated: ${new Date().toISOString()}`, '', 'Selected sections:', ...Object.entries(payload.options).filter(([, enabled]) => enabled).map(([key]) => `- ${key}`)];
  return Buffer.from(`%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R>>endobj\n4 0 obj<</Length ${lines.join('\n').length + 80}>>stream\nBT /F1 12 Tf 72 720 Td (${escape(lines.join(' | '))}) Tj ET\nendstream endobj\ntrailer<</Root 1 0 R>>\n%%EOF`);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { client_id: clientId, therapist_id: therapistId = 'unknown', options = {} } = req.body || {};
  if (!clientId) return res.status(400).json({ error: 'client_id is required' });
  try {
    const [notes, moods, parts] = await Promise.all([
      options.notes ? sql`SELECT id, content, created_at FROM ifs_therapist_notes WHERE client_id::text = ${clientId} ORDER BY created_at DESC LIMIT 20` : [],
      options.moodTrends ? sql`SELECT id, mood, energy, date FROM ifs_mood_entries WHERE client_id::text = ${clientId} ORDER BY date DESC LIMIT 60` : [],
      options.partsMap ? sql`SELECT id, part_name, part_type FROM ifs_parts WHERE client_id::text = ${clientId} ORDER BY created_at DESC` : []
    ]);
    const payload = { clientId, options, notes, moods, parts };
    const buffer = fallbackPdf(payload);
    const storageUrl = `download://ifs-report-${clientId}-${Date.now()}.pdf`;
    await sql`INSERT INTO ifs_generated_reports (therapist_id, client_id, report_type, options, storage_url, generated_by) VALUES (${therapistId}, ${clientId}, 'clinical', ${JSON.stringify(options)}, ${storageUrl}, ${therapistId})`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="ifs-report-${clientId}.pdf"`);
    return res.status(200).send(buffer);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
