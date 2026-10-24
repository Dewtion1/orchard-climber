// Audit a file of levels (module exporting [{name,rows,tip?}]) the way review.js audits the live set.
// usage: node check-levels.js <file.js> [nameFilter]
const {parseLevel,stepState,solve,DIRS,movesFor}=require('./rules.js');
const {analyse}=require('./gen2.js');
const L=require(require('path').resolve(process.argv[2]));const F=process.argv[3];
const par=(rows,det)=>{const r=solve(parseLevel({rows,detonator:det}),900000);return r?r.path.length:null;};
for(const l of L){if(F&&!l.name.includes(F))continue;const txt=l.rows.join('');const W=l.rows[0].length;
  if(l.rows.some(r=>r.length!==W)){console.log(`${l.name}: RAGGED ROWS`);continue;}
  const r=solve(parseLevel(l),900000);if(!r){console.log(`${l.name}: UNSOLVABLE`);continue;}
  const a=analyse(l.rows,600000,l.detonator)||{};
  const objs=[];l.rows.forEach((row,y)=>[...row].forEach((c,x)=>{if(c==='C'||c==='B')objs.push({c,x,y});}));
  const optional=objs.filter(o=>par(l.rows.map((row,y)=>y===o.y?row.slice(0,o.x)+'.'+row.slice(o.x+1):row),l.detonator)!=null).map(o=>o.c+'@'+o.x+','+o.y);
  const pick=[];l.rows.forEach((row,y)=>[...row].forEach((c,x)=>{if('KQPGH'.includes(c))pick.push({c,x,y});}));
  const pickNeed=pick.map(o=>{const p=par(l.rows.map((row,y)=>y===o.y?row.slice(0,o.x)+'.'+row.slice(o.x+1):row),l.detonator);return o.c+'@'+o.x+','+o.y+':'+(p==null?'needed':p>r.path.length?'shortens':'optional');});
  const noSpikes=txt.includes('X')?par(l.rows.map(x=>x.replace(/X/g,'.')),l.detonator):null;
  const lv=parseLevel(l);let st=lv.start,pushes=0,booms=0,dets=0,falls=0,maxLen=0,used='';
  for(const c of r.path){const [dx,dy]=movesFor(lv).find(d=>d[2]===c);if(c==='B')dets++;const s=stepState(lv,st,dx,dy,c);st=s.state;used+=s.events.filter(e=>e.type==='cut'||e.type==='plant'||e.type==='pickup').map(e=>e.type==='pickup'?e.t:e.type[0].toUpperCase()+e.type.slice(1)).join(' ')+(s.events.some(e=>e.type==='cut'||e.type==='plant'||e.type==='pickup')?' ':'');pushes+=s.events.filter(e=>e.type==='push').length;booms+=s.events.filter(e=>e.type==='explode').length;if(s.fell)falls++;maxLen=Math.max(maxLen,st.snake.length);}
  console.log(`${l.name.padEnd(16)} ${W}x${l.rows.length} par ${String(r.path.length).padStart(3)} trap ${a.deadRatio!=null?(a.deadRatio*100).toFixed(0).padStart(2)+'%':' ?'} states ${String(a.states||'?').padStart(6)} pushes ${pushes} booms ${booms}${l.detonator?' (detonator presses '+dets+')':''} falls ${falls} maxLen ${maxLen} optional:[${optional.join(' ')}] spikes:${noSpikes==null?'-':noSpikes===r.path.length?'cosmetic':'matter'}${pick.length?' powerups:['+pickNeed.join(' ')+'] used: '+used.trim():''}`);
  console.log(`   ${r.path}`);}
// diagnosis: explore every reachable state and show where the head can get and which apples can be eaten
if(process.env.DIAG){const {stateKey}=require('./rules.js');
  for(const l of L){if(F&&!l.name.includes(F))continue;const lv=parseLevel(l);const seen=new Set([stateKey(lv.start)]);let q=[lv.start];const heads=new Set();let maxA=0;const eaten=new Set();let exitReached=false,maxLen=0,n=0;
    while(q.length&&n<400000){const nq=[];for(const st of q){for(const [dx,dy,mc] of movesFor(lv)){const r=stepState(lv,st,dx,dy,mc);if(!r||r.dead)continue;const k=stateKey(r.state);if(seen.has(k))continue;seen.add(k);n++;nq.push(r.state);
      const h=r.state.snake[0];heads.add(h[0]+','+h[1]);maxLen=Math.max(maxLen,r.state.snake.length);const ate=lv.start.apples.length-r.state.apples.length;maxA=Math.max(maxA,ate);
      for(const a of lv.start.apples)if(!r.state.apples.some(b=>b[0]===a[0]&&b[1]===a[1]))eaten.add(a[0]+','+a[1]);
      if(lv.exit&&h[0]===lv.exit[0]&&h[1]===lv.exit[1])exitReached=true;}}q=nq;}
    console.log(`\n${l.name}: states ${n} maxApples ${maxA}/${lv.start.apples.length} maxLen ${maxLen} exitReached ${exitReached} uneaten: ${lv.start.apples.filter(a=>!eaten.has(a[0]+','+a[1])).map(a=>a.join(',')).join(' ')||'none'}`);
    console.log(l.rows.map((row,y)=>[...row].map((c,x)=>c==='.'&&heads.has(x+','+y)?'*':c).join('')).join('\n'));}}
