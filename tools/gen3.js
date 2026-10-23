// Mutation generator: takes accepted levels as parents, applies a few random edits, and keeps the
// children that pass the same acceptance tests as gen2.js. Far higher yield than random boards because
// a parent is already solvable and already needs its objects.
// usage: node gen3.js <seed> <poolSize> [deadFloor]   -> writes pool3-<seed>.json (incrementally)
// Parents: tools/levels50.json plus any pool3-*.json already on disk (so later runs build on earlier ones).
const fs=require('fs');
const {parseLevel,stepState,stateKey,solve,DIRS}=require('./rules.js');
const {analyse,replay}=require('./gen2.js');
// GRID=WxH makes bigger boards: 14x12 parents are padded (sky above, floor to the right) and mutated harder until the new space is used
let W=14,H=12;if(process.env.GRID){const m=/^(\d+)x(\d+)$/.exec(process.env.GRID);if(m){W=+m[1];H=+m[2];}}
const BIG=W!==14||H!==12,AREA=(W*H)/(14*12),TAG=process.env.GRID?process.env.GRID+'-':'';
let seed=+process.argv[2]||11;const POOL=+process.argv[3]||20;const DEAD_FLOOR=process.argv[4]!=null?+process.argv[4]:0.08;
const [MIN_SOL,MAX_SOL]=[30,Math.round(170*Math.sqrt(AREA))],MIN_DIST=4;const CAP_SOLVE=Math.round(90000*AREA),CAP_AN=Math.round(260000*AREA);
function rnd(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
const ri=(a,b)=>a+Math.floor(rnd()*(b-a+1));
const pick=a=>a[ri(0,a.length-1)];

const pad=rows=>{const h0=rows.length,w0=rows[0].length;if(h0===H&&w0===W)return rows;if(h0>H||w0>W)return null;
  const out=[];for(let y=0;y<H-h0;y++)out.push('.'.repeat(W));for(let y=0;y<h0;y++){const r=rows[y];out.push(r+(y===h0-1?'#':'.').repeat(W-w0));}return out;};
function load(){const base=require('./levels50.json').filter(l=>!l.tip&&!l.bonus);let extra=[];
  const re=new RegExp('^pool3-'+TAG+'.*\\.json$');for(const f of fs.readdirSync('.'))if(re.test(f)){try{extra=extra.concat(JSON.parse(fs.readFileSync(f)));}catch(e){}}
  const parents=[...base.map(l=>pad(l.rows)).filter(Boolean),...extra.map(p=>p.rows)];
  const known=BIG?extra.map(p=>p.rows):[...require('./levels50.json').map(l=>l.rows),...extra.map(p=>p.rows)];
  return {parents,known};}
// for big boards: the padded region (top rows, right columns) must actually hold something, not just sky
const usesNew=rows=>{if(!BIG)return true;let n=0;for(let y=0;y<H;y++)for(let x=0;x<W;x++){if((y<H-12||x>=14)&&y<H-1&&rows[y][x]!=='.')n++;}return n>=3;};
const dist=(a,b)=>{let d=0;for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(a[y][x]!==b[y][x])d++;return d;};
const toG=rows=>rows.map(r=>r.split(''));
const cells=(g,f)=>{const out=[];for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(f(g[y][x],x,y))out.push([x,y]);return out;};
const tops=g=>cells(g,(c,x,y)=>c==='.'&&y+1<H&&g[y+1][x]==='#');          // empty cells standing on rock
const nearSnake=(g,x,y)=>{for(const [sx,sy] of cells(g,c=>c==='S'||c==='o'))if(Math.abs(sx-x)+Math.abs(sy-y)<=1)return true;return false;};
// one random edit; returns false if it could not apply
const EDITS=[
  g=>{const a=cells(g,c=>c==='A');const t=cells(g,(c,x,y)=>c==='.'&&y>0&&y<H-1&&!nearSnake(g,x,y));if(!a.length||!t.length)return false;const [ax,ay]=pick(a),[tx,ty]=pick(t);g[ay][ax]='.';g[ty][tx]='A';return true;},
  g=>{const a=cells(g,c=>c==='A');const t=cells(g,(c,x,y)=>c==='.'&&!nearSnake(g,x,y));if(a.length>=8||!t.length)return false;const [x,y]=pick(t);g[y][x]='A';return true;},
  g=>{const a=cells(g,c=>c==='A');if(a.length<=4)return false;const [x,y]=pick(a);g[y][x]='.';return true;},
  g=>{const t=cells(g,(c,x,y)=>c==='.'&&y>0&&y<H-1&&!nearSnake(g,x,y));if(!t.length)return false;const [x,y]=pick(t);g[y][x]='#';return true;},
  g=>{const r=cells(g,(c,x,y)=>c==='#'&&y<H-1);if(!r.length)return false;const [x,y]=pick(r);g[y][x]='.';return true;},
  g=>{const r=cells(g,(c,x,y)=>c==='#'&&y<H-1);if(!r.length)return false;const [x,y]=pick(r);const d=rnd()<.5?-1:1;const nx=x+d;if(nx<0||nx>=W||g[y][nx]!=='.')return false;g[y][x]='.';g[y][nx]='#';return true;}, // slide a rock block sideways
  g=>{const o=cells(g,c=>c==='C'||c==='B');const t=tops(g).filter(([x,y])=>!nearSnake(g,x,y));if(!o.length||!t.length)return false;const [ox,oy]=pick(o),[tx,ty]=pick(t);const c=g[oy][ox];g[oy][ox]='.';g[ty][tx]=c;return true;},
  g=>{const o=cells(g,c=>c==='C'||c==='B');if(o.length>=3)return false;const t=tops(g).filter(([x,y])=>!nearSnake(g,x,y));if(!t.length)return false;const [x,y]=pick(t);g[y][x]=rnd()<.7?'C':'B';return true;},
  g=>{const o=cells(g,c=>c==='C'||c==='B');if(o.length<=1)return false;const [x,y]=pick(o);g[y][x]='.';return true;},
  g=>{const t=tops(g).filter(([x,y])=>!nearSnake(g,x,y));if(!t.length)return false;const [x,y]=pick(t);const run=ri(1,3);let n=0;for(let k=0;k<run;k++){const xx=x+k;if(xx<W&&g[y][xx]==='.'&&g[y+1]&&g[y+1][xx]==='#'&&!nearSnake(g,xx,y)){g[y][xx]='X';n++;}}return n>0;},
  g=>{const s=cells(g,c=>c==='X');if(!s.length)return false;const [x,y]=pick(s);g[y][x]='.';return true;},
  g=>{const e=cells(g,c=>c==='E');const t=tops(g).filter(([x,y])=>y<=H-3&&!nearSnake(g,x,y));if(!e.length||!t.length)return false;const [ex,ey]=e[0],[tx,ty]=pick(t);g[ey][ex]='.';g[ty][tx]='E';return true;},
  g=>{const s=cells(g,c=>c==='S'),o=cells(g,c=>c==='o');if(s.length!==1||o.length!==1)return false;const [sx,sy]=s[0],[ox,oy]=o[0];const d=rnd()<.5?-1:1;const nsx=sx+d,nox=ox+d;
    if(nsx<0||nsx>=W||nox<0||nox>=W||sy!==H-2||g[sy][nsx]!=='.'&&nsx!==ox||g[oy][nox]!=='.'&&nox!==sx||g[H-1][nsx]!=='#'||g[H-1][nox]!=='#')return false;g[sy][sx]='.';g[oy][ox]='.';g[sy][nsx]='S';g[oy][nox]='o';return true;}
];
function mutate(rows){const g=toG(rows);const n=BIG?ri(4,8):ri(2,4);let done=0;for(let i=0;i<n*4&&done<n;i++){if(pick(EDITS)(g))done++;}
  if(done<2)return null;const out=g.map(r=>r.join(''));const k=out.join('');const na=(k.match(/A/g)||[]).length;
  if(na<4||na>(BIG?Math.min(12,Math.round(8*AREA)):8)||!/[CB]/.test(k)||!usesNew(out)||!k.includes('E')||!out[H-2].includes('S'))return null;
  // the head must still have its body next to it
  const lv=parseLevel({rows:out});if(!lv.start.snake[0]||lv.start.snake.length!==2)return null;return out;}

if(require.main===module){
const {parents,known}=load();const pool=[];const rej={bad:0,dup:0,gate:0,stripped:0,pushes:0,booms:0,analyse:0,dead:0,near:0,samepath:0};let tries=0;
const parentSol=new Map();const solOf=rows=>{const k=rows.join('');if(!parentSol.has(k)){const r=solve(parseLevel({rows}),CAP_SOLVE);parentSol.set(k,r?r.path:null);}return parentSol.get(k);};
const seen=new Set(known.map(r=>r.join('')));
const t0=Date.now();
while(pool.length<POOL&&tries<200000){tries++;
  const parent=pick(parents);const rows=mutate(parent);if(!rows){rej.bad++;continue;}
  const k=rows.join('');if(seen.has(k)){rej.dup++;continue;}seen.add(k);
  const q=solve(parseLevel({rows}),CAP_SOLVE);if(!q||q.path.length<MIN_SOL||q.path.length>MAX_SOL){rej.gate++;continue;}
  if(solve(parseLevel({rows:rows.map(r=>r.replace(/[CB]/g,'.'))}),CAP_SOLVE)){rej.stripped++;continue;}
  const crates=(k.match(/C/g)||[]).length,bombs=(k.match(/B/g)||[]).length;
  const rp=replay(rows,q.path);if(!rp)continue;
  if(crates&&rp.pushes<2){rej.pushes++;continue;}
  if(bombs&&rp.booms<1){rej.booms++;continue;}
  // must play differently from its parent and sit far enough from every known level
  if(q.path===solOf(parent)){rej.samepath++;continue;}
  let near=false;for(const o of known)if(dist(o,rows)<MIN_DIST){near=true;break;}if(!near)for(const o of pool)if(dist(o.rows,rows)<MIN_DIST){near=true;break;}
  if(near){rej.near++;continue;}
  const a=analyse(rows,CAP_AN);if(!a){rej.analyse++;continue;}
  if(a.deadRatio<DEAD_FLOOR){rej.dead++;continue;}
  pool.push({rows,W,H,...a,crates,bombs,spikes:(k.match(/X/g)||[]).length,pushes:rp.pushes,booms:rp.booms,falls:rp.falls,maxLen:rp.maxLen,mode:'mutate',parent:parent.join('')});
  parents.push(rows);known.push(rows);
  process.stderr.write(`pool ${pool.length} (tries ${tries}, ${((Date.now()-t0)/1000).toFixed(0)}s) sol ${a.sol} dead ${(a.deadRatio*100).toFixed(0)}% pushes ${rp.pushes} booms ${rp.booms}\n`);
  fs.writeFileSync(`pool3-${TAG}${process.argv[2]||'0'}.json`,JSON.stringify(pool));
}
fs.writeFileSync(`pool3-${TAG}${process.argv[2]||'0'}.json`,JSON.stringify(pool));
console.log('tries',tries,'pool',pool.length,'secs',((Date.now()-t0)/1000).toFixed(0),'rejected',JSON.stringify(rej));
}
module.exports={mutate};
