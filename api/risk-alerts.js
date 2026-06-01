/* global process */
import { requireTherapist, sql } from './_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  try {
    const therapist = await requireTherapist(req);
    const therapistId = therapist.id;
    const rows = await sql`
      WITH assigned AS (
        SELECT tc.client_id, c.name, c.email, c.last_active
        FROM ifs_therapist_clients tc
        JOIN ifs_clients c ON c.id = tc.client_id
        WHERE tc.therapist_id = ${therapistId}
          AND COALESCE(tc.status, 'active') = 'active'
      ), latest_agenda AS (
        SELECT DISTINCT ON (client_id)
          client_id,
          topics,
          stuck_points,
          created_at,
          session_date
        FROM ifs_session_agendas
        WHERE client_id IN (SELECT client_id FROM assigned)
        ORDER BY client_id, created_at DESC
      ), low_moods AS (
        SELECT client_id, MIN(mood) AS lowest_mood, MAX(date) AS latest_low_mood_at, COUNT(*)::int AS low_mood_count
        FROM ifs_mood_entries
        WHERE client_id IN (SELECT client_id FROM assigned)
          AND mood <= 2
          AND date >= NOW() - INTERVAL '7 days'
        GROUP BY client_id
      ), latest_progress AS (
        SELECT client_id, MAX(updated_at) AS latest_progress_at
        FROM ifs_client_progress
        WHERE client_id IN (SELECT client_id FROM assigned)
        GROUP BY client_id
      )
      SELECT
        a.client_id,
        a.name,
        a.email,
        a.last_active,
        lm.lowest_mood,
        lm.latest_low_mood_at,
        lm.low_mood_count,
        lp.latest_progress_at,
        la.topics,
        la.stuck_points,
        la.created_at AS latest_agenda_at,
        la.session_date,
        (
          lm.client_id IS NOT NULL
          OR COALESCE(a.last_active, lp.latest_progress_at) IS NULL
          OR COALESCE(a.last_active, lp.latest_progress_at) < NOW() - INTERVAL '7 days'
          OR LOWER(COALESCE(la.topics, '') || ' ' || COALESCE(la.stuck_points, '')) LIKE ANY (ARRAY['%stuck%', '%crisis%'])
        ) AS flagged
      FROM assigned a
      LEFT JOIN low_moods lm ON lm.client_id = a.client_id
      LEFT JOIN latest_progress lp ON lp.client_id = a.client_id
      LEFT JOIN latest_agenda la ON la.client_id = a.client_id
      ORDER BY lm.lowest_mood ASC NULLS LAST, a.last_active ASC NULLS FIRST
    `;

    const flagged = rows.filter((row) => row.flagged).map((row) => {
      const reasons = [];
      if (row.lowest_mood) reasons.push(`Mood score ${row.lowest_mood}/5 in the last 7 days`);
      const lastActivity = row.last_active || row.latest_progress_at;
      if (!lastActivity) reasons.push('No recent login or module progress recorded');
      else {
        const inactiveDays = Math.floor((Date.now() - new Date(lastActivity).getTime()) / 86400000);
        if (inactiveDays >= 7) reasons.push(`${inactiveDays}+ days without login or module progress`);
      }
      const agendaText = `${row.topics || ''} ${row.stuck_points || ''}`.toLowerCase();
      if (agendaText.includes('stuck')) reasons.push('Latest pre-session agenda mentions “stuck”');
      if (agendaText.includes('crisis')) reasons.push('Latest pre-session agenda mentions “crisis”');
      return { ...row, reasons };
    });

    return res.status(200).json({ data: flagged });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: { message: error.message } });
  }
}
