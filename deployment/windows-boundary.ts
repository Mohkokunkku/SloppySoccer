import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { statSync } from 'node:fs';
import { win32 } from 'node:path';

// SystemRoot/WinDir are trusted OS environment inputs, never project PATH.
// Fail closed on a supplied malformed root rather than falling back to lookup.
export function resolveWindowsPowerShell(systemRoot:string|undefined,winDir:string|undefined):string {
  const root=systemRoot ?? winDir;
  if(!root || !/^[A-Za-z]:[\\/]/.test(root) || /[<>:"|?*;\x00-\x1f]/.test(root.slice(2))) throw new Error('Invalid system root');
  const parts=root.slice(3).split(/[\\/]/);
  if(parts.some(part=>!part || part==='.' || part==='..' || /[. ]$/.test(part))) throw new Error('Invalid system root');
  return win32.join(root,'System32','WindowsPowerShell','v1.0','powershell.exe');
}

// PATH is a trusted supervisor input, not a shell command. Never implicitly
// search cwd, relative PATH entries, or a PATH entry inside the working tree.
export function resolveWindowsExecutable(file:string,cwd:string,path=process.env.PATH ?? ''):string {
  if(win32.isAbsolute(file)) return file;
  if(!/^[\w.-]+$/.test(file)||!/^\w[\w.-]*?(?:\.exe)?$/i.test(file)) throw new Error('Absolute executable or bare EXE required');
  const name=/\.exe$/i.test(file)?file:file+'.exe';
  const root=win32.resolve(cwd).toLowerCase();
  for(const entry of path.split(';')) {
    const directory=entry.startsWith('"')&&entry.endsWith('"')?entry.slice(1,-1):entry;
    if(!win32.isAbsolute(directory)) continue;
    const base=win32.resolve(directory),lower=base.toLowerCase();
    if(lower===root||lower.startsWith(root+'\\')) continue;
    const candidate=win32.join(base,name);
    try {if(statSync(candidate).isFile()) return candidate;} catch { /* next trusted PATH entry */ }
  }
  throw new Error('Executable not found in trusted PATH');
}

// Windows 10+ atomic job-list creation avoids even a suspended orphan if the
// supervisor crashes at process creation. No breakaway; kill on job close.
const native=String.raw`
using System;
using System.IO;
using System.Text;
using System.Threading;
using System.Diagnostics;
using System.Runtime.InteropServices;
public static class DeployBoundary {
 [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] struct SI { public int cb; public string reserved,desktop,title; public int x,y,xs,ys,xc,yc,fill,flags; public short show,reserved2; public IntPtr reserved3,input,output,error; }
 [StructLayout(LayoutKind.Sequential)] struct PI { public IntPtr process,thread; public int pid,tid; }
 [StructLayout(LayoutKind.Sequential)] struct SIX { public SI basic; public IntPtr attributes; }
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool InitializeProcThreadAttributeList(IntPtr list,int count,int flags,ref IntPtr size);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool UpdateProcThreadAttribute(IntPtr list,uint flags,IntPtr attribute,IntPtr value,IntPtr size,IntPtr previous,IntPtr returned);
 [DllImport("kernel32.dll")] static extern void DeleteProcThreadAttributeList(IntPtr list);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern bool CreateProcess(string app,StringBuilder cmd,IntPtr pa,IntPtr ta,bool inherit,uint flags,IntPtr env,string cwd,ref SIX si,out PI pi);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode)] static extern IntPtr CreateJobObject(IntPtr a,string name);
 [DllImport("kernel32.dll")] static extern bool SetInformationJobObject(IntPtr job,int cls,IntPtr data,uint size);
 [DllImport("kernel32.dll")] static extern bool QueryInformationJobObject(IntPtr job,int cls,IntPtr data,uint size,IntPtr len);

 [DllImport("kernel32.dll")] static extern bool TerminateJobObject(IntPtr job,uint code);
 [DllImport("kernel32.dll")] static extern bool TerminateProcess(IntPtr process,uint code);
 [DllImport("kernel32.dll")] static extern uint ResumeThread(IntPtr thread);
 [DllImport("kernel32.dll")] static extern bool GetExitCodeProcess(IntPtr process,out uint code);
 [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
 [DllImport("kernel32.dll")] static extern IntPtr GetStdHandle(int which);
 static int Active(IntPtr job) { IntPtr p=Marshal.AllocHGlobal(48); try {if(!QueryInformationJobObject(job,1,p,48,IntPtr.Zero)) throw new Exception("Job query failed");return Marshal.ReadInt32(p,40);}finally {Marshal.FreeHGlobal(p);} }
 public static int Run(string file,string line,string cwd,int timeout,string lockPath,string jobName) {
  FileStream lease=null; IntPtr job=IntPtr.Zero; PI pi=new PI(); bool assigned=false;
  try {
   if(lockPath!="") {try {lease=new FileStream(lockPath,FileMode.OpenOrCreate,FileAccess.ReadWrite,FileShare.None);}catch(IOException){return 73;}}
   job=CreateJobObject(IntPtr.Zero,jobName==""?null:jobName); if(job==IntPtr.Zero) throw new Exception("Job creation failed");
   // A crashed supervisor may have released its file handle before all job
   // processes finished dying. Reopening the same named job closes that gap.
   if(Active(job)>0) throw new Exception("Previous deployment tree still exiting");
   IntPtr limits=Marshal.AllocHGlobal(144);
   try {for(int i=0;i<144;i++) Marshal.WriteByte(limits,i,0);Marshal.WriteInt32(limits,16,0x2000);if(!SetInformationJobObject(job,9,limits,144)) throw new Exception("Job limits failed");} finally {Marshal.FreeHGlobal(limits);}
   SIX si=new SIX();si.basic.cb=Marshal.SizeOf(si);si.basic.flags=0x100;si.basic.input=GetStdHandle(-10);si.basic.output=GetStdHandle(-11);si.basic.error=GetStdHandle(-12);
   IntPtr size=IntPtr.Zero;InitializeProcThreadAttributeList(IntPtr.Zero,1,0,ref size);
   si.attributes=Marshal.AllocHGlobal(size);IntPtr jobs=Marshal.AllocHGlobal(IntPtr.Size);bool initialized=false;
   try {
    if(!InitializeProcThreadAttributeList(si.attributes,1,0,ref size)) throw new Exception("Job attributes failed");initialized=true;
    Marshal.WriteIntPtr(jobs,job);
    if(!UpdateProcThreadAttribute(si.attributes,0,new IntPtr(0x2000D),jobs,new IntPtr(IntPtr.Size),IntPtr.Zero,IntPtr.Zero)) throw new Exception("Atomic job list failed");
    if(!CreateProcess(file,new StringBuilder(line),IntPtr.Zero,IntPtr.Zero,true,4|0x08000000|0x80000,IntPtr.Zero,cwd,ref si,out pi)) throw new Exception("Process creation failed");
    assigned=true;
   } finally {if(initialized) DeleteProcThreadAttributeList(si.attributes);Marshal.FreeHGlobal(si.attributes);Marshal.FreeHGlobal(jobs);}
   if(ResumeThread(pi.thread)==0xffffffff) throw new Exception("Process resume failed");
   var clock=Stopwatch.StartNew();bool timedOut=false;
   while(Active(job)>0 && clock.ElapsedMilliseconds<timeout) Thread.Sleep(20);
   if(Active(job)>0) {timedOut=true;if(!TerminateJobObject(job,124)) throw new Exception("Tree termination failed");}
   // Retain the lease until the OS confirms every descendant has exited.
   for(int i=0;i<500 && Active(job)>0;i++) Thread.Sleep(20);
   if(Active(job)>0) throw new Exception("Tree cleanup unconfirmed");
   uint code;if(!GetExitCodeProcess(pi.process,out code)) throw new Exception("Exit query failed");
   return timedOut?124:(int)code;
  } finally {
   if(pi.process!=IntPtr.Zero && !assigned) TerminateProcess(pi.process,125);
   if(job!=IntPtr.Zero) CloseHandle(job);
   if(pi.thread!=IntPtr.Zero) CloseHandle(pi.thread);if(pi.process!=IntPtr.Zero) CloseHandle(pi.process);
   if(lease!=null) lease.Dispose();
  }
 }
}
`;
// CommandLineToArgvW / MS CRT quoting; never shell-interpreted.
export function windowsQuote(value:string):string {
  return '"'+value.replace(/(\\*)"/g,'$1$1\\"').replace(/(\\+)$/,'$1$1')+'"';
}
export function windowsCommand(file:string,args:string[],cwd:string,timeout:number,lock='',started?:(pid:number)=>void):Promise<string> {
  if(process.platform!=='win32') return Promise.reject(new Error('Windows boundary required'));
  let powershell:string;
  try {file=resolveWindowsExecutable(file,cwd);powershell=resolveWindowsPowerShell(process.env.SystemRoot,process.env.WinDir);} catch(error) {return Promise.reject(error);}
  const literal=(s:string)=>"'"+s.replaceAll("'","''")+"'";
  const jobName=lock?'Local\\SloppySoccer-'+createHash('sha256').update(lock.toLowerCase()).digest('hex'):'';
  const script=`$ErrorActionPreference='Stop'; [Console]::OutputEncoding=[Text.UTF8Encoding]::new(); Add-Type -TypeDefinition @'\n${native}\n'@; exit [DeployBoundary]::Run(${literal(file)},${literal([file,...args].map(windowsQuote).join(' '))},${literal(cwd)},${timeout},${literal(lock)},${literal(jobName)})`;
  return new Promise((ok,fail)=>{
    // Native timeout owns normal cleanup. Emergency watchdog also bounds Add-Type
    // startup; killing the supervisor closes its KILL_ON_JOB_CLOSE job handle.
    const supervisor=execFile(powershell,['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{cwd,timeout:timeout+30_000,shell:false,windowsHide:true,maxBuffer:1024*1024,env:{...process.env,...(lock?{SLOPPY_DEPLOY_LEASE:lock}:{}),GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'never'}},(error,stdout)=>error?fail(new Error('Bounded process failed')):ok(stdout.trim()));
    if(supervisor.pid) started?.(supervisor.pid);
  });
}
