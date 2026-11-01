import { resolve,join } from 'node:path';
import { mkdir,writeFile,chmod } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { run,cleanEnv } from './process.js';
const project=process.cwd(); const root=resolve(process.env.DEPLOY_ROOT??'.local-server');
const bare=join(root,'repository.git'); await mkdir(root,{recursive:true});
await run('git',['init','--bare','--initial-branch=main',bare],project);
const quote=(s:string)=>"'"+s.replaceAll("'", "'\\''")+"'";
const node=process.execPath.replaceAll('\\','/');
const tsx=join(project,'node_modules/tsx/dist/cli.mjs').replaceAll('\\','/');
const receiver=join(project,'scripts/receive-local.ts').replaceAll('\\','/');
const hook=`#!/bin/sh
set -eu
while read old new ref; do
  if [ "$ref" = "refs/heads/main" ] && [ "$new" != "0000000000000000000000000000000000000000" ]; then
    ${quote(node)} ${quote(tsx)} ${quote(receiver)} ${quote(bare.replaceAll('\\','/'))} "$new" ${quote(root.replaceAll('\\','/'))}
  fi
done
`;
const hookPath=join(bare,'hooks/post-receive'); await writeFile(hookPath,hook); await chmod(hookPath,0o755);
const remotes=execFileSync('git',['remote'],{cwd:project,env:cleanEnv(),encoding:'utf8'}).split(/\s+/);
if(remotes.includes('local')) {
  const existing=execFileSync('git',['remote','get-url','local'],{cwd:project,env:cleanEnv(),encoding:'utf8'}).trim();
  if(resolve(existing)!==resolve(bare)) throw new Error(`Existing remote local points elsewhere: ${existing}; not overwriting.`);
} else await run('git',['remote','add','local',bare],project);
console.log(`LOCAL CD READY: git push local main -> tests -> build -> browser checks -> audit -> isolated release -> health check -> activate
Target: ${root}`);
