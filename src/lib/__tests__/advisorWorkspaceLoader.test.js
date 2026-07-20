import { describe, it, expect, vi, afterAll } from 'vitest';

// The loader imports supabase (browser client) transitively; stub it so the
// pure mappers can be tested in the Node test environment.
// vi.mock factories may only reference variables prefixed with "mock" (vitest
// hoisting rule) — this lets individual tests below override what a query
// against ifs_generated_reports resolves to.
let mockReportRows = { data: [], error: null };
vi.mock('../supabase', () => ({
  supabase: {
    from: (table) => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => (table === 'ifs_generated_reports' ? mockReportRows : { data: [], error: null }),
          }),
        }),
      }),
    }),
  },
}));
vi.mock('../apiAuth.js', () => ({ getClerkToken: async () => null }));

let mockNotificationsResult = { data: [], error: null };
const mockMarkReadCalls = [];
const mockMarkAllReadCalls = [];
vi.mock('../notifications.js', () => ({
  loadNotifications: async () => mockNotificationsResult,
  markNotificationRead: async (id) => { mockMarkReadCalls.push(id); return { data: null, error: null }; },
  markAllNotificationsRead: async () => { mockMarkAllReadCalls.push(true); return { data: null, error: null }; },
}));

const {
  initialsFrom, daysSince, mapClientRow, mapNoteEntry, deriveWorkspaceDetail, WORKSPACE_WOUNDS, mergeCaseloadRefresh,
  generateWorkspaceReport, loadWorkspaceReports, loadWorkspaceNotifications, markWorkspaceNotificationRead, markAllWorkspaceNotificationsRead,
} = await import('../advisorWorkspaceLoader.js');

describe('initialsFrom', () => {
  it('builds up-to-two-letter initials', () => {
    expect(initialsFrom('Maya Chen')).toBe('MC');
    expect(initialsFrom('jordan')).toBe('J');
    expect(initialsFrom('  ')).toBe('—');
  });
});

describe('daysSince', () => {
  it('returns whole days elapsed and null for missing dates', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
    expect(daysSince(threeDaysAgo)).toBe(3);
    expect(daysSince(null)).toBeNull();
  });
});

describe('mapClientRow', () => {
  it('maps a raw client row into the workspace shape with safe defaults', () => {
    const row = { id: 'x1', name: 'Dana Lee', email: 'dana@example.com', phone: '555', status: 'active', last_active: new Date().toISOString() };
    const c = mapClientRow(row);
    expect(c.id).toBe('x1');
    expect(c.initial).toBe('DL');
    expect(c.status).toBe('active');
    expect(c.risk).toBeNull();
    // Every field the view model reads must exist so buildView never throws.
    expect(Object.keys(c.scores).sort()).toEqual([...WORKSPACE_WOUNDS].sort());
    expect(c.mbc).toEqual([]);
    expect(c.parts).toEqual([]);
    expect(c.messages).toEqual([]);
    expect(c.session.status).toBe('none');
    expect(c._detailLoaded).toBe(false);
  });

  it('flags extended inactivity as a risk and inactive status', () => {
    const row = { id: 'x2', name: 'Old Client', last_active: new Date(Date.now() - 25 * 86400000).toISOString() };
    const c = mapClientRow(row);
    expect(c.status).toBe('inactive');
    expect(c.risk).not.toBeNull();
    expect(c.risk.type).toBe('inactivity');
    expect(c.lastActiveDays).toBeGreaterThanOrEqual(24);
  });
});

describe('mapNoteEntry', () => {
  it('associates a note by client id with a readable template label', () => {
    const entry = mapNoteEntry({ note_type: 'session_note', content: 'Worked with the exile.', status: 'final', created_at: new Date().toISOString() }, 'x1');
    expect(entry.clientId).toBe('x1');
    expect(entry.templateLabel).toBe('Session Note');
    expect(entry.status).toBe('Signed & Locked');
    expect(entry.text).toContain('exile');
  });
});

describe('deriveWorkspaceDetail', () => {
  const base = mapClientRow({ id: 'x1', name: 'Maya Chen', last_active: new Date().toISOString() });

  it('derives wounds, scores, and progress from analytics', () => {
    const analytics = {
      assessmentTrajectory: [
        { primaryWound: 'betrayal', secondaryWound: 'helplessness', scores: { abandonment: 4, shame: 3, neglect: 2, betrayal: 18, rejection: 9, helplessness: 12 } },
      ],
      homeworkSummary: { completionPercentage: 64, completedCount: 7, recentAssignments: [] },
      partsSummary: { recentlyUpdated: [{ id: 'p1', name: 'The Wall', part_type: 'manager', is_active: true }] },
      agendaSummary: { totalSubmitted: 2, reviewedAgendas: 1, recentAgendaDates: [new Date().toISOString()] },
    };
    const { client } = deriveWorkspaceDetail(base, { analytics, notes: [], plans: [], messages: [] });
    expect(client.primaryWound).toBe('betrayal');
    expect(client.secondaryWound).toBe('helplessness');
    expect(client.scores.betrayal).toBe(18);
    expect(client.progressPct).toBe(64);
    expect(client.modulesCompleted).toBe(7);
    expect(client.parts[0].name).toBe('The Wall');
    expect(client.parts[0].category).toBe('manager');
    expect(client.pendingReview).not.toBeNull();
    expect(client._detailLoaded).toBe(true);
  });

  it('falls back to the highest-scoring wound when the stored primary is unsupported', () => {
    const analytics = {
      assessmentTrajectory: [{ primaryWound: 'rejection', secondaryWound: null, scores: { abandonment: 5, shame: 17, neglect: 2, betrayal: 1, helplessness: 3 } }],
    };
    const { client } = deriveWorkspaceDetail(base, { analytics, notes: [], plans: [], messages: [] });
    expect(WORKSPACE_WOUNDS).toContain(client.primaryWound);
    expect(client.primaryWound).toBe('shame'); // highest score, since 'rejection' isn't charted
  });

  it('maps treatment plans to goals and messages by author', () => {
    const plans = [{ goal_title: 'Build Self-energy', status: 'active', review_date: new Date(Date.now() + 10 * 86400000).toISOString() }];
    const messages = [
      { id: 'm1', sender_role: 'client', body: 'hello', created_at: '2026-01-01T00:00:00Z' },
      { id: 'm2', sender_role: 'therapist', body: 'hi back', created_at: '2026-01-02T00:00:00Z' },
    ];
    const { client, noteEntries } = deriveWorkspaceDetail(base, { analytics: null, notes: [{ note_type: 'general', content: 'n', created_at: new Date().toISOString() }], plans, messages });
    expect(client.goals[0].title).toBe('Build Self-energy');
    expect(client.messages.map((m) => m.from)).toEqual(['client', 'advisor']);
    expect(noteEntries).toHaveLength(1);
    expect(noteEntries[0].clientId).toBe('x1');
    expect(noteEntries[0].clientName).toBe('Maya Chen');
  });

  it('builds a newest-first assessment history from the real wound-pattern assessment trajectory', () => {
    const analytics = {
      assessmentTrajectory: [
        { id: 'a1', date: '2026-06-01T00:00:00Z', primaryWound: 'betrayal', secondaryWound: 'helplessness', scores: { abandonment: 6, shame: 5, neglect: 5, betrayal: 20, helplessness: 15 } },
        { id: 'a2', date: '2026-07-01T00:00:00Z', primaryWound: 'betrayal', secondaryWound: 'helplessness', scores: { abandonment: 5, shame: 6, neglect: 4, betrayal: 12, helplessness: 9 } },
      ],
    };
    const { client } = deriveWorkspaceDetail(base, { analytics, notes: [], plans: [], messages: [] });
    expect(client.assessmentHistory).toHaveLength(2);
    expect(client.assessmentHistory[0].id).toBe('a2'); // most recent first
    expect(client.assessmentHistory[1].id).toBe('a1');
    const betrayalNow = client.assessmentHistory[0].subscales.find((s) => s.wound === 'betrayal');
    expect(betrayalNow.score).toBe(12);
    expect(betrayalNow.delta).toBe(-8); // 12 - 20
    expect(betrayalNow.severity).toBe('Moderate'); // 11-17
    const betrayalOldest = client.assessmentHistory[1].subscales.find((s) => s.wound === 'betrayal');
    expect(betrayalOldest.delta).toBeNull(); // nothing to compare the first-ever retake against
    expect(betrayalOldest.severity).toBe('High'); // >= 18
  });

  it('resets assessment history to empty on a re-derive that finds no trajectory data', () => {
    const alreadyEnriched = { ...base, assessmentHistory: [{ id: 'stale', subscales: [] }] };
    const { client } = deriveWorkspaceDetail(alreadyEnriched, { analytics: { assessmentTrajectory: [] }, notes: [], plans: [], messages: [] });
    expect(client.assessmentHistory).toEqual([]);
  });

  it('builds MBC measures from the real wound-pattern assessment trajectory, primary/secondary first', () => {
    const analytics = {
      assessmentTrajectory: [
        { date: '2026-06-01T00:00:00Z', primaryWound: 'betrayal', secondaryWound: 'helplessness', scores: { abandonment: 6, shame: 5, neglect: 5, betrayal: 20, helplessness: 15 } },
        { date: '2026-07-01T00:00:00Z', primaryWound: 'betrayal', secondaryWound: 'helplessness', scores: { abandonment: 5, shame: 6, neglect: 4, betrayal: 12, helplessness: 9 } },
        { date: '2026-07-15T00:00:00Z', primaryWound: 'betrayal', secondaryWound: 'helplessness', scores: { abandonment: 4, shame: 4, neglect: 4, betrayal: 9, helplessness: 8 } },
      ],
    };
    const { client } = deriveWorkspaceDetail(base, { analytics, notes: [], plans: [], messages: [] });
    expect(client.mbc).toHaveLength(5);
    expect(client.mbc[0].code).toBe('betrayal');
    expect(client.mbc[1].code).toBe('helplessness');
    expect(client.mbc[0].baseline).toBe(20);
    expect(client.mbc[0].previous).toBe(12);
    expect(client.mbc[0].current).toBe(9);
    expect(client.mbc[0].history).toEqual([20, 12, 9]);
    expect(client.mbc[0].severity).toBe('Low'); // current 9 <= 10
    expect(client.mbc[0].date).toBeTruthy();
    // Remaining wounds ordered by current score, descending.
    const tailScores = client.mbc.slice(2).map((m) => m.current);
    expect(tailScores).toEqual([...tailScores].sort((a, b) => b - a));
  });

  it('labels severity bands from the current wound score', () => {
    const highAnalytics = { assessmentTrajectory: [{ date: new Date().toISOString(), primaryWound: 'shame', secondaryWound: 'neglect', scores: { abandonment: 1, shame: 22, neglect: 12, betrayal: 1, helplessness: 1 } }] };
    const { client: highClient } = deriveWorkspaceDetail(base, { analytics: highAnalytics, notes: [], plans: [], messages: [] });
    expect(highClient.mbc[0].severity).toBe('High'); // 22 >= 18
    expect(highClient.mbc[1].severity).toBe('Moderate'); // 12 is between 11 and 17
  });

  it('treats a single assessment as its own baseline/previous/current', () => {
    const analytics = { assessmentTrajectory: [{ date: new Date().toISOString(), primaryWound: 'abandonment', secondaryWound: 'shame', scores: { abandonment: 14, shame: 6, neglect: 5, betrayal: 5, helplessness: 5 } }] };
    const { client } = deriveWorkspaceDetail(base, { analytics, notes: [], plans: [], messages: [] });
    expect(client.mbc[0].baseline).toBe(14);
    expect(client.mbc[0].previous).toBe(14);
    expect(client.mbc[0].current).toBe(14);
    expect(client.mbc[0].history).toEqual([14]);
  });

  it('leaves mbc empty when the client has never taken the wound-pattern assessment', () => {
    const { client } = deriveWorkspaceDetail(base, { analytics: { assessmentTrajectory: [] }, notes: [], plans: [], messages: [] });
    expect(client.mbc).toEqual([]);
  });

  it('does not leak a prior enrichment\'s mbc through on a re-derive that finds no assessment data', () => {
    // Simulates re-deriving an already-enriched client (e.g. after claiming
    // resets _detailLoaded and forces a re-fetch) whose new analytics pass
    // comes back with no trajectory — the previous mbc must not survive the
    // {...base} spread.
    const alreadyEnriched = { ...base, mbc: [{ code: 'betrayal', name: 'Betrayal Wound Pattern', date: 'Jul 1', severity: 'High', baseline: 20, previous: 18, current: 19, history: [20, 18, 19] }] };
    const { client } = deriveWorkspaceDetail(alreadyEnriched, { analytics: { assessmentTrajectory: [] }, notes: [], plans: [], messages: [] });
    expect(client.mbc).toEqual([]);
  });
});

describe('mapClientRow — unassigned detection', () => {
  it('marks a client unassigned when assignment_status is null and the caseload was loaded with unassigned clients included', () => {
    const row = { id: 'new1', name: 'Fresh Signup', assignment_status: null };
    const c = mapClientRow(row);
    expect(c.unassigned).toBe(true);
  });

  it('marks a client assigned when assignment_status is present and non-null', () => {
    const row = { id: 'a1', name: 'Assigned Client', assignment_status: 'active' };
    const c = mapClientRow(row);
    expect(c.unassigned).toBe(false);
  });

  it('defaults to assigned (false) when assignment_status was not requested at all', () => {
    const row = { id: 'a2', name: 'Legacy Row' };
    const c = mapClientRow(row);
    expect(c.unassigned).toBe(false);
  });

  it('gives a natural-language inactivity message for clients with no recorded activity, not "999 days"', () => {
    const row = { id: 'x3', name: 'Never Logged In' };
    const c = mapClientRow(row);
    expect(c.risk).not.toBeNull();
    expect(c.risk.detail).not.toMatch(/999/);
    expect(c.risk.detail).toMatch(/no login or activity has been recorded/i);
  });
});

describe('mergeCaseloadRefresh', () => {
  it('adds brand-new clients returned by a refresh (e.g. a signup that landed after the page opened)', () => {
    const prev = [mapClientRow({ id: 'c1', name: 'Maya Chen', assignment_status: 'active' })];
    const fresh = [
      { id: 'c1', name: 'Maya Chen', assignment_status: 'active' },
      { id: 'c2', name: 'New Signup', assignment_status: null },
    ].map(mapClientRow);
    const merged = mergeCaseloadRefresh(prev, fresh);
    expect(merged.map((c) => c.id)).toEqual(['c1', 'c2']);
    expect(merged.find((c) => c.id === 'c2').unassigned).toBe(true);
  });

  it('preserves already-loaded detail fields for existing clients while refreshing base identity fields', () => {
    const base = mapClientRow({ id: 'c1', name: 'Maya Chen', assignment_status: 'active', last_active: new Date().toISOString() });
    const enriched = { ...base, _detailLoaded: true, progressPct: 78, parts: [{ id: 'p1', name: 'The Watcher' }] };
    const fresh = [{ id: 'c1', name: 'Maya Chen', assignment_status: 'active', last_active: new Date(Date.now() - 20 * 86400000).toISOString() }].map(mapClientRow);
    const merged = mergeCaseloadRefresh([enriched], fresh);
    expect(merged[0]._detailLoaded).toBe(true);
    expect(merged[0].progressPct).toBe(78);
    expect(merged[0].parts).toHaveLength(1);
    // Base fields (like inactivity-derived status) do get refreshed.
    expect(merged[0].lastActiveDays).toBeGreaterThanOrEqual(19);
  });

  it('reflects a claim (unassigned -> assigned) picked up on the next refresh', () => {
    const prev = [mapClientRow({ id: 'c2', name: 'New Signup', assignment_status: null })];
    const fresh = [{ id: 'c2', name: 'New Signup', assignment_status: 'active' }].map(mapClientRow);
    const merged = mergeCaseloadRefresh(prev, fresh);
    expect(merged[0].unassigned).toBe(false);
  });
});

describe('generateWorkspaceReport', () => {
  const originalFetch = globalThis.fetch;
  afterAll(() => { globalThis.fetch = originalFetch; });

  it('requires a clientId before calling the API', async () => {
    const { data, error } = await generateWorkspaceReport({ clientId: null });
    expect(data).toBeNull();
    expect(error).toBeTruthy();
  });

  it('returns the generated document data on success', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ data: { html: '<html>report</html>', reportId: 'r1', title: 'Clinical Summary Report — Maya Chen' }, error: null }),
    }));
    const { data, error } = await generateWorkspaceReport({ clientId: 'c1', reportType: 'clinical_summary', sections: { includeTreatmentPlans: true } });
    expect(error).toBeNull();
    expect(data.html).toContain('report');
    expect(data.reportId).toBe('r1');
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/generate-report', expect.objectContaining({ method: 'POST' }));
  });

  it('surfaces a server-provided error message instead of throwing', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      json: async () => ({ error: { message: 'Client is not assigned to this therapist' } }),
    }));
    const { data, error } = await generateWorkspaceReport({ clientId: 'unassigned1' });
    expect(data).toBeNull();
    expect(error.message).toBe('Client is not assigned to this therapist');
  });

  it('handles a network failure gracefully', async () => {
    globalThis.fetch = vi.fn(async () => { throw new Error('network down'); });
    const { data, error } = await generateWorkspaceReport({ clientId: 'c1' });
    expect(data).toBeNull();
    expect(error.message).toBe('network down');
  });
});

describe('loadWorkspaceReports', () => {
  it('returns an empty array without a clientId', async () => {
    expect(await loadWorkspaceReports(null)).toEqual([]);
  });

  it('returns mapped report audit rows for a client', async () => {
    mockReportRows = { data: [{ id: 'r1', report_type: 'clinical_summary', title: 'Clinical Summary — Maya Chen', sections_included: ['Growth Goals'], generated_at: '2026-07-01T00:00:00Z' }], error: null };
    const rows = await loadWorkspaceReports('c1');
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe('Clinical Summary — Maya Chen');
    mockReportRows = { data: [], error: null };
  });

  it('returns an empty array (not a throw) when the query errors', async () => {
    mockReportRows = { data: null, error: { message: 'db down' } };
    const rows = await loadWorkspaceReports('c1');
    expect(rows).toEqual([]);
    mockReportRows = { data: [], error: null };
  });
});

describe('loadWorkspaceNotifications', () => {
  it('maps real ifs_notifications rows into the workspace notification shape', async () => {
    mockNotificationsResult = {
      data: [
        { id: 'n1', client_id: 'c1', notification_type: 'homework_completed', priority: 'important', title: 'Practice completed', message: 'Maya finished Module 9.', created_at: new Date().toISOString(), read_at: null },
        { id: 'n2', client_id: 'c2', notification_type: 'session_agenda_submitted', priority: 'normal', title: 'Check-in submitted', message: '', created_at: new Date().toISOString(), read_at: new Date().toISOString() },
      ],
      error: null,
    };
    const rows = await loadWorkspaceNotifications();
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ id: 'n1', clientId: 'c1', type: 'homework_completed', priority: 'high', title: 'Practice completed', read: false });
    expect(rows[1]).toMatchObject({ id: 'n2', clientId: 'c2', priority: 'medium', read: true });
    mockNotificationsResult = { data: [], error: null };
  });

  it('defaults an unrecognized priority to medium rather than crashing the severity chip lookup', async () => {
    mockNotificationsResult = { data: [{ id: 'n3', client_id: null, notification_type: 'general_update', priority: 'weird_value', title: 'x', created_at: new Date().toISOString(), read_at: null }], error: null };
    const rows = await loadWorkspaceNotifications();
    expect(rows[0].priority).toBe('medium');
    expect(rows[0].clientId).toBeNull();
    mockNotificationsResult = { data: [], error: null };
  });

  it('returns an empty array (not a throw) when the API errors', async () => {
    mockNotificationsResult = { data: null, error: { message: 'unauthorized' } };
    const rows = await loadWorkspaceNotifications();
    expect(rows).toEqual([]);
    mockNotificationsResult = { data: [], error: null };
  });
});

describe('markWorkspaceNotificationRead / markAllWorkspaceNotificationsRead', () => {
  it('delegate to the real notifications API', async () => {
    await markWorkspaceNotificationRead('n1');
    expect(mockMarkReadCalls).toContain('n1');
    await markAllWorkspaceNotificationsRead();
    expect(mockMarkAllReadCalls.length).toBeGreaterThan(0);
  });
});
