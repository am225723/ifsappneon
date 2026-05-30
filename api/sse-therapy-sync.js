const rooms = new Map();

function send(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export default function handler(req, res) {
  const room = req.query.room || req.body?.room || 'default';
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
    const clients = rooms.get(room) || new Set();
    const payload = req.body || {};
    clients.forEach(client => send(client, payload.type || 'therapy-sync', payload));
    return res.status(200).json({ ok: true, listeners: clients.size });
  }
  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}
