import { afterEach, describe, expect, it } from 'vitest';
import { link, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { DEFAULT_CONFIG } from '../shared/types.js';
import { buildApp } from './app.js';

const apps: FastifyInstance[] = [];
const dirs: string[] = [];
async function fixture() {
  const root = resolve('.test-data');
  await mkdir(root, { recursive: true });
  const dir = await mkdtemp(join(root, 'backend-'));
  dirs.push(dir);
  return dir;
}
async function appAt(dataDir?: string, staticDir?: string) {
  const app = await buildApp({ dataDir: dataDir ?? await fixture(), staticDir: staticDir ?? join(await fixture(), 'absent') });
  apps.push(app);
  return app;
}
afterEach(async () => {
  await Promise.all(apps.splice(0).map(app => app.close()));
  await Promise.all(dirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })));
});

describe('backend HTTP API', () => {
  it('sets local-game security headers on successes and errors', async () => {
    const app = await appAt();
    for (const url of ['/api/health', '/api/missing']) {
      const response = await app.inject(url);
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['referrer-policy']).toBe('no-referrer');
      expect(response.headers['cross-origin-resource-policy']).toBe('same-origin');
      expect(response.headers['cache-control']).toBe('no-store');
      expect(response.headers['content-security-policy']).toContain("script-src 'self'");
      expect(response.headers['content-security-policy']).toContain("connect-src 'self'");
      expect(response.headers['content-security-policy']).toContain("frame-ancestors 'none'");
      expect(response.headers['content-security-policy']).not.toContain('unsafe-eval');
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    }
  });
  it('keeps game CSP strict and permits only the art board inline styles and print handler', async () => {
    const staticDir = await fixture();
    await writeFile(join(staticDir, 'index.html'), '<!doctype html><title>Game</title>');
    await writeFile(join(staticDir, 'design-board.html'), '<!doctype html><style>body{color:red}</style><button onclick="window.print()">Print</button>');
    const app = await appAt(undefined, staticDir);
    for (const url of ['/', '/design-board.html', '/design-board.html?print=1']) {
      const response = await app.inject(url);
      expect(response.statusCode).toBe(200);
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['cache-control']).toBe('no-store');
      const policy = response.headers['content-security-policy'];
      if (url.startsWith('/design-board.html')) {
        expect(policy).toContain("style-src 'self' 'unsafe-inline'");
        expect(policy).toContain("script-src 'self' 'unsafe-inline'");
      } else {
        expect(policy).not.toContain('unsafe-inline');
      }
      expect(policy).not.toContain('unsafe-eval');
    }
    for (const response of [
      await app.inject({ method: 'POST', url: '/api/results', payload: {} }),
      await app.inject({ method: 'POST', url: '/api/results', headers: { origin: 'https://evil.example' }, payload: {} }),
    ]) {
      expect(response.statusCode).toBeGreaterThanOrEqual(400);
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['content-security-policy']).not.toContain('unsafe-inline');
    }
  });
  it('serves only the configured static root without swallowing missing APIs', async () => {
    const dataDir = await fixture();
    const staticDir = await fixture();
    await writeFile(join(staticDir, 'index.html'), '<!doctype html><title>Sloppy Soccer</title>');
    await mkdir(join(staticDir, 'assets'));
    await writeFile(join(staticDir, 'assets', 'game.js'), 'export const game = true;');
    await writeFile(join(dataDir, 'secret.txt'), 'private-score-storage');
    const app = await appAt(dataDir, staticDir);
    const index = await app.inject('/');
    expect(index.statusCode).toBe(200);
    expect(index.headers['content-type']).toContain('text/html');
    expect(index.body).toContain('Sloppy Soccer');
    expect((await app.inject('/assets/game.js')).body).toBe('export const game = true;');
    for (const url of ['/api/nope', '/api', '/api/nope/nested']) {
      const missing = await app.inject(url);
      expect(missing.statusCode).toBe(404);
      expect(missing.headers['content-type']).toContain('application/json');
      expect(missing.json()).toEqual({ error: 'Not Found' });
    }
    for (const url of ['/assets/', '/missing.js', '/secret.txt', '/../secret.txt', '/%2e%2e/secret.txt', '/.env']) {
      const missing = await app.inject(url);
      expect(missing.statusCode, url).toBe(404);
      expect(missing.body).not.toContain('private-score-storage');
    }
  });
  it('limits request bodies to 1 KiB before score handling', async () => {
    const app = await appAt();
    const response = await app.inject({ method: 'POST', url: '/api/results',
      headers: { 'content-type': 'application/json' },
      payload: ' '.repeat(1024) + JSON.stringify({ home: 1, away: 0, duration: 120 }) });
    expect(response.statusCode).toBe(413);
    expect((await app.inject('/api/results')).json()).toEqual({ results: [] });
  });
  it('allows only exact same-origin writes when Origin is supplied', async () => {
    const app = await appAt();
    const payload = { home: 1, away: 0, duration: 120 };
    for (const origin of ['https://evil.example', 'null', 'http://localhost.evil', 'http://localhost:3001',
      'https://localhost:3000', 'http://localhost:3000/', 'http://user@localhost:3000',
      'http://localhost:3000/path', 'http://localhost:3000, http://evil.example']) {
      const response = await app.inject({ method: 'POST', url: '/api/results', payload,
        headers: { host: 'localhost:3000', origin, 'x-forwarded-host': 'evil.example', 'x-forwarded-proto': 'https' } });
      expect(response.statusCode, origin).toBe(403);
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    }
    expect((await app.inject('/api/results')).json()).toEqual({ results: [] });
    expect((await app.inject({ method: 'POST', url: '/api/results', payload,
      headers: { host: 'localhost:3000', origin: 'http://localhost:3000' } })).statusCode).toBe(201);
    expect((await app.inject({ method: 'POST', url: '/api/results', payload })).statusCode).toBe(201);
  });
  it('returns a generic 500 on disk failure, keeps memory unchanged, and recovers', async () => {
    const dataDir = await fixture();
    const app = await appAt(dataDir);
    const file = join(dataDir, 'results.json');
    await mkdir(file);
    const post = () => app.inject({ method: 'POST', url: '/api/results', payload: { home: 1, away: 0, duration: 120 } });
    const failed = await post();
    expect(failed.statusCode).toBe(500);
    expect(failed.json()).toEqual({ error: 'Internal Server Error' });
    expect(failed.body).not.toContain(dataDir);
    expect((await app.inject('/api/results')).json()).toEqual({ results: [] });
    await rm(file, { recursive: true });
    expect((await post()).statusCode).toBe(201);
    expect((await app.inject('/api/results')).json().results).toHaveLength(1);
  });
  it.each(['{broken', '{}', '[{}]', '[{"home":1,"away":0,"duration":120,"id":"x","createdAt":"invalid"}]'])('fails startup on corrupt persisted data without overwriting it: %s', async contents => {
    const dataDir = await fixture();
    const file = join(dataDir, 'results.json');
    await writeFile(file, contents);
    let rejected = false;
    try { await appAt(dataDir); } catch { rejected = true; }
    expect(rejected).toBe(true);
    expect(await readFile(file, 'utf8')).toBe(contents);
  });
  it('retains only the 50 most recent scores, newest first, on disk and HTTP', async () => {
    const dataDir = await fixture();
    const app = await appAt(dataDir);
    for (let home = 0; home < 53; home++) {
      expect((await app.inject({ method: 'POST', url: '/api/results', payload: { home, away: 0, duration: 120 } })).statusCode).toBe(201);
    }
    const { results } = (await app.inject('/api/results')).json();
    expect(results.map((result: { home: number }) => result.home)).toEqual(Array.from({ length: 50 }, (_, index) => 52 - index));
    expect(JSON.parse(await readFile(join(dataDir, 'results.json'), 'utf8'))).toEqual(results);
    await app.close();
    expect((await (await appAt(dataDir)).inject('/api/results')).json()).toEqual({ results });
  });
  it('atomically replaces the score file instead of truncating the old inode', async () => {
    const dataDir = await fixture();
    const app = await appAt(dataDir);
    const post = () => app.inject({ method: 'POST', url: '/api/results', payload: { home: 1, away: 0, duration: 120 } });
    expect((await post()).statusCode).toBe(201);
    const file = join(dataDir, 'results.json');
    const previous = await readFile(file, 'utf8');
    const snapshot = join(dataDir, 'previous.json');
    await link(file, snapshot);
    expect((await post()).statusCode).toBe(201);
    expect(await readFile(snapshot, 'utf8')).toBe(previous);
    expect(JSON.parse(await readFile(file, 'utf8'))).toHaveLength(2);
  });
  it('serializes concurrent posts without losing acknowledged scores', async () => {
    const dataDir = await fixture();
    const app = await appAt(dataDir);
    const responses = await Promise.all(Array.from({ length: 30 }, (_, home) =>
      app.inject({ method: 'POST', url: '/api/results', payload: { home, away: 0, duration: 120 } })));
    expect(responses.every(response => response.statusCode === 201)).toBe(true);
    const { results } = (await app.inject('/api/results')).json();
    expect(results).toHaveLength(30);
    expect(new Set(results.map((result: { id: string }) => result.id)).size).toBe(30);
    expect(JSON.parse(await readFile(join(dataDir, 'results.json'), 'utf8'))).toEqual(results);
  });
  it('rejects invalid score bodies without storing them', async () => {
    const app = await appAt();
    const valid = { home: 0, away: 99, duration: 15 };
    const invalid: unknown[] = [
      { ...valid, home: -1 }, { ...valid, home: 100 }, { ...valid, home: 1.5 },
      { ...valid, away: -1 }, { ...valid, away: 100 }, { ...valid, away: 0.5 },
      { ...valid, duration: 14.99 }, { ...valid, duration: 600.01 },
      { ...valid, home: '1' }, { ...valid, away: null }, { ...valid, duration: '120' },
      { ...valid, duration: true }, { ...valid, verified: true },
      { home: 1, away: 0 }, [], null, 'score', {},
    ];
    for (const payload of invalid) {
      const response = await app.inject({ method: 'POST', url: '/api/results',
        headers: { 'content-type': 'application/json' }, payload: JSON.stringify(payload) });
      expect(response.statusCode, JSON.stringify(payload)).toBe(400);
    }
    expect((await app.inject('/api/results')).json()).toEqual({ results: [] });
    for (const duration of [15, 120.5, 600]) {
      expect((await app.inject({ method: 'POST', url: '/api/results', payload: { ...valid, duration } })).statusCode).toBe(201);
    }
  });
  it('creates a score and persists it across app instances', async () => {
    const dataDir = await fixture();
    const app = await appAt(dataDir);
    const payload = { home: 2, away: 1, duration: 120 };
    const created = await app.inject({ method: 'POST', url: '/api/results', payload });
    expect(created.statusCode).toBe(201);
    const { result } = created.json();
    expect(result).toEqual({ ...payload, id: expect.any(String), createdAt: expect.any(String) });
    expect(result.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(new Date(result.createdAt).toISOString()).toBe(result.createdAt);
    expect(JSON.parse(await readFile(join(dataDir, 'results.json'), 'utf8'))).toEqual([result]);
    await app.close();
    const reopened = await appAt(dataDir);
    expect((await reopened.inject('/api/results')).json()).toEqual({ results: [result] });
  });
  it('starts with an empty recent-results list', async () => {
    const app = await appAt();
    const response = await app.inject('/api/results');
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ results: [] });
  });
  it('returns the shared default configuration', async () => {
    const app = await appAt();
    const response = await app.inject('/api/config');
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(DEFAULT_CONFIG);
  });
  it('reports health without opening a TCP port', async () => {
    const app = await appAt();
    const response = await app.inject('/api/health');
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });
});
