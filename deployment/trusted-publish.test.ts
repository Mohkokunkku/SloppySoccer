import{it,expect}from'vitest';
import{advanceVerifiedRef}from'./runtime.js';
it('publishes an exact verified object with fast-forward and compare-and-swap, never a mutable receive hook',async()=>{
 const old='a'.repeat(40),next='b'.repeat(40),calls:string[][]=[];
 await advanceVerifiedRef('D:/bare.git','D:/source',next,async(file,args)=>{calls.push([file,...args]);return args.includes('rev-parse')?old:'';});
 expect(calls).toEqual([
  ['git','--git-dir','D:/bare.git','rev-parse','refs/heads/main'],
  ['git','--git-dir','D:/bare.git','fetch','--no-tags','D:/source',next],
  ['git','--git-dir','D:/bare.git','merge-base','--is-ancestor',old,next],
  ['git','--git-dir','D:/bare.git','update-ref','refs/heads/main',next,old],
 ]);
 expect(calls.flat()).not.toContain('push');
});
it('does not update the bare ref when ancestry validation fails',async()=>{
 const calls:string[][]=[];await expect(advanceVerifiedRef('D:/bare.git','D:/source','b'.repeat(40),async(_,args)=>{calls.push(args);if(args.includes('merge-base'))throw Error('not a fast forward');return'a'.repeat(40);})).rejects.toThrow('not a fast forward');
 expect(calls.some(args=>args.includes('update-ref'))).toBe(false);
});
it('advances a real bare Git repository without running its receive hook',async()=>{
 const fs=await import('node:fs/promises'),{tmpdir}=await import('node:os'),{join}=await import('node:path'),{execFileSync}=await import('node:child_process');
 const root=await fs.mkdtemp(join(process.env.TMPDIR??tmpdir(),'soccer-trusted-ref-')),source=join(root,'source'),bare=join(root,'bare.git');
 const git=(args:string[])=>execFileSync('git',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 try{
  git(['init','-b','main',source]);git(['-C',source,'-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','--allow-empty','-m','first']);
  git(['init','--bare',bare]);git(['--git-dir',bare,'fetch',source,'refs/heads/main:refs/heads/main']);
  await fs.writeFile(join(bare,'hooks','post-receive'),'#!/bin/sh\nprintf broken > hook-was-run\nexit 1\n',{mode:0o755});
  git(['-C',source,'-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','--allow-empty','-m','second']);
  const sha=git(['-C',source,'rev-parse','HEAD']);await advanceVerifiedRef(bare,source,sha);
  expect(git(['--git-dir',bare,'rev-parse','refs/heads/main'])).toBe(sha);
  await expect(fs.access(join(bare,'hook-was-run'))).rejects.toThrow();
 }finally{await fs.rm(root,{recursive:true,force:true});}
},60000);
it('does not invoke mutable working-tree receiver or a main post-receive push',async()=>{
 const{readFile}=await import('node:fs/promises');const source=await readFile('deployment/runtime.ts','utf8');
 expect(source).not.toContain("['push','local'");expect(source).toContain('await advanceVerifiedRef(bare,project,sha)');
 expect(source).toContain('await receiveVerified(sha)');
});
