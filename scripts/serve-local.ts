import { resolve, join } from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import { readActiveRelease } from './deploy-lib.js';
import { waitHealthy, stop, cleanEnv } from './process.js';
const root = resolve(process.env.DEPLOY_ROOT ?? '.local-server');
const host = process.env.HOST ?? '127.0.0.1';
const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
let current: string | undefined; let child: ChildProcess | undefined; let shuttingDown = false;
async function sync(): Promise<void> {
  const active = await readActiveRelease(root);
  if (!active) throw new Error('No deployed release. Run npm run deploy:local or git push local main first.');
  if (active.releaseId === current) return;
  if (child) await stop(child);
  const release = join(root,'releases',active.releaseId);
  child = spawn(process.execPath,[join(release,'dist-server/server/index.js')], {
    cwd:release, env:{...cleanEnv(),HOST:host,PORT:String(port),STATIC_DIR:join(release,'dist'),DATA_DIR:join(root,'data'),NODE_ENV:'production'},stdio:'inherit',windowsHide:true,
  });
  child.on('error', error => console.error(error));
  await waitHealthy(`http://${host === '0.0.0.0' ? '127.0.0.1' : host}:${port}`,child);
  current=active.releaseId;
  console.log(`LOCAL SERVER READY http://${host}:${port} release=${current}`);
}
for (const signal of ['SIGINT','SIGTERM'] as const) process.on(signal, () => { shuttingDown=true; });
try {
  await sync();
  while (!shuttingDown) {
    await new Promise(r=>setTimeout(r,750));
    if (child && (child.exitCode !== null || child.signalCode !== null)) throw new Error(`Release server exited unexpectedly: ${child.exitCode ?? child.signalCode}`);
    try { await sync(); } catch (error) { console.error('Reload failed:', error); if (!child || child.exitCode !== null || child.signalCode !== null) throw error; }
  }
} finally { if (child) await stop(child); }
