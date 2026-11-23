'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const os = require('node:os');
const S = require('../desktop/security.cjs');
const { loadAssets } = require('../desktop/assets.cjs');
const root = path.resolve(__dirname, '..');
const origin = 'https://booth.example.test';
const token = 'a'.repeat(32) + '.' + 'X'.repeat(32);
const cases = [
 ['entry accepted', ()=>S.isEntry(S.ENTRY)],
 ['entry query and hash accepted', ()=>S.isEntry(S.ENTRY+'?setup=1#booth')],
 ['different custom host rejected', ()=>!S.isAppURL('retrobooth://other/index.html')],
 ['lookalike host rejected', ()=>!S.isAppURL('retrobooth://app.evil/index.html')],
 ['credentials rejected', ()=>!S.isAppURL('retrobooth://user@app/index.html')],
 ['port rejected', ()=>!S.isAppURL('retrobooth://app:42/index.html')],
 ['file origin rejected', ()=>!S.isAppURL('file:///index.html')],
 ['nested app page rejected', ()=>!S.isEntry('retrobooth://app/settings.html')],
 ['HTTPS cloud accepted', ()=>S.cloudOrigin(origin)===origin],
 ['exact approved API accepted', ()=>S.isAPI(origin+'/api/device/verify',origin)],
 ['API denied before approval', ()=>!S.isAPI(origin+'/api/device/verify','')],
 ['different cloud rejected', ()=>!S.isAPI('https://wrong.test/api/device/verify',origin)],
 ['public assets not available as API', ()=>!S.isAPI(origin+'/guest/',origin)],
 ['encoded path rejected', ()=>!S.isAPI(origin+'/api/%2e%2e/config.php',origin)],
 ['guest link accepted only exact origin and capability', ()=>S.guestURL(origin+'/guest/#'+token,origin)],
 ['guest capability required', ()=>!S.guestURL(origin+'/guest/',origin)],
 ['guest query token rejected', ()=>!S.guestURL(origin+'/guest/?token='+token,origin)],
 ['OS protocol handler rejected', ()=>!S.networkAllowed('ms-settings:privacy-webcam',origin)],
 ['arbitrary file network denied', ()=>!S.networkAllowed('file:///C:/Windows/win.ini',origin)],
 ['unapproved HTTP rejected', ()=>!S.networkAllowed('http://127.0.0.1:4173',origin)],
 ['own blob allowed', ()=>S.networkAllowed('blob:retrobooth://app/abc',origin)],
 ['other-origin blob rejected', ()=>!S.networkAllowed('blob:https://evil.test/abc',origin)],
 ['safe export accepted', ()=>S.suggestedName('RetroBooth_001.mp4')==='RetroBooth_001.mp4'],
 ['export path cannot traverse', ()=>!S.suggestedName('../../photo.png').includes('/')],
];
for(const [name, fn] of cases)test(name,()=>assert(fn()));
for(const value of ['http://example.test','https://example.test/path','https://example.test/?x=1','https://user:pass@example.test','https://127.0.0.1','https://localhost','javascript:alert(1)','https://x.local','https://example.test:8443'])test('cloud rejects '+value,()=>assert.throws(()=>S.cloudOrigin(value)));
for(const value of ['run.exe','bad.html','CON.txt','x.ps1','nothing'])test('export rejects '+value,()=>assert.throws(()=>S.suggestedName(value)));
test('IPC requires exact top frame and webContents',()=>{
 const frame={url:S.ENTRY},wc={mainFrame:frame},win={isDestroyed:()=>false,webContents:wc};
 assert(S.trustedIPC({sender:wc,senderFrame:frame},win));
 assert(!S.trustedIPC({sender:wc,senderFrame:{url:S.ENTRY}},win));
 assert(!S.trustedIPC({sender:{},senderFrame:frame},win));
});
test('all desktop JavaScript parses',()=>{for(const n of ['main','preload','security','assets','self-test','electron-builder'])new vm.Script(fs.readFileSync(path.join(root,'desktop',n+'.cjs'),'utf8'));});
test('asset handler serves only hash-verified packaged routes',async()=>{
 const response=loadAssets(path.join(root,'desktop/web'));
 const entry=response({url:S.ENTRY,method:'GET'});assert.equal(entry.status,200);assert((await entry.text()).includes('id="desktopCard"'));
 assert.equal(response({url:S.ENTRY,method:'POST'}).status,405);
 assert.equal(response({url:S.APP_ORIGIN+'/../package.json',method:'GET'}).status,404);
 assert.equal(response({url:'retrobooth://other/index.html',method:'GET'}).status,404);
 assert.equal(await response({url:S.ENTRY,method:'HEAD'}).text(),'');
});
test('modified bundled asset fails closed',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'retro-assets-'));try{fs.cpSync(path.join(root,'desktop/web'),temp,{recursive:true});fs.appendFileSync(path.join(temp,'index.html'),'malicious');assert.throws(()=>loadAssets(temp));}finally{fs.rmSync(temp,{recursive:true,force:true});}
});
test('every inline script has a CSP hash, no unsafe script or eval allowance',()=>{
 const html=fs.readFileSync(path.join(root,'desktop/web/index.html'),'utf8'),manifest=JSON.parse(fs.readFileSync(path.join(root,'desktop/web/DESKTOP_ASSETS.json'))),csp=manifest.csp;
 for(const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g))assert(csp.includes('sha256-'+crypto.createHash('sha256').update(m[1]).digest('base64')));
 assert(!csp.includes('unsafe-eval'));assert(!csp.split(';').find(x=>x.trim().startsWith('script-src')).includes('unsafe-inline'));assert(csp.includes("frame-ancestors 'none'"));
});
test('main retains sandbox, isolation, TLS, single-instance and origin checks',()=>{
 const js=fs.readFileSync(path.join(root,'desktop/main.cjs'),'utf8');
 for(const text of ['app.enableSandbox()','sandbox: true','contextIsolation: true','nodeIntegration: false','webSecurity: true','requestSingleInstanceLock','S.trustedIPC','setPermissionCheckHandler','setPermissionRequestHandler','setDisplayMediaRequestHandler','setWindowOpenHandler','flushStorageData'])assert(js.includes(text),text);
 for(const text of ['webSecurity: false','--no-sandbox','ignore-certificate-errors','setCertificateVerifyProc','nodeIntegration: true'])assert(!js.includes(text),text);
 assert(js.includes("'will-frame-navigate', event =>"));
});
test('native printers are not masqueraded as available on Windows',()=>{
 const preload=fs.readFileSync(path.join(root,'desktop/preload.cjs'),'utf8');assert(!preload.includes('RetroPrinterNative'));assert(fs.readFileSync(path.join(root,'src/printer-flow.js'),'utf8').includes('Windows desktop / no native Bluetooth bridge'));
});
test('version, Android identity, installer and portability configuration align',()=>{
 const pkg=require('../package.json'),desktop=require('../desktop/package.json'),builder=require('../desktop/electron-builder.cjs'),gradle=fs.readFileSync(path.join(root,'android/app/build.gradle'),'utf8');
 assert.equal(pkg.version,desktop.version);assert(gradle.includes("versionName '"+pkg.version+"'"));assert(gradle.includes('versionCode 9'));assert(gradle.includes("applicationId 'studio.luce.retrobooth.preview'"));
 assert.equal(builder.asar,true);assert.equal(builder.nsis.deleteAppDataOnUninstall,false);assert.notEqual(builder.nsis.artifactName,builder.portable.artifactName);assert.equal(builder.win.requestedExecutionLevel,'asInvoker');
});
