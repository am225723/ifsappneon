#!/usr/bin/env node
import { neon } from '@neondatabase/serverless';

const REQUIRED_ROLES = new Set(['admin', 'supervisor', 'therapist', 'advisor']);
const REQUIRED_IFS_CLIENT_COLUMNS = [
  'clerk_user_id',
  'email',
  'name',
  'user_role',
  'status',
  'onboarding_completed',
  'last_active',
  'created_at',
  'updated_at'
];

function fail(message) {
  console.error(message);
  process.exit(1);
}

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    fail(`Missing required environment variable: ${name}`);
  }
  return value;
}

function disallowEnv(name) {
  if (process.env[name]?.trim()) {
    fail(`${name} must not be set. Manage QA passwords only in Clerk or an approved password manager.`);
  }
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

function normalizeEmail(value) {
  return value.trim().toLowerCase();
}

function validateEmail(value) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    fail('QA_ADMIN_EMAIL must be a valid email address for the Clerk QA user.');
  }
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

function assertRequiredColumns(columns) {
  const missingColumns = REQUIRED_IFS_CLIENT_COLUMNS.filter((column) => !columns.has(column));
  if (missingColumns.length > 0) {
    throw new Error(`public.ifs_clients is missing required column(s): ${missingColumns.join(', ')}`);
  }
}

async function main() {
  disallowEnv('QA_ADMIN_PASSWORD');

  const databaseUrl = requireEnv('DATABASE_URL');
  const clerkUserId = requireEnv('QA_ADMIN_CLERK_USER_ID');
  const email = normalizeEmail(requireEnv('QA_ADMIN_EMAIL'));
  const name = process.env.QA_ADMIN_NAME?.trim() || 'QA Admin';
  const requestedRole = (process.env.QA_ADMIN_ROLE?.trim() || 'admin').toLowerCase();
  const role = requestedRole === 'advisor' ? 'advisor' : requestedRole;

  validateEmail(email);

  if (!clerkUserId.startsWith('user_')) {
    console.warn('QA_ADMIN_CLERK_USER_ID does not look like a standard Clerk user_ value; continuing because Clerk ID formats may vary.');
  }

  if (!REQUIRED_ROLES.has(role)) {
    fail(`Invalid QA_ADMIN_ROLE: ${requestedRole}. Use one of: ${Array.from(REQUIRED_ROLES).join(', ')}`);
  }

  const sql = neon(databaseUrl);
  const columns = await getTableColumns(sql, 'ifs_clients');
  assertRequiredColumns(columns);

  const byClerk = await sql`
    SELECT id, email, user_role
    FROM public.ifs_clients
    WHERE clerk_user_id = ${clerkUserId}
    LIMIT 2
  `;

  if (byClerk.length > 1) {
    throw new Error('Refusing to modify rows: QA_ADMIN_CLERK_USER_ID matched more than one ifs_clients row.');
  }

  const emailMatches = await sql`
    SELECT id, clerk_user_id, email, user_role
    FROM public.ifs_clients
    WHERE lower(email) = ${email}
    ORDER BY created_at ASC NULLS LAST, id ASC
    LIMIT 3
  `;

  let action = 'created';
  let adminRow = byClerk[0];

  if (adminRow) {
    const conflictingEmailRows = emailMatches.filter((row) => String(row.id) !== String(adminRow.id));
    if (conflictingEmailRows.length > 0) {
      throw new Error('Refusing to modify row: QA_ADMIN_EMAIL already matches another ifs_clients row. Use a unique fake QA email.');
    }

    const updated = await sql`
      UPDATE public.ifs_clients
      SET name = ${name},
          email = ${email},
          user_role = ${role},
          status = 'active',
          onboarding_completed = true,
          last_active = COALESCE(last_active, NOW()),
          updated_at = NOW()
      WHERE id = ${adminRow.id}
        AND clerk_user_id = ${clerkUserId}
      RETURNING id, email, user_role
    `;
    adminRow = updated[0];
    action = 'updated_by_clerk_user_id';
  } else {
    if (emailMatches.length > 1) {
      throw new Error('Refusing to modify rows: QA_ADMIN_EMAIL matched more than one ifs_clients row. Use a unique fake QA email.');
    }

    const byEmail = emailMatches[0];

    if (byEmail) {
      if (byEmail.clerk_user_id && byEmail.clerk_user_id !== clerkUserId) {
        throw new Error('Refusing to modify row: QA_ADMIN_EMAIL is already linked to a different Clerk user ID.');
      }
      const updated = await sql`
        UPDATE public.ifs_clients
        SET clerk_user_id = ${clerkUserId},
            name = ${name},
            email = ${email},
            user_role = ${role},
            status = 'active',
            onboarding_completed = true,
            last_active = COALESCE(last_active, NOW()),
            updated_at = NOW()
        WHERE id = ${byEmail.id}
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
