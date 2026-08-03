import { describe, it, expect, vi, beforeEach } from 'vitest';

// Isolated from advisorWorkspaceLoader.test.js's own elaborate supabase mock
// (which doesn't model a bare .select().in() chain) so these three
// functions — all added for the Access & Features batch (account-status
// switch, caseload CSV aggregates, reminder logging) — can be tested
// against a minimal, purpose-built stub instead.
let mockUpdateResult = { error: null };
const mockUpdateCalls = [];
let mockSelectByTable = {};
let mockInsertNoteResult = { data: { id: 'note-1' }, error: null };
const mockInsertNoteCalls = [];

vi.mock('../supabase', () => ({
  supabase: {
    from: (table) => ({
      update: (payload) => ({
        eq: () => {
          mockUpdateCalls.push({ table, payload });
          return mockUpdateResult;
        },
      }),
      select: () => ({
        in: () => mockSelectByTable[table] || { data: [], error: null },
      }),
      insert: (payload) => {
        if (table === 'ifs_therapist_notes') mockInsertNoteCalls.push(payload);
        return { select: () => ({ single: () => mockInsertNoteResult }) };
      },
    }),
  },
}));

const {
  updateWorkspaceClientStatus,
  loadCaseloadCsvAggregates,
  logWorkspaceReminder,
} = await import('../advisorWorkspaceLoader.js');

beforeEach(() => {
  mockUpdateResult = { error: null };
  mockUpdateCalls.length = 0;
  mockSelectByTable = {};
  mockInsertNoteResult = { data: { id: 'note-1' }, error: null };
  mockInsertNoteCalls.length = 0;
});

describe('updateWorkspaceClientStatus', () => {
  it('updates ifs_clients.status for the given client', async () => {
    const { error } = await updateWorkspaceClientStatus('c1', 'inactive');
    expect(error).toBeNull();
    expect(mockUpdateCalls).toEqual([{ table: 'ifs_clients', payload: { status: 'inactive' } }]);
  });

  it('rejects a missing client id without hitting the network', async () => {
    const { error } = await updateWorkspaceClientStatus('', 'active');
    expect(error).toBeTruthy();
    expect(mockUpdateCalls).toHaveLength(0);
  });
});

describe('loadCaseloadCsvAggregates', () => {
  it('bulk-computes journal counts, avg mood, and activity completion per client', async () => {
    mockSelectByTable = {
      ifs_journal_entries: { data: [{ client_id: 'c1' }, { client_id: 'c1' }, { client_id: 'c2' }], error: null },
      ifs_mood_entries: { data: [{ client_id: 'c1', mood: 4 }, { client_id: 'c1', mood: 2 }], error: null },
      ifs_therapy_activity_progress: { data: [{ client_id: 'c1', completed: true }, { client_id: 'c1', completed: false }, { client_id: 'c2', completed: true }], error: null },
    };
    const result = await loadCaseloadCsvAggregates(['c1', 'c2']);
    expect(result.c1).toEqual({ journalCount: 2, avgMood: 3, activitiesCompleted: 1, activitiesTotal: 2 });
    expect(result.c2).toEqual({ journalCount: 1, avgMood: null, activitiesCompleted: 1, activitiesTotal: 1 });
  });

  it('returns an empty map for an empty client list without querying', async () => {
    expect(await loadCaseloadCsvAggregates([])).toEqual({});
  });

  it('isolates a single failing query instead of discarding the other two aggregates', async () => {
    mockSelectByTable = {
      ifs_journal_entries: { data: null, error: { message: 'permission denied' } },
      ifs_mood_entries: { data: [{ client_id: 'c1', mood: 5 }], error: null },
      ifs_therapy_activity_progress: { data: [{ client_id: 'c1', completed: true }], error: null },
    };
    const result = await loadCaseloadCsvAggregates(['c1']);
    expect(result.c1).toEqual({ journalCount: 0, avgMood: 5, activitiesCompleted: 1, activitiesTotal: 1 });
  });
});

describe('logWorkspaceReminder', () => {
  it('logs a type-prefixed reminder as a signed general note', async () => {
    const { error } = await logWorkspaceReminder({ therapistId: 't1', clientId: 'c1', type: 'checkin', message: 'How are you doing?' });
    expect(error).toBeNull();
    expect(mockInsertNoteCalls).toHaveLength(1);
    const payload = mockInsertNoteCalls[0];
    expect(payload.client_id).toBe('c1');
    expect(payload.therapist_id).toBe('t1');
    expect(payload.content).toBe('[REMINDER - CHECKIN] How are you doing?');
    expect(payload.status).toBe('final');
  });

  it('rejects a blank message without hitting the network', async () => {
    const { error } = await logWorkspaceReminder({ therapistId: 't1', clientId: 'c1', type: 'session', message: '   ' });
    expect(error).toBeTruthy();
    expect(mockInsertNoteCalls).toHaveLength(0);
  });
});
