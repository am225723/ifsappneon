import { createRouteHandler } from 'uploadthing/server';
import { verifyClerkUser } from './_auth.js';
import { ourFileRouter } from './_uploadthingRouter.js';

async function getUserId(req) {
  const clerkUserId = await verifyClerkUser(req);
  if (!clerkUserId) {
    if (process.env.ALLOW_PIN_AUTH_WITHOUT_CLERK === 'true') return 'pin-auth-user';
    throw new Error('Missing Clerk bearer token');
  }
  return clerkUserId;
}

const handlers = createRouteHandler({
  router: ourFileRouter,
  config: {
    token: process.env.UPLOADTHING_TOKEN,
    callbackUrl: process.env.UPLOADTHING_CALLBACK_URL,
    isDev: process.env.NODE_ENV !== 'production'
  }
});

export default async function handler(req, res) {
  try {
    req.userId = await getUserId(req);
    return handlers(req, res);
  } catch (error) {
    const status = error.statusCode || 401;
    return res.status(status).json({ error: status >= 500 ? 'Upload service is not configured right now.' : 'Upload access is not available.' });
  }
}
