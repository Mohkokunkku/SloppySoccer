import { expect, it } from 'vitest';
import { parseResults, mergeResults } from './results';

const result = { id: 'real-1', home: 2, away: 1, duration: 120, createdAt: '2026-11-01T12:00:00Z' };
it('shows only structurally valid real result records, never invented fallback scores', () => {
  expect(parseResults({ results: [result, { ...result, home: -1 }, { ...result, id: null }, { ...result, createdAt: 'bad' }] })).toEqual([result]);
  expect(parseResults(null)).toEqual([]);
  expect(parseResults({ results: 'oops' })).toEqual([]);
});
it('merges server and device matches without duplicate IDs and keeps recent matches first', () => {
  const newer = { ...result, id: 'real-2', createdAt: '2026-11-01T13:00:00Z' };
  expect(mergeResults([result], [result, newer])).toEqual([newer, result]);
});
