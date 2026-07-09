import { getCurrentAppUserFromClerk } from './_auth.js';

const rooms = new Map();

const MAX_PAYLOAD_BYTES = 8 * 1024;
const ALLOWED_EVENT_TYPES = new Set(['therapy-sync', 'start-exercise']);

function send(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

// EventSource cannot set request headers, so a Clerk token may be supplied as a
// query-string parameter for GET subscriptions. POST callers use the standard
// Authorization header.
async function authenticate(req) {
  if (!req.headers.authorization && req.query?.token) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  return getCurrentAppUserFromClerk(req);
}

// The room is always derived from the authenticated user so clients cannot
// subscribe to or broadcast into another user's therapy room.
function resolveRoom(appUser, req) {
  if (appUser) return String(appUser.therapy_room || appUser.id);
  // PIN-auth compatibility mode (ALLOW_PIN_AUTH_WITHOUT_CLERK) has no Clerk user.
  return String(req.query?.room || req.body?.room || 'default');
}

export default async function handler(req, res) {
  let appUser;
  try {
    appUser = await authenticate(req);
  } catch (error) {
    const status = error.statusCode || 401;
    return res.status(status).json({ error: { message: 'Authentication required' } });
  }

  const room = resolveRoom(appUser, req);

  if (req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    });
    send(res, 'connected', { room });
    const clients = rooms.get(room) || new Set();
    clients.add(res);
    rooms.set(room, clients);
    req.on('close', () => {
      clients.delete(res);
      if (!clients.size) rooms.delete(room);
    });
    return;
  }

  if (req.method === 'POST') {
    const payload = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    if (Buffer.byteLength(JSON.stringify(payload)) > MAX_PAYLOAD_BYTES) {
      return res.status(413).json({ error: { message: 'Payload too large' } });
    }
    const type = typeof payload.type === 'string' && ALLOWED_EVENT_TYPES.has(payload.type)
      ? payload.type
      : 'therapy-sync';
    const clients = rooms.get(room) || new Set();
    clients.forEach((client) => send(client, type, payload));
    return res.status(200).json({ ok: true, listeners: clients.size });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: { message: 'Method not allowed' } });
}
