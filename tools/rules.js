// Orchard Climber rules v3. Shared verbatim by the game page (pasted in by build.py) and the node tools.
// Tiles: # rock  A apple  C crate  B bomb  X spikes  E exit  S head  o body  . empty
//   pickups (optional; only red apples are needed to win):
//   K sword   - one cut: swiping into rock while holding a sword cuts that block and the head moves into the gap
//   Q sour    - sour apple: eating it removes a segment (never below two)
//   P seed    - one planting: the Plant move ('P') grows a block in the empty cell in front of the head
//   G golden  - golden apple: grows two segments (one now, one on the next move)
//   H honey   - for six moves the snake clings to rock beside or above it instead of falling
// Detonator levels ({detonator:true}): bombs do not go off when they land. Instead the player has an extra move, the
// detonator (path letter 'B'): every bomb on the board explodes where it sits and the snake does not move.
// A move: head steps one cell (pushing a crate/bomb if one is there), then gravity settles everything.
// Gravity: the snake and every object fall together unless resting on rock or on something resting on rock.
// A bomb that lands after falling explodes: it vanishes, destroys the rock directly beneath it, and kills the snake if a segment is next to it.
// Spikes kill the snake if any segment ends up on them. Objects can sit on spikes and cover them.
// Win: all apples eaten and (if the level has an exit) the head is on the exit.
function parseLevel(lv){
  const rows=lv.rows,H=rows.length,W=rows[0].length,walls=new Set(),spikes=new Set(),apples=[],objs=[],items=[];let head=null,body=[],exit=null,oid=0;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const c=rows[y][x];
    if(c==='#')walls.add(x+','+y);else if(c==='A')apples.push([x,y]);else if(c==='S')head=[x,y];else if(c==='o')body.push([x,y]);
    else if(c==='C'||c==='B')objs.push({t:c,x,y,id:oid++});else if(c==='X')spikes.add(x+','+y);else if(c==='E')exit=[x,y];
    else if('KQPGH'.includes(c))items.push([x,y,c]);}
  const snake=[head];let rem=body.slice();
  while(rem.length){const [hx,hy]=snake[snake.length-1];const i=rem.findIndex(([x,y])=>Math.abs(x-hx)+Math.abs(y-hy)===1);if(i<0)break;snake.push(rem[i]);rem.splice(i,1);}
  return {W,H,walls,spikes,exit,detonator:!!lv.detonator,seeds:items.some(i=>i[2]==='P'),
    start:{snake,apples,objs,gone:[],items,inv:{k:0,p:0,h:0,g:0},grown:[]}};
}
const K=(x,y)=>x+','+y;
function stateKey(st){let k='';for(const p of st.snake)k+=p[0]+','+p[1]+';';k+='|';if(st.apples.length)k+=st.apples.map(p=>p[0]+','+p[1]).sort().join(';');k+='|';if(st.objs.length)k+=st.objs.map(o=>o.t+o.x+','+o.y).sort().join(';');k+='|';if(st.gone.length)k+=st.gone.slice().sort().join(';');
  const it=st.items||[],gr=st.grown||[],v=st.inv;
  if(it.length||gr.length||(v&&(v.k||v.p||v.h||v.g)))k+='|'+it.map(p=>p[2]+p[0]+','+p[1]).sort().join(';')+'|'+(v?v.k+','+v.p+','+v.h+','+v.g:'')+'|'+gr.slice().sort().join(';');
  return k;}
function isRock(lv,st,x,y){const k=K(x,y);return (lv.walls.has(k)&&!st.gone.includes(k))||(!!st.grown&&st.grown.includes(k));}
// returns null if the move is illegal, else {state, ate, dead, win, fell, events}.
// c is the move letter: U D L R, 'B' the detonator, 'P' plant. (dx=dy=0 with no letter is the detonator, for old callers.)
function stepState(lv,st,dx,dy,c){
  const act=c==='P'?'P':(dx===0&&dy===0?'B':null);
  let objs=st.objs.map(o=>({...o}));const events=[];let snake,apples=st.apples,ate=false,items=st.items||[];
  const inv={...(st.inv||{k:0,p:0,h:0,g:0})},grown=(st.grown||[]).slice(),gone=st.gone.slice();
  if(inv.h>0)inv.h--; // honey wears off one move at a time
  const occupied=(x,y)=>st.snake.some(p=>p[0]===x&&p[1]===y)||objs.some(o=>o.x===x&&o.y===y)||st.apples.some(p=>p[0]===x&&p[1]===y)||items.some(p=>p[0]===x&&p[1]===y)||(!!lv.exit&&lv.exit[0]===x&&lv.exit[1]===y);
  if(act==='B'){if(!lv.detonator||!objs.some(o=>o.t==='B'))return null;snake=st.snake.map(p=>p.slice());}
  else if(act==='P'){ // plant a block in front of the head (the direction from the neck to the head)
    if(!inv.p)return null;const [hx,hy]=st.snake[0],nk=st.snake[1]||[hx-1,hy],fx=hx+(hx-nk[0]),fy=hy+(hy-nk[1]);
    if(fx<0||fx>=lv.W||fy<0||fy>=lv.H||isRock(lv,st,fx,fy)||occupied(fx,fy)||lv.spikes.has(K(fx,fy)))return null;
    grown.push(K(fx,fy));inv.p--;events.push({type:'plant',x:fx,y:fy});snake=st.snake.map(p=>p.slice());}
  else{
  const [hx,hy]=st.snake[0],nx=hx+dx,ny=hy+dy;
  if(nx<0||nx>=lv.W||ny<0||ny>=lv.H)return null;
  if(st.snake.some(([x,y])=>x===nx&&y===ny))return null;
  let cut=false;
  if(isRock(lv,st,nx,ny)){if(!inv.k)return null;cut=true;} // the sword cuts the block
  const oi=cut?-1:objs.findIndex(o=>o.x===nx&&o.y===ny);
  if(oi>=0){const bx=nx+dx,by=ny+dy;
    if(bx<0||bx>=lv.W||by<0||by>=lv.H||isRock(lv,st,bx,by))return null;
    if(st.snake.some(([x,y])=>x===bx&&y===by))return null;
    if(objs.some(o=>o.x===bx&&o.y===by))return null;
    if(st.apples.some(([x,y])=>x===bx&&y===by))return null;
    if(items.some(([x,y])=>x===bx&&y===by))return null;
    if(lv.exit&&lv.exit[0]===bx&&lv.exit[1]===by)return null;
    objs[oi].x=bx;objs[oi].y=by;events.push({type:'push',id:objs[oi].id});}
  if(cut){const k=K(nx,ny),gi=grown.indexOf(k);if(gi>=0)grown.splice(gi,1);else gone.push(k);inv.k--;events.push({type:'cut',x:nx,y:ny});}
  const ai=st.apples.findIndex(([x,y])=>x===nx&&y===ny);ate=ai>=0;
  const ii=items.findIndex(([x,y])=>x===nx&&y===ny),got=ii>=0?items[ii][2]:null;
  if(got){items=items.filter((_,i)=>i!==ii);events.push({type:'pickup',t:got,x:nx,y:ny});
    if(got==='K')inv.k++;else if(got==='P')inv.p++;else if(got==='H')inv.h=6;}
  let keep=ate||got==='G';
  if(got==='G')inv.g++;else if(!keep&&inv.g>0){keep=true;inv.g--;} // golden apple: the second segment arrives on the next move
  snake=[[nx,ny],...st.snake.slice(0,keep?st.snake.length:st.snake.length-1)];
  if(got==='Q'&&snake.length>2)snake.pop();
  ate=ate||got==='G'||got==='Q';
  apples=ai>=0?st.apples.filter((_,i)=>i!==ai):st.apples;}
  let dead=false,fell=0;const objFell={};
  const onSpike=()=>snake.some(([x,y])=>lv.spikes.has(K(x,y)));
  if(onSpike())dead=true;
  const goneSet=new Set(gone),grownSet=new Set(grown);const rock=(x,y)=>{const k=K(x,y);return (lv.walls.has(k)&&!goneSet.has(k))||grownSet.has(k);};
  const cling=inv.h>0;
  const blow=i=>{const o=objs[i];events.push({type:'explode',x:o.x,y:o.y});
    const below=K(o.x,o.y+1);if(grownSet.has(below)){grownSet.delete(below);grown.splice(grown.indexOf(below),1);}
    else if(lv.walls.has(below)&&!goneSet.has(below)){gone.push(below);goneSet.add(below);}
    if(snake.some(([x,y])=>Math.abs(x-o.x)+Math.abs(y-o.y)===1))dead=true;
    objs.splice(i,1);};
  const settle=()=>{for(let iter=0;iter<lv.H*3&&!dead;iter++){
    // support fixpoint. index 0 = snake, i+1 = objs[i]
    const n=objs.length+1,sup=new Uint8Array(n);const owner=new Map();
    for(const [x,y] of snake)owner.set(K(x,y),0);objs.forEach((o,i)=>owner.set(K(o.x,o.y),i+1));
    if(cling&&snake.some(([x,y])=>rock(x-1,y)||rock(x+1,y)||rock(x,y-1)))sup[0]=1; // honey: stuck to the rock beside or above
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
  if(act==='B')for(let i=objs.length-1;i>=0;i--)if(objs[i].t==='B'){blow(i);events[events.length-1].detonator=true;}
  settle();
  const win=!dead&&apples.length===0&&(!lv.exit||(snake[0][0]===lv.exit[0]&&snake[0][1]===lv.exit[1]));
  return {state:{snake,apples,objs,gone,items,inv,grown},ate,dead,win,fell,events};
}
const DIRS=[[0,-1,'U'],[0,1,'D'],[-1,0,'L'],[1,0,'R']];
const DET=[0,0,'B'],PLANT=[0,0,'P']; // the detonator and plant moves
function movesFor(lv){const m=DIRS.slice();if(lv.detonator)m.push(DET);if(lv.seeds)m.push(PLANT);return m;}
// BFS. Returns {path, states} or null (unsolvable or over cap).
function solve(lv,cap){cap=cap||400000;
  const seen=new Map([[stateKey(lv.start),null]]);let q=[{st:lv.start,path:''}];
  const M=movesFor(lv);
  while(q.length){const nq=[];for(const n of q){for(const [dx,dy,c] of M){const r=stepState(lv,n.st,dx,dy,c);if(!r||r.dead)continue;
    if(r.win)return {path:n.path+c,states:seen.size};
    const k=stateKey(r.state);if(seen.has(k))continue;seen.set(k,1);if(seen.size>cap)return null;nq.push({st:r.state,path:n.path+c});}}q=nq;}
  return null;}
// Next move on a shortest solution from an arbitrary state (for the in-game hint).
function hintMove(lv,st,cap){cap=cap||150000;
  const seen=new Set([stateKey(st)]);let q=[{st,first:null}];
  const M=movesFor(lv);
  while(q.length){const nq=[];for(const n of q){for(const [dx,dy,c] of M){const r=stepState(lv,n.st,dx,dy,c);if(!r||r.dead)continue;const f=n.first||c;
    if(r.win)return f;const k=stateKey(r.state);if(seen.has(k))continue;seen.add(k);if(seen.size>cap)return null;nq.push({st:r.state,first:f});}}q=nq;}
  return null;}
if(typeof module!=='undefined')module.exports={parseLevel,stepState,stateKey,isRock,solve,hintMove,DIRS,DET,PLANT,movesFor};
