// ── sketch4 base unit ──
const BASE_U = 16;

// ── All transforms + methods (id = stored in customStyle; label = panel UI) ──
const TRANSFORM_OPTIONS=[
  { id:'Front',      label:'Standard front', title:'Normal flat brick — one face, four studs.'},
  { id:'Isometric',  label:'Three faces',    title:'Mini 3D: top + front + side (isometric block).'},
  { id:'Stretch',    label:'Stretch',      title:'Widen or squash the brick body.'},
  { id:'Melt',       label:'Melt',         title:'Soft, rounded silhouette.'},
  { id:'Explode',    label:'Explode',      title:'Studs pushed away from the body.'},
  { id:'Shadow',     label:'+ Shadow',     title:'Same brick with a drop shadow on the “ground”.'},
];
const METHOD_OPTIONS=[
  { id:'Concentric',  label:'Rings',         title:'Concentric oval / ring lines.'},
  { id:'Dots',        label:'Dots',          title:'Regular grid of dots.'},
  { id:'H-Lines',     label:'H stripes',     title:'Horizontal line fill.'},
  { id:'Diagonal',    label:'Diagonal',      title:'Slanted line fill.'},
  { id:'Cross-Hatch', label:'Cross hatch',   title:'Two diagonal directions crossed.'},
  { id:'Stipple',     label:'Fine stipple',  title:'Dense tiny dots / speckle.'},
  { id:'Pixel Grid',  label:'Pixel blocks',  title:'Chunky pixel mosaic.'},
  { id:'Radial',      label:'Sunburst',      title:'Straight rays from a center point.'},
  { id:'Wave',        label:'Waves',         title:'Wavy flowing lines.'},
  { id:'Noise',       label:'Grain',         title:'Soft random noise texture.'},
];
const ALL_TX =TRANSFORM_OPTIONS.map(o=>o.id);
const ALL_MTH=METHOD_OPTIONS.map(o=>o.id);

// ── Style presets ──
const STYLE_PRESETS = [
  { label:'Dash',        mode:'builtin', builtin:'dashed'  },
  { label:'Hatch',       mode:'builtin', builtin:'hatch'   },
  { label:'Concentric',  mode:'preset',  tx:'Front',      method:'Concentric' },
  { label:'Iso Mix',     mode:'preset',  tx:'Isometric',  method:'random'     },
  { label:'Shadow',      mode:'preset',  tx:'Shadow',     method:'H-Lines'    },
  { label:'Random', mode:'random'                                         },
];
/** -1 = default solid outline (same as removed “Line”); not an entry in STYLE_PRESETS */
function stylePresetAt(i){
  if(i<0) return { label:'Outline', mode:'builtin', builtin:'outline' };
  return STYLE_PRESETS[i];
}
let styleIndex = -1;
let brickStyle = 'outline';

// ── Alphabet ──
const ALPHABET = {
  A:[[0,1,1,0],[1,0,0,1],[1,1,1,1],[1,0,0,1],[1,0,0,1]],
  B:[[1,1,1,0],[1,0,0,1],[1,1,1,0],[1,0,0,1],[1,1,1,0]],
  C:[[1,1,1,1],[1,0,0,0],[1,0,0,0],[1,0,0,0],[1,1,1,1]],
  D:[[1,1,1,0],[1,0,0,1],[1,0,0,1],[1,0,0,1],[1,1,1,0]],
  E:[[1,1,1,1],[1,0,0,0],[1,1,1,0],[1,0,0,0],[1,1,1,1]],
  F:[[1,1,1,1],[1,0,0,0],[1,1,1,0],[1,0,0,0],[1,0,0,0]],
  G:[[1,1,1,1],[1,0,0,0],[1,0,1,1],[1,0,0,1],[1,1,1,1]],
  H:[[1,0,0,1],[1,0,0,1],[1,1,1,1],[1,0,0,1],[1,0,0,1]],
  I:[[1,1,1,1],[0,1,1,0],[0,1,1,0],[0,1,1,0],[1,1,1,1]],
  J:[[0,1,1,1],[0,0,0,1],[0,0,0,1],[1,0,0,1],[1,1,1,0]],
  K:[[1,0,0,1],[1,0,1,0],[1,1,0,0],[1,0,1,0],[1,0,0,1]],
  L:[[1,0,0,0],[1,0,0,0],[1,0,0,0],[1,0,0,0],[1,1,1,1]],
  M:[[1,0,0,1],[1,1,1,1],[1,1,1,1],[1,0,0,1],[1,0,0,1]],
  N:[[1,0,0,1],[1,1,0,1],[1,1,0,1],[1,0,1,1],[1,0,0,1]],
  O:[[1,1,1,1],[1,0,0,1],[1,0,0,1],[1,0,0,1],[1,1,1,1]],
  P:[[1,1,1,1],[1,0,0,1],[1,1,1,1],[1,0,0,0],[1,0,0,0]],
  Q:[[1,1,1,1],[1,0,0,1],[1,0,0,1],[1,0,1,1],[1,1,1,1]],
  R:[[1,1,1,1],[1,0,0,1],[1,1,1,0],[1,0,1,0],[1,0,0,1]],
  S:[[1,1,1,1],[1,0,0,0],[1,1,1,1],[0,0,0,1],[1,1,1,1]],
  T:[[1,1,1,1],[0,1,1,0],[0,1,1,0],[0,1,1,0],[0,1,1,0]],
  U:[[1,0,0,1],[1,0,0,1],[1,0,0,1],[1,0,0,1],[1,1,1,1]],
  V:[[1,0,0,1],[1,0,0,1],[1,0,0,1],[1,1,1,1],[0,1,1,0]],
  W:[[1,0,0,1],[1,0,0,1],[1,0,0,1],[1,1,1,1],[1,1,1,1]],
  X:[[1,0,0,1],[0,1,1,0],[0,1,1,0],[0,1,1,0],[1,0,0,1]],
  Y:[[1,0,0,1],[1,0,0,1],[1,1,1,1],[0,1,1,0],[0,1,1,0]],
  Z:[[1,1,1,1],[0,0,1,0],[0,1,0,0],[1,0,0,0],[1,1,1,1]],
};
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
let currentLetterIndex = 0;

// ── State ──
let bricks=[], phase='idle', phaseTimer=0;
let currentComp, currentPersp, resultCount=0, animId=null;
let dragBrick=null, dragOffX=0, dragOffY=0, snapTarget=null, _lastSnap=null;
let _dragOrigin=null;
let savedOriginalLayout=null, undoStack=[], preDragSnapshot=null;
let currentWord='';
let typeMode=false, viewMode='2d';
let _librarySourceSnapshot=null; // optional metadata from shared JSON for Share + labels (Imported mode)
let layout3dMode='flat'; // 'flat' | 'stack'
let _pendingView3dRestore=null; // applied next time user enters 3D (after Library import)
let brickPosTweens=[]; // per-brick position animations
let _snapPulse=0;
let selectedBricks=new Set();
let groupCounter=1;
let marquee=null; // {x0,y0,x1,y1,active}
let groupDrag=null; // {members:[{b,dx,dy}],anchor,start}
let touchGesture=null; // {dist,ang,cx,cy,snap}
let marqueeMode='contain'; // 'contain' | 'touch'
