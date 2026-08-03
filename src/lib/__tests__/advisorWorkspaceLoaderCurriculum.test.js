import { describe, it, expect, vi, beforeEach } from 'vitest';

// Isolated from advisorWorkspaceLoader.test.js's own supabase mock — these
// curriculum-builder functions (added to close the "Personalized Curriculum
// Builder" feature-parity gap with TherapistDashboard.jsx's Lesson Editor)
// need their own minimal stubs for supabase, supabaseHelpers, and
// aiCurriculumPersonalizer.
let mockInsertResult = { error: null };
const mockInsertCalls = [];
let mockUpdateResult = { error: null };
const mockUpdateCalls = [];
let mockDeleteResult = { error: null };
const mockDeleteCalls = [];
let mockSelectResult = { data: [], error: null };
let mockSavePersonalizedCurriculumImpl = async () => null;
let mockAnalyzeResult = { personalizedModules: [{ id: 'm1', title: 'Module 1' }] };

vi.mock('../supabase', () => ({
  supabase: {
    from: (table) => ({
      insert: (payload) => {
        mockInsertCalls.push({ table, payload });
        return mockInsertResult;
      },
      update: (payload) => ({
        eq: (col, val) => {
          mockUpdateCalls.push({ table, payload, col, val });
          return mockUpdateResult;
        },
      }),
      delete: () => ({
        eq: (col, val) => {
          mockDeleteCalls.push({ table, col, val });
          return mockDeleteResult;
        },
      }),
      select: () => ({
        eq: () => ({
          order: () => mockSelectResult,
        }),
      }),
    }),
  },
  supabaseHelpers: {
    savePersonalizedCurriculum: (...args) => mockSavePersonalizedCurriculumImpl(...args),
  },
}));

vi.mock('../aiCurriculumPersonalizer.js', () => ({
  aiCurriculumPersonalizer: {
    analyzeAndPersonalize: () => mockAnalyzeResult,
  },
}));

const {
  generateWorkspacePersonalizedCurriculum,
  updateWorkspaceCurriculumModule,
  addWorkspaceCurriculumModule,
  removeWorkspaceCurriculumModule,
  loadWorkspaceCurriculumModulesForBuilder,
} = await import('../advisorWorkspaceLoader.js');

beforeEach(() => {
  mockInsertResult = { error: null };
  mockInsertCalls.length = 0;
  mockUpdateResult = { error: null };
  mockUpdateCalls.length = 0;
  mockDeleteResult = { error: null };
  mockDeleteCalls.length = 0;
  mockSelectResult = { data: [], error: null };
  mockSavePersonalizedCurriculumImpl = async () => null;
  mockAnalyzeResult = { personalizedModules: [{ id: 'm1', title: 'Module 1' }] };
});

describe('generateWorkspacePersonalizedCurriculum', () => {
  it('saves the AI-personalized curriculum and inserts a fresh assessment record', async () => {
    const saveCalls = [];
    mockSavePersonalizedCurriculumImpl = async (clientId, curriculum) => { saveCalls.push({ clientId, curriculum }); return null; };
    const { error } = await generateWorkspacePersonalizedCurriculum('c1', 'shame', 'neglect');
    expect(error).toBeNull();
    expect(saveCalls).toHaveLength(1);
    expect(saveCalls[0].clientId).toBe('c1');
    const assessInsert = mockInsertCalls.find((c) => c.table === 'ifs_assessment_results');
    expect(assessInsert).toBeDefined();
    expect(assessInsert.payload.client_id).toBe('c1');
    expect(assessInsert.payload.primary_wound).toBe('shame');
    expect(assessInsert.payload.secondary_wound).toBe('neglect');
    expect(assessInsert.payload.shame_score).toBe(20);
    expect(assessInsert.payload.neglect_score).toBe(12);
    expect(assessInsert.payload.abandonment_score).toBe(2);
    expect(assessInsert.payload.tertiary_wounds).toEqual(['abandonment', 'betrayal', 'helplessness']);
  });

  it('errors without generating when the personalizer returns no modules', async () => {
    mockAnalyzeResult = { personalizedModules: [] };
    const saveCalls = [];
    mockSavePersonalizedCurriculumImpl = async () => { saveCalls.push(1); return null; };
    const { error } = await generateWorkspacePersonalizedCurriculum('c1', 'shame', 'neglect');
    expect(error).toBeTruthy();
    expect(saveCalls).toHaveLength(0);
  });

  it('rejects a missing client id without hitting the personalizer', async () => {
    const { error } = await generateWorkspacePersonalizedCurriculum('', 'shame', 'neglect');
    expect(error).toBeTruthy();
    expect(mockInsertCalls).toHaveLength(0);
  });
});

describe('updateWorkspaceCurriculumModule', () => {
  it('updates title, description, and estimated minutes for a module', async () => {
    const { error } = await updateWorkspaceCurriculumModule('mod1', { title: 'New title', description: 'New desc', estimatedMinutes: 45 });
    expect(error).toBeNull();
    expect(mockUpdateCalls).toHaveLength(1);
    expect(mockUpdateCalls[0].table).toBe('ifs_personalized_curriculum');
    expect(mockUpdateCalls[0].payload).toMatchObject({ module_title: 'New title', module_description: 'New desc', estimated_minutes: 45 });
    expect(mockUpdateCalls[0].val).toBe('mod1');
  });

  it('rejects a missing module id without hitting the network', async () => {
    const { error } = await updateWorkspaceCurriculumModule('', { title: 'x', description: 'y', estimatedMinutes: 30 });
    expect(error).toBeTruthy();
    expect(mockUpdateCalls).toHaveLength(0);
  });
});

describe('addWorkspaceCurriculumModule', () => {
  it('inserts a new module from a wound-specific template', async () => {
    const template = { id: 't1', title: 'Understanding Your Lonely Child', description: 'desc', goals: 'g', topics: ['t'], activities: ['a'], watchFor: ['w'], estimatedMinutes: 75, difficulty: 'beginner' };
    const { error } = await addWorkspaceCurriculumModule('c1', 'abandonment', template, 3);
    expect(error).toBeNull();
    expect(mockInsertCalls).toHaveLength(1);
    const payload = mockInsertCalls[0].payload;
    expect(payload.client_id).toBe('c1');
    expect(payload.module_order).toBe(3);
    expect(payload.module_title).toBe(template.title);
    expect(payload.primary_wound_focus).toBe('abandonment');
    expect(payload.customized_content.woundFocus).toBe('abandonment');
  });

  it('rejects a missing template without hitting the network', async () => {
    const { error } = await addWorkspaceCurriculumModule('c1', 'abandonment', null, 1);
    expect(error).toBeTruthy();
    expect(mockInsertCalls).toHaveLength(0);
  });
});

describe('removeWorkspaceCurriculumModule', () => {
  it('deletes the module and reorders the remaining modules sequentially', async () => {
    const { error } = await removeWorkspaceCurriculumModule('mod2', ['mod1', 'mod3']);
    expect(error).toBeNull();
    expect(mockDeleteCalls).toEqual([{ table: 'ifs_personalized_curriculum', col: 'id', val: 'mod2' }]);
    expect(mockUpdateCalls).toHaveLength(2);
    expect(mockUpdateCalls[0]).toMatchObject({ val: 'mod1', payload: { module_order: 1 } });
    expect(mockUpdateCalls[1]).toMatchObject({ val: 'mod3', payload: { module_order: 2 } });
  });

  it('stops before reordering if the delete itself fails', async () => {
    mockDeleteResult = { error: { message: 'boom' } };
    const { error } = await removeWorkspaceCurriculumModule('mod2', ['mod1']);
    expect(error).toBeTruthy();
    expect(mockUpdateCalls).toHaveLength(0);
  });
});

describe('loadWorkspaceCurriculumModulesForBuilder', () => {
  it('returns full rows including customized_content for the builder', async () => {
    mockSelectResult = { data: [{ id: 'm1', module_order: 1, module_title: 'Mod', customized_content: { goals: 'g' } }], error: null };
    const rows = await loadWorkspaceCurriculumModulesForBuilder('c1');
    expect(rows).toEqual(mockSelectResult.data);
  });

  it('returns an empty array without a client id', async () => {
    expect(await loadWorkspaceCurriculumModulesForBuilder('')).toEqual([]);
  });
});
