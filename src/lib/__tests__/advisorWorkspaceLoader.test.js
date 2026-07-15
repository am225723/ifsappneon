import { describe, it, expect, vi } from 'vitest';

// The loader imports supabase (browser client) transitively; stub it so the
// pure mappers can be tested in the Node test environment.
vi.mock('../supabase', () => ({ supabase: { from: () => ({ select: () => ({ eq: () => ({ order: () => ({ data: [], error: null }) }) }) }) } }));
vi.mock('../apiAuth.js', () => ({ getClerkToken: async () => null }));

const {
  initialsFrom, daysSince, mapClientRow, mapNoteEntry, deriveWorkspaceDetail, WORKSPACE_WOUNDS,
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
});
