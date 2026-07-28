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

let mockLifeReflectionsResult = { data: [], error: null };
vi.mock('../lifeIntegration.js', () => ({
  loadSharedLifeIntegrationReflectionsForAdvisor: async () => mockLifeReflectionsResult,
}));

const mockMarkAgendaReviewedCalls = [];
vi.mock('../sessionAgendas.js', () => ({
  loadTherapistClientSessionAgendas: async () => ({ data: [], error: null }),
  markSessionAgendaReviewed: async (agendaId) => { mockMarkAgendaReviewedCalls.push(agendaId); return { data: { id: agendaId, status: 'reviewed' }, error: null }; },
}));

const {
  initialsFrom, daysSince, mapClientRow, mapNoteEntry, deriveWorkspaceDetail, WORKSPACE_WOUNDS, mergeCaseloadRefresh,
  generateWorkspaceReport, loadWorkspaceReports, loadWorkspaceNotifications, markWorkspaceNotificationRead, markAllWorkspaceNotificationsRead,
  loadWorkspaceLifeReflections, buildClientReportHtml, markWorkspaceAgendaReviewed,
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

  it('merges real tertiary wounds and protector types from ifs_assessment_results, matched by retake id', () => {
    const analytics = {
      assessmentTrajectory: [
        { id: 'a1', date: '2026-06-01T00:00:00Z', primaryWound: 'betrayal', secondaryWound: 'helplessness', scores: { abandonment: 6, shame: 5, neglect: 5, betrayal: 20, helplessness: 15 } },
      ],
    };
    const assessmentExtras = [{ id: 'a1', tertiary_wounds: ['shame', 'neglect', 'not-a-real-wound'], protector_types: ['Perfectionist', 'People-pleaser'] }];
    const { client } = deriveWorkspaceDetail(base, { analytics, notes: [], plans: [], messages: [], assessmentExtras });
    expect(client.assessmentHistory[0].tertiaryWounds).toEqual(['shame', 'neglect']); // invalid wound filtered out
    expect(client.assessmentHistory[0].protectorTypes).toEqual(['Perfectionist', 'People-pleaser']);
  });

  it('leaves tertiaryWounds/protectorTypes empty when no matching extras row exists for a retake', () => {
    const analytics = { assessmentTrajectory: [{ id: 'a1', date: '2026-06-01T00:00:00Z', scores: {} }] };
    const { client } = deriveWorkspaceDetail(base, { analytics, notes: [], plans: [], messages: [], assessmentExtras: [] });
    expect(client.assessmentHistory[0].tertiaryWounds).toEqual([]);
    expect(client.assessmentHistory[0].protectorTypes).toEqual([]);
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

  it('populates qaAnswers from real ifs_module_answers rows, newest first', () => {
    const moduleAnswers = [
      { module_id: 'mod-1', answers: { 'What did you notice?': 'A tightness in my chest.' }, updated_at: '2026-07-01T00:00:00Z' },
      { module_id: 'mod-2', answers: { 'What does this part need?': 'To feel safe.', 'Empty answer': '   ' }, updated_at: '2026-07-10T00:00:00Z' },
    ];
    const { client } = deriveWorkspaceDetail(base, { analytics: null, notes: [], plans: [], messages: [], moduleAnswers, progress: [] });
    expect(client.qaAnswers).toEqual([
      { question: 'What does this part need?', answer: 'To feel safe.' },
      { question: 'What did you notice?', answer: 'A tightness in my chest.' },
    ]);
  });

  it('merges in ifs_client_progress.responses as a fallback without duplicating questions already answered', () => {
    const moduleAnswers = [{ module_id: 'mod-1', answers: { 'Shared question': 'From module_answers' }, updated_at: '2026-07-01T00:00:00Z' }];
    const progress = [{ module_id: 'mod-1', responses: { 'Shared question': 'Stale duplicate', 'Legacy question': 'From client_progress' }, updated_at: '2026-06-01T00:00:00Z' }];
    const { client } = deriveWorkspaceDetail(base, { analytics: null, notes: [], plans: [], messages: [], moduleAnswers, progress });
    expect(client.qaAnswers).toHaveLength(2);
    expect(client.qaAnswers.find((qa) => qa.question === 'Shared question').answer).toBe('From module_answers');
    expect(client.qaAnswers.find((qa) => qa.question === 'Legacy question').answer).toBe('From client_progress');
  });

  it('resets qaAnswers to empty instead of leaking a prior enrichment through on a re-derive with no real answers', () => {
    const alreadyEnriched = { ...base, qaAnswers: [{ question: 'stale', answer: 'stale' }] };
    const { client } = deriveWorkspaceDetail(alreadyEnriched, { analytics: null, notes: [], plans: [], messages: [], moduleAnswers: [], progress: [] });
    expect(client.qaAnswers).toEqual([]);
  });

  it('populates streak/level from a real ifs_gamification row', () => {
    const { client } = deriveWorkspaceDetail(base, { analytics: null, notes: [], plans: [], messages: [], gamification: { level: 4, streak_current: 12 } });
    expect(client.streak).toBe(12);
    expect(client.level).toBe(4);
  });

  it('defaults streak/level to 0/1 when the client has no gamification row', () => {
    const { client } = deriveWorkspaceDetail(base, { analytics: null, notes: [], plans: [], messages: [], gamification: null });
    expect(client.streak).toBe(0);
    expect(client.level).toBe(1);
  });

  it('does not leak a prior enrichment\'s streak/level through on a re-derive that finds no gamification row', () => {
    const alreadyEnriched = { ...base, streak: 30, level: 6 };
    const { client } = deriveWorkspaceDetail(alreadyEnriched, { analytics: null, notes: [], plans: [], messages: [], gamification: null });
    expect(client.streak).toBe(0);
    expect(client.level).toBe(1);
  });

  it('maps real ifs_assigned_homework rows into betweenSession.assignments with real title/status/instructions/feedback', () => {
    const assignedHomework = [
      { id: 'hw1', title: 'Self-Connection Journal', module_id: 'mod-1', status: 'reviewed', instructions: 'Focus on the abandonment part.', therapist_feedback: 'Great insight this week.', assigned_at: '2026-06-01T00:00:00Z', completed_at: '2026-06-05T00:00:00Z' },
      { id: 'hw2', module_id: 'mod-2', status: 'assigned', assigned_at: '2026-06-10T00:00:00Z' },
    ];
    const { client } = deriveWorkspaceDetail(base, { analytics: null, notes: [], plans: [], messages: [], assignedHomework });
    expect(client.betweenSession.assignments).toHaveLength(2);
    const [reviewed, assigned] = client.betweenSession.assignments;
    expect(reviewed.title).toBe('Self-Connection Journal');
    expect(reviewed.statusLabel).toBe('Reviewed');
    expect(reviewed.instructions).toBe('Focus on the abandonment part.');
    expect(reviewed.advisorFeedback).toBe('Great insight this week.');
    expect(assigned.title).toBe('mod-2'); // falls back to module_id when no title was set
    expect(assigned.statusLabel).toBe('Assigned');
    expect(assigned.advisorFeedback).toBe('');
  });

  it('resets betweenSession.assignments to empty instead of leaking a prior enrichment through when a re-derive finds none', () => {
    const alreadyEnriched = { ...base, betweenSession: { ...base.betweenSession, assignments: [{ id: 'stale', title: 'stale' }] } };
    const { client } = deriveWorkspaceDetail(alreadyEnriched, { analytics: null, notes: [], plans: [], messages: [], assignedHomework: [] });
    expect(client.betweenSession.assignments).toEqual([]);
  });

  it('maps real ifs_therapy_homework rows into betweenSession.freeformAssignments with completion notes and interactive summaries', () => {
    const freeformHomework = [
      {
        id: 'fh1', title: 'Notice the protector', description: 'Journal about your inner critic this week.',
        status: 'completed', completed: true, completed_at: '2026-06-05T00:00:00Z',
        completion_notes: 'I noticed it show up before my meeting.',
        interactive_responses: {},
      },
      { id: 'fh2', title: 'Body scan', status: 'assigned', completed: false, due_date: '2026-07-01' },
    ];
    const { client } = deriveWorkspaceDetail(base, { analytics: null, notes: [], plans: [], messages: [], freeformHomework });
    expect(client.betweenSession.freeformAssignments).toHaveLength(2);
    const [done, pending] = client.betweenSession.freeformAssignments;
    expect(done.title).toBe('Notice the protector');
    expect(done.statusLabel).toBe('Completed');
    expect(done.description).toBe('Journal about your inner critic this week.');
    expect(done.completionNotes).toBe('I noticed it show up before my meeting.');
    expect(pending.title).toBe('Body scan');
    expect(pending.statusLabel).toBe('Assigned');
    expect(pending.completionNotes).toBe('');
  });

  it('resets betweenSession.freeformAssignments to empty instead of leaking a prior enrichment through when a re-derive finds none', () => {
    const alreadyEnriched = { ...base, betweenSession: { ...base.betweenSession, freeformAssignments: [{ id: 'stale', title: 'stale' }] } };
    const { client } = deriveWorkspaceDetail(alreadyEnriched, { analytics: null, notes: [], plans: [], messages: [], freeformHomework: [] });
    expect(client.betweenSession.freeformAssignments).toEqual([]);
  });

  it('maps real ifs_session_agendas rows into client.agendas with structured fields and safety concerns', () => {
    const agendas = [
      {
        id: 'ag1', session_date: '2026-07-20', status: 'submitted', topics: 'Boundary setting with sister', active_parts: ['The Watcher', 'The Critic'],
        stuck_points: 'Not sure how to bring it up.', goals_for_session: 'Practice saying no.', current_stress_level: 6, current_mood_label: 'Anxious',
        safety_concerns: 'Client mentioned feeling hopeless this week.',
      },
    ];
    const { client } = deriveWorkspaceDetail(base, { analytics: null, notes: [], plans: [], messages: [], agendas });
    expect(client.agendas).toHaveLength(1);
    const a = client.agendas[0];
    expect(a.statusLabel).toBe('Submitted');
    expect(a.reviewed).toBe(false);
    expect(a.topics).toBe('Boundary setting with sister');
    expect(a.activeParts).toEqual(['The Watcher', 'The Critic']);
    expect(a.currentStressLevel).toBe(6);
    expect(a.safetyConcerns).toBe('Client mentioned feeling hopeless this week.');
  });

  it('marks reviewed agendas correctly and resets client.agendas to empty instead of leaking a prior enrichment through', () => {
    const reviewed = deriveWorkspaceDetail(base, { analytics: null, notes: [], plans: [], messages: [], agendas: [{ id: 'ag2', status: 'reviewed', session_date: '2026-07-01' }] });
    expect(reviewed.client.agendas[0].reviewed).toBe(true);
    expect(reviewed.client.agendas[0].statusLabel).toBe('Reviewed');

    const alreadyEnriched = { ...base, agendas: [{ id: 'stale', topics: 'stale' }] };
    const { client } = deriveWorkspaceDetail(alreadyEnriched, { analytics: null, notes: [], plans: [], messages: [], agendas: [] });
    expect(client.agendas).toEqual([]);
  });

  it('maps real ifs_part_relationships rows, resolving part ids to names from the full parts list', () => {
    const partRelationships = [
      { id: 'r1', from_part_id: 'p1', to_part_id: 'p2', relationship_type: 'protects', label: 'Protective bond', description: 'Shows up first in conflict.' },
      { id: 'r2', from_part_id: 'p1', to_part_id: 'p99', relationship_type: 'polarized_with' },
    ];
    const allParts = [{ id: 'p1', name: 'The Watcher' }, { id: 'p2', part_name: 'The Wounded Child' }];
    const { client } = deriveWorkspaceDetail(base, { analytics: null, notes: [], plans: [], messages: [], partRelationships, allParts });
    expect(client.partRelationships).toHaveLength(2);
    expect(client.partRelationships[0].fromName).toBe('The Watcher');
    expect(client.partRelationships[0].toName).toBe('The Wounded Child');
    expect(client.partRelationships[0].typeLabel).toBe('protects');
    expect(client.partRelationships[0].label).toBe('Protective bond');
    expect(client.partRelationships[1].toName).toBe('Unknown part'); // p99 not in allParts
  });

  it('resets partRelationships to empty instead of leaking a prior enrichment through when a re-derive finds none', () => {
    const alreadyEnriched = { ...base, partRelationships: [{ id: 'stale', fromName: 'stale' }] };
    const { client } = deriveWorkspaceDetail(alreadyEnriched, { analytics: null, notes: [], plans: [], messages: [], partRelationships: [], allParts: [] });
    expect(client.partRelationships).toEqual([]);
  });

  it('does not silently drop relationships beyond a fixed cap', () => {
    const partRelationships = Array.from({ length: 25 }, (_, i) => ({ id: `r${i}`, from_part_id: 'p1', to_part_id: 'p2', relationship_type: 'unknown' }));
    const allParts = [{ id: 'p1', name: 'A' }, { id: 'p2', name: 'B' }];
    const { client } = deriveWorkspaceDetail(base, { analytics: null, notes: [], plans: [], messages: [], partRelationships, allParts });
    expect(client.partRelationships).toHaveLength(25);
  });

  it('derives real between-session activity from data api/analytics/client.js already computes', () => {
    const analytics = {
      assessmentTrajectory: [],
      homeworkSummary: { totalAssigned: 6, inProgressCount: 1, completedCount: 4, reviewedCount: 3, completionPercentage: 67, averageDaysToCompletion: 2.5 },
      moodEntries: [
        { id: 'm1', date: '2026-07-01T00:00:00Z', mood: 3, energy: 6, emotions: ['Anxious'] },
        { id: 'm2', date: '2026-07-10T00:00:00Z', mood: 4, energy: 7, emotions: ['Hopeful', 'Calm'] },
      ],
      moodTrend: [{ week: '2026-W26', mood: 3, entries: 1 }, { week: '2026-W28', mood: 4, entries: 1 }],
      energyTrend: [{ week: '2026-W26', energy: 6, entries: 1 }],
      // stressTrend intentionally omitted from the fixture — it's always [] upstream (no stress column exists).
      journalEngagement: [{ week: '2026-W27', entries: 2 }],
      dataAvailability: { hasMoodData: true, hasJournalData: true, hasHomeworkData: true },
    };
    const { client } = deriveWorkspaceDetail(base, { analytics, notes: [], plans: [], messages: [] });
    expect(client.betweenSession.homeworkFunnel).toEqual({ totalAssigned: 6, inProgress: 1, completed: 4, reviewed: 3, completionPct: 67, avgDaysToComplete: 2.5 });
    // Most recent mood entry first.
    expect(client.betweenSession.moodEntries[0].id).toBe('m2');
    expect(client.betweenSession.moodEntries[0].emotions).toEqual(['Hopeful', 'Calm']);
    expect(client.betweenSession.moodTrend).toEqual([{ week: '2026-W26', value: 3 }, { week: '2026-W28', value: 4 }]);
    expect(client.betweenSession.energyTrend).toEqual([{ week: '2026-W26', value: 6 }]);
    expect(client.betweenSession.journalWeekly).toEqual([{ week: '2026-W27', count: 2 }]);
    expect(client.betweenSession.hasMoodData).toBe(true);
  });

  it('resets between-session activity to neutral defaults on a re-derive with no analytics data', () => {
    const alreadyEnriched = { ...base, betweenSession: { homeworkFunnel: { totalAssigned: 6, inProgress: 1, completed: 4, reviewed: 3, completionPct: 67, avgDaysToComplete: 2.5 }, moodEntries: [{ id: 'stale' }], moodTrend: [], energyTrend: [], journalWeekly: [], hasMoodData: true, hasJournalData: true, hasHomeworkData: true } };
    const { client } = deriveWorkspaceDetail(alreadyEnriched, { analytics: { assessmentTrajectory: [], homeworkSummary: {}, moodEntries: [], moodTrend: [], energyTrend: [], journalEngagement: [], dataAvailability: {} }, notes: [], plans: [], messages: [] });
    expect(client.betweenSession.moodEntries).toEqual([]);
    expect(client.betweenSession.homeworkFunnel.totalAssigned).toBe(0);
    expect(client.betweenSession.hasMoodData).toBe(false);
  });

  it('merges messages, notes, and assessment retakes into the timeline alongside analytics events, sorted newest-first', () => {
    const analytics = {
      assessmentTrajectory: [{ id: 'a1', date: '2026-07-01T00:00:00Z', primaryWound: 'shame', secondaryWound: 'neglect', scores: { abandonment: 4, shame: 10, neglect: 5, betrayal: 3, helplessness: 4 } }],
      homeworkSummary: { recentAssignments: [{ title: 'Body scan', status: 'completed', completed_at: '2026-07-05T00:00:00Z' }] },
      agendaSummary: {},
      treatmentPlanSummary: {},
      partsSummary: {},
    };
    const notes = [{ id: 'note1', note_type: 'session_note', content: 'Signed note', status: 'final', created_at: '2026-07-10T00:00:00Z' }];
    const messages = [{ id: 'm1', sender_role: 'client', body: 'hi', created_at: '2026-07-08T00:00:00Z' }];
    const { client } = deriveWorkspaceDetail(base, { analytics, notes, plans: [], messages });
    const types = client.timeline.map((e) => e.type);
    expect(types).toEqual(['note', 'message', 'practice', 'assessment']); // newest (Jul 10) first
    expect(client.timeline.every((e) => typeof e.id === 'string')).toBe(true);
    expect(new Set(client.timeline.map((e) => e.id)).size).toBe(client.timeline.length); // ids are unique
    // Real entity ids (namespaced by type) are used where available, not a
    // post-sort array index — this is what keeps React keys stable when a
    // new event is later inserted ahead of existing ones.
    expect(client.timeline.find((e) => e.type === 'note').id).toBe('note-note1');
    expect(client.timeline.find((e) => e.type === 'message').id).toBe('message-m1');
    expect(client.timeline.find((e) => e.type === 'assessment').id).toBe('assessment-a1');
  });

  it('keeps existing entities\' timeline ids stable when a newer event is inserted ahead of them', () => {
    const analytics = { assessmentTrajectory: [], homeworkSummary: {}, agendaSummary: {}, treatmentPlanSummary: {}, partsSummary: {} };
    const messages = [{ id: 'm1', sender_role: 'client', body: 'hi', created_at: '2026-07-01T00:00:00Z' }];
    const before = deriveWorkspaceDetail(base, { analytics, notes: [], plans: [], messages }).client.timeline;
    const idBefore = before.find((e) => e.type === 'message').id;
    const messagesWithNewer = [...messages, { id: 'm2', sender_role: 'therapist', body: 'hi back', created_at: '2026-07-15T00:00:00Z' }];
    const after = deriveWorkspaceDetail(base, { analytics, notes: [], plans: [], messages: messagesWithNewer }).client.timeline;
    const idAfter = after.find((e) => e.id === idBefore);
    expect(idAfter).toBeDefined(); // m1's id survived even though it's no longer index 0
  });

  it('leaves the timeline empty (not throwing) when a client has no dated activity at all', () => {
    const { client } = deriveWorkspaceDetail(base, { analytics: null, notes: [], plans: [], messages: [] });
    expect(client.timeline).toEqual([]);
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

describe('markWorkspaceAgendaReviewed', () => {
  it('delegates to the real ifs_session_agendas review API', async () => {
    const { error } = await markWorkspaceAgendaReviewed('ag1');
    expect(mockMarkAgendaReviewedCalls).toContain('ag1');
    expect(error).toBeNull();
  });
});

describe('loadWorkspaceLifeReflections', () => {
  it('returns an empty array without a clientId', async () => {
    expect(await loadWorkspaceLifeReflections(null)).toEqual([]);
  });

  it('maps real shared reflection rows with display labels/summaries attached', async () => {
    mockLifeReflectionsResult = {
      data: [{ id: 'r1', client_id: 'c1', reflection_type: 'trigger_reflection', situation: 'Partner was late texting back', part_noticed: 'The Watcher', emotion: 'Anxious', created_at: '2026-07-01T00:00:00Z', linked_part_name: 'The Watcher' }],
      error: null,
    };
    const rows = await loadWorkspaceLifeReflections('c1');
    expect(rows).toHaveLength(1);
    expect(rows[0].label).toBe('Reflected on a Trigger');
    expect(rows[0].summary).toBeTruthy();
    expect(rows[0].situation).toBe('Partner was late texting back');
    mockLifeReflectionsResult = { data: [], error: null };
  });

  it('returns an empty array (not a throw) when the API errors', async () => {
    mockLifeReflectionsResult = { data: null, error: { message: 'forbidden' } };
    const rows = await loadWorkspaceLifeReflections('c1');
    expect(rows).toEqual([]);
    mockLifeReflectionsResult = { data: [], error: null };
  });
});

describe('buildClientReportHtml', () => {
  const baseClient = {
    name: 'Jamie Rivera', email: 'jamie@example.com', primaryWound: 'shame', secondaryWound: 'neglect',
    assessmentHistory: [], betweenSession: { homeworkFunnel: {}, moodEntries: [] }, goals: [], parts: [],
  };

  it('renders client identity, wound labels, and a print control', () => {
    const html = buildClientReportHtml(baseClient, []);
    expect(html).toContain('Jamie Rivera');
    expect(html).toContain('jamie@example.com');
    expect(html).toContain('Shame');
    expect(html).toContain('Neglect');
    expect(html).toContain('window.print()');
  });

  it('renders real assessment history, mood entries, goals, parts, and notes when present', () => {
    const client = {
      ...baseClient,
      assessmentHistory: [{ dateLabel: '3 days ago', subscales: [{ wound: 'shame', score: 18, severity: 'High' }] }],
      betweenSession: {
        homeworkFunnel: { completed: 4, totalAssigned: 6, completionPct: 67 },
        moodEntries: [{ dateLabel: 'Yesterday', mood: 4, energy: 3 }],
        journalWeekly: [{ week: 'Jul 14', count: 0 }, { week: 'Jul 21', count: 3 }],
      },
      goals: [{ title: 'Reduce shame spirals', reviewInDays: 5 }],
      parts: [{ name: 'The Critic', category: 'manager', description: 'Status: active.' }],
    };
    const notes = [{ templateLabel: 'Session Note', date: 'Today', status: 'Signed & Locked', text: 'Client made progress.' }];
    const html = buildClientReportHtml(client, notes);
    expect(html).toContain('18 (High)');
    expect(html).toContain('4/6 completed (67%)');
    expect(html).toContain('Yesterday');
    expect(html).toContain('Jul 21');
    expect(html).toContain('<td>3</td>');
    expect(html).toContain('Reduce shame spirals');
    expect(html).toContain('The Critic');
    expect(html).toContain('Session Note');
    expect(html).toContain('Client made progress.');
  });

  it('shows neutral empty states instead of fabricating data when nothing real exists', () => {
    const html = buildClientReportHtml(baseClient, []);
    expect(html).toContain('No assessment retakes recorded yet.');
    expect(html).toContain('No mood check-ins recorded yet.');
    expect(html).toContain('No journal activity recorded yet.');
    expect(html).toContain('No active treatment goals.');
    expect(html).toContain('No parts recorded yet.');
    expect(html).toContain('No session notes recorded yet.');
  });

  it('omits zero-count weeks from journal engagement so only real activity is shown', () => {
    const client = { ...baseClient, betweenSession: { ...baseClient.betweenSession, journalWeekly: [{ week: 'Jul 7', count: 0 }] } };
    const html = buildClientReportHtml(client, []);
    expect(html).toContain('No journal activity recorded yet.');
    expect(html).not.toContain('Jul 7');
  });

  it('escapes HTML special characters to prevent script injection from stored fields', () => {
    const client = { ...baseClient, name: '<script>alert(1)</script>' };
    const notes = [{ templateLabel: 'Note', date: 'Today', status: 'Draft', text: '<img src=x onerror=alert(1)>' }];
    const html = buildClientReportHtml(client, notes);
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
    expect(html).toContain('&lt;script&gt;');
  });
});
