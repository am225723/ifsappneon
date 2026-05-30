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
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const clerkUserId = await requireClerkUser(req);
    const rows = await sql`
      SELECT *
      FROM ifs_clients
      WHERE clerk_user_id = ${clerkUserId}
      LIMIT 1
    `;

    return res.status(200).json({ client: rows[0] || null });
  } catch (error) {
    return res.status(error.statusCode || 401).json({ error: error.message });
  }
}
