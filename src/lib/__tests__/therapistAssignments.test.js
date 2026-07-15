import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';

// Build a chainable Supabase query mock whose terminal resolution is
// controlled per table by `tableResults`, so each test can script exactly
// which step in the fallback chain fails without a real Supabase client.
const tableResults = {};
function makeChain(result) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    in: () => chain,
    order: () => chain,
    then: (resolve) => resolve(result),
  };
  return chain;
}
const supabaseMock = { from: (table) => makeChain(tableResults[table] || { data: [], error: null }) };

vi.mock('../supabase', () => ({ supabase: supabaseMock }));
vi.mock('../apiAuth.js', () => ({ getClerkToken: async () => null }));

const originalFetch = globalThis.fetch;

const { loadAssignedClients, loadAssignedClientsWithStatus } = await import('../therapistAssignments.js');

beforeEach(() => {
  for (const key of Object.keys(tableResults)) delete tableResults[key];
  // Simulate the secure API route being unreachable so every test exercises
  // the Supabase fallback chain (where the completeness bugs live).
  globalThis.fetch = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({ error: { message: 'route down' } }) }));
});

afterAll(() => { globalThis.fetch = originalFetch; });

describe('loadAssignedClients — fallback chain', () => {
  it('returns assigned clients when every fallback step succeeds', async () => {
    tableResults.ifs_therapist_clients = { data: [{ client_id: 'c1', status: 'active' }], error: null };
    tableResults.ifs_clients = { data: [{ id: 'c1', name: 'Maya Chen' }], error: null };
    const rows = await loadAssignedClients('t1', 'id, name');
    expect(rows).toEqual([{ id: 'c1', name: 'Maya Chen' }]);
  });

  it('returns an empty array (not a throw) when the assignment lookup fails', async () => {
    tableResults.ifs_therapist_clients = { data: null, error: { message: 'db down' } };
    const rows = await loadAssignedClients('t1', 'id, name');
    expect(rows).toEqual([]);
  });
});

describe('loadAssignedClientsWithStatus — completeness signaling', () => {
  it('reports complete: true when the fallback chain fully succeeds', async () => {
    tableResults.ifs_therapist_clients = { data: [{ client_id: 'c1', status: 'active' }], error: null };
    tableResults.ifs_clients = { data: [{ id: 'c1', name: 'Maya Chen' }], error: null };
    const { data, complete } = await loadAssignedClientsWithStatus('t1', 'id, name');
    expect(complete).toBe(true);
    expect(data).toEqual([{ id: 'c1', name: 'Maya Chen' }]);
  });

  it('reports complete: false when the assignment lookup fails, instead of masking it as a valid empty caseload', async () => {
    tableResults.ifs_therapist_clients = { data: null, error: { message: 'db down' } };
    const { data, complete } = await loadAssignedClientsWithStatus('t1', 'id, name');
    expect(complete).toBe(false);
    expect(data).toEqual([]);
  });

  it('reports complete: false when the client record fetch fails after a successful assignment lookup', async () => {
    let call = 0;
    supabaseMock.from = (table) => {
      if (table === 'ifs_therapist_clients') {
        call += 1;
        return makeChain({ data: [{ client_id: 'c1', status: 'active' }], error: null });
      }
      return makeChain({ data: null, error: { message: 'client fetch failed' } });
    };
    const { data, complete } = await loadAssignedClientsWithStatus('t1', 'id, name');
    expect(complete).toBe(false);
    expect(data).toEqual([]);
    expect(call).toBeGreaterThan(0);
    supabaseMock.from = (table) => makeChain(tableResults[table] || { data: [], error: null });
  });

  it('reports complete: false when includeUnassigned is set and the unassigned lookup step fails', async () => {
    let step = 0;
    supabaseMock.from = (table) => {
      if (table === 'ifs_therapist_clients') {
        step += 1;
        // First call = this therapist's assignments (succeeds).
        if (step === 1) return makeChain({ data: [{ client_id: 'c1', status: 'active' }], error: null });
        // Second call = the "all claimed client ids" lookup for unassigned detection (fails).
        return makeChain({ data: null, error: { message: 'unassigned lookup failed' } });
      }
      return makeChain({ data: [{ id: 'c1', name: 'Maya Chen' }], error: null });
    };
    const { data, complete } = await loadAssignedClientsWithStatus('t1', 'id, name, assignment_status', { includeUnassigned: true });
    expect(complete).toBe(false);
    // The assigned clients gathered before the failure are still returned...
    expect(data).toEqual([{ id: 'c1', name: 'Maya Chen', assignment_status: 'active' }]);
    supabaseMock.from = (table) => makeChain(tableResults[table] || { data: [], error: null });
  });
});
