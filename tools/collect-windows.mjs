/** Collect only complete native Windows deliverables, not build directories. */
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const root=process.cwd(),version=JSON.parse(fs.readFileSync('desktop/package.json')).version,arch=process.argv[2]||'x64';
if(!['x64','arm64'].includes(arch))throw new Error('Unknown architecture.');
const out=path.join(root,'windows-artifacts');fs.mkdirSync(out,{recursive:true});
const files=[];
for(const type of ['Setup','Portable']){
 const name=`RetroBooth-${version}-Windows-${arch}-${type}.exe`,source=path.join(root,'desktop/release',name);
 if(!fs.existsSync(source)||fs.statSync(source).size<1000000)throw new Error('Missing Windows program: '+name);
 const header=Buffer.alloc(2),fd=fs.openSync(source,'r');fs.readSync(fd,header,0,2,0);fs.closeSync(fd);
 if(header.toString()!=='MZ')throw new Error('Not a Windows executable: '+name);
 fs.copyFileSync(source,path.join(out,name));files.push(name);
}
const info={...JSON.parse(fs.readFileSync('dist/BUILD_INFO.json')),platform:'windows',arch,electron:JSON.parse(fs.readFileSync('desktop/package.json')).devDependencies.electron,codeSigning:'unsigned internal-test build; verify hashes and your organisation policy',nativePrinter:'NOT IMPLEMENTED ON WINDOWS',runtimeSmoke:arch==='x64'?'required packaged x64 Electron smoke before collection':'runtime smoke ran with x64 Electron; ARM64 binaries require ARM64 installation validation',data:'Per-user %APPDATA%/Luce RetroBooth; portable EXE does not carry recordings',acceptance:'No physical camera/printer/endurance acceptance is performed by build workflow'};
fs.writeFileSync(path.join(out,'BUILD_INFO.json'),JSON.stringify(info,null,2)+'\n');files.push('BUILD_INFO.json');
fs.copyFileSync('docs/WINDOWS_QUICK_START.md',path.join(out,'READ_ME_FIRST.md'));files.push('READ_ME_FIRST.md');
const hashes=files.map(name=>crypto.createHash('sha256').update(fs.readFileSync(path.join(out,name))).digest('hex')+'  '+name);
fs.writeFileSync(path.join(out,'SHA256SUMS.txt'),hashes.join('\n')+'\n');console.log(files.join('\n'));
