import { execFile } from 'node:child_process';
import { mkdir, readFile, rename, writeFile, access } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { activationMatches, cycle, reconcile, validateRepository, validateSha, type Checkpoint, type WorkflowRun } from './watcher.js';
import { windowsCommand } from './windows-boundary.js';

export function recoveryEntry():string {return fileURLToPath(new URL('./recovery.mjs',import.meta.url));}

export function command(file:string,args:string[],cwd:string,timeout=30_000):Promise<string> {
  if(process.platform==='win32') return windowsCommand(file,args,cwd,timeout);
  return new Promise((ok,fail)=>execFile(file,args,{cwd,timeout,maxBuffer:1024*1024,shell:false,windowsHide:true,env:{...process.env,GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'never'}},(error,stdout)=>error?fail(new Error('Bounded process failed')):ok(stdout.trim())));
}
/** Transfer a verified object without executing mutable post-receive scripts. */
export async function advanceVerifiedRef(bare:string,project:string,sha:string,exec=command):Promise<void> {
  validateSha(sha);
  const previous=validateSha(await exec('git',['--git-dir',bare,'rev-parse','refs/heads/main'],project));
  await exec('git',['--git-dir',bare,'fetch','--no-tags',project,sha],project);
  await exec('git',['--git-dir',bare,'merge-base','--is-ancestor',previous,sha],project);
  await exec('git',['--git-dir',bare,'update-ref','refs/heads/main',sha,previous],project);
}
export async function pollActivation(attempt:(signal:AbortSignal)=>Promise<boolean>,timeout=45_000,delay=1000):Promise<boolean> {
  const end=Date.now()+timeout;
  for(let i=0;i<45&&Date.now()<end;i++) {
    try {if(await attempt(AbortSignal.timeout(Math.max(1,end-Date.now())))) return true;} catch { /* bounded supervisor restart/network gap */ }
    await new Promise(r=>setTimeout(r,Math.min(delay,Math.max(0,end-Date.now()))));
  }
  return false;
}
export class Backoff extends Error { constructor(public seconds:number){super('GitHub unavailable; backing off');} }
export async function jsonRequest(url:string,token?:string):Promise<unknown> {
  try {
  const response=await fetch(url,{signal:AbortSignal.timeout(15_000),redirect:'error',headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...(token?{Authorization:`Bearer ${token}`}:{})}});
  if(!response.ok) {
    const retry=Number(response.headers.get('retry-after'));
    const reset=Number(response.headers.get('x-ratelimit-reset'))*1000-Date.now();
    throw new Backoff(Math.min(3600,Math.max(120,Number.isFinite(retry)?retry:0,Number.isFinite(reset)?reset/1000:0)));
  }
  return await response.json();
  } catch(error) {if(error instanceof Backoff) throw error; throw new Backoff(120);}
}
async function readJson(path:string):Promise<unknown> {return JSON.parse(await readFile(path,'utf8'));}
export async function requireCdIdle(root:string):Promise<void> {
  try {await access(join(root,'deploy.lock')); throw new Error('Existing CD lock requires owner reconciliation');} catch(error) {if((error as NodeJS.ErrnoException).code!=='ENOENT') throw error;}
}
export async function verifyActivation(root:string,bare:string,project:string,sha:string,exec=command,timeout=45_000,delay=1000):Promise<boolean> {
  validateSha(sha);
  return pollActivation(async signal=>{
    const pointer=await readJson(join(root,'current.json')) as {releaseId:string};
    if(!/^git-[a-f0-9]{12}-[0-9]+$/.test(pointer.releaseId)) return false;
    const release=join(root,'releases',pointer.releaseId);
    const metadata=await readJson(join(release,'release.json'));
    const ref=await exec('git',['--git-dir',bare,'rev-parse','refs/heads/main'],project,5000);
    // Metadata contains a short SHA: additionally resolve it unambiguously.
    if(await exec('git',['--git-dir',bare,'rev-parse',sha.slice(0,12)],project,5000)!==sha) return false;
    const healthResponse=await fetch('http://127.0.0.1:3000/api/health',{signal:AbortSignal.any([signal,AbortSignal.timeout(2000)]),redirect:'error'});
    const health=healthResponse.ok?await healthResponse.json():null;
    const page=await fetch('http://127.0.0.1:3000/',{signal:AbortSignal.any([signal,AbortSignal.timeout(2000)]),redirect:'error'});
    return activationMatches(sha,ref,pointer,metadata,health)&&page.ok&&await page.text()===await readFile(join(release,'dist/index.html'),'utf8')&&JSON.stringify(await readJson(join(root,'current.json')))===JSON.stringify(pointer);
  },timeout,delay);
}
export async function once(project:string,locked=false):Promise<void> {
  project=resolve(project); const root=join(project,'.local-server'); const state=join(root,'github-deploy');
  if(locked&&process.env.SLOPPY_DEPLOY_LEASE!==join(state,'watcher.lock')) throw new Error('Native watcher lease required');
  await mkdir(state,{recursive:true});
  if(!locked) {
    await windowsCommand(process.execPath,[process.argv[1],'--locked','--project',project],project,24*60_000,join(state,'watcher.lock'));
    return;
  }
  try {
    // CD's wx lock has no owner metadata. Never steal/delete a live or stale CD lock.
    await requireCdIdle(root);
    const backoffPath=join(state,'backoff.json');
    try {if(Number((await readJson(backoffPath) as {until:number}).until)>Date.now()) return;} catch(error) {if((error as NodeJS.ErrnoException).code!=='ENOENT') throw error;}
    const origin=await command('git',['remote','get-url','origin'],project);
    const match=/^(?:https:\/\/github\.com\/|git@github\.com:)([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+?)(?:\.git)?$/.exec(origin);
    if(!match) throw new Error('Origin must be a canonical GitHub repository URL without credentials');
    const repo=validateRepository(match[1]);
    const bare=join(root,'repository.git');
    const local=await command('git',['remote','get-url','local'],project);
    if(resolve(project,local)!==resolve(bare)) throw new Error('Local remote does not match existing CD repository');
    const checkpointPath=join(state,'checkpoint.json'); let checkpoint:Checkpoint|undefined;
    try {checkpoint=await readJson(checkpointPath) as Checkpoint;} catch(error) {if((error as NodeJS.ErrnoException).code!=='ENOENT') throw error;}
    const receiveVerified=async(sha:string)=>{
      await command('git',['fetch','--no-tags','origin','+refs/heads/main:refs/remotes/origin/main'],project);
      if(await command('git',['rev-parse','refs/remotes/origin/main'],project)!==sha||await command('git',['--git-dir',bare,'rev-parse','refs/heads/main'],project)!==sha) throw new Error('Main changed before receive');
      await requireCdIdle(root);
      await command(process.execPath,[recoveryEntry(),bare,validateSha(sha),root],project,20*60_000);
    };
    const next=await cycle(checkpoint,{
      repository:repo,
      main:async()=>{
        await command('git',['fetch','--no-tags','origin','+refs/heads/main:refs/remotes/origin/main'],project);
        return validateSha(await command('git',['rev-parse','refs/remotes/origin/main'],project));
      },
      runs:async()=>{
        // Workflow identity is the fixed CI file, not an attacker-selected run name.
        const data=await jsonRequest(`https://api.github.com/repos/${repo}/actions/workflows/ci.yml/runs?branch=main&event=push&status=success&per_page=100`,process.env.GITHUB_TOKEN) as {workflow_runs:WorkflowRun[]};
        if(!Array.isArray(data.workflow_runs)) throw new Error('Invalid workflow response');
        return data.workflow_runs;
      },
      push:async sha=>{
        await reconcile(sha,{
          bare:()=>command('git',['--git-dir',bare,'rev-parse','refs/heads/main'],project),
          verify:()=>verifyActivation(root,bare,project,sha),
          push:async()=>{await advanceVerifiedRef(bare,project,sha);await receiveVerified(sha);},
          retry:()=>receiveVerified(sha),
        });
      },
      verify:sha=>verifyActivation(root,bare,project,sha),
    });
    await writeFile(`${checkpointPath}.tmp`,JSON.stringify(next,null,2)); await rename(`${checkpointPath}.tmp`,checkpointPath);
  } catch(error) {
    await writeFile(join(state,'backoff.json'),JSON.stringify({until:Date.now()+(error instanceof Backoff?error.seconds:120)*1000}));
    throw new Error('Watcher failed safely; checkpoint unchanged. Inspect local CD separately.');
  }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const args=process.argv.slice(2);
  if(args.length!==3||!['--once','--locked'].includes(args[0])||args[1]!=='--project') throw new Error('Usage: runtime.js --once --project <absolute project path>');
  await once(args[2],args[0]==='--locked');
}
