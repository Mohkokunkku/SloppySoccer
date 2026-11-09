import { afterEach, describe, expect, it, vi } from 'vitest';
import { command, jsonRequest, Backoff, pollActivation, requireCdIdle, once, verifyActivation } from './runtime.js';
import { windowsCommand, windowsQuote, resolveWindowsExecutable } from './windows-boundary.js';
import * as boundary from './windows-boundary.js';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const nativeIt=process.platform==='win32'?it:it.skip;
afterEach(()=>vi.unstubAllGlobals());
describe('bounded process and network boundaries',()=>{
  it('resolves the supervisor only from validated absolute system roots, never PATH',()=>{
    expect(boundary.resolveWindowsPowerShell('C:\\Windows','D:\\Windows')).toBe('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe');
    expect(boundary.resolveWindowsPowerShell(undefined,'D:\\Windows')).toBe('D:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe');
    for(const root of ['', 'Windows', '\\Windows', 'C:Windows', 'C:\\Windows\\..\\project', 'C:\\Windows;bad', '\\\\host\\share']) {
      expect(()=>boundary.resolveWindowsPowerShell(root,'D:\\Windows')).toThrow('Invalid system root');
    }
    expect(()=>boundary.resolveWindowsPowerShell(undefined,undefined)).toThrow('Invalid system root');
  });
  it('preserves absolute executables and rejects relative or working-tree PATH lookup',()=>{
    expect(resolveWindowsExecutable('C:\\Program Files\\nodejs\\node.exe','D:\\project','')).toBe('C:\\Program Files\\nodejs\\node.exe');
    expect(()=>resolveWindowsExecutable('git','D:\\project','.;relative;D:\\project;D:\\project\\bin')).toThrow('Executable not found');
    expect(()=>resolveWindowsExecutable('git & echo','D:\\project','')).toThrow('bare EXE');
    expect(()=>resolveWindowsExecutable('.\\git.exe','D:\\project','')).toThrow('bare EXE');
  });
  it('quotes empty, embedded quotes and trailing backslashes portably',()=>{
    expect(windowsQuote('')).toBe('""');
    expect(windowsQuote('a"b')).toBe('"a\\"b"');
    expect(windowsQuote('C:\\end\\')).toBe('"C:\\end\\\\"');
  });
  nativeIt('runs actual bare git through the native boundary instead of a project-local executable',async()=>{
    const dir=await mkdtemp(join(process.env.TMPDIR ?? tmpdir(),'deploy-git-'));
    try {
      await writeFile(join(dir,'git.exe'),'not an executable: project-local decoy');
      await writeFile(join(dir,'powershell.exe'),'not an executable: project-local supervisor decoy');
      expect(resolveWindowsExecutable('git',dir,`${dir};${process.env.PATH ?? ''}`).toLowerCase()).not.toBe(join(dir,'git.exe').toLowerCase());
      expect(await command('git',['--version'],dir)).toMatch(/^git version \d/);
    } finally {await rm(dir,{recursive:true,force:true});}
  },15000);
  it('retries actual activation readback across health and page connection refusals',async()=>{
    const dir=await mkdtemp(join(process.env.TMPDIR ?? tmpdir(),'deploy-health-'));
    const sha='a'.repeat(40),id=`git-${sha.slice(0,12)}-123`,release=join(dir,'releases',id);
    const {mkdir}=await import('node:fs/promises');
    try {
      await mkdir(join(release,'dist'),{recursive:true});
      await writeFile(join(dir,'current.json'),JSON.stringify({releaseId:id}));
      await writeFile(join(release,'release.json'),JSON.stringify({releaseId:id,tested:true}));
      await writeFile(join(release,'dist/index.html'),'actual release index');
      const fetcher=vi.fn().mockRejectedValueOnce(new Error('health refused'))
        .mockResolvedValueOnce(new Response(JSON.stringify({status:'ok'})))
        .mockRejectedValueOnce(new Error('page refused'))
        .mockResolvedValueOnce(new Response(JSON.stringify({status:'ok'})))
        .mockResolvedValueOnce(new Response('actual release index'));
      vi.stubGlobal('fetch',fetcher);
      expect(await verifyActivation(dir,'unused',dir,sha,async()=>sha,1000,1)).toBe(true);
      expect(fetcher).toHaveBeenCalledTimes(5);
    } finally {await rm(dir,{recursive:true,force:true});}
  });
  it('rejects the private worker entrypoint without the native lease capability',async()=>{
    const dir=await mkdtemp(join(process.env.TMPDIR ?? tmpdir(),'deploy-private-'));
    try {await expect(once(dir,true)).rejects.toThrow('Native watcher lease required');}
    finally {await rm(dir,{recursive:true,force:true});}
  });
  nativeIt('kills a real benign descendant before releasing the OS lock and reuses a stale lock file',async()=>{
    const dir=await mkdtemp(join(process.env.TMPDIR ?? tmpdir(),'deploy-tree-'));
    const lock=join(dir,'watcher.lock'), marker=join(dir,'late.txt'), ready=join(dir,'ready.txt');
    await writeFile(lock,'old crashed owner');
    const child=`require('node:fs').writeFileSync(${JSON.stringify(ready)},String(process.pid));setTimeout(()=>require('node:fs').writeFileSync(${JSON.stringify(marker)},'survived'),3000);setInterval(()=>{},1000)`;
    const parent=`require('node:child_process').spawn(process.execPath,['-e',${JSON.stringify(child)}],{stdio:'ignore',detached:true}).unref();setTimeout(()=>process.exit(0),300)`;
    try {
      const first=windowsCommand(process.execPath,['-e',parent],dir,3000,lock).catch(error=>error);
      for(let i=0;i<100;i++) {try {await readFile(ready);break;} catch {await new Promise(r=>setTimeout(r,20));}}
      const descendant=Number(await readFile(ready,'utf8'));
      expect(descendant).toBeGreaterThan(0);
      await expect(windowsCommand(process.execPath,['-e','process.exit(0)'],dir,1000,lock)).rejects.toThrow();
      expect(await first).toBeInstanceOf(Error);
      expect(()=>process.kill(descendant,0)).toThrow();
      expect(await windowsCommand(process.execPath,['-e',"process.stdout.write('recovered')"],dir,1000,lock)).toBe('recovered');
      await new Promise(r=>setTimeout(r,3200));
      await expect(readFile(marker)).rejects.toThrow();
    } finally {await rm(dir,{recursive:true,force:true});}
  },15000);
  it('never removes or bypasses the existing CD lock, even if its owner metadata is absent',async()=>{
    const dir=await mkdtemp(join(process.env.TMPDIR ?? tmpdir(),'deploy-lock-'));
    try {
      await requireCdIdle(dir);
      await writeFile(join(dir,'deploy.lock'),'');
      await expect(requireCdIdle(dir)).rejects.toThrow('Existing CD lock');
      expect(await readFile(join(dir,'deploy.lock'),'utf8')).toBe('');
    } finally {await rm(dir,{recursive:true,force:true});}
  });
  nativeIt('recovers the OS-owned watcher lock after a real benign supervisor crash',async()=>{
    const dir=await mkdtemp(join(process.env.TMPDIR ?? tmpdir(),'deploy-crash-')),ready=join(dir,'ready'),lock=join(dir,'watcher.lock');
    let supervisor=0;
    const pending=windowsCommand(process.execPath,['-e',`require('node:fs').writeFileSync(${JSON.stringify(ready)},String(process.pid));setInterval(()=>{},1000)`],dir,5000,lock,pid=>{supervisor=pid;}).catch(error=>error);
    try {
      for(let i=0;i<100;i++) {try {await readFile(ready);break;} catch {await new Promise(r=>setTimeout(r,20));}}
      const child=Number(await readFile(ready,'utf8'));
      process.kill(supervisor,'SIGKILL');
      expect(await pending).toBeInstanceOf(Error);
      for(let i=0;i<100;i++) {try {process.kill(child,0);await new Promise(r=>setTimeout(r,20));} catch {break;}}
      expect(()=>process.kill(child,0)).toThrow();
      expect(await windowsCommand(process.execPath,['-e',"process.stdout.write('recovered')"],dir,1000,lock)).toBe('recovered');
    } finally {await pending;await rm(dir,{recursive:true,force:true});}
  },12000);
  it('retries both health and page network gaps inside the activation deadline',async()=>{
    let tries=0;
    expect(await pollActivation(async()=>{tries++; if(tries<3) throw new Error('restart gap'); return true;},1000,1)).toBe(true);
    expect(tries).toBe(3);
    expect(await pollActivation(async()=>{throw new Error('offline');},10,1)).toBe(false);
  });
  it('passes metacharacters literally without a shell',async()=>{
    expect(await command(process.execPath,['-e','process.stdout.write(process.argv[1])','a;echo unsafe'],process.cwd())).toBe('a;echo unsafe');
    expect(await command(process.execPath,['-e','process.stdout.write(process.argv[1])','a "quoted" C:\\trailing\\'],process.cwd())).toBe('a "quoted" C:\\trailing\\');
  });
  it('kills an overlong child and hides process output',async()=>{
    await expect(command(process.execPath,['-e','setInterval(()=>{},1000)'],process.cwd(),50)).rejects.toThrow('Bounded process failed');
  });
  it('sets timeout and does not expose token or response bodies on rate limits',async()=>{
    const fetcher=vi.fn().mockResolvedValue(new Response('private provider detail',{status:429,headers:{'retry-after':'200'}})); vi.stubGlobal('fetch',fetcher);
    const error=await jsonRequest('https://api.github.com/test','secret').catch(e=>e);
    expect(error).toBeInstanceOf(Backoff); if(!(error instanceof Backoff)) throw new Error('Expected backoff');
    expect(error.seconds).toBe(200); expect(error.message).not.toContain('secret');
    expect(fetcher.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });
  it('sanitizes network exceptions and backs off',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('secret network diagnostic')));
    await expect(jsonRequest('https://api.github.com/test','secret')).rejects.toThrow('GitHub unavailable; backing off');
  });
});
