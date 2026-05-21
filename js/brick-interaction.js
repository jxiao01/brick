// ════════════════════════════════════════════════════════════
//  DRAG
// ════════════════════════════════════════════════════════════
function getBrickAt(ox,oy){
  for(let i=bricks.length-1;i>=0;i--){
    const b=bricks[i];
    if(hitTest(ox,oy,b.tx,b.ty,b.view,b.rotated,b.size,b.depth)) return {b,i};
  }
  return null;
}
function clearSelection(){ selectedBricks.clear(); }
function toggleSelection(b){ if(selectedBricks.has(b)) selectedBricks.delete(b); else selectedBricks.add(b); }
function canRotateBrick(b){ return !!b&&b.view==='front'; }
function rotateBricksAllowed(list){
  const arr=(list||[]).filter(canRotateBrick);
  if(!arr.length) return false;
  for(const b of arr) b.rotated=!b.rotated;
  return true;
}
function selectGroupOf(b){
  if(!b||!b.groupId){ selectedBricks.add(b); return; }
  for(const x of bricks) if(x.groupId===b.groupId) selectedBricks.add(x);
}
function selectionBounds(){
  const arr=[...selectedBricks];
  if(!arr.length) return null;
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  for(const b of arr){
    const bd=getBounds(b.tx,b.ty,b.view,b.rotated,b.size);
    x0=Math.min(x0,bd.x0); y0=Math.min(y0,bd.y0); x1=Math.max(x1,bd.x1); y1=Math.max(y1,bd.y1);
  }
  return {x0,y0,x1,y1};
}
function rotateSelection(){
  if(!selectedBricks.size) return;
  const rotatable=[...selectedBricks].filter(canRotateBrick);
  if(!rotatable.length) return;
  undoStack.push(snapshot());
  rotateBricksAllowed(rotatable);
  updateUndoButton(); renderFrame();
}
function applyMarqueeSelection(additive){
  if(!marquee) return;
  const x0=Math.min(marquee.x0,marquee.x1),y0=Math.min(marquee.y0,marquee.y1),x1=Math.max(marquee.x0,marquee.x1),y1=Math.max(marquee.y0,marquee.y1);
  if(!additive) clearSelection();
  for(const b of bricks){
    const bd=getBounds(b.tx,b.ty,b.view,b.rotated,b.size);
    if(marqueeMode==='contain'){
      if(bd.x0>=x0&&bd.y0>=y0&&bd.x1<=x1&&bd.y1<=y1) selectedBricks.add(b);
    }else{
      const intersects=!(bd.x1<x0||bd.x0>x1||bd.y1<y0||bd.y0>y1);
      if(intersects) selectedBricks.add(b);
    }
  }
}
// Bricks that were snapped to another brick need more force to detach
let _dragCandidate=null,_dragStartX=0,_dragStartY=0;
const DRAG_THRESHOLD=4;      // px before drag begins (free bricks)
const DETACH_THRESHOLD=14;   // px before snapped brick detaches

canvas.addEventListener('mousedown',e=>{
  if(phase!=='holding') return;
  const{ox,oy}=canvasXY(e);
  if(document.getElementById('custom-panel').classList.contains('visible')){closeCustomPanel(true);return;}
  const hit=getBrickAt(ox,oy);
  if(hit){
    const {b,i}=hit;
    if(e.shiftKey){
      toggleSelection(b);
  renderFrame();
      return;
    }
    if(!selectedBricks.has(b)) { clearSelection(); selectGroupOf(b); }
    const movingSet=[...selectedBricks];
    if(movingSet.length>1){
      preDragSnapshot=snapshot();
      groupDrag={
        anchor:b,start:{x:ox,y:oy},origin:{tx:b.tx,ty:b.ty},
        members:movingSet.map(m=>({b:m,dx:m.tx-b.tx,dy:m.ty-b.ty})),
        snapped:(b.layer||0)>0
      };
      _dragStartX=e.clientX; _dragStartY=e.clientY;
      return;
    }
    // single brick drag candidate
    _dragCandidate={b,i,ox,oy,snapped:(b.layer||0)>0};
    _dragStartX=e.clientX;_dragStartY=e.clientY;
  } else {
    // start marquee selection on empty space
    marquee={x0:ox,y0:oy,x1:ox,y1:oy,active:true,additive:e.shiftKey};
    if(!e.shiftKey) clearSelection();
    renderFrame();
  }
});

function _beginDrag(candidate){
  const{b,i,ox,oy}=candidate;
  _dragCandidate=null;
  _dragOrigin={tx:b.tx,ty:b.ty,layer:b.layer||0};
  preDragSnapshot=snapshot();dragBrick=b;dragOffX=ox-b.tx;dragOffY=oy-b.ty;
  canvas.classList.add('dragging');bricks.splice(i,1);bricks.push(dragBrick);
  // Build background cache
  const W=canvas.width,H=canvas.height;
  const bgBuf=new Uint8ClampedArray(W*H*4);bgBuf.fill(255);
  const restSorted=bricks.filter(x=>x!==dragBrick).sort(compareBricksForPaint);
  for(const rb of restSorted) if(!rb.customStyle) renderBrickToBuf(bgBuf,W,H,rb,rb.tx,rb.ty,20);
  const bgOC=document.createElement('canvas');bgOC.width=W;bgOC.height=H;
  const bgCtx=bgOC.getContext('2d');
  const bgID=bgCtx.createImageData(W,H);bgID.data.set(bgBuf);bgCtx.putImageData(bgID,0,0);
  for(const rb of restSorted){
    if(!rb.customStyle) continue;
    const bd=getBounds(rb.tx,rb.ty,rb.view,rb.rotated,rb.size);
    bgCtx.fillStyle='#fff';bgCtx.fillRect(bd.x0-8,bd.y0-8,(bd.x1-bd.x0)+16,(bd.y1-bd.y0)+16);
    renderCustomBrick(bgCtx,rb.tx,rb.ty,rb.customStyle,28/16,rb.view,rb.rotated,rb.size);
  }
  _bgCache=bgCtx.getImageData(0,0,W,H).data;
  renderFrame();
}

window.addEventListener('mousemove',e=>{
  if(marquee&&marquee.active){
    const {ox,oy}=canvasXY(e);
    marquee.x1=ox; marquee.y1=oy;
    queueRender();
    return;
  }
  if(groupDrag){
    const dx=e.clientX-_dragStartX,dy=e.clientY-_dragStartY;
    const dist=Math.sqrt(dx*dx+dy*dy);
    const threshold=groupDrag.snapped?DETACH_THRESHOLD:DRAG_THRESHOLD;
    if(dist<threshold) return;
    const {ox,oy}=canvasXY(e);
    // Use drag-start anchor origin to avoid cumulative drift/fly-away.
    const rawX=ox-(groupDrag.start.x-groupDrag.origin.tx);
    const rawY=oy-(groupDrag.start.y-groupDrag.origin.ty);
    // Reuse single-brick snap logic by temporarily treating anchor as dragBrick.
    const prevDragBrick=dragBrick;
    dragBrick=groupDrag.anchor;
    const snap=computeSnapTarget(rawX,rawY);
    dragBrick=prevDragBrick;
    _lastSnap=snap||null;
    let tx=snap?snap.x:rawX;
    let ty=snap?((snap.dir==='h'&&snap.target)?snap.target.ty:snap.y):rawY;
    if(!isGroupPlacementValid(groupDrag,tx,ty)){
      tx=rawX; ty=rawY; _lastSnap=null;
    }
    groupDrag.anchor.tx=lerp(groupDrag.anchor.tx,tx,snap?0.34:0.55);
    groupDrag.anchor.ty=lerp(groupDrag.anchor.ty,ty,snap?0.34:0.55);
    if(Math.abs(groupDrag.anchor.tx-tx)<0.25) groupDrag.anchor.tx=tx;
    if(Math.abs(groupDrag.anchor.ty-ty)<0.25) groupDrag.anchor.ty=ty;
    if(snap&&snap.isoDx!=null&&snap.isoDy!=null){
      groupDrag.anchor.isoDx=snap.isoDx;
      groupDrag.anchor.isoDy=snap.isoDy;
    }
    const ax=groupDrag.anchor.tx;
    const ay=groupDrag.anchor.ty;
    for(const m of groupDrag.members){
      m.b.tx=ax+m.dx; m.b.ty=ay+m.dy; m.b.x=m.b.tx; m.b.y=m.b.ty;
    }
    // Keep grouped bricks parallel in real time, not only on mouseup.
    normalizeParallelRows(groupDrag.members.map(m=>m.b));
    if(perspectiveUsesAffineFrontSnap()){
      const cx=canvas.width/2, cy=canvas.height/2;
      for(const m of groupDrag.members){
        if(m.b.view!=='front'||m.b.rotated) continue;
        const L=affineLogicalFromCanvas(cx,cy,m.b.tx,m.b.ty);
        if(!L) continue;
        m.b.isoDx=L.dx; m.b.isoDy=L.dy;
      }
    }
    queueRender();
    return;
  }
  if(_dragCandidate&&!dragBrick){
    const dx=e.clientX-_dragStartX,dy=e.clientY-_dragStartY;
    const dist=Math.sqrt(dx*dx+dy*dy);
    const threshold=_dragCandidate.snapped?DETACH_THRESHOLD:DRAG_THRESHOLD;
    if(dist>=threshold) _beginDrag(_dragCandidate);
    return;
  }
  if(!dragBrick) return;
  const{ox,oy}=canvasXY(e);
  const rawX=ox-dragOffX,rawY=oy-dragOffY;
  const snap=computeSnapTarget(rawX,rawY);
  _lastSnap=snap||null;
  snapTarget=snap?snap.target:null;
  if(snap){
    const targetY=(snap.dir==='h'&&snap.target)?snap.target.ty:snap.y;
    dragBrick.tx=lerp(dragBrick.tx,snap.x,0.38);
    dragBrick.ty=lerp(dragBrick.ty,targetY,0.38);
    if(Math.abs(dragBrick.tx-snap.x)<0.25) dragBrick.tx=snap.x;
    if(Math.abs(dragBrick.ty-targetY)<0.25) dragBrick.ty=targetY;
    if(snap.isoDx!=null&&snap.isoDy!=null){
      dragBrick.isoDx=snap.isoDx;
      dragBrick.isoDy=snap.isoDy;
    }
    if(snap.dir==='v'){
      dragBrick.layer=getSupportedLayerAt(dragBrick,dragBrick.tx,dragBrick.ty);
    } else if(snap.target){
      dragBrick.layer=snap.target.layer||0;
    }
    dragBrick.x=dragBrick.tx; dragBrick.y=dragBrick.ty;
  }else{
    dragBrick.x=dragBrick.tx=rawX;
    dragBrick.y=dragBrick.ty=rawY;
    if(dragBrick.view==='front'&&!dragBrick.rotated&&perspectiveUsesAffineFrontSnap()){
      const L=affineLogicalFromCanvas(canvas.width/2,canvas.height/2,rawX,rawY);
      if(L){ dragBrick.isoDx=L.dx; dragBrick.isoDy=L.dy; }
    }
  }
  queueRender();
});
window.addEventListener('mouseup',()=>{
  if(marquee&&marquee.active){
    marquee.active=false;
    applyMarqueeSelection(marquee.additive);
    marquee=null;
    renderFrame();
    return;
  }
  if(groupDrag){
    const members=groupDrag.members.map(m=>m.b);
    const memberSet=new Set(members);
    const finalSnap=_lastSnap;
    // Lock group to final snap point like single-brick finalize.
    if(finalSnap){
      const anchor=groupDrag.anchor;
      const finalX=finalSnap.x;
      const finalY=(finalSnap.dir==='h'&&finalSnap.target)?finalSnap.target.ty:finalSnap.y;
      const dx=finalX-anchor.tx,dy=finalY-anchor.ty;
      for(const b of members){ b.tx=b.x=b.tx+dx; b.ty=b.y=b.ty+dy; }
      if(finalSnap.isoDx!=null&&finalSnap.isoDy!=null){
        anchor.isoDx=finalSnap.isoDx;
        anchor.isoDy=finalSnap.isoDy;
      }
    }
    // Overlap guard (group vs non-group), same spirit as single brick logic.
    const overlapsAny=members.some(mb=>{
      const mfp=brickFootprintHalf(mb);
      return bricks.some(ob=>{
        if(memberSet.has(ob)) return false;
        const ofp=brickFootprintHalf(ob);
        const xOver=Math.abs(mb.tx-ob.tx)<(mfp.hx+ofp.hx)*0.85;
        const yOver=Math.abs(mb.ty-ob.ty)<(mfp.hy+ofp.hy)*0.85;
        return xOver&&yOver;
      });
    });
    if(overlapsAny&&preDragSnapshot){
      applySnapshot(preDragSnapshot);
      preDragSnapshot=null;
      groupDrag=null; _lastSnap=null; snapTarget=null; _bgCache=null;
      renderFrame();
      return;
    }
    if(!finalSnap){
      for(const b of members){
        const prevDrag=dragBrick;
        dragBrick=b;
        snapToGrid();
        dragBrick=prevDrag;
      }
    }
    enforceMovedBricksEmbedding(members);
    quantizeBrickPositions(members);
    recomputeFrontLayersBySupport();
    if(preDragSnapshot){
      const cur=snapshot();
      let moved=false;
      for(let i=0;i<cur.length;i++){
        if(cur[i].tx!==preDragSnapshot[i].tx||cur[i].ty!==preDragSnapshot[i].ty){ moved=true; break; }
      }
      if(moved) undoStack.push(preDragSnapshot);
      preDragSnapshot=null;
      updateUndoButton();
    }
    normalizeParallelRows(members);
    normalizeParallelRowsGlobal();
    // normalizeParallelRows/snapToGrid can change ty after layer was set — re-sync layers once.
    recomputeFrontLayersBySupport();
    syncFrontBricksIsoFromCanvas();
    groupDrag=null; _lastSnap=null; snapTarget=null;
    renderFrame();
    return;
  }
  _dragCandidate=null;
  if(!dragBrick) return;
  const finalSnap=_lastSnap;
  _lastSnap=null;
  if(finalSnap){
    dragBrick.tx=dragBrick.x=finalSnap.x;
    if(finalSnap.dir==='h'){
      dragBrick.ty=dragBrick.y=finalSnap.target.ty;
    } else {
      dragBrick.ty=dragBrick.y=finalSnap.y;
    }
    if(finalSnap.isoDx!=null&&finalSnap.isoDy!=null){
      dragBrick.isoDx=finalSnap.isoDx;
      dragBrick.isoDy=finalSnap.isoDy;
    }
  }
  const snappedTarget=finalSnap?finalSnap.target:null;
  snapTarget=null;canvas.classList.remove('dragging');

  // ── Overlap check: if brick lands on top of another, return to pre-drag position ──
  const overlapping=hasBodyOverlapAt(dragBrick,dragBrick.tx,dragBrick.ty);

  if(overlapping&&preDragSnapshot){
    // Restore dragged brick to its own original position
    if(_dragOrigin){
      dragBrick.tx=dragBrick.x=_dragOrigin.tx;
      dragBrick.ty=dragBrick.y=_dragOrigin.ty;
      dragBrick.layer=_dragOrigin.layer||0;
    }
    preDragSnapshot=null;
    _dragOrigin=null;
    // Flash hint message
    const hint=document.getElementById('status-hint');
    const prev=hint.textContent;
    hint.textContent='bricks can\'t overlap — returned to original position';
    hint.style.color='#888';
    setTimeout(()=>{hint.textContent=prev;},2000);
    dragBrick=null;_bgCache=null;renderFrame();updateUndoButton();
    return;
  }

  const rollbackSnapshot=preDragSnapshot;
  const rollbackOrigin=_dragOrigin;
  preDragSnapshot=null;
  if(finalSnap&&finalSnap.dir==='h'){
    dragBrick.layer=snappedTarget.layer||0;
    dragBrick.ty=dragBrick.y=snappedTarget.ty; // force exact same-row alignment
  } else if(snappedTarget){
    dragBrick.layer=getSupportedLayerAt(dragBrick,dragBrick.tx,dragBrick.ty);
  } else {
    dragBrick.layer=computeLayerAtPosition(dragBrick.tx,dragBrick.ty,dragBrick.view,dragBrick.rotated,dragBrick.size,dragBrick.depth);
  }
  if((dragBrick.layer||0)>0&&!hasStudSupportAt(dragBrick,dragBrick.tx,dragBrick.ty)){
    if(finalSnap&&finalSnap.dir==='v'&&rollbackSnapshot){
      // Vertical stud lock should be physically valid; if not, rollback.
      if(rollbackOrigin){
        dragBrick.tx=dragBrick.x=rollbackOrigin.tx;
        dragBrick.ty=dragBrick.y=rollbackOrigin.ty;
        dragBrick.layer=rollbackOrigin.layer||0;
      }
      const hint=document.getElementById('status-hint');
      const prev=hint.textContent;
      hint.textContent='invalid stud lock — returned to supported position';
      hint.style.color='#888';
      setTimeout(()=>{hint.textContent=prev;},1800);
      dragBrick=null;_dragOrigin=null;_bgCache=null;renderFrame();updateUndoButton();
      return;
    }
    // Free drag without support: drop to base layer instead of blocking movement.
    dragBrick.layer=0;
  }
  if(rollbackOrigin){
    if(dragBrick.tx!==rollbackOrigin.tx||dragBrick.ty!==rollbackOrigin.ty||((dragBrick.layer||0)!==(rollbackOrigin.layer||0))) undoStack.push(rollbackSnapshot);
  }
  enforceMovedBricksEmbedding([dragBrick]);
  quantizeBrickPositions([dragBrick]);
  recomputeFrontLayersBySupport();
  if(!snappedTarget) snapToGrid();
  normalizeParallelRows([dragBrick,...bricks.filter(b=>b!==dragBrick&&b.view===dragBrick.view&&(b.layer||0)===(dragBrick.layer||0)&&Math.abs(b.ty-dragBrick.ty)<BSTK*0.2)]);
  normalizeParallelRowsGlobal();
  // Row alignment / grid snap run after recomputeFrontLayersBySupport — refresh layers from final ty.
  recomputeFrontLayersBySupport();
  syncFrontBricksIsoFromCanvas();
  dragBrick=null;_dragOrigin=null;_bgCache=null;renderFrame();updateUndoButton();
  if(animId){cancelAnimationFrame(animId);animId=null;}
});
canvas.addEventListener('touchstart',e=>{
  if(viewMode==='2d'&&e.touches.length===2){
  e.preventDefault();
    const t1=e.touches[0],t2=e.touches[1];
    const cx=(t1.clientX+t2.clientX)/2, cy=(t1.clientY+t2.clientY)/2;
    touchGesture={
      dist:Math.hypot(t2.clientX-t1.clientX,t2.clientY-t1.clientY),
      ang:Math.atan2(t2.clientY-t1.clientY,t2.clientX-t1.clientX),
      cx,cy,
      snap:snapshot()
    };
    return;
  }
  if(touchGesture) return;
  e.preventDefault();const t=e.touches[0];
  canvas.dispatchEvent(new MouseEvent('mousedown',{clientX:t.clientX,clientY:t.clientY}));
},{passive:false});
window.addEventListener('touchmove',e=>{
  if(touchGesture&&viewMode==='2d'&&e.touches.length===2){
  e.preventDefault();
    const t1=e.touches[0],t2=e.touches[1];
    const cx=(t1.clientX+t2.clientX)/2, cy=(t1.clientY+t2.clientY)/2;
    const dist=Math.hypot(t2.clientX-t1.clientX,t2.clientY-t1.clientY);
    const ang=Math.atan2(t2.clientY-t1.clientY,t2.clientX-t1.clientX);
    const s=dist/Math.max(1,touchGesture.dist);
    const da=ang-touchGesture.ang;
    const c=canvas.getBoundingClientRect();
    const px=cx-c.left, py=cy-c.top;
    for(let i=0;i<bricks.length;i++){
      const o=touchGesture.snap[i], b=bricks[i];
      const dx=o.tx-px, dy=o.ty-py;
      const rx=dx*Math.cos(da)-dy*Math.sin(da);
      const ry=dx*Math.sin(da)+dy*Math.cos(da);
      b.tx=b.x=px+rx*s; b.ty=b.y=py+ry*s;
    }
    queueRender();
    return;
  }
  if(touchGesture) return;
  e.preventDefault();const t=e.touches[0];window.dispatchEvent(new MouseEvent('mousemove',{clientX:t.clientX,clientY:t.clientY}));
},{passive:false});
window.addEventListener('touchend',e=>{
  if(touchGesture&&e.touches.length<2){
    touchGesture=null;
    quantizeBrickPositions(bricks);
    renderFrame();
  }
  if(e.touches.length===0) window.dispatchEvent(new MouseEvent('mouseup'));
});

canvas.addEventListener('dblclick',e=>{
  if(phase!=='holding') return;
  const{ox,oy}=canvasXY(e);
  for(let i=bricks.length-1;i>=0;i--){
    const b=bricks[i];
    if(hitTest(ox,oy,b.tx,b.ty,b.view,b.rotated,b.size,b.depth)){
      if(e.shiftKey){
        openCustomPanel(b,ox,oy);
      } else {
        const pool=(selectedBricks.has(b)&&selectedBricks.size>1)?[...selectedBricks]:[b];
        const rotatable=pool.filter(canRotateBrick);
        if(!rotatable.length){ e.preventDefault(); break; }
        undoStack.push(snapshot());
        rotateBricksAllowed(rotatable);
        renderFrame();
        updateUndoButton();
      }
      e.preventDefault();
      break;
    }
  }
});

// ── Right-click context menu ──
(function(){
  const menu=document.getElementById('brick-ctx-menu');
  let ctxBrick=null,ctxOX=0,ctxOY=0;

  function closeCtx(){menu.classList.remove('visible');ctxBrick=null;}

  canvas.addEventListener('contextmenu',e=>{
    e.preventDefault();
    if(phase!=='holding') return;
    const{ox,oy}=canvasXY(e);
    for(let i=bricks.length-1;i>=0;i--){
      const b=bricks[i];
      if(hitTest(ox,oy,b.tx,b.ty,b.view,b.rotated,b.size,b.depth)){
        ctxBrick=b; ctxOX=ox; ctxOY=oy;
        document.getElementById('ctx-rotate').disabled=!canRotateFromCtx(b);
        // Position near cursor, keep within viewport
        const vw=window.innerWidth,vh=window.innerHeight;
        const mw=130,mh=72;
        const left=Math.min(e.clientX+2,vw-mw-8);
        const top=Math.min(e.clientY+2,vh-mh-8);
        menu.style.left=left+'px';
        menu.style.top=top+'px';
        menu.classList.add('visible');
        return;
      }
    }
    closeCtx();
  });

  document.getElementById('ctx-rotate').addEventListener('click',()=>{
    if(!ctxBrick||!canRotateFromCtx(ctxBrick)) return;
    const pool=(selectedBricks.has(ctxBrick)&&selectedBricks.size>1)?[...selectedBricks]:[ctxBrick];
    const rotatable=pool.filter(canRotateBrick);
    if(!rotatable.length) return;
    undoStack.push(snapshot());
    rotateBricksAllowed(rotatable);
    renderFrame(); updateUndoButton();
    closeCtx();
  });

  document.getElementById('ctx-customize').addEventListener('click',()=>{
    if(!ctxBrick) return;
    openCustomPanel(ctxBrick,ctxOX,ctxOY);
    closeCtx();
  });

  // Close on any click outside
  document.addEventListener('click',e=>{
    if(!menu.contains(e.target)) closeCtx();
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape') closeCtx();
  });
})();

function canvasXY(e){const r=canvas.getBoundingClientRect();return{ox:e.clientX-r.left,oy:e.clientY-r.top};}
function hitTest(mx,my,bx,by,view,rotated,size,depth){return getSDF(mx,my,bx,by,view,rotated,size,depth)<=2;}
function canRotateFromCtx(target){
  if(!target) return false;
  if(selectedBricks.has(target)&&selectedBricks.size>1) return [...selectedBricks].some(canRotateBrick);
  return canRotateBrick(target);
}
function getStudXsForBrickAt(brick,cx){
  if(!brick||brick.view==='top') return [];
  if(brick.view==='side'||brick.rotated) return[cx];
  const n=brick.size||4;
  const w=brickW(brick.size);
  return Array.from({length:n},(_,i)=>cx-w/2+U*(i+.5));
}
function hasStudSupportAt(brick,tx,ty,pool){
  const list=pool||bricks;
  if(!brick||brick.view==='top') return true;
  const myStudXs=getStudXsForBrickAt(brick,tx);
  if(!myStudXs.length) return true;
  const cx=canvas.width/2, cy=canvas.height/2;
  const xTol=U*0.35;
  const affDy=affineDyPerPhysicalStack();
  const brickIso=affDy!=null&&perspectiveUsesAffineFrontSnap()&&brick.view==='front'&&!brick.rotated
    ? getBrickIsoLogicalAt(brick,tx,ty,cx,cy):null;
  const isoDyTol=Math.max(STUD_STACK_Y_TOL,COVER_STUD_ISO_DY_TOL);
  let supported=0;
  for(const b of list){
    if(b===brick||b.view!==brick.view) continue;
    if(brick.view==='front'&&!!b.rotated!==!!brick.rotated) continue;
    if(brickIso){
      const lIso=getBrickIsoLogicalAt(b,b.tx,b.ty,cx,cy);
      if(!lIso) continue;
      if(Math.abs(lIso.dx-brickIso.dx)>U*0.45) continue;
      if(Math.abs((lIso.dy-brickIso.dy)-affDy)>isoDyTol) continue;
      const lowerStudXs=getStudXsForBrickAt(b,b.tx);
      for(const sx of myStudXs){
        if(lowerStudXs.some(lsx=>Math.abs(lsx-sx)<=xTol)){ supported++; break; }
      }
      continue;
    }
    const stackPitch=brick.view==='side'?SIDE_STACK_Y:BSTK;
    const supportY=ty+stackPitch;
    if(Math.abs(b.ty-supportY)>STUD_STACK_Y_TOL) continue;
    const lowerStudXs=getStudXsForBrickAt(b,b.tx);
    for(const sx of myStudXs){
      if(lowerStudXs.some(lsx=>Math.abs(lsx-sx)<=xTol)){ supported++; break; }
    }
  }
  return supported>0;
}
function hasBodyOverlapAt(brick,tx,ty,ignoreSet){
  const a=brickFootprintHalf(brick);
  for(const b of bricks){
    if(b===brick) continue;
    if(ignoreSet&&ignoreSet.has&&ignoreSet.has(b)) continue;
    const bb=brickFootprintHalf(b);
    if(Math.abs(tx-b.tx)<(a.hx+bb.hx)*0.85 && Math.abs(ty-b.ty)<(a.hy+bb.hy)*0.85) return true;
  }
  return false;
}
function getSupportedLayerAt(brick,tx,ty,pool){
  const list=pool||bricks;
  if(!brick||brick.view==='top') return 0;
  const myStudXs=getStudXsForBrickAt(brick,tx);
  if(!myStudXs.length) return 0;
  const cx=canvas.width/2, cy=canvas.height/2;
  const xTol=U*0.35;
  const affDy=affineDyPerPhysicalStack();
  const brickIso=affDy!=null&&perspectiveUsesAffineFrontSnap()&&brick.view==='front'&&!brick.rotated
    ? getBrickIsoLogicalAt(brick,tx,ty,cx,cy):null;
  const isoDyTol=Math.max(STUD_STACK_Y_TOL,COVER_STUD_ISO_DY_TOL);
  let best=-1;
  for(const b of list){
    if(b===brick||b.view!==brick.view) continue;
    if(brick.view==='front'&&!!b.rotated!==!!brick.rotated) continue;
    let aligned=false;
    if(brickIso){
      const lIso=getBrickIsoLogicalAt(b,b.tx,b.ty,cx,cy);
      if(!lIso) continue;
      if(Math.abs(lIso.dx-brickIso.dx)>U*0.45) continue;
      if(Math.abs((lIso.dy-brickIso.dy)-affDy)>isoDyTol) continue;
      const lowerStudXs=getStudXsForBrickAt(b,b.tx);
      for(const sx of myStudXs){
        if(lowerStudXs.some(lsx=>Math.abs(lsx-sx)<=xTol)){ aligned=true; break; }
      }
    } else {
      const stackPitch=brick.view==='side'?SIDE_STACK_Y:BSTK;
      const supportY=ty+stackPitch;
      if(Math.abs(b.ty-supportY)>STUD_STACK_Y_TOL) continue;
      const lowerStudXs=getStudXsForBrickAt(b,b.tx);
      for(const sx of myStudXs){
        if(lowerStudXs.some(lsx=>Math.abs(lsx-sx)<=xTol)){ aligned=true; break; }
      }
    }
    if(aligned) best=Math.max(best,b.layer||0);
  }
  return best>=0?best+1:0;
}
function computeSnapTargetTop(rawX,rawY){
  const db=dragBrick;
  if(!db||db.view!=='top') return null;
  const tuck=TOP_PLATE_TUCK;
  let best=Infinity,bestSnap=null;
  for(const b of bricks){
    if(b===db||b.view!=='top') continue;
    const dn=db.size||4, dd=Math.max(1,db.depth||1);
    const dw=brickW(dn), dhd=dd*U/2;
    const bn=b.size||4, bd=Math.max(1,b.depth||1);
    const bw=brickW(bn), bhd=bd*U/2;
    if(Math.abs(rawY-b.ty)<SNAP_RADIUS*0.5){
      const sepX=dw/2+bw/2-tuck;
      const candXL=b.tx-sepX, candXR=b.tx+sepX;
      for(const candidateX of [candXL,candXR]){
        const candidateY=b.ty;
        if(hasBodyOverlapAt(db,candidateX,candidateY)) continue;
        const dist=Math.hypot(rawX-candidateX,rawY-candidateY);
        if(dist<SNAP_RADIUS*1.65&&dist<best){
          best=dist;
          bestSnap={target:b,x:candidateX,y:candidateY,overlap:1,dir:'h'};
        }
      }
    }
    if(Math.abs(rawX-b.tx)<SNAP_RADIUS*0.5){
      const sepY=dhd+bhd-tuck;
      const candYT=b.ty-sepY, candYB=b.ty+sepY;
      for(const candidateY of [candYT,candYB]){
        const candidateX=b.tx;
        if(hasBodyOverlapAt(db,candidateX,candidateY)) continue;
        const dist=Math.hypot(rawX-candidateX,rawY-candidateY);
        if(dist<SNAP_RADIUS*1.65&&dist<best){
          best=dist;
          bestSnap={target:b,x:candidateX,y:candidateY,overlap:1,dir:'d'};
        }
      }
    }
  }
  return bestSnap;
}
function computeSnapTargetSide(rawX,rawY){
  const db=dragBrick;
  let best=Infinity,bestSnap=null;
  for(const b of bricks){
    if(b===db||b.view!=='side') continue;
    const candidateX=b.tx;
    const candidateY=b.ty-SIDE_STACK_Y;
    if(Math.abs(rawX-candidateX)>SNAP_RADIUS*0.55) continue;
    if(hasBodyOverlapAt(db,candidateX,candidateY)) continue;
    if(!hasStudSupportAt(db,candidateX,candidateY)) continue;
    const dist=Math.hypot(rawX-candidateX,rawY-candidateY);
    if(dist<SNAP_RADIUS*1.2&&dist<best){
      best=dist;
      bestSnap={target:b,x:candidateX,y:candidateY,overlap:1,dir:'v'};
    }
  }
  return bestSnap;
}
function computeSnapTargetIso(rawX,rawY){
  const db=dragBrick;
  if(!db||db.view!=='front'||db.rotated) return null;
  const stackDy=affineStackDeltaDy();
  if(stackDy==null) return null;
  const cx=canvas.width/2, cy=canvas.height/2;
  const getLI=(b,tx,ty)=>{
    if(b.isoDx!=null&&b.isoDy!=null&&Math.abs((b.tx||0)-tx)<0.5&&Math.abs((b.ty||0)-ty)<0.5)
      return{dx:b.isoDx,dy:b.isoDy};
    return affineLogicalFromCanvas(cx,cy,tx,ty);
  };
  const dn=db.size||4;
  const dw=brickW(db.size);
  function dragStudXs(cx){
    return Array.from({length:dn},(_,i)=>cx-dw/2+U*(i+.5));
  }
  let best=Infinity,bestSnap=null;
  for(const b of bricks){
    if(b===db||b.view!=='front'||b.rotated) continue;
    const bn=b.size||4;
    const bw=brickW(b.size);
    const nLi=getLI(b,b.tx,b.ty);
    if(!nLi) continue;
    const targetStudXs=Array.from({length:bn},(_,j)=>b.tx-bw/2+U*(j+.5));
    const candBaseDy=nLi.dy+stackDy;
    for(const tsx of targetStudXs){
      for(let di=0;di<dn;di++){
        const candDx=tsx-(-dw/2+U*(di+0.5));
        const candDy=candBaseDy;
        const {tx:candTx,ty:candTy}=affineCanvasFromLogical(cx,cy,candDx,candDy);
        const dsx=dragStudXs(candTx);
        const overlap=dsx.filter(sx=>targetStudXs.some(tx=>Math.abs(sx-tx)<U*0.35)).length;
        if(overlap===0) continue;
        if(hasBodyOverlapAt(db,candTx,candTy)) continue;
        const _tx=db.tx,_ty=db.ty,_dx=db.isoDx,_dy=db.isoDy;
        db.tx=candTx; db.ty=candTy; db.isoDx=candDx; db.isoDy=candDy;
        const ok=hasStudSupportAt(db,candTx,candTy);
        db.tx=_tx; db.ty=_ty; db.isoDx=_dx; db.isoDy=_dy;
        if(!ok) continue;
        const dist=Math.hypot(rawX-candTx,rawY-candTy);
        const score=dist-overlap*U*0.5;
        if(dist<SNAP_RADIUS*1.08&&score<best){
          best=score;
          bestSnap={target:b,x:candTx,y:candTy,overlap,dir:'v',isoDx:candDx,isoDy:candDy};
        }
      }
    }
    if(Math.abs(rawY-b.ty)<BSTK*0.75){
      const candDy=nLi.dy;
      const candDxL=nLi.dx-bw/2-dw/2;
      const candDxR=nLi.dx+bw/2+dw/2;
      for(const candDx of [candDxL,candDxR]){
        const {tx:candTx,ty:candTy}=affineCanvasFromLogical(cx,cy,candDx,candDy);
        if(hasBodyOverlapAt(db,candTx,candTy)) continue;
        const dist=Math.hypot(rawX-candTx,rawY-candTy);
        if(dist<SNAP_RADIUS*1.5&&dist<best){
          best=dist;
          bestSnap={target:b,x:candTx,y:candTy,overlap:1,dir:'h',isoDx:candDx,isoDy:candDy};
        }
      }
    }
  }
  return bestSnap;
}
function computeSnapTarget(rawX,rawY){
  if(!dragBrick) return null;
  if(dragBrick.view==='side') return computeSnapTargetSide(rawX,rawY);
  if(dragBrick.view==='top') return computeSnapTargetTop(rawX,rawY);
  if(dragBrick.view!=='front') return null;
  if(perspectiveUsesAffineFrontSnap()&&!dragBrick.rotated){
    const isoTry=computeSnapTargetIso(rawX,rawY);
    if(isoTry) return isoTry;
  }

  const dn=dragBrick.rotated?1:(dragBrick.size||4);
  const dw=brickW(dragBrick.size);
  function dragStudXs(cx){
    if(dragBrick.rotated) return [cx];
    return Array.from({length:dn},(_,i)=>cx-dw/2+U*(i+.5));
  }

  let best=Infinity, bestSnap=null;

  for(const b of bricks){
    if(b===dragBrick||b.view!=='front') continue;

    const bn=b.rotated?1:(b.size||4);
    const bw=brickW(b.size);
    const targetStudXs=b.rotated?[b.tx]:Array.from({length:bn},(_,i)=>b.tx-bw/2+U*(i+.5));

    // ── VERTICAL snap (dragBrick on top of b) ──
    for(const tsx of targetStudXs){
      for(let di=0;di<dn;di++){
        // Position dragBrick so that its di-th stud aligns with tsx
        const myStudOffsetX = dragBrick.rotated ? 0 : (-dw/2 + U*(di+0.5));
        const candidateX = tsx - myStudOffsetX;
      const candidateY=b.ty-BSTK;
        const dsx=dragStudXs(candidateX);
        const overlap=dsx.filter(dx=>targetStudXs.some(tx=>Math.abs(dx-tx)<U*0.35)).length;
        if(overlap===0) continue;
        if(hasBodyOverlapAt(dragBrick,candidateX,candidateY)) continue;
        if(!hasStudSupportAt(dragBrick,candidateX,candidateY)) continue;
        const dist=Math.hypot(rawX-candidateX,rawY-candidateY);
        const score=dist-overlap*U*0.5;
        if(dist<SNAP_RADIUS*1.08&&score<best){
          best=score;
          bestSnap={target:b,x:candidateX,y:candidateY,overlap,dir:'v'};
        }
      }
    }

    // ── HORIZONTAL snap (side by side, same row) ──
    // candidateY = b.ty exactly (match the row of the target brick)
    if(Math.abs(rawY-b.ty)<BSTK*0.75){
      const candidateY=b.ty;
      const candidateXL=b.tx-bw/2-dw/2;
      const candidateXR=b.tx+bw/2+dw/2;
      for(const candidateX of [candidateXL,candidateXR]){
        if(hasBodyOverlapAt(dragBrick,candidateX,candidateY)) continue;
        const dist=Math.hypot(rawX-candidateX,rawY-candidateY);
        if(dist<SNAP_RADIUS*1.5&&dist<best){
          best=dist;
          bestSnap={target:b,x:candidateX,y:candidateY,overlap:1,dir:'h'};
        }
      }
    }
  }
  return bestSnap;
}
function isGroupPlacementValid(gd,anchorX,anchorY){
  if(!gd||!gd.members) return true;
  const movingSet=new Set(gd.members.map(m=>m.b));
  for(const m of gd.members){
    const tx=anchorX+m.dx, ty=anchorY+m.dy;
    if(hasBodyOverlapAt(m.b,tx,ty,movingSet)) return false;
  }
  return true;
}

function computeLayerAtPosition(tx,ty,view,rotated,size,depth){
  if(view==='top') return 0;
  const self={view,rotated,size:size||4,depth:depth||1};
  const fp=brickFootprintHalf(self);
  const hw=fp.hx,hh=fp.hy;
  let maxL=-1;
  for(const b of bricks){
    if(b===dragBrick) continue;
    if(b.view!==view) continue;
    if(view==='front'&&!!b.rotated!==!!rotated) continue;
    const bfp=brickFootprintHalf(b);
    if(Math.abs(tx-b.tx)<hw+bfp.hx&&Math.abs(ty-b.ty)<hh+bfp.hy) maxL=Math.max(maxL,b.layer||0);
  }
  return maxL>=0?maxL+1:0;
}

function snapToGrid(){
  if(!dragBrick) return;
  const b=dragBrick;
  const w=(b.view==='side'||b.rotated)?BH:brickW(b.size);
  const sx2=Math.round(b.tx/w)*w;
  if(Math.abs(b.tx-sx2)<12) b.tx=b.x=sx2;
  if(b.view==='top') return;
  const myL=b.layer||0;
  let peers;
  if(b.view==='front'){
    peers=bricks.filter(ob=>ob!==b&&ob.view==='front'&&(ob.layer||0)===myL);
  } else if(b.view==='side'){
    peers=bricks.filter(ob=>ob!==b&&ob.view==='side'&&(ob.layer||0)===myL&&Math.abs(ob.tx-b.tx)<U*0.25);
  } else {
    peers=[];
  }
  if(peers.length){
    const tys=peers.map(ob=>ob.ty).sort((a,c)=>a-c);
    const med=tys[Math.floor(tys.length/2)];
    if(Math.abs(b.ty-med)<BSTK*0.55) b.ty=b.y=med;
  } else {
    let bestDy=Infinity,bestY=b.ty;
    for(const ob of bricks){
      if(ob===b) continue;
      const dy=Math.abs(b.ty-ob.ty);
      if(dy<BSTK*0.4&&dy<bestDy){bestDy=dy;bestY=ob.ty;}
    }
    if(bestDy<BSTK*0.4) b.ty=b.y=bestY;
  }
}

// ════════════════════════════════════════════════════════════
//  SAVE
// ════════════════════════════════════════════════════════════
function saveClean(){
  const oc=document.createElement('canvas');oc.width=canvas.width;oc.height=canvas.height;
  const oc2=oc.getContext('2d');
  const W=oc.width,H=oc.height,buf=new Uint8ClampedArray(W*H*4);buf.fill(255);
  const sorted=bricks.slice().sort(compareBricksForPaint);
  for(const b of sorted){
    if(b.customStyle) continue;
    const bx=b.tx,by=b.ty,iv=Math.max(4.5,6-(b.layer||0)*.35),rw=Math.max(iv*.22,1.2),strokeW=1.0;
    const covered=getCoveredStudXs(b,bx,by,bricks,true);
    const visStuds=getStudCenters(bx,by,b.view,b.rotated,b.size,b.depth)
      .filter(st=>!covered.has(Math.round(st.sx)));
    const isoPaintSave=perspectiveUsesIsoSnap()&&b.view==='front'&&!b.rotated
      ?isoSketchStudPaintIndices(bx,by,b.size,b.depth,covered,false)
      :null;
    const isoBodyQuadsSave=isoPaintSave?isoSketchFaceQuads6(isoPaintSave.P):null;
    const isoStudGeomsSave=isoPaintSave?isoPaintSave.vis.map(i=>isoSketchStudGeomFor(isoPaintSave.P,i)):null;
    const bd=getBounds(bx,by,b.view,b.rotated,b.size,b.depth);
    const x0=Math.max(0,Math.floor(bd.x0)),x1=Math.min(W-1,Math.ceil(bd.x1));
    const y0=Math.max(0,Math.floor(bd.y0)),y1=Math.min(H-1,Math.ceil(bd.y1));
    for(let py=y0;py<=y1;py++){for(let px=x0;px<=x1;px++){
      const dc=isoBodyQuadsSave
        ?sdfIsoPrism6FromQuads(px+.5,py+.5,isoBodyQuadsSave)
        :sdfBody(px+.5,py+.5,bx,by,b.view,b.rotated,b.size,b.depth);
      let df=dc;
      if(isoStudGeomsSave){
        for(const g of isoStudGeomsSave) df=Math.min(df,sdfIsoStudGeom(px+.5,py+.5,g));
      }else for(const st of visStuds) df=Math.min(df,sdBox(px+.5,py+.5,st.sx,st.sy,st.hw,st.hh,SR));
      const i=(py*W+px)*4;
      if(brickStyle==='outline'||brickStyle==='dashed'){
        if(dc<=0){
          buf[i]=buf[i+1]=buf[i+2]=0;buf[i+3]=0;
        }
      } else {
        if(dc<=0){buf[i]=buf[i+1]=buf[i+2]=255;if(df<=0&&(Math.abs(df)%iv)<rw)buf[i]=buf[i+1]=buf[i+2]=20;}
        else if(df<=0){let t=-1;for(const st of visStuds){const nx=(px+.5-st.sx)/st.hw,ny=(py+.5-st.sy)/st.hh,e=nx*nx+ny*ny;if(e<=1){t=Math.max(0,1-e);break;}}
          if(t>=0)buf[i]=buf[i+1]=buf[i+2]=Math.min(255,Math.round(20+t*42));
          else if((Math.abs(df)%iv)<rw)buf[i]=buf[i+1]=buf[i+2]=20;
        }
      }
    }}
    if(brickStyle==='outline'||brickStyle==='dashed'){
      if(!(perspectiveUsesIsoSnap()&&b.view==='front'&&!b.rotated))
        drawBodyEdges(buf,W,H,b,bx,by,20,sorted);
    }
  }
  const id=oc2.createImageData(W,H);id.data.set(buf);oc2.putImageData(id,0,0);
  for(const b of sorted){
    if(!b.customStyle) continue;
    const bd=getBounds(b.tx,b.ty,b.view,b.rotated,b.size);
    const pad=6;
    const rx=Math.max(0,Math.floor(bd.x0-pad)),ry=Math.max(0,Math.floor(bd.y0-pad));
    const rw=Math.min(W-rx,Math.ceil(bd.x1-bd.x0+pad*2+1));
    const rh=Math.min(H-ry,Math.ceil(bd.y1-bd.y0+pad*2+1));
    if(rw<=0||rh<=0) continue;
    const off=document.createElement('canvas');off.width=rw;off.height=rh;
    const octx=off.getContext('2d');
    octx.fillStyle='#fff';octx.fillRect(0,0,rw,rh);
    renderCustomBrick(octx,b.tx-rx,b.ty-ry,b.customStyle,28/16,b.view,b.rotated,b.size);
    const od=octx.getImageData(0,0,rw,rh).data;
    const md=oc2.getImageData(rx,ry,rw,rh);const md2=md.data;
    for(let i=0;i<od.length;i+=4){
      if(od[i]<245||od[i+1]<245||od[i+2]<245){
        md2[i]=od[i];md2[i+1]=od[i+1];md2[i+2]=od[i+2];md2[i+3]=255;
      }
    }
    oc2.putImageData(md,rx,ry);
  }
  drawVectorIsoWireframeOn(oc2,sorted,true,'#141414');
  drawVectorStudOutlinesOn(oc2,sorted,true,'#141414');
  const a=document.createElement('a');
  a.download=currentComp&&currentComp.name==='Alphabet'?'brick_letter_'+(LETTERS[currentLetterIndex]||'A')+'.png':
    currentComp&&currentComp.name==='Word'?'brick_word_'+currentWord+'.png':
    currentComp&&currentComp.name==='Imported'?'brick_imported.png':
    'brick_'+String(resultCount).padStart(3,'0')+'.png';
  a.href=oc.toDataURL('image/png');a.click();
}
