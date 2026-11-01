import { resolve, join } from 'node:path';
import { mkdir, writeFile, open, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { activateRelease, prepareRelease, validateReleaseId } from './deploy-lib.js';
import { npm, freePort, waitHealthy, stop, cleanEnv } from './process.js';
const project = process.cwd();
const target = resolve(process.env.DEPLOY_ROOT ?? join(project, '.local-server'));
const releaseId = validateReleaseId(process.env.RELEASE_ID ?? `manual-${Date.now()}-${randomUUID().slice(0,8)}`);
await mkdir(target, { recursive: true });
// Exclusive deployment lock: simultaneous pushes must not race the activation pointer.
const lockPath = join(target, 'deploy.lock');
const lock = await open(lockPath, 'wx');
try {
  await npm(['run', 'check'], project);
  await npm(['run', 'test:e2e'], project);
  await npm(['audit', '--omit=dev', '--audit-level=moderate'], project);
  const release = await prepareRelease(project, target, releaseId);
  await npm(['ci', '--omit=dev', '--ignore-scripts', '--no-fund', '--no-audit'], release);
  const port = await freePort();
  const server = spawn(process.execPath, [join(release, 'dist-server/server/index.js')], {
    cwd: release, env: { ...cleanEnv(), HOST:'127.0.0.1', PORT:String(port), STATIC_DIR:join(release,'dist'), DATA_DIR:join(target,'data'), NODE_ENV:'production' }, stdio: 'inherit', windowsHide: true,
  });
  server.on('error', error => console.error('Candidate server error:', error.message));
  try {
    const url = `http://127.0.0.1:${port}`;
    await waitHealthy(url, server);
    const page = await fetch(url);
    if (!page.ok || !(await page.text()).includes('Sloppy Soccer')) throw new Error('Built game smoke check failed');
  } finally { await stop(server); }
  await writeFile(join(release,'release.json'), JSON.stringify({ releaseId, tested:true, createdAt:new Date().toISOString() },null,2));
  await activateRelease(target, releaseId);
  console.log(`DEPLOYED ${releaseId} to ${target}`);
  console.log('Run npm run serve:local for http://127.0.0.1:3000. The running supervisor reloads after activation.');
} finally { await lock.close(); await rm(lockPath, { force: true }); }
