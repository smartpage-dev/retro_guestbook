/* Narrow desktop host integration; absent in browser and Android builds. */
function setupDesktop(){
 const host=window.RetroDesktop;if(!host||!$('desktopCard'))return;
 $('desktopCard').hidden=false;
 host.info().then(info=>{$('desktopInfo').textContent='Windows '+info.arch+' / app '+info.version+' / local origin '+info.origin+' / '+(info.cloudOrigin||'cloud not approved');}).catch(()=>{$('desktopInfo').textContent='Desktop host information unavailable.';});
 const operation=async task=>{if(state!=='idle'||settingsSaving||cameraBusy){toast('Finish the current session first.');return;}try{await task();}catch(e){toast(e.message);}};
 $('desktopFullscreen').onclick=()=>operation(()=>host.fullscreen());
 $('desktopStorage').onclick=()=>operation(()=>host.storageLocation());
 host.onSuspend?.(()=>window.dispatchEvent(new Event('retro-native-pause')));
 host.onExport?.(result=>toast(result.state==='completed'?'Export saved. Verify the independent copy before deleting local recordings.':result.state==='cancelled'?'Export cancelled. Local recording retained.':'Export interrupted. Local recording retained; retry deliberately.'));
}
