// ════════════════════════════════════════════════════════════
//  RENDER
// ════════════════════════════════════════════════════════════
let _buf=null,_bgCache=null;
let _renderQueued=false;
function queueRender(){
  if(_renderQueued) return;
  _renderQueued=true;
  requestAnimationFrame(()=>{
    _renderQueued=false;
    renderFrame();
  });
}

function renderBrickToBuf(buf,W,H,b,bx,by,col,coveredStudXs,seamBrickList){
  const uniformVisual=!!dragBrick||!!groupDrag||!!touchGesture;
  const iv=b.interval||6,rw=Math.max(iv*.22,1.2);
  const bd=getBounds(bx,by,b.view,b.rotated,b.size,b.depth);
  const x0=Math.max(0,Math.floor(bd.x0)),x1=Math.min(W-1,Math.ceil(bd.x1));
  const y0=Math.max(0,Math.floor(bd.y0)),y1=Math.min(H-1,Math.ceil(bd.y1));
  const strokeW=1.0;
  const visibleStuds=getStudCenters(bx,by,b.view,b.rotated,b.size,b.depth)
    .filter(st=>uniformVisual||!coveredStudXs||!coveredStudXs.has(Math.round(st.sx)));
  const isoPaint=perspectiveUsesIsoSnap()&&b.view==='front'&&!b.rotated
    ?isoSketchStudPaintIndices(bx,by,b.size,b.depth,coveredStudXs,uniformVisual)
    :null;
  const isoBodyQuads=isoPaint?isoSketchFaceQuads6(isoPaint.P):null;
  const isoStudGeoms=isoPaint?isoPaint.vis.map(i=>isoSketchStudGeomFor(isoPaint.P,i)):null;
  for(let py=y0;py<=y1;py++){
    for(let px=x0;px<=x1;px++){
      const db=isoBodyQuads
        ?sdfIsoPrism6FromQuads(px+.5,py+.5,isoBodyQuads)
        :sdfBody(px+.5,py+.5,bx,by,b.view,b.rotated,b.size,b.depth);
      let df=db;
      if(isoStudGeoms){
        for(const g of isoStudGeoms) df=Math.min(df,sdfIsoStudGeom(px+.5,py+.5,g));
      }else for(const st of visibleStuds)
        df=Math.min(df,sdBox(px+.5,py+.5,st.sx,st.sy,st.hw,st.hh,SR));
      const i=(py*W+px)*4;
      if(brickStyle==='outline'||brickStyle==='dashed'){
        if(db<=0){
          buf[i]=buf[i+1]=buf[i+2]=0;buf[i+3]=0;
        }
      } else {
        if(db<=0){
          buf[i]=buf[i+1]=buf[i+2]=255;
          if((Math.abs(df)%iv)<rw) buf[i]=buf[i+1]=buf[i+2]=col;
        } else if(df<=0){
          let t=-1;
          for(const st of visibleStuds){
            const nx=(px+.5-st.sx)/st.hw,ny=(py+.5-st.sy)/st.hh,e=nx*nx+ny*ny;
            if(e<=1){t=Math.max(t,Math.max(0,1-e));break;}
          }
          if(t>=0){const sc2=Math.round(col+t*42);buf[i]=buf[i+1]=buf[i+2]=Math.min(255,sc2);}
          else if((Math.abs(df)%iv)<rw){buf[i]=buf[i+1]=buf[i+2]=col;}
        }
      }
    }
  }
  if(brickStyle==='outline'||brickStyle==='dashed'){
    const seamList=seamBrickList!=null?seamBrickList:bricks;
    if(!(perspectiveUsesIsoSnap()&&b.view==='front'&&!b.rotated))
      drawBodyEdges(buf,W,H,b,bx,by,col,uniformVisual?[b]:seamList);
  }
}

function normalizeParallelRows(list){
  if(!list||!list.length) return;
  const tol=Math.max(3,Math.min(12,BSTK*0.22));
  const rows=[];
  const sorted=list.slice().sort((a,b)=>a.ty-b.ty);
  for(const b of sorted){
    let r=rows.find(rr=>Math.abs(rr.y-b.ty)<=tol);
    if(!r){ r={y:b.ty,arr:[]}; rows.push(r); }
    r.arr.push(b);
    r.y=r.arr.reduce((s,x)=>s+x.ty,0)/r.arr.length;
  }
  for(const r of rows){
    const y=Math.round(r.arr.reduce((s,x)=>s+x.ty,0)/r.arr.length);
    for(const b of r.arr){ b.ty=b.y=y; }
  }
}
function quantizeBrickPositions(list){
  if(!list) return;
  for(const b of list){
    b.tx=Math.round(b.tx); b.ty=Math.round(b.ty);
    b.x=b.tx; b.y=b.ty;
  }
}
function enforceMovedBricksEmbedding(moved){
  if(!moved||!moved.length) return;
  const movedSet=new Set(moved);
  const xTolFactor=0.85;
  const minGap=BSTK*0.82;
  for(const mb of moved){
    if(mb.view==='front'){
      const mhw=mb.rotated?BH/2:brickW(mb.size)/2;
      for(const ob of bricks){
        if(ob===mb||movedSet.has(ob)||ob.view!=='front') continue;
        const ohw=ob.rotated?BH/2:brickW(ob.size)/2;
        const xOverlap=Math.abs(mb.tx-ob.tx)<(mhw+ohw)*xTolFactor;
        if(!xOverlap) continue;
        const dy=mb.ty-ob.ty;
        const ady=Math.abs(dy);
        if(ady<=2||ady>=minGap) continue;
        const s=dy>=0?1:-1;
        const sameRowDelta=Math.abs(mb.ty-ob.ty);
        const stackDelta=Math.abs(mb.ty-(ob.ty+s*BSTK));
        mb.ty=(sameRowDelta<=stackDelta)?ob.ty:(ob.ty+s*BSTK);
        mb.y=mb.ty;
      }
    } else if(mb.view==='side'){
      for(const ob of bricks){
        if(ob===mb||movedSet.has(ob)||ob.view!=='side') continue;
        if(Math.abs(mb.tx-ob.tx)>U*0.2) continue;
        const dy=mb.ty-ob.ty;
        const ady=Math.abs(dy);
        if(ady<=2||ady>=minGap) continue;
        const s=dy>=0?1:-1;
        const sameRowDelta=Math.abs(mb.ty-ob.ty);
        const stackDelta=Math.abs(mb.ty-(ob.ty+s*SIDE_STACK_Y));
        mb.ty=(sameRowDelta<=stackDelta)?ob.ty:(ob.ty+s*SIDE_STACK_Y);
        mb.y=mb.ty;
      }
    } else if(mb.view==='top'){
      const mhw=brickW(mb.size)/2, mhd=Math.max(1,mb.depth||1)*U/2;
      for(const ob of bricks){
        if(ob===mb||movedSet.has(ob)||ob.view!=='top') continue;
        const ohw=brickW(ob.size)/2, ohd=Math.max(1,ob.depth||1)*U/2;
        if(Math.abs(mb.tx-ob.tx)<U*0.35){
          const dy=mb.ty-ob.ty, ady=Math.abs(dy);
          const sep=mhd+ohd-TOP_PLATE_TUCK;
          const flush=mhd+ohd;
          if(ady>4&&ady<flush+U){
            const s=dy>=0?1:-1;
            if(Math.abs(ady-sep)<Math.abs(ady-flush)){ mb.ty=ob.ty+s*sep; mb.y=mb.ty; }
          }
        }
        if(Math.abs(mb.ty-ob.ty)<U*0.35){
          const dx=mb.tx-ob.tx, adx=Math.abs(dx);
          const sep=mhw+ohw-TOP_PLATE_TUCK;
          const flush=mhw+ohw;
          if(adx>4&&adx<flush+U){
            const s=dx>=0?1:-1;
            if(Math.abs(adx-sep)<Math.abs(adx-flush)){ mb.tx=ob.tx+s*sep; mb.x=mb.tx; }
          }
        }
      }
    }
  }
}
function normalizeParallelRowsGlobal(){
  const front=bricks.filter(b=>b.view==='front');
  if(!front.length) return;
  // Visual-row alignment should not depend on layer.
  normalizeParallelRows(front);
}

/** Half-extents of brick body in canvas X/Y (matches getBounds / side elevation width BH). */
function brickFootprintHalf(b){
  if(!b) return{hx:BW/2,hy:BH/2};
  const hh=BH/2;
  if(b.view==='side'||b.rotated) return{hx:BH/2,hy:hh};
  if(b.view==='top') return{hx:brickW(b.size)/2,hy:Math.max(1,b.depth||1)*U/2};
  if(perspectiveUsesIsoSnap()&&!b.rotated){
    const bd=getBounds(b.tx,b.ty,b.view,b.rotated,b.size,b.depth);
    return{hx:(bd.x1-bd.x0)/2,hy:(bd.y1-bd.y0)/2};
  }
  return{hx:brickW(b.size)/2,hy:hh};
}

function getSharedRightSeam(b,bx,by,list){
  if(!b||b.view==='top') return false;
  const hw=brickFootprintHalf(b).hx;
  const yTol=Math.max(1.2,BSTK*0.03);
  const xTol=0.9;
  for(const ob of (list||bricks)){
    if(ob===b||ob.view==='top'||ob.view!==b.view) continue;
    if((ob.layer||0)!==(b.layer||0)) continue;
    if(Math.abs(ob.ty-by)>yTol) continue;
    const ohw=brickFootprintHalf(ob).hx;
    if(Math.abs((bx+hw)-(ob.tx-ohw))<=xTol) return true;
  }
  return false;
}

function getSharedBottomSeam(b,bx,by,list){
  if(!b||b.view==='top') return false;
  const hh=brickFootprintHalf(b).hy;
  const yTol=0.9;
  const xTol=Math.max(1.2,U*0.08);
  const hw=brickFootprintHalf(b).hx;
  for(const ob of (list||bricks)){
    if(ob===b||ob.view==='top'||ob.view!==b.view) continue;
    if((ob.layer||0)!==(b.layer||0)) continue;
    const ohh=brickFootprintHalf(ob).hy;
    const ohw=brickFootprintHalf(ob).hx;
    if(Math.abs((by+hh)-(ob.ty-ohh))>yTol) continue;
    // horizontal overlap required
    if(Math.abs(bx-ob.tx)<(hw+ohw)-xTol) return true;
  }
  return false;
}

function drawBodyEdges(buf,W,H,b,bx,by,col,list){
  if(b.view==='top'){
    const hw=brickW(b.size)/2,hd=(b.depth||1)*U/2;
    const xL=Math.round(bx-hw),xR=Math.round(bx+hw),yT=Math.round(by-hd),yB=Math.round(by+hd);
    const setPx=(x,y)=>{ if(x>=0&&y>=0&&x<W&&y<H){ const i=(y*W+x)*4; buf[i]=buf[i+1]=buf[i+2]=col; buf[i+3]=255; } };
    for(let x=xL;x<=xR;x++){ setPx(x,yT); setPx(x,yB); }
    for(let y=yT;y<=yB;y++){ setPx(xL,y); setPx(xR,y); }
    return;
  }
  if(perspectiveUsesIsoSnap()&&b.view==='front'&&!b.rotated){
    drawIsoPrismEdges(buf,W,H,b,bx,by,col);
    return;
  }
  const hw=brickFootprintHalf(b).hx;
  const hh=brickFootprintHalf(b).hy;
  const xL=Math.round(bx-hw), xR=Math.round(bx+hw);
  const yT=Math.round(by-hh), yB=Math.round(by+hh);
  const sharedRight=getSharedRightSeam(b,bx,by,list);
  const sharedBottom=getSharedBottomSeam(b,bx,by,list);
  const setPx=(x,y)=>{ if(x>=0&&y>=0&&x<W&&y<H){ const i=(y*W+x)*4; buf[i]=buf[i+1]=buf[i+2]=col; buf[i+3]=255; } };
  for(let x=xL;x<=xR;x++) setPx(x,yT);          // top always
  for(let y=yT;y<=yB;y++) setPx(xL,y);          // left always
  if(!sharedRight)  for(let y=yT;y<=yB;y++) setPx(xR,y);
  if(!sharedBottom) for(let x=xL;x<=xR;x++) setPx(x,yB);
}

// Returns set of stud X positions (rounded) on brick b that are covered by upper bricks.
// Upper brick holes are at the same X positions as its own studs (stud-to-hole symmetry).
function getCoveredStudXs(b,bx,by,allBricks,locked){
  if(b.view==='top') return new Set();
  const myStuds=getStudCenters(bx,by,b.view,b.rotated,b.size,b.depth);
  if(!myStuds.length) return new Set();
  const covered=new Set();
  const cxIso=canvas.width/2, cyIso=canvas.height/2;
  for(const upper of allBricks){
    if(upper===b) continue;
    if(upper.view==='top') continue;
    // Upper brick one stack pitch above lower (tighter pitch in side elevation for stud interlock).
    if((upper.layer||0) <= (b.layer||0)) continue; // upper must be higher layer
    const ux=locked?upper.tx:upper.x;
    const uy=locked?upper.ty:upper.y;
    let stackOk=false;
    const affDy=affineDyPerPhysicalStack();
    if(affDy!=null&&perspectiveUsesAffineFrontSnap()&&b.view==='front'&&upper.view==='front'&&!b.rotated&&!upper.rotated){
      const bIso=getBrickIsoLogicalAt(b,bx,by,cxIso,cyIso);
      const uIso=getBrickIsoLogicalAt(upper,ux,uy,cxIso,cyIso);
      if(bIso&&uIso&&Math.abs(bIso.dx-uIso.dx)<U*0.45){
        const dySep=bIso.dy-uIso.dy;
        if(Math.abs(dySep-affDy)<COVER_STUD_ISO_DY_TOL) stackOk=true;
      }
    }
    if(!stackOk){
      if(perspectiveUsesAffineFrontSnap()&&b.view==='front'&&upper.view==='front'&&!b.rotated&&!upper.rotated){
        const sep=by-uy;
        const colTol=Math.max(BW*0.45,brickW(Math.max(b.size||4,upper.size||4))*0.55);
        if(sep>0&&Math.abs(ux-bx)<colTol){
          const pitchTucked=SIDE_STACK_Y;
          const pitchRaw=ISO_Y_SCALE*BSTK;
          if(Math.abs(sep-pitchTucked)<COVERED_STUD_Y_TOL*1.15||Math.abs(sep-pitchRaw)<COVERED_STUD_Y_TOL*1.35)
            stackOk=true;
        }
      }
    }
    if(!stackOk){
      const stackPitch=(upper.view==='side'&&b.view==='side')?SIDE_STACK_Y:BSTK;
      if(Math.abs((uy+stackPitch)-by)>COVERED_STUD_Y_TOL) continue;
    }
    const upperStuds=getStudCenters(ux,uy,upper.view,upper.rotated,upper.size,upper.depth);
    const holeXs=upperStuds.map(st=>st.sx);
    for(const st of myStuds){
      if(holeXs.some(hx=>Math.abs(st.sx-hx)<U*0.35)){
        covered.add(Math.round(st.sx));
      }
    }
  }
  return covered;
}
/** Same stroke settings as stud outlines — use for iso prism edges so all outline bricks match visually. */
function applyVectorBrickOutlineStyle(targetCtx,strokeColor){
  targetCtx.strokeStyle=strokeColor||'#141414';
  targetCtx.lineWidth=1.1;
  targetCtx.lineJoin='round';
  targetCtx.lineCap='round';
  if(brickStyle==='dashed') targetCtx.setLineDash([2,2]);
  else targetCtx.setLineDash([]);
}
/** Isometric outline/dash: same Canvas stroke as other views (AA), not buffer Bresenham (jagged). */
function drawVectorIsoWireframeOn(targetCtx,sorted,locked,strokeColor){
  if(!(brickStyle==='outline'||brickStyle==='dashed')) return;
  if(!perspectiveUsesIsoSnap()) return;
  const uniformV=!!dragBrick||!!groupDrag||!!touchGesture;
  targetCtx.save();
  applyVectorBrickOutlineStyle(targetCtx,strokeColor);
  for(const b of sorted){
    if(b.customStyle) continue;
    if(b.view!=='front'||b.rotated) continue;
    const bx=locked?b.tx:b.x,by=locked?b.ty:b.y;
    for(const poly of isoGetFacePolygons(bx,by,b.size,b.depth)){
      targetCtx.beginPath();
      targetCtx.moveTo(poly[0].x,poly[0].y);
      for(let i=1;i<poly.length;i++) targetCtx.lineTo(poly[i].x,poly[i].y);
      targetCtx.closePath();
      targetCtx.stroke();
    }
    const covered=getCoveredStudXs(b,bx,by,bricks,locked);
    const{P,vis}=isoSketchStudPaintIndices(bx,by,b.size,b.depth,covered,uniformV);
    const gyS=isoSketchStudGy(),rx=(P.tW*0.52)*0.5,ry=(P.tH*0.52)*0.5;
    const{tW,tH,ox,oy,BH,SH}=P;
    for(const i of vis){
      const sc=isoSketchToScreen(i+0.5,gyS,BH,tW,tH,ox,oy);
      const st=isoSketchToScreen(i+0.5,gyS,BH+SH,tW,tH,ox,oy);
      targetCtx.beginPath();
      targetCtx.ellipse(sc.x,sc.y,Math.max(0.5,rx),Math.max(0.5,ry),0,0,Math.PI*2);
      targetCtx.stroke();
      targetCtx.beginPath();
      targetCtx.ellipse(st.x,st.y,Math.max(0.5,rx),Math.max(0.5,ry),0,0,Math.PI*2);
      targetCtx.stroke();
      targetCtx.beginPath();
      targetCtx.moveTo(sc.x-rx,sc.y);
      targetCtx.lineTo(st.x-rx,st.y);
      targetCtx.stroke();
      targetCtx.beginPath();
      targetCtx.moveTo(sc.x+rx,sc.y);
      targetCtx.lineTo(st.x+rx,st.y);
      targetCtx.stroke();
    }
  }
  targetCtx.restore();
}
function drawVectorStudOutlinesOn(targetCtx,sorted,locked,strokeColor){
  if(!(brickStyle==='outline'||brickStyle==='dashed')) return;
  targetCtx.save();
  applyVectorBrickOutlineStyle(targetCtx,strokeColor);
  for(const b of sorted){
    if(b.customStyle) continue;
    const bx=locked?b.tx:b.x,by=locked?b.ty:b.y;
    if(perspectiveUsesIsoSnap()&&b.view==='front'&&!b.rotated) continue;
    const covered=getCoveredStudXs(b,bx,by,bricks,locked);
    const studs=getStudCenters(bx,by,b.view,b.rotated,b.size,b.depth)
      .filter(st=>!covered.has(Math.round(st.sx)));
    for(const st of studs){
      targetCtx.beginPath();
      targetCtx.ellipse(st.sx,st.sy,Math.max(1,st.hw),Math.max(1,st.hh),0,0,Math.PI*2);
      targetCtx.stroke();
    }
  }
  targetCtx.restore();
}
function drawVectorStudOutlines(sorted,locked){
  drawVectorStudOutlinesOn(ctx,sorted,locked,'#141414');
}

function renderFrame(){
  const W=canvas.width,H=canvas.height;
  if(!_buf||_buf.length!==W*H*4) _buf=new Uint8ClampedArray(W*H*4);
  const locked=phase==='holding';
  const sorted=bricks.slice().sort(compareBricksForPaint);

  // During drag: use cached background (all bricks except the dragged one)
  // to avoid re-rendering expensive custom bricks every mousemove frame
  if(dragBrick&&_bgCache&&_bgCache.length===W*H*4){
    _buf.set(_bgCache);
    // Draw just the dragged brick on top of the cached background
    const dragCovered=getCoveredStudXs(dragBrick,dragBrick.tx,dragBrick.ty,bricks,true);
    renderBrickToBuf(_buf,W,H,dragBrick,dragBrick.tx,dragBrick.ty,snapTarget&&snapTarget===dragBrick?90:20,dragCovered);
    const imgData=ctx.createImageData(W,H);imgData.data.set(_buf);ctx.putImageData(imgData,0,0);
    // If the dragged brick has a custom style, composite it without white-out
    if(dragBrick.customStyle){
      const bd=getBounds(dragBrick.tx,dragBrick.ty,dragBrick.view,dragBrick.rotated,dragBrick.size);
      const pad=6;
      const rx=Math.max(0,Math.floor(bd.x0-pad)),ry=Math.max(0,Math.floor(bd.y0-pad));
      const rw=Math.min(W-rx,Math.ceil(bd.x1-bd.x0+pad*2+1));
      const rh=Math.min(H-ry,Math.ceil(bd.y1-bd.y0+pad*2+1));
      if(rw>0&&rh>0){
        const off=document.createElement('canvas');off.width=rw;off.height=rh;
        const octx=off.getContext('2d');
        octx.fillStyle='#fff';octx.fillRect(0,0,rw,rh);
        renderCustomBrick(octx,dragBrick.tx-rx,dragBrick.ty-ry,dragBrick.customStyle,28/16,dragBrick.view,dragBrick.rotated,dragBrick.size);
        const od=octx.getImageData(0,0,rw,rh).data;
        const md=ctx.getImageData(rx,ry,rw,rh);const md2=md.data;
        for(let i=0;i<od.length;i+=4){
          if(od[i]<245||od[i+1]<245||od[i+2]<245){
            md2[i]=od[i];md2[i+1]=od[i+1];md2[i+2]=od[i+2];md2[i+3]=255;
          }
        }
        ctx.putImageData(md,rx,ry);
      }
    }
    drawVectorIsoWireframeOn(ctx,sorted,true,'#141414');
    drawVectorStudOutlines(sorted,true);
    drawSnapGuides(W,H);
    drawSelectionOverlay();
    if(phase==='holding') refreshShareSubmitUi();
    return;
  }

  _buf.fill(255);
  // Render all non-custom bricks into pixel buffer
  for(const b of sorted){
    const bx=locked?b.tx:b.x,by=locked?b.ty:b.y;
    const covered=getCoveredStudXs(b,bx,by,bricks,locked);
    if(!b.customStyle) renderBrickToBuf(_buf,W,H,b,bx,by,20,covered);
  }
  const imgData=ctx.createImageData(W,H);imgData.data.set(_buf);ctx.putImageData(imgData,0,0);
  // Custom-styled bricks: render to offscreen, composite only non-white pixels
  for(const b of sorted){
    if(!b.customStyle) continue;
    const bx=locked?b.tx:b.x,by=locked?b.ty:b.y;
    const bd=getBounds(bx,by,b.view,b.rotated,b.size,b.depth);
    const pad=6;
    const rx=Math.max(0,Math.floor(bd.x0-pad)),ry=Math.max(0,Math.floor(bd.y0-pad));
    const rw=Math.min(W-rx,Math.ceil(bd.x1-bd.x0+pad*2+1));
    const rh=Math.min(H-ry,Math.ceil(bd.y1-bd.y0+pad*2+1));
    if(rw<=0||rh<=0) continue;
    // Draw to offscreen
    const off=document.createElement('canvas');off.width=rw;off.height=rh;
    const octx=off.getContext('2d');
    octx.fillStyle='#fff';octx.fillRect(0,0,rw,rh);
    renderCustomBrick(octx,bx-rx,by-ry,b.customStyle,28/16,b.view,b.rotated,b.size);
    // Read pixels and composite: only overwrite where offscreen is not white
    const od=octx.getImageData(0,0,rw,rh).data;
    const md=ctx.getImageData(rx,ry,rw,rh);const md2=md.data;
    for(let i=0;i<od.length;i+=4){
      // If offscreen pixel is not near-white, overwrite main canvas
      if(od[i]<245||od[i+1]<245||od[i+2]<245){
        md2[i]=od[i];md2[i+1]=od[i+1];md2[i+2]=od[i+2];md2[i+3]=255;
      }
    }
    ctx.putImageData(md,rx,ry);
  }
  drawVectorIsoWireframeOn(ctx,sorted,locked,'#141414');
  drawVectorStudOutlines(sorted,locked);
  drawSnapGuides(W,H);
  drawSelectionOverlay();
  if(phase==='holding') refreshShareSubmitUi();
}

function drawSnapGuides(W,H){
  if(!dragBrick||!_lastSnap||viewMode!=='2d') return;
  const s=_lastSnap;
  const gx=s.x, gy=(s.dir==='h'&&s.target)?s.target.ty:s.y;
  _snapPulse+=0.18;
  const pulse=1+Math.sin(_snapPulse)*0.2;
  ctx.save();
  ctx.strokeStyle='rgba(30,30,30,0.42)';
  ctx.lineWidth=1;
  ctx.setLineDash([5,5]);
  if(s.dir==='v'){
    ctx.beginPath(); ctx.moveTo(gx,0); ctx.lineTo(gx,H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,gy); ctx.lineTo(W,gy); ctx.stroke();
  }else{
    ctx.beginPath(); ctx.moveTo(0,gy); ctx.lineTo(W,gy); ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.fillStyle='rgba(0,140,255,0.28)';
  ctx.beginPath(); ctx.arc(gx,gy,6*pulse,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='rgba(0,140,255,0.9)';
  ctx.lineWidth=1.2;
  ctx.beginPath(); ctx.arc(gx,gy,3.8,0,Math.PI*2); ctx.stroke();
  ctx.restore();
}
function drawSelectionOverlay(){
  if(viewMode!=='2d') return;
  ctx.save();
  for(const b of selectedBricks){
    const bd=getBounds(b.tx,b.ty,b.view,b.rotated,b.size);
    ctx.strokeStyle='rgba(0,140,255,.85)';
    ctx.lineWidth=1;
    ctx.setLineDash([4,3]);
    ctx.strokeRect(Math.floor(bd.x0)-1,Math.floor(bd.y0)-1,Math.ceil(bd.x1-bd.x0)+2,Math.ceil(bd.y1-bd.y0)+2);
  }
  if(marquee&&marquee.active){
    const x=Math.min(marquee.x0,marquee.x1),y=Math.min(marquee.y0,marquee.y1),w=Math.abs(marquee.x1-marquee.x0),h=Math.abs(marquee.y1-marquee.y0);
    ctx.fillStyle='rgba(0,140,255,.08)';
    ctx.strokeStyle='rgba(0,140,255,.65)';
    ctx.setLineDash([6,4]);
    ctx.fillRect(x,y,w,h);
    ctx.strokeRect(x,y,w,h);
  }
  ctx.restore();
}
