import { createRouteHandler } from 'uploadthing/server';
import { verifyToken } from '@clerk/backend';
import { ourFileRouter } from '../src/lib/uploadthingServer.js';

async function getUserId(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;

  if (!token) {
    if (process.env.ALLOW_PIN_AUTH_WITHOUT_CLERK === 'true') return 'pin-auth-user';
    throw new Error('Missing Clerk bearer token');
  }

  const payload = await verifyToken(token, {
    secretKey: process.env.CLERK_SECRET_KEY,
    authorizedParties: process.env.CLERK_AUTHORIZED_PARTIES?.split(',').map((v) => v.trim()).filter(Boolean)
  });

  return payload.sub;
}

const handlers = createRouteHandler({
  router: ourFileRouter,
  config: {
    uploadthingId: process.env.UPLOADTHING_APP_ID,
    uploadthingSecret: process.env.UPLOADTHING_SECRET,
    callbackUrl: process.env.UPLOADTHING_CALLBACK_URL,
    isDev: process.env.NODE_ENV !== 'production'
  }
});

export default async function handler(req, res) {
  try {
    req.userId = await getUserId(req);
    return handlers(req, res);
  } catch (error) {
    return res.status(401).json({ error: error.message });
  }
}
