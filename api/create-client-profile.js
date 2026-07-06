import { verifyClerkUser, sql } from './_auth.js';

function cleanText(value, maxLength = 255) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function cleanEmail(value) {
  const email = cleanText(value, 320).toLowerCase();
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

async function generateUniquePin() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const pin = String(Math.floor(100000 + Math.random() * 900000));
    const existing = await sql`
      SELECT id
      FROM ifs_clients
      WHERE pin = ${pin}
      LIMIT 1
    `;
    if (!existing.length) return pin;
  }

  throw Object.assign(new Error('Unable to generate a unique client PIN. Please try again.'), { statusCode: 503 });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const clerkUserId = await verifyClerkUser(req);
    if (!clerkUserId) {
      return res.status(401).json({ error: 'A Clerk login is required to create a profile.' });
    }

    const existing = await sql`
      SELECT *
      FROM ifs_clients
      WHERE clerk_user_id = ${clerkUserId}
      LIMIT 1
    `;

    if (existing[0]) {
      return res.status(200).json({ client: existing[0], created: false });
    }

    const name = cleanText(req.body?.name, 120);
    const email = cleanEmail(req.body?.email);

    if (!name) {
      return res.status(400).json({ error: 'Enter your name to create a new profile.' });
    }

    const pin = await generateUniquePin();
    const inserted = await sql`
      INSERT INTO ifs_clients (pin, name, email, clerk_user_id, user_role, status, last_active, created_at, updated_at)
      VALUES (${pin}, ${name}, ${email}, ${clerkUserId}, 'client', 'active', NOW(), NOW(), NOW())
      RETURNING *
    `;

    return res.status(201).json({ client: inserted[0], created: true });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ error: status === 500 ? 'Unable to create client profile.' : error.message });
  }
}
