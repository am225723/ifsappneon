import { describe, it, expect, vi, afterAll, beforeEach } from 'vitest';

// The loader imports supabase (browser client) transitively; stub it so the
// pure mappers can be tested in the Node test environment.
// vi.mock factories may only reference variables prefixed with "mock" (vitest
// hoisting rule) — this lets individual tests below override what a query
// against ifs_generated_reports resolves to.
let mockReportRows = { data: [], error: null };
let mockSelfEnergyRows = { data: [], error: null };
let mockUnburdeningResult = { data: null, error: null };
let mockExistingPartsResult = { data: [], error: null };
let mockAssessmentResultsRows = { data: [], error: null };
let mockLifeIntegrationRows = { data: [], error: null };
let mockJournalRows = { data: [], error: null };
let mockInteractiveOrRows = { data: [], error: null };
let mockLiveSessionRows = { data: [], error: null };
vi.mock('../supabase', () => ({
  supabase: {
    from: (table) => ({
      select: () => ({
        eq: () => ({
          // loadWorkspacePartSuggestions's existingParts query (ifs_parts)
          // is awaited directly off a single .eq(), with no further chaining.
          ...(table === 'ifs_parts' ? mockExistingPartsResult : { data: [], error: null }),
          order: () => ({
            limit: () => {
              if (table === 'ifs_generated_reports') return mockReportRows;
              if (table === 'ifs_assessment_results') return mockAssessmentResultsRows;
              if (table === 'ifs_life_integration_reflections') return mockLifeIntegrationRows;
              if (table === 'ifs_journal_entries') return mockJournalRows;
              return { data: [], error: null };
            },
          }),
          // loadWorkspaceSelfEnergyTrend's real query filters with .like()
          // before .order()/.limit(), unlike the ifs_generated_reports chain above.
          like: () => ({
            order: () => ({
              limit: () => (table === 'ifs_interactive_data' ? mockSelfEnergyRows : { data: [], error: null }),
            }),
          }),
          // loadWorkspaceUnburdeningRecord's real query filters on client_id
          // then module_id, then fetches a single row.
          eq: () => ({
            maybeSingle: () => (table === 'ifs_interactive_data' ? mockUnburdeningResult : { data: null, error: null }),
          }),
          // loadWorkspacePartSuggestions's interactiveRes query filters with
          // .or() before .order()/.limit().
          or: () => ({
            order: () => ({
              limit: () => (table === 'ifs_interactive_data' ? mockInteractiveOrRows : { data: [], error: null }),
            }),
          }),
          // loadWorkspaceActiveLiveSessions's real query filters with .in()
          // (status list) before .order() — no .limit() call.
          in: () => ({
            order: () => (table === 'ifs_live_sessions' ? mockLiveSessionRows : { data: [], error: null }),
          }),
        }),
      }),
    }),
  },
}));
vi.mock('../apiAuth.js', () => ({ getClerkToken: async () => null }));

let mockPartRelationshipsResult = { data: [], error: null };
const mockLoadPartRelationships = vi.fn(async () => mockPartRelationshipsResult);
vi.mock('../partRelationships.js', () => ({
  loadPartRelationships: mockLoadPartRelationships,
}));

let mockPartSuggestionStateResult = { data: [], error: null };
vi.mock('../partSuggestionState.js', async () => {
  const actual = await vi.importActual('../partSuggestionState.js');
  return { ...actual, loadPartSuggestionState: async () => mockPartSuggestionStateResult };
});

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

let mockAssignedHomeworkResult = { data: [], error: null };
const mockMarkHomeworkReviewedCalls = [];
const mockArchiveHomeworkCalls = [];
vi.mock('../assignedHomework.js', () => ({
  loadAssignedHomeworkForClient: async () => mockAssignedHomeworkResult,
  markAssignedHomeworkReviewed: async (id, feedback) => { mockMarkHomeworkReviewedCalls.push([id, feedback]); return { data: { id, status: 'reviewed' }, error: null }; },
  archiveAssignedHomework: async (id) => { mockArchiveHomeworkCalls.push(id); return { data: { id, status: 'archived' }, error: null }; },
}));

let mockHealingTimelineResult = { data: null, error: null };
vi.mock('../healingTimeline.js', () => ({
  loadHealingTimeline: async () => mockHealingTimelineResult,
}));

let mockCurriculumReflectionsResult = { data: [], error: null };
const mockLoadCurriculumReflections = vi.fn(async () => mockCurriculumReflectionsResult);
vi.mock('../curriculumReflections.js', () => ({
  loadCurriculumReflections: mockLoadCurriculumReflections,
}));

const {
  initialsFrom, daysSince, mapClientRow, mapNoteEntry, deriveWorkspaceDetail, WORKSPACE_WOUNDS, mergeCaseloadRefresh,
  generateWorkspaceReport, generateWorkspaceModuleInsights, loadWorkspaceReports, loadWorkspaceNotifications, markWorkspaceNotificationRead, markAllWorkspaceNotificationsRead,
  loadWorkspaceLifeReflections, buildClientReportHtml, markWorkspaceAgendaReviewed, loadWorkspaceHealingTimeline,
  loadCaseloadRiskAlerts, loadWorkspaceCurriculumReflections,
  markWorkspaceHomeworkReviewed, archiveWorkspaceHomework, refreshWorkspaceHomeworkForClient,
  loadWorkspaceSelfEnergyTrend, loadWorkspaceUnburdeningRecord, loadWorkspacePartSuggestions,
  loadWorkspaceClientDetail, loadWorkspaceActiveLiveSessions,
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

describe('loadWorkspaceClientDetail — part relationships assignment gate', () => {
  beforeEach(() => {
    mockLoadPartRelationships.mockClear();
    mockPartRelationshipsResult = { data: [{ id: 'r1', client_id: 'x', from_part_id: 'p1', to_part_id: 'p2', relationship_type: 'protects' }], error: null };
  });

  // ifs_part_relationships has no RLS policy at all, so loadWorkspaceClientDetail
  // must never even query it for an unassigned client — relying solely on the
  // view layer to hide the result isn't enough.
  it('never calls loadPartRelationships for an unassigned client, and returns an empty relationship list', async () => {
    const base = { id: 'new1', unassigned: true };
    const { client } = await loadWorkspaceClientDetail(base, 'therapist1');
    expect(mockLoadPartRelationships).not.toHaveBeenCalled();
    expect(client.partRelationships).toEqual([]);
  });

  it('still calls loadPartRelationships for an assigned client', async () => {
    const base = { id: 'c1', unassigned: false };
    await loadWorkspaceClientDetail(base, 'therapist1');
    expect(mockLoadPartRelationships).toHaveBeenCalledWith({ clientId: 'c1' });
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

describe('generateWorkspaceModuleInsights', () => {
  const originalFetch = globalThis.fetch;
  afterAll(() => { globalThis.fetch = originalFetch; });

  it('requires a clientId before calling the API', async () => {
    const { data, error } = await generateWorkspaceModuleInsights({ clientId: null });
    expect(data).toBeNull();
    expect(error).toBeTruthy();
  });

  it('returns the generated insights text on success', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ data: { insights: '1. Common themes\nSome patterns.', disclaimer: 'AI-generated preparation aid.', generatedAt: '2026-07-29T00:00:00Z', dataSources: { moduleResponseGroups: 3, curriculumProgress: 2, curriculumReflections: 0 } }, error: null }),
    }));
    const { data, error } = await generateWorkspaceModuleInsights({ clientId: 'c1', rangeDays: 60 });
    expect(error).toBeNull();
    expect(data.insights).toContain('Common themes');
    expect(data.dataSources.moduleResponseGroups).toBe(3);
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/ai-module-response-insights', expect.objectContaining({ method: 'POST' }));
  });

  it('surfaces a server-provided error message instead of throwing', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      json: async () => ({ error: { message: 'Client is not assigned to this therapist' } }),
    }));
    const { data, error } = await generateWorkspaceModuleInsights({ clientId: 'unassigned1' });
    expect(data).toBeNull();
    expect(error.message).toBe('Client is not assigned to this therapist');
  });

  it('handles a network failure gracefully', async () => {
    globalThis.fetch = vi.fn(async () => { throw new Error('network down'); });
    const { data, error } = await generateWorkspaceModuleInsights({ clientId: 'c1' });
    expect(data).toBeNull();
    expect(error.message).toBe('network down');
  });
});

describe('loadCaseloadRiskAlerts', () => {
  const originalFetch = globalThis.fetch;
  afterAll(() => { globalThis.fetch = originalFetch; });

  it('classifies a real flagged row with crisis language as concerning_language/high', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        data: [{
          client_id: 'c1', name: 'Maya Chen', last_active: new Date(Date.now() - 2 * 86400000).toISOString(),
          lowest_mood: null, topics: 'Feeling stuck with my sister', stuck_points: 'crisis at work too',
          reasons: ['Latest pre-session agenda mentions "stuck"', 'Latest pre-session agenda mentions "crisis"'],
        }],
      }),
    }));
    const alerts = await loadCaseloadRiskAlerts();
    expect(alerts).toHaveLength(1);
    expect(alerts[0].clientId).toBe('c1');
    expect(alerts[0].type).toBe('concerning_language');
    expect(alerts[0].level).toBe('high');
    expect(alerts[0].reasons).toHaveLength(2);
  });

  it('classifies a real low-mood-only row as mood/high', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ data: [{ client_id: 'c2', lowest_mood: 1, reasons: ['Mood score 1/5 in the last 7 days'] }] }),
    }));
    const alerts = await loadCaseloadRiskAlerts();
    expect(alerts[0].type).toBe('mood');
    expect(alerts[0].level).toBe('high');
  });

  it('classifies an inactivity-only row as inactivity/medium', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ data: [{ client_id: 'c3', lowest_mood: null, reasons: ['9+ days without login or module progress'] }] }),
    }));
    const alerts = await loadCaseloadRiskAlerts();
    expect(alerts[0].type).toBe('inactivity');
    expect(alerts[0].level).toBe('medium');
  });

  it('filters out rows with no real reasons', async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ data: [{ client_id: 'c4', reasons: [] }] }) }));
    const alerts = await loadCaseloadRiskAlerts();
    expect(alerts).toEqual([]);
  });

  it('returns an empty array (not a throw) on a server error or network failure', async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: false, json: async () => ({ error: { message: 'forbidden' } }) }));
    expect(await loadCaseloadRiskAlerts()).toEqual([]);
    globalThis.fetch = vi.fn(async () => { throw new Error('network down'); });
    expect(await loadCaseloadRiskAlerts()).toEqual([]);
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

describe('markWorkspaceHomeworkReviewed', () => {
  it('returns an error without an assignment id, without calling the API', async () => {
    const { error } = await markWorkspaceHomeworkReviewed(null, 'Great work');
    expect(error).toBeTruthy();
    expect(mockMarkHomeworkReviewedCalls).toHaveLength(0);
  });

  it('delegates to the real ifs_assigned_homework review API with feedback', async () => {
    const { error } = await markWorkspaceHomeworkReviewed('hw1', 'Great work this week.');
    expect(mockMarkHomeworkReviewedCalls).toContainEqual(['hw1', 'Great work this week.']);
    expect(error).toBeNull();
  });
});

describe('archiveWorkspaceHomework', () => {
  it('returns an error without an assignment id, without calling the API', async () => {
    const { error } = await archiveWorkspaceHomework(null);
    expect(error).toBeTruthy();
    expect(mockArchiveHomeworkCalls).toHaveLength(0);
  });

  it('delegates to the real ifs_assigned_homework archive API', async () => {
    const { error } = await archiveWorkspaceHomework('hw1');
    expect(mockArchiveHomeworkCalls).toContain('hw1');
    expect(error).toBeNull();
  });
});

describe('refreshWorkspaceHomeworkForClient', () => {
  it('returns null (not an empty array) without a clientId, so a caller never mistakes this for a real empty list', async () => {
    expect(await refreshWorkspaceHomeworkForClient(null)).toBeNull();
  });

  it('maps the real refetched assignment rows into the display shape', async () => {
    mockAssignedHomeworkResult = {
      data: [{ id: 'hw1', title: 'Meeting Your Parts', status: 'reviewed', therapist_feedback: 'Nice work.', assigned_at: new Date().toISOString() }],
      error: null,
    };
    const rows = await refreshWorkspaceHomeworkForClient('c1');
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('hw1');
    expect(rows[0].statusLabel).toBe('Reviewed');
    expect(rows[0].advisorFeedback).toBe('Nice work.');
    mockAssignedHomeworkResult = { data: [], error: null };
  });

  it('returns null (not a throw, and not an empty array) when the API errors, so a caller can tell "failed" apart from "genuinely empty" and avoid wiping already-displayed assignments', async () => {
    mockAssignedHomeworkResult = { data: null, error: { message: 'forbidden' } };
    const rows = await refreshWorkspaceHomeworkForClient('c1');
    expect(rows).toBeNull();
    mockAssignedHomeworkResult = { data: [], error: null };
  });
});

describe('loadWorkspaceSelfEnergyTrend', () => {
  it('returns an empty array without a clientId', async () => {
    expect(await loadWorkspaceSelfEnergyTrend(null, true)).toEqual([]);
  });

  // ifs_interactive_data's RLS doesn't restrict reads to the client's
  // assigned Advisor (same reasoning as loadWorkspaceCurriculumReflections),
  // so this refuses to fetch at all unless the caller has confirmed assignment.
  it('returns an empty array without calling the API when the caller has not confirmed assignment', async () => {
    expect(await loadWorkspaceSelfEnergyTrend('c1', false)).toEqual([]);
    expect(await loadWorkspaceSelfEnergyTrend('c1')).toEqual([]);
  });

  it('maps real daily check-in rows into date-sorted Self-Energy/mood/parts/intention entries', () => {
    mockSelfEnergyRows = {
      data: [
        { module_id: 'daily_checkin_2026-07-05', data: { selfEnergy: 7, mood: 4, activeParts: ['the-watcher'], intention: 'Stay grounded today.' }, updated_at: '2026-07-05T00:00:00Z' },
        { module_id: 'daily_checkin_2026-07-01', data: { selfEnergy: 3, mood: 2, activeParts: ['the-watcher', 'little-maya'], intention: '' }, updated_at: '2026-07-01T00:00:00Z' },
      ],
      error: null,
    };
    return loadWorkspaceSelfEnergyTrend('c1', true).then((rows) => {
      expect(rows).toHaveLength(2);
      // Sorted ascending by date, not by fetch order.
      expect(rows[0].date).toBe('2026-07-01');
      expect(rows[0].selfEnergy).toBe(3);
      expect(rows[0].activeParts).toEqual(['the-watcher', 'little-maya']);
      expect(rows[1].date).toBe('2026-07-05');
      expect(rows[1].intention).toBe('Stay grounded today.');
      mockSelfEnergyRows = { data: [], error: null };
    });
  });

  it('returns an empty array (not a throw) when the API errors', async () => {
    mockSelfEnergyRows = { data: null, error: { message: 'forbidden' } };
    const rows = await loadWorkspaceSelfEnergyTrend('c1', true);
    expect(rows).toEqual([]);
    mockSelfEnergyRows = { data: [], error: null };
  });
});

describe('loadWorkspaceUnburdeningRecord', () => {
  it('returns null without a clientId', async () => {
    expect(await loadWorkspaceUnburdeningRecord(null, true)).toBeNull();
  });

  // ifs_interactive_data's RLS doesn't restrict reads to the client's
  // assigned Advisor (same reasoning as loadWorkspaceCurriculumReflections/
  // loadWorkspaceSelfEnergyTrend), so this refuses to fetch at all unless
  // the caller has confirmed assignment.
  it('returns null without calling the API when the caller has not confirmed assignment', async () => {
    mockUnburdeningResult = { data: { data: { currentStep: 5 } }, error: null };
    expect(await loadWorkspaceUnburdeningRecord('c1', false)).toBeNull();
    expect(await loadWorkspaceUnburdeningRecord('c1')).toBeNull();
    mockUnburdeningResult = { data: null, error: null };
  });

  it('returns null (not a stale record) when the client has no ceremony row yet', async () => {
    mockUnburdeningResult = { data: null, error: null };
    expect(await loadWorkspaceUnburdeningRecord('c1', true)).toBeNull();
  });

  it('maps a real in-progress row into structured completion metadata only', async () => {
    mockUnburdeningResult = {
      data: {
        data: {
          currentStep: 5,
          completedAt: null,
          element: 'water',
          qualityChosen: null,
          responses: { step1: { bodyLocation: 'Chest' } },
        },
        updated_at: '2026-07-20T00:00:00Z',
      },
      error: null,
    };
    const record = await loadWorkspaceUnburdeningRecord('c1', true);
    expect(record.currentStep).toBe(5);
    expect(record.completed).toBe(false);
    expect(record.element).toBe('water');
    expect(record.bodyLocation).toBe('Chest');
    expect(record.moodAfter).toBeNull();
    mockUnburdeningResult = { data: null, error: null };
  });

  it('maps a completed row, excluding any free-text journal fields', async () => {
    mockUnburdeningResult = {
      data: {
        data: {
          currentStep: 8,
          completedAt: '2026-07-22T00:00:00Z',
          element: 'fire',
          qualityChosen: 'Peace',
          responses: {
            step1: { bodyLocation: 'Shoulders' },
            step2: { burdenDescription: 'a long private description' },
            step8: { mood: 4, integrationReflection: 'a long private reflection' },
          },
        },
        updated_at: '2026-07-22T00:00:00Z',
      },
      error: null,
    };
    const record = await loadWorkspaceUnburdeningRecord('c1', true);
    expect(record.completed).toBe(true);
    expect(record.quality).toBe('Peace');
    expect(record.moodAfter).toBe(4);
    expect(record).not.toHaveProperty('burdenDescription');
    expect(record).not.toHaveProperty('integrationReflection');
    expect(JSON.stringify(record)).not.toContain('private');
    mockUnburdeningResult = { data: null, error: null };
  });

  it('returns null (not a throw) when the API errors', async () => {
    mockUnburdeningResult = { data: null, error: { message: 'forbidden' } };
    const record = await loadWorkspaceUnburdeningRecord('c1', true);
    expect(record).toBeNull();
    mockUnburdeningResult = { data: null, error: null };
  });
});

const resetPartSuggestionMocks = () => {
  mockExistingPartsResult = { data: [], error: null };
  mockPartRelationshipsResult = { data: [], error: null };
  mockInteractiveOrRows = { data: [], error: null };
  mockAssessmentResultsRows = { data: [], error: null };
  mockLifeIntegrationRows = { data: [], error: null };
  mockJournalRows = { data: [], error: null };
  mockCurriculumReflectionsResult = { data: [], error: null };
  mockPartSuggestionStateResult = { data: [], error: null };
};

describe('loadWorkspacePartSuggestions', () => {
  beforeEach(resetPartSuggestionMocks);

  it('returns null without a clientId', async () => {
    expect(await loadWorkspacePartSuggestions(null, true)).toBeNull();
  });

  // Several of these queries go straight to tables (ifs_interactive_data,
  // ifs_journal_entries, etc.) whose RLS doesn't restrict reads to the
  // client's assigned Advisor, so this refuses to fetch at all unless the
  // caller has confirmed assignment.
  it('returns null without calling the API when the caller has not confirmed assignment', async () => {
    mockAssessmentResultsRows = { data: [{ id: 'a1', assessment_type: 'assessment_wounds', data: { notes: 'shame' } }], error: null };
    expect(await loadWorkspacePartSuggestions('c1', false)).toBeNull();
    expect(await loadWorkspacePartSuggestions('c1')).toBeNull();
  });

  it('derives a real suggestion (a wound-pattern shame signal) into a pending-count summary', async () => {
    mockAssessmentResultsRows = { data: [{ id: 'a1', assessment_type: 'assessment_wounds', data: { notes: 'Client described ongoing shame around this pattern.' } }], error: null };
    const summary = await loadWorkspacePartSuggestions('c1', true);
    expect(summary.pendingPartsCount).toBeGreaterThan(0);
    expect(summary.topSuggestions.some((s) => s.name === 'Part carrying shame')).toBe(true);
    expect(summary.topSuggestions[0].sourceLabel).toBeTruthy();
  });

  it('excludes a suggestion the client already has as a real part, and reports zero pending', async () => {
    mockAssessmentResultsRows = { data: [{ id: 'a1', assessment_type: 'assessment_wounds', data: { notes: 'shame' } }], error: null };
    mockExistingPartsResult = { data: [{ id: 'p1', name: 'Part carrying shame', type: 'exile' }], error: null };
    const summary = await loadWorkspacePartSuggestions('c1', true);
    expect(summary.pendingPartsCount).toBe(0);
    expect(summary.topSuggestions).toEqual([]);
  });

  it('reflects persisted accept/dismiss state (ifs_part_suggestion_state) in the counts, not just the raw signal', async () => {
    mockAssessmentResultsRows = { data: [{ id: 'a1', assessment_type: 'assessment_wounds', data: { notes: 'shame' } }], error: null };
    mockPartSuggestionStateResult = { data: [{ suggestion_type: 'part', suggestion_id: 'part:assessment:assessment-wounds:part-carrying-shame:exile', status: 'dismissed' }], error: null };
    const summary = await loadWorkspacePartSuggestions('c1', true);
    expect(summary.pendingPartsCount).toBe(0);
    expect(summary.dismissedCount).toBe(1);
  });

  it('never exposes raw free-text journal/reflection content, only derived labels', async () => {
    mockJournalRows = { data: [{ id: 'j1', title: 'a very private secret about my triggers', created_at: '2026-07-01T00:00:00Z' }], error: null };
    const summary = await loadWorkspacePartSuggestions('c1', true);
    expect(JSON.stringify(summary)).not.toContain('a very private secret');
  });

  // buildPartSuggestions treats saved curriculum reflections (the same
  // content already surfaced verbatim on the workspace's own Curriculum
  // Reflections tab) as a distinct input source from the raw module-response
  // rows already covered by interactiveRows — this loader must feed both in.
  it('derives a suggestion from the client\'s saved curriculum reflections, not just raw module responses', async () => {
    mockCurriculumReflectionsResult = {
      data: [{ id: 'cr1', moduleTitle: 'Module 4', insight: 'A familiar wave of shame came up during this exercise.', partNoticed: '', selfEnergyQuality: '', nextPractice: '', createdAt: '2026-07-10T00:00:00Z' }],
      error: null,
    };
    const summary = await loadWorkspacePartSuggestions('c1', true);
    expect(summary.pendingPartsCount).toBeGreaterThan(0);
    expect(summary.topSuggestions.some((s) => s.sourceLabel === 'Curriculum reflection')).toBe(true);
  });

  it('returns null (not a throw) when a query errors', async () => {
    mockAssessmentResultsRows = { data: null, error: { message: 'forbidden' } };
    const summary = await loadWorkspacePartSuggestions('c1', true);
    expect(summary).toBeNull();
  });

  it('returns an empty-but-present summary when the client has no suggestion signals at all', async () => {
    const summary = await loadWorkspacePartSuggestions('c1', true);
    expect(summary).toEqual({
      pendingPartsCount: 0, pendingRelationshipsCount: 0, acceptedCount: 0, mergedCount: 0, dismissedCount: 0, topSuggestions: [],
    });
  });
});

describe('loadWorkspaceActiveLiveSessions', () => {
  beforeEach(() => { mockLiveSessionRows = { data: [], error: null }; });

  it('returns an empty array without a therapistId', async () => {
    expect(await loadWorkspaceActiveLiveSessions(null)).toEqual([]);
  });

  it('maps real active/paused session rows, most recently updated first', async () => {
    mockLiveSessionRows = {
      data: [
        { id: 'ls1', client_id: 'c1', status: 'active', current_activity: 'guided_breathing', started_at: '2026-07-29T00:00:00Z', updated_at: '2026-07-29T00:05:00Z' },
        { id: 'ls2', client_id: 'c2', status: 'paused', current_activity: null, started_at: '2026-07-28T00:00:00Z', updated_at: '2026-07-28T00:10:00Z' },
      ],
      error: null,
    };
    const rows = await loadWorkspaceActiveLiveSessions('therapist1');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual(expect.objectContaining({ id: 'ls1', clientId: 'c1', status: 'active', activity: 'guided_breathing' }));
    // current_activity can be null between activities — falls back to a label rather than showing blank.
    expect(rows[1].activity).toBe('Guided practice');
  });

  it('returns an empty array (not a throw) when the API errors', async () => {
    mockLiveSessionRows = { data: null, error: { message: 'forbidden' } };
    expect(await loadWorkspaceActiveLiveSessions('therapist1')).toEqual([]);
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

describe('loadWorkspaceHealingTimeline', () => {
  it('returns an error without a clientId, without calling the API', async () => {
    const { data, error } = await loadWorkspaceHealingTimeline(null);
    expect(data).toBeNull();
    expect(error).toBeTruthy();
  });

  it('maps a real healing timeline response into the display summary/timeline shape', async () => {
    mockHealingTimelineResult = {
      data: {
        summary: { modulesCompleted: 3, checkInsSubmitted: 2, goalsCompleted: 1, partsCreated: 4, journalEntries: 5, moodCheckIns: 6, lifeIntegrationReflections: 1, curriculumReflections: 0 },
        timeline: [{ id: 'evt1', title: 'You began mapping your inner system.', description: 'This marks the beginning.', source: 'Parts', date: '2026-07-01T00:00:00Z' }],
        dataAvailability: {},
      },
      error: null,
    };
    const { data, error } = await loadWorkspaceHealingTimeline('c1');
    expect(error).toBeNull();
    expect(data.summary.partsCreated).toBe(4);
    expect(data.timeline).toHaveLength(1);
    expect(data.timeline[0].title).toBe('You began mapping your inner system.');
    expect(data.timeline[0].dateLabel).toBeTruthy();
    mockHealingTimelineResult = { data: null, error: null };
  });

  it('surfaces a real API error instead of throwing', async () => {
    mockHealingTimelineResult = { data: null, error: 'You do not have permission to view this healing timeline.' };
    const { data, error } = await loadWorkspaceHealingTimeline('c1');
    expect(data).toBeNull();
    expect(error).toBe('You do not have permission to view this healing timeline.');
    mockHealingTimelineResult = { data: null, error: null };
  });
});

describe('loadWorkspaceCurriculumReflections', () => {
  beforeEach(() => {
    mockLoadCurriculumReflections.mockClear();
  });

  it('returns an empty array without a clientId, without calling the API', async () => {
    expect(await loadWorkspaceCurriculumReflections(null, true)).toEqual([]);
    expect(mockLoadCurriculumReflections).not.toHaveBeenCalled();
  });

  // ifs_interactive_data's RLS doesn't restrict reads to the client's
  // assigned Advisor (unlike the API-backed life reflections/healing
  // timeline siblings), so this loader refuses to fetch at all unless the
  // caller has already confirmed the client is assigned.
  it('returns an empty array without calling the API when the caller has not confirmed assignment', async () => {
    expect(await loadWorkspaceCurriculumReflections('c1', false)).toEqual([]);
    expect(await loadWorkspaceCurriculumReflections('c1')).toEqual([]);
    expect(mockLoadCurriculumReflections).not.toHaveBeenCalled();
  });

  it('maps real curriculum reflection rows into the display shape', async () => {
    mockCurriculumReflectionsResult = {
      data: [{
        id: 'cr1', moduleId: 'm1', moduleTitle: 'Meeting Your Parts', insight: 'I noticed a protector show up early.',
        partNoticed: 'The Watcher', selfEnergyQuality: 'Curious', nextPractice: 'Sit with the part for 5 minutes.',
        createdAt: '2026-07-01T00:00:00Z',
      }],
      error: null,
    };
    const rows = await loadWorkspaceCurriculumReflections('c1', true);
    expect(rows).toHaveLength(1);
    expect(rows[0].moduleTitle).toBe('Meeting Your Parts');
    expect(rows[0].insight).toBe('I noticed a protector show up early.');
    expect(rows[0].partNoticed).toBe('The Watcher');
    mockCurriculumReflectionsResult = { data: [], error: null };
  });

  it('returns an empty array (not a throw) when the API errors', async () => {
    mockCurriculumReflectionsResult = { data: null, error: { message: 'forbidden' } };
    const rows = await loadWorkspaceCurriculumReflections('c1', true);
    expect(rows).toEqual([]);
    mockCurriculumReflectionsResult = { data: [], error: null };
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
