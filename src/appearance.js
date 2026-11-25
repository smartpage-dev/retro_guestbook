/* Appearance is a saved operator preference, not a capture or privacy mode. */
function styleName(style){return style==='edge'?'Modern CRT television':'Heritage television';}
function applyScreenAppearance(){
  const previous=document.body.dataset.screenStyle;
  document.body.dataset.screenStyle=settings.screenStyle;
  $('currentStyleBadge').textContent='CURRENT / '+styleName(settings.screenStyle).toUpperCase();
  if(previous!==settings.screenStyle){
    renderer.settings=settings;
    // Only idle can resize the encoder; in-flight sessions keep frozen dimensions.
    if(state==='idle')requestAnimationFrame(fitPicture);
  }
}
function syncAppearanceForm(){
  $('styleEdge').checked=settings.screenStyle==='edge';
  $('styleHeritage').checked=settings.screenStyle==='heritage';
  $('styleSaveStatus').textContent='Selected: '+styleName(settings.screenStyle)+'. Apply to return to the booth.';
  updateStyleSelection();
}
function updateStyleSelection(){
  document.querySelectorAll('.style-option').forEach(e=>e.classList.toggle('selected',e.querySelector('input').checked));
}
async function commitSettings(next){
  if(state!=='idle')throw new Error('Screen/settings changes are blocked during a session.');
  if(settingsSaving||cameraBusy)throw new Error('Wait for camera setup or the current settings save.');
  settingsSaving=true;refreshGeneration++;
  const buttons=[$('screenStyleSave'),$('settingsForm').querySelector('button[type=submit]')];
  buttons.forEach(b=>b.disabled=true);renderState();
  try{
    if(store.available)await store.setSettings(next);
    refreshGeneration++;settings=next;renderer.settings=settings;renderState();announceChange(null);
  }finally{settingsSaving=false;buttons.forEach(b=>b.disabled=false);renderState();}
}
async function applyScreenStyle(style){
  if(!['edge','heritage'].includes(style))throw new Error('Unknown screen style.');
  // Merge from the saved settings, never reset duration/receipt/privacy as a side effect.
  await commitSettings(C.safeSettings({...settings,screenStyle:style}));
  syncAppearanceForm();
  $('styleSaveStatus').textContent=store.available?'Screen style saved in this browser.':'Memory-only preview: this choice will reset when closed.';
  log('screen_style_changed',{style,persistent:store.available});
  return settings.screenStyle;
}
function setupAppearance(){
  document.querySelectorAll('input[name=screenStyle]').forEach(e=>e.addEventListener('change',()=>{
    updateStyleSelection();$('styleSaveStatus').textContent='Selected: '+styleName(e.value)+'. Not applied yet.';
  }));
  $('screenStyleForm').onsubmit=async e=>{
    e.preventDefault();const selected=document.querySelector('input[name=screenStyle]:checked');
    if(!selected)return;
    try{await applyScreenStyle(selected.value);go('booth');toast(store.available?'Screen style saved.':'Style applied for this preview. Browser storage unavailable; not saved after closing.');}
    catch(error){$('styleSaveStatus').textContent=error.message;toast(error.message);}
  };
  applyScreenAppearance();syncAppearanceForm();
}
