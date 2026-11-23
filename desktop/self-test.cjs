'use strict';
// Executed ONLY by CI in a new disposable profile. No real camera or guest media.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function run({ app, win, ses, profile, smokeDownloads }) {
  const out = path.resolve(process.env.RETROBOOTH_SMOKE_OUTPUT || path.join(profile, 'evidence'));
  fs.mkdirSync(out, { recursive: true });
  const results = [];
  const read = js => win.webContents.executeJavaScript(js, true);
  async function wait(js, ms = 15000) { const end = Date.now() + ms; do { try { if (await read(js)) return; } catch {} await delay(100); } while (Date.now() < end); throw new Error('Timed out: ' + js); }
  function check(name, value) { assert(value, name); results.push(name); console.log('PASS DESKTOP', name); }
  try {
    await wait('window.RetroApp?.status.ready');
    check('custom origin is a secure context', await read('isSecureContext && location.origin === "retrobooth://app"'));
    check('Node is not exposed', await read('typeof require === "undefined" && typeof process === "undefined" && typeof Buffer === "undefined"'));
    check('desktop bridge exists, Android printer bridge does not', await read('!!RetroDesktop && !window.RetroPrinterNative'));
    check('real IndexedDB opened', await read('RetroApp.status.storageAvailable'));
    check('packaged build info loads', await read('fetch("/BUILD_INFO.json").then(r=>r.json()).then(x=>x.version.startsWith("0.9."))'));
    check('unlisted paths denied', await read('fetch("/package.json").then(r=>!r.ok).catch(()=>true)'));
    check('unapproved remote URL denied', await read('fetch("https://example.invalid/api/health").then(()=>false).catch(()=>true)'));
    check('strict CSP blocks unhashed inline script', await read('(()=>{let s=document.createElement("script");s.textContent="window.__injectedUnsafe=true";document.body.append(s);s.remove();return !window.__injectedUnsafe})()'));
    check('remote frames blocked by CSP', await read('new Promise(resolve=>{let f=document.createElement("iframe");let done=e=>{if(e.effectiveDirective==="frame-src"){document.removeEventListener("securitypolicyviolation",done);f.remove();resolve(true)}};document.addEventListener("securitypolicyviolation",done);f.src="https://example.invalid";document.body.append(f);setTimeout(()=>{document.removeEventListener("securitypolicyviolation",done);f.remove();resolve(false)},1000)})'));
    await read('RetroApp.go("admin")');
    check('desktop Admin panel displayed', await read('!document.getElementById("desktopCard").hidden'));
    check('Windows printing is not falsely enabled', await read('printerConnect.disabled && printerStatus.textContent.includes("Windows desktop")'));
    await read('RetroApp.applyScreenStyle("edge")');
    check('Edge style selected', await read('RetroApp.status.settings.screenStyle === "edge"'));
    await win.loadURL('retrobooth://app/index.html?setup=1'); await wait('window.RetroApp?.status.ready');
    check('style survives real origin reload', await read('RetroApp.status.settings.screenStyle === "edge"'));
    await read('RetroApp.applyScreenStyle("heritage")');
    check('Heritage style works', await read('RetroApp.status.settings.screenStyle === "heritage"'));
    await read('RetroApp.enableCamera()'); await wait('RetroApp.status.mode === "real"');
    check('synthetic camera and mic accepted by native host', await read('RetroApp.status.mode === "real"'));
    await read('RetroApp.go("booth"); document.getElementById("touchBtn").click()');
    await wait('RetroApp.status.state === "recording"');
    check('fixed recording starts', true);
    await wait('RetroApp.status.clipCount === 1', 45000);
    await wait('RetroApp.status.state === "idle"', 20000);
    check('one synthetic recording committed', await read('RetroApp.clips[0].kind === "real" && RetroApp.clips[0].sizeBytes > 0'));
    await read('RetroApp.disableCamera()');
    await win.loadURL('retrobooth://app/index.html?setup=1'); await wait('window.RetroApp?.status.ready');
    check('recording metadata survives reload', await read('RetroApp.status.clipCount === 1 && RetroApp.clips[0].kind === "real"'));
    check('full-screen can be entered and exited', await read('RetroDesktop.fullscreen().then(()=>RetroDesktop.fullscreen()).then(()=>true)'));
    await read('(()=>{let b=new Blob(["RetroBooth CI export\\n"],{type:"text/plain"});let u=URL.createObjectURL(b);let a=document.createElement("a");a.href=u;a.download="RetroBooth-smoke.txt";document.body.append(a);a.click();a.remove();})()');
    const deadline = Date.now()+10000;while(!smokeDownloads.length && Date.now()<deadline) await delay(100);
    check('blob export completed through native download handler', smokeDownloads.length===1 && smokeDownloads[0].state==='completed');
    check('exported bytes match', fs.readFileSync(smokeDownloads[0].path,'utf8')==='RetroBooth CI export\n');
    await read('RetroApp.go("admin")');
    const image=await win.webContents.capturePage();fs.writeFileSync(path.join(out,'desktop-admin.png'),image.toPNG());
    ses.flushStorageData();
    fs.writeFileSync(path.join(out,'smoke.json'),JSON.stringify({passed:results.length,results,appVersion:app.getVersion(),arch:process.arch,packaged:app.isPackaged,source:'Electron runtime + real isolated IndexedDB + synthetic getUserMedia; no physical device acceptance'},null,2)+'\n');
    console.log('DESKTOP_SMOKE_OK',results.length);
  } catch(error) {
    fs.writeFileSync(path.join(out,'smoke.json'),JSON.stringify({passed:results.length,results,error:error.message,packaged:app.isPackaged},null,2)+'\n');throw error;
  }
}
module.exports={run};
