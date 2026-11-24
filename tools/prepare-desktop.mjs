/** Build a self-contained desktop web payload and hash-bound CSP. No downloads. */
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';import {spawnSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const built=spawnSync(process.execPath,[path.join(root,'tools/build.mjs')],{cwd:root,stdio:'inherit'});if(built.status!==0)process.exit(built.status||1);
const out=path.join(root,'desktop/web');fs.mkdirSync(out,{recursive:true});
for(const [from,to] of [['RetroBooth_Prototype.html','index.html'],['BUILD_INFO.json','BUILD_INFO.json'],['THIRD_PARTY_NOTICES.txt','THIRD_PARTY_NOTICES.txt']])fs.copyFileSync(path.join(root,'dist',from),path.join(out,to));
const html=fs.readFileSync(path.join(out,'index.html'),'utf8');
const hashes=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>"'sha256-"+crypto.createHash('sha256').update(m[1]).digest('base64')+"'");
if(!hashes.length||/\son\w+\s*=/i.test(html.split('<script>')[0]))throw new Error('Inline event handlers or missing scripts prevent strict desktop CSP.');
const csp=["default-src 'none'","script-src "+hashes.join(' '),"style-src 'self' 'unsafe-inline'","img-src 'self' blob: data:","media-src 'self' blob:","connect-src 'self' https:","font-src 'self'","object-src 'none'","frame-src 'none'","frame-ancestors 'none'","worker-src 'none'","base-uri 'none'","form-action 'none'"].join('; ');
const files={};for(const n of ['index.html','BUILD_INFO.json','THIRD_PARTY_NOTICES.txt'])files[n]=crypto.createHash('sha256').update(fs.readFileSync(path.join(out,n))).digest('hex');
fs.writeFileSync(path.join(out,'DESKTOP_ASSETS.json'),JSON.stringify({origin:'retrobooth://app',csp,files},null,2)+'\n');
console.log('Desktop assets prepared with '+hashes.length+' inline script hashes.');
