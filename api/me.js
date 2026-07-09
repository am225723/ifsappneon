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
    const status = error.statusCode || 500;
    if (status >= 500) {
      console.error('[api/me] request failed:', error);
    }
    return res.status(status).json({ error: status >= 500 ? 'Unable to load your account right now.' : error.message });
  }
}
