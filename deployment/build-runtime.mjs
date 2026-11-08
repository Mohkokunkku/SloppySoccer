import { build } from 'vite';
import { builtinModules } from 'node:module';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const project=fileURLToPath(new URL('../',import.meta.url));
export const candidate=resolve(project,'.local-server/github-deploy/candidate');
export async function buildRecovery(outDir=candidate) {
  let modules=[];
  const builtins=new Set([...builtinModules,...builtinModules.map(id=>`node:${id}`)]);
  await build({root:project,configFile:false,envFile:false,publicDir:false,logLevel:'warn',
    build:{ssr:resolve(project,'scripts/receive-local.ts'),outDir,emptyOutDir:false,minify:false,target:'node22',
      rollupOptions:{output:{format:'es',entryFileNames:'recovery.mjs',inlineDynamicImports:true},
        plugins:[{name:'closed-recovery',generateBundle(_,bundle){
          for(const chunk of Object.values(bundle)) if(chunk.type==='chunk') {
            if([...chunk.imports,...chunk.dynamicImports].some(id=>!builtins.has(id))) throw new Error('Recovery has non-builtin external imports');
            modules.push(...Object.keys(chunk.modules).map(id=>id.replaceAll('\\','/')));
          }
        }}]}},ssr:{noExternal:true}});
  return modules;
}
export async function buildCandidate() {
  execFileSync(process.execPath,[resolve(project,'node_modules/typescript/bin/tsc'),'-p',resolve(project,'tsconfig.deploy.json')],{cwd:project,stdio:'inherit'});
  await mkdir(candidate,{recursive:true});
  await buildRecovery();
  await writeFile(resolve(candidate,'package.json'),'{"type":"module"}\n');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) await buildCandidate();
