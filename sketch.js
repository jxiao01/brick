// ── Info panel ──
function toggleInfo(){document.getElementById('info-overlay').classList.toggle('visible');}
function closeInfo(){document.getElementById('info-overlay').classList.remove('visible');}
document.getElementById('btn-info').addEventListener('click',toggleInfo);
document.getElementById('info-close').addEventListener('click',closeInfo);
document.getElementById('info-overlay').addEventListener('click',e=>{if(e.target.id==='info-overlay')closeInfo();});

document.addEventListener('keydown',e=>{
  if(e.target.id==='type-input') return;
  const infoOpen=document.getElementById('info-overlay').classList.contains('visible');
  if(e.key==='?'||(e.code==='Slash'&&e.shiftKey)||e.key==='F1'){e.preventDefault();toggleInfo();return;}
  if(e.key==='Escape'&&infoOpen){closeInfo();return;}
  if(infoOpen) return;
  if(document.getElementById('library-preview-overlay').classList.contains('visible')){
    if(e.key==='Escape'){ closeLibraryPreview(); return; }
  }
  if(document.getElementById('custom-panel').classList.contains('visible')){if(e.key==='Escape'){closeCustomPanel();return;}}
  if(phase==='holding'&&currentComp&&currentComp.name==='Alphabet'){
    if(e.code==='Space'&&!e.shiftKey){e.preventDefault();triggerAlphabetLetter(currentLetterIndex+1);return;}
    if((e.code==='Space'&&e.shiftKey)||e.code==='ArrowLeft'){e.preventDefault();triggerAlphabetLetter(currentLetterIndex-1);return;}
    if(e.code==='ArrowRight'){e.preventDefault();triggerAlphabetLetter(currentLetterIndex+1);return;}
    if(e.key&&e.key.match(/[a-zA-Z]/)&&e.key.length===1&&e.key.toLowerCase()!=='s'){
      const idx=LETTERS.indexOf(e.key.toUpperCase());if(idx>=0){e.preventDefault();triggerAlphabetLetter(idx);}return;
    }
  }
  // Word mode: Space re-renders same word with new random style/perspective
  if(e.code==='Space'&&phase==='holding'&&currentComp&&currentComp.name==='Word'){
    e.preventDefault();
    // Cycle to next random perspective and re-apply style preset
    const randPersp=CARD_C[Math.floor(Math.random()*CARD_C.length)];
    currentPersp=randPersp;
    styleIndex=(styleIndex+1)%STYLE_PRESETS.length;
    document.getElementById('btn-style').textContent=stylePresetAt(styleIndex).label;
    applyCompAndStart();
    return;
  }
  if(e.code==='Space'){e.preventDefault();if(phase==='holding')startDissolve();else if(phase==='idle')triggerNext();}
  if(e.key==='s'||e.key==='S') saveClean();
  if(e.key==='t'||e.key==='T'){enterTypeMode();return;}
  if((e.key==='z'||e.key==='Z')&&(e.ctrlKey||e.metaKey)){e.preventDefault();undo();}
});

function setStatus(s){
  const dot=document.getElementById('phase-dot'),text=document.getElementById('status-text'),hint=document.getElementById('status-hint');
  dot.className='';
  if(s==='holding'){dot.classList.add('active');text.textContent='holding';
    if(hint&&viewMode==='2d'){
      if(currentComp&&currentComp.name==='Alphabet') hint.textContent='← → letter · click perspective name to cycle · 3D to view · brick to annotate · S save';
      else if(currentComp&&currentComp.name==='Imported'){
        hint.textContent=bricks.length
          ? 'Imported layout · Next = new build · Library for more shares'
          : 'Blank canvas · Library to import · Add Brick (up to 2x4)';
      }
      else hint.textContent='drag · dbl-click=rotate · right-click=more';
    }}
  if(s==='condensing'){dot.classList.add('active');text.textContent='assembling';}
  if(s==='dissolving'){dot.classList.add('dissolving');text.textContent='dissolving';}
  refreshLabelCPerspectiveClickable();
}

// ── Type mode ──
function enterTypeMode(){
  // Type input is a 2D editing mode; never show it together with 3D panels.
  if(viewMode==='3d') setViewMode('2d');
  _wordSizingActive=false; _wordSizingText=''; resizeCanvas();
  applyWordCanvasScale();
  clearImportedLayoutModeUi();
  typeMode=true;bricks=[];phase='idle';
  unhighlight3d();
  if(animId){cancelAnimationFrame(animId);animId=null;}
  ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
  if(bricksGroup3d){while(bricksGroup3d.children.length)bricksGroup3d.remove(bricksGroup3d.children[0]);}
  const bar=document.getElementById('type-bar'),input=document.getElementById('type-input');
  bar.classList.add('visible');input.value='';input.focus();
  updateTypeSizeUi();
  document.getElementById('btn-type').classList.add('active');
  document.getElementById('btn-random').classList.remove('active');
  document.getElementById('btn-letters').classList.remove('active');
  document.getElementById('alphabet-panel').classList.remove('visible');
  document.getElementById('status-hint').textContent='type a word · Enter to build';
  document.getElementById('label-a').textContent='Word';
  document.getElementById('label-c').textContent='—';
  document.getElementById('label-count').textContent='—';
  refreshLabelCPerspectiveClickable();
}
function exitTypeMode(){
  typeMode=false;
  document.getElementById('type-bar').classList.remove('visible');
  document.getElementById('type-input').blur();
  document.getElementById('btn-type').classList.remove('active');
}
document.getElementById('btn-type').addEventListener('click',()=>{if(typeMode){exitTypeMode();triggerNext();}else enterTypeMode();});document.getElementById('type-input').addEventListener('keydown',e=>{
  e.stopPropagation();
  if(e.key==='Enter'){e.preventDefault();const word=e.target.value;exitTypeMode();if(word.trim())triggerWord(word);else triggerNext();}
  if(e.key==='Escape'){e.preventDefault();exitTypeMode();triggerNext();}
});
document.getElementById('type-input').addEventListener('keyup',e=>e.stopPropagation());

function triggerWord(word){
  if(!word||!word.trim()) return;
  currentWord=word.trim().toUpperCase().replace(/[^A-Z]/g,'');
  if(!currentWord.length) return;
  _wordSizingActive=true; _wordSizingText=currentWord;
  currentComp={name:'Word',fn:compWord};currentPersp=CARD_C.find(c=>c.name==='Front View')||CARD_C[0];
  resultCount++;applyCompAndStart();
}
document.getElementById('type-size')?.addEventListener('input',e=>{
  const v=parseFloat(e.target.value);
  if(!Number.isFinite(v)) return;
  typeWordScale=Math.max(0.15,Math.min(2.2,v));
  updateTypeSizeUi();
  if(_wordSizingActive){
    resizeCanvas();
    if(phase==='holding'&&currentComp&&currentComp.name==='Word'){ applyCompAndStart(); }
    else applyWordCanvasScale();
  }
});
document.getElementById('type-fit')?.addEventListener('click',e=>{
  e.stopPropagation();
  const input=document.getElementById('type-input');
  const src=_wordSizingActive&&currentWord?currentWord:(input?input.value:'');
  const word=(src||'').trim().toUpperCase().replace(/[^A-Z]/g,'');
  if(!word.length) return;
  const main=document.getElementById('main-work');
  const viewportW=main?main.clientWidth:canvas.width;
  const baseW=Math.max(1,wordSingleLineWidth(word));
  const target=(viewportW*0.78)/baseW;
  typeWordScale=Math.max(0.15,Math.min(2.2,target));
  updateTypeSizeUi();
  if(_wordSizingActive&&phase==='holding'&&currentComp&&currentComp.name==='Word') applyCompAndStart();
  else applyWordCanvasScale();
});

// ════════════════════════════════════════════════════════════
//  3D VIEW (Three.js — unchanged from original)
// ════════════════════════════════════════════════════════════
const SCALE_2D_TO_3D=1/28;
let scene3d,camera3d,renderer3d,bricksGroup3d,pipCamera,pipRenderer;
let orbit={theta:-Math.PI/2,phi:Math.PI/2,radius:20,dragging:false,prevX:0,prevY:0,autoRotate:false,autoRotateSpeed:.004,targetX:0,targetY:0,targetZ:0,baseRadius:14,_startX:0,_startY:0};
let sceneCenterY3d=0,anim3dId=null;
let drag3d={active:false,group:null,plane:null,offset:null};
let orbitTween=null;

function initView3D(){
  if(scene3d) return;
  const container=document.getElementById('view-3d');const w=container.clientWidth,h=container.clientHeight;
  scene3d=new THREE.Scene();scene3d.background=new THREE.Color(0xffffff);
  camera3d=new THREE.PerspectiveCamera(50,w/h,.1,500);camera3d.position.set(0,12,24);
  renderer3d=new THREE.WebGLRenderer({antialias:true});renderer3d.setSize(w,h);renderer3d.setPixelRatio(Math.min(window.devicePixelRatio,2));
  renderer3d.shadowMap.enabled=true;renderer3d.shadowMap.type=THREE.PCFSoftShadowMap;
  container.appendChild(renderer3d.domElement);
  const amb=new THREE.AmbientLight(0xffffff,.6);scene3d.add(amb);
  const dir=new THREE.DirectionalLight(0xffffff,.85);dir.position.set(8,20,10);dir.castShadow=true;
  dir.shadow.mapSize.width=dir.shadow.mapSize.height=2048;dir.shadow.camera.left=-30;dir.shadow.camera.right=30;
  dir.shadow.camera.top=30;dir.shadow.camera.bottom=-30;dir.shadow.camera.near=.5;dir.shadow.camera.far=80;dir.shadow.bias=-.001;scene3d.add(dir);
  const fill=new THREE.DirectionalLight(0xccddff,.25);fill.position.set(-5,5,-8);scene3d.add(fill);
  const rim=new THREE.DirectionalLight(0x6699cc,.45);rim.position.set(-6,-2,-10);scene3d.add(rim);
  const rim2=new THREE.DirectionalLight(0x6699cc,.3);rim2.position.set(6,-1,8);scene3d.add(rim2);
  pipCamera=new THREE.OrthographicCamera(-10,10,7.5,-7.5,.1,200);pipCamera.position.set(0,60,0);pipCamera.lookAt(0,0,0);
  pipRenderer=new THREE.WebGLRenderer({canvas:document.getElementById('pip-canvas'),antialias:true,alpha:false});
  pipRenderer.setPixelRatio(Math.min(window.devicePixelRatio,2));pipRenderer.setSize(280,210);
  const gGeo=new THREE.PlaneGeometry(120,120),gMat=new THREE.ShadowMaterial({opacity:.12});
  const ground=new THREE.Mesh(gGeo,gMat);ground.rotation.x=-Math.PI/2;ground.position.y=-.01;ground.receiveShadow=true;scene3d.add(ground);
  bricksGroup3d=new THREE.Group();scene3d.add(bricksGroup3d);
  renderer3d.domElement.addEventListener('mousedown',onOrbitStart);
  renderer3d.domElement.addEventListener('wheel',onOrbitZoom,{passive:false});
  window.addEventListener('mousemove',onOrbitMove);window.addEventListener('mouseup',onOrbitEnd);
  window.addEventListener('resize',onResize3d);
}

function createBrickMesh3D(brick){
  const b=brick||{view:'front',rotated:false,size:4,depth:1};
  const isSide=b.view==='side'||b.rotated;
  const isTop=b.view==='top'&&!b.rotated;
  const n=isSide?1:(b.size||4);
  const d=isSide?1:Math.max(1,b.depth||1);
  const s=SCALE_2D_TO_3D,W3=BW*s,H3=BH*s;
  const bodyW=isSide?H3:Math.max(U*s,n*U*s);
  const bodyH=isTop?Math.max(U*s*0.45,H3*0.45):H3;
  // Keep stud rows physically supported: if depth has multiple stud rows (e.g. 2x3),
  // body depth must expand with d*U instead of staying at fixed H3.
  const bodyD=isSide?H3:Math.max(H3,d*U*s);
  const bodyGeo=new THREE.BoxGeometry(bodyW,bodyH,bodyD);
  const body=new THREE.Mesh(bodyGeo,new THREE.MeshLambertMaterial({color:0x2a2a2a,flatShading:true}));
  body.castShadow=true;body.receiveShadow=true;body.position.y=bodyH/2;
  const group=new THREE.Group();group.add(body);
  const edges=new THREE.LineSegments(new THREE.EdgesGeometry(bodyGeo),new THREE.LineBasicMaterial({color:0x111111,linewidth:1}));
  edges.position.y=bodyH/2;group.add(edges);
  const studR=U*s*.35,studH=SH*s,studGeo=new THREE.CylinderGeometry(studR,studR,studH,24);
  const studMat=new THREE.MeshPhongMaterial({color:0x383838,specular:0x555555,shininess:50,flatShading:true});
  const edgeMat=new THREE.LineBasicMaterial({color:0x111111,linewidth:1});
  const studY=bodyH+studH/2;
  if(isSide){
    const stud=new THREE.Mesh(studGeo,studMat);stud.castShadow=true;stud.position.set(0,studY,0);group.add(stud);
    const se=new THREE.LineSegments(new THREE.EdgesGeometry(studGeo,30),edgeMat);se.position.copy(stud.position);group.add(se);
  } else {
    for(let r=0;r<d;r++){
      const z=-bodyD/2+U*s*(r+.5);
      for(let i=0;i<n;i++){
        const x=-bodyW/2+U*s*(i+.5);
        const stud=new THREE.Mesh(studGeo,studMat);stud.castShadow=true;stud.position.set(x,studY,z);group.add(stud);
        const se=new THREE.LineSegments(new THREE.EdgesGeometry(studGeo,30),edgeMat);se.position.copy(stud.position);group.add(se);
      }
    }
  }
  return group;
}

function stackScreenTyStepForBrick(b){
  if(!b||b.view==='top') return BSTK;
  if(b.view==='side') return SIDE_STACK_Y;
  if(b.view==='front'&&!b.rotated&&perspectiveUsesAffineFrontSnap()) return SIDE_STACK_Y;
  return BSTK;
}
function getBrickPos3D(b,mode,cx,cy){
  const s=SCALE_2D_TO_3D;
  if(mode==='flat'){
    // 1:1 from 2D — X=horizontal, Y=vertical(inverted), Z=0
    return {x:(b.tx-cx)*s, y:-(b.ty-cy)*s, z:0};
  } else {
    const L=b.layer||0;
    const tyStep=stackScreenTyStepForBrick(b);
    const tyGround=(b.ty||0)+L*tyStep;
    return {x:-(b.tx-cx)*s, y:L*BSTK*s, z:-(tyGround-cy)*s};
  }
}

/** Word / 超宽画布：3D 与 2D 一致以左侧为水平原点；否则仍用重心。 */
function useLeftAnchored3dOrigin(){
  if(currentComp&&currentComp.name==='Word') return true;
  const mw=document.getElementById('main-work');
  return !!(mw&&mw.scrollWidth>mw.clientWidth+2);
}
function get3dLayoutOriginXY(){
  if(!bricks.length) return {cx:0,cy:0};
  let minLX=Infinity,sumTX=0,sumTY=0;
  for(const b of bricks){
    const bd=getBounds(b.tx,b.ty,b.view,b.rotated,b.size,b.depth);
    minLX=Math.min(minLX,bd.x0);
    sumTX+=b.tx;sumTY+=b.ty;
  }
  const n=bricks.length;
  const cy=sumTY/n;
  const cx=useLeftAnchored3dOrigin()?minLX:sumTX/n;
  return {cx,cy};
}

function updateLightForMode(){
  scene3d.children.forEach(c=>{
    if(c.isDirectionalLight&&c.castShadow){
      if(layout3dMode==='flat'){
        c.position.set(6,18,12);
        c.shadow.camera.left=-50;c.shadow.camera.right=50;
        c.shadow.camera.top=50;c.shadow.camera.bottom=-50;
      } else {
        c.position.set(8,20,10);
        c.shadow.camera.left=-30;c.shadow.camera.right=30;
        c.shadow.camera.top=30;c.shadow.camera.bottom=-30;
      }
      c.shadow.camera.updateProjectionMatrix();
    }
    // ground plane shadow only meaningful in stack mode
    if(c.isMesh&&c.material&&c.material.isShadowMaterial) c.visible=(layout3dMode==='stack');
  });
}

function _recalcOrbitBounds(){
  const s=SCALE_2D_TO_3D;
  const ch=bricksGroup3d.children;
  const avgY=ch.length?ch.reduce((a,c)=>a+c.position.y,0)/ch.length:0;
  sceneCenterY3d=avgY;
  let maxE=0;
  ch.forEach(c=>{maxE=Math.max(maxE,Math.abs(c.position.x),Math.abs(c.position.y-avgY),Math.abs(c.position.z));});
  const hb=(BW/2)*s;
  orbit.radius=Math.max(14,(maxE+hb*2)*2.2);orbit.baseRadius=orbit.radius;
  orbit.targetX=0;orbit.targetY=sceneCenterY3d;orbit.targetZ=0;
  if(pipCamera){const ext=Math.max(4,maxE+hb*2)*1.3;pipCamera.left=-ext;pipCamera.right=ext;pipCamera.top=ext*.75;pipCamera.bottom=-ext*.75;pipCamera.updateProjectionMatrix();}
}

function syncBricksTo3D(){
  if(!bricksGroup3d) return;
  brickPosTweens=[];
  while(bricksGroup3d.children.length)bricksGroup3d.remove(bricksGroup3d.children[0]);
  const {cx,cy}=get3dLayoutOriginXY();
  bricks.forEach((b,idx)=>{
    const mesh=createBrickMesh3D(b);
    const p=getBrickPos3D(b,layout3dMode,cx,cy);
    mesh.position.set(p.x,p.y,p.z);
    mesh.userData={brickIndex:idx,layer:b.layer||0,tx:b.tx,ty:b.ty};
    bricksGroup3d.add(mesh);
  });
  updateLightForMode();
  _recalcOrbitBounds();
}

function switchLayout3D(toMode){
  if(toMode===layout3dMode||!bricksGroup3d||!bricksGroup3d.children.length) return;
  layout3dMode=toMode;
  const btn=document.getElementById('btn-3d-mode');
  btn.textContent=toMode==='flat'?'Flat':'Stack';
  btn.title=toMode==='flat'?'Currently: Flat layout (1:1 from 2D) — click for Stack':'Currently: Stack layout (layered) — click for Flat';

  const {cx,cy}=get3dLayoutOriginXY();
  const DUR=800;
  const start=performance.now();

  brickPosTweens=bricksGroup3d.children.map((mesh,i)=>{
    const b=bricks[i]; if(!b) return null;
    const from={x:mesh.position.x,y:mesh.position.y,z:mesh.position.z};
    const to=getBrickPos3D(b,toMode,cx,cy);
    return {mesh,from,to,delay:i*15,dur:DUR};
  }).filter(Boolean);

  updateLightForMode();
  const frozenTargetY=orbit.targetY;

  function step(){
    const now=performance.now()-start;
    let allDone=true;
    brickPosTweens.forEach(t=>{
      const elapsed=Math.max(0,now-t.delay);
      const raw=Math.min(1,elapsed/t.dur);
      const e=raw<.5?4*raw*raw*raw:(raw-1)*(2*raw-2)*(2*raw-2)+1;
      t.mesh.position.set(
        t.from.x+(t.to.x-t.from.x)*e,
        t.from.y+(t.to.y-t.from.y)*e,
        t.from.z+(t.to.z-t.from.z)*e
      );
      if(raw<1) allDone=false;
    });
    orbit.targetY=frozenTargetY;
    if(!allDone){ requestAnimationFrame(step); return; }
    brickPosTweens=[];
    const ch=bricksGroup3d.children;
    const newY=ch.length?ch.reduce((a,c)=>a+c.position.y,0)/ch.length:0;
    const camFrom=frozenTargetY,camDur=350,camT=performance.now();
    function camStep(){
      const p=Math.min(1,(performance.now()-camT)/camDur);
      const e=p<.5?4*p*p*p:(p-1)*(2*p-2)*(2*p-2)+1;
      orbit.targetY=camFrom+(newY-camFrom)*e;
      sceneCenterY3d=orbit.targetY;
      if(p<1) requestAnimationFrame(camStep);
      else _recalcOrbitBounds();
    }
    requestAnimationFrame(camStep);
  }
  requestAnimationFrame(step);
}

function setOrbitFrom2DView(){
  const name=currentPersp&&currentPersp.name?currentPersp.name:'Front View';
  let key='front';if(name==='Side View')key='side';else if(name==='Top View')key='top';else if(name==='Isometric')key='iso';
  const p=ANGLE_PRESETS[key];orbit.theta=p.theta;orbit.phi=p.phi;
}
function updateCamera3d(){
  const r=orbit.radius,t=orbit.theta,p=orbit.phi,tx=orbit.targetX,ty=orbit.targetY,tz=orbit.targetZ;
  camera3d.position.set(tx+r*Math.sin(p)*Math.cos(t),ty+r*Math.cos(p),tz+r*Math.sin(p)*Math.sin(t));
  camera3d.lookAt(tx,ty,tz);camera3d.updateProjectionMatrix();
}
function animateOrbitTo(theta,phi,dur,radius,tx,ty,tz){
  orbitTween={startTheta:orbit.theta,startPhi:orbit.phi,endTheta:theta,endPhi:phi,
    startRadius:orbit.radius,endRadius:radius!=null?radius:orbit.radius,
    startTX:orbit.targetX,startTY:orbit.targetY,startTZ:orbit.targetZ,
    endTX:tx!=null?tx:orbit.targetX,endTY:ty!=null?ty:orbit.targetY,endTZ:tz!=null?tz:orbit.targetZ,t:0,duration:dur||40};
}
function onOrbitStart(e){if(viewMode!=='3d')return;if(e.shiftKey&&phase==='holding'){if(start3dDrag(e))return;}orbit.dragging=true;orbit.prevX=orbit._startX=e.clientX;orbit.prevY=orbit._startY=e.clientY;orbitTween=null;}
function onOrbitMove(e){if(drag3d.active){move3dDrag(e);return;}if(!orbit.dragging)return;orbit.theta-=(e.clientX-orbit.prevX)*.008;orbit.phi=Math.max(.15,Math.min(Math.PI-.15,orbit.phi+(e.clientY-orbit.prevY)*.008));orbit.prevX=e.clientX;orbit.prevY=e.clientY;}
function onOrbitEnd(e){if(drag3d.active){end3dDrag();return;}if(orbit.dragging&&orbit.prevX===orbit._startX&&orbit.prevY===orbit._startY)pick3dBrick(e);orbit.dragging=false;}
function onOrbitZoom(e){
  if(viewMode!=='3d')return;
  const mw=document.getElementById('main-work');
  if(mw&&mw.scrollWidth>mw.clientWidth+2){
    const adx=Math.abs(e.deltaX),ady=Math.abs(e.deltaY);
    if(adx>=ady&&adx>0.5){ mw.scrollLeft+=e.deltaX; e.preventDefault(); return; }
    if(e.shiftKey&&ady>0.5){ mw.scrollLeft+=e.deltaY; e.preventDefault(); return; }
  }
  e.preventDefault();
  orbit.radius=Math.max(4,Math.min(80,orbit.radius+e.deltaY*.03));
}
function onResize3d(){if(!renderer3d||!camera3d)return;const c=document.getElementById('view-3d');const w=c.clientWidth,h=c.clientHeight;if(!w||!h)return;camera3d.aspect=w/h;camera3d.updateProjectionMatrix();renderer3d.setSize(w,h);}
/** 3D 时把 #view-3d 钉在 #main-work 可见矩形上（宽度=视口，与网页主区左缘对齐），避免超宽画布下场景在右侧看不见。 */
function syncView3dDock(){
  const mw=document.getElementById('main-work');
  const v3=document.getElementById('view-3d');
  if(!mw||!v3) return;
  if(viewMode==='3d'){
    mw.classList.add('view-3d-lock');
    const r=mw.getBoundingClientRect();
    v3.style.position='fixed';
    v3.style.left=Math.round(r.left)+'px';
    v3.style.top=Math.round(r.top)+'px';
    v3.style.width=Math.round(r.width)+'px';
    v3.style.height=Math.round(r.height)+'px';
    v3.style.right='auto';
    v3.style.bottom='auto';
    v3.style.zIndex='25';
    mw.scrollLeft=0;
    onResize3d();
  } else {
    mw.classList.remove('view-3d-lock');
    ['position','left','top','width','height','right','bottom','zIndex'].forEach(p=>{v3.style[p]='';});
  }
}
function start3dDrag(e){if(!renderer3d||!camera3d||!bricksGroup3d)return false;const rect=renderer3d.domElement.getBoundingClientRect();const mouse=new THREE.Vector2(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1);const rc=new THREE.Raycaster();rc.setFromCamera(mouse,camera3d);const meshes=[];bricksGroup3d.children.forEach(g=>{g.traverse(c=>{if(c.isMesh){c._pg=g;meshes.push(c);}});});const hits=rc.intersectObjects(meshes);if(!hits.length)return false;const group=hits[0].object._pg;if(!group)return false;const pn=new THREE.Vector3();camera3d.getWorldDirection(pn);const dp=new THREE.Plane().setFromNormalAndCoplanarPoint(pn,group.position);const ix=new THREE.Vector3();rc.ray.intersectPlane(dp,ix);drag3d={active:true,group,plane:dp,offset:ix.sub(group.position)};return true;}
function move3dDrag(e){if(!drag3d.active||!drag3d.group)return;const rect=renderer3d.domElement.getBoundingClientRect();const mouse=new THREE.Vector2(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1);const rc=new THREE.Raycaster();rc.setFromCamera(mouse,camera3d);const t=new THREE.Vector3();rc.ray.intersectPlane(drag3d.plane,t);if(t)drag3d.group.position.copy(t.sub(drag3d.offset));}
function end3dDrag(){if(!drag3d.active)return;const d=drag3d.group.userData;if(d&&typeof d.brickIndex==='number'&&bricks[d.brickIndex]){const s=SCALE_2D_TO_3D,{cx,cy}=get3dLayoutOriginXY(),b=bricks[d.brickIndex];b.tx=cx-drag3d.group.position.x/s;b.ty=cy-drag3d.group.position.z/s;b.x=b.tx;b.y=b.ty;}drag3d={active:false,group:null,plane:null,offset:null};}
/** Write 3D mesh positions back to bricks[] (same mapping as end3dDrag). Call before Share in 3D. */
function syncBricksFrom3DMeshesToData(){
  if(viewMode!=='3d'||!bricksGroup3d||bricksGroup3d.children.length!==bricks.length||!bricks.length) return;
  const s=SCALE_2D_TO_3D,{cx,cy}=get3dLayoutOriginXY();
  bricks.forEach((b,i)=>{
    const mesh=bricksGroup3d.children[i];
    if(!mesh) return;
    b.tx=cx-mesh.position.x/s;
    b.ty=cy-mesh.position.z/s;
    b.x=b.tx;b.y=b.ty;
  });
  recomputeFrontLayersBySupport();
}
function applyImportedView3d(meta){
  if(!meta||!meta.orbit) return;
  const o=meta.orbit;
  if(typeof o.theta==='number') orbit.theta=o.theta;
  if(typeof o.phi==='number') orbit.phi=o.phi;
  if(typeof o.radius==='number'){ orbit.radius=o.radius; orbit.baseRadius=o.radius; }
  if(typeof o.targetX==='number') orbit.targetX=o.targetX;
  if(typeof o.targetY==='number') orbit.targetY=o.targetY;
  if(typeof o.targetZ==='number') orbit.targetZ=o.targetZ;
  if(meta.layout3dMode==='stack'||meta.layout3dMode==='flat'){
    layout3dMode=meta.layout3dMode;
    const btn=document.getElementById('btn-3d-mode');
    if(btn){
      btn.textContent=layout3dMode==='flat'?'Flat':'Stack';
      btn.title=layout3dMode==='flat'?'Currently: Flat layout (1:1 from 2D) — click for Stack':'Currently: Stack layout (layered) — click for Flat';
    }
  }
  orbitTween=null;
}


// ── 3D brick highlight / inspect ──────────────────────────
let highlighted3d=null, preHighlightOrbit=null, _pendingHighlightIndex=-1;
const HIGHLIGHT_COLOR=0x00aaff, NORMAL_EDGE_COLOR=0x111111;

function mainWorkHasHorizontalOverflow(){
  const mw=document.getElementById('main-work');
  return !!(mw&&mw.scrollWidth>mw.clientWidth+2);
}
function refresh3dPanHint(){
  const hint=document.getElementById('status-hint');
  if(!hint||viewMode!=='3d'||highlighted3d) return;
  const wide=mainWorkHasHorizontalOverflow();
  const base=orbit.autoRotate?'auto-rotating · drag to orbit · 2D to edit':'drag to orbit · click brick to inspect · 2D to edit';
  hint.textContent=wide?base+' · shift+wheel or trackpad X to slide wide layout':base;
}
function updateMainWorkScrollChrome(){
  const mw=document.getElementById('main-work');
  if(!mw) return;
  const ov=mw.scrollWidth>mw.clientWidth+2;
  mw.classList.toggle('show-x-scrollbar-3d',viewMode==='3d'&&ov);
  refresh3dPanHint();
}

function highlight3dBrick(group){
  if(highlighted3d===group){unhighlight3d();return;}
  if(!highlighted3d){
    preHighlightOrbit={theta:orbit.theta,phi:orbit.phi,radius:orbit.radius,
      tx:orbit.targetX,ty:orbit.targetY,tz:orbit.targetZ};
  }
  unhighlight3dVisual();
  highlighted3d=group;
  group.traverse(child=>{
    if(child.isMesh) child.visible=false;
    if(child.isLineSegments&&child.material){
      child.material=child.material.clone();child.material.color.set(HIGHLIGHT_COLOR);}
  });
  const d=group.userData,hint=document.getElementById('status-hint');
  if(hint&&d) hint.textContent='Brick #'+(d.brickIndex+1)+'  ·  layer '+d.layer+'  ·  click empty to return';
  const pos=group.position,zoomRadius=Math.max(6,orbit.baseRadius*.35);
  animateOrbitTo(orbit.theta,orbit.phi,50,zoomRadius,pos.x,pos.y,pos.z);
  // Show annotation label in Alphabet mode
  show3dAnnotationLabel(group);
}

function unhighlight3dVisual(){
  if(!highlighted3d) return;
  highlighted3d.traverse(child=>{
    if(child.isMesh) child.visible=true;
    if(child.isLineSegments&&child.material){
      child.material=child.material.clone();child.material.color.set(NORMAL_EDGE_COLOR);}
  });
  highlighted3d=null;
  remove3dAnnotationLabel();
}

function unhighlight3d(){
  if(!highlighted3d&&!preHighlightOrbit) return;
  unhighlight3dVisual();
  if(preHighlightOrbit){
    const s=preHighlightOrbit;
    animateOrbitTo(s.theta,s.phi,50,s.radius,s.tx,s.ty,s.tz);
    preHighlightOrbit=null;
  }
  const hint=document.getElementById('status-hint');
  refresh3dPanHint();
}

function pick3dBrick(e){
  if(!renderer3d||!camera3d||!bricksGroup3d) return;
  const rect=renderer3d.domElement.getBoundingClientRect();
  const mouse=new THREE.Vector2(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1);
  const raycaster=new THREE.Raycaster();raycaster.setFromCamera(mouse,camera3d);
  const meshes=[];
  bricksGroup3d.children.forEach(group=>{group.traverse(child=>{if(child.isMesh){child._parentGroup=group;meshes.push(child);}});});
  const hits=raycaster.intersectObjects(meshes);
  if(hits.length>0){const group=hits[0].object._parentGroup;if(group)highlight3dBrick(group);}
  else unhighlight3d();
}

function loop3d(){
  if(viewMode!=='3d')return;
  if(orbitTween){orbitTween.t++;const p=Math.min(1,orbitTween.t/orbitTween.duration);const ease=1-Math.pow(1-p,3);const lp=(a,b)=>a+(b-a)*ease;orbit.theta=lp(orbitTween.startTheta,orbitTween.endTheta);orbit.phi=lp(orbitTween.startPhi,orbitTween.endPhi);orbit.radius=lp(orbitTween.startRadius,orbitTween.endRadius);orbit.targetX=lp(orbitTween.startTX,orbitTween.endTX);orbit.targetY=lp(orbitTween.startTY,orbitTween.endTY);orbit.targetZ=lp(orbitTween.startTZ,orbitTween.endTZ);if(p>=1)orbitTween=null;}
  else if(orbit.autoRotate&&!orbit.dragging) orbit.theta+=orbit.autoRotateSpeed;
  updateCamera3d();renderer3d.render(scene3d,camera3d);
  update3dAnnotationPosition();
  if(pipRenderer&&pipCamera&&scene3d){pipCamera.position.set(orbit.targetX,60,orbit.targetZ);pipCamera.lookAt(orbit.targetX,orbit.targetY,orbit.targetZ);const bg=scene3d.background;scene3d.background=new THREE.Color(0xf5f5f5);pipRenderer.render(scene3d,pipCamera);scene3d.background=bg;}
  anim3dId=requestAnimationFrame(loop3d);
}

function setViewMode(mode){
  viewMode=mode;const v3d=document.getElementById('view-3d'),b2d=document.getElementById('btn-view-2d'),b3d=document.getElementById('btn-view-3d'),ap=document.getElementById('view-angles');
  if(typeMode)exitTypeMode();
  const styleBtn=document.getElementById('btn-style');
  const addBrickBtn=document.getElementById('btn-add-brick');
  const moreBtn=document.getElementById('btn-more');
  const groupBtn=document.getElementById('btn-group');
  const ungroupBtn=document.getElementById('btn-ungroup');
  const rotateSelBtn=document.getElementById('btn-rotate-sel');
  const selectModeBtn=document.getElementById('btn-select-mode');
  const panelRandom=document.getElementById('panel-random');
  const panelClear=document.getElementById('panel-clear');
  const panelApply=document.getElementById('panel-apply');
  if(mode==='3d'){
    v3d.classList.add('active');b3d.classList.add('primary');b2d.classList.remove('primary');
    if(styleBtn) styleBtn.disabled=true;
    if(addBrickBtn) addBrickBtn.disabled=true;
    if(moreBtn) moreBtn.disabled=true;
    if(groupBtn) groupBtn.disabled=true;
    if(ungroupBtn) ungroupBtn.disabled=true;
    if(rotateSelBtn) rotateSelBtn.disabled=true;
    if(selectModeBtn) selectModeBtn.disabled=true;
    if(panelRandom) panelRandom.disabled=true;
    if(panelClear) panelClear.disabled=true;
    if(panelApply) panelApply.disabled=true;
    if(document.getElementById('custom-panel').classList.contains('visible')) closeCustomPanel(true);
    document.getElementById('btn-auto-rotate').style.display='';
    document.getElementById('btn-3d-mode').style.display='';
    const _m3btn=document.getElementById('btn-3d-mode');
    _m3btn.textContent=layout3dMode==='flat'?'Flat':'Stack';
    _m3btn.title=layout3dMode==='flat'?'Currently: Flat layout (1:1 from 2D) — click for Stack':'Currently: Stack layout (layered) — click for Flat';
    ap&&ap.classList.add('visible');
    if(typeof THREE==='undefined')return;
    syncView3dDock();
    initView3D();
    if(_pendingView3dRestore&&_pendingView3dRestore.orbit){
      applyImportedView3d(_pendingView3dRestore);
      _pendingView3dRestore=null;
    } else {
      setOrbitFrom2DView();
    }
    syncBricksTo3D();
    onResize3d();if(!anim3dId)loop3d();
    requestAnimationFrame(()=>{ if(viewMode==='3d'){ syncView3dDock(); onResize3d(); } });
    // Restore highlight if a brick was selected before switching to 2D
    if(_pendingHighlightIndex>=0&&bricksGroup3d&&bricksGroup3d.children[_pendingHighlightIndex]){
      highlight3dBrick(bricksGroup3d.children[_pendingHighlightIndex]);
      _pendingHighlightIndex=-1;
    }
  } else {
    v3d.classList.remove('active');
    syncView3dDock();
    b2d.classList.add('primary');b3d.classList.remove('primary');
    if(styleBtn) styleBtn.disabled=false;
    if(addBrickBtn) addBrickBtn.disabled=false;
    if(moreBtn) moreBtn.disabled=false;
    if(groupBtn) groupBtn.disabled=false;
    if(ungroupBtn) ungroupBtn.disabled=false;
    if(rotateSelBtn) rotateSelBtn.disabled=false;
    if(selectModeBtn) selectModeBtn.disabled=false;
    if(panelRandom) panelRandom.disabled=false;
    if(panelClear) panelClear.disabled=false;
    if(panelApply) panelApply.disabled=false;
    document.getElementById('btn-auto-rotate').style.display='none';
    document.getElementById('btn-3d-mode').style.display='none';
    ap&&ap.classList.remove('visible');
    // Save which brick was highlighted so we can restore on next 3D entry
    if(highlighted3d&&bricksGroup3d){
      _pendingHighlightIndex=bricksGroup3d.children.indexOf(highlighted3d);
    } else {
      _pendingHighlightIndex=-1;
    }
    if(highlighted3d){unhighlight3dVisual();preHighlightOrbit=null;}
    if(anim3dId){cancelAnimationFrame(anim3dId);anim3dId=null;}
    setStatus('holding');
  }
  updateMainWorkScrollChrome();
  if(phase==='holding') refreshShareSubmitUi();
}

document.getElementById('btn-view-2d').addEventListener('click',()=>setViewMode('2d'));
document.getElementById('btn-view-3d').addEventListener('click',()=>setViewMode('3d'));
document.getElementById('btn-3d-mode').addEventListener('click',()=>{
  switchLayout3D(layout3dMode==='flat'?'stack':'flat');
});
document.getElementById('btn-auto-rotate').addEventListener('click',()=>{if(viewMode!=='3d')return;orbit.autoRotate=!orbit.autoRotate;document.getElementById('btn-auto-rotate').classList.toggle('active',orbit.autoRotate);refresh3dPanHint();});

const ANGLE_PRESETS={front:{theta:-Math.PI/2,phi:Math.PI/2},side:{theta:0,phi:Math.PI*.38},top:{theta:0,phi:.05},iso:{theta:-Math.PI/4,phi:Math.PI*.42}};
document.getElementById('view-angles').addEventListener('click',e=>{
  const btn=e.target.closest('button[data-angle]');if(!btn||viewMode!=='3d')return;
  const preset=ANGLE_PRESETS[btn.dataset.angle];if(!preset)return;
  orbitTween=null;orbit.autoRotate=false;document.getElementById('btn-auto-rotate').classList.remove('active');
  animateOrbitTo(preset.theta,preset.phi,45);
  // Keep preHighlightOrbit in sync so unhighlight returns to THIS angle
  if(preHighlightOrbit){ preHighlightOrbit.theta=preset.theta; preHighlightOrbit.phi=preset.phi; }
  document.querySelectorAll('#view-angles button').forEach(b=>b.classList.remove('active'));btn.classList.add('active');
});

// ── Custom panel drag ─────────────────────────────────────
(()=>{
  const panel=document.getElementById('custom-panel');
  const handle=panel.querySelector('h3');
  let pd={active:false,ox:0,oy:0,pl:0,pt:0};
  handle.addEventListener('mousedown',e=>{
    if(e.button!==0) return;
    pd.active=true;
    pd.ox=e.clientX; pd.oy=e.clientY;
    pd.pl=parseInt(panel.style.left)||panel.offsetLeft;
    pd.pt=parseInt(panel.style.top)||panel.offsetTop;
    handle.style.cursor='grabbing';
    e.preventDefault();
  });
  window.addEventListener('mousemove',e=>{
    if(!pd.active) return;
    panel.style.left=(pd.pl+(e.clientX-pd.ox))+'px';
    panel.style.top =(pd.pt+(e.clientY-pd.oy))+'px';
  });
  window.addEventListener('mouseup',()=>{
    if(pd.active){ pd.active=false; handle.style.cursor='grab'; }
  });
})();

// ════════════════════════════════════════════════════════════
//  ORIGINAL SDF HELPERS (for built-in renderer)
// ════════════════════════════════════════════════════════════
function getActiveWordVisualScale(){
  return 1;
}
function getSDF(px,py,bx,by,view,rotated,size,depth){
  if(view==='side') return sdfSide(px,py,bx,by,size);
  if(view==='top') return sdfTop(px,py,bx,by,size,depth);
  if(perspectiveUsesIsoSnap()&&view==='front'&&!rotated) return sdfIsoFront(px,py,bx,by,rotated,size,depth);
  return sdfFront(px,py,bx,by,rotated,size);
}
function getStudCenters(bx,by,view,rotated,size,depth){
  const vs=getActiveWordVisualScale(),u=U*vs,bh=BH*vs,sw=SW*vs,sh=SH*vs,w=brickW(size);
  if(view==='side'||rotated)return[{sx:bx,sy:by-bh/2-sh/2,hw:sw/2,hh:sh/2}];
  if(view==='top'){
    const n=size||4,d=Math.max(1,depth||1),pr=sw/2,studs=[];
    for(let r=0;r<d;r++){
      const sy=by-(d-1)*u/2+r*u;
      for(let i=0;i<n;i++){
        const sx=bx-w/2+u*(i+0.5);
        studs.push({sx,sy,hw:pr,hh:pr});
      }
    }
    return studs;
  }
  if(perspectiveUsesIsoSnap()&&!rotated){
    const P=isoSketchBrickPack(bx,by,size,depth);
    const gyS=isoSketchStudGy();
    const eW=P.tW*0.52,rx=eW*0.5,ry=(P.tH*0.52)*0.5;
    const{tW,tH,ox,oy,BH,SH}=P;
    const gzc=BH+SH*0.5;
    const studs=[];
    for(let i=0;i<P.nx;i++){
      const p=isoSketchToScreen(i+0.5,gyS,gzc,tW,tH,ox,oy);
      studs.push({sx:p.x,sy:p.y,hw:rx,hh:ry});
    }
    return studs;
  }
  const n=size||4,studY=by-bh/2-sh/2,studs=[];for(let i=0;i<n;i++)studs.push(bx-w/2+u*(i+.5));return studs.map(sx=>({sx,sy:studY,hw:sw/2,hh:sh/2}));
}
function getStudGradient(px,py,bx,by,view,rotated,size,depth){const studs=getStudCenters(bx,by,view,rotated,size,depth);for(const{sx,sy,hw,hh}of studs){const nx=(px-sx)/hw,ny=(py-sy)/hh,e=nx*nx+ny*ny;if(e<=1)return Math.max(0,1-e);}return -1;}
/** Optional `isoQuads6`: precomputed `isoSketchFaceQuads6(P)` for hot per-pixel loops. */
function sdfBody(px,py,bx,by,view,rotated,size,depth, isoQuads6){
  const vs=getActiveWordVisualScale(),w=brickW(size),u=U*vs,bh=BH*vs,br=BR*vs;
  if(view==='side'||rotated) return sdBox(px,py,bx,by,bh/2,bh/2,br);
  if(view==='top') return sdBox(px,py,bx,by,w/2,Math.max(1,depth||1)*u/2,br);
  if(perspectiveUsesIsoSnap()&&view==='front'&&!rotated){
    if(isoQuads6) return sdfIsoPrism6FromQuads(px,py,isoQuads6);
    const P=isoSketchBrickPack(bx,by,size,depth);
    return sdfIsoPrism6(px,py,P);
  }
  return sdBox(px,py,bx,by,w/2,bh/2,br);
}
function getBounds(bx,by,view,rotated,size,depth){
  const vs=getActiveWordVisualScale(),w=brickW(size),u=U*vs,bh=BH*vs,sw=SW*vs,sh=SH*vs;
  if(view==='side'||rotated)return{x0:bx-bh/2-2,x1:bx+bh/2+2,y0:by-bh/2-sh-2,y1:by+bh/2+2};
  if(view==='top'){const hd=Math.max(1,depth||1)*u/2;return{x0:bx-w/2-2,x1:bx+w/2+2,y0:by-hd-2,y1:by+hd+2};}
  if(perspectiveUsesIsoSnap()&&!rotated){
    const e=isoBoundsExpand(bx,by,size,depth);
    return{x0:e.X0-2,y0:e.Y0-2,x1:e.X1+2,y1:e.Y1+2};
  }
  return{x0:bx-w/2-sw/2-2,x1:bx+w/2+sw/2+2,y0:by-bh/2-sh-2,y1:by+bh/2+2};
}
function sdfFront(px,py,bx,by,rotated,size){if(rotated)return sdfSide(px,py,bx,by,size);const vs=getActiveWordVisualScale(),w=brickW(size),u=U*vs,bh=BH*vs,sw=SW*vs,sh=SH*vs,br=BR*vs,sr=SR*vs,n=size||4;let d=sdBox(px,py,bx,by,w/2,bh/2,br);const top=by-bh/2;for(let i=0;i<n;i++){const sx=bx-w/2+u*(i+.5);d=Math.min(d,sdBox(px,py,sx,top-sh/2,sw/2,sh/2,sr));}return d;}
function sdfSide(px,py,bx,by){const vs=getActiveWordVisualScale(),bh=BH*vs,sw=SW*vs,sh=SH*vs,br=BR*vs,sr=SR*vs;let d=sdBox(px,py,bx,by,bh/2,bh/2,br);return Math.min(d,sdBox(px,py,bx,by-bh/2-sh/2,sw/2,sh/2,sr));}
function sdfTop(px,py,bx,by,size,depth){const vs=getActiveWordVisualScale(),w=brickW(size),u=U*vs,br=BR*vs;const hd=Math.max(1,depth||1)*u/2;return sdBox(px,py,bx,by,w/2,hd,br);}
function sdBox(px,py,cx,cy,hw,hh,r){r=r||0;const qx=Math.abs(px-cx)-hw+r,qy=Math.abs(py-cy)-hh+r;return Math.min(Math.max(qx,qy),0)+Math.sqrt(Math.max(qx,0)**2+Math.max(qy,0)**2)-r;}

// ════════════════════════════════════════════════════════════
//  PROJECTIONS
// ════════════════════════════════════════════════════════════
function projFront(bs,cx,cy){return bs.map(b=>({x:b.x,y:b.y,view:'front',size:b.size||4,depth:b.depth||1}));}
/** Right side elevation: each stud row keeps the rightmost brick only; stacked 1×1 side views centered at cx. Only the top piece shows studs (lower covered via getCoveredStudXs). Same rule for all compositions (Word = one merged silhouette if rows align). */
function projSide(bs,cx,cy){
  if(!bs.length) return[];
  const mcy=avg(bs.map(b=>b.y));
  const byRow=new Map();
  for(const b of bs){
    const row=Math.round((b.y-mcy)/BSTK);
    const prev=byRow.get(row);
    if(!prev||b.x>prev.x) byRow.set(row,{y:b.y});
  }
  const exposed=[...byRow.values()].sort((a,b)=>a.y-b.y);
  const n=exposed.length;
  const out=[];
  for(let i=0;i<n;i++)
    out.push({x:cx,y:cy-(n-1)*SIDE_STACK_Y/2+i*SIDE_STACK_Y,view:'side',size:1,depth:1});
  return out;
}
/** Bird’s-eye: only bricks visible from above — per front-view column (x), keep the topmost stud row; flatten to one line. */
function projTop(bs,cx,cy){
  if(!bs.length) return[];
  const mcx=avg(bs.map(b=>b.x)),mcy=avg(bs.map(b=>b.y));
  const byCol=new Map();
  for(const b of bs){
    const col=Math.round((b.x-mcx)/BW);
    const prev=byCol.get(col);
    if(!prev||b.y<prev.y) byCol.set(col,{x:b.x,y:b.y,size:b.size||4,depth:b.depth||1});
  }
  const exposed=[...byCol.values()].sort((a,b)=>a.x-b.x);
  const rowY=exposed.length?Math.min(...exposed.map(b=>b.y)):mcy;
  return exposed.map(b=>({x:cx+(b.x-mcx),y:cy+(rowY-mcy),view:'top',size:b.size||4,depth:b.depth||1}));
}
function projIso(bs,cx,cy){
  const mcx=avg(bs.map(b=>b.x)),mcy=avg(bs.map(b=>b.y));
  return bs.map(b=>{
    const dx=b.x-mcx,dy=b.y-mcy;
    const pos=isoCanvasFromLogical(cx,cy,dx,dy);
    return{x:pos.tx,y:pos.ty,view:'front',size:b.size||4,depth:b.depth||1,isoDx:dx,isoDy:dy};
  });
}
// ════════════════════════════════════════════════════════════
//  COMPOSITIONS
// ════════════════════════════════════════════════════════════
function bk(x,y,size,depth){return{x:Math.round(x),y:Math.round(y),size:size||4,depth:depth||1};}
function brickW(size){return(size||4)*U;}
function randUnit(){return rndItem(BRICK_UNITS);}
function randDepth(){return rndItem(BRICK_DEPTHS);}
function rbk(x,y){return bk(x,y,randUnit(),randDepth());}
function comp01(cx,cy){return[rbk(cx,cy)];}
function comp02(cx,cy){return[rbk(cx-BW/2,cy),rbk(cx+BW/2,cy)];}
function comp03(cx,cy){return[rbk(cx,cy+BSTK),rbk(cx,cy),rbk(cx,cy-BSTK)];}
function comp04(cx,cy){return[rbk(cx-U*3,cy+BSTK*1.5),rbk(cx-U,cy+BSTK*.5),rbk(cx+U,cy-BSTK*.5),rbk(cx+U*3,cy-BSTK*1.5)];}
function comp05(cx,cy){return[rbk(cx-BW/2,cy+BSTK),rbk(cx+BW/2,cy+BSTK),rbk(cx-BW/2,cy),rbk(cx+BW/2,cy),rbk(cx,cy-BSTK)];}
function comp06(cx,cy){return[rbk(cx,cy),rbk(cx,cy-BSTK),rbk(cx,cy+BSTK),rbk(cx-BW,cy),rbk(cx+BW,cy),rbk(cx,cy-BSTK*2)];}
function comp07(cx,cy){const lx=cx-BW*.7,rx=cx+BW*.7;return[rbk(lx,cy+BSTK),rbk(lx,cy),rbk(lx,cy-BSTK),rbk(rx,cy+BSTK),rbk(rx,cy),rbk(rx,cy-BSTK),rbk(cx,cy-BSTK*2)];}
function comp08_C(cx,cy){const x0=cx-BW,x1=cx,x2=cx+BW,y0=cy-BSTK*1.5,y1=cy-BSTK*.5,y2=cy+BSTK*.5,y3=cy+BSTK*1.5;return[rbk(x0,y0),rbk(x1,y0),rbk(x2,y0),rbk(x0,y1),rbk(x0,y2),rbk(x0,y3),rbk(x1,y3),rbk(x2,y3)];}
function comp09_U(cx,cy){const x0=cx-BW,x1=cx,x2=cx+BW,y0=cy-BSTK*1.5,y1=cy-BSTK*.5,y2=cy+BSTK*.5,y3=cy+BSTK*1.5;return[rbk(x0,y0),rbk(x0,y1),rbk(x0,y2),rbk(x0,y3),rbk(x1,y3),rbk(x2,y0),rbk(x2,y1),rbk(x2,y2),rbk(x2,y3)];}
function comp10_H(cx,cy){const x0=cx-BW,x2=cx+BW,y0=cy-BSTK*2,y1=cy-BSTK,y2=cy,y3=cy+BSTK,y4=cy+BSTK*2;return[rbk(x0,y0),rbk(x0,y1),rbk(x0,y2),rbk(x0,y3),rbk(x0,y4),rbk(x2,y0),rbk(x2,y1),rbk(x2,y2),rbk(x2,y3),rbk(x2,y4),rbk(cx,y2)];}
function compLetter(cx,cy){
  const letter=LETTERS[currentLetterIndex]||'A',grid=ALPHABET[letter];
  if(!grid)return[bk(cx,cy)];
  const cols=4,rows=5,totalW=cols*BW,totalH=rows*BSTK,out=[];
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)if(grid[r][c]===1)out.push(bk(cx-totalW/2+c*BW+BW/2,cy-totalH/2+r*BSTK+BSTK/2));
  return out.length?out:[bk(cx,cy)];
}
function compWord(cx,cy){
  if(!currentWord.length)return[bk(cx,cy)];
  const {cols,rows,stepX,stepY,letterW,letterH,gapX}=getWordMetrics(1);
  const lineLen=currentWord.length;
  const leftPad=BW*1.5;
  const firstCx=leftPad+letterW/2;
  const out=[];
  for(let li=0;li<currentWord.length;li++){
    const ch=currentWord[li].toUpperCase(),grid=ALPHABET[ch];if(!grid)continue;
    const lCx=firstCx+li*(letterW+gapX),lCy=cy;
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)if(grid[r][c]===1)out.push(bk(lCx-letterW/2+c*stepX+stepX/2,lCy-letterH/2+r*stepY+stepY/2));
  }
  return out.length?out:[bk(cx,cy)];
}

// ════════════════════════════════════════════════════════════
//  UTILS
// ════════════════════════════════════════════════════════════
function lerp(a,b,t){return a+(b-a)*t;}
function easeOutCubic(t){return 1-Math.pow(1-t,3);}
function avg(arr){return arr.reduce((a,b)=>a+b,0)/arr.length;}
function randomEdge(axis){
  const W=canvas.width,H=canvas.height;
  if(axis==='x')return Math.random()<.5?lerp(-150,-50,Math.random()):lerp(W+50,W+150,Math.random());
  return Math.random()<.5?lerp(-100,-40,Math.random()):lerp(H+40,H+100,Math.random());
}

// ════════════════════════════════════════════════════════════
//  BRICK ANNOTATION SYSTEM (3D only)
// ════════════════════════════════════════════════════════════
let _annotationLabel3d = null;

// ── grid position lookup ─────────────────────────────────
function getGridPos(brickIndex){
  const letter=LETTERS[currentLetterIndex]||'A';
  const grid=ALPHABET[letter];
  if(!grid) return null;
  const rows=5,cols=4;
  let idx=0;
  for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
    if(grid[r][c]===1){
      if(idx===brickIndex) return {r,c,grid,rows,cols};
      idx++;
    }
  }
  return null;
}

// ── typographic role classifier ──────────────────────────
function classifyBrickRole(row,col,grid){
  const rows=grid.length,cols=grid[0].length;
  const lit=(r,c)=>r>=0&&r<rows&&c>=0&&c<cols&&grid[r][c]===1;
  const up=lit(row-1,col),dn=lit(row+1,col),lf=lit(row,col-1),rt=lit(row,col+1);
  const conn=[up,dn,lf,rt].filter(Boolean).length;
  const onTop=row===0,onBot=row===rows-1,onLeft=col===0,onRight=col===cols-1;
  if(conn===0) return 'Dot';
  if(conn===1){
    if(onTop&&!up)  return 'Apex';
    if(onBot&&!dn)  return 'Foot';
    if(!up&&!dn)    return 'Arm End';
    if(onTop)       return 'Serif Cap';
    return 'Terminal';
  }
  if(conn===2){
    if(up&&dn&&!lf&&!rt) return (onLeft||onRight)?'Stem':'Spine';
    if(!up&&!dn&&lf&&rt){
      if(onTop) return 'Cap Line';
      if(onBot) return 'Base Line';
      return 'Cross Bar';
    }
    if((onTop||onBot)&&(onLeft||onRight)) return 'Serif Corner';
    return 'Shoulder';
  }
  if(conn===3){
    if(up&&dn&&(lf||rt)){
      if(onTop) return 'Crossbar Junction';
      if(onBot) return 'Spur';
      return 'Bar Junction';
    }
    if(onTop) return 'Apex Junction';
    return 'Counter Corner';
  }
  if(conn===4) return 'Nexus';
  return 'Stroke';
}

function describeRole(role){
  const map={
    'Apex':'topmost meeting point','Foot':'base terminal stroke',
    'Arm End':'free end of arm','Serif Cap':'capped stroke head',
    'Terminal':'open stroke end','Stem':'main vertical stroke',
    'Spine':'inner vertical stroke','Cap Line':'top horizontal stroke',
    'Base Line':'bottom horizontal stroke','Cross Bar':'connecting bar',
    'Serif Corner':'corner serif junction','Shoulder':'arch transition',
    'Bar Junction':'stem × bar node','Crossbar Junction':'crossbar attach',
    'Spur':'stem base projection','Apex Junction':'arm–stem apex',
    'Counter Corner':'counter boundary','Junction':'multi-stroke node',
    'Nexus':'four-way intersection','Dot':'isolated form','Stroke':'stroke unit',
  };
  return map[role]||role.toLowerCase();
}

function clearAnnotations(){ remove3dAnnotationLabel(); }

// ── 3D annotation: DOM card projected every frame + 3D leader line ──
function show3dAnnotationLabel(group){
  remove3dAnnotationLabel();
  if(!scene3d) return;
  const d=group.userData;
  if(typeof d.brickIndex!=='number') return;

  const isAlphabet=currentComp&&currentComp.name==='Alphabet';
  const letter=LETTERS[currentLetterIndex]||'A';
  let metaText='',roleText='',descText='';

  if(isAlphabet){
    const gp=getGridPos(d.brickIndex);
    if(gp){
      metaText=`${letter} · #${d.brickIndex+1} · R${gp.r+1} C${gp.c+1}`;
      roleText=classifyBrickRole(gp.r,gp.c,gp.grid);
      descText=describeRole(roleText);
    }
  } else {
    metaText=`Brick ${d.brickIndex+1} · layer ${d.layer}`;
    roleText=currentComp?currentComp.name:'';
    descText='';
  }

  // DOM card inside #view-3d (position:absolute)
  const el=document.createElement('div');
  el.id='annotation-label-3d';
  el.style.cssText='position:absolute;pointer-events:none;z-index:30;opacity:0;transition:opacity .18s;transform:translateY(-50%);';
  el.innerHTML=`<div class="label-3d-card">
    <div class="l3d-meta">${metaText}</div>
    <div class="l3d-role">${roleText}</div>
    ${descText?`<div class="l3d-desc">${descText}</div>`:''}
  </div>`;
  document.getElementById('view-3d').appendChild(el);

  // 3D leader line in scene
  const s=SCALE_2D_TO_3D;
  const brickTopY=BH*s;
  const worldPos=new THREE.Vector3();
  group.getWorldPosition(worldPos);
  const lineStart=worldPos.clone();
  lineStart.y+=brickTopY+SH*s*0.5;
  const lineEnd=worldPos.clone();
  lineEnd.y+=brickTopY+SH*s+0.06;

  const pts=[lineStart,lineEnd];
  const geo=new THREE.BufferGeometry().setFromPoints(pts);
  const mat=new THREE.LineBasicMaterial({color:0x222222});
  const leaderLine=new THREE.Line(geo,mat);
  scene3d.add(leaderLine);

  // Small dot at brick attachment
  const dotGeo=new THREE.SphereGeometry(0.018,8,8);
  const dotMat=new THREE.MeshBasicMaterial({color:0x222222});
  const dot=new THREE.Mesh(dotGeo,dotMat);
  dot.position.copy(lineStart);
  scene3d.add(dot);

  _annotationLabel3d={el,leaderLine,dot,group};
  // Fade in
  requestAnimationFrame(()=>{ el.style.opacity='1'; el.querySelector('.label-3d-card').classList.add('visible'); });
}

function remove3dAnnotationLabel(){
  if(!_annotationLabel3d) return;
  const {el,leaderLine,dot}=_annotationLabel3d;
  if(el) el.remove();
  if(scene3d){
    if(leaderLine){leaderLine.geometry.dispose();leaderLine.material.dispose();scene3d.remove(leaderLine);}
    if(dot){dot.geometry.dispose();dot.material.dispose();scene3d.remove(dot);}
  }
  _annotationLabel3d=null;
}

// Called every frame from loop3d — recomputes world position each frame so label tracks rotation
function update3dAnnotationPosition(){
  if(!_annotationLabel3d||!camera3d||!renderer3d) return;
  const {el,group}=_annotationLabel3d;
  const s=SCALE_2D_TO_3D;
  const brickTopY=BH*s;
  // Recompute world position every frame (tracks auto-rotate and view changes)
  const worldPos=new THREE.Vector3();
  group.getWorldPosition(worldPos);
  worldPos.y+=brickTopY+SH*s+0.06;
  worldPos.project(camera3d);
  const container=document.getElementById('view-3d');
  const w=container.clientWidth||renderer3d.domElement.offsetWidth;
  const h=container.clientHeight||renderer3d.domElement.offsetHeight;
  const sx=(worldPos.x+1)/2*w;
  const sy=(-worldPos.y+1)/2*h;
  el.style.left=(sx+12)+'px';
  el.style.top=sy+'px';
}
buildPanelPills();
bindParamControls();
initAlphabetPanel();
initAddBrickSpecMenu();
updateTypeSizeUi();
// Start in Alphabet mode at letter A
currentComp=CARD_A.find(c=>c.name==='Alphabet');
currentPersp=CARD_C.find(c=>c.name==='Front View')||CARD_C[0];
currentLetterIndex=0;
document.getElementById('btn-letters').classList.add('active');
document.getElementById('alphabet-panel').classList.add('visible');
applyCompAndStart();
