/* global process */
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);
const RANGE_DAYS = { '1M': 31, '3M': 93, '6M': 186 };

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const clientId = req.query.client_id;
  const range = req.query.range || '6M';
  const days = RANGE_DAYS[range] || RANGE_DAYS['6M'];
  if (!clientId) return res.status(400).json({ error: 'client_id is required' });

  try {
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const [weeklyMood, partCounts, assessmentResults] = await Promise.all([
      sql`
        SELECT to_char(date_trunc('week', COALESCE(date::timestamptz, created_at)), 'YYYY-MM-DD') AS label,
               ROUND(AVG(mood)::numeric, 2) AS "avgMood",
               ROUND(AVG(energy)::numeric, 2) AS "avgEnergy",
               COUNT(*)::int AS entries
        FROM ifs_mood_entries
        WHERE client_id::text = ${clientId} AND COALESCE(date::timestamptz, created_at) >= ${since}
        GROUP BY 1
        ORDER BY 1
      `,
      sql`
        SELECT COALESCE(NULLIF(part_type, ''), 'unspecified') AS type, COUNT(*)::int AS count
        FROM ifs_parts
        WHERE client_id::text = ${clientId}
        GROUP BY 1
        ORDER BY count DESC
      `,
      sql`
        SELECT id, created_at, primary_wound, secondary_wound, abandonment_score, shame_score, neglect_score, betrayal_score, helplessness_score
        FROM ifs_assessment_results
        WHERE client_id::text = ${clientId} AND created_at >= ${since}
        ORDER BY created_at DESC
      `
    ]);
    return res.status(200).json({ range, since, weeklyMood, partCounts, assessmentResults });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
