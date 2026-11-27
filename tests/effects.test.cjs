'use strict';
const assert=require('node:assert/strict'),E=require('../src/effects.js'),C=require('../src/core.js');let count=0;
function test(name,fn){fn();console.log('PASS '+name);count++;}
test('look follows shell by default',()=>assert.equal(E.safe().lookMode,'follow'));
test('edge resolves to film',()=>assert.equal(E.resolve(C.safeSettings({screenStyle:'edge'})).key,'film'));
test('heritage resolves to soft mono',()=>assert.equal(E.resolve(C.safeSettings()).key,'heritage'));
for(const [style,expected] of Object.entries({space:'sepia',studio:'cinema',bubble:'vhs'}))test(style+' resolves to distinct CRT effect',()=>assert.equal(E.resolve(C.safeSettings({screenStyle:style})).key,expected));
for(const effect of ['vhs','sepia','cinema','night'])test(effect+' can be selected',()=>assert.equal(E.resolve(C.safeSettings({lookMode:effect})).key,effect));
test('manual film overrides heritage shell',()=>assert.equal(E.resolve(C.safeSettings({lookMode:'film'})).key,'film'));
test('manual mono overrides edge shell',()=>assert.equal(E.resolve(C.safeSettings({screenStyle:'edge',lookMode:'heritage'})).key,'heritage'));
test('invalid look mode falls back safely',()=>assert.equal(E.safe({lookMode:'bad'}).lookMode,'follow'));
test('null settings accepted safely',()=>assert.equal(C.safeSettings(null).lookMode,'follow'));
for(const key of Object.keys(E.defaults)){
 test(key+' default grain within controlled effect range',()=>assert(E.defaults[key].grain>0&&E.defaults[key].grain<=.08));
 test(key+' independent profile object',()=>{let a=E.safe(),b=E.safe();a.lookProfiles[key].grain=.12;assert.notEqual(a.lookProfiles[key].grain,b.lookProfiles[key].grain);});
 test(key+' nonfinite input falls back',()=>assert.equal(E.safe({lookProfiles:{[key]:{grain:Infinity}}}).lookProfiles[key].grain,E.defaults[key].grain));
 test(key+' zero value is preserved',()=>assert.equal(E.safe({lookProfiles:{[key]:{grain:0,scan:0}}}).lookProfiles[key].grain,0));
 test(key+' values are bounded',()=>{const p=E.safe({lookProfiles:{[key]:{grain:12,saturation:-9,scan:2}}}).lookProfiles[key];assert.equal(p.grain,.12);assert.equal(p.scan,.3);assert.equal(p.saturation,0);});
}
const f=E.resolve({screenStyle:'edge'}),h=E.resolve({screenStyle:'heritage'}),bw=E.resolve({lookMode:'bw',lookProfiles:{bw:{saturation:1,warmth:1}}});
const chroma=rgb=>Math.max(...rgb)-Math.min(...rgb);
test('film retains substantially more scene colour',()=>assert(chroma(E.transform(220,40,40,f))>chroma(E.transform(220,40,40,h))*3));
test('soft mono is warm grey, not saturated green',()=>{const p=E.transform(160,160,160,h);assert(p[0]>=p[1]);assert(p[1]>p[2]);assert(chroma(p)<25);});
test('neutral BW ignores stored warmth/saturation',()=>assert.equal(bw.warmth+bw.saturation,0));
test('neutral BW channels match',()=>{const p=E.transform(220,40,180,bw);assert(Math.abs(p[0]-p[1])<1e-8&&Math.abs(p[1]-p[2])<1e-8);});
test('black details are lifted but not crushed',()=>{const p=E.transform(0,0,0,f);assert(Math.min(...p)>0&&Math.max(...p)<20);});
test('white retains highlight detail',()=>assert(Math.max(...E.transform(255,255,255,f))<255));
test('no hard four-level posterization by default',()=>assert(new Set(Array.from({length:256},(_,n)=>Math.round(E.transform(n,n,n,h)[0]))).size>200));
test('profile edits survive safeSettings and style changes',()=>{const a=C.safeSettings();a.lookProfiles.film.scan=.2;const b=C.safeSettings({...a,screenStyle:'edge'});assert.equal(b.lookProfiles.film.scan,.2);assert.equal(b.lookProfiles.heritage.scan,.12);});
test('copying session settings detaches nested profiles',()=>{const a=C.safeSettings(),b=C.safeSettings(a);a.lookProfiles.film.scan=.3;assert.notEqual(a.lookProfiles.film.scan,b.lookProfiles.film.scan);});
test('effect selection does not change flow or privacy',()=>{const a=C.safeSettings({duration:60,receiptStyle:'ticket',lookMode:'bw'});assert.equal(a.duration,60);assert.equal(a.receiptStyle,'ticket');assert.equal(a.showEnabled,false);});
console.log('TOTAL '+count+' PASSED');
