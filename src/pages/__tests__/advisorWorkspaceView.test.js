import { describe, it, expect } from 'vitest';
import { buildView } from '../AdvisorWorkspaceView.jsx';
import { INITIAL_STATE } from '../AdvisorWorkspace.jsx';
import { LIGHT, CLIENTS, PLAN_PHASES } from '../advisorWorkspaceData.js';

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
