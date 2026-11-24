/* Staff-only look controls. Draft previews never mutate saved session settings. */
let effectDraft=null,effectPreviewTimer=null;
function syncEffects(){
 effectDraft=RetroEffects.safe(settings);$('lookMode').value=effectDraft.lookMode;fillEffectControls();renderer.effectsOverride=null;
 $('effectsSaveStatus').textContent='Saved settings loaded. Preview changes are drafts until saved.';
}
function activeDraft(){return RetroEffects.resolve({...settings,...effectDraft});}
function fillEffectControls(){
 const p=activeDraft();$('lookProfileName').textContent=p.name;
 for(const name of ['grain','scan','saturation','warmth','softness']){
  $('fx_'+name).value=Math.round(p[name]*100);$('fx_'+name+'Value').textContent=Math.round(p[name]*100)+'%';
  $('fx_'+name).disabled=p.key==='bw'&&['warmth','saturation'].includes(name);
 }
}
function previewEffectDraft(){
 if(state!=='idle')return;renderer.effectsOverride=RetroEffects.safe(effectDraft);
 $('effectsSaveStatus').textContent='Unsaved look preview. Recording uses saved settings only.';
}
async function saveEffects(){
 const next=C.safeSettings({...settings,...effectDraft});
 await commitSettings(next);syncEffects();$('effectsSaveStatus').textContent=store.available?'Look saved in this browser.':'Memory-only look: storage unavailable.';
 log('camera_look_saved',{mode:settings.lookMode,active:RetroEffects.resolve(settings).key});
}
function refreshCameraLab(){
 if(currentView!=='admin')return;
 const target=$('effectsPreview'),source=$('compareRaw').checked?renderer.raw:renderer.canvas;
 if(target.width!==640||target.height!==Math.round(640*source.height/source.width)){target.width=640;target.height=Math.round(640*source.height/source.width);}
 target.getContext('2d').drawImage(source,0,0,target.width,target.height);
 $('cameraLabState').textContent=(mode==='real'?'LIVE CAMERA + MIC':'DEMO ARTWORK / CAMERA OFF')+' / '+($('compareRaw').checked?'RAW COMPARISON ONLY':activeDraft().name);
 $('cameraLabStats').textContent=renderer.mode+' / render '+renderer.fps.toFixed(1)+' fps (not camera or encoded fps) / '+renderer.w+' x '+renderer.h;
 $('cameraLabEnable').disabled=cameraBusy||state!=='idle';$('cameraLabStop').disabled=cameraBusy||mode!=='real'||state!=='idle';
 let rms=0;if(analyser){const d=new Uint8Array(analyser.fftSize);analyser.getByteTimeDomainData(d);for(const n of d)rms+=(n-128)*(n-128);rms=Math.sqrt(rms/d.length)/128;}
 $('micMeter').value=Math.min(1,rms*4);$('micMeterLabel').textContent=mode==='real'?(rms>.006?'Audio input detected':'Quiet input / speak or check the selected microphone'):'Microphone is off';
}
function setupCameraLab(){
 $('lookMode').onchange=()=>{effectDraft.lookMode=$('lookMode').value;fillEffectControls();previewEffectDraft();};
 for(const name of ['grain','scan','saturation','warmth','softness'])$('fx_'+name).oninput=()=>{
  const p=activeDraft();effectDraft.lookProfiles[p.key][name]=Number($('fx_'+name).value)/100;
  $('fx_'+name+'Value').textContent=$('fx_'+name).value+'%';previewEffectDraft();
 };
 $('resetLook').onclick=()=>{effectDraft.lookProfiles[activeDraft().key]={...RetroEffects.defaults[activeDraft().key]};fillEffectControls();previewEffectDraft();};
 $('effectsForm').onsubmit=async e=>{e.preventDefault();try{await saveEffects();}catch(error){$('effectsSaveStatus').textContent='Not saved: '+error.message;toast(error.message);}};
 $('effectsReturn').onclick=async()=>{try{await saveEffects();go('booth');}catch(error){$('effectsSaveStatus').textContent='Not saved: '+error.message;toast(error.message);}};
 $('cameraLabEnable').onclick=()=>enableCamera(true);$('cameraLabStop').onclick=()=>{if(state==='idle'){disableCamera();mediaStatus('Camera and microphone stopped.');}};
 $('discardLook').onclick=()=>{syncEffects();go('booth');};
 effectPreviewTimer=setInterval(refreshCameraLab,150);syncEffects();
}
