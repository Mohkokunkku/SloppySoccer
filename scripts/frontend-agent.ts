import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { frontendArguments } from './frontend-launch.js';
const taskId = process.argv[2] ?? 'role-hint';
if (!/^[a-z0-9-]{1,64}$/.test(taskId)) throw new Error('Invalid task ID');
const project = process.cwd();
const team = JSON.parse(await readFile(join(project,'agents/team.json'),'utf8'));
const task = JSON.parse(await readFile(join(project,'agents/frontend-tasks',`${taskId}.json`),'utf8'));
const output = join(project,'.local-server/agents/frontend',`${taskId}-${Date.now()}`);
await mkdir(output,{recursive:true});
const promptPath = join(output,'task.txt');
await writeFile(promptPath,'You are the frontend coding worker. Complete only this tiny task. Do not use tools or change files. Return only JSON {"code":"..."}.\n'+JSON.stringify(task));
const args = frontendArguments(team.frontend,promptPath);
const started = Date.now();
console.log(`FRONTEND TASK ${taskId} provider=${team.frontend.provider} model=${team.frontend.model} reasoning=${team.frontend.reasoning}`);
const result = await new Promise<{code:number|null;stdout:string;stderr:string}>((resolve,reject)=>{
  // Positional parameters, not shell interpolation: task paths cannot inject commands.
  const child=process.platform==='win32'
    ? spawn('bash',['-c','exec hermes "$@"','frontend-agent',...args],{cwd:project,stdio:['ignore','pipe','pipe'],windowsHide:true})
    : spawn('hermes',args,{cwd:project,stdio:['ignore','pipe','pipe']});
  let stdout='',stderr='';
  child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
  child.stdout.on('data',chunk=>{stdout+=chunk;}); child.stderr.on('data',chunk=>{stderr+=chunk;});
  child.on('error',reject); child.on('close',code=>resolve({code,stdout,stderr}));
});
await writeFile(join(output,'stdout.jsonl'),result.stdout);
await writeFile(join(output,'stderr.txt'),result.stderr);
await writeFile(join(output,'receipt.json'),JSON.stringify({taskId,target:task.target,provider:team.frontend.provider,model:team.frontend.model,reasoning:team.frontend.reasoning,exitCode:result.code,elapsedMs:Date.now()-started,sourceApplied:false},null,2));
if(result.code!==0)throw new Error(`Frontend worker failed (${result.code}). See ${output}`);
console.log(`FRONTEND PROPOSAL READY ${output}`);
console.log('Architect must inspect stdout.jsonl, review the generated code, and run tests before applying it.');
