import { afterEach, describe, it, expect } from 'vitest';
import { mkdir, mkdtemp, readFile, rm, writeFile, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { validateReleaseId, activateRelease, readActiveRelease, prepareRelease } from './deploy-lib.js';
const temporary: string[] = [];
afterEach(async () => { await Promise.all(temporary.splice(0).map(p => rm(p, { recursive: true, force: true }))); });
describe('local deployment', () => {
  it('rejects release IDs that could escape the releases folder', () => {
    for (const id of ['../escape', 'a/b', '', 'a\\b', '.hidden']) expect(() => validateReleaseId(id)).toThrow();
    expect(validateReleaseId('abc123-2026')).toBe('abc123-2026');
  });
  it('packages only built artifacts and pinned dependency manifests', async () => {
    const base = resolve('.local-server/test-tmp'); await mkdir(base, { recursive: true });
    const fixture = await mkdtemp(join(base, 'package-')); temporary.push(fixture);
    const project = join(fixture, 'project'); const target = join(fixture, 'deploy');
    await mkdir(join(project, 'dist'), { recursive: true }); await mkdir(join(project, 'dist-server', 'server'), { recursive: true });
    await writeFile(join(project, 'dist', 'index.html'), 'real build');
    await writeFile(join(project, 'dist-server', 'server', 'index.js'), 'server build');
    for (const name of ['package.json', 'package-lock.json']) await writeFile(join(project, name), '{}');
    await writeFile(join(project, 'private.txt'), 'not deployed');
    const release = await prepareRelease(project, target, 'tested');
    expect(await readFile(join(release, 'dist', 'index.html'), 'utf8')).toBe('real build');
    expect(await readFile(join(release, 'dist-server', 'server', 'index.js'), 'utf8')).toBe('server build');
    await expect(stat(join(release, 'private.txt'))).rejects.toThrow();
    await expect(prepareRelease(project, target, 'tested')).rejects.toThrow();
  });
  it('activates a prepared release and retains the previous pointer for rollback', async () => {
    const base = resolve('.local-server/test-tmp');
    await mkdir(base, { recursive: true });
    const target = await mkdtemp(join(base, 'deploy-')); temporary.push(target);
    expect(await readActiveRelease(target)).toBeNull();
    await mkdir(join(target, 'releases', 'first'), { recursive: true });
    await activateRelease(target, 'first');
    expect((await readActiveRelease(target))?.releaseId).toBe('first');
    await mkdir(join(target, 'releases', 'second'), { recursive: true });
    await activateRelease(target, 'second');
    expect((await readActiveRelease(target))?.releaseId).toBe('second');
    expect(JSON.parse(await readFile(join(target, 'previous.json'), 'utf8')).releaseId).toBe('first');
    await expect(activateRelease(target, 'missing')).rejects.toThrow();
    expect((await readActiveRelease(target))?.releaseId).toBe('second');
  });
});
