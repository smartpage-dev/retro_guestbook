import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import assert from 'node:assert/strict';
const root=process.cwd();let count=0;const check=(n,v)=>{assert(v,n);console.log('PASS',n);count++;};
const html=fs.readFileSync(path.join(root,'dist/RetroBooth_Prototype.html'),'utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];for(const [i,m] of scripts.entries()){new vm.Script(m[1],{filename:'inline-'+i});count++;}
check('source markers fully expanded',!html.includes('/*__'));
check('no external script/font runtime dependencies',!/<script[^>]+src=|fonts\.googleapis|fonts\.gstatic/.test(html));
check('runtime camera look controls present',html.includes('id="effectsForm"')&&html.includes('id="cameraLabEnable"'));
check('local-only QR marker remains explicit',html.includes('LOCAL-PROTOTYPE:NO-ONLINE-VIDEO'));
check('two shells retained',html.includes('id="styleEdge"')&&html.includes('id="styleHeritage"'));
check('v05 storage preserved; v04 remains separate',html.includes('luce-retrobooth-prototype-v05')&&!html.includes('luce-retrobooth-prototype-v04'));
check('native and standalone app bytes match',fs.readFileSync('android/app/src/main/assets/www/index.html','utf8')===html);
const java=fs.readFileSync('android/app/src/main/java/studio/luce/retrobooth/MainActivity.java','utf8');
check('native media permission has trusted-origin check',java.includes('trusted(request.getOrigin())'));
check('native message channel main-frame origin restricted',java.includes('!isMainFrame||!trusted(sourceOrigin)'));
check('native exports check order size and checksum',java.includes('job.sequence')&&java.includes('job.written!=job.expected')&&java.includes('Export checksum mismatch'));
check('native files are not served as file URLs',java.includes('setAllowFileAccess(false)')&&java.includes('WebViewAssetLoader'));
check('timed QR module present',html.includes('id="deliveryOverlay"')&&html.includes('id="qrDisplaySeconds"'));
check('native QR bridge is top-frame origin restricted',java.includes('RetroPrinterNative')&&java.includes('!isMainFrame||!trusted(sourceOrigin)'));
check('independent secure SPP adapter present',fs.readFileSync('android/app/src/main/java/studio/luce/retrobooth/NativePrinter.java','utf8').includes('createRfcommSocketToServiceRecord(SPP)'));
check('cloud bundle includes frozen-link adapter',html.includes('id="cloudCard"')&&html.includes('class CloudRequestError'));
check('private cloud files are separate from public root',fs.existsSync('cloud/retrobooth_private/app/Cloud.php')&&!fs.existsSync('cloud/public_html/config.php'));
check('native approved cloud host is explicit',java.includes('allowedCloudApi')&&java.includes('Allow this server')&&java.includes('getPreferences(MODE_PRIVATE)'));
for(const name of ['guest','admin']){new vm.Script(fs.readFileSync('cloud/public_html/assets/'+name+'.js','utf8'));count++;}
console.log('TOTAL '+count+' PASSED (syntax/static contracts only; not Java compilation)');
