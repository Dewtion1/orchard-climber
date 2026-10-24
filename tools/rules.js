// Orchard Climber rules v2. Shared verbatim by the game page (pasted in by build.py) and the node tools.
// Tiles: # rock  A apple  C crate  B bomb  X spikes  E exit  S head  o body  . empty
// Detonator levels ({detonator:true}): bombs do not go off when they land. Instead the player has a fifth move, the
// detonator (path letter 'B', dx=dy=0): every bomb on the board explodes where it sits and the snake does not move.
// A move: head steps one cell (pushing a crate/bomb if one is there), then gravity settles everything.
// Gravity: the snake and every object fall together unless resting on rock or on something resting on rock.
// A bomb that lands after falling explodes: it vanishes, destroys the rock directly beneath it, and kills the snake if a segment is next to it.
// Spikes kill the snake if any segment ends up on them. Objects can sit on spikes and cover them.
// Win: all apples eaten and (if the level has an exit) the head is on the exit.
function parseLevel(lv){
  const rows=lv.rows,H=rows.length,W=rows[0].length,walls=new Set(),spikes=new Set(),apples=[],objs=[];let head=null,body=[],exit=null,oid=0;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const c=rows[y][x];
    if(c==='#')walls.add(x+','+y);else if(c==='A')apples.push([x,y]);else if(c==='S')head=[x,y];else if(c==='o')body.push([x,y]);
    else if(c==='C'||c==='B')objs.push({t:c,x,y,id:oid++});else if(c==='X')spikes.add(x+','+y);else if(c==='E')exit=[x,y];}
  const snake=[head];let rem=body.slice();
  while(rem.length){const [hx,hy]=snake[snake.length-1];const i=rem.findIndex(([x,y])=>Math.abs(x-hx)+Math.abs(y-hy)===1);if(i<0)break;snake.push(rem[i]);rem.splice(i,1);}
  return {W,H,walls,spikes,exit,detonator:!!lv.detonator,start:{snake,apples,objs,gone:[]}};
}
const K=(x,y)=>x+','+y;
function stateKey(st){let k='';for(const p of st.snake)k+=p[0]+','+p[1]+';';k+='|';if(st.apples.length)k+=st.apples.map(p=>p[0]+','+p[1]).sort().join(';');k+='|';if(st.objs.length)k+=st.objs.map(o=>o.t+o.x+','+o.y).sort().join(';');k+='|';if(st.gone.length)k+=st.gone.slice().sort().join(';');return k;}
function isRock(lv,st,x,y){return lv.walls.has(K(x,y))&&!st.gone.includes(K(x,y));}
// returns null if the move is illegal, else {state, ate, dead, win, fell, events}. dx=dy=0 is the detonator.
function stepState(lv,st,dx,dy){
  const det=dx===0&&dy===0;
  let objs=st.objs.map(o=>({...o}));const events=[];let snake,apples=st.apples,ate=false;
  if(det){if(!lv.detonator||!objs.some(o=>o.t==='B'))return null;snake=st.snake.map(p=>p.slice());}
  else{
  const [hx,hy]=st.snake[0],nx=hx+dx,ny=hy+dy;
  if(nx<0||nx>=lv.W||ny<0||ny>=lv.H||isRock(lv,st,nx,ny))return null;
  if(st.snake.some(([x,y])=>x===nx&&y===ny))return null;
  const oi=objs.findIndex(o=>o.x===nx&&o.y===ny);
  if(oi>=0){const bx=nx+dx,by=ny+dy;
    if(bx<0||bx>=lv.W||by<0||by>=lv.H||isRock(lv,st,bx,by))return null;
    if(st.snake.some(([x,y])=>x===bx&&y===by))return null;
    if(objs.some(o=>o.x===bx&&o.y===by))return null;
    if(st.apples.some(([x,y])=>x===bx&&y===by))return null;
    if(lv.exit&&lv.exit[0]===bx&&lv.exit[1]===by)return null;
    objs[oi].x=bx;objs[oi].y=by;events.push({type:'push',id:objs[oi].id});}
  const ai=st.apples.findIndex(([x,y])=>x===nx&&y===ny);ate=ai>=0;
  snake=[[nx,ny],...st.snake.slice(0,ate?st.snake.length:st.snake.length-1)];
  apples=ate?st.apples.filter((_,i)=>i!==ai):st.apples;}
  const gone=st.gone.slice();
  let dead=false,fell=0;const objFell={};
  const onSpike=()=>snake.some(([x,y])=>lv.spikes.has(K(x,y)));
  if(onSpike())dead=true;
  const goneSet=new Set(gone);const rock=(x,y)=>lv.walls.has(K(x,y))&&!goneSet.has(K(x,y));
  const blow=i=>{const o=objs[i];events.push({type:'explode',x:o.x,y:o.y});
    const below=K(o.x,o.y+1);if(lv.walls.has(below)&&!goneSet.has(below)){gone.push(below);goneSet.add(below);}
    if(snake.some(([x,y])=>Math.abs(x-o.x)+Math.abs(y-o.y)===1))dead=true;
    objs.splice(i,1);};
  const settle=()=>{for(let iter=0;iter<lv.H*3&&!dead;iter++){
    // support fixpoint. index 0 = snake, i+1 = objs[i]
    const n=objs.length+1,sup=new Uint8Array(n);const owner=new Map();
    for(const [x,y] of snake)owner.set(K(x,y),0);objs.forEach((o,i)=>owner.set(K(o.x,o.y),i+1));
    let changed=true;
    while(changed){changed=false;
      if(!sup[0]){for(const [x,y] of snake){if(y+1>=lv.H)continue;if(rock(x,y+1)){sup[0]=1;changed=true;break;}const o=owner.get(K(x,y+1));if(o!=null&&o!==0&&sup[o]){sup[0]=1;changed=true;break;}}}
      for(let i=0;i<objs.length;i++){if(sup[i+1])continue;const o=objs[i];if(o.y+1>=lv.H)continue;if(rock(o.x,o.y+1)){sup[i+1]=1;changed=true;continue;}const w=owner.get(K(o.x,o.y+1));if(w!=null&&w!==i+1&&sup[w]){sup[i+1]=1;changed=true;}}}
    // bombs that fell and are now supported explode
    let exploded=false;
    for(let i=objs.length-1;i>=0;i--){const o=objs[i];if(o.t!=='B'||lv.detonator||!objFell[o.id]||!sup[i+1])continue;exploded=true;blow(i);}
    if(exploded)continue;
    let any=false;for(let i=0;i<n;i++)if(!sup[i]){any=true;break;}
    if(!any)break;
    if(!sup[0]){snake=snake.map(([x,y])=>[x,y+1]);fell++;if(snake.some(([x,y])=>y>=lv.H)){dead=true;break;}}
    for(let i=0;i<objs.length;i++)if(!sup[i+1]){objs[i].y++;objFell[objs[i].id]=(objFell[objs[i].id]||0)+1;}
    objs=objs.filter(o=>o.y<lv.H);
    if(onSpike()){dead=true;break;}
  }};
  // the detonator sets off every bomb where it sits, then everything settles
  if(det)for(let i=objs.length-1;i>=0;i--)if(objs[i].t==='B'){blow(i);events[events.length-1].detonator=true;}
  settle();
  const win=!dead&&apples.length===0&&(!lv.exit||(snake[0][0]===lv.exit[0]&&snake[0][1]===lv.exit[1]));
  return {state:{snake,apples,objs,gone},ate,dead,win,fell,events};
}
const DIRS=[[0,-1,'U'],[0,1,'D'],[-1,0,'L'],[1,0,'R']];
const DET=[0,0,'B']; // the detonator move
const movesFor=lv=>lv.detonator?[...DIRS,DET]:DIRS;
// BFS. Returns {path, states} or null (unsolvable or over cap).
function solve(lv,cap){cap=cap||400000;
  const seen=new Map([[stateKey(lv.start),null]]);let q=[{st:lv.start,path:''}];
  const M=movesFor(lv);
  while(q.length){const nq=[];for(const n of q){for(const [dx,dy,c] of M){const r=stepState(lv,n.st,dx,dy);if(!r||r.dead)continue;
    if(r.win)return {path:n.path+c,states:seen.size};
    const k=stateKey(r.state);if(seen.has(k))continue;seen.set(k,1);if(seen.size>cap)return null;nq.push({st:r.state,path:n.path+c});}}q=nq;}
  return null;}
// Next move on a shortest solution from an arbitrary state (for the in-game hint).
function hintMove(lv,st,cap){cap=cap||150000;
  const seen=new Set([stateKey(st)]);let q=[{st,first:null}];
  const M=movesFor(lv);
  while(q.length){const nq=[];for(const n of q){for(const [dx,dy,c] of M){const r=stepState(lv,n.st,dx,dy);if(!r||r.dead)continue;const f=n.first||c;
    if(r.win)return f;const k=stateKey(r.state);if(seen.has(k))continue;seen.add(k);if(seen.size>cap)return null;nq.push({st:r.state,first:f});}}q=nq;}
  return null;}
if(typeof module!=='undefined')module.exports={parseLevel,stepState,stateKey,solve,hintMove,DIRS,DET,movesFor};
