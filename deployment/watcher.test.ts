import { describe, expect, it } from 'vitest';
import { selectRun, validateRepository, activationMatches, cycle, reconcile, type Checkpoint } from './watcher.js';
const sha='a'.repeat(40);
const run={id:1,event:'push',head_branch:'main',head_sha:sha,status:'completed',conclusion:'success',repository:{full_name:'owner/game'},head_repository:{full_name:'owner/game'}};
describe('outbound deployment safety',()=>{
  it('compares validated API identities case-insensitively without changing literals',()=>{
    const canonical={...run,repository:{full_name:'Owner/Game'},head_repository:{full_name:'OWNER/GAME'}};
    expect(selectRun([canonical],sha,'oWnEr/gAmE')).toBe(canonical);
    expect(validateRepository('oWnEr/gAmE')).toBe('oWnEr/gAmE');
    for(const full_name of ['Other/Game','Owner/Other','Fork/Game','Owner/Game;cmd',' Owner/Game','Owner/Game/extra','Owner/Game\n']) {
      expect(selectRun([{...canonical,repository:{full_name}}],sha,'owner/game')).toBeUndefined();
      expect(selectRun([{...canonical,head_repository:{full_name}}],sha,'owner/game')).toBeUndefined();
    }
  });
  it('retries the trusted receiver when post-receive advanced bare main without activation',async()=>{
    const calls:string[]=[];
    await reconcile(sha,{bare:async()=>sha,verify:async()=>false,push:async()=>{calls.push('up-to-date');},retry:async s=>{calls.push(s);}});
    expect(calls).toEqual([sha]);
  });
  it('does not rebuild an already active but uncheckpointed verified SHA',async()=>{
    const calls:string[]=[];
    await reconcile(sha,{bare:async()=>sha,verify:async()=>true,push:async()=>{calls.push('push');},retry:async()=>{calls.push('retry');}});
    expect(calls).toEqual([]);
  });
  it('recovers the next tick after a hook failure advanced bare main, and checkpoints activation only',async()=>{
    const cp={baselineSha:'b'.repeat(40)};let bare=cp.baselineSha,active=false,pushes=0,retries=0;
    const verify=async()=>active;
    const push=async()=>reconcile(sha,{bare:async()=>bare,verify,push:async()=>{pushes++;bare=sha;throw new Error('post-receive failed');},retry:async()=>{retries++;active=true;}});
    const io={main:async()=>sha,runs:async()=>[run],push,verify};
    await expect(cycle(cp,io)).rejects.toThrow('post-receive failed');
    expect(bare).toBe(sha);expect(cp).not.toHaveProperty('deployedSha');
    expect(await cycle(cp,io)).toEqual({...cp,deployedSha:sha,runId:1});
    expect({pushes,retries}).toEqual({pushes:1,retries:1});
  });
  it('accepts only current successful same-repository main pushes',()=>{
    expect(selectRun([run],sha,'owner/game')?.id).toBe(1);
    for(const change of [{event:'pull_request'},{event:'workflow_dispatch'},{head_branch:'other'},{head_sha:'b'.repeat(40)},{conclusion:'failure'},{status:'in_progress'},{head_repository:{full_name:'fork/game'}},{repository:{full_name:'fork/game'}}]) expect(selectRun([{...run,...change}],sha,'owner/game')).toBeUndefined();
    expect(()=>selectRun([run],'--bad','owner/game')).toThrow();
    expect(()=>validateRepository('owner/game;cmd')).toThrow();
  });
  it('requires bare ref, immutable metadata and health, not push exit zero',()=>{
    const id=`git-${sha.slice(0,12)}-123`;
    expect(activationMatches(sha,sha,{releaseId:id},{releaseId:id,tested:true},{status:'ok'})).toBe(true);
    expect(activationMatches(sha,'b'.repeat(40),{releaseId:id},{releaseId:id,tested:true},{status:'ok'})).toBe(false);
    expect(activationMatches(sha,sha,{releaseId:id},{releaseId:id,tested:false},{status:'ok'})).toBe(false);
  });
  it('initializes trusted baseline without deploying or marking it deployed',async()=>{
    const calls:string[]=[];
    const result=await cycle(undefined,{main:async()=>sha,runs:async()=>[run],push:async()=>{calls.push('push');},verify:async()=>true});
    expect(result).toEqual({baselineSha:sha}); expect(calls).toEqual([]);
  });
  it('rechecks main before push and checkpoints only verified activation',async()=>{
    const cp:Checkpoint={baselineSha:'b'.repeat(40)}; let pushes=0;
    const io={main:async()=>sha,runs:async()=>[run],push:async()=>{pushes++;},verify:async()=>false};
    await expect(cycle(cp,io)).rejects.toThrow('Activation'); expect(cp).toEqual({baselineSha:'b'.repeat(40)});
    expect(await cycle(cp,{...io,verify:async()=>true})).toEqual({...cp,deployedSha:sha,runId:1});
    let reads=0; await expect(cycle(cp,{...io,main:async()=>++reads===1?sha:'c'.repeat(40)})).rejects.toThrow('Main changed');
    expect(pushes).toBe(2);
  });
});
