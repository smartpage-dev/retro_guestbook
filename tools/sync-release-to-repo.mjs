/** Safe complete-release staging helper. Copies only allowlisted canonical files,
 * checks Git tracking + SHA-256, and stages; NEVER commits or pushes.
 * Requires Node 22+ and Git. Designed for GitHub Desktop users.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import readline from 'node:readline/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const source=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const argv=process.argv.slice(2);
const find=k=>{const i=argv.indexOf(k);return i>=0?argv[i+1]:null;};
const repoValue=find('--repo');
const apply=argv.includes('--apply');
const yes=argv.includes('--yes');
if(!repoValue || (!apply && !argv.includes('--dry-run'))) {
 console.log('Usage: node tools/sync-release-to-repo.mjs --repo <existing GitHub clone path> --dry-run|--apply');
 process.exit(2);
}
const dest=path.resolve(repoValue);
const error=s=>{console.error('ERROR:',s);process.exit(1);};
if(Number(process.versions.node.split('.')[0])<22) error(`Node.js 22+ required (found ${process.versions.node}).`);
// GitHub Desktop bundles Git but does not always put it on Windows PATH.
const candidates=['git'];
if(process.platform==='win32') {
 if(process.env.ProgramFiles)candidates.push(path.join(process.env.ProgramFiles,'Git','cmd','git.exe'));
 if(process.env.LOCALAPPDATA) {
  candidates.push(path.join(process.env.LOCALAPPDATA,'Programs','Git','cmd','git.exe'));
  const desktop=path.join(process.env.LOCALAPPDATA,'GitHubDesktop');
  if(fs.existsSync(desktop)){
   const dirs=fs.readdirSync(desktop).filter(n=>n.startsWith('app-')).sort().reverse();
   for(const name of dirs)candidates.push(path.join(desktop,name,'resources','app','git','cmd','git.exe'));
  }
 }
}
const gitBinary=candidates.find(file=>spawnSync(file,['--version'],{encoding:'utf8'}).status===0);
if(!gitBinary)error('Git executable not found. Install Git for Windows, or use GitHub Desktop with a bundled Git installation.');
const cmd=(args,opt={})=>{
 const r=spawnSync(gitBinary,['-C',dest,...args],{encoding:'utf8',maxBuffer:5*1024*1024,...opt});
 if(r.status!==0)error(`Git ${args.join(' ')} failed: ${(r.stderr||r.stdout||'').trim()}`);
 return (r.stdout||'').trim();
};
if(!fs.existsSync(path.join(dest,'.git'))) error('Destination must be an existing local GitHub repository root (.git missing).');
if(fs.realpathSync(dest)!==fs.realpathSync(source) && dest.startsWith(source+path.sep))error('Destination cannot be nested inside the extracted release.');
if(path.resolve(cmd(['rev-parse','--show-toplevel']))!==dest)error('Destination is not the repository root.');
const branch=cmd(['branch','--show-current']);
if(branch!=='main') error(`Checkout main before syncing (current branch: ${branch||'DETACHED'}).`);
const remote=cmd(['remote','get-url','origin']);
if(!/(?:github\.com[:/])smartpage-dev\/retro_guestbook(?:\.git)?\/?$/i.test(remote))error('Origin does not match smartpage-dev/retro_guestbook: '+remote);
const dirty=cmd(['status','--porcelain=v1','--untracked-files=normal']);
if(dirty) error('Repository has local changes/untracked files. Commit, stash or back up first. Nothing copied.\n'+dirty.slice(0,1100));
const checked=spawnSync(process.execPath,[path.join(source,'tools/check-release-integrity.mjs')],{encoding:'utf8'});
if(checked.status!==0)error('Downloaded release ZIP is incomplete/corrupt. No copy performed.\n'+checked.stdout+'\n'+checked.stderr);
const ledger=JSON.parse(fs.readFileSync(path.join(source,'RELEASE_SOURCE_SHA256.json'),'utf8'));
const names=[...Object.keys(ledger.files),'RELEASE_SOURCE_SHA256.json','MANIFEST_SHA256.json'];
if(names.some(p=>p.includes('..')||p.startsWith('/')||p.includes('\\'))) error('Invalid ledger path.');
let changed=0;
for(const name of names){
 const src=path.join(source,...name.split('/')),dst=path.join(dest,...name.split('/'));
 if(!fs.existsSync(dst)||!fs.readFileSync(src).equals(fs.readFileSync(dst)))changed++;
}
const legacy=fs.existsSync(path.join(dest,'.github/workflows/build-all.yml'));
console.log(`Source: ${source}\nGitHub clone: ${dest}\nOrigin: ${remote}\nBranch: ${branch}`);
console.log(`Canonical tracked paths: ${names.length} | missing/changed on disk: ${changed} | legacy workflow: ${legacy?'present (will be removed)':'absent'}`);
if(!apply){ console.log('DRY RUN COMPLETE. Re-run with --apply when ready.'); process.exit(0); }
if(!yes){
 const prompt=readline.createInterface({input:process.stdin,output:process.stdout});
 const answer=await prompt.question('Type APPLY to copy and stage the canonical release (no commit/push): ');
 prompt.close();
 if(answer.trim()!=='APPLY')error('Cancelled; no files copied.');
}
// Do not touch .git, live/private configs, existing recordings, or any files outside allowlist.
for(const name of names) {
 const src=path.join(source,...name.split('/')),dst=path.join(dest,...name.split('/'));
 fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(src,dst);
}
if(legacy)fs.rmSync(path.join(dest,'.github/workflows/build-all.yml'));
for(let i=0;i<names.length;i+=32)cmd(['add','--',...names.slice(i,i+32)]);
if(legacy){
 const tracked=cmd(['ls-files','--','.github/workflows/build-all.yml']);
 if(tracked)cmd(['add','-u','--','.github/workflows/build-all.yml']);
}
const checkedDest=spawnSync(process.execPath,[path.join(dest,'tools/check-release-integrity.mjs'),'--require-git'],{cwd:dest,encoding:'utf8'});
if(checkedDest.status!==0)error('Staged source validation failed; do NOT commit/push.\n'+checkedDest.stdout+'\n'+checkedDest.stderr);
console.log(checkedDest.stdout.trim());
console.log('\nSTAGED DIFF:');console.log(cmd(['diff','--cached','--stat'])||'(none; already matched)');
console.log('\nSUCCESS: canonical source is staged and verified. NO COMMIT/PUSH WAS PERFORMED.');
console.log('Review changes in GitHub Desktop, Commit to main, click Push origin, then run a NEW Android workflow.');
