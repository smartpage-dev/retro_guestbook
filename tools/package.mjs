/** Small dependency-free ZIP writer for these <4 GB test distributions. */
import fs from 'node:fs';import path from 'node:path';import zlib from 'node:zlib';import crypto from 'node:crypto';
const root=process.cwd(),out=path.join(root,'artifacts');fs.mkdirSync(out,{recursive:true});
const table=Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
const crc=buffer=>{let c=0xffffffff;for(const b of buffer)c=table[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;};
export function zip(entries){const chunks=[],directory=[];let offset=0;
 for(const [filename,bytes] of entries){const name=Buffer.from(filename),data=Buffer.isBuffer(bytes)?bytes:Buffer.from(bytes),compressed=zlib.deflateRawSync(data,{level:9}),sum=crc(data),date=(46<<9)|(11<<5)|23;
  const h=Buffer.alloc(30);h.writeUInt32LE(0x04034b50);h.writeUInt16LE(20,4);h.writeUInt16LE(0x800,6);h.writeUInt16LE(8,8);h.writeUInt16LE(date,12);h.writeUInt32LE(sum,14);h.writeUInt32LE(compressed.length,18);h.writeUInt32LE(data.length,22);h.writeUInt16LE(name.length,26);chunks.push(h,name,compressed);
  const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50);c.writeUInt16LE(0x314,4);c.writeUInt16LE(20,6);c.writeUInt16LE(0x800,8);c.writeUInt16LE(8,10);c.writeUInt16LE(date,14);c.writeUInt32LE(sum,16);c.writeUInt32LE(compressed.length,20);c.writeUInt32LE(data.length,24);c.writeUInt16LE(name.length,28);c.writeUInt32LE((0o100644<<16)>>>0,38);c.writeUInt32LE(offset,42);directory.push(c,name);offset+=h.length+name.length+compressed.length;
 }
 const dir=Buffer.concat(directory),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(dir.length,12);end.writeUInt32LE(offset,16);return Buffer.concat([...chunks,dir,end]);
}
const dist=path.join(root,'dist');if(!fs.existsSync(path.join(dist,'index.html')))throw new Error('Run npm run build first.');
const files=fs.readdirSync(dist).filter(x=>fs.statSync(path.join(dist,x)).isFile()).sort().map(x=>[x,fs.readFileSync(path.join(dist,x))]);
const intro=fs.readFileSync(path.join(root,'docs/QUICK_START.md'));
fs.writeFileSync(path.join(out,'RetroBooth_v0.9_Hostinger_Static_Preview.zip'),zip([...files,['START_HERE.md',intro]]));
const local=[...files.map(([n,b])=>['app/'+n,b]),['serve.mjs',fs.readFileSync('tools/serve.mjs')],['START_HERE.md',intro]];
for(const f of ['Start_Webcam_Windows.bat','Start_Webcam_macOS.command','Start_Webcam_Linux.sh'])local.push([f,fs.readFileSync('launchers/'+f)]);
fs.writeFileSync(path.join(out,'RetroBooth_v0.9_Local_Webcam_Test.zip'),zip(local));
fs.copyFileSync(path.join(dist,'RetroBooth_Prototype.html'),path.join(out,'RetroBooth_Prototype_v0.9_Webcam.html'));
const cloud=[];
function tree(dir,prefix){for(const ent of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
 if(ent.name==='config.php'||ent.name==='data')continue;
 const source=path.join(dir,ent.name),name=prefix+ent.name;
 if(ent.isDirectory())tree(source,name+'/');else if(ent.isFile())cloud.push([name,fs.readFileSync(source)]);
}}
tree(path.join(root,'cloud/public_html'),'public_html/');tree(path.join(root,'cloud/retrobooth_private'),'retrobooth_private/');
cloud.push(['tools/generate-cloud-config.mjs',fs.readFileSync('tools/generate-cloud-config.mjs')]);
cloud.push(['history/v0.8/SETUP_AND_RUNNING_GUIDE.md',fs.readFileSync('history/v0.8/SETUP_AND_RUNNING_GUIDE.md')]);
cloud.push(['START_HERE.md',intro],['SETUP_AND_RUNNING_GUIDE.md',fs.readFileSync('docs/SETUP_AND_RUNNING_GUIDE.md')]);
fs.writeFileSync(path.join(out,'RetroBooth_v0.9_Hostinger_Cloud_Alpha.zip'),zip(cloud));
const hashes={};for(const f of fs.readdirSync(out).filter(x=>!x.endsWith('.json')).sort())hashes[f]=crypto.createHash('sha256').update(fs.readFileSync(path.join(out,f))).digest('hex');
fs.writeFileSync(path.join(out,'SHA256SUMS.json'),JSON.stringify(hashes,null,2)+'\n');
console.log('Packaged web test distributions into artifacts/');
