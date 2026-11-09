import { describe, it, expect } from 'vitest';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { recoveryEntry } from './runtime.js';

describe('installed recovery trust boundary',()=>{
  it('retry uses an adjacent installed entry, never working-tree TS or loader',async()=>{
    const source=await readFile('deployment/runtime.ts','utf8');
    expect(source).not.toContain("join(project,'node_modules/tsx/dist/cli.mjs')");
    expect(source).toContain("new URL('./recovery.mjs',import.meta.url)");
    expect(recoveryEntry()).toBe(fileURLToPath(new URL('./recovery.mjs',import.meta.url)));
    expect(source).toContain('[recoveryEntry(),bare,validateSha(sha),root]');
  });
  it('ordinary compilation cannot overwrite an installed snapshot',async()=>{
    const config=JSON.parse(await readFile('tsconfig.deploy.json','utf8'));
    expect(config.compilerOptions.outDir).toBe('.local-server/github-deploy/candidate');
    const installer=await readFile('deployment/install-watcher.ps1','utf8');
    expect(installer).toContain('snapshots');
    expect(installer).toContain('Get-FileHash');
    expect(installer).toContain('recovery.mjs');
    expect(installer).not.toContain('github-deploy/runtime/runtime.js');
  });
  it('bundles actual receiver and local imports with only Node builtins external',async()=>{
    const { buildRecovery }=await import(new URL('./build-runtime.mjs',import.meta.url).href);
    const directory=await mkdtemp(join(tmpdir(),'soccer-recovery-'));
    try {
      const imports=await buildRecovery(directory);
      expect(imports.some((id:string)=>id.endsWith('/scripts/receive-local.ts'))).toBe(true);
      expect(imports.some((id:string)=>id.endsWith('/scripts/process.ts'))).toBe(true);
      expect(imports.some((id:string)=>id.endsWith('/scripts/archive.ts'))).toBe(true);
      let output='';
      try {execFileSync(process.execPath,[join(directory,'recovery.mjs')],{encoding:'utf8',stdio:'pipe'});} catch(error) {output=String((error as {stderr:unknown}).stderr);}
      expect(output).toContain('Expected bare repo, full commit hash, deployment root');
      expect(await readFile(join(directory,'recovery.mjs'),'utf8')).not.toContain('tsx');
    } finally {await rm(directory,{recursive:true,force:true});}
  });
});
