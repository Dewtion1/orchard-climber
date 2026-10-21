// Procedural level generator with a hardness score, for Orchard Climber levels 6-50.
// Hardness = shortest solution length + apples + how much of the reachable state space is a dead end.
const {parseLevel,stepState}=require('./core.js');
const HAND=require('./levels.js');
const W=14,H=12;
let seed=+process.argv[2]||20261021;
function rnd(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
const ri=(a,b)=>a+Math.floor(rnd()*(b-a+1));
const DIRS=[[0,-1,'U'],[0,1,'D'],[-1,0,'L'],[1,0,'R']];
const key=(s,a)=>s.map(p=>p.join(',')).join(';')+'|'+a.map(p=>p.join(',')).sort().join(';');

// Full state graph: shortest solution, and fraction of reachable states that can no longer be solved.
function analyse(rows,cap=450000){
  const lv=parseLevel({rows});if(!lv.snake||!lv.snake[0])return null;
  const id=new Map(),states=[],adj=[];let goalDist=-1;
  const k0=key(lv.snake,lv.apples);id.set(k0,0);states.push({snake:lv.snake,apples:lv.apples});adj.push([]);
  let q=[0],depth=0,goals=[];
  while(q.length){const nq=[];for(const i of q){const st=states[i];for(const [dx,dy] of DIRS){
    const r=stepState(lv,st.snake,st.apples,dx,dy);if(!r||r.dead)continue;
    const k=key(r.snake,r.apples);let j=id.get(k);
    if(j==null){j=states.length;id.set(k,j);states.push({snake:r.snake,apples:r.apples});adj.push([]);nq.push(j);
      if(r.apples.length===0){goals.push(j);if(goalDist<0)goalDist=depth+1;}}
    adj[i].push(j);}}
    q=nq;depth++;if(states.length>cap)return null;}
  if(goalDist<0)return null;
  // reverse reachability from goal states
  const radj=states.map(()=>[]);adj.forEach((ns,i)=>ns.forEach(j=>radj[j].push(i)));
  const ok=new Uint8Array(states.length);let st=goals.slice();for(const g of goals)ok[g]=1;
  while(st.length){const i=st.pop();for(const p of radj[i])if(!ok[p]){ok[p]=1;st.push(p);}}
  let dead=0;for(let i=0;i<states.length;i++)if(!ok[i])dead++;
  return {sol:goalDist,states:states.length,deadRatio:dead/states.length,apples:lv.apples.length};
}

function blank(){const g=[];for(let y=0;y<H;y++)g.push(Array(W).fill('.'));for(let x=0;x<W;x++)g[H-1][x]='#';return g;}
function gen(diff){
  const g=blank();
  const sx=ri(1,W-3),dir=rnd()<.5?1:-1;g[H-2][sx]='S';g[H-2][sx-dir]='o';
  // pits in the floor
  const nPits=rnd()<.3+diff*.5?ri(1,1+Math.round(diff)):0;
  for(let p=0;p<nPits;p++){const px=ri(1,W-3),pw=rnd()<.4?2:1;for(let i=0;i<pw;i++){const x=px+i;if(x<W-1&&Math.abs(x-sx)>1&&Math.abs(x-(sx-dir))>1)g[H-1][x]='.';}}
  // floor apples
  const fa=ri(1,2);for(let i=0;i<fa;i++){const x=ri(1,W-2);if(g[H-2][x]==='.'&&g[H-1][x]==='#')g[H-2][x]='A';}
  // shelves bottom-up, with ceilings, pillars, hanging apples
  const nShelf=ri(3,4+Math.round(diff*2));let row=H-1-ri(2,3);
  for(let s=0;s<nShelf&&row>=1;s++){
    const len=ri(2,7),x0=ri(0,W-len);
    for(let x=x0;x<x0+len;x++)g[row][x]='#';
    const ax=ri(x0,x0+len-1);if(row-1>=0&&g[row-1][ax]==='.')g[row-1][ax]='A';
    if(rnd()<.25+diff*.4){const px=ri(0,W-1),ph=ri(1,3);for(let k=1;k<=ph;k++){const y=row+k;if(y<H-1&&g[y][px]==='.')g[y][px]='#';}}
    if(rnd()<diff*.6){ // ceiling: a short run 2 rows above part of this shelf, with an apple tucked under it
      const cl=ri(2,4),cx=ri(Math.max(0,x0-1),Math.min(W-cl,x0+len));const cy=row-ri(3,4);
      if(cy>=0){for(let x=cx;x<cx+cl;x++)if(g[cy][x]==='.')g[cy][x]='#';const hx=ri(cx,cx+cl-1);if(g[cy+1][hx]==='.'&&rnd()<.7)g[cy+1][hx]='A';}}
    if(rnd()<.2+diff*.4){const fx=ri(0,W-1),fy=ri(Math.max(0,row-3),row-1);if(fy>=0&&g[fy][fx]==='.')g[fy][fx]='A';}
    row-=ri(2,3+Math.round(diff));
  }
  // wall stubs and scattered blocks to force routing and make the body get in the way
  const nStubs=ri(1,2+Math.round(diff*2));
  for(let t=0;t<nStubs;t++){const wx=ri(1,W-2),wh=ri(2,5),base=ri(0,1)?H-1:ri(4,H-3);for(let k=1;k<=wh;k++){const y=base-k;if(y>=0&&g[y][wx]==='.'&&!(y===H-2&&Math.abs(wx-sx)<=1))g[y][wx]='#';}}
  const nScatter=ri(2,4+Math.round(diff*6));
  for(let t=0;t<nScatter;t++){const x=ri(0,W-1),y=ri(1,H-3);if(g[y][x]==='.'&&!(y===H-2&&Math.abs(x-sx)<=1))g[y][x]='#';}
  // side walls with a doorway, sometimes
  if(rnd()<diff*.7){const wx=ri(3,W-4),door=ri(2,H-3);for(let y=1;y<H-1;y++)if(y!==door&&y!==door-1&&g[y][wx]==='.'&&!(y===H-2&&Math.abs(wx-sx)<=1))g[y][wx]='#';}
  const rows=g.map(r=>r.join(''));
  const na=rows.join('').split('A').length-1;
  if(na<5||na>8||!rows[H-2].includes('S'))return null;
  return rows;
}

const NAMES=["Low Branches","Two Shelves","Little Hop","Windfall","The Ledge","Side Step","Stacked Crates","Long Reach","Green Rungs","Up and Over","Pit Lane","The Narrow Gap","Hanging Fruit","Loose Stones","Attic Apples","Double Back","The Overhang","Crow's Nest","Trellis","High Shelf","Rope Bridge","The Chimney","Corner Pocket","Slow Climb","Teetering","Barn Loft","Thin Ice","Long Way Round","Orchard Wall","Last Light","Bramble Patch","Hay Bales","Cold Store","The Dovecote","Lantern Hook","Sawdust","Press House","Ridge Walk","Cider Run","Sunset Ladder","Night Pick","Frost Pocket","Treetop","The Big Drop","Harvest Home"];
const want=45,pool=[],seenRows=new Set();let tries=0;
const score=a=>a.sol+4*a.apples+60*a.deadRatio;
const POOL=+process.argv[3]||60;
while(pool.length<POOL&&tries<40000){tries++;
  const rows=gen(Math.min(1,.35+pool.length/POOL*.65));if(!rows)continue;
  const k=rows.join('');if(seenRows.has(k))continue;seenRows.add(k);
  const a=analyse(rows);if(!a)continue;
  if(a.sol<34||a.sol>160)continue;
  pool.push({rows,...a,score:score(a)});
  if(pool.length%10===0)process.stderr.write(`pool ${pool.length} (tries ${tries})\n`);
}
require('fs').writeFileSync(`pool-${process.argv[2]||'0'}.json`,JSON.stringify(pool));console.log('tries',tries,'pool',pool.length);
