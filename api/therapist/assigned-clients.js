import { isAdminUser, requireTherapist, sql } from '../_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  try {
    const therapist = await requireTherapist(req);
    const includeDischarged = req.query?.includeDischarged === 'true';

    const rows = isAdminUser(therapist)
      ? await sql.query(`
        SELECT *
        FROM (
          SELECT DISTINCT ON (c.id)
            c.id,
            c.name,
            c.pin,
            c.email,
            c.phone,
            c.status,
            c.last_active,
            c.created_at,
            c.user_role,
            c.access_restrictions,
            tc.status AS assignment_status,
            tc.assigned_at,
            tc.discharged_at
          FROM ifs_clients c
          LEFT JOIN ifs_therapist_clients tc
            ON tc.client_id = c.id
            AND ($1::boolean OR COALESCE(tc.status, 'active') = 'active')
          WHERE c.user_role = 'client'
          ORDER BY c.id, COALESCE(tc.status, 'active') ASC, tc.assigned_at DESC NULLS LAST
        ) clients
        ORDER BY name ASC NULLS LAST
      `, [includeDischarged])
      : await sql.query(`
        SELECT
          c.id,
          c.name,
          c.pin,
          c.email,
          c.phone,
          c.status,
          c.last_active,
          c.created_at,
          c.user_role,
          c.access_restrictions,
          tc.status AS assignment_status,
          tc.assigned_at,
          tc.discharged_at
        FROM ifs_therapist_clients tc
        JOIN ifs_clients c ON c.id = tc.client_id
        WHERE tc.therapist_id = $1
          AND c.user_role = 'client'
          AND ($2::boolean OR COALESCE(tc.status, 'active') = 'active')
        ORDER BY COALESCE(tc.status, 'active') ASC, c.name ASC NULLS LAST
      `, [therapist.id, includeDischarged]);

    return res.status(200).json({ data: rows });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: { message: error.message } });
  }
}
