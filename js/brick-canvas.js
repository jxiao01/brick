// ── Canvas setup ──
const canvas = document.getElementById('main-canvas');
const ctx    = canvas.getContext('2d');
const wrap   = document.getElementById('canvas-wrap');
let _wordSizingActive=false,_wordSizingText='';
let typeWordScale=1;
function updateTypeSizeUi(){
  const slider=document.getElementById('type-size');
  const label=document.getElementById('type-size-v');
  if(slider) slider.value=String(typeWordScale);
  if(label) label.textContent=Math.round(typeWordScale*100)+'%';
}
function getWordMetrics(scale){
  const s=Math.max(0.15,Math.min(2.2,scale||1));
  const cols=4,rows=5;
  // Keep base construction grid fixed; visual size slider applies as a uniform layout scale.
  const stepX=BW,stepY=BSTK;
  return{
    scale:s,cols,rows,
    stepX,stepY,
    letterW:cols*stepX,
    letterH:rows*stepY,
    gapX:BW
  };
}
function wordSingleLineWidth(word){
  const w=(word||'').trim().toUpperCase().replace(/[^A-Z]/g,'');
  if(!w.length) return 0;
  const {letterW,gapX}=getWordMetrics(1);
  return w.length*letterW+Math.max(0,w.length-1)*gapX;
}
function requiredCanvasWidth(viewportW){
  if(_wordSizingActive&&_wordSizingText){
    const pad=BW*2;
    return Math.max(viewportW,wordSingleLineWidth(_wordSizingText)+pad*2);
  }
  return viewportW;
}
function resizeCanvas() {
  const main=document.getElementById('main-work');
  const viewportW=main?main.clientWidth:wrap.clientWidth;
  const targetW=Math.max(viewportW,requiredCanvasWidth(viewportW));
  const targetH=wrap.clientHeight;
  wrap.style.minWidth=targetW+'px';
  canvas.width=targetW; canvas.height=targetH;
  canvas.style.width=targetW+'px'; canvas.style.height=targetH+'px';
  queueMicrotask(()=>updateMainWorkScrollChrome());
}
function applyWordCanvasScale(){
  const s=(currentComp&&currentComp.name==='Word')?Math.max(0.15,Math.min(2.2,typeWordScale||1)):1;
  canvas.style.transformOrigin=(currentComp&&currentComp.name==='Word')?'0% 50%':'50% 50%';
  canvas.style.transform=(Math.abs(s-1)>1e-6)?`scale(${s})`:'none';
}
resizeCanvas();
window.addEventListener('resize', ()=>{ resizeCanvas(); if(phase==='holding') renderFrame(); syncLibraryPanelLayout(); if(viewMode==='3d')syncView3dDock(); });
