# Phase 5A Production Hardening QA Checklist

Use this checklist before promoting a Vercel preview to production. Record tester initials, dates, environment, and any failed step links in the release notes.

## Environment Under Test

- [ ] App URL: `______________________________`
- [ ] Neon project/branch confirmed: `IFS / proud-darkness-08649541 / production / br-red-meadow-aqo2sn0d`
- [ ] Database confirmed: `neondb`
- [ ] Tester: `______________________________`
- [ ] Date/time: `______________________________`

## Authentication / Roles

- [ ] Client sign-in succeeds with a linked Clerk user and lands on the client home workspace.
- [ ] Client cannot access therapist routes by direct URL: `/therapist`, `/caseload`, `/messages`, `/reports`, `/analytics`, `/longitudinal-analytics`, `/treatment-plans`.
- [ ] Client-only routes load for clients: `/home`, `/homework`, `/pre-session-checkin`, `/healing-timeline`.
- [ ] Therapist sign-in succeeds and lands on or can reach the therapist dashboard.
- [ ] Therapist can access only active assigned clients in caseload, homework, messages, reports, session prep, treatment plans, tagged notes, and analytics.
- [ ] Therapist cannot access an unassigned client by editing a `clientId` in the UI, request body, or URL.
- [ ] Admin/supervisor elevated access behaves as intended for admin hub and therapist oversight views.
- [ ] Unauthorized or forbidden API responses are clear and do not reveal secrets or other client identifiers.

## Client Workflows

- [ ] Homework list loads with active, completed, and empty states.
- [ ] Assigned homework opens the intended curriculum module even if normal curriculum sequencing would otherwise lock it.
- [ ] Assigned homework progress updates from assigned → in progress → completed without exposing other clients' assignments.
- [ ] Pre-session check-in loads when a client has no mapped parts, no prior agendas, and no assigned therapist error-free.
- [ ] Pre-session check-in can save a draft and submit a completed check-in.
- [ ] Pre-session safety banner is present and states the form is not monitored for emergencies.
- [ ] Healing timeline loads when the client has no parts, homework, agendas, goals, journals, moods, or progress.
- [ ] Healing timeline does not include therapist notes, therapist-only safety concerns, or raw journal content.
- [ ] Client-safe therapy goals appear only as client-safe progress/timeline items.

## Therapist Workflows

- [ ] Caseload loads only active assigned clients.
- [ ] Assigned homework can be assigned to an active assigned client and reviewed after completion.
- [ ] Session prep brief loads submitted agendas and handles clients with no agendas.
- [ ] AI session prep summary can be generated only for assigned clients, uses server-side OpenAI configuration, and displays clinician-review disclaimer copy.
- [ ] Treatment plans load empty, active, paused, completed, and archived goal states without crashing.
- [ ] Tagged notes save and display tags only for parts/goals that belong to the selected assigned client.
- [ ] Longitudinal analytics handles no mood entries, no parts, no homework, no agendas, no goals, no journals, and no assessments.
- [ ] Reports generate for assigned clients, browser print/export works, and report output includes the audit report ID.

## Security Checks

- [ ] No therapist-facing page globally loads every `ifs_clients` row and filters in the browser.
- [ ] No endpoint trusts a frontend `clientId` without server-side self-access or active assignment validation.
- [ ] No endpoint returns therapist notes to clients.
- [ ] Reports do not expose therapist notes in client progress summaries.
- [ ] Report audit metadata saves to `ifs_generated_reports` with `therapist_id`, `client_id`, `generated_by`, report type, sections, format, and generated timestamp.
- [ ] `OPENAI_API_KEY` is configured only server-side and is not present in frontend `VITE_*` variables.
- [ ] Session prep path has no required Perplexity/PPLX environment variable.
- [ ] Error responses for missing `DATABASE_URL`, `CLERK_SECRET_KEY`, or `OPENAI_API_KEY` are clear and do not leak secret values.

## Data / SQL Checks

- [ ] Core tables exist in production: `ifs_clients`, `ifs_therapist_clients`, `ifs_assigned_homework`, `ifs_session_agendas`, `ifs_treatment_plans`, `ifs_therapist_notes`, `ifs_generated_reports`.
- [ ] Clinical relationship tables use internal UUIDs from `ifs_clients.id`, not Clerk user IDs.
- [ ] `ifs_therapist_clients` active assignments are present for every active client.
- [ ] `ifs_assigned_homework` rows still reference internal client and therapist UUIDs.
- [ ] `ifs_session_agendas` rows still reference internal client and therapist UUIDs.
- [ ] `ifs_treatment_plans` rows still reference internal client and therapist UUIDs.
- [ ] Tagged therapist note fields exist on `ifs_therapist_notes`.
- [ ] `ifs_generated_reports` audit rows are created after report generation.
- [ ] Confirm `neon/999_backfill_therapist_assignments.sql` was **not** run.
- [ ] No manual changes were made to therapist-client assignments, inactive clients, homework rows, agenda rows, treatment plan rows, therapist notes, or generated report audit rows during QA.

## Build / Deploy

- [ ] `npm install` completes or a registry/network blocker is documented with exact error output.
- [ ] `npm run build` completes successfully.
- [ ] Vercel preview build completes successfully.
- [ ] Preview smoke test covers sign-in, client homework, pre-session check-in, therapist caseload, session prep, treatment plans, analytics, and reports.
- [ ] Production smoke test after deploy covers sign-in, role redirects, one client workflow, one therapist workflow, and report audit metadata creation.
- [ ] Rollback plan is documented before promotion.

## Release Sign-off

- [ ] Product owner sign-off: `______________________________`
- [ ] Clinical reviewer sign-off: `______________________________`
- [ ] Engineering sign-off: `______________________________`
- [ ] Known limitations/follow-ups captured in release notes.
