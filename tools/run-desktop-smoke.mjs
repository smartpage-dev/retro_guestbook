/** Run an actual Electron executable and wait for its result, killing on timeout. */
import fs from 'node:fs';import path from 'node:path';import {spawn} from 'node:child_process';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),req=createRequire(path.join(root,'desktop/package.json'));
const exe=process.argv[2]?path.resolve(process.argv[2]):req('electron');
const packaged=!!process.argv[2],out=path.join(root,'desktop/.smoke-output',packaged?'packaged':'development');fs.mkdirSync(out,{recursive:true});
const env={...process.env,CI:'true',RETROBOOTH_CI_SMOKE:'1',RETROBOOTH_SMOKE_OUTPUT:out};delete env.ELECTRON_RUN_AS_NODE;
const child=spawn(exe,packaged?[]:[path.join(root,'desktop')],{cwd:root,env,stdio:'inherit'});
const timer=setTimeout(()=>{console.error('Desktop smoke timed out; NOT a pass.');child.kill();process.exitCode=1;},180000);
child.on('error',error=>{clearTimeout(timer);console.error(error);process.exitCode=1;});
child.on('exit',code=>{clearTimeout(timer);if(code!==0){process.exitCode=code||1;return;}try{const r=JSON.parse(fs.readFileSync(path.join(out,'smoke.json'),'utf8'));if(r.error||r.passed<20)throw new Error('Incomplete desktop smoke result.');}catch(error){console.error(error);process.exitCode=1;}});
