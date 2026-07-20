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
    expect(typeof sc.safety.onAcknowledge).toBe('function');
    expect(typeof sc.snapshot.onGenerate).toBe('function');
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
