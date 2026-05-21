// ════════════════════════════════════════════════════════════
//  CONTROLS & KEYBOARD
// ════════════════════════════════════════════════════════════
function initAddBrickSpecMenu(){
  const btn=document.getElementById('btn-add-brick');
  const menu=document.getElementById('add-brick-menu');
  if(!btn||!menu||menu.children.length) return;
  for(const spec of BRICK_ADD_SPECS){
    const item=document.createElement('button');
    item.type='button';
    item.className='btn';
    item.textContent=spec.label;
    item.dataset.specId=spec.id;
    item.addEventListener('click',()=>{
      addBrickAuto(spec);
      menu.classList.remove('visible');
    });
    menu.appendChild(item);
  }
  btn.addEventListener('click',e=>{
    e.stopPropagation();
    menu.classList.toggle('visible');
    document.getElementById('more-menu')?.classList.remove('visible');
  });
}
function addBrickAuto(specOverride){
  if(phase!=='holding') return;
  if(typeMode) exitTypeMode();
  if(document.getElementById('custom-panel').classList.contains('visible')) closeCustomPanel(true);
  const before=snapshot();
  const centerY=canvas.height/2;
  const minCx=Math.round((BW/2+U*2)/U)*U;
  const maxCx=canvas.width-BW/2-U*2;
  const spec=specOverride&&typeof specOverride==='object'?specOverride:BRICK_ADD_SPECS[0];
  const nb={x:minCx,y:centerY,sx:minCx,sy:centerY,tx:minCx,ty:centerY,view:'front',rotated:false,size:spec.size||randUnit(),depth:spec.depth||randDepth(),layer:0,t:1,interval:6,delay:0,customStyle:null};
  function overlapsAt(tx,ty){
    const hw=nb.rotated?BH/2:brickW(nb.size)/2,hh=BH/2;
    return bricks.some(b=>{
      if(b.view!=='front') return false;
      const bw=b.rotated?BH/2:brickW(b.size)/2,bh=BH/2;
      return Math.abs(tx-b.tx)<(hw+bw)*0.85&&Math.abs(ty-b.ty)<(hh+bh)*0.85;
    });
  }
  let placed=false;
  const frontBricks=bricks.filter(b=>b.view==='front');
  const groundY=frontBricks.length?Math.max(...frontBricks.map(b=>b.ty))+BSTK:centerY;
  const scanY=Math.round(groundY/BSTK)*BSTK;
  const xStep=U;
  // Spawn on a new bottom row only; scan from left edge inward (not canvas center).
  for(let k=0;k<220&&!placed;k++){
    const x=Math.round((minCx+k*xStep)/U)*U;
    if(x>maxCx) break;
    if(overlapsAt(x,scanY)) continue;
    if(hasStudSupportAt(nb,x,scanY)) continue;
    nb.tx=nb.x=x;
    nb.ty=nb.y=scanY;
    nb.layer=0;
    placed=true;
  }
  if(!placed) return;
  bricks.push(nb);
  recomputeFrontLayersBySupport();
  undoStack.push(before);
  updateUndoButton();
  renderFrame();
  if(viewMode==='3d'&&bricksGroup3d) syncBricksTo3D();
}
document.getElementById('btn-style').addEventListener('click',()=>{
  if(typeMode) exitTypeMode();
  if(document.getElementById('custom-panel').classList.contains('visible')) closeCustomPanel(false);
  if(bricks.length) undoStack.push(snapshot());
  styleIndex=(styleIndex+1)%STYLE_PRESETS.length;
  const preset=stylePresetAt(styleIndex);
  document.getElementById('btn-style').textContent=preset.label;
  if(bricks.length){applyStylePreset(preset);updateUndoButton();}
});
document.getElementById('btn-group').addEventListener('click',()=>{
  if(selectedBricks.size<2) return;
  const gid='g'+(groupCounter++);
  undoStack.push(snapshot());
  for(const b of selectedBricks) b.groupId=gid;
  updateUndoButton(); renderFrame();
});
document.getElementById('btn-ungroup').addEventListener('click',()=>{
  if(!selectedBricks.size) return;
  undoStack.push(snapshot());
  for(const b of selectedBricks) b.groupId=null;
  updateUndoButton(); renderFrame();
});
document.getElementById('btn-rotate-sel').addEventListener('click',()=>rotateSelection());
document.getElementById('btn-select-mode').addEventListener('click',()=>{
  marqueeMode=(marqueeMode==='contain')?'touch':'contain';
  document.getElementById('btn-select-mode').textContent=marqueeMode==='contain'?'Sel: Contain':'Sel: Touch';
});
document.getElementById('btn-more').addEventListener('click',e=>{
  e.stopPropagation();
  document.getElementById('add-brick-menu')?.classList.remove('visible');
  document.getElementById('more-menu').classList.toggle('visible');
});
document.addEventListener('click',e=>{
  const moreWrap=document.getElementById('more-wrap');
  const specWrap=document.getElementById('add-brick-wrap');
  if(moreWrap&&!moreWrap.contains(e.target)) document.getElementById('more-menu').classList.remove('visible');
  if(specWrap&&!specWrap.contains(e.target)) document.getElementById('add-brick-menu').classList.remove('visible');
});
document.getElementById('btn-rotate-sel').addEventListener('click',()=>document.getElementById('more-menu').classList.remove('visible'));
document.getElementById('btn-select-mode').addEventListener('click',()=>document.getElementById('more-menu').classList.remove('visible'));
document.getElementById('btn-imported').addEventListener('click',()=>{ enterImportedModeBlank(); });
document.getElementById('label-c').addEventListener('click',()=>{
  if(!document.getElementById('label-c').classList.contains('is-active')) return;
  cycleAlphabetPerspective();
});
document.getElementById('btn-random').addEventListener('click',()=>{if(phase==='dissolving'||phase==='condensing')return;if(typeMode)exitTypeMode();triggerNext();});
document.getElementById('btn-letters').addEventListener('click',()=>{
  if(phase==='dissolving'||phase==='condensing')return;
  if(phase==='holding'&&currentComp&&currentComp.name==='Alphabet'){startDissolve();return;}
  currentComp=CARD_A.find(c=>c.name==='Alphabet');currentPersp=CARD_C.find(c=>c.name==='Front View')||CARD_C[0];currentLetterIndex=0;applyCompAndStart();
});
document.getElementById('btn-next').addEventListener('click',()=>{
  if(phase==='holding'&&currentComp&&currentComp.name==='Alphabet'){triggerAlphabetLetter(currentLetterIndex+1);return;}
  if(phase==='holding')startDissolve();else if(phase==='idle'||phase==='holding')triggerNext();
});
document.getElementById('btn-save').addEventListener('click',()=>{if(typeMode)exitTypeMode();saveClean();});
document.getElementById('btn-share-submit').addEventListener('click',()=>submitLayoutToSharedSpace());
document.getElementById('library-refresh').addEventListener('click',()=>loadLibrary());
document.getElementById('library-preview-close').addEventListener('click',closeLibraryPreview);
document.getElementById('library-preview-overlay').addEventListener('click',e=>{ if(e.target.id==='library-preview-overlay') closeLibraryPreview(); });
document.getElementById('library-preview-import').addEventListener('click',()=>{ if(_libraryPreviewRow) openLibraryImportToMain(_libraryPreviewRow); });
document.getElementById('btn-library-toggle').addEventListener('click',()=>{
  const btn=document.getElementById('btn-library-toggle');
  const panel=document.getElementById('library-panel');
  if(!btn||!panel) return;
  if(phase==='dissolving'||phase==='condensing') return;
  const open=!panel.classList.contains('library-panel--open');
  if(open){
    const alreadyImp=currentComp&&currentComp.name==='Imported';
    if(!alreadyImp||bricks.length===0){
      if(!prepareImportedBlankWorkboard()) return;
      applyImportedEmptyBundleUi();
      document.getElementById('status-hint').textContent='Blank canvas · Library to import · Add Brick (up to 2x4) to start';
    }
    openLibraryPanel();
  } else {
    closeLibraryPanel();
  }
});
supabaseClient=initSupabaseClient();
refreshShareSubmitUi();
window.replaceBricksFromLayout=replaceBricksFromLayout;
document.getElementById('btn-reset').addEventListener('click',()=>{if(typeMode)exitTypeMode();resetLayout();});
document.getElementById('btn-undo').addEventListener('click',()=>{if(typeMode)exitTypeMode();undo();});

