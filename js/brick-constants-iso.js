// ── Brick constants ──
const U=28, BW=U*4, BH=U*1.2, SW=U*0.56, SH=U*0.35, BR=U*0.06, SR=U*0.04;
const BRICK_UNITS=[1,2,3,4];
const BRICK_DEPTHS=[1,2];
const BRICK_ADD_SPECS=[
  {id:'random',label:'Random',size:null,depth:null},
  {id:'1x1',label:'1x1',size:1,depth:1},
  {id:'1x2',label:'1x2',size:2,depth:1},
  {id:'1x3',label:'1x3',size:3,depth:1},
  {id:'1x4',label:'1x4',size:4,depth:1},
  {id:'2x2',label:'2x2',size:2,depth:2},
  {id:'2x3',label:'2x3',size:3,depth:2},
  {id:'2x4',label:'2x4',size:4,depth:2},
];
const BSTK=BH+SH, SNAP_RADIUS=BH*1.2;
/** Side elevation only: stack centers slightly tighter than BSTK so lower studs tuck under the upper body (realistic interlock). */
const SIDE_STACK_OVERLAP=Math.min(10,SH*0.52);
const SIDE_STACK_Y=BSTK-SIDE_STACK_OVERLAP;
// Row-normalize / integer ty can drift a few px from ideal BSTK spacing; keep stack logic tolerant.
const STUD_STACK_Y_TOL=Math.max(8,BSTK*0.14);
const COVERED_STUD_Y_TOL=Math.max(10,BSTK*0.22);
/** Top (plan): face-to-face gap along width/depth so stud circles tuck slightly (same idea as SIDE_STACK_Y). */
const TOP_PLATE_TUCK=Math.min(8,SW*0.38);
/** Fallback dy scale if BSTK is degenerate; normal iso uses SIDE_STACK_Y/BSTK per composition step. */
const ISO_Y_SCALE=0.375;
const COVER_STUD_ISO_DY_TOL=Math.max(8,BSTK*0.16);

function perspectiveUsesIsoSnap(){
  return currentPersp&&currentPersp.name==='Isometric';
}
/** Front bricks placed via a linear map (composition Δ → canvas); stud stack uses inverse pitch. */
function perspectiveUsesAffineFrontSnap(){
  return perspectiveUsesIsoSnap();
}
function affineDyPerPhysicalStack(){
  if(perspectiveUsesIsoSnap()) return BSTK;
  return null;
}
function affineStackDeltaDy(){
  const d=affineDyPerPhysicalStack();
  return d==null?null:-d;
}
function isoCanvasFromLogical(cx,cy,dx,dy){
  const e=BSTK>1e-6?SIDE_STACK_Y/BSTK:ISO_Y_SCALE;
  return{tx:cx+(dx-dy*.3)*.75,ty:cy+dx*.25*.75+dy*e};
}
function isoLogicalFromCanvas(cx,cy,tx,ty){
  const dTx=tx-cx,dTy=ty-cy;
  const e=BSTK>1e-6?SIDE_STACK_Y/BSTK:ISO_Y_SCALE;
  const det=0.75*e+0.225*0.1875;
  return{dx:(e*dTx+0.225*dTy)/det,dy:(-0.1875*dTx+0.75*dTy)/det};
}
function affineCanvasFromLogical(cx,cy,dx,dy){
  return isoCanvasFromLogical(cx,cy,dx,dy);
}
function affineLogicalFromCanvas(cx,cy,tx,ty){
  if(perspectiveUsesIsoSnap()) return isoLogicalFromCanvas(cx,cy,tx,ty);
  return null;
}
function getBrickIsoLogicalAt(b,tx,ty,cx,cy){
  if(!b||b.view!=='front'||b.rotated) return null;
  if(b.isoDx!=null&&b.isoDy!=null&&Math.abs((b.tx||0)-tx)<0.5&&Math.abs((b.ty||0)-ty)<0.5)
    return{dx:b.isoDx,dy:b.isoDy};
  const L=affineLogicalFromCanvas(cx,cy,tx,ty);
  return L||null;
}
function syncFrontBricksIsoFromCanvas(){
  if(!perspectiveUsesAffineFrontSnap()||typeof canvas==='undefined'||!canvas) return;
  const cx=canvas.width/2, cy=canvas.height/2;
  for(const b of bricks){
    if(b.view!=='front'||b.rotated) continue;
    const L=affineLogicalFromCanvas(cx,cy,b.tx,b.ty);
    if(!L) continue;
    b.isoDx=L.dx; b.isoDy=L.dy;
  }
}

/** p5 sketch.js isometric: gx right-forward, gy left-forward, gz up; one stud step length = U. */
function isoSketchTileFromU(uPx){
  const k=uPx/Math.sqrt(5);
  return{tW:4*k,tH:2*k};
}
function isoSketchToScreen(gx,gy,gz,tW,tH,ox,oy){
  return{x:ox+(gx-gy)*(tW*0.5),y:oy+(gx+gy)*(tH*0.5)-gz};
}
/** Body center (nx/2, ny/2, BH/2) maps to (bx,by) — same anchor as orthographic body center. */
function isoSketchBrickPack(bx,by,size,depth){
  const vs=getActiveWordVisualScale();
  const u=U*vs,nx=size||4,ny=Math.max(1,depth||1);
  const{tW,tH}=isoSketchTileFromU(u);
  const BH0=BH*vs,SH0=SH*vs;
  const pMid=isoSketchToScreen(nx*0.5,ny*0.5,BH0*0.5,tW,tH,0,0);
  return{ox:bx-pMid.x,oy:by-pMid.y,tW,tH,nx,ny,BH:BH0,SH:SH0,vs,u};
}
/** Stud row on the top face (gy = ½): one row of `size` studs, same count as legacy iso. */
function isoSketchStudGy(){
  return 0.5;
}
function sdSegment2(px,py,x1,y1,x2,y2){
  const vx=x2-x1,vy=y2-y1,qx=px-x1,qy=py-y1;
  const t0=vx*vx+vy*vy;
  const t=t0>1e-14?Math.max(0,Math.min(1,(vx*qx+vy*qy)/t0)):0;
  const bx=x1+t*vx,by=y1+t*vy;
  return Math.hypot(px-bx,py-by);
}
function pointInPoly(px,py,pts){
  let c=false;
  for(let i=0,j=pts.length-1;i<pts.length;j=i++){
    const a=pts[i],b=pts[j];
    if((a.y>py)!==(b.y>py)&&px<(b.x-a.x)*(py-a.y)/(b.y-a.y+1e-18)+a.x)c=!c;
  }
  return c;
}
function sdQuadMajor(px,py,q){
  let m=1e9;
  for(let i=0;i<4;i++){
    const a=q[i],b=q[(i+1)%4];
    m=Math.min(m,sdSegment2(px,py,a.x,a.y,b.x,b.y));
  }
  return pointInPoly(px,py,q)?-m:m;
}
function isoSketchFaceQuads6(P){
  const{tW,tH,ox,oy,nx,ny,BH}=P;
  const S=(gx,gy,gz)=>isoSketchToScreen(gx,gy,gz,tW,tH,ox,oy);
  const bot=[S(0,0,0),S(nx,0,0),S(nx,ny,0),S(0,ny,0)];
  const top=[S(0,0,BH),S(nx,0,BH),S(nx,ny,BH),S(0,ny,BH)];
  const gx0=[S(0,0,0),S(0,ny,0),S(0,ny,BH),S(0,0,BH)];
  const gx1=[S(nx,0,0),S(nx,ny,0),S(nx,ny,BH),S(nx,0,BH)];
  const gy0=[S(0,0,0),S(nx,0,0),S(nx,0,BH),S(0,0,BH)];
  const gy1=[S(0,ny,0),S(nx,ny,0),S(nx,ny,BH),S(0,ny,BH)];
  return[bot,top,gx0,gx1,gy0,gy1];
}
/** Precomputed six face quads — reuse inside per-pixel raster loops (was rebuilding every pixel). */
function sdfIsoPrism6FromQuads(px,py,quads6){
  let d=1e9;
  for(let k=0;k<quads6.length;k++) d=Math.min(d,sdQuadMajor(px,py,quads6[k]));
  return d;
}
function sdfIsoPrism6(px,py,P){
  if(!P._quads6) P._quads6=isoSketchFaceQuads6(P);
  return sdfIsoPrism6FromQuads(px,py,P._quads6);
}
function sdEllipseIQ(px,py,cx,cy,rx,ry){
  if(rx<1e-6||ry<1e-6) return 1e9;
  const k=Math.hypot((px-cx)/rx,(py-cy)/ry);
  return(k-1)*Math.min(rx,ry);
}
function isoSketchStudGeomFor(P,i){
  const gyS=isoSketchStudGy();
  const{tW,tH,ox,oy,BH,SH}=P;
  const rx=(P.tW*0.52)*0.5,ry=(P.tH*0.52)*0.5;
  return{
    sc:isoSketchToScreen(i+0.5,gyS,BH,tW,tH,ox,oy),
    st:isoSketchToScreen(i+0.5,gyS,BH+SH,tW,tH,ox,oy),
    rx,ry
  };
}
function sdfIsoStudGeom(px,py,g){
  let d=Math.min(sdEllipseIQ(px,py,g.sc.x,g.sc.y,g.rx,g.ry),sdEllipseIQ(px,py,g.st.x,g.st.y,g.rx,g.ry));
  d=Math.min(d,sdSegment2(px,py,g.sc.x-g.rx,g.sc.y,g.st.x-g.rx,g.st.y),sdSegment2(px,py,g.sc.x+g.rx,g.sc.y,g.st.x+g.rx,g.st.y));
  return d;
}
function sdfIsoStudAt(px,py,P,i){
  return sdfIsoStudGeom(px,py,isoSketchStudGeomFor(P,i));
}
function sdfIsoStudRow(px,py,P){
  let d=1e9;
  for(let i=0;i<P.nx;i++) d=Math.min(d,sdfIsoStudAt(px,py,P,i));
  return d;
}
/** Visible stud column indices (matches getStudCenters + covered filter). */
function isoSketchStudPaintIndices(bx,by,size,depth,coveredStudXs,uniformVisual){
  const P=isoSketchBrickPack(bx,by,size,depth);
  const gyS=isoSketchStudGy();
  const{tW,tH,ox,oy,BH,SH}=P;
  const vis=[];
  for(let i=0;i<P.nx;i++){
    const p=isoSketchToScreen(i+0.5,gyS,BH+SH*0.5,tW,tH,ox,oy);
    if(uniformVisual||!coveredStudXs||!coveredStudXs.has(Math.round(p.x))) vis.push(i);
  }
  return{P,vis};
}
/** Painter order: farther tiles first so nearer bricks (and studs) occlude correctly in LINE mode. */
function compareBricksForPaint(a,b){
  const ld=(a.layer||0)-(b.layer||0);
  if(ld!==0) return ld;
  if(perspectiveUsesIsoSnap()&&a.view==='front'&&b.view==='front'&&!a.rotated&&!b.rotated){
    const ka=(a.tx||0)+(a.ty||0), kb=(b.tx||0)+(b.ty||0);
    if(Math.abs(ka-kb)>0.5) return ka-kb;
    const da=(a.isoDx??0)+(a.isoDy??0), db=(b.isoDx??0)+(b.isoDy??0);
    if(Math.abs(da-db)>0.5) return da-db;
    return (b.ty||0)-(a.ty||0);
  }
  return (a.ty||0)-(b.ty||0);
}
function isoSketchVisibleFacePolygons(P){
  const{tW,tH,ox,oy,nx,ny,BH}=P;
  const S=(gx,gy,gz)=>isoSketchToScreen(gx,gy,gz,tW,tH,ox,oy);
  const right=[S(nx,0,BH),S(nx,ny,BH),S(nx,ny,0),S(nx,0,0)];
  const left=[S(0,ny,BH),S(nx,ny,BH),S(nx,ny,0),S(0,ny,0)];
  const top=[S(0,0,BH),S(nx,0,BH),S(nx,ny,BH),S(0,ny,BH)];
  return[right,left,top];
}
function isoGetFacePolygons(bx,by,size,depth){
  return isoSketchVisibleFacePolygons(isoSketchBrickPack(bx,by,size,depth));
}
function isoBoundsExpand(bx,by,size,depth){
  let X0=Infinity,Y0=Infinity,X1=-Infinity,Y1=-Infinity;
  const ex=(p)=>{X0=Math.min(X0,p.x);X1=Math.max(X1,p.x);Y0=Math.min(Y0,p.y);Y1=Math.max(Y1,p.y);};
  const P=isoSketchBrickPack(bx,by,size,depth);
  for(const poly of isoSketchVisibleFacePolygons(P)) for(const p of poly) ex(p);
  const gyS=isoSketchStudGy();
  const eW=P.tW*0.52,eH=P.tH*0.52,rx=eW*0.5,ry=eH*0.5;
  const{tW,tH,ox,oy,BH,SH}=P;
  for(let i=0;i<P.nx;i++){
    const sc=isoSketchToScreen(i+0.5,gyS,BH,tW,tH,ox,oy);
    const st=isoSketchToScreen(i+0.5,gyS,BH+SH,tW,tH,ox,oy);
    ex({x:sc.x-rx,y:sc.y-ry}); ex({x:sc.x+rx,y:sc.y+ry});
    ex({x:st.x-rx,y:st.y-ry}); ex({x:st.x+rx,y:st.y+ry});
  }
  return{X0,Y0,X1,Y1};
}
function bufSetPx(buf,W,H,x,y,col){
  if(x>=0&&y>=0&&x<W&&y<H){const i=(y*W+x)*4;buf[i]=buf[i+1]=buf[i+2]=col;buf[i+3]=255;}
}
function bufLine(buf,W,H,x0,y0,x1,y1,col){
  x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);
  let dx=Math.abs(x1-x0),dy=Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1,err=dx-dy,x=x0,y=y0;
  while(true){
    bufSetPx(buf,W,H,x,y,col);
    if(x===x1&&y===y1) break;
    const e2=2*err;
    if(e2>-dy){err-=dy;x+=sx;}
    if(e2<dx){err+=dx;y+=sy;}
  }
}
function bufPolyStroke(buf,W,H,pts,col){
  for(let i=0;i<pts.length;i++){
    const j=(i+1)%pts.length,a=pts[i],b=pts[j];
    bufLine(buf,W,H,a.x,a.y,b.x,b.y,col);
  }
}
function bufEllipseStroke(buf,W,H,cx,cy,rx,ry,col){
  rx=Math.max(1.1,rx); ry=Math.max(1.1,ry);
  const steps=Math.max(40,Math.ceil((rx+ry)*0.85));
  for(let k=0;k<steps;k++){
    const t=(k/steps)*Math.PI*2;
    bufSetPx(buf,W,H,Math.round(cx+Math.cos(t)*rx),Math.round(cy+Math.sin(t)*ry),col);
  }
}
function drawIsoPrismEdges(buf,W,H,b,bx,by,col){
  for(const poly of isoGetFacePolygons(bx,by,b.size,b.depth)) bufPolyStroke(buf,W,H,poly,col);
}
function sdfIsoFront(px,py,bx,by,rotated,size,depth){
  if(rotated) return sdfSide(px,py,bx,by,size);
  const P=isoSketchBrickPack(bx,by,size,depth);
  const quads6=isoSketchFaceQuads6(P);
  return Math.min(sdfIsoPrism6FromQuads(px,py,quads6),sdfIsoStudRow(px,py,P));
}
