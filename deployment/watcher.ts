export interface WorkflowRun { id:number; event:string; head_branch:string; head_sha:string; status:string; conclusion:string|null; repository?:{full_name:string}; head_repository?:{full_name:string} }
export interface Checkpoint { baselineSha:string; deployedSha?:string; runId?:number }
export function validateSha(sha:string):string { if(!/^[a-f0-9]{40}$/.test(sha)) throw new Error('Invalid SHA'); return sha; }
export function validateRepository(repo:string):string { if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$(?![\s\S])/.test(repo)) throw new Error('Invalid repository'); return repo; }
function sameRepository(value:unknown,repo:string):boolean {
  if(typeof value!=='string') return false;
  try {return validateRepository(value).toLowerCase()===repo;} catch {return false;}
}
export function selectRun(runs:WorkflowRun[],main:string,repo:string):WorkflowRun|undefined {
  validateSha(main); const identity=validateRepository(repo).toLowerCase();
  return runs.find(r=>Number.isSafeInteger(r.id)&&r.id>0&&r.event==='push'&&r.head_branch==='main'&&r.head_sha===main&&r.status==='completed'&&r.conclusion==='success'&&sameRepository(r.repository?.full_name,identity)&&sameRepository(r.head_repository?.full_name,identity));
}
export function activationMatches(sha:string,bare:string,pointer:unknown,metadata:unknown,health:unknown):boolean {
  validateSha(sha);
  const p=pointer as {releaseId?:string}; const m=metadata as {releaseId?:string;tested?:boolean};
  return bare===sha&&typeof p?.releaseId==='string'&&new RegExp(`^git-${sha.slice(0,12)}-[0-9]+$`).test(p.releaseId)&&m?.releaseId===p.releaseId&&m.tested===true&&(health as {status?:string})?.status==='ok';
}
export async function reconcile(sha:string,io:{bare():Promise<string>;verify(sha:string):Promise<boolean>;push(sha:string):Promise<void>;retry(sha:string):Promise<void>}):Promise<void> {
  validateSha(sha);
  if(await io.bare()===sha) {
    if(!await io.verify(sha)) await io.retry(sha);
  } else await io.push(sha);
}
export interface Boundaries {main():Promise<string>;runs():Promise<WorkflowRun[]>;push(sha:string):Promise<void>;verify(sha:string):Promise<boolean>;repository?:string}
export async function cycle(checkpoint:Checkpoint|undefined,io:Boundaries):Promise<Checkpoint> {
  const main=validateSha(await io.main());
  if(!checkpoint) return {baselineSha:main};
  validateSha(checkpoint.baselineSha); if(checkpoint.deployedSha) validateSha(checkpoint.deployedSha);
  if(main===checkpoint.baselineSha||main===checkpoint.deployedSha) return checkpoint;
  const run=selectRun(await io.runs(),main,io.repository??'owner/game');
  if(!run) return checkpoint;
  if(await io.main()!==main) throw new Error('Main changed before push');
  await io.push(main);
  if(!await io.verify(main)) throw new Error('Activation verification failed');
  return {...checkpoint,deployedSha:main,runId:run.id};
}
