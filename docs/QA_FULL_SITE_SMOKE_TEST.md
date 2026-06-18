# Phase 18C — QA Full-Site Smoke Test Checklist

Use this checklist after creating the secure QA Admin/Advisor account. Log in through the normal Clerk sign-in page; do not use auth bypasses or real client credentials.

## Test identity

- [ ] QA user is a Clerk user created for testing only.
- [ ] Internal app row exists in `ifs_clients` with `user_role='admin'` or `user_role='supervisor'` for full-site QA.
- [ ] Any client data used during testing is fake and clearly labeled `QA Demo` / `Fake demo data`.

## Routes to test as QA Admin

- [ ] `/admin`
- [ ] `/therapist`
- [ ] `/tools`
- [ ] `/my-ifs`
- [ ] `/home`
- [ ] `/profile`
- [ ] `/curriculum`
- [ ] `/curriculum/module/module-1-intro-ifs`
- [ ] `/assessments`
- [ ] `/journal`
- [ ] `/parts-relationships`
- [ ] `/life-integration`
- [ ] `/healing-timeline`
- [ ] `/progress-timeline`
- [ ] `/advisor-homework`
- [ ] `/assessment-builder`
- [ ] `/reports`
- [ ] `/analytics`
- [ ] `/longitudinal-analytics`
- [ ] `/live-co-therapy`
- [ ] `/advisor/shared-reflections`
- [ ] Unknown route such as `/does-not-exist`

## Functional checks

- [ ] No blank pages appear.
- [ ] Route recovery and unknown-route handling work.
- [ ] Profile loads for the QA account.
- [ ] My IFS Work loads.
- [ ] Curriculum and My IFS progress are consistent.
- [ ] Tools Directory links navigate correctly.
- [ ] Advisor Dashboard is usable.
- [ ] Reports and insights load with fake/demo client data where needed.
- [ ] AI module response insights button appears where expected.
- [ ] Generated worksheets format correctly.
- [ ] Interactive worksheet renderer works.
- [ ] No medication route, medication card, or medication management feature appears.
- [ ] Client-only routes are not exposed incorrectly to elevated users.
- [ ] Admin-only tools are not shown to client-only users when separately testing a fake client account.
- [ ] Advisor notes remain protected from clients.
- [ ] Client overview pages do not show raw JSON.

## Assignment/client demo testing

- [ ] Admin/supervisor QA can open Admin Hub and Advisor routes through existing role gates.
- [ ] Non-admin Advisor QA uses an explicit fake `ifs_therapist_clients` assignment before viewing fake client data.
- [ ] Assigned-client workflows use fake clients only.
- [ ] Advisor-only notes and feedback remain inaccessible to fake client accounts.

## Post-test cleanup

- [ ] Rotate/reset QA password after external-agent testing if needed.
- [ ] Remove or archive temporary fake demo records if the environment requires cleanup.
- [ ] Confirm no real PHI was entered during QA.
