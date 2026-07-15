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
  const handlers = new Proxy({}, { get: () => (S.__isGroup ? false : () => {}) });
  handlers.isGroupExpanded = () => false;
  return buildView({ S, theme, allClients, buildTreatmentPlan, handlers });
}

describe('buildView — overview metrics', () => {
  const v = makeView();
  it('counts the seeded caseload', () => {
    expect(v.stats.caseload).toBe(3);
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
