import { resolve,join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { activateRelease,validateReleaseId } from './deploy-lib.js';
const root=resolve(process.env.DEPLOY_ROOT??'.local-server');
const previous=JSON.parse(await readFile(join(root,'previous.json'),'utf8')) as {releaseId:string};
await activateRelease(root,validateReleaseId(previous.releaseId));
console.log(`Rolled back to ${previous.releaseId}. Running supervisor reloads automatically.`);
