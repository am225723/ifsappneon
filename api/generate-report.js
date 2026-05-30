/* global process, Buffer */
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

function escape(value = '') {
  return String(value).replace(/[&<>]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[char]));
}

async function buildPdfWithReactPdf(payload) {
  const React = await import('react');
  const { Document, Page, Text, View, StyleSheet, renderToBuffer } = await import('@react-pdf/renderer');
  const styles = StyleSheet.create({ page: { padding: 36, fontSize: 11, color: '#1f2937' }, h1: { fontSize: 22, marginBottom: 12, color: '#92400e' }, h2: { fontSize: 14, marginTop: 14, marginBottom: 6 }, item: { marginBottom: 4 } });
  const doc = React.createElement(Document, null, React.createElement(Page, { size: 'A4', style: styles.page },
    React.createElement(Text, { style: styles.h1 }, 'IFS Clinical Report'),
    React.createElement(Text, null, `Client: ${payload.clientId}`),
    React.createElement(Text, null, `Generated: ${new Date().toLocaleString()}`),
    payload.options.notes && React.createElement(View, null, React.createElement(Text, { style: styles.h2 }, 'Notes'), payload.notes.map(note => React.createElement(Text, { key: note.id, style: styles.item }, `• ${note.content || ''}`))),
    payload.options.moodTrends && React.createElement(View, null, React.createElement(Text, { style: styles.h2 }, 'Mood Trends'), payload.moods.map(mood => React.createElement(Text, { key: mood.id || mood.date, style: styles.item }, `${mood.date}: mood ${mood.mood}, energy ${mood.energy}`))),
    payload.options.partsMap && React.createElement(View, null, React.createElement(Text, { style: styles.h2 }, 'Parts Map'), payload.parts.map(part => React.createElement(Text, { key: part.id, style: styles.item }, `${part.part_name} (${part.part_type || 'part'})`)))
  ));
  return renderToBuffer(doc);
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
    let buffer;
    try { buffer = await buildPdfWithReactPdf(payload); } catch { buffer = fallbackPdf(payload); }
    const storageUrl = `download://ifs-report-${clientId}-${Date.now()}.pdf`;
    await sql`INSERT INTO ifs_generated_reports (therapist_id, client_id, report_type, options, storage_url, generated_by) VALUES (${therapistId}, ${clientId}, 'clinical', ${JSON.stringify(options)}, ${storageUrl}, ${therapistId})`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="ifs-report-${clientId}.pdf"`);
    return res.status(200).send(buffer);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
