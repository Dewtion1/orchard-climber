// Core rules shared by the game page and the solver.
const LEVELS=require('./levels.js');

function parseLevel(lv){
  const rows = lv.rows, H = rows.length, W = rows[0].length;
  const walls = new Set(), apples = [];
  let head = null, bodyCells = [];
  for (let y=0;y<H;y++) for (let x=0;x<W;x++){
    const c = rows[y][x];
    if (c==='#') walls.add(x+','+y);
    else if (c==='A') apples.push([x,y]);
    else if (c==='S') head=[x,y];
    else if (c==='o') bodyCells.push([x,y]);
  }
  // chain body from head by adjacency
  const snake=[head];
  let rem=bodyCells.slice();
  while(rem.length){
    const [hx,hy]=snake[snake.length-1];
    const i=rem.findIndex(([x,y])=>Math.abs(x-hx)+Math.abs(y-hy)===1);
    if(i<0) break;
    snake.push(rem[i]); rem.splice(i,1);
  }
  return {W,H,walls,snake,apples,name:lv.name};
}

function isWall(lv,x,y){ return lv.walls.has(x+','+y); }

// returns null if move invalid, else {snake, apples, ate, dead, fell}
function stepState(lv, snake, apples, dx, dy){
  const [hx,hy]=snake[0];
  const nx=hx+dx, ny=hy+dy;
  if(nx<0||nx>=lv.W||ny<0||ny>=lv.H) return null;
  if(isWall(lv,nx,ny)) return null;
  if(snake.some(([x,y])=>x===nx&&y===ny)) return null;
  const ai=apples.findIndex(([x,y])=>x===nx&&y===ny);
  const ate=ai>=0;
  let ns=[[nx,ny],...snake.slice(0, ate?snake.length:snake.length-1)];
  let na=ate?apples.filter((_,i)=>i!==ai):apples;
  // gravity
  let fell=0, dead=false;
  for(let k=0;k<lv.H+2;k++){
    const supported=ns.some(([x,y])=>isWall(lv,x,y+1));
    if(supported) break;
    ns=ns.map(([x,y])=>[x,y+1]);
    fell++;
    if(ns.some(([x,y])=>y>=lv.H)){ dead=true; break; }
  }
  return {snake:ns, apples:na, ate, dead, fell};
}

if (typeof module!=='undefined') module.exports={LEVELS,parseLevel,stepState};
