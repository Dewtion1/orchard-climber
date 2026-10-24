// Build tools/levels-big.json (the separate test map of bigger boards) from pool3-<WxH>-*.json.
// Levels are grouped by size, smallest area first, named with their size so testers can tell them apart.
// usage: node assemble-big.js [perSize]
const fs=require('fs');
const {parseLevel,solve}=require('./rules.js');
const PER=+process.argv[2]||3;
const by={};
for(const f of fs.readdirSync('.')){const m=/^pool3-(\d+x\d+|det)-.*\.json$/.exec(f);if(!m)continue;try{for(const p of JSON.parse(fs.readFileSync(f)))(by[m[1]]=by[m[1]]||[]).push(p);}catch(e){}}
const area=k=>k==='det'?0:k.split('x').map(Number).reduce((a,b)=>a*b);
const sizes=Object.keys(by).sort((a,b)=>area(a)-area(b)||a.localeCompare(b));
const NAMES={'det':['Fuse Box','Blast Switch','Plunger','Trip Wire','Detonator'],'14x16':['Tall Hedge','High Trellis','Long Ladder','Steeple'],'14x20':['The Tower','Chimney Stack','Sky Ladder','Beanstalk'],'16x14':['Wide Meadow','Broad Barn','Long Wall','Far Field'],'18x16':['Big Barn','Great Hall','Wide Acre','Open Orchard'],'20x18':['The Estate','Whole Valley','Grand Orchard','Far Horizon']};
const out=[];const seen=new Set();
// hand-made first: the detonator tutorial, the power-up levels, the shape levels, then the themed levels
for(const l of [...require('./levels-big-hand.js'),...require('./levels-powerups.js'),...require('./levels-shapes.js'),...require('./levels-themed.js')]){const r=solve(parseLevel(l),900000);if(!r)throw new Error('hand level unsolvable: '+l.name);out.push({name:l.name,rows:l.rows,par:r.path.length,tip:l.tip,detonator:l.detonator||undefined});seen.add(l.rows.join(''));}
for(const sz of sizes){const pool=by[sz].filter(p=>{const k=p.rows.join('');if(seen.has(k))return false;seen.add(k);return true;}).sort((a,b)=>(a.sol+120*a.deadRatio)-(b.sol+120*b.deadRatio));
  const take=[];const step=Math.max(1,pool.length/PER);for(let i=0;take.length<PER&&Math.floor(i)<pool.length;i+=step)take.push(pool[Math.floor(i)]);
  take.forEach((p,i)=>{const r=solve(parseLevel({rows:p.rows,detonator:p.detonator}),1200000);if(!r||r.path.length!==p.sol)throw new Error('par mismatch '+sz);
    const base=(NAMES[sz]||[])[i]||`Board ${sz} ${i+1}`;out.push({name:sz==='det'?base:`${base} ${sz}`,rows:p.rows,par:r.path.length,detonator:p.detonator||undefined,tip:i===0?(sz==='det'?'Bombs here wait for you. Tap Boom when you are clear.':`A ${sz} board. Everything else is the same.`):undefined});});
  console.log(sz,'pool',pool.length,'took',take.length,take.map(p=>`par ${p.sol} dead ${(p.deadRatio*100).toFixed(0)}%`).join(' | '));}
fs.writeFileSync('levels-big.json','[\n'+out.map(l=>JSON.stringify(Object.fromEntries(Object.entries(l).filter(([k,v])=>v!==undefined)))).join(',\n')+'\n]');
console.log('levels-big.json:',out.length,'levels');
