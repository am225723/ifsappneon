#!/usr/bin/env node
import { neon } from '@neondatabase/serverless';

const REQUIRED_ROLES = new Set(['admin', 'supervisor', 'therapist', 'advisor']);

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

function readBoolean(name) {
  return String(process.env[name] || '').trim().toLowerCase() === 'true';
}

function safeLabel(value) {
  if (!value) return '(not set)';
  const [local, domain] = String(value).split('@');
  if (!domain) return '(configured)';
  return `${local.slice(0, 2)}***@${domain}`;
}

async function getTableColumns(sql, tableName) {
  const rows = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ${tableName}
  `;
  return new Set(rows.map((row) => row.column_name));
}

async function main() {
  const databaseUrl = requireEnv('DATABASE_URL');
  const clerkUserId = requireEnv('QA_ADMIN_CLERK_USER_ID');
  const email = requireEnv('QA_ADMIN_EMAIL').toLowerCase();
  const name = process.env.QA_ADMIN_NAME?.trim() || 'QA Admin';
  const requestedRole = (process.env.QA_ADMIN_ROLE?.trim() || 'admin').toLowerCase();
  const role = requestedRole === 'advisor' ? 'advisor' : requestedRole;

  if (!REQUIRED_ROLES.has(role)) {
    console.error(`Invalid QA_ADMIN_ROLE: ${requestedRole}. Use one of: ${Array.from(REQUIRED_ROLES).join(', ')}`);
    process.exit(1);
  }

  const sql = neon(databaseUrl);
  const columns = await getTableColumns(sql, 'ifs_clients');
  for (const requiredColumn of ['clerk_user_id', 'email', 'name', 'user_role']) {
    if (!columns.has(requiredColumn)) {
      throw new Error(`public.ifs_clients is missing required column: ${requiredColumn}`);
    }
  }

  const byClerk = await sql`
    SELECT id, email, user_role
    FROM public.ifs_clients
    WHERE clerk_user_id = ${clerkUserId}
    LIMIT 1
  `;

  let action = 'created';
  let adminRow = byClerk[0];

  if (adminRow) {
    const updated = await sql`
      UPDATE public.ifs_clients
      SET name = ${name},
          email = ${email},
          user_role = ${role},
          status = COALESCE(status, 'active'),
          onboarding_completed = COALESCE(onboarding_completed, true),
          updated_at = NOW()
      WHERE clerk_user_id = ${clerkUserId}
      RETURNING id, email, user_role
    `;
    adminRow = updated[0];
    action = 'updated_by_clerk_user_id';
  } else {
    const byEmail = await sql`
      SELECT id, clerk_user_id, email, user_role
      FROM public.ifs_clients
      WHERE lower(email) = ${email}
      ORDER BY created_at ASC NULLS LAST
      LIMIT 1
    `;

    if (byEmail[0]) {
      if (byEmail[0].clerk_user_id && byEmail[0].clerk_user_id !== clerkUserId) {
        throw new Error('Refusing to modify row: QA_ADMIN_EMAIL is already linked to a different Clerk user ID.');
      }
      const updated = await sql`
        UPDATE public.ifs_clients
        SET clerk_user_id = ${clerkUserId},
            name = ${name},
            email = ${email},
            user_role = ${role},
            status = COALESCE(status, 'active'),
            onboarding_completed = COALESCE(onboarding_completed, true),
            updated_at = NOW()
        WHERE id = ${byEmail[0].id}
        RETURNING id, email, user_role
      `;
      adminRow = updated[0];
      action = 'attached_by_exact_email';
    } else {
      const inserted = await sql`
        INSERT INTO public.ifs_clients (clerk_user_id, name, email, user_role, status, onboarding_completed, last_active, created_at, updated_at)
        VALUES (${clerkUserId}, ${name}, ${email}, ${role}, 'active', true, NOW(), NOW(), NOW())
        RETURNING id, email, user_role
      `;
      adminRow = inserted[0];
    }
  }

  const demoEnabled = readBoolean('ENABLE_QA_SEED');
  let demoSummary = 'disabled';
  if (demoEnabled) {
    demoSummary = 'not created automatically; follow docs for fake demo client setup and assignment verification';
    if (process.env.QA_DEMO_CLIENT_EMAIL?.trim()) {
      console.warn('ENABLE_QA_SEED=true detected, but this script intentionally does not create demo PHI-like data automatically. Use only fake manual demo rows as documented.');
    }
  }

  console.log('QA admin seed complete.');
  console.log(JSON.stringify({
    action,
    appUserId: adminRow.id,
    email: safeLabel(adminRow.email),
    role: adminRow.user_role,
    clerkUserIdConfigured: true,
    passwordManagedOutsideRepo: true,
    demoSeed: demoSummary
  }, null, 2));
}

main().catch((error) => {
  console.error(`QA admin seed failed: ${error.message}`);
  process.exit(1);
});
