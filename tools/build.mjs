/** Deterministic offline bundler. Node built-ins only; no npm install needed. */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import crypto from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8'),out=path.join(root,'dist');fs.mkdirSync(out,{recursive:true});
const mods=fs.readdirSync(path.join(root,'vendor/QRCode')).filter(x=>x.endsWith('.js')).sort().map(f=>JSON.stringify(path.basename(f,'.js'))+':function(module,exports,require){\n'+read('vendor/QRCode/'+f)+'\n}');
const qr='/* QRCode: Kazuhiko Arase / qrcode-terminal adaptation. See THIRD_PARTY_NOTICES. */\n(function(){const modules={'+mods.join(',\n')+'};const cache={};function req(id){id=id.replace("./","");if(cache[id])return cache[id].exports;const m={exports:{}};cache[id]=m;modules[id](m,m.exports,req);return m.exports;}window.RetroQR=req("index");})();';
let html=read('src/template.html');const replace=(token,value)=>{if(!html.includes(token))throw new Error('Missing marker '+token);html=html.replace(token,()=>value);};
for(const [tag,f] of [['NEW_VIEWS','experience-views.html'],['DELETE_DIALOG','delete-dialog.html'],['CSS','styles.css'],['LANDSCAPE_CSS','landscape.css'],['APPEARANCE_CSS','appearance.css'],['DELIVERY_CSS','delivery.css'],['DELIVERY_VIEW','delivery-view.html'],['DELIVERY_ADMIN','delivery-admin.html'],['CLOUD_ADMIN','cloud-admin.html'],['CLOUD_CSS','cloud.css'],['PRINTER_ADMIN','printer-admin.html'],['PRINTER_CSS','printer.css']])replace('/*__'+tag+'__*/',read('src/'+f));
replace('/*__VENDOR__*/',qr);
for(const name of ['effects','delivery-policy','cloud-client','printer-client','core','store','renderer','receipt','app']){
 let code=read('src/'+name+'.js');if(name==='app')for(const [tag,f] of [['EXPERIENCE','experience'],['LANDSCAPE_JS','landscape'],['APPEARANCE_JS','appearance'],['CAMERA_LAB_JS','camera-lab'],['NATIVE_EXPORT_JS','native-export'],['DELIVERY_FLOW_JS','delivery-flow'],['CLOUD_FLOW_JS','cloud-flow'],['PRINTER_FLOW_JS','printer-flow']])code=code.replace('/*__'+tag+'__*/',()=>read('src/'+f+'.js'));
 replace('/*__'+name.toUpperCase()+'__*/',code);
}
const notice=['NOTICE.txt','MIT.txt','APACHE-2.0.txt'].map(x=>read('vendor/'+x)).join('\n\n');
html=html.replace('</body>',()=>'<!-- THIRD-PARTY NOTICES\n'+notice.replaceAll('--','- -')+'\n-->\n</body>');if(html.includes('/*__'))throw new Error('Unfilled build marker');
fs.writeFileSync(path.join(out,'RetroBooth_Prototype.html'),html);
fs.writeFileSync(path.join(out,'index.html'),html.replace('<html lang="zh-HK">','<html lang="zh-HK" data-service-worker="true">'));
for(const f of ['sw.js','.htaccess'])fs.writeFileSync(path.join(out,f),read('src/'+f));
fs.writeFileSync(path.join(out,'THIRD_PARTY_NOTICES.txt'),notice);
const info={version:read('VERSION.txt').split('\n')[0],stage:'prototype - not event ready',commit:process.env.GITHUB_SHA||'local-uncommitted',run:process.env.GITHUB_RUN_ID||'local',standaloneSHA256:crypto.createHash('sha256').update(html).digest('hex'),cloud:'opt-in PHP private-delivery alpha',printer:'independent Android secure-SPP QR-only alpha; physical validation pending',android:'WebView test shell, native recording not implemented'};
fs.writeFileSync(path.join(out,'BUILD_INFO.json'),JSON.stringify(info,null,2)+'\n');
const assets=path.join(root,'android/app/src/main/assets/www');fs.mkdirSync(assets,{recursive:true});
fs.writeFileSync(path.join(assets,'index.html'),html); // no service worker in packaged shell
fs.writeFileSync(path.join(assets,'BUILD_INFO.json'),JSON.stringify(info,null,2)+'\n');
console.log('Built',Buffer.byteLength(html),'bytes',info.standaloneSHA256);

const booth=path.join(root,'cloud/public_html/booth');fs.mkdirSync(booth,{recursive:true});fs.writeFileSync(path.join(booth,'index.html'),html);
