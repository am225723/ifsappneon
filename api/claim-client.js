import { neon } from '@neondatabase/serverless';
import { verifyToken } from '@clerk/backend';

const sql = neon(process.env.DATABASE_URL);

function getAuthorizedParties() {
  return process.env.CLERK_AUTHORIZED_PARTIES
    ?.split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

async function requireClerkUser(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;

  if (!token) {
    throw Object.assign(new Error('Missing Clerk bearer token'), { statusCode: 401 });
  }

  const payload = await verifyToken(token, {
    secretKey: process.env.CLERK_SECRET_KEY,
    authorizedParties: getAuthorizedParties()
  });

  return payload.sub;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const clerkUserId = await requireClerkUser(req);
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
    return res.status(error.statusCode || 401).json({ error: error.message });
  }
}
