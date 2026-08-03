import { describe, it, expect } from 'vitest';
import { csvFromRows } from '../documentExport.js';

describe('csvFromRows', () => {
  it('builds a header row plus one quoted row per data row', () => {
    const csv = csvFromRows(['Title', 'Client'], [['Clinical Summary', 'Maya Chen']]);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('"Title","Client"');
    expect(lines[1]).toBe('"Clinical Summary","Maya Chen"');
  });

  it('escapes embedded quotes and treats null/undefined cells as empty', () => {
    const csv = csvFromRows(['Title'], [['Say "Hi"'], [null], [undefined]]);
    const lines = csv.split('\n');
    expect(lines[1]).toBe('"Say ""Hi"""');
    expect(lines[2]).toBe('""');
    expect(lines[3]).toBe('""');
  });

  it('handles an empty row set', () => {
    expect(csvFromRows(['Title'], []).split('\n')).toHaveLength(1);
  });
});
