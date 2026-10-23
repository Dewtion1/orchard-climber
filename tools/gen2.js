// v2 generator: geometry from gen.js plus crates, bombs, spikes and an exit. Writes pool2-<seed>.json.
// usage: node gen2.js <seed> <poolSize> [main|bridge] [deadFloor]
//   main   (default): solution 30..170 moves, 1-2 crates and maybe a bomb, trap ratio >= deadFloor (default 0.08)
//   bridge          : solution 18..38 moves, exactly one object (a crate OR a bomb), no trap-ratio floor
// Acceptance (both modes): solvable; unsolvable with every crate/bomb stripped (so an object is necessary);
//   if crates are present the shortest solution pushes at least twice; if a bomb is present it explodes.
const {parseLevel,stepState,stateKey,solve,DIRS}=require('./rules.js');
const W=14,H=12;
let seed=+process.argv[2]||7;const POOL=+process.argv[3]||30;
const MODE=(process.argv[4]||'main').toLowerCase();const BRIDGE=MODE==='bridge';
const DEAD_FLOOR=process.argv[5]!=null?+process.argv[5]:(BRIDGE?0:0.08);
const [MIN_SOL,MAX_SOL]=BRIDGE?[18,38]:[30,170];
function rnd(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
const ri=(a,b)=>a+Math.floor(rnd()*(b-a+1));

function analyse(rows,cap){cap=cap||180000;
  const lv=parseLevel({rows});if(!lv.start.snake[0])return null;
  const id=new Map(),states=[],adj=[];let goalDist=-1;const goals=[];
  id.set(stateKey(lv.start),0);states.push(lv.start);adj.push([]);
  let q=[0],depth=0;
  while(q.length){const nq=[];for(const i of q){const st=states[i];for(const [dx,dy] of DIRS){
    const r=stepState(lv,st,dx,dy);if(!r||r.dead)continue;
    const k=stateKey(r.state);let j=id.get(k);
    if(j==null){j=states.length;id.set(k,j);states.push(r.state);adj.push([]);nq.push(j);if(r.win){goals.push(j);if(goalDist<0)goalDist=depth+1;}}
    adj[i].push(j);}}
    q=nq;depth++;if(states.length>cap)return null;}
  if(goalDist<0)return null;
  const radj=states.map(()=>[]);adj.forEach((ns,i)=>ns.forEach(j=>radj[j].push(i)));
  const ok=new Uint8Array(states.length);const stack=goals.slice();for(const g of goals)ok[g]=1;
  while(stack.length){const i=stack.pop();for(const p of radj[i])if(!ok[p]){ok[p]=1;stack.push(p);}}
  let dead=0;for(let i=0;i<states.length;i++)if(!ok[i])dead++;
  return {sol:goalDist,states:states.length,deadRatio:dead/states.length,apples:lv.start.apples.length};
}

// Replay a solution path and count what actually happens in it (same method as review.js).
function replay(rows,path){
  const lv=parseLevel({rows});let st=lv.start,pushes=0,booms=0,falls=0,maxLen=0;
  for(const c of path){const [dx,dy]=DIRS.find(d=>d[2]===c);const r=stepState(lv,st,dx,dy);if(!r)return null;st=r.state;
    pushes+=r.events.filter(e=>e.type==='push').length;booms+=r.events.filter(e=>e.type==='explode').length;if(r.fell)falls++;maxLen=Math.max(maxLen,st.snake.length);}
  return {pushes,booms,falls,maxLen};
}

function blank(){const g=[];for(let y=0;y<H;y++)g.push(Array(W).fill('.'));for(let x=0;x<W;x++)g[H-1][x]='#';return g;}
// opts.objects: 'any' (default) or 'one' (exactly one crate OR one bomb, for bridge levels)
function gen(diff,opts){opts=opts||{};const one=opts.objects==='one';
  const g=blank();
  const sx=ri(1,W-3),dir=rnd()<.5?1:-1;g[H-2][sx]='S';g[H-2][sx-dir]='o';
  const nearStart=x=>Math.abs(x-sx)<=1||Math.abs(x-(sx-dir))<=1;
  const nPits=rnd()<.3+diff*.5?ri(1,1+Math.round(diff)):0;
  for(let p=0;p<nPits;p++){const px=ri(1,W-3),pw=rnd()<.5?2:1;for(let i=0;i<pw;i++){const x=px+i;if(x<W-1&&!nearStart(x))g[H-1][x]='.';}}
  const fa=ri(1,2);for(let i=0;i<fa;i++){const x=ri(1,W-2);if(g[H-2][x]==='.'&&g[H-1][x]==='#')g[H-2][x]='A';}
  const nShelf=ri(3,4+Math.round(diff*2));let row=H-1-ri(2,3);const shelves=[];
  for(let s=0;s<nShelf&&row>=1;s++){
    const len=ri(2,7),x0=ri(0,W-len);for(let x=x0;x<x0+len;x++)g[row][x]='#';shelves.push({row,x0,len});
    const ax=ri(x0,x0+len-1);if(row-1>=0&&g[row-1][ax]==='.')g[row-1][ax]='A';
    if(rnd()<.25+diff*.4){const px=ri(0,W-1),ph=ri(1,3);for(let k=1;k<=ph;k++){const y=row+k;if(y<H-1&&g[y][px]==='.')g[y][px]='#';}}
    if(rnd()<diff*.6){const cl=ri(2,4),cx=ri(Math.max(0,x0-1),Math.min(W-cl,x0+len));const cy=row-ri(3,4);
      if(cy>=0){for(let x=cx;x<cx+cl;x++)if(g[cy][x]==='.')g[cy][x]='#';const hx=ri(cx,cx+cl-1);if(g[cy+1][hx]==='.'&&rnd()<.7)g[cy+1][hx]='A';}}
    if(rnd()<.2+diff*.4){const fx=ri(0,W-1),fy=ri(Math.max(0,row-3),row-1);if(fy>=0&&g[fy][fx]==='.')g[fy][fx]='A';}
    row-=ri(2,3+Math.round(diff));
  }
  const nStubs=ri(1,2+Math.round(diff*2));
  for(let t=0;t<nStubs;t++){const wx=ri(1,W-2),wh=ri(2,5),base=ri(0,1)?H-1:ri(4,H-3);for(let k=1;k<=wh;k++){const y=base-k;if(y>=0&&g[y][wx]==='.'&&!(y===H-2&&nearStart(wx)))g[y][wx]='#';}}
  const nScatter=ri(2,3+Math.round(diff*5));
  for(let t=0;t<nScatter;t++){const x=ri(0,W-1),y=ri(1,H-3);if(g[y][x]==='.'&&!(y===H-2&&nearStart(x)))g[y][x]='#';}
  if(rnd()<diff*.6){const wx=ri(3,W-4),door=ri(2,H-3);for(let y=1;y<H-1;y++)if(y!==door&&y!==door-1&&g[y][wx]==='.'&&!(y===H-2&&nearStart(wx)))g[y][wx]='#';}
  // --- v2 features ---
  const tops=[];for(let y=1;y<H;y++)for(let x=0;x<W;x++)if(g[y][x]==='#'&&g[y-1][x]==='.')tops.push([x,y-1]); // empty cells sitting on rock
  const pick=()=>tops.length?tops[ri(0,tops.length-1)]:null;
  const free=([x,y])=>g[y][x]==='.'&&!(y===H-2&&nearStart(x));
  // exit: on a high-ish top
  const high=tops.filter(([x,y])=>y<=H-4&&free([x,y]));const ex=high.length?high[ri(0,high.length-1)]:pick();
  if(!ex||!free(ex))return null;g[ex[1]][ex[0]]='E';
  const placeBomb=()=>{if(!shelves.length)return false;const s=shelves[ri(0,shelves.length-1)];const bx=rnd()<.5?s.x0:s.x0+s.len-1;
    if(s.row-1>=0&&g[s.row-1][bx]==='.'){g[s.row-1][bx]='B';return true;}return false;};
  if(one){
    // exactly one object: a crate or a bomb
    if(rnd()<.55){const c=pick();if(!c||!free(c))return null;g[c[1]][c[0]]='C';}
    else if(!placeBomb())return null;
  }else{
    // crates 1-2
    const nC=ri(1,1+Math.round(diff));for(let i=0;i<nC;i++){const c=pick();if(c&&free(c))g[c[1]][c[0]]='C';}
    // bomb: on a shelf top near its edge
    if(rnd()<.35+diff*.4)placeBomb();
  }
  // spikes: runs on the floor or on shelf tops
  const nSp=ri(0,1+Math.round(diff*2));for(let i=0;i<nSp;i++){const t=pick();if(!t)continue;const run=ri(1,3);for(let k=0;k<run;k++){const x=t[0]+k,y=t[1];if(x<W&&g[y][x]==='.'&&g[y+1]&&g[y+1][x]==='#'&&!(y===H-2&&nearStart(x)))g[y][x]='X';}}
  const rows=g.map(r=>r.join(''));
  const txt=rows.join('');const na=txt.split('A').length-1;
  const [minA,maxA]=one?[3,6]:[4,8];
  if(na<minA||na>maxA||!rows[H-2].includes('S')||!txt.includes('E'))return null;
  if(one&&(txt.match(/[CB]/g)||[]).length!==1)return null;
  return rows;
}
module.exports={gen,analyse,replay};
if(require.main===module){
const pool=[],seen=new Set();let tries=0;const rej={gate:0,stripped:0,pushes:0,booms:0,analyse:0,dead:0};
const MAX_TRIES=BRIDGE?60000:30000;
while(pool.length<POOL&&tries<MAX_TRIES){tries++;
  const diff=BRIDGE?.15+pool.length/POOL*.35:Math.min(1,.4+pool.length/POOL*.6);
  const rows=gen(diff,{objects:BRIDGE?'one':'any'});if(!rows)continue;
  const k=rows.join('');if(seen.has(k))continue;seen.add(k);
  if(!/[CB]/.test(k))continue;
  // cheap gate first: solvable within a small cap, and NOT solvable with crates/bombs stripped
  const q=solve(parseLevel({rows}),90000);if(!q||q.path.length<MIN_SOL||q.path.length>MAX_SOL){rej.gate++;continue;}
  if(solve(parseLevel({rows:rows.map(r=>r.replace(/[CB]/g,'.'))}),90000)){rej.stripped++;continue;}
  // the objects must be used in the shortest solution: crates pushed at least twice, a bomb exploded
  const crates=(k.match(/C/g)||[]).length,bombs=(k.match(/B/g)||[]).length;
  const rp=replay(rows,q.path);if(!rp)continue;
  if(crates&&rp.pushes<2){rej.pushes++;continue;}
  if(bombs&&rp.booms<1){rej.booms++;continue;}
  const a=analyse(rows,260000);if(!a){rej.analyse++;continue;}
  if(a.deadRatio<DEAD_FLOOR){rej.dead++;continue;}
  pool.push({rows,...a,crates,bombs,spikes:(k.match(/X/g)||[]).length,pushes:rp.pushes,booms:rp.booms,falls:rp.falls,maxLen:rp.maxLen,mode:MODE});
  process.stderr.write(`pool ${pool.length} (tries ${tries}) sol ${a.sol} dead ${(a.deadRatio*100).toFixed(0)}% pushes ${rp.pushes} booms ${rp.booms}\n`);
  require('fs').writeFileSync(`pool2-${process.argv[2]||'0'}.json`,JSON.stringify(pool));
}
require('fs').writeFileSync(`pool2-${process.argv[2]||'0'}.json`,JSON.stringify(pool));
console.log('tries',tries,'pool',pool.length,'mode',MODE,'deadFloor',DEAD_FLOOR,'rejected',JSON.stringify(rej));
}
