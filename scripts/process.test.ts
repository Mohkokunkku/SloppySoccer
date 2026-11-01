import { describe, it, expect } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { cleanEnv, freePort, run, stop, waitHealthy } from './process.js';

describe('pipeline process helpers', () => {
  function signalTerminatedChild(): ChildProcess {
    const child = Object.assign(new EventEmitter(), {
      exitCode: null,
      signalCode: 'SIGTERM' as const,
      pid: 12345,
      kill: () => false,
    }) as ChildProcess;
    child.emit('exit', null, 'SIGTERM');
    return child;
  }

  it('immediately rejects readiness for an already signal-terminated child', async () => {
    const child = signalTerminatedChild();
    const readiness = waitHealthy('http://127.0.0.1:0', child, 100);
    // The exit has already fired; readiness must reject before any retry timer.
    await expect(Promise.race([readiness, Promise.resolve('still pending')]))
      .rejects.toThrow('exited before readiness: SIGTERM');
  }, 500);

  it('stops an already signal-terminated child without awaiting another exit', async () => {
    await expect(stop(signalTerminatedChild())).resolves.toBeUndefined();
  }, 500);

  it('does not leak Git receiver variables into child build tools', () => {
    const old = process.env.GIT_DIR;
    process.env.GIT_DIR = 'receiver-only';
    try { expect(cleanEnv().GIT_DIR).toBeUndefined(); expect(process.env.GIT_DIR).toBe('receiver-only'); }
    finally { if (old === undefined) delete process.env.GIT_DIR; else process.env.GIT_DIR = old; }
  });
  it('propagates a failed command instead of continuing deployment', async () => {
    await expect(run(process.execPath, ['-e', 'process.exit(7)'], process.cwd())).rejects.toThrow('failed (7)');
    await expect(run(process.execPath, ['-e', 'process.exit(0)'], process.cwd())).resolves.toBeUndefined();
  });
  it('allocates a real loopback port and reports an exited server as unhealthy', async () => {
    const port = await freePort(); expect(port).toBeGreaterThan(0); expect(port).toBeLessThanOrEqual(65535);
    const child = spawn(process.execPath, ['-e', 'process.exit(9)'], { stdio: 'ignore' });
    await new Promise<void>(resolve => child.once('exit', () => resolve()));
    await expect(waitHealthy(`http://127.0.0.1:${port}`, child)).rejects.toThrow('exited before readiness: 9');
    await expect(stop(child)).resolves.toBeUndefined();
  });
});
