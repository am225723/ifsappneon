import { getCurrentAppUserFromClerk } from './_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const client = await getCurrentAppUserFromClerk(req);
    return res.status(200).json({ client });
  } catch (error) {
    const status = error.statusCode || 401;
    return res.status(status).json({ error: status === 500 ? 'Server environment is not configured.' : error.message });
  }
}
