import { describe, it, expect } from 'vitest';
import { buildView } from '../AdvisorWorkspaceView.jsx';
import { INITIAL_STATE } from '../AdvisorWorkspace.jsx';
import { LIGHT, CLIENTS, PLAN_PHASES, daysAgoText } from '../advisorWorkspaceData.js';

// Minimal, side-effect-free harness that drives the real derivation engine the
// Advisor Workspace UI renders from.
function makeView(overrides = {}) {
  const S = { ...INITIAL_STATE, ...overrides };
  const theme = S.isDark ? LIGHT : LIGHT; // theme shape identical for these assertions
  const allClients = () => CLIENTS.concat(S.extraClients || []).filter((c) => !S.deletedIds[c.id]);
  const buildTreatmentPlan = (client) => ({
    clientName: client.name, phases: PLAN_PHASES.map((p) => ({ label: p.label, dotStyle: {}, labelStyle: {} })),
    currentPhaseLabel: PLAN_PHASES[0].label, currentPhaseDesc: PLAN_PHASES[0].desc, milestones: [],
  });
  const handlers = new Proxy(
    { isGroupExpanded: () => false },
    { get: (target, prop) => target[prop] || (() => {}) },
  );
  return buildView({ S, theme, allClients, buildTreatmentPlan, handlers, isAdmin: true });
}

describe('buildView — overview metrics', () => {
  const v = makeView();
  it('counts only active clients in the caseload stat', () => {
    // 3 seeded clients, but Sam Okafor is inactive — active caseload is 2.
    expect(v.stats.caseload).toBe(2);
  });
  it('flags clients with active risk for attention', () => {
    // Jordan (high) + Sam (medium) both carry a risk flag in the seed data.
    expect(v.stats.needsAttention).toBe(2);
    expect(v.needsAttention.map((r) => r.name).sort()).toEqual(['Jordan Reyes', 'Sam Okafor']);
  });
  it('counts submitted upcoming sessions and pending reviews', () => {
    expect(v.stats.upcomingSessions).toBe(2); // Maya + Jordan submitted
    expect(v.stats.pendingReviews).toBe(2); // Maya + Jordan pending
  });
});

describe('buildView — navigation', () => {
  const v = makeView();
  it('renders the top-level nav with a review badge', () => {
    const overview = v.navRows.find((r) => r.id === 'overview');
    expect(overview.label).toBe('Overview');
    const review = v.navRows.find((r) => r.id === 'review');
    expect(review.showBadge).toBe(true);
    expect(review.badgeCount).toBe(4); // 2 risks + 2 pending reviews
  });
  it('marks the active tab and defaults to command mode', () => {
    expect(v.isOverview).toBe(true);
    expect(v.isCommandMode).toBe(true);
    expect(v.topbarTitle).toBe('Command Center');
  });
  it('hides the Admin group from non-admin users', () => {
    const admin = makeView(); // isAdmin: true
    expect(admin.navRows.some((r) => r.id === 'admin')).toBe(true);
    const nonAdmin = buildView({
      S: { ...INITIAL_STATE }, theme: LIGHT,
      allClients: () => CLIENTS, buildTreatmentPlan: (c) => ({ clientName: c.name, phases: [], milestones: [], currentPhaseLabel: '', currentPhaseDesc: '' }),
      handlers: new Proxy({ isGroupExpanded: () => false }, { get: (t, p) => t[p] || (() => {}) }),
      isAdmin: false,
    });
    expect(nonAdmin.navRows.some((r) => r.id === 'admin')).toBe(false);
  });
});

describe('buildView — selected client detail', () => {
  const v = makeView();
  it('resolves the selected client and derived labels', () => {
    expect(v.hasSelectedClient).toBe(true);
    expect(v.selectedClient.name).toBe('Maya Chen');
    expect(v.selectedClient.modulesLabel).toBe('9/12');
    expect(v.selectedClient.assessmentBars).toHaveLength(5);
  });
  it('computes MBC change direction as improvement for Maya', () => {
    const phq = v.selectedClient.mbc.find((m) => m.code === 'PHQ-9');
    expect(phq.changeLabel).toBe('-3 pts'); // 6 - 9
    expect(phq.sparkline).toHaveLength(5);
  });
});

describe('buildView — review + safety queues', () => {
  it('lists review items and clears them when reviewed', () => {
    const v = makeView();
    expect(v.reviewItems.length).toBe(4);
    expect(v.reviewQueueEmpty).toBe(false);

    const cleared = makeView({ reviewedIds: { 'risk-c2': true, 'risk-c3': true, 'practice-c1': true, 'practice-c2': true } });
    expect(cleared.reviewItems.length).toBe(0);
    expect(cleared.reviewQueueEmpty).toBe(true);
  });
  it('sorts high-risk safety rows to the top', () => {
    const v = makeView();
    expect(v.safetyRows[0].name).toBe('Jordan Reyes');
    expect(v.safetyRows[0].levelLabel).toBe('High');
  });
});

describe('buildView — filtering and search', () => {
  it('filters the client list by search term', () => {
    const v = makeView({ search: 'jordan' });
    expect(v.clientListFiltered.map((c) => c.name)).toEqual(['Jordan Reyes']);
  });
  it('filters the client list by primary wound', () => {
    const v = makeView({ filterWound: 'neglect' });
    expect(v.clientListFiltered.map((c) => c.name)).toEqual(['Sam Okafor']);
  });
});

const UNASSIGNED_CLIENT = {
  id: 'new1', name: 'Fresh Signup', initial: 'FS', email: '', phone: '', status: 'active', unassigned: true,
  supportPriority: 'standard', primaryWound: 'abandonment', secondaryWound: 'shame',
  progressPct: 0, modulesCompleted: 0, streak: 0, level: 1, lastActiveDays: 0, risk: null,
  scores: { abandonment: 0, shame: 0, neglect: 0, betrayal: 0, helplessness: 0 },
  goals: [], pendingReview: null, session: { when: 'No upcoming session scheduled', status: 'none' },
  recentActivity: [], qaAnswers: [], timeline: [],
  safety: { riskLevel: 'none', protective: [], riskFactors: [], safetyPlan: null, contacts: [], acknowledged: true, ackNote: '' },
  mbc: [], parts: [], messages: [],
};

describe('buildView — unassigned clients (new signups)', () => {
  it('surfaces an unassigned client in the raw picker with a claim action, without hiding it', () => {
    const v = makeView({ extraClients: [UNASSIGNED_CLIENT] });
    const row = v.clientListFiltered.find((c) => c.id === 'new1');
    expect(row).toBeDefined();
    expect(row.unassigned).toBe(true);
    expect(typeof row.onClaim).toBe('function');
  });

  it('counts unassigned clients separately from the assigned "Active caseload" stat', () => {
    const withUnassigned = makeView({ extraClients: [UNASSIGNED_CLIENT] });
    const without = makeView();
    expect(withUnassigned.stats.unassigned).toBe(1);
    expect(withUnassigned.stats.caseload).toBe(without.stats.caseload);
  });

  it('excludes unassigned clients from write-oriented dropdowns (notes, tasks, docs, plans)', () => {
    const v = makeView({ extraClients: [UNASSIGNED_CLIENT] });
    expect(v.clientOptions.some((o) => o.id === 'new1')).toBe(false);
  });

  it('never surfaces an unassigned client in the review queue or safety center', () => {
    const v = makeView({ extraClients: [UNASSIGNED_CLIENT] });
    expect(v.reviewItems.some((r) => r.clientName === 'Fresh Signup')).toBe(false);
    expect(v.safetyRows.some((s) => s.name === 'Fresh Signup')).toBe(false);
  });

  it('wires the claim action through to the onClaimClient handler', () => {
    const calls = [];
    const S = { ...INITIAL_STATE, extraClients: [UNASSIGNED_CLIENT] };
    const theme = LIGHT;
    const allClients = () => CLIENTS.concat(S.extraClients || []).filter((c) => !S.deletedIds[c.id]);
    const buildTreatmentPlan = (client) => ({ clientName: client.name, phases: [], currentPhaseLabel: '', currentPhaseDesc: '', milestones: [] });
    const handlers = new Proxy(
      { isGroupExpanded: () => false, onClaimClient: (id) => calls.push(id) },
      { get: (target, prop) => target[prop] || (() => {}) },
    );
    const v = buildView({ S, theme, allClients, buildTreatmentPlan, handlers, isAdmin: true });
    v.clientListFiltered.find((c) => c.id === 'new1').onClaim();
    expect(calls).toEqual(['new1']);
  });
});

describe('daysAgoText — no-activity sentinel', () => {
  it('never renders the internal 999-day sentinel as a literal day count', () => {
    expect(daysAgoText(999)).toBe('No activity recorded');
    expect(daysAgoText(null)).toBe('No activity recorded');
  });
  it('still formats real day counts normally', () => {
    expect(daysAgoText(0)).toBe('Today');
    expect(daysAgoText(1)).toBe('Yesterday');
    expect(daysAgoText(5)).toBe('5 days ago');
  });
});

describe('buildView — unassigned clients never inflate nav badges or hijack write-only fallbacks', () => {
  const RISKY_UNASSIGNED = {
    ...UNASSIGNED_CLIENT,
    id: 'new2', name: 'Risky Signup',
    risk: { type: 'inactivity', level: 'high', detail: 'No login or activity has been recorded yet.', daysAgo: 999 },
    pendingReview: { label: 'Intake worksheet', daysAgo: 1 },
    safety: { riskLevel: 'high', protective: [], riskFactors: ['New signup'], safetyPlan: null, contacts: [], acknowledged: false, ackNote: '' },
  };

  it('excludes an unassigned client\'s risk/pending-review from the review and safety nav badges', () => {
    const baseline = makeView();
    const withRisky = makeView({ extraClients: [RISKY_UNASSIGNED] });
    const reviewBadge = (v) => v.navRows.find((r) => r.id === 'review').badgeCount;
    const safetyBadge = (v) => v.navRows.find((r) => r.id === 'safety').badgeCount;
    expect(reviewBadge(withRisky)).toBe(reviewBadge(baseline));
    expect(safetyBadge(withRisky)).toBe(safetyBadge(baseline));
    // Sanity check the fixture would have moved the badges if it were counted.
    expect(withRisky.reviewItems.some((r) => r.clientName === 'Risky Signup')).toBe(false);
    expect(withRisky.safetyRows.some((s) => s.name === 'Risky Signup')).toBe(false);
  });

  it('never falls back to an unassigned client for co-therapy or treatment-plan creation', () => {
    // An Advisor with zero assigned clients (only an unassigned signup) should
    // see an empty state, not silently get routed to that unclaimed client.
    const S = { ...INITIAL_STATE, deletedIds: Object.fromEntries(CLIENTS.map((c) => [c.id, true])), extraClients: [UNASSIGNED_CLIENT] };
    const theme = LIGHT;
    const allClients = () => CLIENTS.concat(S.extraClients || []).filter((c) => !S.deletedIds[c.id]);
    const buildTreatmentPlan = (client) => ({ clientName: client.name, phases: [], currentPhaseLabel: '', currentPhaseDesc: '', milestones: [] });
    const handlers = new Proxy({ isGroupExpanded: () => false }, { get: (t, p) => t[p] || (() => {}) });
    const v = buildView({ S, theme, allClients, buildTreatmentPlan, handlers, isAdmin: true });
    expect(v.hasCoTherapyClient).toBe(false);
    expect(v.coTherapy).toBeNull();
    expect(v.hasPlanClient).toBe(false);
    expect(v.treatmentPlan).toBeNull();
  });
});

describe('buildView — write actions are gated until a client is claimed', () => {
  it('omits write handlers on the selected client when it is unassigned', () => {
    const v = makeView({ extraClients: [UNASSIGNED_CLIENT], selectedClientId: 'new1' });
    const sc = v.selectedClient;
    expect(sc.id).toBe('new1');
    expect(sc.canWrite).toBe(false);
    expect(sc.onDraftNote).toBeUndefined();
    expect(sc.onOpenPrep).toBeUndefined();
    expect(sc.onExportReport).toBeUndefined();
    expect(sc.onOpenPlan).toBeUndefined();
    expect(sc.onOpenPractice).toBeUndefined();
    expect(sc.onStartDelete).toBeUndefined();
    expect(sc.safety.onAcknowledge).toBeUndefined();
    expect(sc.safety.onCreatePlan).toBeUndefined();
    expect(sc.snapshot.onGenerate).toBeUndefined();
  });

  it('keeps write handlers wired for an assigned selected client', () => {
    const v = makeView({ selectedClientId: 'c1' });
    const sc = v.selectedClient;
    expect(sc.canWrite).toBe(true);
    expect(typeof sc.onDraftNote).toBe('function');
    expect(typeof sc.onExportReport).toBe('function');
    expect(typeof sc.safety.onAcknowledge).toBe('function');
    expect(typeof sc.snapshot.onGenerate).toBe('function');
  });

  it('routes onExportReport to the handler with the selected client id', () => {
    const calls = [];
    const S = { ...INITIAL_STATE, selectedClientId: 'c1' };
    const theme = LIGHT;
    const allClients = () => CLIENTS.concat(S.extraClients || []).filter((c) => !S.deletedIds[c.id]);
    const buildTreatmentPlan = (client) => ({ clientName: client.name, phases: [], currentPhaseLabel: '', currentPhaseDesc: '', milestones: [] });
    const handlers = new Proxy(
      { isGroupExpanded: () => false, onExportReport: (id) => calls.push(id) },
      { get: (target, prop) => target[prop] || (() => {}) },
    );
    const v = buildView({ S, theme, allClients, buildTreatmentPlan, handlers, isAdmin: true });
    v.selectedClient.onExportReport();
    expect(calls).toEqual(['c1']);
  });

  it('disables export while a real client\'s detail fetch is still in flight', () => {
    const S = { ...INITIAL_STATE, selectedClientId: 'c1', extraClients: [{ ...CLIENTS[0], id: 'loading1', _detailLoaded: false }] };
    S.selectedClientId = 'loading1';
    const theme = LIGHT;
    const allClients = () => CLIENTS.concat(S.extraClients || []).filter((c) => !S.deletedIds[c.id]);
    const buildTreatmentPlan = (client) => ({ clientName: client.name, phases: [], currentPhaseLabel: '', currentPhaseDesc: '', milestones: [] });
    const handlers = new Proxy({ isGroupExpanded: () => false }, { get: (target, prop) => target[prop] || (() => {}) });
    const v = buildView({ S, theme, allClients, buildTreatmentPlan, handlers, isAdmin: true });
    expect(v.selectedClient.onExportReport).toBeUndefined();
    expect(v.selectedClient.exportReportLoading).toBe(true);
  });
});

describe('buildView — check-in & module response answers (qaAnswers)', () => {
  it('surfaces real qaAnswers for a client and flags noQaAnswers false', () => {
    const v = makeView({ selectedClientId: 'c1' });
    const sc = v.selectedClient;
    expect(sc.qaAnswers.length).toBeGreaterThan(0);
    expect(sc.noQaAnswers).toBe(false);
  });

  it('flags noQaAnswers true when a client has no real answers recorded', () => {
    const v = makeView({ extraClients: [{ ...CLIENTS[0], id: 'empty1', qaAnswers: [] }], selectedClientId: 'empty1' });
    expect(v.selectedClient.qaAnswers).toEqual([]);
    expect(v.selectedClient.noQaAnswers).toBe(true);
  });

  it('normalizes a missing qaAnswers field (legacy/partially-loaded client) to an empty array instead of throwing', () => {
    const { qaAnswers: _qaAnswers, ...clientWithoutQaAnswers } = CLIENTS[0];
    const v = makeView({ extraClients: [{ ...clientWithoutQaAnswers, id: 'legacy1' }], selectedClientId: 'legacy1' });
    expect(v.selectedClient.qaAnswers).toEqual([]);
    expect(v.selectedClient.noQaAnswers).toBe(true);
  });
});

describe('buildView — AI Session Snapshot', () => {
  it('surfaces loading/error state and only offers copy once a snapshot exists', () => {
    const idle = makeView({ selectedClientId: 'c1' });
    expect(idle.selectedClient.snapshot.loading).toBe(false);
    expect(idle.selectedClient.snapshot.hasData).toBe(false);
    expect(idle.selectedClient.snapshot.onCopy).toBeUndefined();

    const loading = makeView({ selectedClientId: 'c1', sessionSnapshot: { loading: true, data: null, error: '' } });
    expect(loading.selectedClient.snapshot.loading).toBe(true);

    const errored = makeView({ selectedClientId: 'c1', sessionSnapshot: { loading: false, data: null, error: 'Unable to generate Advisor Session Snapshot.' } });
    expect(errored.selectedClient.snapshot.error).toBe('Unable to generate Advisor Session Snapshot.');

    const snapshotData = { snapshot_title: 'Pre-session summary', advisor_review_disclaimer: 'AI-generated draft for Advisor review.', suggested_session_questions: ['What has shifted since last session?'] };
    const ready = makeView({ selectedClientId: 'c1', sessionSnapshot: { loading: false, data: snapshotData, error: '' } });
    expect(ready.selectedClient.snapshot.hasData).toBe(true);
    expect(ready.selectedClient.snapshot.data.snapshot_title).toBe('Pre-session summary');
    expect(typeof ready.selectedClient.snapshot.onCopy).toBe('function');
  });

  it('never offers snapshot generation for an unassigned client, even mid-request', () => {
    const v = makeView({ extraClients: [UNASSIGNED_CLIENT], selectedClientId: 'new1', sessionSnapshot: { loading: true, data: null, error: '' } });
    expect(v.selectedClient.snapshot.onGenerate).toBeUndefined();
  });
});

describe('buildView — Since Last Session change summary', () => {
  it('surfaces loading/error/data state', () => {
    const idle = makeView({ selectedClientId: 'c1' });
    expect(idle.selectedClient.changeSummary.loading).toBe(false);
    expect(idle.selectedClient.changeSummary.data).toBeNull();

    const loading = makeView({ selectedClientId: 'c1', changeSummary: { loading: true, data: null, error: '' } });
    expect(loading.selectedClient.changeSummary.loading).toBe(true);

    const errored = makeView({ selectedClientId: 'c1', changeSummary: { loading: false, data: null, error: 'Unable to generate a change summary.' } });
    expect(errored.selectedClient.changeSummary.error).toBe('Unable to generate a change summary.');

    const summaryData = { summary: '1. Recent themes\nStable week.', disclaimer: 'AI-generated draft for Advisor review.', generatedAt: '2026-07-20T00:00:00Z', dataSources: { moodEntries: 3, journalEntries: 0, sparse: false, unavailableSources: [] } };
    const ready = makeView({ selectedClientId: 'c1', changeSummary: { loading: false, data: summaryData, error: '' } });
    expect(ready.selectedClient.changeSummary.data.summary).toContain('Recent themes');
  });

  it('never offers change-summary generation for an unassigned client', () => {
    const v = makeView({ extraClients: [UNASSIGNED_CLIENT], selectedClientId: 'new1' });
    expect(v.selectedClient.changeSummary.onGenerate).toBeUndefined();
  });

  it('keeps change-summary generation wired for an assigned client', () => {
    const v = makeView({ selectedClientId: 'c1' });
    expect(typeof v.selectedClient.changeSummary.onGenerate).toBe('function');
  });
});

describe('buildView — real notification feed', () => {
  const REAL_NOTIFICATIONS = [
    { id: 'n1', clientId: 'c1', type: 'homework_completed', priority: 'high', title: 'Practice completed', message: 'Maya finished a module.', date: 'Today', read: false },
    { id: 'n2', clientId: 'c2', type: 'session_agenda_submitted', priority: 'medium', title: 'Check-in submitted', message: '', date: 'Yesterday', read: true },
    { id: 'n3', clientId: null, type: 'general_update', priority: 'low', title: 'System update', message: '', date: '2 days ago', read: false },
    { id: 'n4', clientId: 'not-in-caseload', type: 'homework_completed', priority: 'low', title: 'Stale reference', message: '', date: '3 days ago', read: false },
  ];

  it('maps real notification rows, unread first, with a client-open action only when the client is actually resolvable in the workspace', () => {
    const v = makeView({ notifications: REAL_NOTIFICATIONS });
    expect(v.notificationRows).toHaveLength(4);
    expect(v.notificationRows.every((r) => typeof r.priorityChip === 'object')).toBe(true); // severityStyle never throws on a mapped priority
    const noClient = v.notificationRows.find((r) => r.id === 'n3');
    expect(noClient.onOpenClient).toBeUndefined();
    const withClient = v.notificationRows.find((r) => r.id === 'n1');
    expect(typeof withClient.onOpenClient).toBe('function');
    // A clientId that doesn't resolve to a loaded client (unassigned/removed/
    // stale reference) must not offer a dead-end navigation action either.
    const staleClient = v.notificationRows.find((r) => r.id === 'n4');
    expect(staleClient.onOpenClient).toBeUndefined();
  });

  it('counts unread notifications for the nav badge', () => {
    const v = makeView({ notifications: REAL_NOTIFICATIONS });
    expect(v.notifUnreadCount).toBe(3); // n1, n3, and n4 are unread
  });

  it('shows the empty state once the real feed has loaded with nothing in it', () => {
    const v = makeView({ notifications: [] });
    expect(v.noNotifications).toBe(true);
  });
});

describe('buildView — Document Creator reflects the real report-generation backend', () => {
  it('only offers the document types and sections api/generate-report.js actually supports', () => {
    const v = makeView();
    expect(v.docTypeOptions.map((t) => t.id).sort()).toEqual(['client_progress_summary', 'clinical_summary']);
    expect(v.docSourceRows.map((s) => s.id)).toContain('includeTreatmentPlans');
    expect(v.docSourceRows.every((s) => typeof s.desc === 'string' && s.desc.length > 0)).toBe(true);
  });

  it('surfaces generation loading/error state and the generated document for preview', () => {
    const loading = makeView({ docGenerating: true });
    expect(loading.docGenerating).toBe(true);
    expect(loading.hasGeneratedDoc).toBe(false);

    const errored = makeView({ docError: 'Client is not assigned to this therapist' });
    expect(errored.docError).toBe('Client is not assigned to this therapist');

    const withDoc = makeView({ generatedDoc: { html: '<html>x</html>', reportId: 'r1', title: 'Clinical Summary Report' } });
    expect(withDoc.hasGeneratedDoc).toBe(true);
    expect(withDoc.generatedDoc.html).toContain('x');
  });

  it('maps real report audit rows for the client-history list', () => {
    const v = makeView({
      clientReports: [
        { id: 'r1', report_type: 'clinical_summary', title: 'Clinical Summary — Maya Chen', sections_included: ['Growth Goals'], generated_at: '2026-07-01T00:00:00Z' },
      ],
    });
    expect(v.clientReportRows).toHaveLength(1);
    expect(v.clientReportRows[0].title).toBe('Clinical Summary — Maya Chen');
    expect(v.noClientReports).toBe(false);

    const empty = makeView({ clientReports: [] });
    expect(empty.noClientReports).toBe(true);
  });
});

describe('buildView — Assessments tab reflects the real wound-pattern assessment history', () => {
  const CLIENT_WITH_HISTORY = {
    ...UNASSIGNED_CLIENT, id: 'ah1', name: 'History Test', unassigned: false,
    assessmentHistory: [
      {
        id: 'a2', date: '2026-07-01T00:00:00Z', dateLabel: 'Jul 1, 2026', primaryWound: 'betrayal', secondaryWound: 'helplessness',
        subscales: [
          { wound: 'abandonment', score: 5, severity: 'Low', delta: -1 },
          { wound: 'shame', score: 6, severity: 'Low', delta: 1 },
          { wound: 'neglect', score: 4, severity: 'Low', delta: -1 },
          { wound: 'betrayal', score: 12, severity: 'Moderate', delta: -8 },
          { wound: 'helplessness', score: 9, severity: 'Low', delta: -6 },
        ],
      },
      {
        id: 'a1', date: '2026-06-01T00:00:00Z', dateLabel: 'Jun 1, 2026', primaryWound: 'betrayal', secondaryWound: 'helplessness',
        subscales: [
          { wound: 'abandonment', score: 6, severity: 'Low', delta: null },
          { wound: 'shame', score: 5, severity: 'Low', delta: null },
          { wound: 'neglect', score: 5, severity: 'Low', delta: null },
          { wound: 'betrayal', score: 20, severity: 'High', delta: null },
          { wound: 'helplessness', score: 15, severity: 'Moderate', delta: null },
        ],
      },
    ],
  };

  it('maps the newest-first history with per-subscale severity and delta', () => {
    const v = makeView({ extraClients: [CLIENT_WITH_HISTORY], selectedClientId: 'ah1' });
    const sc = v.selectedClient;
    expect(sc.noAssessmentHistory).toBe(false);
    expect(sc.assessmentHistory).toHaveLength(2);
    expect(sc.assessmentHistory[0].id).toBe('a2'); // most recent first
    const betrayal = sc.assessmentHistory[0].subscales.find((s) => s.wound === 'betrayal');
    expect(betrayal.scoreLabel).toBe('12/25');
    expect(betrayal.severityLabel).toBe('Moderate');
    expect(betrayal.deltaLabel).toBe('-8 pts');
    const firstRetakeBetrayal = sc.assessmentHistory[1].subscales.find((s) => s.wound === 'betrayal');
    expect(firstRetakeBetrayal.deltaLabel).toBe('First retake');
  });

  it('shows an explicit empty state for a client who has never taken the assessment', () => {
    const v = makeView({ selectedClientId: 'c1' }); // seeded demo clients carry no real assessmentHistory
    expect(v.selectedClient.noAssessmentHistory).toBe(true);
    expect(v.selectedClient.assessmentHistory).toEqual([]);
  });
});

describe('buildView — Between Sessions reflects real analytics data', () => {
  const CLIENT_WITH_ACTIVITY = {
    ...UNASSIGNED_CLIENT, id: 'bs1', name: 'Activity Test', unassigned: false,
    betweenSession: {
      homeworkFunnel: { totalAssigned: 6, inProgress: 1, completed: 4, reviewed: 3, completionPct: 67, avgDaysToComplete: 2.5 },
      moodEntries: [
        { id: 'm1', dateLabel: 'Jul 1', mood: 3, energy: 6, emotions: ['Anxious'] },
        { id: 'm2', dateLabel: 'Jul 10', mood: 5, energy: 8, emotions: ['Hopeful', 'Calm'] },
      ],
      moodTrend: [{ week: '2026-W26', value: 3 }, { week: '2026-W28', value: 5 }],
      energyTrend: [{ week: '2026-W26', value: 6 }],
      journalWeekly: [{ week: '2026-W27', count: 2 }],
      assignments: [
        { id: 'hw1', title: 'Self-Connection Journal', status: 'reviewed', statusLabel: 'Reviewed', instructions: 'Focus on the abandonment part.', advisorFeedback: 'Great insight.', assignedDateLabel: 'Jun 1', completedDateLabel: 'Jun 5' },
        { id: 'hw2', title: 'mod-2', status: 'assigned', statusLabel: 'Assigned', instructions: '', advisorFeedback: '', assignedDateLabel: 'Jun 10', completedDateLabel: '' },
      ],
      freeformAssignments: [
        { id: 'fh1', title: 'Notice the protector', statusLabel: 'Completed', description: 'Journal about your inner critic.', completionNotes: 'It showed up before my meeting.', interactiveSummary: [], completedDateLabel: 'Jun 5', dueDateLabel: '' },
      ],
      hasMoodData: true, hasJournalData: true, hasHomeworkData: true,
    },
  };

  it('maps the real homework funnel, mood/energy trend, and recent check-ins', () => {
    const v = makeView({ extraClients: [CLIENT_WITH_ACTIVITY], selectedClientId: 'bs1' });
    const bs = v.selectedClient.betweenSession;
    expect(bs.hasHomeworkData).toBe(true);
    expect(bs.funnelRows.map((f) => f.value)).toEqual([6, 1, 4, 3]);
    expect(bs.completionPct).toBe(67);
    expect(bs.avgDaysToComplete).toBe(2.5);
    expect(bs.moodTrendBars).toHaveLength(2);
    expect(bs.energyTrendBars).toHaveLength(1);
    expect(bs.journalWeeklyBars).toHaveLength(1);
    expect(bs.noMoodEntries).toBe(false);
    expect(bs.moodRows[0].moodLabel).toBe('Okay'); // mood 3
    expect(bs.moodRows[1].moodLabel).toBe('Great'); // mood 5
    expect(bs.moodRows[1].emotionsLabel).toBe('Hopeful, Calm');
  });

  it('falls back to a neutral empty shape for demo clients (no real betweenSession field)', () => {
    const v = makeView({ selectedClientId: 'c1' });
    const bs = v.selectedClient.betweenSession;
    expect(bs.hasHomeworkData).toBe(false);
    expect(bs.noMoodEntries).toBe(true);
    expect(bs.moodTrendBars).toEqual([]);
    expect(bs.noAssignments).toBe(true);
    expect(bs.assignmentRows).toEqual([]);
  });

  it('maps real per-assignment homework detail (title, status, instructions, advisor feedback)', () => {
    const v = makeView({ extraClients: [CLIENT_WITH_ACTIVITY], selectedClientId: 'bs1' });
    const bs = v.selectedClient.betweenSession;
    expect(bs.noAssignments).toBe(false);
    expect(bs.assignmentRows).toHaveLength(2);
    expect(bs.assignmentRows[0].title).toBe('Self-Connection Journal');
    expect(bs.assignmentRows[0].statusLabel).toBe('Reviewed');
    expect(bs.assignmentRows[0].instructions).toBe('Focus on the abandonment part.');
    expect(bs.assignmentRows[0].advisorFeedback).toBe('Great insight.');
    expect(bs.assignmentRows[0].dateLabel).toBe('Completed Jun 5');
    expect(bs.assignmentRows[1].dateLabel).toBe('Assigned Jun 10');
  });

  it('maps real custom (freeform) homework with completion notes, and flags noFreeformAssignments for clients with none', () => {
    const withCustom = makeView({ extraClients: [CLIENT_WITH_ACTIVITY], selectedClientId: 'bs1' });
    const bs = withCustom.selectedClient.betweenSession;
    expect(bs.noFreeformAssignments).toBe(false);
    expect(bs.freeformAssignmentRows).toHaveLength(1);
    expect(bs.freeformAssignmentRows[0].title).toBe('Notice the protector');
    expect(bs.freeformAssignmentRows[0].completionNotes).toBe('It showed up before my meeting.');
    expect(bs.freeformAssignmentRows[0].dateLabel).toBe('Completed Jun 5');

    const demo = makeView({ selectedClientId: 'c1' });
    expect(demo.selectedClient.betweenSession.noFreeformAssignments).toBe(true);
  });
});

describe('buildView — unified timeline gives every event a stable key', () => {
  it('falls back to a synthetic id when a timeline entry has none (demo seed data)', () => {
    const v = makeView({ selectedClientId: 'c1' }); // seeded demo timeline entries carry no id field
    expect(v.selectedClient.timeline.length).toBeGreaterThan(0);
    expect(v.selectedClient.timeline.every((e) => typeof e.id === 'string' && e.id.length > 0)).toBe(true);
    expect(new Set(v.selectedClient.timeline.map((e) => e.id)).size).toBe(v.selectedClient.timeline.length);
  });

  it('preserves a real id computed by the loader when one is present', () => {
    const client = { ...UNASSIGNED_CLIENT, id: 'tl1', name: 'Timeline Test', unassigned: false, timeline: [{ id: 'note-2026-07-10T00:00:00Z-0', type: 'note', label: 'Session Note signed', date: 'Jul 10' }] };
    const v = makeView({ extraClients: [client], selectedClientId: 'tl1' });
    expect(v.selectedClient.timeline[0].id).toBe('note-2026-07-10T00:00:00Z-0');
  });
});

describe('buildView — Life Reflections reflects real shared reflections', () => {
  const RAW_REFLECTION = {
    id: 'r1', reflection_type: 'trigger_reflection', label: 'Reflected on a Trigger', summary: 'You reflected on a trigger and what parts may need.',
    situation: 'Partner was late texting back', part_noticed: '', body_sensation: '', emotion: 'Anxious', need_or_message: '', self_energy_response: '', next_step: '',
    linkedPartName: 'The Watcher', created_at: '2026-07-01T00:00:00Z',
  };

  it('never offers reflections for an unassigned client, and shows a claim prompt instead', () => {
    const v = makeView({ extraClients: [UNASSIGNED_CLIENT], selectedClientId: 'new1', lifeReflections: [RAW_REFLECTION] });
    expect(v.selectedClient.lifeReflections.canView).toBe(false);
    expect(v.selectedClient.lifeReflections.rows).toEqual([]);
  });

  it('maps real reflection rows for an assigned client, filtering out empty fields', () => {
    const v = makeView({ selectedClientId: 'c1', lifeReflections: [RAW_REFLECTION] });
    const lr = v.selectedClient.lifeReflections;
    expect(lr.canView).toBe(true);
    expect(lr.rows).toHaveLength(1);
    expect(lr.rows[0].label).toBe('Reflected on a Trigger');
    expect(lr.rows[0].linkedPartName).toBe('The Watcher');
    // Only situation and emotion were non-empty on the fixture.
    expect(lr.rows[0].fields.map(([label]) => label)).toEqual(['Situation', 'Emotion']);
    expect(lr.noReflections).toBe(false);
  });

  it('shows the empty state once loaded with no shared reflections', () => {
    const v = makeView({ selectedClientId: 'c1', lifeReflections: [], lifeReflectionsLoading: false });
    expect(v.selectedClient.lifeReflections.noReflections).toBe(true);
  });

  it('does not show the empty state while still loading', () => {
    const v = makeView({ selectedClientId: 'c1', lifeReflections: [], lifeReflectionsLoading: true });
    expect(v.selectedClient.lifeReflections.loading).toBe(true);
    expect(v.selectedClient.lifeReflections.noReflections).toBe(false);
  });
});
