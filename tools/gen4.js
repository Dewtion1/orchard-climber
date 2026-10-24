// Valley generator: mutation-based like gen3.js, but chapter-aware. Each chapter allows a set of mechanics,
// features one power-up (which the shortest solution must use and which must matter), and has its own board
// size, solution window and trap-ratio floor.
// usage: node gen4.js <seed> <poolSize> <chapter 1-10>   -> writes pool4-ch<N>-<seed>.json (incrementally)
const fs=require('fs');
const {parseLevel,stepState,stateKey,solve,movesFor}=require('./rules.js');
const {analyse}=require('./gen2.js');
const CH={
  1:{allow:'CX',   grid:'14x12',sol:[10,40], dead:0,   apples:[2,5]},
  2:{allow:'CXB',  grid:'14x14',sol:[18,60], dead:0.03,apples:[3,6],needB:true},
  3:{allow:'CXBK', grid:'16x14',sol:[22,80], dead:0.04,apples:[3,6],feature:'K'},
  4:{allow:'CXBKQ',grid:'16x14',sol:[22,85], dead:0.04,apples:[3,7],feature:'Q'},
  5:{allow:'CXBKQP',grid:'16x16',sol:[25,90],dead:0.05,apples:[3,7],feature:'P'},
  6:{allow:'CXBKQPG',grid:'18x16',sol:[25,100],dead:0.04,apples:[3,7],feature:'G'},
  7:{allow:'CXBKQPGH',grid:'18x16',sol:[25,100],dead:0.06,apples:[3,7],feature:'H'},
  8:{allow:'CXBKQPGH',grid:'18x18',sol:[28,110],dead:0.06,apples:[3,8],det:true,needB:true},
  9:{allow:'CXBKQPGH',grid:'20x18',sol:[30,120],dead:0.08,apples:[4,9],anyPickup:true},
  10:{allow:'CXBKQPGH',grid:'20x18',sol:[35,130],dead:0.10,apples:[4,9],anyPickup:true},
};
let seed=+process.argv[2]||11;const POOL=+process.argv[3]||14;const CHN=+process.argv[4]||1;const C=CH[CHN];
const [W,H]=C.grid.split('x').map(Number);const AREA=(W*H)/(14*12),DET=!!C.det;
const [MIN_SOL,MAX_SOL]=C.sol,MIN_DIST=4;const CAP_SOLVE=Math.round(100000*AREA),CAP_AN=Math.round(260000*AREA);
const PICKS='KQPGH';const allowed=c=>C.allow.includes(c);
const P=rows=>parseLevel({rows,detonator:DET});
function rnd(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
const ri=(a,b)=>a+Math.floor(rnd()*(b-a+1));
const pick=a=>a[ri(0,a.length-1)];
const pad=rows=>{const h0=rows.length,w0=rows[0].length;if(h0===H&&w0===W)return rows;if(h0>H||w0>W)return null;
  const out=[];for(let y=0;y<H-h0;y++)out.push('.'.repeat(W));for(let y=0;y<h0;y++){const r=rows[y];out.push(r+(y===h0-1?'#':'.').repeat(W-w0));}return out;};
// strip mechanics this chapter does not allow
const sanitize=rows=>rows.map(r=>r.replace(/[CBXKQPGH]/g,c=>allowed(c)?c:(c==='B'&&allowed('C')?'C':'.')));
function load(){let parents=[];const add=l=>{const p=pad(l.rows);if(p)parents.push(sanitize(p));};
  for(const l of require('./levels50.json'))if(!l.tip&&!l.bonus)add(l);
  for(const l of require('./levels-big.json'))add(l);
  let extra=[];for(const f of fs.readdirSync('.'))if(/^pool4-ch\d+-.*\.json$/.test(f)){try{extra=extra.concat(JSON.parse(fs.readFileSync(f)));}catch(e){}}
  for(const p of extra)add(p);
  const known=extra.filter(p=>p.W===W&&p.H===H).map(p=>p.rows);
  return {parents,known};}
const dist=(a,b)=>{let d=0;for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(a[y][x]!==b[y][x])d++;return d;};
const toG=rows=>rows.map(r=>r.split(''));
const cells=(g,f)=>{const out=[];for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(f(g[y][x],x,y))out.push([x,y]);return out;};
const tops=g=>cells(g,(c,x,y)=>c==='.'&&y+1<H&&g[y+1][x]==='#');
const nearSnake=(g,x,y)=>{for(const [sx,sy] of cells(g,c=>c==='S'||c==='o'))if(Math.abs(sx-x)+Math.abs(sy-y)<=1)return true;return false;};
const freeCell=g=>{const t=cells(g,(c,x,y)=>c==='.'&&y>0&&y<H-1&&!nearSnake(g,x,y));return t.length?pick(t):null;};
const EDITS=[
  g=>{const a=cells(g,c=>c==='A');const t=freeCell(g);if(!a.length||!t)return false;const [ax,ay]=pick(a);g[ay][ax]='.';g[t[1]][t[0]]='A';return true;},
  g=>{const t=freeCell(g);if(!t)return false;g[t[1]][t[0]]='A';return true;},
  g=>{const a=cells(g,c=>c==='A');if(a.length<=2)return false;const [x,y]=pick(a);g[y][x]='.';return true;},
  g=>{const t=freeCell(g);if(!t)return false;g[t[1]][t[0]]='#';return true;},
  g=>{const r=cells(g,(c,x,y)=>c==='#'&&y<H-1);if(!r.length)return false;const [x,y]=pick(r);g[y][x]='.';return true;},
  g=>{const r=cells(g,(c,x,y)=>c==='#'&&y<H-1);if(!r.length)return false;const [x,y]=pick(r);const d=rnd()<.5?-1:1;const nx=x+d;if(nx<0||nx>=W||g[y][nx]!=='.')return false;g[y][x]='.';g[y][nx]='#';return true;},
  g=>{const r=cells(g,(c,x,y)=>c==='#'&&y<H-1);if(!r.length)return false;const [x,y]=pick(r);const len=ri(2,4);for(let i=1;i<=len;i++){const nx=x+i;if(nx<W&&g[y][nx]==='.'&&!nearSnake(g,nx,y))g[y][nx]='#';}return true;}, // extend a ledge
  g=>{const o=cells(g,c=>c==='C'||c==='B');const t=tops(g).filter(([x,y])=>!nearSnake(g,x,y));if(!o.length||!t.length)return false;const [ox,oy]=pick(o),[tx,ty]=pick(t);const c=g[oy][ox];g[oy][ox]='.';g[ty][tx]=c;return true;},
  g=>{const o=cells(g,c=>c==='C'||c==='B');if(o.length>=3)return false;const t=tops(g).filter(([x,y])=>!nearSnake(g,x,y));if(!t.length)return false;const [x,y]=pick(t);g[y][x]=(allowed('B')&&rnd()<.4)?'B':'C';return true;},
  g=>{const o=cells(g,c=>c==='C'||c==='B');if(o.length<=1)return false;const [x,y]=pick(o);g[y][x]='.';return true;},
  g=>{if(!allowed('X'))return false;const t=tops(g).filter(([x,y])=>!nearSnake(g,x,y));if(!t.length)return false;const [x,y]=pick(t);const run=ri(1,3);let n=0;for(let k=0;k<run;k++){const xx=x+k;if(xx<W&&g[y][xx]==='.'&&g[y+1]&&g[y+1][xx]==='#'&&!nearSnake(g,xx,y)){g[y][xx]='X';n++;}}return n>0;},
  g=>{const s=cells(g,c=>c==='X');if(!s.length)return false;const [x,y]=pick(s);g[y][x]='.';return true;},
  g=>{const e=cells(g,c=>c==='E');const t=tops(g).filter(([x,y])=>y<=H-3&&!nearSnake(g,x,y));if(!e.length||!t.length)return false;const [ex,ey]=e[0],[tx,ty]=pick(t);g[ey][ex]='.';g[ty][tx]='E';return true;},
  g=>{const ks=[...PICKS].filter(allowed);if(!ks.length)return false;const t=freeCell(g);if(!t)return false;g[t[1]][t[0]]=C.feature&&rnd()<.7?C.feature:pick(ks);return true;},
  g=>{const p=cells(g,c=>PICKS.includes(c));if(!p.length)return false;const [x,y]=pick(p);const t=freeCell(g);if(!t)return false;const c=g[y][x];g[y][x]='.';g[t[1]][t[0]]=c;return true;},
  g=>{const p=cells(g,c=>PICKS.includes(c));if(!p.length)return false;const [x,y]=pick(p);g[y][x]='.';return true;},
];
function mutate(rows){const g=toG(rows);const n=ri(2,5);let done=0;for(let i=0;i<n*4&&done<n;i++){if(pick(EDITS)(g))done++;}
  if(done<2)return null;
  if(C.feature&&!cells(g,c=>c===C.feature).length){const goals=cells(g,c=>c==='A'||c==='E');const near=cells(g,(c,x,y)=>c==='.'&&y>0&&y<H-1&&!nearSnake(g,x,y)&&goals.some(([gx,gy])=>Math.abs(gx-x)+Math.abs(gy-y)<=2));const t=near.length&&rnd()<.8?pick(near):freeCell(g);if(!t)return null;g[t[1]][t[0]]=C.feature;}
  if(C.needB&&!cells(g,c=>c==='B').length){const t=tops(g).filter(([x,y])=>!nearSnake(g,x,y));if(!t.length)return null;const [x,y]=pick(t);g[y][x]='B';}
  if(C.anyPickup&&!cells(g,c=>PICKS.includes(c)).length){const t=freeCell(g);if(!t)return null;g[t[1]][t[0]]=pick([...PICKS]);}
  const out=g.map(r=>r.join(''));const k=out.join('');const na=(k.match(/A/g)||[]).length;
  if(na<C.apples[0]||na>C.apples[1]||!k.includes('E')||!out[H-2].includes('S'))return null;
  if((k.match(/[KQPGH]/g)||[]).length>4)return null;
  const lv=parseLevel({rows:out});if(!lv.start.snake[0]||lv.start.snake.length!==2)return null;return out;}
function replay(rows,path){const lv=P(rows);let st=lv.start;const ev={push:0,explode:0,cut:0,plant:0,det:0,pick:{}};let falls=0,maxLen=0;const M=movesFor(lv);
  for(const c of path){const [dx,dy]=M.find(d=>d[2]===c);if(c==='B')ev.det++;const r=stepState(lv,st,dx,dy,c);if(!r)return null;st=r.state;
    for(const e of r.events){if(e.type==='pickup')ev.pick[e.t]=(ev.pick[e.t]||0)+1;else if(ev[e.type]!=null)ev[e.type]++;}
    if(r.fell)falls++;maxLen=Math.max(maxLen,st.snake.length);}
  return {ev,falls,maxLen};}

if(require.main===module){
const {parents,known}=load();const pool=[];const rej={bad:0,dup:0,gate:0,stripped:0,objects:0,pickups:0,feature:0,analyse:0,dead:0,near:0,samepath:0};let tries=0;
const parentSol=new Map();const solOf=rows=>{const k=rows.join('');if(!parentSol.has(k)){const r=solve(P(rows),CAP_SOLVE);parentSol.set(k,r?r.path:null);}return parentSol.get(k);};
const seen=new Set(known.map(r=>r.join('')));const t0=Date.now();
while(pool.length<POOL&&tries<400000){tries++;
  if(tries%100===0)process.stderr.write(`  ...tries ${tries} ${((Date.now()-t0)/1000).toFixed(0)}s rejected ${JSON.stringify(rej)}\n`);
  const parent=pick(parents);const rows=mutate(parent);if(!rows){rej.bad++;continue;}
  const k=rows.join('');if(seen.has(k)){rej.dup++;continue;}seen.add(k);
  const q=solve(P(rows),CAP_SOLVE);if(!q||q.path.length<MIN_SOL||q.path.length>MAX_SOL){rej.gate++;continue;}
  const crates=(k.match(/C/g)||[]).length,bombs=(k.match(/B/g)||[]).length;
  if((crates||bombs)&&solve(P(rows.map(r=>r.replace(/[CB]/g,'.'))),CAP_SOLVE)){rej.stripped++;continue;}
  const rp=replay(rows,q.path);if(!rp)continue;
  if(crates&&rp.ev.push<2){rej.objects++;continue;}
  if(bombs&&rp.ev.explode<1){rej.objects++;continue;}
  if(DET&&rp.ev.det<1){rej.objects++;continue;}
  // every pickup type on the board is used by the shortest solution; swords cut, seeds plant
  const present=[...new Set(k.match(/[KQPGH]/g)||[])];
  let ok=true;for(const t of present){if(!rp.ev.pick[t])ok=false;if(t==='K'&&!rp.ev.cut)ok=false;if(t==='P'&&!rp.ev.plant)ok=false;}
  if(!ok){rej.pickups++;continue;}
  // the featured power-up has to matter: without it the level is unsolvable or clearly longer
  if(C.feature){const need='QG'.includes(C.feature)?2:6;const s=solve(P(rows.map(r=>r.split(C.feature).join('.'))),CAP_SOLVE);if(s&&s.path.length<q.path.length+need){rej.feature++;continue;}}
  if(C.anyPickup&&!present.length){rej.feature++;continue;}
  if(q.path===solOf(parent)){rej.samepath++;continue;}
  let near=false;for(const o of known)if(dist(o,rows)<MIN_DIST){near=true;break;}if(!near)for(const o of pool)if(dist(o.rows,rows)<MIN_DIST){near=true;break;}
  if(near){rej.near++;continue;}
  const a=analyse(rows,CAP_AN,DET);if(!a){rej.analyse++;continue;}
  if(a.deadRatio<C.dead){rej.dead++;continue;}
  pool.push({rows,W,H,chapter:CHN,feature:C.feature||(DET?'det':''),...a,crates,bombs,detonator:DET||undefined,pickups:present.join(''),ev:rp.ev,falls:rp.falls,maxLen:rp.maxLen,parent:parent.join('')});
  parents.push(rows);known.push(rows);
  process.stderr.write(`ch${CHN} pool ${pool.length} (tries ${tries}, ${((Date.now()-t0)/1000).toFixed(0)}s) sol ${a.sol} dead ${(a.deadRatio*100).toFixed(0)}% pick ${present.join('')||'-'} push ${rp.ev.push} boom ${rp.ev.explode}\n`);
  fs.writeFileSync(`pool4-ch${CHN}-${process.argv[2]||'0'}.json`,JSON.stringify(pool));
}
fs.writeFileSync(`pool4-ch${CHN}-${process.argv[2]||'0'}.json`,JSON.stringify(pool));
console.log('ch',CHN,'tries',tries,'pool',pool.length,'secs',((Date.now()-t0)/1000).toFixed(0),'rejected',JSON.stringify(rej));
}
