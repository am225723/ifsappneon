import { verifyClerkUser, sql } from './_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const clerkUserId = await verifyClerkUser(req);
    const { pin } = req.body || {};

    if (!pin || !/^\d{6}$/.test(String(pin))) {
      return res.status(400).json({ error: 'Enter a valid 6-digit PIN.' });
    }

    const matchingClients = await sql`
      SELECT *
      FROM ifs_clients
      WHERE pin = ${String(pin)}
        AND COALESCE(status, 'active') = 'active'
      ORDER BY created_at ASC
      LIMIT 1
    `;

    const client = matchingClients[0];

    if (!client) {
      return res.status(404).json({ error: 'No active client was found for that PIN.' });
    }

    if (client.clerk_user_id && client.clerk_user_id !== clerkUserId) {
      return res.status(409).json({ error: 'This client profile is already linked to another login.' });
    }

    const updated = await sql`
      UPDATE ifs_clients
      SET clerk_user_id = ${clerkUserId},
          last_active = NOW(),
          updated_at = NOW()
      WHERE id = ${client.id}
      RETURNING *
    `;

    return res.status(200).json({ client: updated[0] });
  } catch (error) {
    const status = error.statusCode || 401;
    return res.status(status).json({ error: status === 500 ? 'Server environment is not configured.' : error.message });
  }
}
