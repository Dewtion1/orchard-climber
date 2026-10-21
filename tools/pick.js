// Merge pool-*.json files, score, and pick 45 levels of rising difficulty for slots 6-50.
const fs=require('fs');const {parseLevel,stepState}=require('./core.js');const HAND=require('./levels.js');
const NAMES=["Low Branches","Two Shelves","Little Hop","Windfall","The Ledge","Side Step","Stacked Crates","Long Reach","Green Rungs","Up and Over","Pit Lane","The Narrow Gap","Hanging Fruit","Loose Stones","Attic Apples","Double Back","The Overhang","Crow's Nest","Trellis","High Shelf","Rope Bridge","The Chimney","Corner Pocket","Slow Climb","Teetering","Barn Loft","Thin Ice","Long Way Round","Orchard Wall","Last Light","Bramble Patch","Hay Bales","Cold Store","The Dovecote","Lantern Hook","Sawdust","Press House","Ridge Walk","Cider Run","Sunset Ladder","Night Pick","Frost Pocket","Treetop","The Big Drop","Harvest Home"];
let pool=[];for(const f of fs.readdirSync('.'))if(/^pool-.*\.json$/.test(f))pool=pool.concat(JSON.parse(fs.readFileSync(f)));
const seen=new Set();pool=pool.filter(p=>{const k=p.rows.join('');if(seen.has(k))return false;seen.add(k);return true;});
const score=a=>a.sol+4*a.apples+120*a.deadRatio;
pool.forEach(p=>p.score=score(p));pool.sort((a,b)=>a.score-b.score);
const want=45,start=Math.floor(pool.length*.25),span=pool.length-start;
const picked=[];for(let i=0;i<want;i++)picked.push(pool[start+Math.floor(i*span/want)]);
function par(rows){const lv=parseLevel({rows});const key=(s,a)=>s.map(p=>p.join(',')).join(';')+'|'+a.map(p=>p.join(',')).sort().join(';');const seenS=new Set([key(lv.snake,lv.apples)]);let q=[{snake:lv.snake,apples:lv.apples}],d=0;
  while(q.length){const nq=[];d++;for(const st of q)for(const [dx,dy] of [[0,-1],[0,1],[-1,0],[1,0]]){const r=stepState(lv,st.snake,st.apples,dx,dy);if(!r||r.dead)continue;if(!r.apples.length)return d;const k=key(r.snake,r.apples);if(seenS.has(k))continue;seenS.add(k);nq.push({snake:r.snake,apples:r.apples});}q=nq;}return -1;}
const hand=HAND.map(l=>({name:l.name,rows:l.rows,par:par(l.rows)}));
const final=[...hand,...picked.map((o,i)=>({name:NAMES[i],rows:o.rows,par:o.sol}))];
fs.writeFileSync('levels50.json',JSON.stringify(final));
console.log('pool',pool.length);
console.log(picked.map((o,i)=>`${i+6}. ${NAMES[i].padEnd(16)} par ${String(o.sol).padStart(3)}  apples ${o.apples}  dead ${(o.deadRatio*100).toFixed(0)}%  score ${o.score.toFixed(0)}`).join('\n'));
