// ════════════════════════════════════════════════════════════
//  CUSTOM PANEL — live preview, no Apply needed
// ════════════════════════════════════════════════════════════
let customTargetBrick=null, customPrevStyle=null;
let panelTx='Front', panelMethod='Concentric';
function syncParamControlsFromParams(p){
  const stroke=document.getElementById('ctl-stroke');
  const gap=document.getElementById('ctl-gap');
  const angle=document.getElementById('ctl-angle');
  const color=document.getElementById('ctl-color');
  const sv=document.getElementById('ctl-stroke-v');
  const gv=document.getElementById('ctl-gap-v');
  const av=document.getElementById('ctl-angle-v');
  if(!stroke||!gap||!angle||!color||!sv||!gv||!av) return;
  const sw=(p&&p.strokeWidth)?p.strokeWidth:1.5;
  const lg=(p&&p.lineGap)?p.lineGap:5;
  const ang=((p&&p.lineAngle)?p.lineAngle:-Math.PI/4)*180/Math.PI;
  const ink=(p&&p.ink)?p.ink:'#141414';
  stroke.value=String(sw); gap.value=String(lg); angle.value=String(Math.round(ang)); color.value=ink;
  sv.textContent=Number(sw).toFixed(1);
  gv.textContent=Number(lg).toFixed(1);
  av.textContent=Math.round(ang)+'°';
  const setVal=(id,v)=>{const el=document.getElementById(id);if(el)el.value=String(v);};
  const setTxt=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
  setVal('ctl-melt',p&&p.melt!=null?p.melt:.5); setTxt('ctl-melt-v',Number(p&&p.melt!=null?p.melt:.5).toFixed(2));
  setVal('ctl-drift',p&&p.drift!=null?p.drift:1); setTxt('ctl-drift-v',Number(p&&p.drift!=null?p.drift:1).toFixed(2));
  setVal('ctl-stretchx',p&&p.stretchX!=null?p.stretchX:1); setTxt('ctl-stretchx-v',Number(p&&p.stretchX!=null?p.stretchX:1).toFixed(2));
  setVal('ctl-stretchy',p&&p.stretchY!=null?p.stretchY:1); setTxt('ctl-stretchy-v',Number(p&&p.stretchY!=null?p.stretchY:1).toFixed(2));
  setVal('ctl-dotsize',p&&p.dotSize!=null?p.dotSize:2); setTxt('ctl-dotsize-v',Number(p&&p.dotSize!=null?p.dotSize:2).toFixed(1));
  setVal('ctl-dotgap',p&&p.dotGap!=null?p.dotGap:5); setTxt('ctl-dotgap-v',Number(p&&p.dotGap!=null?p.dotGap:5).toFixed(1));
  setVal('ctl-density',p&&p.stippleDensity!=null?p.stippleDensity:.12); setTxt('ctl-density-v',Number(p&&p.stippleDensity!=null?p.stippleDensity:.12).toFixed(2));
  setVal('ctl-pixelsize',p&&p.pixelSize!=null?p.pixelSize:4); setTxt('ctl-pixelsize-v',Number(p&&p.pixelSize!=null?p.pixelSize:4).toFixed(1));
  setVal('ctl-rays',p&&p.radialRays!=null?p.radialRays:36); setTxt('ctl-rays-v',String(Math.round(p&&p.radialRays!=null?p.radialRays:36)));
  setVal('ctl-waveamp',p&&p.waveAmp!=null?p.waveAmp:3); setTxt('ctl-waveamp-v',Number(p&&p.waveAmp!=null?p.waveAmp:3).toFixed(1));
  setVal('ctl-wavefreq',p&&p.waveFreq!=null?p.waveFreq:.08); setTxt('ctl-wavefreq-v',Number(p&&p.waveFreq!=null?p.waveFreq:.08).toFixed(3));
  setVal('ctl-noisescale',p&&p.noiseScale!=null?p.noiseScale:.04); setTxt('ctl-noisescale-v',Number(p&&p.noiseScale!=null?p.noiseScale:.04).toFixed(3));
}
function applyParamControlsToParams(p){
  const stroke=document.getElementById('ctl-stroke');
  const gap=document.getElementById('ctl-gap');
  const angle=document.getElementById('ctl-angle');
  const color=document.getElementById('ctl-color');
  if(!stroke||!gap||!angle||!color) return p;
  p.strokeWidth=parseFloat(stroke.value);
  p.lineGap=parseFloat(gap.value);
  p.lineAngle=parseFloat(angle.value)*Math.PI/180;
  p.ink=color.value||'#141414';
  const sv=document.getElementById('ctl-stroke-v');
  const gv=document.getElementById('ctl-gap-v');
  const av=document.getElementById('ctl-angle-v');
  if(sv) sv.textContent=Number(p.strokeWidth).toFixed(1);
  if(gv) gv.textContent=Number(p.lineGap).toFixed(1);
  if(av) av.textContent=Math.round(parseFloat(angle.value))+'°';
  const num=(id,def)=>{const el=document.getElementById(id);return el?parseFloat(el.value):def;};
  p.melt=num('ctl-melt',p.melt||.5);
  p.drift=num('ctl-drift',p.drift||1);
  p.stretchX=num('ctl-stretchx',p.stretchX||1);
  p.stretchY=num('ctl-stretchy',p.stretchY||1);
  p.dotSize=num('ctl-dotsize',p.dotSize||2);
  p.dotGap=num('ctl-dotgap',p.dotGap||5);
  p.stippleDensity=num('ctl-density',p.stippleDensity||.12);
  p.pixelSize=num('ctl-pixelsize',p.pixelSize||4);
  p.radialRays=Math.round(num('ctl-rays',p.radialRays||36));
  p.waveAmp=num('ctl-waveamp',p.waveAmp||3);
  p.waveFreq=num('ctl-wavefreq',p.waveFreq||.08);
  p.noiseScale=num('ctl-noisescale',p.noiseScale||.04);
  const setTxt=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
  setTxt('ctl-melt-v',Number(p.melt).toFixed(2));
  setTxt('ctl-drift-v',Number(p.drift).toFixed(2));
  setTxt('ctl-stretchx-v',Number(p.stretchX).toFixed(2));
  setTxt('ctl-stretchy-v',Number(p.stretchY).toFixed(2));
  setTxt('ctl-dotsize-v',Number(p.dotSize).toFixed(1));
  setTxt('ctl-dotgap-v',Number(p.dotGap).toFixed(1));
  setTxt('ctl-density-v',Number(p.stippleDensity).toFixed(2));
  setTxt('ctl-pixelsize-v',Number(p.pixelSize).toFixed(1));
  setTxt('ctl-rays-v',String(Math.round(p.radialRays)));
  setTxt('ctl-waveamp-v',Number(p.waveAmp).toFixed(1));
  setTxt('ctl-wavefreq-v',Number(p.waveFreq).toFixed(3));
  setTxt('ctl-noisescale-v',Number(p.noiseScale).toFixed(3));
  return p;
}
function refreshParamControlVisibility(){
  const show=id=>{const el=document.getElementById(id);if(el)el.style.display='grid';};
  const hide=id=>{const el=document.getElementById(id);if(el)el.style.display='none';};
  ['row-stroke','row-gap','row-angle','row-melt','row-drift','row-stretchx','row-stretchy','row-dotsize','row-dotgap','row-density','row-pixelsize','row-rays','row-waveamp','row-wavefreq','row-noisescale'].forEach(hide);
  // Base controls only when method actually uses them.
  if(['Concentric','H-Lines','Diagonal','Cross-Hatch','Wave'].includes(panelMethod)) show('row-stroke');
  if(['Concentric','H-Lines','Diagonal','Cross-Hatch','Wave'].includes(panelMethod)) show('row-gap');
  if(['Diagonal','Cross-Hatch'].includes(panelMethod)) show('row-angle');
  if(panelTx==='Melt') show('row-melt');
  if(panelTx==='Explode') show('row-drift');
  if(panelTx==='Stretch'){show('row-stretchx');show('row-stretchy');}
  if(panelMethod==='Dots'){show('row-dotsize');show('row-dotgap');}
  if(panelMethod==='Stipple'){show('row-dotsize');show('row-density');}
  if(panelMethod==='Pixel Grid') show('row-pixelsize');
  if(panelMethod==='Radial') show('row-rays');
  if(panelMethod==='Wave'){show('row-waveamp');show('row-wavefreq');}
  if(panelMethod==='Noise') show('row-noisescale');
}
function bindParamControls(){
  const ids=['ctl-stroke','ctl-gap','ctl-angle','ctl-color','ctl-melt','ctl-drift','ctl-stretchx','ctl-stretchy','ctl-dotsize','ctl-dotgap','ctl-density','ctl-pixelsize','ctl-rays','ctl-waveamp','ctl-wavefreq','ctl-noisescale'];
  ids.forEach(id=>{
    const el=document.getElementById(id);
    if(!el) return;
    el.addEventListener('input',()=>livePreview());
  });
}

function buildPanelPills(){
  const txC=document.getElementById('tx-pills'); txC.innerHTML='';
  for(const o of TRANSFORM_OPTIONS){
    const p=document.createElement('button'); p.type='button'; p.className='pill';
    p.textContent=o.label; p.title=o.title; p.dataset.txId=o.id;
    p.addEventListener('click',()=>{
      panelTx=o.id;
      txC.querySelectorAll('.pill').forEach(q=>q.classList.toggle('selected',q.dataset.txId===o.id));
      refreshParamControlVisibility();
      livePreview();
    });
    txC.appendChild(p);
  }
  const mC=document.getElementById('method-pills'); mC.innerHTML='';
  for(const o of METHOD_OPTIONS){
    const p=document.createElement('button'); p.type='button'; p.className='pill';
    p.textContent=o.label; p.title=o.title; p.dataset.mthId=o.id;
    p.addEventListener('click',()=>{
      panelMethod=o.id;
      mC.querySelectorAll('.pill').forEach(q=>q.classList.toggle('selected',q.dataset.mthId===o.id));
      refreshParamControlVisibility();
      livePreview();
    });
    mC.appendChild(p);
  }
}

function livePreview(){
  if(!customTargetBrick) return;
  // Keep same params so preview is stable while clicking around
  if(!customTargetBrick.customStyle || customTargetBrick.customStyle._previewParams===undefined){
    if(!customTargetBrick._previewParams) customTargetBrick._previewParams=makeParams();
  }
  const params=applyParamControlsToParams(customTargetBrick._previewParams||makeParams());
  customTargetBrick.customStyle={transform:panelTx,method:panelMethod,params:{...params}};
  customTargetBrick._previewParams=params;
  renderFrame();
}

function openCustomPanel(brick,sx,sy){
  // Save previous style for Reset
  customPrevStyle=brick.customStyle?{...brick.customStyle,params:{...brick.customStyle.params}}:null;
  customTargetBrick=brick;
  // Seed preview params
  brick._previewParams=brick.customStyle?{...brick.customStyle.params}:makeParams();

  panelTx    =brick.customStyle?brick.customStyle.transform:'Front';
  if(!ALL_TX.includes(panelTx)) panelTx='Front';
  panelMethod=brick.customStyle?brick.customStyle.method:'Concentric';
  syncParamControlsFromParams(brick._previewParams);
  refreshParamControlVisibility();

  document.querySelectorAll('#tx-pills .pill').forEach(p=>p.classList.toggle('selected',p.dataset.txId===panelTx));
  document.querySelectorAll('#method-pills .pill').forEach(p=>p.classList.toggle('selected',p.dataset.mthId===panelMethod));

  const panel=document.getElementById('custom-panel');
  const pw=288, ph=380;
  let px=sx+14, py=sy-ph/2;
  if(px+pw>canvas.width) px=sx-pw-14;
  if(py<8) py=8;
  if(py+ph>canvas.height) py=canvas.height-ph-8;
  panel.style.left=px+'px'; panel.style.top=py+'px';
  panel.classList.add('visible');
  // Immediately show preview of current state
  livePreview();
}

function closeCustomPanel(confirm){
  if(!confirm && customTargetBrick){
    // ESC or close-x: revert to previous style
    customTargetBrick.customStyle=customPrevStyle;
    customTargetBrick._previewParams=undefined;
    renderFrame();
  } else if(customTargetBrick){
    // Confirmed (click outside or Done): commit
    undoStack.push(snapshot());
    customTargetBrick._previewParams=undefined;
    updateUndoButton();
    renderFrame();
  }
  document.getElementById('custom-panel').classList.remove('visible');
  customTargetBrick=null; customPrevStyle=null;
}

document.getElementById('panel-close').addEventListener('click',()=>closeCustomPanel(false));

// "Reset" button — clear custom style from this brick
document.getElementById('panel-clear').addEventListener('click',()=>{
  if(!customTargetBrick) return;
  customTargetBrick.customStyle=null;
  customTargetBrick._previewParams=undefined;
  closeCustomPanel(true);
});

// "Random" button — randomize tx+method and live-preview
document.getElementById('panel-random').addEventListener('click',()=>{
  panelTx=rndItem(ALL_TX); panelMethod=rndItem(ALL_MTH);
  if(customTargetBrick) customTargetBrick._previewParams=makeParams();
  if(customTargetBrick) syncParamControlsFromParams(customTargetBrick._previewParams);
  refreshParamControlVisibility();
  document.querySelectorAll('#tx-pills .pill').forEach(p=>p.classList.toggle('selected',p.dataset.txId===panelTx));
  document.querySelectorAll('#method-pills .pill').forEach(p=>p.classList.toggle('selected',p.dataset.mthId===panelMethod));
  livePreview();
});

// "Apply" → Done: commit current preview
document.getElementById('panel-apply').addEventListener('click',()=>closeCustomPanel(true));

// Confirm on canvas mousedown (handled in drag section via closeCustomPanel(true))
