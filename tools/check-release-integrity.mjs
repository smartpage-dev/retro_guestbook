/** Verify the canonical v0.9.9 release source, both bytes and Git staging.
 * Requires only Node's built-ins. Never modifies a file or the Git index.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const requireGit = args.includes('--require-git');
const rootArg = args.find(a => a.startsWith('--root='));
const root = rootArg ? path.resolve(rootArg.slice(7)) : base;
const errors = [];
const say = s => process.stdout.write(`${s}\n`);
const fail = s => errors.push(s);
const textTypes = new Set(['.txt','.md','.json','.js','.mjs','.cjs','.ts','.yml','.yaml','.py','.html','.css','.xml','.gradle','.properties','.php','.sh','.command','.bat','.cmd','.ps1','.patch']);
const digest = (name, data) => {
  const ext=path.posix.extname(name).toLowerCase();
  if (textTypes.has(ext) || ['.gitignore','.gitattributes','.htaccess'].includes(path.posix.basename(name))) {
    data = Buffer.from(data.toString('utf8').replace(/\r\n/g, '\n'),'utf8');
  }
  return crypto.createHash('sha256').update(data).digest('hex');
};
const checkPath = name => typeof name === 'string' && name.length > 0 && !name.includes('\\') && !name.startsWith('/') && !name.split('/').some(p => p === '.' || p === '..' || p === '');
let manifest;
try { manifest = JSON.parse(fs.readFileSync(path.join(root,'RELEASE_SOURCE_SHA256.json'),'utf8')); }
catch (e) { console.error('FATAL: RELEASE_SOURCE_SHA256.json missing or unreadable:',e.message); process.exit(2); }
if (manifest.schema !== 'retrobooth-source-ledger-v1' || manifest.version !== '0.9.9-alpha.1' || manifest.androidVersionCode !== 18) {
  fail('Release ledger identity/version invalid; replace with the whole canonical ZIP, not an incremental patch.');
}
const files = manifest.files || {};
const names=Object.keys(files);
if (names.length < 175) fail(`Ledger incomplete (${names.length} files, expected >=175).`);
for (const necessary of ['src/.htaccess','src/desktop-admin.html','tools/check_release_versions.py','tools/check-release-integrity.mjs','tools/sync-release-to-repo.mjs','tools/native_build_info.py','tools/verify_apk_badging.py','tests/test_apk_metadata.py','android/app/build.gradle','desktop/package.json','package.json','cloud/retrobooth_private/app/Cloud.php','cloud/public_html/admin/index.html','cloud/public_html/guest/index.html','cloud/public_html/show/index.html','cloud/public_html/assets/admin.js','cloud/public_html/assets/guest.js','cloud/public_html/assets/show.js','src/cloud-flow.js','src/cloud-client.js','src/appearance.css','src/effects.js','tests/cloud_api.py','tests/browser_v097_styles.py','tests/browser_v097_cloud_mock.py','tests/browser_v098_polish.py','tests/browser_v099_antique_fps.py','src/antique-v099.css','docs/RETROBOOTH_V099_ANTIQUE_FPS_ZH.md','docs/RETROBOOTH_V099_QA_REPORT_ZH.md','tests/java/TicketUnicodeRasterTest.java','docs/RETROBOOTH_V098_UI_TICKET_ZH.md','docs/CLOUD_EVENT_MASTER_V097_ZH.md','tools/package_cloud_update.py','.github/workflows/build-android.yml','.github/workflows/build-windows.yml','.github/workflows/verify-all.yml','SYNC_TO_GITHUB.cmd']) {
  if (!(necessary in files)) fail(`Missing release ledger entry: ${necessary}`);
}
for (const name of names) {
  if (!checkPath(name)) { fail('Unsafe source ledger path: '+String(name)); continue; }
  const full=path.join(root,...name.split('/'));
  let stat;
  try { stat=fs.lstatSync(full); } catch {fail(`MISSING FILE: ${name}`);continue;}
  if (!stat.isFile() || stat.isSymbolicLink()) {fail(`Not a regular file: ${name}`);continue;}
  const actual=digest(name,fs.readFileSync(full));
  if (actual !== files[name]) fail(`HASH MISMATCH: ${name} (wrong version or incomplete merge)`);
}
if(fs.existsSync(path.join(root,'.github/workflows/build-all.yml'))) fail('Legacy build-all.yml present: remove the combined workflow.');
try {
  const p=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
  const d=JSON.parse(fs.readFileSync(path.join(root,'desktop/package.json'),'utf8'));
  const v=fs.readFileSync(path.join(root,'VERSION.txt'),'utf8').split(/\r?\n/)[0].trim();
  const gradle=fs.readFileSync(path.join(root,'android/app/build.gradle'),'utf8');
  if (p.version!==manifest.version || d.version!==manifest.version || v!==manifest.version || !gradle.includes(`versionName '${manifest.version}'`) || !gradle.includes('versionCode 18')) fail('Release version mismatch across packages/VERSION/Android Gradle.');
  for (const s of ['desktop:prepare','android:assets','test:native-core','test']) if(!p.scripts?.[s])fail(`Missing package.json script: ${s}`);
} catch (e) { fail('Cannot validate core release versions/scripts: '+e.message); }
try {
  const m=JSON.parse(fs.readFileSync(path.join(root,'MANIFEST_SHA256.json'),'utf8'));
  for (const name of names) {
    if (!(name in m.files)) {fail(`Package MANIFEST_SHA256.json omits source: ${name}`);continue;}
    // Package manifest is byte-for-byte (after Git line-ending normalization).
    // The cross-platform ledger above is the authoritative checkout check.
    const actual=fs.readFileSync(path.join(root,...name.split('/')));
    const x=crypto.createHash('sha256').update(actual).digest('hex');
    if (x !== m.files[name] && !['.bat','.cmd'].includes(path.extname(name).toLowerCase())) {
      fail(`Package MANIFEST_SHA256.json stale for: ${name}`);
    }
  }
} catch(e) { fail('Cannot validate package manifest: '+e.message); }
if (requireGit) {
  // Checking git ls-files alone is insufficient: an updated working-tree file
  // can be tracked yet NOT staged/committed. Verify Git INDEX blob contents.
  const stage=spawnSync('git',['-C',root,'ls-files','--stage','-z'],{encoding:null,maxBuffer:8*1024*1024});
  if(stage.status !== 0) fail('Git index unavailable: run inside the repository root.');
  else {
    const index=new Map();
    for(const entry of stage.stdout.toString('utf8').split('\0').filter(Boolean)) {
      const m=entry.match(/^[0-7]{6} ([0-9a-f]{40,64}) ([0-3])\t(.+)$/);
      if(m && m[2]==='0')index.set(m[3],m[1]);
    }
    const targets=[...names,'RELEASE_SOURCE_SHA256.json','MANIFEST_SHA256.json'];
    const request=[];
    for(const name of targets) {
      if(!index.has(name))fail(`NOT STAGED/COMMITTED IN GIT: ${name}`);
      else request.push([name,index.get(name)]);
    }
    if(request.length) {
      const response=spawnSync('git',['-C',root,'cat-file','--batch'],{
        input:Buffer.from(request.map(x=>x[1]).join('\n')+'\n'),encoding:null,maxBuffer:32*1024*1024
      });
      if(response.status!==0)fail('Unable to read staged Git blob contents.');
      else {
        const bytes=response.stdout; let at=0;
        for(const [name,oid] of request) {
          const nl=bytes.indexOf(10,at);
          if(nl<0){fail('Malformed Git blob batch output');break;}
          const h=bytes.subarray(at,nl).toString('utf8');
          const match=h.match(/^([0-9a-f]{40,64}) blob (\d+)$/);
          if(!match || match[1]!==oid){fail(`Malformed Git blob header for ${name}`);break;}
          const size=Number(match[2]),body=bytes.subarray(nl+1,nl+1+size);
          if(body.length!==size){fail(`Truncated Git index blob for ${name}`);break;}
          at=nl+1+size+1;
          const expected=name in files?files[name]:digest(name,fs.readFileSync(path.join(root,name)));
          if(digest(name,body)!==expected)fail(`NOT STAGED/COMMITTED CURRENT CONTENT: ${name}`);
        }
      }
    }
  }
}
if(errors.length) {
  console.error(`\nRETROBOOTH RELEASE CHECK FAILED: ${errors.length} problem(s)`);
  for (const e of errors.slice(0,75)) console.error('  - '+e);
  if(errors.length>75) console.error('  ... '+(errors.length-75)+' more problem(s)');
  console.error('REPAIR: use the ONE canonical FULL ROOT ZIP and SYNC_TO_GITHUB.cmd; avoid mixing patches.');
  process.exit(1);
}
say(`PASS: complete v0.9.9 release, ${names.length} SHA-256-checked source files${requireGit?', all tracked by Git':''}.`);
