import { randomUUID } from 'node:crypto';
import { mkdir, open, readFile, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';
import type { MatchResult } from '../shared/types.js';

export type ResultInput = Pick<MatchResult, 'home' | 'away' | 'duration'>;

function isStoredResult(value: unknown): value is MatchResult {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Record<string, unknown>;
  return Object.keys(row).length === 5
    && typeof row.id === 'string' && /^[0-9a-f-]{36}$/.test(row.id)
    && typeof row.createdAt === 'string' && Number.isFinite(Date.parse(row.createdAt))
    && typeof row.home === 'number' && Number.isInteger(row.home) && row.home >= 0 && row.home <= 99
    && typeof row.away === 'number' && Number.isInteger(row.away) && row.away >= 0 && row.away <= 99
    && typeof row.duration === 'number' && Number.isFinite(row.duration) && row.duration >= 15 && row.duration <= 600;
}

export async function createResultsRepository(dataDir: string) {
  await mkdir(dataDir, { recursive: true });
  const file = join(dataDir, 'results.json');
  let results: MatchResult[];
  try {
    const parsed: unknown = JSON.parse(await readFile(file, 'utf8'));
    if (!Array.isArray(parsed) || !parsed.every(isStoredResult)) {
      throw new Error('Invalid persisted results; restore or repair results.json before starting.');
    }
    results = parsed.slice(0, 50);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    results = [];
  }
  let pending: Promise<void> = Promise.resolve();
  return {
    list: () => results,
    add(input: ResultInput) {
      const operation = pending.then(async () => {
        const result: MatchResult = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
        const next = [result, ...results].slice(0, 50);
        const temporary = join(dataDir, `.results-${randomUUID()}.tmp`);
        try {
          const handle = await open(temporary, 'wx', 0o600);
          try {
            await handle.writeFile(JSON.stringify(next), 'utf8');
            await handle.sync();
          } finally {
            await handle.close();
          }
          await rename(temporary, file);
        } finally {
          await rm(temporary, { force: true });
        }
        results = next;
        return result;
      });
      pending = operation.then(() => undefined, () => undefined);
      return operation;
    },
    drain: () => pending,
  };
}
