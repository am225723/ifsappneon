# Phase 18C — Secure QA Admin Account Setup

## Purpose

This account is for authorized full-site QA testing only. It exists so approved testers and AI coding/review agents can exercise the app through the normal Clerk sign-in flow without using real client credentials, real production users, or real PHI.

The QA account is **not** an authentication bypass. The human operator creates the user in Clerk first, then links that Clerk user to an internal `ifs_clients` row with a safe test role.

## What this setup does

- Uses normal Clerk authentication.
- Uses the app's existing internal role gate from `public.ifs_clients.user_role`.
- Creates or updates only the exact `ifs_clients` row matched by `QA_ADMIN_CLERK_USER_ID` or exact `QA_ADMIN_EMAIL`.
- Refuses to proceed if the Clerk user ID or QA email matches multiple internal rows.
- Supports `admin`, `supervisor`, `therapist`, or `advisor` test roles.
- Does not create a Clerk user.
- Does not require or print a password.
- Fails closed if `QA_ADMIN_PASSWORD` is set in the environment.
- Does not seed real PHI.
- Does not run broad backfills such as `neon/999_backfill_therapist_assignments.sql`.

## Required tools

- Clerk Dashboard or Clerk API access to create the QA user and manage the password.
- Neon database access through `DATABASE_URL` for the target local, preview, or production environment.
- Vercel preview/prod environment access if the seed is being run against a deployed environment.
- An approved password manager for sharing temporary credentials with authorized testers, if needed.

## Required environment variables

Set these in your shell or Vercel environment before running the seed script:

```bash
DATABASE_URL=
QA_ADMIN_EMAIL=
QA_ADMIN_NAME="QA Admin"
QA_ADMIN_CLERK_USER_ID=
QA_ADMIN_ROLE=admin
```

Optional placeholders:

```bash
QA_DEMO_CLIENT_EMAIL=
QA_DEMO_CLIENT_NAME="Demo Client"
ENABLE_QA_SEED=false
```

`QA_ADMIN_ROLE` defaults to `admin` when omitted. Valid values are `admin`, `supervisor`, `therapist`, and `advisor`.

Do **not** set `QA_ADMIN_PASSWORD`. The script intentionally aborts if that variable exists, because passwords belong only in Clerk or an approved password manager.

## Password handling

- Create and reset the QA password in Clerk or an approved password manager only.
- Never commit a QA password.
- Never add `QA_ADMIN_PASSWORD` to `.env.example`, source files, docs, logs, screenshots, or prompts.
- The seed script never asks for a password and never prints one.
- Rotate or reset the password after external-agent testing if required by your security process.

## Recommended test identity

Use a clearly fake identity such as:

- Email: `qa.admin@yourdomain.test` or an equivalent non-client QA address.
- Role: `admin` for full admin/supervisor route coverage, or `supervisor` if your environment treats supervisors as the preferred elevated QA role.
- Name: `QA Admin`.
- Data: fake QA/demo data only; no real PHI.

Before running the seed, confirm the QA email is unique in the target environment. The script refuses to update when the email matches multiple `ifs_clients` rows or is already linked to a different Clerk user.

## Manual setup steps

1. Create a QA user in Clerk using the Clerk Dashboard or Clerk API.
2. Set the user's password in Clerk or an approved password manager.
3. Copy the Clerk user ID, for example a `user_...` value.
4. Set environment variables locally or in the Vercel preview environment:
   - `DATABASE_URL`
   - `QA_ADMIN_EMAIL`
   - `QA_ADMIN_NAME`
   - `QA_ADMIN_CLERK_USER_ID`
   - `QA_ADMIN_ROLE=admin`
   - `ENABLE_QA_SEED=true` only if you are intentionally preparing fake demo data outside this script.
5. Confirm `QA_ADMIN_PASSWORD` is not set anywhere in the shell, Vercel environment, `.env` files, screenshots, docs, or prompts.
6. Run:

   ```bash
   npm run qa:seed-admin
   ```

7. Log in through the normal app sign-in page with the Clerk QA user.
8. Rotate/reset the password after external-agent testing if desired.

## External tool use

- Credentials may be entered manually into approved testing tools only, such as ChatGPT browser/agent testing, Codex, Gemini, Claude, Jules, or another approved QA agent.
- Do not paste passwords, Clerk secrets, database URLs, or API keys into public prompts or source code.
- Prefer time-bounded access and rotate the password after external-agent sessions.

## Route and feature scope

A QA admin/supervisor can test Admin Hub, Advisor Dashboard, Tools Directory, My IFS Work, Curriculum, Profile, Reports, AI insights, Life Integration, Parts Map, and route recovery.

Use fake QA/demo records when testing assigned-client workflows. Admin/supervisor users can exercise broad Advisor/Admin tools through existing role gates. Non-admin Advisor testing should use an explicit fake client assignment in `ifs_therapist_clients` so assignment scoping is tested without exposing real client rows.

## Demo client and assignment testing

Automatic demo client/data creation is intentionally not implemented in `scripts/seed-qa-admin.mjs` because the app has multiple optional tables and environment-specific schema history. To test Advisor assignment workflows safely:

1. Create a fake client through existing app/admin tooling or a controlled database insert using `QA_DEMO_CLIENT_EMAIL` and `QA_DEMO_CLIENT_NAME`.
2. Ensure the fake client has `user_role='client'` and clearly fake labels such as `QA Demo` and `Fake demo data`.
3. Link the QA advisor/admin row to the fake client in `ifs_therapist_clients` if you are testing non-admin Advisor scoping.
4. Add only minimal fake records needed for the workflow being tested.
5. Do not copy production PHI into demo records.

No manual SQL is required for the QA admin account itself when `npm run qa:seed-admin` is available and `DATABASE_URL` points at the target Neon database.

## Security confirmation checklist

- [ ] QA user was created in Clerk, not by a custom app endpoint.
- [ ] Internal role is stored in `ifs_clients.user_role`.
- [ ] QA email is unique in the target environment.
- [ ] `QA_ADMIN_PASSWORD` is not set, committed, printed, logged, screenshotted, or pasted into prompts.
- [ ] No unauthenticated admin creation route was added.
- [ ] No password was committed or printed.
- [ ] No frontend secret variable was introduced.
- [ ] No name-only matching is used for seeding.
- [ ] No broad client backfill was run.
- [ ] Demo content is fake and clearly labeled.
- [ ] No production PHI was seeded.
