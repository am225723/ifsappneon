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
  it('surfaces unread messages and open tasks as dashboard tiles, not just nav badges', () => {
    // Maya + Jordan each have an unread client message in the seed data; Sam has none.
    expect(v.stats.unreadMessages).toBe(2);
    // 4 seeded demo tasks, all open.
    expect(v.stats.openTasks).toBe(4);
  });
  it('the unread-messages and open-tasks tiles jump to their respective tabs', () => {
    let tabSet = null;
    const view = buildView({
      S: { ...INITIAL_STATE }, theme: LIGHT, allClients: () => CLIENTS,
      buildTreatmentPlan: (c) => ({ clientName: c.name, phases: [], milestones: [], currentPhaseLabel: '', currentPhaseDesc: '' }),
      handlers: new Proxy({ isGroupExpanded: () => false, setTab: (id) => { tabSet = id; } }, { get: (t, p) => t[p] || (() => {}) }),
      isAdmin: true,
    });
    view.goToMessages();
    expect(tabSet).toBe('messages');
    view.goToTasks();
    expect(tabSet).toBe('tasks');
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

describe('buildView — Session Prep surfaces real session agendas', () => {
  const CLIENT_WITH_AGENDA = {
    ...CLIENTS[0], id: 'sp1', name: 'Agenda Test', session: { when: 'Tomorrow, 2:00 PM', status: 'submitted' },
    agendas: [
      { id: 'ag1', dateLabel: 'Jul 20', statusLabel: 'Submitted', reviewed: false, topics: 'Boundary setting', activeParts: ['The Watcher'], stuckPoints: 'Not sure how to start.', goalsForSession: 'Practice saying no.', currentStressLevel: 6, currentMoodLabel: 'Anxious', safetyConcerns: '' },
    ],
  };

  it('maps real agenda fields into prepList and routes onMarkReviewed with the client and agenda id', () => {
    const calls = [];
    const S = { ...INITIAL_STATE, extraClients: [CLIENT_WITH_AGENDA] };
    const theme = LIGHT;
    const allClients = () => CLIENTS.concat(S.extraClients || []).filter((c) => !S.deletedIds[c.id]);
    const buildTreatmentPlan = (client) => ({ clientName: client.name, phases: [], currentPhaseLabel: '', currentPhaseDesc: '', milestones: [] });
    const handlers = new Proxy(
      { isGroupExpanded: () => false, onMarkAgendaReviewed: (clientId, agendaId) => calls.push([clientId, agendaId]) },
      { get: (target, prop) => target[prop] || (() => {}) },
    );
    const v = buildView({ S, theme, allClients, buildTreatmentPlan, handlers, isAdmin: true });
    const prep = v.prepList.find((p) => p.id === 'sp1');
    expect(prep.agendas).toHaveLength(1);
    expect(prep.agendas[0].topics).toBe('Boundary setting');
    expect(prep.agendas[0].currentStressLevel).toBe(6);
    prep.agendas[0].onMarkReviewed();
    expect(calls).toEqual([['sp1', 'ag1']]);
  });
});

describe('buildView — Part relationships', () => {
  it('surfaces real part relationships and flags noPartRelationships false', () => {
    const client = {
      ...CLIENTS[0], id: 'pr1',
      partRelationships: [{ id: 'r1', fromName: 'The Watcher', toName: 'The Wounded Child', typeLabel: 'protects', label: '', description: 'Shows up first in conflict.' }],
    };
    const v = makeView({ extraClients: [client], selectedClientId: 'pr1' });
    const sc = v.selectedClient;
    expect(sc.noPartRelationships).toBe(false);
    expect(sc.partRelationships[0].fromName).toBe('The Watcher');
    expect(sc.partRelationships[0].description).toBe('Shows up first in conflict.');
  });

  it('flags noPartRelationships true for a client with none, and normalizes a missing field to an empty array', () => {
    const v = makeView({ selectedClientId: 'c1' }); // demo seed client has no partRelationships field
    expect(v.selectedClient.partRelationships).toEqual([]);
    expect(v.selectedClient.noPartRelationships).toBe(true);
  });

  // ifs_part_relationships has no RLS policy scoping reads to the client's
  // assigned Advisor at all, so this must never surface for an unassigned
  // client even if the loader somehow still populated the field.
  it('never surfaces part relationships for an unassigned client, even if the raw field is populated', () => {
    const client = {
      ...UNASSIGNED_CLIENT, id: 'pr2',
      partRelationships: [{ id: 'r1', fromName: 'The Watcher', toName: 'The Wounded Child', typeLabel: 'protects', label: '', description: 'Shows up first in conflict.' }],
    };
    const v = makeView({ extraClients: [client], selectedClientId: 'pr2' });
    const sc = v.selectedClient;
    expect(sc.partRelationships).toEqual([]);
    expect(sc.noPartRelationships).toBe(true);
  });
});

describe('buildView — Live Sessions reflects real ifs_live_sessions rows', () => {
  it('maps a real active session row to a client name/initial, a toggle label, and working handlers', () => {
    const calls = [];
    const S = { ...INITIAL_STATE, liveSessions: [{ id: 'ls1', clientId: 'c1', status: 'active', activity: 'guided_breathing', startedAt: '5 min ago' }] };
    const theme = LIGHT;
    const allClients = () => CLIENTS;
    const buildTreatmentPlan = (client) => ({ clientName: client.name, phases: [], currentPhaseLabel: '', currentPhaseDesc: '', milestones: [] });
    const handlers = new Proxy(
      { isGroupExpanded: () => false, toggleLiveSession: (id) => calls.push(['toggle', id]), endLiveSession: (id) => calls.push(['end', id]), selectClient: (id) => calls.push(['select', id]) },
      { get: (target, prop) => target[prop] || (() => {}) },
    );
    const v = buildView({ S, theme, allClients, buildTreatmentPlan, handlers, isAdmin: true });
    expect(v.noLiveSessions).toBe(false);
    expect(v.liveSessionRows).toHaveLength(1);
    const row = v.liveSessionRows[0];
    expect(row.name).toBe('Maya Chen'); // c1 in the seeded CLIENTS list
    expect(row.statusLabel).toBe('Active');
    expect(row.toggleLabel).toBe('Pause');
    row.onToggle();
    row.onEnd();
    row.onOpenClient();
    expect(calls).toEqual([['toggle', 'ls1'], ['end', 'ls1'], ['select', 'c1']]);
  });

  it('flags noLiveSessions true once the demo seed rows are cleared for a real caseload', () => {
    const v = makeView({ liveSessions: [] });
    expect(v.noLiveSessions).toBe(true);
    expect(v.liveSessionRows).toEqual([]);
  });
});

describe('buildView — real caseload risk alerts (api/risk-alerts.js)', () => {
  it('enriches a client with no base risk when a real alert exists, with a title matching the reason type', () => {
    const v = makeView({ riskAlerts: [{ clientId: 'c1', reasons: ['Mood score 2/5 in the last 7 days'], type: 'mood', level: 'high', daysAgo: 1 }] });
    const row = v.clientListFiltered.find((c) => c.id === 'c1');
    expect(row.hasRisk).toBe(true);
    const reviewItem = v.reviewItems.find((r) => r.id === 'risk-c1');
    expect(reviewItem).toBeDefined();
    expect(reviewItem.title).toBe('Low mood reported');
    expect(reviewItem.detail).toBe('Mood score 2/5 in the last 7 days');
  });

  it('surfaces a concerning_language alert with the matching Review Queue title', () => {
    const v = makeView({ riskAlerts: [{ clientId: 'c1', reasons: ['Latest pre-session agenda mentions "crisis"'], type: 'concerning_language', level: 'high', daysAgo: 0 }] });
    const reviewItem = v.reviewItems.find((r) => r.id === 'risk-c1');
    expect(reviewItem.title).toBe('Concerning language detected');
    expect(reviewItem.sevLabel).toBe('High');
  });

  it('leaves a client\'s existing base risk untouched when no real alert exists for them', () => {
    const v = makeView({ riskAlerts: [{ clientId: 'c1', reasons: ['Mood score 2/5 in the last 7 days'], type: 'mood', level: 'high', daysAgo: 1 }] });
    // c3 (Sam Okafor) has a real base inactivity risk from mapClientRow/seed data — no alert entry for c3 here.
    const reviewItem = v.reviewItems.find((r) => r.id === 'risk-c3');
    expect(reviewItem.title).toBe('Extended inactivity');
  });

  it('enriches the Safety tab riskFactors/riskLevel for the selected client from a real alert', () => {
    const v = makeView({ selectedClientId: 'c1', riskAlerts: [{ clientId: 'c1', reasons: ['Latest pre-session agenda mentions "stuck"'], type: 'concerning_language', level: 'high', daysAgo: 0 }] });
    expect(v.selectedClient.safety.levelLabel).toBe('High');
    expect(v.selectedClient.safety.riskFactors).toEqual(['Latest pre-session agenda mentions "stuck"']);
  });

  it('never downgrades an existing high/urgent safety status or erases its factors when a lower-severity alert also fires', () => {
    // c2 (Jordan Reyes) already carries safety.riskLevel: 'high' with 3 real
    // riskFactors and risk.level: 'high' in the seed data. A medium
    // inactivity-only alert must augment, not replace, that assessment.
    const v = makeView({
      selectedClientId: 'c2',
      riskAlerts: [{ clientId: 'c2', reasons: ['9+ days without login or module progress'], type: 'inactivity', level: 'medium', daysAgo: 9 }],
    });
    expect(v.selectedClient.safety.levelLabel).toBe('High'); // not downgraded to Monitor
    expect(v.selectedClient.safety.riskFactors).toEqual(
      expect.arrayContaining(['Recent hopelessness language', 'Reduced social contact', 'History of betrayal trauma', '9+ days without login or module progress']),
    );
    const reviewItem = v.reviewItems.find((r) => r.id === 'risk-c2');
    expect(reviewItem.sevLabel).toBe('High'); // risk.level not downgraded to medium
  });
});

describe('buildView — Healing Journey', () => {
  it('gates the tab for an unassigned client', () => {
    const v = makeView({ extraClients: [UNASSIGNED_CLIENT], selectedClientId: 'new1' });
    expect(v.selectedClient.healingTimeline.canView).toBe(false);
    expect(v.selectedClient.healingTimeline.rows).toEqual([]);
  });

  it('surfaces loading, error, and populated states from real S.healingTimeline', () => {
    const loading = makeView({ selectedClientId: 'c1', healingTimeline: { loading: true, data: null, error: '' } });
    expect(loading.selectedClient.healingTimeline.loading).toBe(true);

    const errored = makeView({ selectedClientId: 'c1', healingTimeline: { loading: false, data: null, error: 'Unable to load your healing timeline.' } });
    expect(errored.selectedClient.healingTimeline.error).toBe('Unable to load your healing timeline.');
    expect(errored.selectedClient.healingTimeline.noEvents).toBe(false); // error takes precedence over the empty state

    const populated = makeView({
      selectedClientId: 'c1',
      healingTimeline: {
        loading: false, error: '',
        data: { summary: { modulesCompleted: 2, checkInsSubmitted: 1, goalsCompleted: 0, partsCreated: 3, journalEntries: 4, moodCheckIns: 5, lifeIntegrationReflections: 0, curriculumReflections: 1 }, timeline: [{ id: 'e1', title: 'You added a new part.', description: 'Noticing more clearly.', source: 'Parts', dateLabel: 'Jul 1' }] },
      },
    });
    expect(populated.selectedClient.healingTimeline.summary.partsCreated).toBe(3);
    expect(populated.selectedClient.healingTimeline.rows).toHaveLength(1);
    expect(populated.selectedClient.healingTimeline.noEvents).toBe(false);
  });

  it('flags noEvents when a real fetch completed with zero milestones', () => {
    const v = makeView({ selectedClientId: 'c1', healingTimeline: { loading: false, error: '', data: { summary: {}, timeline: [] } } });
    expect(v.selectedClient.healingTimeline.noEvents).toBe(true);
  });
});

describe('buildView — Assessment tertiary wounds & protector types', () => {
  const subscales = ['abandonment', 'shame', 'neglect', 'betrayal', 'helplessness'].map((wound) => ({ wound, score: 5, severity: 'Low', delta: null }));

  it('maps real tertiary wound labels and protector types onto an assessment history entry', () => {
    const client = {
      ...CLIENTS[0], id: 'ah1',
      assessmentHistory: [{ id: 'a1', date: '2026-06-01', primaryWound: 'shame', secondaryWound: 'neglect', subscales, tertiaryWounds: ['betrayal'], protectorTypes: ['Perfectionist'] }],
    };
    const v = makeView({ extraClients: [client], selectedClientId: 'ah1' });
    const entry = v.selectedClient.assessmentHistory[0];
    expect(entry.tertiaryLabels).toEqual(['Betrayal']);
    expect(entry.protectorTypes).toEqual(['Perfectionist']);
  });

  it('defaults to empty tertiary/protector lists when an entry lacks the fields', () => {
    const client = {
      ...CLIENTS[0], id: 'ah2',
      assessmentHistory: [{ id: 'a2', date: '2026-06-01', primaryWound: 'shame', secondaryWound: 'neglect', subscales }],
    };
    const v = makeView({ extraClients: [client], selectedClientId: 'ah2' });
    const entry = v.selectedClient.assessmentHistory[0];
    expect(entry.tertiaryLabels).toEqual([]);
    expect(entry.protectorTypes).toEqual([]);
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

describe('buildView — AI Module Insights (api/ai-module-response-insights.js)', () => {
  it('surfaces loading/error/data state', () => {
    const idle = makeView({ selectedClientId: 'c1' });
    expect(idle.selectedClient.moduleInsights.loading).toBe(false);
    expect(idle.selectedClient.moduleInsights.data).toBeNull();

    const loading = makeView({ selectedClientId: 'c1', moduleInsights: { loading: true, data: null, error: '' } });
    expect(loading.selectedClient.moduleInsights.loading).toBe(true);

    const errored = makeView({ selectedClientId: 'c1', moduleInsights: { loading: false, data: null, error: 'Unable to generate module response insights.' } });
    expect(errored.selectedClient.moduleInsights.error).toBe('Unable to generate module response insights.');

    const insightsData = { insights: '1. Common themes\nRecurring shame-related language.', disclaimer: 'AI-generated preparation aid for Advisor review only.', generatedAt: '2026-07-20T00:00:00Z', dataSources: { moduleResponseGroups: 3, curriculumProgress: 2, curriculumReflections: 1 } };
    const ready = makeView({ selectedClientId: 'c1', moduleInsights: { loading: false, data: insightsData, error: '' } });
    expect(ready.selectedClient.moduleInsights.data.insights).toContain('Common themes');
  });

  it('never offers module-insights generation for an unassigned client', () => {
    const v = makeView({ extraClients: [UNASSIGNED_CLIENT], selectedClientId: 'new1' });
    expect(v.selectedClient.moduleInsights.onGenerate).toBeUndefined();
  });

  it('keeps module-insights generation wired for an assigned client', () => {
    const v = makeView({ selectedClientId: 'c1' });
    expect(typeof v.selectedClient.moduleInsights.onGenerate).toBe('function');
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

describe('buildView — Insights & Reports surfaces real caseload-wide report history (previously an ImportPanel stub)', () => {
  it('maps real report audit rows with the client name attached, most recent first', () => {
    const v = makeView({
      caseloadReports: [
        { id: 'r1', client_id: 'c1', report_type: 'clinical_summary', title: 'Clinical Summary — Maya Chen', sections_included: ['Growth Goals'], generated_at: '2026-07-01T00:00:00Z' },
        { id: 'r2', client_id: 'c2', report_type: 'client_progress_summary', title: null, sections_included: [], generated_at: '2026-06-15T00:00:00Z' },
      ],
    });
    expect(v.caseloadReportRows).toHaveLength(2);
    expect(v.caseloadReportRows[0]).toMatchObject({ id: 'r1', title: 'Clinical Summary — Maya Chen', clientName: 'Maya Chen' });
    // r2 has no title, so it falls back to the doc-type label, and its client
    // name comes from a lookup against the real caseload, not the raw row.
    expect(v.caseloadReportRows[1].clientName).toBe('Jordan Reyes');
    expect(v.noCaseloadReports).toBe(false);
  });

  it('reports no reports and no loading state by default', () => {
    const v = makeView();
    expect(v.caseloadReportRows).toEqual([]);
    expect(v.noCaseloadReports).toBe(true);
    expect(v.caseloadReportsLoading).toBe(false);
  });

  it('surfaces a loading state distinct from empty', () => {
    const v = makeView({ caseloadReportsLoading: true });
    expect(v.caseloadReportsLoading).toBe(true);
    expect(v.noCaseloadReports).toBe(false);
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
        { id: 'hw3', title: 'mod-3', status: 'completed', statusLabel: 'Completed', instructions: '', advisorFeedback: '', assignedDateLabel: 'Jun 12', completedDateLabel: 'Jun 15' },
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
    expect(bs.assignmentRows).toHaveLength(3);
    expect(bs.assignmentRows[0].title).toBe('Self-Connection Journal');
    expect(bs.assignmentRows[0].statusLabel).toBe('Reviewed');
    expect(bs.assignmentRows[0].instructions).toBe('Focus on the abandonment part.');
    expect(bs.assignmentRows[0].advisorFeedback).toBe('Great insight.');
    expect(bs.assignmentRows[0].dateLabel).toBe('Completed Jun 5');
    expect(bs.assignmentRows[1].dateLabel).toBe('Assigned Jun 10');
  });

  it('only offers the "mark reviewed" action for assignments the client has actually completed', () => {
    const v = makeView({ extraClients: [CLIENT_WITH_ACTIVITY], selectedClientId: 'bs1' });
    const rows = v.selectedClient.betweenSession.assignmentRows;
    expect(rows.find((r) => r.id === 'hw1').canReview).toBe(false); // already reviewed
    expect(rows.find((r) => r.id === 'hw2').canReview).toBe(false); // not yet completed
    expect(rows.find((r) => r.id === 'hw3').canReview).toBe(true); // completed, awaiting review
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

describe('buildView — Self-Energy trend reflects real daily check-ins (DailyCheckin.jsx)', () => {
  const CLIENT_WITH_ACTIVITY = {
    ...UNASSIGNED_CLIENT, id: 'bs1', name: 'Activity Test', unassigned: false,
    betweenSession: {
      homeworkFunnel: { totalAssigned: 0, inProgress: 0, completed: 0, reviewed: 0, completionPct: 0, avgDaysToComplete: null },
      moodEntries: [], moodTrend: [], energyTrend: [], journalWeekly: [], assignments: [], freeformAssignments: [],
      hasMoodData: false, hasJournalData: false, hasHomeworkData: false,
    },
  };
  const SELF_ENERGY_ROWS = [
    { date: '2026-07-01', selfEnergy: 3, mood: 2, activeParts: ['the-watcher', 'little-maya'], intention: '' },
    { date: '2026-07-05', selfEnergy: 7, mood: 4, activeParts: ['the-watcher'], intention: 'Stay grounded today.' },
  ];

  it('maps real check-in rows into a Self-Energy trend, active-parts frequency, and recent check-ins list', () => {
    const v = makeView({ extraClients: [CLIENT_WITH_ACTIVITY], selectedClientId: 'bs1', selfEnergyTrend: SELF_ENERGY_ROWS });
    const bs = v.selectedClient.betweenSession;
    expect(bs.hasSelfEnergyData).toBe(true);
    expect(bs.selfEnergyTrendBars).toHaveLength(2);
    expect(bs.noActiveParts).toBe(false);
    // "the-watcher" appears in both check-ins, "little-maya" in one.
    expect(bs.activePartsRows[0]).toEqual(expect.objectContaining({ name: 'The Watcher', count: 2 }));
    expect(bs.noCheckins).toBe(false);
    expect(bs.recentCheckins).toHaveLength(2);
    // Most recent check-in first.
    expect(bs.recentCheckins[0].dateLabel).toBe('Jul 5');
    expect(bs.recentCheckins[0].selfEnergyLabel).toBe('7/10');
    expect(bs.recentCheckins[0].intention).toBe('Stay grounded today.');
  });

  it('shows the loading state distinctly from the empty state while the tab-scoped fetch is in flight', () => {
    const v = makeView({ extraClients: [CLIENT_WITH_ACTIVITY], selectedClientId: 'bs1', selfEnergyTrend: [], selfEnergyTrendLoading: true });
    expect(v.selectedClient.betweenSession.selfEnergyTrendLoading).toBe(true);
  });

  it('shows the empty state once loaded with no check-ins, and for demo clients', () => {
    const loaded = makeView({ extraClients: [CLIENT_WITH_ACTIVITY], selectedClientId: 'bs1', selfEnergyTrend: [], selfEnergyTrendLoading: false });
    expect(loaded.selectedClient.betweenSession.noCheckins).toBe(true);

    const demo = makeView({ selectedClientId: 'c1' });
    expect(demo.selectedClient.betweenSession.noCheckins).toBe(true);
    expect(demo.selectedClient.betweenSession.selfEnergyTrendBars).toEqual([]);
  });
});

describe('buildView — Unburdening Protocol reflects the real ceremony record (UnburdeningProtocol.jsx)', () => {
  const CLIENT_WITH_ACTIVITY = {
    ...UNASSIGNED_CLIENT, id: 'ub1', name: 'Ceremony Test', unassigned: false,
    betweenSession: {
      homeworkFunnel: { totalAssigned: 0, inProgress: 0, completed: 0, reviewed: 0, completionPct: 0, avgDaysToComplete: null },
      moodEntries: [], moodTrend: [], energyTrend: [], journalWeekly: [], assignments: [], freeformAssignments: [],
      hasMoodData: false, hasJournalData: false, hasHomeworkData: false,
    },
  };

  it('never offers the ceremony record for an unassigned client, and shows a claim prompt instead', () => {
    const v = makeView({
      extraClients: [UNASSIGNED_CLIENT], selectedClientId: 'new1',
      unburdeningRecord: { currentStep: 5, completed: false, completedAt: null, element: 'fire', quality: null, bodyLocation: 'Chest', moodAfter: null },
    });
    expect(v.selectedClient.unburdening.canView).toBe(false);
    expect(v.selectedClient.unburdening.hasRecord).toBe(false);
  });

  it('maps an in-progress ceremony record into structured step/element/body-location fields', () => {
    const v = makeView({
      extraClients: [CLIENT_WITH_ACTIVITY], selectedClientId: 'ub1',
      unburdeningRecord: { currentStep: 5, completed: false, completedAt: null, element: 'water', quality: null, bodyLocation: 'Chest', moodAfter: null },
    });
    const ub = v.selectedClient.unburdening;
    expect(ub.hasRecord).toBe(true);
    expect(ub.completed).toBe(false);
    expect(ub.stepLabel).toBe('Step 5 of 8');
    expect(ub.stepTitle).toBe('Choose the Element');
    expect(ub.progressPct).toBe(63);
    expect(ub.element).toBe('Water');
    expect(ub.bodyLocation).toBe('Chest');
    expect(ub.quality).toBe('');
    expect(ub.moodAfterLabel).toBe('');
  });

  it('maps a completed ceremony record, including the post-ceremony quality and mood', () => {
    const v = makeView({
      extraClients: [CLIENT_WITH_ACTIVITY], selectedClientId: 'ub1',
      unburdeningRecord: { currentStep: 8, completed: true, completedAt: '2026-07-22T00:00:00Z', element: 'fire', quality: 'Peace', bodyLocation: 'Shoulders', moodAfter: 4 },
    });
    const ub = v.selectedClient.unburdening;
    expect(ub.completed).toBe(true);
    expect(ub.completedDateLabel).toBe('Jul 22, 2026');
    expect(ub.quality).toBe('Peace');
    expect(ub.moodAfterLabel).toBe('Lighter');
  });

  it('shows the loading state, and the empty state once loaded with no ceremony started', () => {
    const loading = makeView({ extraClients: [CLIENT_WITH_ACTIVITY], selectedClientId: 'ub1', unburdeningRecord: null, unburdeningRecordLoading: true });
    expect(loading.selectedClient.unburdening.loading).toBe(true);
    expect(loading.selectedClient.unburdening.noRecord).toBe(false);

    const loaded = makeView({ extraClients: [CLIENT_WITH_ACTIVITY], selectedClientId: 'ub1', unburdeningRecord: null, unburdeningRecordLoading: false });
    expect(loaded.selectedClient.unburdening.noRecord).toBe(true);
    expect(loaded.selectedClient.unburdening.hasRecord).toBe(false);

    const demo = makeView({ selectedClientId: 'c1' });
    expect(demo.selectedClient.unburdening.hasRecord).toBe(false);
  });
});

describe('buildView — Co-Therapy activity progress reflects real completion rows (CoTherapySession.jsx)', () => {
  const CLIENT_WITH_ACTIVITY = {
    ...UNASSIGNED_CLIENT, id: 'ct1', name: 'Co-Therapy Test', unassigned: false,
  };
  const ROWS = [
    { id: 'p1', activityId: 'unburdening-ceremony', activityTitle: 'Unburdening Ceremony Guide', completed: true, updatedAt: '2026-07-20T00:00:00Z' },
    { id: 'p2', activityId: 'parts-dialogue', activityTitle: 'Guided Parts Dialogue', completed: false, updatedAt: '2026-07-22T00:00:00Z' },
  ];

  it('never surfaces co-therapy progress for an unassigned client', () => {
    const v = makeView({ extraClients: [UNASSIGNED_CLIENT], selectedClientId: 'new1', coTherapyProgress: ROWS });
    expect(v.selectedClient.coTherapyProgress.canView).toBe(false);
    expect(v.selectedClient.coTherapyProgress.rows).toEqual([]);
  });

  it('maps real activity rows into title, completion status, and date', () => {
    const v = makeView({ extraClients: [CLIENT_WITH_ACTIVITY], selectedClientId: 'ct1', coTherapyProgress: ROWS });
    const ct = v.selectedClient.coTherapyProgress;
    expect(ct.rows).toHaveLength(2);
    expect(ct.rows[0]).toEqual(expect.objectContaining({ title: 'Unburdening Ceremony Guide', completed: true, statusLabel: 'Completed' }));
    expect(ct.rows[1]).toEqual(expect.objectContaining({ title: 'Guided Parts Dialogue', completed: false, statusLabel: 'In progress' }));
    expect(ct.noActivity).toBe(false);
  });

  it('shows the loading state, and the empty state once loaded with no activity', () => {
    const loading = makeView({ extraClients: [CLIENT_WITH_ACTIVITY], selectedClientId: 'ct1', coTherapyProgress: [], coTherapyProgressLoading: true });
    expect(loading.selectedClient.coTherapyProgress.loading).toBe(true);
    expect(loading.selectedClient.coTherapyProgress.noActivity).toBe(false);

    const loaded = makeView({ extraClients: [CLIENT_WITH_ACTIVITY], selectedClientId: 'ct1', coTherapyProgress: [], coTherapyProgressLoading: false });
    expect(loaded.selectedClient.coTherapyProgress.noActivity).toBe(true);

    const demo = makeView({ selectedClientId: 'c1' });
    expect(demo.selectedClient.coTherapyProgress.rows).toEqual([]);
  });
});

describe('buildView — Personalized Curriculum reflects real AI-generated module rows (Assessments.jsx / TherapistDashboard.jsx)', () => {
  const CLIENT_WITH_ACTIVITY = {
    ...UNASSIGNED_CLIENT, id: 'pc1', name: 'Personalized Curriculum Test', unassigned: false,
  };
  const MODULES = [
    { id: 'm1', moduleId: 'wound-abandonment-1', order: 1, title: 'Understanding Abandonment', description: 'An intro module.', woundFocus: 'abandonment', estimatedMinutes: 20, difficultyLevel: 'beginner', updatedAt: '2026-07-01T00:00:00Z' },
    { id: 'm2', moduleId: 'wound-shame-1', order: 2, title: 'Working With Shame', description: '', woundFocus: '', estimatedMinutes: null, difficultyLevel: '', updatedAt: null },
  ];

  it('never surfaces personalized curriculum for an unassigned client', () => {
    const v = makeView({ extraClients: [UNASSIGNED_CLIENT], selectedClientId: 'new1', personalizedCurriculum: MODULES });
    expect(v.selectedClient.personalizedCurriculum.canView).toBe(false);
    expect(v.selectedClient.personalizedCurriculum.rows).toEqual([]);
  });

  it('maps real module rows into title/order/wound/duration/difficulty labels', () => {
    const v = makeView({ extraClients: [CLIENT_WITH_ACTIVITY], selectedClientId: 'pc1', personalizedCurriculum: MODULES });
    const pc = v.selectedClient.personalizedCurriculum;
    expect(pc.rows).toHaveLength(2);
    expect(pc.rows[0]).toEqual(expect.objectContaining({ order: 1, title: 'Understanding Abandonment', woundLabel: 'Abandonment', durationLabel: '20 min', difficultyLabel: 'Beginner' }));
    expect(pc.rows[1]).toEqual(expect.objectContaining({ title: 'Working With Shame', woundLabel: '', durationLabel: '', difficultyLabel: '' }));
    expect(pc.noModules).toBe(false);
  });

  it('shows the loading state, and the empty state once loaded with no modules', () => {
    const loading = makeView({ extraClients: [CLIENT_WITH_ACTIVITY], selectedClientId: 'pc1', personalizedCurriculum: [], personalizedCurriculumLoading: true });
    expect(loading.selectedClient.personalizedCurriculum.loading).toBe(true);

    const loaded = makeView({ extraClients: [CLIENT_WITH_ACTIVITY], selectedClientId: 'pc1', personalizedCurriculum: [], personalizedCurriculumLoading: false });
    expect(loaded.selectedClient.personalizedCurriculum.noModules).toBe(true);

    const demo = makeView({ selectedClientId: 'c1' });
    expect(demo.selectedClient.personalizedCurriculum.rows).toEqual([]);
  });
});

describe('buildView — Suggested Parts reflects the real suggestion engine (AdvisorInnerSystemMap.jsx)', () => {
  const CLIENT_WITH_ACTIVITY = {
    ...UNASSIGNED_CLIENT, id: 'ps1', name: 'Suggestion Test', unassigned: false,
  };
  const SUMMARY = {
    pendingPartsCount: 2, pendingRelationshipsCount: 1, acceptedCount: 1, mergedCount: 0, dismissedCount: 1,
    topSuggestions: [
      { id: 's1', name: 'Part carrying shame', role: 'Carries shame that may be connected to an old wound.', type: 'exile', sourceLabel: 'Wound Patterns Assessment', confidence: 'strong signal' },
      { id: 's2', name: 'Boundary Protector', role: 'Helps protect needs, limits, and space.', type: 'protector', sourceLabel: 'Curriculum reflection', confidence: 'possible signal' },
    ],
  };

  it('never offers suggestions for an unassigned client, and hides the review link entirely', () => {
    const v = makeView({ extraClients: [UNASSIGNED_CLIENT], selectedClientId: 'new1', partSuggestions: SUMMARY });
    expect(v.selectedClient.partSuggestions.canView).toBe(false);
    expect(v.selectedClient.partSuggestions.hasData).toBe(false);
    expect(v.selectedClient.partSuggestions.topSuggestions).toEqual([]);
  });

  it('maps real suggestion counts and top suggestions, normalizing engine types to workspace part categories', () => {
    const v = makeView({ extraClients: [CLIENT_WITH_ACTIVITY], selectedClientId: 'ps1', partSuggestions: SUMMARY });
    const ps = v.selectedClient.partSuggestions;
    expect(ps.hasData).toBe(true);
    expect(ps.hasPending).toBe(true);
    expect(ps.pendingPartsCount).toBe(2);
    expect(ps.pendingRelationshipsCount).toBe(1);
    expect(ps.topSuggestions).toHaveLength(2);
    expect(ps.topSuggestions[0]).toEqual(expect.objectContaining({ name: 'Part carrying shame', catLabel: 'Exile' }));
    // 'protector' (engine vocabulary) normalizes to the manager category, same as mapParts in advisorWorkspaceLoader.js.
    expect(ps.topSuggestions[1]).toEqual(expect.objectContaining({ name: 'Boundary Protector', catLabel: 'Manager' }));
    expect(ps.reviewLink).toBe('/advisor/inner-system-map/ps1');
  });

  it('shows the loading state, and the empty state once loaded with no pending signals', () => {
    const loading = makeView({ extraClients: [CLIENT_WITH_ACTIVITY], selectedClientId: 'ps1', partSuggestions: null, partSuggestionsLoading: true });
    expect(loading.selectedClient.partSuggestions.loading).toBe(true);
    expect(loading.selectedClient.partSuggestions.noData).toBe(false);

    const loaded = makeView({ extraClients: [CLIENT_WITH_ACTIVITY], selectedClientId: 'ps1', partSuggestions: null, partSuggestionsLoading: false });
    expect(loaded.selectedClient.partSuggestions.noData).toBe(true);
    expect(loaded.selectedClient.partSuggestions.hasData).toBe(false);

    const zero = makeView({
      extraClients: [CLIENT_WITH_ACTIVITY], selectedClientId: 'ps1',
      partSuggestions: { pendingPartsCount: 0, pendingRelationshipsCount: 0, acceptedCount: 0, mergedCount: 0, dismissedCount: 0, topSuggestions: [] },
    });
    expect(zero.selectedClient.partSuggestions.hasData).toBe(true);
    expect(zero.selectedClient.partSuggestions.hasPending).toBe(false);

    const demo = makeView({ selectedClientId: 'c1' });
    expect(demo.selectedClient.partSuggestions.hasData).toBe(false);
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

describe('buildView — Curriculum Reflections reflects real module reflection content', () => {
  const RAW_REFLECTION = {
    id: 'cr1', moduleTitle: 'Meeting Your Parts', insight: 'I noticed a protector show up early.',
    partNoticed: 'The Watcher', selfEnergyQuality: '', nextPractice: '', createdAt: '2026-07-01T00:00:00Z',
  };

  it('never offers reflections for an unassigned client, and shows a claim prompt instead', () => {
    const v = makeView({ extraClients: [UNASSIGNED_CLIENT], selectedClientId: 'new1', curriculumReflections: [RAW_REFLECTION] });
    expect(v.selectedClient.curriculumReflections.canView).toBe(false);
    expect(v.selectedClient.curriculumReflections.rows).toEqual([]);
  });

  it('maps real reflection rows for an assigned client, filtering out empty fields', () => {
    const v = makeView({ selectedClientId: 'c1', curriculumReflections: [RAW_REFLECTION] });
    const cr = v.selectedClient.curriculumReflections;
    expect(cr.canView).toBe(true);
    expect(cr.rows).toHaveLength(1);
    expect(cr.rows[0].moduleTitle).toBe('Meeting Your Parts');
    // Only insight and partNoticed were non-empty on the fixture.
    expect(cr.rows[0].fields.map(([label]) => label)).toEqual(['Insight', 'Part noticed']);
    expect(cr.noReflections).toBe(false);
  });

  it('shows the empty state once loaded with no shared reflections', () => {
    const v = makeView({ selectedClientId: 'c1', curriculumReflections: [], curriculumReflectionsLoading: false });
    expect(v.selectedClient.curriculumReflections.noReflections).toBe(true);
  });

  it('does not show the empty state while still loading', () => {
    const v = makeView({ selectedClientId: 'c1', curriculumReflections: [], curriculumReflectionsLoading: true });
    expect(v.selectedClient.curriculumReflections.loading).toBe(true);
    expect(v.selectedClient.curriculumReflections.noReflections).toBe(false);
  });
});

describe('buildView — AI-Assisted Advisor Note Draft (api/ai-session-note-draft.js)', () => {
  it('defaults isDemo to false so the real widget renders for a signed-in Advisor', () => {
    const v = makeView();
    expect(v.isDemo).toBe(false);
  });

  it('exposes isDemo so a demo/unauthenticated workspace can gate the widget instead of rendering it', () => {
    const S = { ...INITIAL_STATE };
    const view = buildView({
      S, theme: LIGHT, allClients: () => CLIENTS,
      buildTreatmentPlan: (c) => ({ clientName: c.name, phases: [], milestones: [], currentPhaseLabel: '', currentPhaseDesc: '' }),
      handlers: new Proxy({ isGroupExpanded: () => false }, { get: (t, p) => t[p] || (() => {}) }),
      isAdmin: true, isDemo: true,
    });
    expect(view.isDemo).toBe(true);
  });

  it('wires onAiNoteSaved through to the handler so a saved draft updates Recent notes', () => {
    let savedNote = null;
    const S = { ...INITIAL_STATE };
    const view = buildView({
      S, theme: LIGHT, allClients: () => CLIENTS,
      buildTreatmentPlan: (c) => ({ clientName: c.name, phases: [], milestones: [], currentPhaseLabel: '', currentPhaseDesc: '' }),
      handlers: new Proxy({ isGroupExpanded: () => false, onAiNoteSaved: (note) => { savedNote = note; } }, { get: (t, p) => t[p] || (() => {}) }),
      isAdmin: true,
    });
    view.onAiNoteSaved({ id: 'n1', client_id: 'c1' });
    expect(savedNote).toEqual({ id: 'n1', client_id: 'c1' });
  });
});

describe('buildView — real homework review/archive actions (assignedHomework.js)', () => {
  it('exposes the homework feedback draft and wires the review/archive/assign handlers through', () => {
    let reviewedArgs = null; let archivedArgs = null; let assignedClientId = null;
    const S = { ...INITIAL_STATE, homeworkFeedbackDraft: { hw1: 'Great progress' } };
    const view = buildView({
      S, theme: LIGHT, allClients: () => CLIENTS,
      buildTreatmentPlan: (c) => ({ clientName: c.name, phases: [], milestones: [], currentPhaseLabel: '', currentPhaseDesc: '' }),
      handlers: new Proxy({
        isGroupExpanded: () => false,
        onMarkHomeworkReviewed: (clientId, id) => { reviewedArgs = [clientId, id]; },
        onArchiveHomework: (clientId, id) => { archivedArgs = [clientId, id]; },
        onHomeworkAssigned: (clientId) => { assignedClientId = clientId; },
      }, { get: (t, p) => t[p] || (() => {}) }),
      isAdmin: true,
    });
    expect(view.homeworkFeedbackDraft).toEqual({ hw1: 'Great progress' });
    view.onMarkHomeworkReviewed('c1', 'hw1');
    expect(reviewedArgs).toEqual(['c1', 'hw1']);
    view.onArchiveHomework('c1', 'hw1');
    expect(archivedArgs).toEqual(['c1', 'hw1']);
    view.onHomeworkAssigned('c1');
    expect(assignedClientId).toBe('c1');
  });
});

describe('buildView — Resource Library surfaces the curated healing-library content', () => {
  it('lists every resource unfiltered by default', () => {
    const v = makeView({ activeTab: 'clinical-resources' });
    expect(v.isClinicalResources).toBe(true);
    expect(v.resourceRows.length).toBe(32);
    expect(v.noResources).toBe(false);
  });

  it('filters by search term across title, author, and description', () => {
    const v = makeView({ activeTab: 'clinical-resources', resourceSearch: 'No Bad Parts' });
    expect(v.resourceRows.map((r) => r.title)).toEqual(['No Bad Parts']);
  });

  it('filters by content type', () => {
    const v = makeView({ activeTab: 'clinical-resources', resourceType: 'meditation' });
    expect(v.resourceRows.every((r) => r.typeLabel === 'Meditations')).toBe(true);
    expect(v.resourceRows.length).toBeGreaterThan(0);
  });

  it('filters by wound, only including resources tagged for it', () => {
    const v = makeView({ activeTab: 'clinical-resources', resourceWound: 'shame' });
    expect(v.resourceRows.every((r) => r.woundChips.some((w) => w.id === 'shame'))).toBe(true);
  });

  it('filters by healing stage', () => {
    const v = makeView({ activeTab: 'clinical-resources', resourceStage: 'unburdening' });
    expect(v.resourceRows.every((r) => r.stageLabel === 'Unburdening')).toBe(true);
    expect(v.resourceRows.length).toBeGreaterThan(0);
  });

  it('combines filters and reports an empty state when nothing matches', () => {
    // Every article-type resource is tagged discovery/understanding — none integration.
    const v = makeView({ activeTab: 'clinical-resources', resourceType: 'article', resourceStage: 'integration' });
    expect(v.resourceRows).toEqual([]);
    expect(v.noResources).toBe(true);
  });

  it('marks in-app resources for internal navigation and external resources for a new tab', () => {
    const v = makeView({ activeTab: 'clinical-resources', resourceSearch: 'Unburdening Protocol' });
    const appResource = v.resourceRows.find((r) => r.title === 'Unburdening Protocol');
    expect(appResource.isAppLink).toBe(true);
    expect(appResource.href).toBe('/unburdening');

    const externalResource = makeView({ activeTab: 'clinical-resources', resourceSearch: 'No Bad Parts' }).resourceRows[0];
    expect(externalResource.isAppLink).toBe(false);
    expect(externalResource.href).toContain('https://');
  });
});

describe('buildView — Engagement & Dropout Risk evidence drill-down', () => {
  it('stays collapsed by default, with an expand toggle per client', () => {
    const v = makeView({ activeTab: 'clients-engagement' });
    const maya = v.engagementRows.find((r) => r.id === 'c1');
    expect(maya.expanded).toBe(false);
    expect(maya.expandLabel).toBe('View details');
  });

  it('surfaces real per-client indicators (streak, homework, pending review, risk) when expanded', () => {
    const v = makeView({ activeTab: 'clients-engagement', engagementExpanded: { c1: true } });
    const maya = v.engagementRows.find((r) => r.id === 'c1');
    expect(maya.expanded).toBe(true);
    expect(maya.expandLabel).toBe('Hide details');
    const byLabel = Object.fromEntries(maya.evidence.map((e) => [e.label, e.value]));
    expect(byLabel['Last activity']).toBe('Today');
    expect(byLabel['Practice streak']).toBe('12 days (level 5)');
    expect(byLabel['Homework completion']).toBe('78% (9 modules completed)');
    expect(byLabel['Pending review']).toBe('Self-Connection Journal · 3 days ago');
    expect(byLabel['Risk flag']).toBe('None detected');
  });

  it('surfaces the real detected risk type and level for a flagged client', () => {
    const v = makeView({ activeTab: 'clients-engagement', engagementExpanded: { c2: true } });
    const jordan = v.engagementRows.find((r) => r.id === 'c2');
    const byLabel = Object.fromEntries(jordan.evidence.map((e) => [e.label, e.value]));
    expect(byLabel['Risk flag']).toBe('Concerning language detected (high)');
  });

  it('toggles expansion independently per client via the handler', () => {
    let toggledId = null;
    const S = { ...INITIAL_STATE, activeTab: 'clients-engagement' };
    const view = buildView({
      S, theme: LIGHT, allClients: () => CLIENTS,
      buildTreatmentPlan: (c) => ({ clientName: c.name, phases: [], milestones: [], currentPhaseLabel: '', currentPhaseDesc: '' }),
      handlers: new Proxy({ isGroupExpanded: () => false, toggleEngagementExpanded: (id) => { toggledId = id; } }, { get: (t, p) => t[p] || (() => {}) }),
      isAdmin: true,
    });
    view.engagementRows.find((r) => r.id === 'c1').onToggleExpand();
    expect(toggledId).toBe('c1');
  });
});

describe('buildView — Messages search filters threads by name and by message content', () => {
  it('lists every thread with messages unfiltered by default', () => {
    const v = makeView();
    expect(v.threadList.map((t) => t.name).sort()).toEqual(['Jordan Reyes', 'Maya Chen']);
    expect(v.noThreadsMatchSearch).toBe(false);
  });

  it('filters by client name', () => {
    const v = makeView({ messageSearch: 'Jordan' });
    expect(v.threadList.map((t) => t.name)).toEqual(['Jordan Reyes']);
  });

  it('surfaces a thread whose name does not match but whose message content does, previewing the matching message', () => {
    const v = makeView({ messageSearch: 'sister' });
    expect(v.threadList).toHaveLength(1);
    expect(v.threadList[0].name).toBe('Maya Chen');
    expect(v.threadList[0].preview).toContain('sister');
  });

  it('reports no matches (without crashing) for a search that hits nothing', () => {
    const v = makeView({ messageSearch: 'xyz-not-in-any-thread' });
    expect(v.threadList).toEqual([]);
    expect(v.noThreadsMatchSearch).toBe(true);
  });

  it('excludes a deleted message from search matching and from the preview', () => {
    // Maya's messages[0] is the "sister" message onDeleteMessage would mark
    // deleted at index 0 (same [...c.messages, ...clientMessages] order the
    // thread derivation and onDeleteMessage both use).
    const v = makeView({ messageSearch: 'sister', deletedMessageIdx: { c1: { 0: true } } });
    expect(v.threadList).toEqual([]);
    expect(v.noThreadsMatchSearch).toBe(true);
  });

  it('wires each message\'s delete action with its real ifs_messages id, not just its list index', () => {
    let deletedWith = null;
    const view = buildView({
      S: { ...INITIAL_STATE, selectedClientId: 'c1' }, theme: LIGHT, allClients: () => CLIENTS,
      buildTreatmentPlan: (c) => ({ clientName: c.name, phases: [], milestones: [], currentPhaseLabel: '', currentPhaseDesc: '' }),
      handlers: new Proxy({ isGroupExpanded: () => false, onDeleteMessage: (clientId, idx, messageId) => { deletedWith = [clientId, idx, messageId]; } }, { get: (t, p) => t[p] || (() => {}) }),
      isAdmin: true,
    });
    view.selectedClient.messages[0].onDelete();
    expect(deletedWith).toEqual(['c1', 0, 'm1']);
  });

  it('wires onDelete with the real id on the global Messages thread view too', () => {
    let deletedWith = null;
    const view = buildView({
      S: { ...INITIAL_STATE, activeThreadId: 'c1' }, theme: LIGHT, allClients: () => CLIENTS,
      buildTreatmentPlan: (c) => ({ clientName: c.name, phases: [], milestones: [], currentPhaseLabel: '', currentPhaseDesc: '' }),
      handlers: new Proxy({ isGroupExpanded: () => false, onDeleteMessage: (clientId, idx, messageId) => { deletedWith = [clientId, idx, messageId]; } }, { get: (t, p) => t[p] || (() => {}) }),
      isAdmin: true,
    });
    view.activeThread.messages[0].onDelete();
    expect(deletedWith).toEqual(['c1', 0, 'm1']);
  });

  it('wires the search input to a change handler', () => {
    let searched = null;
    const S = { ...INITIAL_STATE };
    const view = buildView({
      S, theme: LIGHT, allClients: () => CLIENTS,
      buildTreatmentPlan: (c) => ({ clientName: c.name, phases: [], milestones: [], currentPhaseLabel: '', currentPhaseDesc: '' }),
      handlers: new Proxy({ isGroupExpanded: () => false, onMessageSearchChange: (e) => { searched = e.target.value; } }, { get: (t, p) => t[p] || (() => {}) }),
      isAdmin: true,
    });
    view.onMessageSearchChange({ target: { value: 'boundary' } });
    expect(searched).toBe('boundary');
  });
});

describe('buildView — Access Control edits ifs_clients.access_restrictions (mirrors TherapistDashboard.jsx)', () => {
  it('lists assigned clients as options and shows no client selected by default', () => {
    const v = makeView();
    expect(v.accessControlClientOptions.map((c) => c.id)).toContain('c1');
    expect(v.accessControlClientOptions.map((c) => c.id)).toContain('c2');
    expect(v.hasAccessControlClient).toBe(false);
  });

  it('defaults to full access with every module, assessment, and feature toggled on for a client with no restrictions', () => {
    const v = makeView({ accessControlClientId: 'c1', accessControlFullAccess: true, accessControlForm: null });
    expect(v.hasAccessControlClient).toBe(true);
    expect(v.accessControlClientName).toBe('Maya Chen');
    expect(v.accessControlModuleRows).toHaveLength(10);
    expect(v.accessControlModuleRows.every((m) => m.trackStyle.justifyContent === 'flex-end')).toBe(true);
    expect(v.accessControlAssessmentRows).toHaveLength(4);
    expect(v.accessControlAssessmentRows.every((a) => a.trackStyle.justifyContent === 'flex-end')).toBe(true);
    expect(v.accessControlFeatureRows).toHaveLength(14);
    expect(v.accessControlFeatureRows.every((f) => f.trackStyle.justifyContent === 'flex-end')).toBe(true);
    // Full access disables individual toggles — they only make sense once
    // full access is switched off.
    expect(v.accessControlModuleRows.every((m) => m.disabled)).toBe(true);
  });

  it('reflects a partially-restricted client: only the allowed modules/assessments/features show on', () => {
    const v = makeView({
      accessControlClientId: 'c1',
      accessControlFullAccess: false,
      accessControlForm: {
        modules: ['module-1-intro-ifs'],
        assessments: ['wounds'],
        features: { exercises: true, meditations: false },
      },
    });
    const on = (rows) => rows.filter((r) => r.trackStyle.justifyContent === 'flex-end').map((r) => r.key);
    expect(on(v.accessControlModuleRows)).toEqual(['module-1-intro-ifs']);
    expect(on(v.accessControlAssessmentRows)).toEqual(['wounds']);
    expect(v.accessControlFeatureRows.find((f) => f.key === 'exercises').trackStyle.justifyContent).toBe('flex-end');
    expect(v.accessControlFeatureRows.find((f) => f.key === 'meditations').trackStyle.justifyContent).toBe('flex-start');
    // A feature key not present in the saved form defaults to allowed (true),
    // matching src/lib/accessControl.js's canAccessFeature default.
    expect(v.accessControlFeatureRows.find((f) => f.key === 'journal').trackStyle.justifyContent).toBe('flex-end');
    expect(v.accessControlModuleRows.every((m) => !m.disabled)).toBe(true);
  });

  it('wires the client picker, full-access toggle, and per-item toggles to their handlers', () => {
    const calls = {};
    const view = buildView({
      S: { ...INITIAL_STATE, accessControlClientId: 'c1', accessControlFullAccess: false, accessControlForm: { modules: [], assessments: [], features: {} } },
      theme: LIGHT, allClients: () => CLIENTS,
      buildTreatmentPlan: (c) => ({ clientName: c.name, phases: [], milestones: [], currentPhaseLabel: '', currentPhaseDesc: '' }),
      handlers: new Proxy({
        isGroupExpanded: () => false,
        onAccessControlClientChange: (id) => { calls.client = id; },
        toggleAccessControlFullAccess: () => { calls.fullAccess = true; },
        toggleAccessControlModule: (id) => { calls.module = id; },
        toggleAccessControlAssessment: (id) => { calls.assessment = id; },
        toggleAccessControlFeature: (id) => { calls.feature = id; },
        onSaveAccessControl: () => { calls.saved = true; },
      }, { get: (t, p) => t[p] || (() => {}) }),
      isAdmin: true,
    });
    view.onAccessControlClientChange('c2');
    view.onToggleAccessControlFullAccess();
    view.accessControlModuleRows[0].onClick();
    view.accessControlAssessmentRows[0].onClick();
    view.accessControlFeatureRows[0].onClick();
    view.onSaveAccessControl();
    expect(calls.client).toBe('c2');
    expect(calls.fullAccess).toBe(true);
    expect(calls.module).toBe('module-1-intro-ifs');
    expect(calls.assessment).toBe('wounds');
    expect(calls.feature).toBe('exercises');
    expect(calls.saved).toBe(true);
  });

  it('reports save-in-progress and a saved confirmation from state', () => {
    const saving = makeView({ accessControlClientId: 'c1', accessControlSaving: true });
    expect(saving.accessControlSaving).toBe(true);
    const saved = makeView({ accessControlClientId: 'c1', accessControlSaved: 'Saved' });
    expect(saved.accessControlSaved).toBe('Saved');
  });
});

describe('buildView — Clinical Tasks archive action (api/tasks.js archive, previously never called)', () => {
  it('wires each task row\'s Archive action through to onArchiveTask', () => {
    let archivedId = null;
    const view = buildView({
      S: { ...INITIAL_STATE }, theme: LIGHT, allClients: () => CLIENTS,
      buildTreatmentPlan: (c) => ({ clientName: c.name, phases: [], milestones: [], currentPhaseLabel: '', currentPhaseDesc: '' }),
      handlers: new Proxy({ isGroupExpanded: () => false, onArchiveTask: (id) => { archivedId = id; } }, { get: (t, p) => t[p] || (() => {}) }),
      isAdmin: true,
    });
    const row = view.taskRows.find((t) => t.id === 't1');
    row.onArchive();
    expect(archivedId).toBe('t1');
  });
});

describe('buildView — Session Preparation is reachable as a per-client tab', () => {
  const CLIENT_WITH_AGENDA = {
    ...CLIENTS[0], id: 'sp2', name: 'Prep Tab Test',
    agendas: [
      { id: 'ag2', dateLabel: 'Jul 22', statusLabel: 'Submitted', reviewed: false, topics: 'Grief processing', activeParts: ['The Mourner'], stuckPoints: '', goalsForSession: '', currentStressLevel: 4, currentMoodLabel: 'Sad', safetyConcerns: '' },
    ],
    qaAnswers: [{ question: 'How was your week?', answer: 'Rough, but manageable.' }],
  };

  it('flags the sessionPrep client tab and surfaces the same agenda + check-in data as the global Session Prep view', () => {
    const v = makeView({ extraClients: [CLIENT_WITH_AGENDA], selectedClientId: 'sp2', activeClientTab: 'sessionPrep' });
    expect(v.isClientTabSessionPrep).toBe(true);
    const sc = v.selectedClient;
    expect(sc.sessionPrepAgendas).toHaveLength(1);
    expect(sc.sessionPrepAgendas[0].topics).toBe('Grief processing');
    expect(sc.noSessionPrepAgendas).toBe(false);
    expect(sc.qaAnswers[0].answer).toBe('Rough, but manageable.');
  });

  it('wires the agenda\'s Mark reviewed action and the Draft note action for the selected client', () => {
    const calls = {};
    const view = buildView({
      S: { ...INITIAL_STATE, extraClients: [CLIENT_WITH_AGENDA], selectedClientId: 'sp2', activeClientTab: 'sessionPrep' },
      theme: LIGHT, allClients: () => CLIENTS.concat([CLIENT_WITH_AGENDA]),
      buildTreatmentPlan: (c) => ({ clientName: c.name, phases: [], milestones: [], currentPhaseLabel: '', currentPhaseDesc: '' }),
      handlers: new Proxy({
        isGroupExpanded: () => false,
        onMarkAgendaReviewed: (clientId, agendaId) => { calls.reviewed = [clientId, agendaId]; },
        draftNoteFor: (clientId) => { calls.drafted = clientId; },
      }, { get: (t, p) => t[p] || (() => {}) }),
      isAdmin: true,
    });
    const sc = view.selectedClient;
    sc.sessionPrepAgendas[0].onMarkReviewed();
    sc.onDraftNoteFromPrep();
    expect(calls.reviewed).toEqual(['sp2', 'ag2']);
    expect(calls.drafted).toBe('sp2');
  });

  it('reports no agendas submitted yet for a client with none', () => {
    const v = makeView({ selectedClientId: 'c1', activeClientTab: 'sessionPrep' });
    expect(v.selectedClient.noSessionPrepAgendas).toBe(true);
  });
});

describe('buildView — Safety tab can add a risk flag to a note or a follow-up task', () => {
  it('wires onAddToNote and onCreateTask for an assigned client', () => {
    const calls = {};
    const view = buildView({
      S: { ...INITIAL_STATE, selectedClientId: 'c2' }, theme: LIGHT, allClients: () => CLIENTS,
      buildTreatmentPlan: (c) => ({ clientName: c.name, phases: [], milestones: [], currentPhaseLabel: '', currentPhaseDesc: '' }),
      handlers: new Proxy({
        isGroupExpanded: () => false,
        draftNoteFor: (clientId) => { calls.drafted = clientId; },
        onCreateTaskFromSafety: (clientId) => { calls.taskFor = clientId; },
      }, { get: (t, p) => t[p] || (() => {}) }),
      isAdmin: true,
    });
    const s = view.selectedClient.safety;
    s.onAddToNote();
    s.onCreateTask();
    expect(calls.drafted).toBe('c2');
    expect(calls.taskFor).toBe('c2');
  });

  it('does not offer add-to-note/create-task for an unassigned client', () => {
    const unassigned = { ...CLIENTS[0], id: 'unassigned-safety', unassigned: true };
    const v = makeView({ extraClients: [unassigned], selectedClientId: 'unassigned-safety' });
    expect(v.selectedClient.safety.onAddToNote).toBeUndefined();
    expect(v.selectedClient.safety.onCreateTask).toBeUndefined();
  });
});

describe('buildView — Settings persists real notification preferences (ifs_notification_preferences)', () => {
  it('builds one toggle row per real preference category, reading on/off from state', () => {
    const v = makeView({ notificationPrefs: { in_app_enabled: true, homework_enabled: false, session_agenda_enabled: true, treatment_plan_enabled: true, live_session_enabled: true, report_enabled: true, therapist_note_activity_enabled: true, general_updates_enabled: true } });
    expect(v.settingsToggles.map((s) => s.key)).toContain('homework_enabled');
    const homework = v.settingsToggles.find((s) => s.key === 'homework_enabled');
    expect(homework.trackStyle.justifyContent).toBe('flex-start');
    const inApp = v.settingsToggles.find((s) => s.key === 'in_app_enabled');
    expect(inApp.trackStyle.justifyContent).toBe('flex-end');
  });

  it('wires each toggle to toggleSetting with its own preference key', () => {
    let toggledKey = null;
    const view = buildView({
      S: { ...INITIAL_STATE }, theme: LIGHT, allClients: () => CLIENTS,
      buildTreatmentPlan: (c) => ({ clientName: c.name, phases: [], milestones: [], currentPhaseLabel: '', currentPhaseDesc: '' }),
      handlers: new Proxy({ isGroupExpanded: () => false, toggleSetting: (key) => { toggledKey = key; } }, { get: (t, p) => t[p] || (() => {}) }),
      isAdmin: true,
    });
    view.settingsToggles.find((s) => s.key === 'report_enabled').onClick();
    expect(toggledKey).toBe('report_enabled');
  });

  it('surfaces a saving indicator from state', () => {
    const v = makeView({ notificationPrefsSaving: true });
    expect(v.notificationPrefsSaving).toBe(true);
  });
});

describe('buildView — Assessments tab can set a review reminder (reuses createWorkspaceTask)', () => {
  const CLIENT_WITH_ASSESSMENT = {
    ...CLIENTS[0], id: 'as1', name: 'Assessment Test',
    assessmentHistory: [{ id: 'a1', dateLabel: 'Jun 1, 2026', primaryWound: 'abandonment', secondaryWound: null, subscales: [], tertiaryWounds: [], protectorTypes: [] }],
  };

  it('wires the Remind me to review action with the client id and the entry\'s date label', () => {
    let calledWith = null;
    const view = buildView({
      S: { ...INITIAL_STATE, extraClients: [CLIENT_WITH_ASSESSMENT], selectedClientId: 'as1' },
      theme: LIGHT, allClients: () => CLIENTS.concat([CLIENT_WITH_ASSESSMENT]),
      buildTreatmentPlan: (c) => ({ clientName: c.name, phases: [], milestones: [], currentPhaseLabel: '', currentPhaseDesc: '' }),
      handlers: new Proxy({
        isGroupExpanded: () => false,
        onCreateTaskFromAssessment: (clientId, dateLabel) => { calledWith = [clientId, dateLabel]; },
      }, { get: (t, p) => t[p] || (() => {}) }),
      isAdmin: true,
    });
    const entry = view.selectedClient.assessmentHistory[0];
    entry.onRemind();
    expect(calledWith).toEqual(['as1', 'Jun 1, 2026']);
  });

  it('does not offer a reminder action for an unassigned client', () => {
    const unassigned = { ...CLIENT_WITH_ASSESSMENT, id: 'as-unassigned', unassigned: true };
    const v = makeView({ extraClients: [unassigned], selectedClientId: 'as-unassigned' });
    expect(v.selectedClient.assessmentHistory[0].onRemind).toBeUndefined();
  });
});

describe('buildView — Caseload Management shows email, level, safety, and a deactivate control', () => {
  it('shows each row\'s email and gamification level, previously only visible after opening the client', () => {
    const v = makeView();
    const maya = v.clientListFiltered.find((c) => c.id === 'c1');
    expect(maya.email).toBe('maya.chen@example.com');
    expect(maya.level).toBe(5);
  });

  it('flags a client with an elevated (high/urgent) safety risk level, but not a "monitor"-level one', () => {
    const v = makeView();
    const jordan = v.clientListFiltered.find((c) => c.id === 'c2'); // riskLevel: 'high'
    expect(jordan.hasElevatedSafety).toBe(true);
    expect(jordan.safetyLabel).toBe('Safety risk');
    const maya = v.clientListFiltered.find((c) => c.id === 'c1'); // riskLevel: 'none'
    expect(maya.hasElevatedSafety).toBe(false);
  });

  it('wires each row\'s Deactivate action through to onDeactivateClient', () => {
    let deactivatedId = null;
    const view = buildView({
      S: { ...INITIAL_STATE }, theme: LIGHT, allClients: () => CLIENTS,
      buildTreatmentPlan: (c) => ({ clientName: c.name, phases: [], milestones: [], currentPhaseLabel: '', currentPhaseDesc: '' }),
      handlers: new Proxy({ isGroupExpanded: () => false, onDeactivateClient: (id) => { deactivatedId = id; } }, { get: (t, p) => t[p] || (() => {}) }),
      isAdmin: true,
    });
    const maya = view.clientListFiltered.find((c) => c.id === 'c1');
    maya.onDeactivate({ stopPropagation: () => {} });
    expect(deactivatedId).toBe('c1');
  });

  it('has no deactivated clients to show by default', () => {
    const v = makeView();
    expect(v.hasDeactivatedClients).toBe(false);
    expect(v.deactivatedClients).toEqual([]);
  });

  it('surfaces deactivated clients with a Reactivate action, and keeps them out of the active caseload, stats, review, and safety views', () => {
    let reactivatedId = null;
    // Mirrors what onDeactivateClient actually does in production: c1 is
    // removed from baseClients (the driving list for allClients()) *and*
    // added to dischargedClients — not just the latter in isolation.
    const S = {
      ...INITIAL_STATE,
      baseClients: CLIENTS.filter((c) => c.id !== 'c1'),
      dischargedClients: [{ id: 'c1', name: 'Maya Chen', dischargedAt: '2026-07-15T00:00:00.000Z' }],
    };
    const view = buildView({
      S, theme: LIGHT, allClients: () => S.baseClients,
      buildTreatmentPlan: (c) => ({ clientName: c.name, phases: [], milestones: [], currentPhaseLabel: '', currentPhaseDesc: '' }),
      handlers: new Proxy({ isGroupExpanded: () => false, onReactivateClient: (id) => { reactivatedId = id; } }, { get: (t, p) => t[p] || (() => {}) }),
      isAdmin: true,
    });
    expect(view.hasDeactivatedClients).toBe(true);
    expect(view.deactivatedClients).toHaveLength(1);
    expect(view.deactivatedClients[0].name).toBe('Maya Chen');
    view.deactivatedClients[0].onReactivate();
    expect(reactivatedId).toBe('c1');

    expect(view.clientListFiltered.some((c) => c.id === 'c1')).toBe(false);
    expect(view.stats.caseload).toBe(1); // Jordan only — Maya deactivated, Sam inactive
    expect(view.reviewItems.some((r) => r.clientName === 'Maya Chen')).toBe(false);
    expect(view.safetyRows.some((s) => s.name === 'Maya Chen')).toBe(false);
  });
});

describe('buildView — AI-Generated Practices draft can be edited, regenerated, or rejected', () => {
  it('wires the draft textarea to an edit handler and exposes regenerate/reject actions', () => {
    let editedTo = null; let regenerated = false; let rejected = false;
    const S = { ...INITIAL_STATE, generatedPractice: 'Original AI-generated draft text.' };
    const view = buildView({
      S, theme: LIGHT, allClients: () => CLIENTS,
      buildTreatmentPlan: (c) => ({ clientName: c.name, phases: [], milestones: [], currentPhaseLabel: '', currentPhaseDesc: '' }),
      handlers: new Proxy({
        isGroupExpanded: () => false,
        onPracticeDraftChange: (e) => { editedTo = e.target.value; },
        onGeneratePractice: () => { regenerated = true; },
        onRejectPractice: () => { rejected = true; },
      }, { get: (t, p) => t[p] || (() => {}) }),
      isAdmin: true,
    });
    expect(view.hasGeneratedPractice).toBe(true);
    expect(view.generatedPractice).toBe('Original AI-generated draft text.');
    view.onPracticeDraftChange({ target: { value: 'Edited by the Advisor before assigning.' } });
    expect(editedTo).toBe('Edited by the Advisor before assigning.');
    view.onGeneratePractice();
    expect(regenerated).toBe(true);
    view.onRejectPractice();
    expect(rejected).toBe(true);
  });

  it('has no draft to show, edit, or reject before anything is generated', () => {
    const v = makeView({ activeTab: 'clinical-practice' });
    expect(v.hasGeneratedPractice).toBe(false);
    expect(v.generatedPractice).toBeNull();
  });

  it('keeps the draft (and its Reject/Regenerate actions) mounted even after the Advisor clears all the text', () => {
    // A falsy-but-present '' must stay distinguishable from the null
    // "nothing generated yet" state, or clearing the textarea would yank
    // the whole editor (and the way back to it) out from under the Advisor.
    const v = makeView({ activeTab: 'clinical-practice', generatedPractice: '' });
    expect(v.hasGeneratedPractice).toBe(true);
    expect(v.generatedPractice).toBe('');
  });

  it('exposes a loading state while the real AI generation request is in flight', () => {
    const v = makeView({ activeTab: 'clinical-practice', practiceGenerating: true });
    expect(v.practiceGenerating).toBe(true);
  });

  it('surfaces a generation error message from the real AI backend', () => {
    const v = makeView({ activeTab: 'clinical-practice', practiceError: 'Unable to generate a practice draft.' });
    expect(v.practiceError).toBe('Unable to generate a practice draft.');
  });

  it('has no loading or error state by default', () => {
    const v = makeView({ activeTab: 'clinical-practice' });
    expect(v.practiceGenerating).toBe(false);
    expect(v.practiceError).toBe('');
  });
});
