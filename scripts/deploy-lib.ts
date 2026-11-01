import { mkdir, readFile, writeFile, rename, stat, cp } from 'node:fs/promises';
import { join, resolve } from 'node:path';
export interface ReleasePointer { releaseId: string; createdAt: string }
export async function readActiveRelease(root: string): Promise<ReleasePointer | null> {
  try {
    const value = JSON.parse(await readFile(join(root, 'current.json'), 'utf8')) as ReleasePointer;
    validateReleaseId(value.releaseId);
    return value;
  } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
}
export async function activateRelease(root: string, releaseId: string): Promise<void> {
  validateReleaseId(releaseId);
  if (!(await stat(resolve(root, 'releases', releaseId))).isDirectory()) throw new Error('Release not prepared');
  await mkdir(root, { recursive: true });
  const old = await readActiveRelease(root);
  if (old) { await writeFile(join(root, 'previous.json.tmp'), JSON.stringify(old)); await rename(join(root, 'previous.json.tmp'), join(root, 'previous.json')); }
  const pointer: ReleasePointer = { releaseId, createdAt: new Date().toISOString() };
  await writeFile(join(root, 'current.json.tmp'), JSON.stringify(pointer, null, 2));
  await rename(join(root, 'current.json.tmp'), join(root, 'current.json'));
}
export async function prepareRelease(project: string, root: string, releaseId: string): Promise<string> {
  validateReleaseId(releaseId);
  const release = resolve(root, 'releases', releaseId);
  await mkdir(join(root, 'releases'), { recursive: true });
  // No recursive mkdir here: never replace an existing immutable release.
  await mkdir(release);
  for (const name of ['dist', 'dist-server', 'package.json', 'package-lock.json']) {
    await cp(join(project, name), join(release, name), { recursive: true, errorOnExist: true, force: false });
  }
  return release;
}
export function validateReleaseId(id: string): string {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9-]{0,79}$/.test(id)) throw new Error('Invalid release ID');
  return id;
}
