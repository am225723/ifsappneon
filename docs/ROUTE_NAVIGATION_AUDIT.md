# Route Navigation Audit — Phase 15E

This audit documents the registered React/Vite routes in `src/App.jsx`, visible navigation paths, intentional hidden routes, and legacy aliases after the Phase 15E navigation update.

## Route Audit Table

| Route | Component/Page | Access Level | Feature Gate | Visible Access Path | Classification | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `/sign-in/*` | Clerk `SignIn` / redirect when authenticated | Public | None | Direct auth flow | Public / Alias/redirect | Public before authentication; redirects home after authentication. |
| `/sign-up/*` | Clerk `SignUp` / redirect when authenticated | Public | None | Direct auth flow | Public / Alias/redirect | Public before authentication; redirects home after authentication. |
| `/claim-account` | `ClaimClientProfile` / redirect when authenticated | Public during claim | None | Direct claim flow | Public / Alias/redirect | Used by signed-in users who have not linked a client profile. |
| `/test-client` | `TestClientCreator` | Auth-only | None | Hidden | Debug/development | Development/test support; intentionally excluded from navigation and Tools Directory. |
| `/diagnostic` | `PINAuthDiagnostic` | Auth-only | None | Hidden | Debug/development | Diagnostic support; intentionally excluded from navigation and Tools Directory. |
| `/auth-debug` | `AuthDebug` | Auth-only | None | Hidden | Debug/development | Auth troubleshooting; intentionally excluded from navigation and Tools Directory. |
| `/` | `Home` | Auth-only | None | Navbar / BottomNav Home | Auth-only | Primary authenticated home. |
| `/home` | `Home` | Client/self workspace | None | Hidden alias | Legacy | Supported bookmark alias for client home. |
| `/my-ifs` | `MyIFSWork` | Client/self workspace | None | Tools Directory; Advisor/Admin workspace link | Auth-only | Self-work landing page available to client and Advisor/Admin self workspace. |
| `/my-ifs-path` | `Navigate` to `/my-ifs` | Alias/redirect | None | Hidden | Alias/redirect | Preserved legacy IFS Path alias. |
| `/curriculum` | `CurriculumSystem` | Auth-only | None | Navbar Curriculum; Tools Directory | Auth-only | Primary IFS Path / curriculum entry. |
| `/curriculum/module/:moduleId` | `LearningModuleRenderer` | Auth-only | Module access utility in renderer | Curriculum module links | Auth-only | Direct curriculum module route. |
| `/cheat-sheet` | `CheatSheet` | Auth-only | None | Tools Directory | Auth-only | Client-safe reference tool. |
| `/wounds` | `Wounds` | Auth-only | None | Hidden | Hidden/direct-only | Legacy assessment/support page; not promoted to navigation. |
| `/qualities` | `Qualities` | Auth-only | None | Tools Directory as Self-Energy Practice | Legacy | Retained as current route for Self-energy qualities; `/affirmations` is also visible. |
| `/parts-mapping` | `PartsMapping` | Auth-only | None | Navbar / BottomNav Parts; Tools Directory | Auth-only | Primary Parts Map route. |
| `/exercises` | `Exercises` | Feature-gated | `exercises` | Hidden from top nav; supported direct route | Feature-gated | Existing feature-gated practice page retained but not promoted over Daily Life. |
| `/assessment` | `Assessment` | Auth-only | None | Hidden | Legacy | Legacy singular assessment route; `/assessments` is primary. |
| `/assessments` | `Assessments` | Auth-only | None | Tools Directory; onboarding exception | Auth-only | Primary assessment route. |
| `/resources` | `Resources` | Auth-only | None | Tools Directory | Auth-only | Public-style resource list within authenticated app. |
| `/resource-library` | `ResourceLibrary` | Feature-gated | `resourceLibrary` | Home card; Tools Directory | Feature-gated | Client-safe when enabled; disabled in Tools when unavailable. |
| `/inner-library-mockup` | `InnerLibraryMockup` | Auth-only | None | Hidden | Debug/development | Mockup route intentionally excluded from navigation and Tools Directory. |
| `/journal` | `Journal` | Feature-gated | `journal` | Navbar; Tools Directory | Feature-gated | Reflection/journaling route. |
| `/profile` | `Profile` | Auth-only | None | Navbar / Tools Directory | Auth-only | Profile and assessment results entry. |
| `/tools` | `ToolsDirectory` | Auth-only, role-aware rendering | Per item | Navbar / BottomNav Tools | Auth-only | New organized Tools & Practices directory. |
| `/settings` | `Settings` | Auth-only | None | Settings icon | Auth-only | Account/application settings. |
| `/notifications` | `Notifications` | Auth-only | None | NotificationBell; Tools Directory | Auth-only | Client-safe notification center. |
| `/notification-preferences` | `NotificationPreferences` | Auth-only | None | NotificationBell hover/focus link | Auth-only | Direct notification settings. |
| `/parts-studio` | `PartsStudio` | Feature-gated | `partsStudio` | Tools Directory | Feature-gated | Classified as client-intended optional Parts Work because the route is not role-restricted and has an existing client feature gate. |
| `/micro-learning` | `MicroLearning` | Auth-only | None | Tools Directory | Auth-only | Client-safe optional learning tool. |
| `/affirmations` | `Affirmations` | Auth-only | None | Tools Directory | Auth-only | Client-safe affirmations route. |
| `/therapy` | `TherapyIntegration` | Auth-only | None | Hidden | Hidden/direct-only | Legacy/internal terminology route; not promoted with client-facing language. |
| `/admin` | `TherapistDashboard` | Advisor/Admin | None | Hidden alias | Legacy | Preserved legacy admin/advisor dashboard alias. |
| `/therapist` | `TherapistDashboard` | Advisor/Admin | None | Hidden alias | Legacy | Preserved legacy route; visible label is Advisor Dashboard when surfaced. |
| `/therapist-dashboard` | `TherapistDashboard` | Advisor/Admin | None | Workspace link; Tools Directory | Advisor/Admin | Primary Advisor Dashboard route. |
| `/treatment-plans` | `TreatmentPlans` | Advisor/Admin | None | Tools Directory as Growth Goals | Advisor/Admin | Visible label updated to Growth Goals. |
| `/admin-hub` | `AdminHub` | Admin/Supervisor | None | Admin workspace link; Tools Directory for Admin/Supervisor | Admin/Supervisor | Admin-only assignment and workflow hub. |
| `/co-therapy` | `CoTherapySession` | Advisor/Admin | None | Hidden legacy direct route | Legacy | Retained as legacy live practice route; `/live-co-therapy` is the primary visible Live Practice path. |
| `/live-co-therapy` | `LiveCoTherapy` | Advisor/Admin | None | Tools Directory as Live Practice | Advisor/Admin | Primary Advisor/Admin live guided practice route. |
| `/caseload` | `CaseloadManager` | Advisor/Admin | None | Tools Directory | Advisor/Admin | Visible as Caseload / Clients. |
| `/advisor-messages` | `TherapistMessages` | Advisor/Admin | None | Hidden legacy alias | Legacy | Preserved; `/messages` is primary visible route. |
| `/messages` | `TherapistMessages` | Advisor/Admin | None | Advisor/Admin Navbar; Tools Directory | Advisor/Admin | Primary Advisor/Admin messages route. |
| `/advisor-homework` | `TherapistHomework` | Advisor/Admin | None | Admin Hub; Tools Directory | Advisor/Admin | Visible as Practice Generator and Review Queue. |
| `/advisor-reports` | `TherapistReports` | Advisor/Admin | None | Admin Hub | Advisor/Admin | Existing reports alias. |
| `/advisor/shared-reflections` | `AdvisorSharedReflections` | Advisor/Admin | None | Tools Directory | Advisor/Admin | Advisor shared Life Integration reflections. |
| `/reports` | `TherapistReports` | Advisor/Admin | None | Tools Directory | Advisor/Admin | Grouped under Insights & Reports. |
| `/analytics` | `LongitudinalAnalytics` | Advisor/Admin | None | Tools Directory | Advisor/Admin | Grouped under Insights & Reports. |
| `/longitudinal-analytics` | `LongitudinalAnalytics` | Advisor/Admin | None | Tools Directory | Advisor/Admin | Visible as Longitudinal Insights. |
| `/inbox` | `ClientInbox` | Client/self workspace | None | Client Navbar / BottomNav / Tools Directory | Client | Client Advisor Support messages. |
| `/assigned-practices` | `ClientHomework` | Client/self workspace | None | Home; Tools Directory | Client | Primary client label is Assigned IFS Practices. |
| `/my-homework` | `ClientHomework` | Client/self workspace | None | Hidden alias | Legacy | Preserved bookmark alias; not visible with legacy label. |
| `/homework` | `ClientHomework` | Client/self workspace | None | Notification deep links | Legacy | Preserved compatibility route; visible label remains Assigned IFS Practices. |
| `/pre-session-checkin` | `PreSessionCheckin` | Client/self workspace | None | Home; Tools Directory | Client | Advisor Session Check-In. |
| `/live-session` | `ClientLiveSession` | Client/self workspace | None | Home; Tools Directory | Client | Client Live Guided Practice. |
| `/progress-timeline` | `ProgressTimeline` | Auth-only | None | Tools Directory | Auth-only | Progress route retained for self review. |
| `/healing-timeline` | `HealingTimeline` | Client/self workspace | None | Home; Tools Directory | Client | Healing timeline route. |
| `/mood-tracker` | `MoodTracker` | Auth-only | None | Tools Directory | Auth-only | Client-safe tracker route. |
| `/gamification` | `GamificationHub` | Auth-only | None | Tools Directory | Auth-only | Achievements/progress route. |
| `/parts-dialogue` | `PartsDialogue` | Feature-gated | `partsDialogue` | Home; Tools Directory | Feature-gated | Client-safe when feature is available. |
| `/parts-relationships` | `PartsRelationshipMap` | Auth-only | None | Home; Tools Directory | Auth-only | Inner System Map route. |
| `/life-integration` | `LifeIntegration` | Client/self workspace | None | Navbar / BottomNav Daily Life; Tools Directory | Client | Primary Daily Life practice area. |
| `/life-integration/reflections/:reflectionId` | `LifeIntegrationReflectionDetail` | Client/self workspace | None | Life Integration reflection links | Hidden/direct-only | Detail route reached from Life Integration. |
| `/life-integration/notice-part` | `NoticePartPractice` | Client/self workspace | None | Life Integration cards | Client | Daily Life practice sub-route. |
| `/life-integration/return-to-self` | `ReturnToSelfPractice` | Client/self workspace | None | Life Integration cards | Client | Daily Life practice sub-route. |
| `/life-integration/trigger-reflection` | `TriggerReflectionPractice` | Client/self workspace | None | Life Integration cards | Client | Daily Life practice sub-route. |
| `/life-integration/repair-after-conflict` | `RepairAfterConflictPractice` | Client/self workspace | None | Life Integration cards | Client | Daily Life practice sub-route. |
| `/life-integration/protector-check-in` | `ProtectorCheckInPractice` | Client/self workspace | None | Life Integration cards | Client | Daily Life practice sub-route. |
| `/life-integration/needs-boundaries` | `NeedsBoundariesPractice` | Client/self workspace | None | Life Integration cards | Client | Daily Life practice sub-route. |
| `/unburdening` | `UnburdeningProtocol` | Feature-gated | `unburdening` | Home; Tools Directory | Feature-gated | Optional deeper Parts Work route. |
| `/assessment-builder` | `AssessmentBuilder` | Advisor/Admin | None | Tools Directory | Advisor/Admin | Now protected by `therapistOnly`; visible as Assessment Generator. |
| `/custom-assessment/:assessmentId` | `CustomAssessment` | Auth-only | None | Direct assessment links | Hidden/direct-only | Dynamic assessment route, not a menu item. |
| `/meditation` | `GuidedMeditation` | Feature-gated | `meditations` | Home; Tools Directory | Feature-gated | Primary guided meditation route. |
| `/daily-checkin` | `DailyCheckin` | Feature-gated | `dailyCheckin` | Tools Directory | Feature-gated | Client daily practice route. |
| `/mood-analytics` | `MoodAnalytics` | Client/self workspace + Feature-gated | `moodAnalytics` | Home; Tools Directory | Feature-gated | Client-safe analytics when enabled. |
| `/milestones` | `Milestones` | Feature-gated | `milestones` | Tools Directory | Feature-gated | Milestones route. |
| `/weekly-reflection` | `WeeklyReflection` | Feature-gated | `weeklyReflection` | Home; Tools Directory | Feature-gated | Weekly Reflection route. |
| `/letters` | `LetterWriting` | Feature-gated | `letters` | Tools Directory | Feature-gated | Reflection route. |
| `/parts-cards` | `PartsCards` | Feature-gated | `partsCards` | Tools Directory | Feature-gated | Parts Work route. |
| `/healing-tracker` | `HealingTracker` | Feature-gated | `healingTracker` | Tools Directory | Feature-gated | Reflection/progress route. |
| `*` | `Navigate` or `Home` fallback | Alias/redirect | None | Hidden | Alias/redirect | Redirects unauthenticated users to sign-in/claim; authenticated fallback renders Home. |

## Menu Tree

```text
Navbar (client)
  Home -> /
  Curriculum -> /curriculum
  Daily Life -> /life-integration
  Journal -> /journal
  Parts -> /parts-mapping
  Advisor Support -> /inbox
  Tools -> /tools
  Profile -> /profile

Navbar (Advisor/Admin)
  Advisor Dashboard -> /therapist OR Admin Hub -> /admin-hub
  My IFS Work -> /my-ifs
  Home -> /
  Tools -> /tools
  Messages -> /messages
  Profile -> /profile

Admin Hub
  My IFS Work -> /my-ifs
  Tools Directory -> /tools
  Curriculum & Assessments -> /curriculum
  Assessment Generator -> /assessment-builder
  Practice Generator -> /advisor-homework
  Insights & Reports -> /advisor-reports

Mobile BottomNav (client)
  Home -> /
  Practice -> /life-integration
  Parts -> /parts-mapping
  Advisor -> /inbox
  Tools -> /tools

Mobile BottomNav (Advisor/Admin)
  Home -> /
  Advisor/Admin -> /therapist-dashboard or /admin-hub
  My IFS -> /my-ifs
  Tools -> /tools
  Profile -> /profile

Tools Directory
  Core IFS Path
    Curriculum / IFS Path -> /curriculum
    Wound Assessment / Assessments -> /assessments
    My IFS Work -> /my-ifs
    My Assessments & Progress -> /profile
    Progress Timeline -> /progress-timeline
  Daily Practice
    Daily Check-In -> /daily-checkin
    Daily Life Practice -> /life-integration
    Guided Meditation -> /meditation
    Self-Energy Practice -> /qualities
    Affirmations -> /affirmations
    Micro-Learning -> /micro-learning
    Mood Tracker -> /mood-tracker
  Parts Work
    Parts Map -> /parts-mapping
    Inner System Map -> /parts-relationships
    Parts Dialogue -> /parts-dialogue
    Parts Cards -> /parts-cards
    Parts Studio -> /parts-studio
    Unburdening Practice -> /unburdening
  Reflection & Journaling
    Journal -> /journal
    Letters -> /letters
    Weekly Reflection -> /weekly-reflection
    Healing Tracker -> /healing-tracker
    Milestones -> /milestones
  Advisor Support
    Assigned IFS Practices -> /assigned-practices
    Advisor Session Check-In -> /pre-session-checkin
    Inbox / Messages -> /inbox
    Live Guided Practice -> /live-session
    Notifications -> /notifications
  Progress & Analytics
    Healing Timeline -> /healing-timeline
    Progress Timeline -> /progress-timeline
    Mood Analytics -> /mood-analytics
    Gamification / Achievements -> /gamification
    Milestones -> /milestones
  Advanced / Optional Tools
    Resource Library -> /resource-library
    Resources -> /resources
    IFS Cheat Sheet -> /cheat-sheet
    Micro-Learning -> /micro-learning
    Healing Tracker -> /healing-tracker
    Letters -> /letters
  Admin / Advisor Tools
    Advisor Dashboard -> /therapist
    Admin Hub -> /admin-hub
    Clients -> /therapist
    Caseload -> /caseload
    Curriculum & Assessments -> /curriculum
    Assessment Generator -> /assessment-builder
    Practice Generator -> /advisor-homework
    Review Queue -> /advisor-homework
    Growth Goals -> /treatment-plans
    Advisor Notes -> /therapist
    Shared Reflections -> /advisor/shared-reflections
    Messages -> /messages
    Reports -> /reports
    Analytics -> /analytics
    Longitudinal Insights -> /longitudinal-analytics
    Live Practice -> /live-co-therapy
```

## Hidden Routes

- `/test-client`, `/diagnostic`, and `/auth-debug` remain hidden because they are debug, diagnostic, or development utilities.
- `/inner-library-mockup` remains hidden because it is a mockup route and should not be user-facing.
- `/claim-account`, `/sign-in/*`, `/sign-up/*`, and `*` are auth-flow or redirect routes, not product navigation.
- `/custom-assessment/:assessmentId` remains direct-only because it depends on a specific assessment id.
- `/life-integration/reflections/:reflectionId` remains direct-only because it is reached from Life Integration reflection lists.
- `/therapy` remains hidden because the visible client experience should use Advisor Support and IFS Path language instead of legacy/internal terminology.
- `/wounds` and `/assessment` remain hidden legacy assessment routes because `/assessments` is the primary access path.
- `/co-therapy` remains hidden because `/live-co-therapy` is the primary visible Advisor/Admin Live Practice route.
- Feature-gated tools remain hidden from global nav and appear in the Tools Directory as available links or disabled cards when unavailable.

## Legacy / Alias Routes

- `/home` remains supported as a client home alias.
- `/my-ifs-path` redirects to `/my-ifs`.
- `/admin` and `/therapist` remain supported legacy aliases for `TherapistDashboard`; visible language uses Advisor Dashboard or Admin Hub.
- `/advisor-messages` remains a legacy Advisor messages alias; `/messages` is primary for Advisor/Admin navigation.
- `/my-homework` and `/homework` remain supported client aliases for `ClientHomework`; visible language uses Assigned IFS Practices.
- `/advisor-reports` remains supported as an Advisor reports alias; `/reports` is also visible in the Tools Directory.
- `/analytics` and `/longitudinal-analytics` are grouped under Insights & Reports; `/longitudinal-analytics` is the primary named route for Longitudinal Insights.
- `/qualities` remains supported for Self-Energy Practice while `/affirmations` is separately visible for affirmations.
- `/resources` and `/resource-library` both remain supported; `/resource-library` is feature-gated and `/resources` remains a general resources route.
- `/parts-relationships` remains the Inner System Map route while `/parts-mapping` remains the primary Parts Map route.
- `/mood-tracker` remains the tracker route and `/mood-analytics` remains the feature-gated analytics route.

## Security Notes

- Existing `clientOnly`, `therapistOnly`, Admin/Supervisor checks, protected authenticated app flow, and `FeatureGate` wrappers are preserved.
- `/assessment-builder` is now wrapped with `therapistOnly` because it is surfaced as an Advisor/Admin Assessment Generator tool.
- The Tools Directory renders Admin / Advisor Tools only for `therapist`, `advisor`, `admin`, and `supervisor` roles, and renders Admin Hub only for `admin` and `supervisor` roles. Admin Hub also links back to `/tools` so Advisors/Admins can reach the complete directory from workflow navigation.
- Feature-gated Tools Directory items use `canAccessFeature`; unavailable tools render disabled with “Not available for your account.”
- Debug, diagnostic, mockup, auth-flow, and direct-only dynamic routes are not included in user-facing navigation.
- No SQL or migrations are required for this navigation audit.

## My IFS Runtime QA Notes

- `/my-ifs` uses self-owned profile resolution through `loadMyIFSProfile` and passes the resolved profile id as the effective client id for personal self-work data.
- `/home` may render self-mode data when called from My IFS Work; direct Advisor/Admin `/home` access now points users toward My IFS Work for personal self-work or the Advisor/Admin workspace for operational workflows.
- `/parts-relationships` supports a user-confirmed legacy `parts_map` import from `ifs_interactive_data`; preview is required, selected parts must be confirmed, and the legacy interactive row remains preserved.
- `/tools` remains the main discoverability directory for Curriculum, Assessments, Inner System Map, reflections, Tools & Practices, and Advisor/Admin workflow links.
- Admin/advisor dashboards stay separate from My IFS Work so assigned-client loading does not become self-work loading.
- Self-owned API access allows app users to read their own client-scoped rows regardless of role when the requested client id matches the authenticated app user id.
- Advisor notes and client-hidden reporting data remain blocked from self/client views and are not surfaced in My IFS Work, Client Home, or Tools & Practices cards.

## Phase 15G Visual Polish Notes

- My IFS Work, Home, and Profile now share a calmer curriculum-first visual/data hierarchy with human-readable path and assessment summary labels.
- Tools Directory remains complete for discovery, but its copy positions tools and practices as secondary support for the Curriculum / IFS Path.
- Inner System Map import remains user-confirmed and non-destructive; older saved Parts Map data is preserved unless the user explicitly previews, selects, confirms, and imports.
- Admin/Advisor tools remain role-limited, visually separated from self-work tools, and Admin Hub remains limited to admin/supervisor roles.
- Profile assessment summaries use Wound Patterns / Attachment Pattern language and de-emphasize numeric scores on overview cards.
- No route/security wrapper changes were made for Phase 15G.
- No SQL or migrations were required for Phase 15G.

## Phase 16A Life Integration Toolkit Notes

- `/life-integration` is the client/self-work landing route for **IFS in Daily Life**. It presents Life Integration as a Daily Life Practice toolkit that supports the Curriculum / IFS Path rather than replacing it.
- Six guided practice routes are preserved under the existing self-work route wrapper:
  - `/life-integration/notice-part` — Notice a Part in the Moment.
  - `/life-integration/return-to-self` — Return to Self-Energy.
  - `/life-integration/trigger-reflection` — Reflect on a Trigger.
  - `/life-integration/repair-after-conflict` — Repair After Conflict.
  - `/life-integration/protector-check-in` — Protector Check-In.
  - `/life-integration/needs-boundaries` — Needs & Boundaries Reflection.
- The toolkit connects back to existing app tools including `/curriculum`, `/journal`, `/parts-relationships`, `/parts-dialogue`, `/meditation`, and `/healing-timeline` so Life Integration remains secondary support for the main IFS Path.
- Saved Life Integration reflections use the existing `ifs_life_integration_reflections` storage and API helpers. Reflections are private by default with `is_private = true` and `shared_with_advisor = false` unless the user explicitly chooses Advisor sharing.
- Advisor sharing remains explicit and limited to the existing shared-reflection API/assignment checks; private reflections are not exposed in Advisor/Admin views.
- No SQL or migrations were added for Phase 16A because the existing Life Integration reflection table and check constraint already support the six reflection types.
- Existing `clientOnly`/self-work access wrappers, Advisor/Admin route separation, `FeatureGate` wrappers, and assignment-based shared-reflection authorization are preserved.
- The Tools Directory surfaces Life Integration under Daily Practice while keeping Core IFS Path first, and Home places Life Integration below Curriculum, Assessments & Progress, and the core support tools.

## Phase 16B Life Integration Reflection Integration Notes

- Saved Life Integration reflections now appear on `/life-integration` as recent Daily Life Reflection cards with normalized labels, dates, short non-raw summaries, linked-part names when already available, and Private / Shared with Advisor badges.
- `/home` and `/my-ifs` summarize Daily-life reflections as a secondary self-work signal while preserving the curriculum-first hierarchy.
- `/journal` includes a gentle **Life Integration Reflections** section that references self-owned Life Integration reflections without duplicating them into journal storage.
- `/healing-timeline` includes Life Integration milestones through the healing timeline API using source label `Life Integration` and type-specific milestone titles without exposing raw reflection text.
- `/progress-timeline` includes a **Daily Life Practice** summary with total saved reflections, practiced reflection types, latest reflection date, and timeline entries that use short summaries only.
- Advisor shared-reflection surfaces continue to require explicit `shared_with_advisor = true` and active Advisor assignment; private reflections are not listed for Advisors/Admins.
- Dashboard, journal summary, progress, and timeline cards avoid raw reflection text and show only display labels, dates, short summaries, linked part names when safe, and sharing badges.
- No SQL, migrations, broad backend refactors, or automatic migrations were added for Phase 16B.

## Phase 17A Curriculum Experience Polish Notes

- Curriculum remains the primary app spine: Home, My IFS Work, Tools Directory, and module pages describe the Curriculum / IFS Path as the main guided path.
- Home/My IFS and `/curriculum` share the same progress-summary helper so completed count, current/next module, latest completed module, and Advisor-assigned module state stay aligned.
- Module cards use warm state labels: Completed, Available, Coming up, and Assigned by Advisor, with “This module will open as you continue your IFS path.” for modules not yet available.
- Advisor-assigned module bypass is preserved; assigned modules remain open even when normal sequence prerequisites would otherwise make them later in the path.
- Modules link only to existing support tools such as Journal, Inner System Map, Parts Dialogue, Life Integration, Guided Meditation, Assessments, and Tools Directory.
- Completion polish is front-end only: users are invited to reflect, notice parts in daily life, open the Inner System Map, or return to Curriculum without auto-generating notes or sharing anything with an Advisor.
- Assessment-informed cues remain light and use existing assessment/personalization data already loaded in the curriculum experience; raw scores and clinical interpretations are not shown.
- No new SQL, migrations, schema changes, new AI workflows, or backend expansion were added for Phase 17A.
- Existing security wrappers, role gating, feature gates, and self-owned data access patterns are preserved.

## Phase 17B Curriculum Reflection Integration Notes

- Curriculum module completion can optionally capture a private Module Reflection after the module is already marked complete.
- Module Reflections are optional and never block completion; users can save a private reflection, skip writing, continue to the next module, or return to Curriculum.
- Curriculum reflections are stored with module interactive data in `ifs_interactive_data.data.curriculumReflections`, preserving existing module answers/content and avoiding new SQL migrations.
- Home and My IFS summarize curriculum reflections as a secondary signal beneath the Curriculum / IFS Path card.
- Journal shows a Curriculum Reflections section with module title, date, short summary, privacy badge, and a route back to the module.
- Healing Timeline and Progress Timeline include safe curriculum milestones for module completion and saved Module Reflection activity without displaying raw reflection text.
- Reflections are private by default and use `sharedWithAdvisor: false`; this phase does not add sharing controls or automatic Advisor sharing.
- Advisor/Admin views should not see private curriculum reflection content by default, and reflections are not treated as Advisor notes or report content.
- No SQL migrations were added for this phase.
- Existing role/security wrappers and self-owned access patterns were preserved; no global client loading or name matching was introduced.

## Phase 17C Correct-Repo Runtime Recovery Notes

- The checkout was verified as the React/Vite + Neon/Clerk IFS app with root `package.json`, `src/App.jsx`, `api/db.js`, and the `neon/` directory present before runtime recovery changes were applied.
- Wrong-repo emergency files from the accidental Next.js / `client/src` TypeScript pass were confirmed absent from this repository, so no legitimate `src/` or `api/` app files were removed for that cleanup.
- Medication routes, medication placeholders, medication dashboard tiles, and medication support copy were not added because medication management is out of scope for this IFS self-guidance and Advisor support app. The remaining non-documentation medication search hit is historical CSV/journal text outside active app UI.
- A Vite route error boundary now wraps the authenticated route switch and shows warm recovery actions for Refresh, My IFS Work, Home, Tools, and Go Back instead of exposing raw stack traces or blank pages.
- Unknown authenticated routes now render a Not Found recovery page with links back to My IFS Work, Home, Tools, and role-allowed Advisor/Admin destinations.
- Legacy/back-navigation aliases now use `Navigate` with `replace` for `/home`, `/my-ifs-path`, `/admin`, `/therapist`, `/my-homework`, and `/homework` so browser Back is less likely to return users to stale alias entries or blank route states.
- My IFS connected/profile recovery states are separated: a resolved self profile keeps the connected banner, while optional downstream query failures show a section-level partial refresh warning instead of the global full-page IFS data error.
- Profile loading, error, and empty assessment states are visible, with null/array guards for optional assessment payloads so missing data does not produce a blank route.
- Route-level blank recovery was audited; the Parts Mapping route now has a visible fallback instead of a final `return null` if its local step state becomes unexpected.
- Phase 17B curriculum reflection support is present and preserved through `src/lib/curriculumReflections.js` and existing private `ifs_interactive_data.data.curriculumReflections` storage. No Advisor-facing sharing behavior was added.
- No SQL, migrations, or Neon backfills were added or run for Phase 17C.
- Existing authenticated flow, `clientOnly` / Advisor/Admin wrappers, Admin/Supervisor checks, `FeatureGate` wrappers, self-owned access patterns, and Advisor notes protections were preserved.
