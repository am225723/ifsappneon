/* global process */
import { neon } from '@neondatabase/serverless';
import { verifyToken } from '@clerk/backend';

function requiredServerEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw Object.assign(new Error(`${name} is not configured on the server.`), {
      statusCode: 500,
      code: `${name.toLowerCase()}_missing`
    });
  }
  return value;
}

function createMissingDatabaseClient() {
  const missing = () => {
    throw Object.assign(new Error('DATABASE_URL is not configured on the server.'), {
      statusCode: 500,
      code: 'database_url_missing'
    });
  };
  missing.query = missing;
  return missing;
}

export function requireServerEnv(name) {
  return requiredServerEnv(name);
}

export const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : createMissingDatabaseClient();

export const THERAPIST_ROLES = new Set(['therapist', 'advisor', 'admin', 'supervisor']);
export const ADMIN_ROLES = new Set(['admin', 'supervisor']);

function getAuthorizedParties() {
  return process.env.CLERK_AUTHORIZED_PARTIES
    ?.split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

export async function verifyClerkUser(req) {
  if (process.env.ALLOW_PIN_AUTH_WITHOUT_CLERK === 'true') return null;
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) throw Object.assign(new Error('Missing Clerk bearer token'), { statusCode: 401 });

  const payload = await verifyToken(token, {
    secretKey: requiredServerEnv('CLERK_SECRET_KEY'),
    authorizedParties: getAuthorizedParties()
  });
  return payload.sub;
}

export async function getCurrentAppUserFromClerk(req) {
  const clerkUserId = await verifyClerkUser(req);
  if (!clerkUserId) return null;

  const rows = await sql`
    SELECT *
    FROM ifs_clients
    WHERE clerk_user_id = ${clerkUserId}
    LIMIT 1
  `;

  const appUser = rows[0] || null;
  if (!appUser) throw Object.assign(new Error('No IFS app user is linked to this Clerk account'), { statusCode: 403 });
  return appUser;
}

export function isTherapistUser(appUser) {
  return THERAPIST_ROLES.has(appUser?.user_role);
}

export function isAdminUser(appUser) {
  return ADMIN_ROLES.has(appUser?.user_role);
}

export async function requireTherapist(req) {
  const appUser = await getCurrentAppUserFromClerk(req);
  if (!isTherapistUser(appUser)) {
    throw Object.assign(new Error('Advisor access required'), { statusCode: 403 });
  }
  return appUser;
}

export async function requireTherapistAssignment(therapistId, clientId) {
  if (!therapistId || !clientId) {
    throw Object.assign(new Error('Missing therapist or client id'), { statusCode: 400 });
  }

  const rows = await sql`
    SELECT 1
    FROM ifs_therapist_clients
    WHERE therapist_id = ${therapistId}
      AND client_id = ${clientId}
      AND COALESCE(status, 'active') = 'active'
    LIMIT 1
  `;

  if (!rows.length) {
    throw Object.assign(new Error('Client is not assigned to this therapist'), { statusCode: 403 });
  }
}

export async function requireClientAccess(req, clientId) {
  const appUser = await getCurrentAppUserFromClerk(req);
  if (isAdminUser(appUser)) return appUser;
  if (appUser?.user_role === 'client') {
    if (String(appUser.id) !== String(clientId)) {
      throw Object.assign(new Error('Client access denied'), { statusCode: 403 });
    }
    return appUser;
  }
  if (isTherapistUser(appUser)) {
    await requireTherapistAssignment(appUser.id, clientId);
    return appUser;
  }
  throw Object.assign(new Error('Access denied'), { statusCode: 403 });
}
