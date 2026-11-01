import type { MatchResult } from '../shared/types';

export function parseResults(value: unknown): MatchResult[] {
  if (!value || typeof value !== 'object' || !Array.isArray((value as { results?: unknown }).results)) return [];
  return ((value as { results: unknown[] }).results).filter((entry): entry is MatchResult => {
    if (!entry || typeof entry !== 'object') return false;
    const item = entry as Record<string, unknown>;
    return typeof item.id === 'string' && item.id.length > 0 && item.id.length < 200
      && typeof item.home === 'number' && Number.isInteger(item.home) && item.home >= 0 && item.home <= 999
      && typeof item.away === 'number' && Number.isInteger(item.away) && item.away >= 0 && item.away <= 999
      && typeof item.duration === 'number' && [60, 120, 180].includes(item.duration)
      && typeof item.createdAt === 'string' && Number.isFinite(Date.parse(item.createdAt));
  });
}

export function mergeResults(...groups: MatchResult[][]): MatchResult[] {
  const unique = new Map<string, MatchResult>();
  groups.flat().forEach(result => unique.set(result.id, result));
  return [...unique.values()].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 20);
}
