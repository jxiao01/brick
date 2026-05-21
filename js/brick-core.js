// ════════════════════════════════════════════════════════════
//  NOISE (Perlin — replaces p5.noise)
// ════════════════════════════════════════════════════════════
const _np = new Uint8Array(512);
(function(){ const p=new Uint8Array(256); for(let i=0;i<256;i++) p[i]=i;
  for(let i=255;i>0;i--){const j=Math.floor(Math.random()*(i+1));[p[i],p[j]]=[p[j],p[i]];}
  for(let i=0;i<512;i++) _np[i]=p[i&255]; })();
function vNoise(x,y){
  const X=Math.floor(x)&255, Y=Math.floor(y)&255;
  const xf=x-Math.floor(x), yf=y-Math.floor(y);
  const u=xf*xf*xf*(xf*(xf*6-15)+10), v=yf*yf*yf*(yf*(yf*6-15)+10);
  function g(h,dx,dy){h&=3;return(h<2?dx:-dx)+(h===0||h===3?dy:-dy);}
  const a=_np[X]+Y, b=_np[X+1]+Y;
  const n00=g(_np[a],  xf,  yf),  n10=g(_np[b],  xf-1,yf);
  const n01=g(_np[a+1],xf,  yf-1),n11=g(_np[b+1],xf-1,yf-1);
  const nx0=n00+(n10-n00)*u, nx1=n01+(n11-n01)*u;
  return (nx0+(nx1-nx0)*v)*0.5+0.5;
}

// ════════════════════════════════════════════════════════════
//  SKETCH4 RENDERING (vanilla JS translation)
// ════════════════════════════════════════════════════════════
function rnd(a,b){return Math.random()*(b-a)+a;}
function rndInt(a,b){return Math.floor(rnd(a,b));}
function rndItem(arr){return arr[Math.floor(Math.random()*arr.length)];}

function makeParams(){
  return {
    interval:  rnd(4,14),  lineGap:   rnd(2,9),
    lineAngle: rnd(-Math.PI*.75,Math.PI*.75),
    strokeWidth:rnd(1.0,2.2), ink:'#141414',
    dotSize:   rnd(1,4),   dotGap:    rnd(3,9),
    pixelSize: rnd(2,7),   waveAmp:   rnd(1,6),
    waveFreq:  rnd(.03,.12), noiseScale:rnd(.02,.09),
    radialRays:rndInt(12,72), studScale:rnd(.6,1.3),
    melt:      rnd(.2,.9), drift:     rnd(.3,1.5),
    stretchX:  rnd(.5,1.8), stretchY:  rnd(.5,1.8),
    stippleDensity:rnd(.06,.18),
  };
}

// ── SDF ──
function sdBox4(px,py,cx,cy,hw,hh,r){
  r=r||0; const qx=Math.abs(px-cx)-hw+r,qy=Math.abs(py-cy)-hh+r;
  return Math.min(Math.max(qx,qy),0)+Math.sqrt(Math.max(qx,0)**2+Math.max(qy,0)**2)-r;
}

function getSDF4(px,py,bx,by,sc,p,vm,ex){
  const u=BASE_U*sc,sh=p?p.studScale:1;
  const bw=u*4,bh=u*1.2,sw=u*.56,esh=u*.35*sh;
  if(vm==='melt'){
    const mt=p?p.melt:.5,r=u*.06+mt*bh*.45;
    let d=sdBox4(px,py,bx,by,bw/2,bh/2,r);
    const sr=u*.04+mt*sw*.35,top=by-bh/2;
    for(const sx of[bx-u*1.5,bx-u*.5,bx+u*.5,bx+u*1.5]) d=Math.min(d,sdBox4(px,py,sx,top-esh/2,sw/2,esh/2,sr));
    return d;
  }
  if(vm==='explode'){
    const dr=p?p.drift:1; let d=sdBox4(px,py,bx,by,bw/2,bh/2,u*.06);
    const top=by-bh/2;
    for(const sx of[bx-u*1.5,bx-u*.5,bx+u*.5,bx+u*1.5])
      d=Math.min(d,sdBox4(px,py,sx+(sx-bx)*dr*.4,top-esh/2-bh*.25*dr,sw/2,esh/2,u*.04));
    return d;
  }
  if(vm==='stretch'){
    const sxf=ex?ex.stretchX:1,syf=ex?ex.stretchY:1;
    let d=sdBox4(px,py,bx,by,bw*sxf/2,bh*syf/2,u*.06);
    const top=by-bh*syf/2;
    for(const sx of[bx-u*1.5*sxf,bx-u*.5*sxf,bx+u*.5*sxf,bx+u*1.5*sxf])
      d=Math.min(d,sdBox4(px,py,sx,top-esh*syf/2,sw*sxf/2,esh*syf/2,u*.04));
    return d;
  }
  if(vm==='shadow') return sdBox4(px,py,bx,by,bw/2,bh*.15,u*.06);
  if(vm==='body_only') return sdBox4(px,py,bx,by,bw/2,bh/2,u*.06);
  if(vm==='stud_only') return sdBox4(px,py,bx,by,sw/2,esh/2,u*.04);
  if(vm==='side_shape'){
    // Square side profile + one stud on top
    let d=sdBox4(px,py,bx,by,bh/2,bh/2,u*.06);
    d=Math.min(d,sdBox4(px,py,bx,by-bh/2-esh/2,sw/2,esh/2,u*.04));
    return d;
  }
  if(vm==='top_shape'){
    const hd=u*.5;
    let d=sdBox4(px,py,bx,by,bw/2,hd,u*.06);
    const spr=u*.04;
    for(const sx of[bx-u*1.5,bx-u*.5,bx+u*.5,bx+u*1.5])
      d=Math.min(d,sdBox4(px,py,sx,by,sw/2,sw/2,spr));
    return d;
  }
  let d=sdBox4(px,py,bx,by,bw/2,bh/2,u*.06);
  const top=by-bh/2;
  for(const sx of[bx-u*1.5,bx-u*.5,bx+u*.5,bx+u*1.5])
    d=Math.min(d,sdBox4(px,py,sx,top-esh/2,sw/2,esh/2,u*.04));
  return d;
}

function getBounds4(bx,by,sc,p,vm,ex){
  const u=BASE_U*sc,sh=p?p.studScale:1;
  const bw=u*4,bh=u*1.2,sw=u*.56,esh=u*.35*sh,pad=2;
  if(vm==='stretch'){const sxf=ex?ex.stretchX:1,syf=ex?ex.stretchY:1;
    return{x0:bx-bw*sxf/2-sw-pad,x1:bx+bw*sxf/2+sw+pad,y0:by-bh*syf/2-esh-pad,y1:by+bh*syf/2+pad};}
  if(vm==='shadow') return{x0:bx-bw/2-pad,x1:bx+bw/2+pad,y0:by-bh*.3-pad,y1:by+bh*.3+pad};
  if(vm==='body_only') return{x0:bx-bw/2-pad,x1:bx+bw/2+pad,y0:by-bh/2-pad,y1:by+bh/2+pad};
  if(vm==='stud_only') return{x0:bx-sw/2-pad,x1:bx+sw/2+pad,y0:by-esh/2-pad,y1:by+esh/2+pad};
  if(vm==='side_shape') return{x0:bx-bh/2-pad,x1:bx+bh/2+pad,y0:by-bh/2-esh-pad,y1:by+bh/2+pad};
  if(vm==='top_shape') return{x0:bx-bw/2-sw/2-pad,x1:bx+bw/2+sw/2+pad,y0:by-u*.5-sw/2-pad,y1:by+u*.5+sw/2+pad};
  return{x0:bx-bw/2-sw/2-pad,x1:bx+bw/2+sw/2+pad,y0:by-bh/2-esh-pad,y1:by+bh/2+pad};
}

function applyMethod4(ctx2,x,y,bx,by,d,mn,sc,p){
  const iv=p?p.interval:7, lg=p?p.lineGap:5, dg=p?p.dotGap:5,
        ds=p?p.dotSize:2,  ps=p?p.pixelSize:4, wa=p?p.waveAmp:3,
        wf=p?p.waveFreq:.08, ns=p?p.noiseScale:.04;
  const sw=Math.max(.6,Math.min(3.2,p&&p.strokeWidth?p.strokeWidth:1.5));
  const ink=(p&&p.ink)?p.ink:'#141414';
  ctx2.fillStyle=ink;
  switch(mn){
    case'Concentric':
      if((Math.abs(d)%iv)<sw) ctx2.fillRect(x,y,1,1); break;
    case'H-Lines':
      if(y%Math.max(2,lg)<sw) ctx2.fillRect(x,y,1,1); break;
    case'Diagonal':{
      const a=p?p.lineAngle:-Math.PI/4,pr=x*Math.cos(a)+y*Math.sin(a);
      if(Math.abs(pr%Math.max(2,lg))<sw) ctx2.fillRect(x,y,1,1); break;}
    case'Cross-Hatch':{
      const a=p?p.lineAngle:-Math.PI/4,pr=x*Math.cos(a)+y*Math.sin(a);
      if(y%Math.max(2,lg)<sw||Math.abs(pr%Math.max(2,lg))<sw) ctx2.fillRect(x,y,1,1); break;}
    case'Dots':
      if(x%Math.max(2,dg)<1.5&&y%Math.max(2,dg)<1.5){
        ctx2.beginPath();ctx2.arc(x,y,ds/2,0,Math.PI*2);ctx2.fill();} break;
    case'Stipple':
      {
        // Deterministic stipple so redraws are stable but still visibly dense.
        const h=Math.sin((x+bx*1.37)*12.9898+(y+by*1.91)*78.233)*43758.5453;
        const n=h-Math.floor(h);
        const den=(p&&p.stippleDensity)?p.stippleDensity:.12;
        if(n<den){
          const r2=Math.max(.5,ds*(1-Math.abs(d)/10));
          ctx2.beginPath();ctx2.arc(x,y,r2/2,0,Math.PI*2);ctx2.fill();
        }
      } break;
    case'Pixel Grid':{
      const psi=Math.max(2,Math.floor(ps));
      if(x%psi<1&&y%psi<1){
        const g=Math.round(20+(Math.abs(d)/(20*sc))*180);
        ctx2.fillStyle=`rgb(${g},${g},${g})`;ctx2.fillRect(x,y,psi-1,psi-1);} break;}
    case'Radial':{
      const ang=Math.atan2(y-by,x-bx),rays=p?p.radialRays:36,sl=Math.PI*2/rays;
      if(Math.abs(ang%sl)<.08) ctx2.fillRect(x,y,1,1); break;}
    case'Wave':{
      const wy=y+Math.sin(x*wf)*wa;
      if(Math.abs(wy%Math.max(2,lg))<sw) ctx2.fillRect(x,y,1,1); break;}
    case'Noise':{
      const v=vNoise(x*ns,y*ns),g=Math.round(20+v*200);
      ctx2.fillStyle=`rgb(${g},${g},${g})`;ctx2.fillRect(x,y,1,1); break;}
    default:
      if((Math.abs(d)%iv)<sw) ctx2.fillRect(x,y,1,1);
  }
}

function drawCustom2D(ctx2,bx,by,sc,mn,p,vm,ex,shapeView){
  // shapeView overrides the SDF shape when brick is rotated/side/top
  // but vm still controls the transform effect (melt/explode etc.)
  const sdfVm = (vm==='body_only'||vm==='stud_only'||vm==='shadow')?vm:
    (shapeView==='side'||shapeView==='side_front')?'side_shape':
    (shapeView==='top'||shapeView==='top_flat')?'top_shape':vm;
  const bd=getBounds4(bx,by,sc,p,sdfVm,ex);
  for(let y=Math.floor(bd.y0);y<=bd.y1;y++){
    for(let x=Math.floor(bd.x0);x<=bd.x1;x++){
      const d=getSDF4(x,y,bx,by,sc,p,sdfVm,ex);
      if(d>0) continue;
      applyMethod4(ctx2,x,y,bx,by,d,mn,sc,p);
    }
  }
}

// ── Iso face (scanline polygon fill) ──
function isoFace(ctx2,ix,iy,bw,bh,face,mn,sc,p){
  const ax=.866,ay=.5;
  let pts;
  if(face==='top'){
    pts=[{x:ix,y:iy-bh/2},{x:ix+bw/2*ax,y:iy-bh/2+bw/2*ay},
         {x:ix,y:iy-bh/2+bw*ay},{x:ix-bw/2*ax,y:iy-bh/2+bw/2*ay}];
  } else if(face==='front'){
    pts=[{x:ix-bw/2*ax,y:iy-bh/2-bw/2*ay},{x:ix+bw/2*ax,y:iy-bh/2+bw/2*ay},
         {x:ix+bw/2*ax,y:iy+bh/2+bw/2*ay},{x:ix-bw/2*ax,y:iy+bh/2-bw/2*ay}];
  } else {
    pts=[{x:ix+bw/2*ax,y:iy-bh/2+bw/2*ay},{x:ix+bw/2*ax,y:iy-bh/2+bw/2*ay-bh*.4},
         {x:ix+bw/2*ax,y:iy+bh/2+bw/2*ay-bh*.4},{x:ix+bw/2*ax,y:iy+bh/2+bw/2*ay}];
  }
  const shade=face==='top'?.15:face==='front'?.5:.82;
  const iv=p?p.interval:7,gap=p?p.lineGap:5,sw=Math.max(.6,Math.min(3.2,p&&p.strokeWidth?p.strokeWidth:1.5));
  const ink=(p&&p.ink)?p.ink:'#141414';
  const xs=pts.map(q=>q.x),ys=pts.map(q=>q.y);
  const x0=Math.floor(Math.min(...xs)),x1=Math.ceil(Math.max(...xs));
  const y0=Math.floor(Math.min(...ys)),y1=Math.ceil(Math.max(...ys));
  for(let y=y0;y<=y1;y++){
    const ins=[];
    for(let i=0;i<pts.length;i++){
      const a=pts[i],b=pts[(i+1)%pts.length];
      if((a.y<=y&&b.y>y)||(b.y<=y&&a.y>y)){const t=(y-a.y)/(b.y-a.y);ins.push(a.x+t*(b.x-a.x));}
    }
    ins.sort((a,b)=>a-b);
    for(let k=0;k+1<ins.length;k+=2){
      const lx=ins[k],rx=ins[k+1];
      for(let x=lx;x<=rx;x++){
        const d=Math.min(x-lx,rx-x,y-y0,y1-y);
        let draw=false;
        if(face==='top') draw=(Math.abs(d)%iv)<sw;
        else if(face==='front') draw=(y%Math.max(2,gap))<sw;
        else draw=((x-lx)%Math.max(2,gap))<sw;
        if(draw){const g=Math.round(20+shade*200);ctx2.fillStyle=`rgb(${g},${g},${g})`;ctx2.fillRect(x,y,1,1);}
      }
    }
  }
  ctx2.beginPath();ctx2.moveTo(pts[0].x,pts[0].y);
  for(let i=1;i<pts.length;i++) ctx2.lineTo(pts[i].x,pts[i].y);
  ctx2.closePath();ctx2.strokeStyle=ink;ctx2.lineWidth=Math.max(.5,sc*.6);ctx2.stroke();
}

function fillPoly(ctx2,pts,col,strokeCol){
  const xs=pts.map(q=>q.x),ys=pts.map(q=>q.y);
  const x0=Math.floor(Math.min(...xs)),x1=Math.ceil(Math.max(...xs));
  const y0=Math.floor(Math.min(...ys)),y1=Math.ceil(Math.max(...ys));
  for(let y=y0;y<=y1;y++){
    const ins=[];
    for(let i=0;i<pts.length;i++){
      const a=pts[i],b=pts[(i+1)%pts.length];
      if((a.y<=y&&b.y>y)||(b.y<=y&&a.y>y)){const t=(y-a.y)/(b.y-a.y);ins.push(a.x+t*(b.x-a.x));}
    }
    ins.sort((a,b)=>a-b);
    for(let k=0;k+1<ins.length;k+=2)
      for(let x=ins[k];x<=ins[k+1];x++){ctx2.fillStyle=col;ctx2.fillRect(x,y,1,1);}
  }
  ctx2.beginPath();ctx2.moveTo(pts[0].x,pts[0].y);
  for(let i=1;i<pts.length;i++) ctx2.lineTo(pts[i].x,pts[i].y);
  ctx2.closePath();ctx2.strokeStyle=strokeCol||'#141414';ctx2.lineWidth=.8;ctx2.stroke();
}

// ── Main custom brick renderer ──
function renderCustomBrick(ctx2,bx,by,cs,sc,view,rotated,size){
  const {transform:tx,method:mn,params:p}=cs;
  const u=BASE_U*sc;

  // Compute actual physical dimensions matching the original brick renderer:
  //   front: 4-stud wide (BW=u*4), BH tall, 4 studs
  //   side/rotated: square (BH x BH), 1 stud
  //   top: flat plate (shallow actualH) + studs in top_shape
  const isSide = rotated || view==='side';
  const isTop  = (!rotated) && view==='top';
  const n = isSide ? 1 : (size||4);              // actual stud count
  const actualW = isSide ? u*1.2 : u*n;          // matches original brickW(size)
  const actualH = isTop  ? u*1.2*0.44 : u*1.2;
  // stud offsets along plate length (front elevation on top edge; top/bird’s-eye on plate centerline)
  const studXs  = isSide ? [0] : Array.from({length:n},(_,i)=>(-n/2+i+0.5)*u);
  const sw=u*.56, sh=u*.35;

  if(tx==='Isometric'){
    const ax=.866,ay=.5;
    const ink=(p&&p.ink)?p.ink:'#141414';
    isoFace(ctx2,bx,by,actualW,actualH,'top',  mn,sc,p);
    isoFace(ctx2,bx,by,actualW,actualH,'front',mn,sc,p);
    isoFace(ctx2,bx,by,actualW,actualH,'right',mn,sc,p);
    for(const sdx of studXs){
      const stx=bx+sdx*ax, sty=by+sdx*ay-actualH*.5-sh*.5;
      const spts=[{x:stx,y:sty-sh*.25},{x:stx+sw/2,y:sty},{x:stx,y:sty+sh*.25},{x:stx-sw/2,y:sty}];
      fillPoly(ctx2,spts,ink,ink);
    }
    return;
  }

  // Helper: draw the brick shape (body+studs) using given SDF dims
  // We override getSDF4/getBounds4 by passing a shape descriptor object
  const dims={actualW,actualH,sw,sh,studXs,u};

  if(tx==='Stretch'){drawCustom2DWithDims(ctx2,bx,by,mn,p,'stretch',dims,{stretchX:p.stretchX,stretchY:p.stretchY});return;}
  if(tx==='Melt')   {dims._melt=p.melt;drawCustom2DWithDims(ctx2,bx,by,mn,p,'melt',   dims);return;}
  if(tx==='Explode'){dims._drift=p.drift;drawCustom2DWithDims(ctx2,bx,by,mn,p,'explode',dims);return;}
  if(tx==='Shadow') {drawCustom2DWithDims(ctx2,bx,by,mn,p,'shadow', dims);return;}
  const baseVm=view==='top'?'top_shape':'front';
  drawCustom2DWithDims(ctx2,bx,by,mn,p,baseVm,dims);
}

// Dimension-aware 2D brick drawer — uses actual brick dims instead of hardcoded BASE_U*4
function drawCustom2DWithDims(ctx2,bx,by,mn,p,vm,dims,ex){
  const {actualW,actualH,sw,sh,studXs,u}=dims;
  const pad=2;

  // Compute bounds based on actual dims
  let x0,x1,y0,y1;
  if(vm==='shadow'){x0=bx-actualW/2-pad;x1=bx+actualW/2+pad;y0=by-actualH*.3-pad;y1=by+actualH*.3+pad;}
  else if(vm==='body_only'){x0=bx-actualW/2-pad;x1=bx+actualW/2+pad;y0=by-actualH/2-pad;y1=by+actualH/2+pad;}
  else if(vm==='stud_only'){x0=bx-sw/2-pad;x1=bx+sw/2+pad;y0=by-sh/2-pad;y1=by+sh/2+pad;}
  else if(vm==='top_shape'){
    const hd=u*.5;
    x0=bx-actualW/2-sw/2-pad;x1=bx+actualW/2+sw/2+pad;y0=by-hd-sw/2-pad;y1=by+hd+sw/2+pad;
  }
  else if(vm==='stretch'){
    const sx=ex?ex.stretchX:1,sy=ex?ex.stretchY:1;
    x0=bx-actualW*sx/2-sw-pad;x1=bx+actualW*sx/2+sw+pad;y0=by-actualH*sy/2-sh-pad;y1=by+actualH*sy/2+pad;
  }
  else{x0=bx-actualW/2-sw/2-pad;x1=bx+actualW/2+sw/2+pad;y0=by-actualH/2-sh-pad;y1=by+actualH/2+pad;}

  for(let y=Math.floor(y0);y<=y1;y++){
    for(let x=Math.floor(x0);x<=x1;x++){
      const d=sdfCustomDims(x,y,bx,by,vm,dims,ex);
      if(d>0) continue;
      applyMethod4(ctx2,x,y,bx,by,d,mn,1,p);
    }
  }
}

// SDF using actual brick dimensions
function sdfCustomDims(px,py,bx,by,vm,dims,ex){
  const {actualW,actualH,sw,sh,studXs,u}=dims;
  const r=u*.06,sr=u*.04;

  if(vm==='shadow') return sdBox4(px,py,bx,by,actualW/2,actualH*.15,r);
  if(vm==='body_only') return sdBox4(px,py,bx,by,actualW/2,actualH/2,r);
  if(vm==='stud_only') return sdBox4(px,py,bx,by,sw/2,sh/2,sr);

  if(vm==='melt'){
    const mt=dims._melt||.5,mr=r+mt*actualH*.45;
    let d=sdBox4(px,py,bx,by,actualW/2,actualH/2,mr);
    const top=by-actualH/2;
    for(const sx of studXs) d=Math.min(d,sdBox4(px,py,sx===0?bx:bx+sx,top-sh/2,sw/2,sh/2,sr+mt*sw*.35));
    return d;
  }
  if(vm==='explode'){
    const dr=dims._drift||1;
    let d=sdBox4(px,py,bx,by,actualW/2,actualH/2,r);
    const top=by-actualH/2;
    for(const sx of studXs){
      const absx=sx===0?bx:bx+sx;
      d=Math.min(d,sdBox4(px,py,absx+(absx-bx)*dr*.4,top-sh/2-actualH*.25*dr,sw/2,sh/2,sr));
    }
    return d;
  }
  if(vm==='stretch'){
    const sxf=ex?ex.stretchX:1,syf=ex?ex.stretchY:1;
    let d=sdBox4(px,py,bx,by,actualW*sxf/2,actualH*syf/2,r);
    const top=by-actualH*syf/2;
    for(const sx of studXs){
      const absx=sx===0?bx:bx+sx*sxf;
      d=Math.min(d,sdBox4(px,py,absx,top-sh*syf/2,sw*sxf/2,sh*syf/2,sr));
    }
    return d;
  }
  if(vm==='top_shape'){
    const hd=u*.5;
    let d=sdBox4(px,py,bx,by,actualW/2,hd,r);
    for(const sx of studXs){
      const absx=sx===0?bx:bx+sx;
      d=Math.min(d,sdBox4(px,py,absx,by,sw/2,sw/2,sr));
    }
    return d;
  }
  // front / default: body + studs
  let d=sdBox4(px,py,bx,by,actualW/2,actualH/2,r);
  const top=by-actualH/2;
  for(const sx of studXs){
    const absx=sx===0?bx:bx+sx;
    d=Math.min(d,sdBox4(px,py,absx,top-sh/2,sw/2,sh/2,sr));
  }
  return d;
}

// ════════════════════════════════════════════════════════════
//  STYLE PRESET APPLY
// ════════════════════════════════════════════════════════════
function applyStylePreset(preset){
  const WTXS=['Front','Isometric','Isometric','Isometric','Stretch','Melt','Explode','Shadow'];
  if(preset.mode==='builtin'){
    brickStyle=preset.builtin;
    for(const b of bricks) b.customStyle=null;
  } else if(preset.mode==='preset'){
    for(const b of bricks){
      const p=makeParams();
      b.customStyle={
        transform:preset.tx,
        method:preset.method==='random'?rndItem(ALL_MTH):preset.method,
        params:{...p},
      };
    }
  } else {
    for(const b of bricks){
      const p=makeParams();
      b.customStyle={transform:rndItem(WTXS),method:rndItem(ALL_MTH),params:{...p}};
    }
  }
  if(phase==='holding') renderFrame();
}

// ════════════════════════════════════════════════════════════
//  CARD DECKS
// ════════════════════════════════════════════════════════════
const CARD_A=[
  {name:'Single',       fn:comp01},    {name:'Side by Side', fn:comp02},
  {name:'Tower',        fn:comp03},    {name:'Staircase',    fn:comp04},
  {name:'Pyramid',      fn:comp05},    {name:'Cross',        fn:comp06},
  {name:'Arch',         fn:comp07},    {name:'Letter C',     fn:comp08_C},
  {name:'Letter U',     fn:comp09_U},  {name:'Letter H',     fn:comp10_H},
  {name:'Alphabet',     fn:compLetter},{name:'Word',         fn:compWord},
];
const CARD_C=[
  {name:'Front View',   proj:projFront},   {name:'Side View',    proj:projSide},
  {name:'Top View',     proj:projTop},     {name:'Isometric',    proj:projIso},
];

// ════════════════════════════════════════════════════════════
//  ANIMATION LOOP
// ════════════════════════════════════════════════════════════
function startLoop(){
  if(animId) cancelAnimationFrame(animId);
  function tick(){
    phaseTimer++;
    if(phase==='condensing'){
      for(const b of bricks) updateBrick(b);
      if(bricks.every(b=>b.t>=1)){
        phase='holding';phaseTimer=0;
        for(const b of bricks){b.x=b.tx;b.y=b.ty;b.interval=6;}
        saveOriginalLayout();setStatus('holding');renderFrame();refreshShareSubmitUi();animId=null;return;
      }
    } else if(phase==='dissolving'){
      for(const b of bricks) updateBrick(b);
      if(phaseTimer>90){triggerNext();return;}
    }
    renderFrame();
    animId=requestAnimationFrame(tick);
  }
  animId=requestAnimationFrame(tick);
}

// ════════════════════════════════════════════════════════════
//  PHASE LOGIC
// ════════════════════════════════════════════════════════════
function triggerNext(){
  resultCount++;
  const pool=CARD_A.filter(c=>c.name!=='Alphabet'&&c.name!=='Word');
  currentComp=rndItem(pool);currentPersp=rndItem(CARD_C);
  applyCompAndStart();
}

function triggerAlphabetLetter(idx){
  currentLetterIndex=(idx+26)%26;
  currentComp=CARD_A.find(c=>c.name==='Alphabet');
  if(!currentPersp) currentPersp=CARD_C.find(c=>c.name==='Front View')||CARD_C[0];
  clearAnnotations();
  applyCompAndStart();
}

function cycleAlphabetPerspective(){
  if(!currentComp||currentComp.name!=='Alphabet'||phase!=='holding') return;
  const nm=currentPersp&&currentPersp.name;
  const ix=nm?CARD_C.findIndex(c=>c.name===nm):0;
  const i=ix>=0?ix:0;
  currentPersp=CARD_C[(i+1)%CARD_C.length];
  clearAnnotations();
  applyCompAndStart();
}

function refreshLabelCPerspectiveClickable(){
  const lc=document.getElementById('label-c');
  if(!lc) return;
  const on=currentComp&&currentComp.name==='Alphabet'&&phase==='holding';
  lc.classList.toggle('is-active',on);
  if(on) lc.setAttribute('title','Cycle: Front → Side → Top → Isometric');
  else lc.removeAttribute('title');
}

function applyCompAndStart(){
  if(typeMode) exitTypeMode();
  _wordSizingActive=!!(currentComp&&currentComp.name==='Word');
  if(!_wordSizingActive) _wordSizingText='';
  clearImportedLayoutModeUi();
  closeCustomPanel();
  clearSelection();
  clearAnnotations();
  resizeCanvas(); // ensure canvas dimensions are current before computing positions
  const mw=document.getElementById('main-work'); if(mw) mw.scrollLeft=0;
  const cx=canvas.width/2,cy=canvas.height/2;
  const raw=currentComp.fn(cx,cy);
  const targets=currentPersp.proj(raw,cx,cy);
  const WTXS=['Front','Isometric','Isometric','Isometric','Stretch','Melt','Explode','Shadow'];
  const preset=stylePresetAt(styleIndex);

  bricks=targets.map(t=>{
    const sx=randomEdge('x'),sy=randomEdge('y');
    let cs=null;
    if(preset.mode==='preset') cs={transform:preset.tx,method:preset.method==='random'?rndItem(ALL_MTH):preset.method,params:makeParams()};
    else if(preset.mode==='random') cs={transform:rndItem(WTXS),method:rndItem(ALL_MTH),params:makeParams()};
    const o={x:sx,y:sy,sx,sy,tx:t.x,ty:t.y,view:t.view||'front',rotated:false,size:t.size||4,depth:t.depth||1,layer:0,t:0,interval:80,delay:Math.random()*.25,customStyle:cs};
    if(t.isoDx!=null&&t.isoDy!=null){ o.isoDx=t.isoDx; o.isoDy=t.isoDy; }
    return o;
  });

  const brickYs=[...new Set(bricks.map(b=>Math.round(b.ty)))].sort((a,b)=>b-a);
  bricks.forEach(b=>{b.layer=brickYs.indexOf(Math.round(b.ty));});

  phase='condensing';phaseTimer=0;setStatus('condensing');
  document.getElementById('label-a').textContent=currentComp.name;
  document.getElementById('label-c').textContent=currentPersp.name;
  document.getElementById('label-count').textContent=
    currentComp.name==='Alphabet'?(currentLetterIndex+1)+'/26 '+LETTERS[currentLetterIndex]:
    currentComp.name==='Word'?currentWord:
    '#'+String(resultCount).padStart(3,'0');

  document.getElementById('btn-random').classList.toggle('active',currentComp.name!=='Alphabet'&&currentComp.name!=='Word');
  document.getElementById('btn-letters').classList.toggle('active',currentComp.name==='Alphabet');
  document.getElementById('btn-imported')?.classList.remove('active');
  document.getElementById('alphabet-panel').classList.toggle('visible',currentComp.name==='Alphabet');
  syncLibraryPanelLayout();
  updateAlphabetPanelActive();
  applyWordCanvasScale();
  startLoop();
}

function initAlphabetPanel(){
  const c=document.getElementById('alphabet-letters');
  if(!c||c.children.length) return;
  LETTERS.forEach((l,i)=>{
    const btn=document.createElement('button');
    btn.type='button';btn.className='letter-btn';btn.textContent=l;btn.dataset.index=String(i);
    btn.addEventListener('click',()=>triggerAlphabetLetter(i));c.appendChild(btn);
  });
}
function updateAlphabetPanelActive(){
  document.querySelectorAll('#alphabet-panel .letter-btn').forEach((b,i)=>b.classList.toggle('active',i===currentLetterIndex));
}

function startDissolve(){
  phase='dissolving';phaseTimer=0;setStatus('dissolving');
  document.getElementById('btn-reset').disabled=true;closeCustomPanel();startLoop();
}

function snapshot(){
  return bricks.map(b=>{
    const o={tx:b.tx,ty:b.ty,view:b.view,rotated:b.rotated,size:b.size||4,depth:b.depth||1,layer:b.layer||0,
      groupId:b.groupId||null,
      customStyle:b.customStyle?{...b.customStyle,params:{...b.customStyle.params}}:null};
    if(b.isoDx!=null&&b.isoDy!=null){ o.isoDx=b.isoDx; o.isoDy=b.isoDy; }
    return o;
  });
}
/** Accept legacy array or `{ bricks, view3d?, source? }`. */
function unpackLayoutJson(raw){
  if(raw==null) return null;
  let v=raw;
  if(typeof v==='string'){ try{ v=JSON.parse(v); }catch(e){ return null; } }
  if(Array.isArray(v)) return { bricks:v, view3d:null, source:null };
  if(v&&typeof v==='object'&&Array.isArray(v.bricks)&&v.bricks.length){
    return { bricks:v.bricks, view3d:v.view3d||null, source:v.source||null };
  }
  return null;
}
function buildSourceMeta(){
  if(currentComp&&currentComp.name==='Imported'){
    if(_librarySourceSnapshot&&_librarySourceSnapshot.compName){
      const o={..._librarySourceSnapshot};
      return o;
    }
    return{ compName:'Library' };
  }
  if(!currentComp||!currentComp.name) return null;
  const out={ compName:currentComp.name };
  if(currentPersp&&currentPersp.name) out.perspName=currentPersp.name;
  if(currentComp.name==='Alphabet'&&typeof currentLetterIndex==='number') out.letterIndex=currentLetterIndex;
  if(currentComp.name==='Word'&&currentWord) out.word=String(currentWord).slice(0,160);
  if(currentComp.name!=='Alphabet'&&currentComp.name!=='Word') out.resultCount=resultCount;
  return out;
}
function packLayoutForShare(){
  const out={ bricks:snapshot(), source:buildSourceMeta() };
  if(viewMode==='3d'&&typeof orbit!=='undefined'&&orbit){
    out.view3d={
      layout3dMode:layout3dMode==='stack'?'stack':'flat',
      orbit:{
        theta:orbit.theta, phi:orbit.phi, radius:orbit.radius,
        targetX:orbit.targetX, targetY:orbit.targetY, targetZ:orbit.targetZ
      }
    };
  }
  return out;
}
function openLibraryPanel(){
  const btn=document.getElementById('btn-library-toggle');
  const panel=document.getElementById('library-panel');
  if(!btn||!panel) return;
  if(!panel.classList.contains('library-panel--open')){
    panel.classList.add('library-panel--open');
    btn.classList.add('active');
    btn.setAttribute('aria-expanded','true');
    panel.setAttribute('aria-hidden','false');
    syncLibraryPanelLayout();
  }
  loadLibrary();
}
function closeLibraryPanel(){
  const btn=document.getElementById('btn-library-toggle');
  const panel=document.getElementById('library-panel');
  if(!btn||!panel||!panel.classList.contains('library-panel--open')) return;
  panel.classList.remove('library-panel--open');
  btn.classList.remove('active');
  btn.setAttribute('aria-expanded','false');
  panel.setAttribute('aria-hidden','true');
  syncLibraryPanelLayout();
}
/** 2D white board only: no bricks, annotations, 3D meshes, custom panel, Alphabet/Type chrome. */
function prepareImportedBlankWorkboard(){
  if(phase==='dissolving'||phase==='condensing') return false;
  if(viewMode==='3d') setViewMode('2d');
  else if(typeMode) exitTypeMode();
  if(animId){ cancelAnimationFrame(animId); animId=null; }
  _pendingView3dRestore=null;
  closeCustomPanel(true);
  clearSelection();
  clearAnnotations();
  bricks=[];
  phase='holding';
  unhighlight3d();
  if(bricksGroup3d){ while(bricksGroup3d.children.length) bricksGroup3d.remove(bricksGroup3d.children[0]); }
  resizeCanvas();
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#fff';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  _librarySourceSnapshot=null;
  savedOriginalLayout=null;
  undoStack=[];
  updateUndoButton();
  const br=document.getElementById('btn-reset');
  if(br) br.disabled=true;
  return true;
}
function applyImportedEmptyBundleUi(){
  currentComp={ name:'Imported', fn(){ return []; } };
  currentPersp=CARD_C.find(c=>c.name==='Front View')||CARD_C[0];
  document.getElementById('label-a').textContent='Imported';
  document.getElementById('label-c').textContent='Library';
  document.getElementById('label-count').textContent='0 bricks';
  document.getElementById('btn-random').classList.remove('active');
  document.getElementById('btn-letters').classList.remove('active');
  document.getElementById('btn-type').classList.remove('active');
  document.getElementById('btn-imported').classList.add('active');
  document.getElementById('alphabet-panel').classList.remove('visible');
  document.getElementById('type-bar')?.classList.remove('visible');
  syncLibraryPanelLayout();
  if(typeof refreshShareSubmitUi==='function') refreshShareSubmitUi();
  setStatus('holding');
  renderFrame();
}
/** After Library import: dedicated “Imported” content mode (not Random / Alphabet / Type). */
function applyImportedSourceToUi(src){
  const la=document.getElementById('label-a');
  const lc=document.getElementById('label-c');
  const ln=document.getElementById('label-count');
  const br=document.getElementById('btn-random');
  const bl=document.getElementById('btn-letters');
  const bt=document.getElementById('btn-type');
  const bi=document.getElementById('btn-imported');
  const ap=document.getElementById('alphabet-panel');
  if(!la||!lc||!ln) return;
  if(typeMode) exitTypeMode();
  _librarySourceSnapshot=src&&typeof src==='object'?{...src}:null;
  currentComp={name:'Imported',fn(){ return []; }};
  if(src&&src.perspName){
    currentPersp=CARD_C.find(c=>c.name===src.perspName)||CARD_C.find(c=>c.name==='Front View')||CARD_C[0];
  } else {
    currentPersp=CARD_C.find(c=>c.name==='Front View')||CARD_C[0];
  }
  la.textContent='Imported';
  if(src&&src.compName&&src.perspName) lc.textContent=src.compName+' · '+src.perspName;
  else if(src&&src.compName) lc.textContent=src.compName;
  else lc.textContent='Library';
  ln.textContent=String(bricks.length)+' bricks';
  if(br) br.classList.remove('active');
  if(bl) bl.classList.remove('active');
  if(bt) bt.classList.remove('active');
  if(bi) bi.classList.add('active');
  if(ap) ap.classList.remove('visible');
  syncLibraryPanelLayout();
  if(typeof refreshShareSubmitUi==='function') refreshShareSubmitUi();
  openLibraryPanel();
}
function clearImportedLayoutModeUi(){
  _librarySourceSnapshot=null;
  document.getElementById('btn-imported')?.classList.remove('active');
  closeLibraryPanel();
}
/** Imported + Library bundle: blank workboard (UI only) until import or Add Brick. */
function enterImportedModeBlank(){
  if(!prepareImportedBlankWorkboard()) return;
  applyImportedEmptyBundleUi();
  document.getElementById('status-hint').textContent='Blank canvas · Library to import · Add Brick (up to 2x4) to start';
  openLibraryPanel();
}
function applySnapshot(snap){
  if(!snap||snap.length!==bricks.length) return;
  for(let i=0;i<bricks.length;i++){
    const b=bricks[i],s=snap[i];
    b.tx=b.x=s.tx;b.ty=b.y=s.ty;b.view=s.view;b.rotated=(s.view==='front')?!!s.rotated:false;
    b.size=s.size||4;b.depth=s.depth||1;b.layer=s.layer||0;b.groupId=s.groupId||null;
    b.customStyle=s.customStyle?{...s.customStyle,params:{...s.customStyle.params}}:null;
    if(s.isoDx!=null&&s.isoDy!=null){ b.isoDx=s.isoDx; b.isoDy=s.isoDy; }
    else{ delete b.isoDx; delete b.isoDy; }
  }
  renderFrame();updateUndoButton();
}
function saveOriginalLayout(){
  savedOriginalLayout=snapshot();undoStack=[];updateUndoButton();
  document.getElementById('btn-reset').disabled=false;
  if(viewMode==='3d'&&bricksGroup3d){syncBricksTo3D();setOrbitFrom2DView();}
}
function resetLayout(){
  if(phase!=='holding'||!savedOriginalLayout) return;
  applySnapshot(savedOriginalLayout);undoStack=[];updateUndoButton();
  if(viewMode==='3d'&&bricksGroup3d) syncBricksTo3D();
}
function undo(){
  if(phase!=='holding'||undoStack.length===0) return;
  applySnapshot(undoStack.pop());updateUndoButton();
  if(viewMode==='3d'&&bricksGroup3d) syncBricksTo3D();
}
function updateUndoButton(){document.getElementById('btn-undo').disabled=undoStack.length===0;}

let supabaseClient=null;
let _shareSubmitLast=0;
function isSupabaseConfigured(){
  const c=window.BRICK_SUPABASE;
  if(!c||!c.url||!c.anonKey) return false;
  const u=String(c.url);
  if(u.includes('YOUR_PROJECT_REF')||u.includes('YOUR_')||u.includes('PASTE_')) return false;
  if(!u.startsWith('https://')||!u.includes('.supabase.co')) return false;
  const k=String(c.anonKey);
  if(k.includes('YOUR_SUPABASE_ANON_KEY')||k.includes('YOUR_')) return false;
  return k.length>24;
}
function initSupabaseClient(){
  if(typeof supabase==='undefined'||!supabase.createClient) return null;
  if(!isSupabaseConfigured()) return null;
  const c=window.BRICK_SUPABASE;
  try{ return supabase.createClient(c.url, c.anonKey); }catch(e){ console.warn('Supabase init failed', e); return null; }
}
function refreshShareSubmitUi(){
  const el=document.getElementById('btn-share-submit');
  if(!el) return;
  const ok=!!supabaseClient&&isSupabaseConfigured();
  el.disabled=!ok||phase!=='holding'||!bricks.length;
  if(!ok) el.title='Edit brick-config.local.js (url + anonKey), then reload';
  else if(viewMode==='3d') el.title='Submit layout to gallery (brick positions synced from 3D; camera angle + Flat/Stack saved for 3D reopen)';
  else el.title='Submit current 2D layout to Supabase (shared gallery)';
}
async function submitLayoutToSharedSpace(){
  if(phase!=='holding'||!bricks.length) return;
  if(!supabaseClient){ alert('Supabase is not configured.'); return; }
  const t=Date.now();
  if(t-_shareSubmitLast<6000){
    const h=document.getElementById('status-hint');
    if(h) h.textContent='Please wait a few seconds between submissions';
    return;
  }
  const title=window.prompt('Optional title for this layout (Cancel = don’t submit):','');
  if(title===null) return;
  const hint=document.getElementById('status-hint');
  const prevHint=hint?hint.textContent:'';
  if(hint){ hint.textContent='Submitting…'; hint.style.color='#888'; }
  if(viewMode==='3d'&&bricksGroup3d) syncBricksFrom3DMeshesToData();
  resizeCanvas();
  const row={
    layout: packLayoutForShare(),
    canvas_w: canvas.width,
    canvas_h: canvas.height,
    brick_count: bricks.length,
    title: title.trim()===''?null:title.trim().slice(0,200)
  };
  // Do not chain .select() after insert: with RLS, anon has no SELECT policy (by design), and PostgREST would fail returning rows.
  const { error }=await supabaseClient.from('brick_submissions').insert(row);
  if(error){
    if(hint){ hint.textContent='Share failed: '+error.message; hint.style.color='#c00'; }
    console.error(error);
    setTimeout(()=>{ if(hint){ hint.textContent=prevHint; hint.style.color='#888'; } }, 5000);
    return;
  }
  _shareSubmitLast=Date.now();
  if(hint){ hint.textContent='Saved to gallery'; hint.style.color='#222'; }
  const lp=document.getElementById('library-panel');
  if(lp && lp.classList.contains('library-panel--open')) loadLibrary();
  setTimeout(()=>{ if(hint){ hint.textContent=prevHint; hint.style.color='#888'; } }, 4500);
}
function layoutJsonToBrickObjects(layout){
  if(!Array.isArray(layout)||!layout.length) return [];
  return layout.map(s=>{
    const tx=+s.tx, ty=+s.ty;
    let cs=null;
    if(s.customStyle){
      try{ cs=JSON.parse(JSON.stringify(s.customStyle)); }catch(_){ cs=null; }
      if(cs&&cs.params&&typeof cs.params==='object') cs.params={...cs.params};
    }
    const o={
      x:tx,y:ty,sx:tx,sy:ty,tx,ty,
      view:s.view||'front',
      rotated:((s.view||'front')==='front')?!!s.rotated:false,
      size:s.size||4,
      depth:s.depth||1,
      layer:s.layer||0,
      groupId:s.groupId||null,
      customStyle:cs,
      t:1,interval:6,delay:0
    };
    if(s.isoDx!=null&&s.isoDy!=null){ o.isoDx=+s.isoDx; o.isoDy=+s.isoDy; }
    return o;
  });
}
/** Restore layout from a Supabase row’s `layout` JSON (array or `{ bricks, view3d?, source? }`).
 *  opts.preparedBricks: already-built brick objects (e.g. layers computed before scaling from gallery). */
function replaceBricksFromLayout(layout, view3dMeta, sourceMeta, opts){
  const o=opts||{};
  if(view3dMeta&&view3dMeta.orbit){
    if(viewMode!=='3d'||!bricksGroup3d) _pendingView3dRestore=view3dMeta;
    else _pendingView3dRestore=null;
  } else {
    _pendingView3dRestore=null;
  }
  if(o.preparedBricks){
    if(!o.preparedBricks.length) return false;
    bricks=o.preparedBricks;
  } else {
    if(!Array.isArray(layout)||!layout.length) return false;
    bricks=layoutJsonToBrickObjects(layout);
    recomputeFrontLayersBySupport();
    if(typeof snapFullEmbedFrontBricks==='function') snapFullEmbedFrontBricks();
    recomputeFrontLayersBySupport();
  }
  clearSelection();
  clearAnnotations();
  savedOriginalLayout=null;
  undoStack=[];
  updateUndoButton();
  const br=document.getElementById('btn-reset');
  if(br) br.disabled=true;
  if(viewMode==='3d'&&bricksGroup3d){
    if(view3dMeta&&view3dMeta.orbit) applyImportedView3d(view3dMeta);
    else setOrbitFrom2DView();
    syncBricksTo3D();
  }
  phase='holding';
  applyImportedSourceToUi(sourceMeta);
  if(typeof setStatus==='function') setStatus('holding');
  renderFrame();
  return true;
}

function escapeHtmlLib(str){
  const d=document.createElement('div');
  d.textContent=str==null?'':String(str);
  return d.innerHTML;
}
function scaleLayoutToCurrentCanvas(layout, fromW, fromH){
  if(!Array.isArray(layout)||!layout.length) return layout;
  resizeCanvas();
  const rw=canvas.width, rh=canvas.height;
  if(!fromW||!fromH||fromW<=0||fromH<=0) return layout;
  if(Math.abs(fromW-rw)<2&&Math.abs(fromH-rh)<2) return layout;
  const s=Math.min(rw/fromW, rh/fromH);
  const cx=fromW/2, cy=fromH/2, rx=rw/2, ry=rh/2;
  return layout.map(b=>({
    ...b,
    tx:(b.tx-cx)*s+rx,
    ty:(b.ty-cy)*s+ry
  }));
}
/** Like scaleLayoutToCurrentCanvas but mutates live brick objects (tx/ty/x/y/sx/sy) and preserves layers. */
function scaleLayoutBrickObjectsInPlace(list, fromW, fromH){
  if(!list||!list.length) return;
  resizeCanvas();
  const rw=canvas.width, rh=canvas.height;
  if(!fromW||!fromH||fromW<=0||fromH<=0) return;
  if(Math.abs(fromW-rw)<2&&Math.abs(fromH-rh)<2) return;
  const s=Math.min(rw/fromW, rh/fromH);
  const cx=fromW/2, cy=fromH/2, rx=rw/2, ry=rh/2;
  for(const b of list){
    const tx=(b.tx-cx)*s+rx, ty=(b.ty-cy)*s+ry;
    b.tx=tx; b.ty=ty; b.x=b.sx=tx; b.y=b.sy=ty;
  }
}
let _libraryPreviewRow=null;
function recomputeFrontLayersForList(list){
  const front=(list||[]).filter(b=>b.view==='front');
  if(!front.length) return;
  const ordered=front.slice().sort((a,b)=>b.ty-a.ty);
  for(const b of ordered) b.layer=getSupportedLayerAt(b,b.tx,b.ty,list);
}
/** Library preview: render in share-time pixel space (saved canvas_w × canvas_h).
 *  Scaling tx/ty to the current main canvas makes stacked spacing s×BSTK while layer/stud
 *  math still uses BSTK → wrong hierarchy when s≠1. */
function paintBrickListToPreviewCanvas(pcvs, brickListOrig, savedW, savedH){
  if(!pcvs||!brickListOrig||!brickListOrig.length) return;
  const list=brickListOrig.map(b=>({
    ...b,
    customStyle:b.customStyle?JSON.parse(JSON.stringify(b.customStyle)):null,
    x:b.tx,y:b.ty,sx:b.tx,sy:b.ty
  }));
  recomputeFrontLayersForList(list);
  const sw=Number(savedW), sh=Number(savedH);
  const useSavedViewport=Number.isFinite(sw)&&Number.isFinite(sh)&&sw>0&&sh>0;
  let w, h, drawList;
  if(useSavedViewport){
    w=Math.max(1,Math.ceil(sw));
    h=Math.max(1,Math.ceil(sh));
    drawList=list;
  } else {
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    for(const b of list){
      const bd=getBounds(b.tx,b.ty,b.view,b.rotated,b.size);
      minX=Math.min(minX,bd.x0); minY=Math.min(minY,bd.y0);
      maxX=Math.max(maxX,bd.x1); maxY=Math.max(maxY,bd.y1);
    }
    const pad=28;
    const bw=Math.max(maxX-minX,1), bh=Math.max(maxY-minY,1);
    w=Math.max(1,Math.ceil(bw+pad*2));
    h=Math.max(1,Math.ceil(bh+pad*2));
    const ox=pad-minX, oy=pad-minY;
    drawList=list.map(b=>({
      ...b,
      tx:b.tx+ox, ty:b.ty+oy, x:b.tx+ox, y:b.ty+oy, sx:b.tx+ox, sy:b.ty+oy
    }));
  }
  pcvs.width=w;
  pcvs.height=h;
  const pctx=pcvs.getContext('2d');
  const buf=new Uint8ClampedArray(w*h*4);
  buf.fill(255);
  const sorted=drawList.slice().sort(compareBricksForPaint);
  for(const b of sorted){
    const bx=b.tx, by=b.ty;
    const covered=getCoveredStudXs(b,bx,by,drawList,true);
    if(!b.customStyle) renderBrickToBuf(buf,w,h,b,bx,by,20,covered,drawList);
  }
  const imgData=pctx.createImageData(w,h);
  imgData.data.set(buf);
  pctx.putImageData(imgData,0,0);
  for(const b of sorted){
    if(!b.customStyle) continue;
    const bx=b.tx, by=b.ty;
    const bd=getBounds(bx,by,b.view,b.rotated,b.size,b.depth);
    const edgePad=6;
    const rx=Math.max(0,Math.floor(bd.x0-edgePad)),ry=Math.max(0,Math.floor(bd.y0-edgePad));
    const rw=Math.min(w-rx,Math.ceil(bd.x1-bd.x0+edgePad*2+1));
    const rh=Math.min(h-ry,Math.ceil(bd.y1-bd.y0+edgePad*2+1));
    if(rw<=0||rh<=0) continue;
    const off=document.createElement('canvas');off.width=rw;off.height=rh;
    const octx=off.getContext('2d');
    octx.fillStyle='#fff';octx.fillRect(0,0,rw,rh);
    renderCustomBrick(octx,bx-rx,by-ry,b.customStyle,28/16,b.view,b.rotated,b.size);
    const od=octx.getImageData(0,0,rw,rh).data;
    const md=pctx.getImageData(rx,ry,rw,rh);const md2=md.data;
    for(let i=0;i<od.length;i+=4){
      if(od[i]<245||od[i+1]<245||od[i+2]<245){
        md2[i]=od[i];md2[i+1]=od[i+1];md2[i+2]=od[i+2];md2[i+3]=255;
      }
    }
    pctx.putImageData(md,rx,ry);
  }
}
function closeLibraryPreview(){
  const ov=document.getElementById('library-preview-overlay');
  if(ov){ ov.classList.remove('visible'); ov.setAttribute('aria-hidden','true'); }
  _libraryPreviewRow=null;
}
function openLibraryPreview(row){
  let layout=row.layout;
  if(typeof layout==='string'){ try{ layout=JSON.parse(layout); }catch(e){ return; } }
  const u=unpackLayoutJson(layout);
  if(!u||!u.bricks.length) return;
  _libraryPreviewRow=row;
  const list=layoutJsonToBrickObjects(u.bricks);
  const ov=document.getElementById('library-preview-overlay');
  const tit=document.getElementById('library-preview-title');
  if(tit) tit.textContent=(row.title&&String(row.title).trim())?String(row.title).trim():'Untitled';
  if(ov){ ov.classList.add('visible'); ov.setAttribute('aria-hidden','false'); }
  requestAnimationFrame(()=>{
    const pcvs=document.getElementById('library-preview-canvas');
    if(pcvs) paintBrickListToPreviewCanvas(pcvs, list, row.canvas_w, row.canvas_h);
  });
}
function openLibraryImportToMain(row){
  if(phase==='condensing'||phase==='dissolving'){
    alert('Wait until the scene is ready.');
    return;
  }
  let layout=row.layout;
  if(typeof layout==='string'){ try{ layout=JSON.parse(layout); }catch(e){ return; } }
  const u=unpackLayoutJson(layout);
  if(!u||!u.bricks.length) return;
  const list=layoutJsonToBrickObjects(u.bricks);
  recomputeFrontLayersForList(list);
  scaleLayoutBrickObjectsInPlace(list, row.canvas_w, row.canvas_h);
  replaceBricksFromLayout(null, u.view3d, u.source, { preparedBricks: list });
  closeLibraryPreview();
}
function setLibraryListSelection(itemEl){
  const root=document.getElementById('library-list');
  if(!root) return;
  root.querySelectorAll('.library-item.library-item--selected').forEach(n=>n.classList.remove('library-item--selected'));
  if(itemEl) itemEl.classList.add('library-item--selected');
}
function syncLibraryPanelLayout(){
  const panel=document.getElementById('library-panel');
  const mw=document.getElementById('main-work');
  if(!panel||!mw) return;
  if(!panel.classList.contains('library-panel--open')){
    panel.style.removeProperty('top');
    panel.style.removeProperty('height');
    return;
  }
  const r=mw.getBoundingClientRect();
  panel.style.top=r.top+'px';
  panel.style.height=r.height+'px';
}
async function loadLibrary(){
  const listEl=document.getElementById('library-list');
  const emptyEl=document.getElementById('library-empty');
  const statusEl=document.getElementById('library-status');
  if(!listEl||!emptyEl) return;
  if(!supabaseClient||!isSupabaseConfigured()){
    if(statusEl) statusEl.textContent='Supabase not set: edit brick-config.js on your host (or add brick-config.local.js with url + anon key), then refresh.';
    emptyEl.style.display='block';
    return;
  }
  if(statusEl) statusEl.textContent='Loading…';
  const { data, error }=await supabaseClient.from('brick_submissions')
    .select('id, created_at, title, brick_count, canvas_w, canvas_h, layout')
    .order('created_at',{ascending:false})
    .limit(80);
  if(error){
    if(statusEl){ statusEl.textContent=error.message; statusEl.classList.remove('hint'); }
    return;
  }
  if(statusEl){ statusEl.textContent=''; statusEl.classList.remove('hint'); }
  listEl.innerHTML='';
  if(!data||!data.length){
    emptyEl.style.display='block';
    // RLS: INSERT can work while SELECT has no policy — PostgREST returns [] with no error.
    if(statusEl){
      statusEl.textContent='Dashboard has rows but list is empty? Run supabase-library-select-policy.sql in Supabase SQL Editor, then Refresh.';
      statusEl.classList.add('hint');
    }
    return;
  }
  emptyEl.style.display='none';
  for(const row of data){
    const div=document.createElement('div');
    div.className='library-item';
    const t=row.title||'Untitled';
    const d=new Date(row.created_at);
    const ds=isNaN(d.getTime())?'':d.toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
    div.innerHTML='<div class="library-item-title">'+escapeHtmlLib(t)+'</div>'+
      '<div class="library-item-meta">'+(row.brick_count||0)+' bricks · '+escapeHtmlLib(ds)+'</div>'+
      '<div class="library-item-actions">'+
      '<button type="button" class="btn library-view">View</button>'+
      '<button type="button" class="btn library-import">Import</button></div>';
    div.querySelector('.library-view').addEventListener('click',()=>{ setLibraryListSelection(div); openLibraryPreview(row); });
    div.querySelector('.library-import').addEventListener('click',()=>openLibraryImportToMain(row));
    div.addEventListener('click',e=>{
      if(e.target.closest('.library-item-actions')) return;
      setLibraryListSelection(div);
      openLibraryPreview(row);
    });
    listEl.appendChild(div);
  }
}

function recomputeFrontLayersBySupport(){
  const front=bricks.filter(b=>b.view==='front');
  if(front.length){
    const ordered=front.slice().sort((a,b)=>b.ty-a.ty);
    for(const b of ordered) b.layer=getSupportedLayerAt(b,b.tx,b.ty);
  }
  const side=bricks.filter(b=>b.view==='side');
  if(side.length){
    const ordered=side.slice().sort((a,b)=>b.ty-a.ty);
    for(const b of ordered) b.layer=getSupportedLayerAt(b,b.tx,b.ty);
  }
}

// ════════════════════════════════════════════════════════════
//  BRICK UPDATE
// ════════════════════════════════════════════════════════════
function updateBrick(b){
  if(b===dragBrick) return;
  if(phase==='condensing'){
    b.t=Math.min(1,b.t+.016);
    if(b.t<b.delay) return;
    const ease=easeOutCubic(Math.min(1,(b.t-b.delay)/(1-b.delay+.001)));
    b.x=lerp(b.sx,b.tx,ease);b.y=lerp(b.sy,b.ty,ease);
    b.interval=lerp(80,6,ease);
    if(ease>.92&&ease<.99) b.interval=lerp(b.interval,3.5,.25);
  } else if(phase==='dissolving'){
    const dt=Math.min(1,phaseTimer/75),ease=dt*dt;
    b.interval=lerp(6,100,ease);
    b.x+=(b.x-canvas.width/2)*.014;b.y+=(b.y-canvas.height/2)*.014;
  }
}
