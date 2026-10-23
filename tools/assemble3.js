// Assemble the full level set: the current levels50.json (kept as they are) plus candidates from pool3-*.json
// (and pool2-*.json if present), de-duplicated, spread by difficulty, named, and ordered.
// usage: node assemble3.js <targetTotal>   -> rewrites levels50.json and level-map.json (keeps the old map under "v5")
const fs=require('fs');
const {parseLevel,solve}=require('./rules.js');
const TARGET=+process.argv[2]||150;
const cur=JSON.parse(fs.readFileSync('levels50.json'));
const W=14,H=12;
const dist=(a,b)=>{let d=0;for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(a[y][x]!==b[y][x])d++;return d;};
let cands=[];for(const f of fs.readdirSync('.'))if(/^pool[23]-.*\.json$/.test(f)){try{cands=cands.concat(JSON.parse(fs.readFileSync(f)));}catch(e){}}
const score=c=>c.sol+120*c.deadRatio;
// drop exact duplicates and anything within 4 cells of a kept level or an already chosen candidate
const seen=new Set(cur.map(l=>l.rows.join('')));cands=cands.filter(c=>{const k=c.rows.join('');if(seen.has(k))return false;seen.add(k);return true;});
const bridgePool=cands.filter(c=>c.mode==='bridge'),mainPool=cands.filter(c=>c.mode!=='bridge'&&c.sol>=30&&c.deadRatio>=0.08);
const fixed=cur.filter(l=>l.tip||l.bonus),keptMain=cur.filter(l=>!l.tip&&!l.bonus);
const need=TARGET-cur.length;
// spread: sort candidates by score, then take evenly across the range so the curve stays smooth, respecting the distance rule
mainPool.sort((a,b)=>score(a)-score(b));
const chosen=[];const far=rows=>cur.every(l=>dist(l.rows,rows)>=4)&&chosen.every(c=>dist(c.rows,rows)>=4);
if(need>0&&mainPool.length){const step=Math.max(1,mainPool.length/need);let i=0;
  while(chosen.length<need&&i<mainPool.length){const c=mainPool[Math.floor(i)];if(far(c.rows))chosen.push(c);i+=step;}
  for(const c of mainPool){if(chosen.length>=need)break;if(!chosen.includes(c)&&far(c.rows))chosen.push(c);}}
// names
const A=['Apple','Cider','Orchard','Harvest','Windfall','Blossom','Bramble','Hedge','Meadow','Barn','Mill','Pippin','Russet','Bramley','Crab','Quince','Damson','Plum','Pear','Cherry','Walnut','Hazel','Willow','Hawthorn','Elder','Rowan','Mossy','Dewy','Frosty','Misty','Sunlit','Shady','Hollow','Stony','Thorny','Rusty','Crooked','Leaning','Twisted','Lofty'];
const B=['Ladder','Lane','Gate','Wall','Loft','Bridge','Hook','Nook','Step','Shelf','Rung','Perch','Branch','Bough','Trunk','Stump','Cart','Press','Store','Cellar','Hut','Shed','Yard','Row','Path','Climb','Reach','Drop','Hop','Twist','Turn','Corner','Basket','Barrel','Crate','Ledge','Lantern','Well','Pond','Fence'];
const used=new Set(cur.map(l=>l.name));let si=0;const names=[];for(const a of A)for(const b of B)names.push(a+' '+b);
// deterministic shuffle so names are not grouped by first word
for(let i=names.length-1;i>0;i--){si=(si*1103515245+12345)>>>0;const j=si%(i+1);[names[i],names[j]]=[names[j],names[i]];}
const nextName=()=>{while(names.length){const n=names.shift();if(!used.has(n)){used.add(n);return n;}}throw new Error('out of names');};
const newMain=chosen.map(c=>{const r=solve(parseLevel({rows:c.rows}),900000);if(!r||r.path.length!==c.sol)throw new Error('par mismatch for a candidate');return {name:nextName(),rows:c.rows,par:c.sol,_dead:c.deadRatio};});
// order: tutorials and bridges first (as they are), then main by score with Harvest Home last, then the bonus
const deadOf=l=>l._dead!=null?l._dead:(l._deadCache!=null?l._deadCache:0);
const {analyse}=require('./gen2.js');
for(const l of keptMain){if(l._dead==null){const a=analyse(l.rows,600000);l._dead=a?a.deadRatio:0;}}
const main=[...keptMain,...newMain].sort((a,b)=>(a.par+120*deadOf(a))-(b.par+120*deadOf(b)));
const hh=main.findIndex(l=>l.name==='Harvest Home');if(hh>=0)main.push(main.splice(hh,1)[0]);
const tut=fixed.filter(l=>l.tip),bonus=fixed.filter(l=>l.bonus);
const out=[...tut,...main,...bonus].map(l=>{const o={name:l.name};if(l.tip)o.tip=l.tip;o.rows=l.rows;o.par=l.par;if(l.bonus)o.bonus=true;return o;});
// map: previous index -> new index for every previous level (all are kept)
const idx=new Map(out.map((l,i)=>[l.rows.join(''),i]));const v6={};cur.forEach((l,i)=>{v6[i]=idx.get(l.rows.join(''));});
const oldMap=JSON.parse(fs.readFileSync('level-map.json'));const v5=oldMap.v5||Object.fromEntries(Object.entries(oldMap).filter(([k])=>!k.startsWith('_')));
fs.writeFileSync('level-map.json',JSON.stringify({_note:'v5: levels-old.json (v4 set) index -> v5 set index. v6: v5 set index -> current levels50.json index. build.py composes them; the page applies them by row timestamp.',v5,v6},null,1));
fs.writeFileSync('levels50.json','[\n'+out.map(l=>JSON.stringify(l)).join(',\n')+'\n]');
console.log('candidates',cands.length,'main pool',mainPool.length,'chosen',chosen.length,'total',out.length);
console.log('par sequence:',out.map(l=>l.par).join(' '));
