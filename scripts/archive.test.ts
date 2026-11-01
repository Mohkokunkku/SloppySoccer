import { afterEach, describe, it, expect } from 'vitest';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { run } from './process.js';
import { extractSourceArchive } from './archive.js';
const fixtures: string[] = [];
afterEach(async () => { await Promise.all(fixtures.splice(0).map(path => rm(path, { recursive: true, force: true }))); });
describe('Git receiver archive extraction', () => {
  it('extracts a real archive in a native absolute-path workspace', async () => {
    const base = resolve('.local-server/test-tmp'); await mkdir(base, { recursive: true });
    const build = await mkdtemp(join(base, 'archive-')); fixtures.push(build);
    await writeFile(join(build, 'probe.txt'), 'source archive content');
    await run('tar', ['-cf', 'source.tar', 'probe.txt'], build);
    await rm(join(build, 'probe.txt'));
    await extractSourceArchive(build);
    expect(await readFile(join(build, 'probe.txt'), 'utf8')).toBe('source archive content');
  });
});
