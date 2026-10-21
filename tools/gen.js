// Procedural level generator + BFS solver filter for Orchard Climber.
const {parseLevel,stepState}=require('./core.js');
const HAND=require('./levels.js');
const W=14,H=12;
let seed=20261021;
function rnd(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
const ri=(a,b)=>a+Math.floor(rnd()*(b-a+1));
const DIRS=[[0,-1,'U'],[0,1,'D'],[-1,0,'L'],[1,0,'R']];
function key(s,a){return s.map(p=>p.join(',')).join(';')+'|'+a.map(p=>p.join(',')).sort().join(';');}
function solve(rows,cap=120000){
  const lv=parseLevel({rows});if(!lv.snake[0])return null;
  const seen=new Set([key(lv.snake,lv.apples)]);let q=[{snake:lv.snake,apples:lv.apples,path:''}];
  while(q.length){const nq=[];for(const st of q){for(const [dx,dy,c] of DIRS){
    const r=stepState(lv,st.snake,st.apples,dx,dy);if(!r||r.dead)continue;
    if(r.apples.length===0)return st.path+c;
    const k=key(r.snake,r.apples);if(seen.has(k))continue;seen.add(k);
    if(seen.size>cap)return null;nq.push({snake:r.snake,apples:r.apples,path:st.path+c});}}q=nq;}
  return null;
}
function blank(){const g=[];for(let y=0;y<H;y++)g.push(Array(W).fill('.'));for(let x=0;x<W;x++)g[H-1][x]='#';return g;}
function gen(diff){ // diff 0..1
  const g=blank();
  // start position on floor
  const sx=ri(1,W-3),dir=rnd()<.5?1:-1;g[H-2][sx]='S';g[H-2][sx-dir]='o';
  // pits
  if(diff>.25&&rnd()<.6){const px=ri(1,W-3),pw=rnd()<.3?2:1;for(let i=0;i<pw;i++){const x=px+i;if(x<W-1&&Math.abs(x-sx)>1&&Math.abs(x-(sx-dir))>1)g[H-1][x]='.';}}
  // shelves, bottom-up
  const nShelf=ri(2,3+Math.round(diff*2));let row=H-1-ri(2,3),apples=0;
  const floorApples=ri(1,2);for(let i=0;i<floorApples;i++){const x=ri(1,W-2);if(g[H-2][x]==='.'&&g[H-1][x]==='#'){g[H-2][x]='A';apples++;}}
  for(let s=0;s<nShelf&&row>=1;s++){
    const len=ri(3,8),x0=ri(0,W-len);
    for(let x=x0;x<x0+len;x++)g[row][x]='#';
    // apple on shelf
    const ax=ri(x0,x0+len-1);if(row-1>=0&&g[row-1][ax]==='.'){g[row-1][ax]='A';apples++;}
    // occasional pillar / wall bits
    if(rnd()<.35*diff+.1){const px=ri(0,W-1),ph=ri(1,2);for(let k=1;k<=ph;k++){const y=row+k;if(y<H-1&&g[y][px]==='.')g[y][px]='#';}}
    if(rnd()<.3&&diff>.4){const fx=ri(0,W-1),fy=ri(Math.max(0,row-3),row-1);if(fy>=0&&g[fy][fx]==='.')g[fy][fx]='A',apples++;}
    row-=ri(2,3+Math.round(diff));
  }
  if(apples<3)return null;
  const rows=g.map(r=>r.join(''));
  // sanity: start cells intact, head present
  if(!rows[H-2].includes('S'))return null;
  return rows;
}
const out=[],seenRows=new Set();
let tries=0;
while(out.length<45&&tries<40000){tries++;
  const diff=Math.min(1,out.length/40);const rows=gen(diff);if(!rows)continue;
  const k=rows.join('');if(seenRows.has(k))continue;seenRows.add(k);
  const sol=solve(rows);if(!sol)continue;
  const na=rows.join('').split('A').length-1;
  const minLen=14+out.length*0.9;
  if(sol.length<minLen||sol.length>140)continue;
  out.push({rows,sol:sol.length,apples:na});
  process.stderr.write(`${out.length} (${sol.length} moves, ${na} apples)\n`);
}
const NAMES=["Low Branches","Two Shelves","Little Hop","Windfall","The Ledge","Side Step","Stacked Crates","Long Reach","Green Rungs","Up and Over","Pit Lane","The Narrow Gap","Hanging Fruit","Loose Stones","Attic Apples","Double Back","The Overhang","Crow's Nest","Trellis","High Shelf","Rope Bridge","The Chimney","Corner Pocket","Slow Climb","Teetering","Barn Loft","Thin Ice","Long Way Round","Orchard Wall","Last Light","Bramble Patch","Hay Bales","Cold Store","The Dovecote","Lantern Hook","Sawdust","Press House","Ridge Walk","Cider Run","Sunset Ladder","Night Pick","Frost Pocket","Treetop","The Big Drop","Harvest Home"];
const hand=HAND.map(l=>({name:l.name,rows:l.rows}));
const final=[...hand,...out.map((o,i)=>({name:NAMES[i]||('Orchard '+(i+1)),rows:o.rows,par:o.sol}))];
// par for hand levels
for(const l of final)if(!l.par)l.par=solve(l.rows).length;
require('fs').writeFileSync('levels50.json',JSON.stringify(final));
console.log('levels:',final.length,'tries:',tries);
console.log(final.map((l,i)=>`${i+1}. ${l.name} par ${l.par}`).join('\n'));
