import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
export const cleanEnv = () => {
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (key.startsWith('GIT_')) delete env[key];
  return env;
};
export async function run(command: string, args: string[], cwd: string, extra: NodeJS.ProcessEnv = {}): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { cwd, env: { ...cleanEnv(), ...extra }, stdio: 'inherit', shell: false, windowsHide: true });
    child.on('error', reject);
    child.on('exit', (code, signal) => code === 0 ? resolve() : reject(new Error(`${command} failed (${code ?? signal})`)));
  });
}
export async function npm(args: string[], cwd: string, extra: NodeJS.ProcessEnv = {}): Promise<void> {
  // Invoking npm's JS entrypoint avoids cmd.exe quoting and .cmd spawn quirks.
  const cli = process.env.npm_execpath;
  if (!cli) throw new Error('Run this script through npm run');
  await run(process.execPath, [cli, ...args], cwd, extra);
}
export async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer(); server.on('error', reject);
    server.listen(0, '127.0.0.1', () => { const port = (server.address() as { port: number }).port; server.close(() => resolve(port)); });
  });
}
export async function waitHealthy(url: string, child: ChildProcess, timeout = 20_000): Promise<void> {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (child.exitCode !== null || child.signalCode !== null) throw new Error(`Server exited before readiness: ${child.exitCode ?? child.signalCode}`);
    try { const response = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(1000) });
      if (response.ok && (await response.json() as {status:string}).status === 'ok') return;
    } catch { /* bounded retry while booting */ }
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error(`Health check timed out: ${url}`);
}
export async function stop(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null || !child.pid) return;
  await new Promise<void>(resolve => {
    const timer = setTimeout(() => { child.kill('SIGKILL'); }, 4000); timer.unref();
    child.once('exit', () => { clearTimeout(timer); resolve(); }); child.kill('SIGTERM');
  });
}
