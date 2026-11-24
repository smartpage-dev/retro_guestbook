/** Use an existing reviewed lockfile; first CI build records its resolved lock as evidence. */
import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const dir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../desktop');
const locked=fs.existsSync(path.join(dir,'package-lock.json'));
if(!locked)console.warn('No desktop lockfile yet. Direct dependencies are pinned; this run will resolve transitive dependencies. Review and commit the generated lock from build evidence.');
const args=[locked?'ci':'install','--no-audit','--no-fund'];
const result=spawnSync(process.platform==='win32'?'npm.cmd':'npm',args,{cwd:dir,stdio:'inherit',shell:process.platform==='win32'});
if(result.error)throw result.error;process.exit(result.status??1);
