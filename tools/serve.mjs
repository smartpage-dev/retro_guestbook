/** Loopback-only preview server. Never serves the repository or recordings. */
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {spawnSync,spawn} from 'node:child_process';
const here=path.dirname(fileURLToPath(import.meta.url));let root=path.resolve(here,'../dist');
if(fs.existsSync(path.join(here,'app/index.html')))root=path.join(here,'app');
if(!fs.existsSync(path.join(root,'index.html'))){const r=spawnSync(process.execPath,[path.join(here,'build.mjs')],{stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);}
const port=Number(process.env.PORT||4173);if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('Invalid PORT');
const allowed=new Map([['/','index.html'],['/index.html','index.html'],['/RetroBooth_Prototype.html','RetroBooth_Prototype.html'],['/sw.js','sw.js'],['/BUILD_INFO.json','BUILD_INFO.json'],['/THIRD_PARTY_NOTICES.txt','THIRD_PARTY_NOTICES.txt']]);
const server=http.createServer((req,res)=>{
 let url;try{url=new URL(req.url,'http://127.0.0.1');}catch{res.writeHead(400);res.end();return;}
 const name=allowed.get(url.pathname);if(!['GET','HEAD'].includes(req.method)||!name){res.writeHead(404);res.end('Not found');return;}
 const file=path.join(root,name);if(!fs.existsSync(file)){res.writeHead(404);res.end();return;}
 const type=name.endsWith('.html')?'text/html; charset=utf-8':name.endsWith('.js')?'text/javascript; charset=utf-8':name.endsWith('.json')?'application/json':'text/plain; charset=utf-8';
 res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Permissions-Policy':'camera=(self), microphone=(self)'});if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);
});
server.on('error',e=>{console.error('Cannot start:',e.message,'Close the other server or set PORT to another number.');process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>{console.log('\nRetroBooth webcam setup: http://127.0.0.1:'+port+'/?setup=1\nThis computer only. Android remote testing needs an HTTPS website or the test APK.\nKeep this terminal open. Ctrl+C stops the server.\n');if(process.argv.includes('--open')){const url='http://127.0.0.1:'+port+'/?setup=1';const cmd=process.platform==='win32'?['cmd',['/c','start','',url]]:process.platform==='darwin'?['open',[url]]:['xdg-open',[url]];const child=spawn(cmd[0],cmd[1],{stdio:'ignore',detached:true});child.on('error',()=>console.log('Open the URL printed above manually.'));child.unref();}});
