// Per-level review: par, hardness, and whether each feature actually matters.
const {parseLevel,stepState,stateKey,solve,DIRS}=require('./rules.js');
const {analyse}=require('./gen2.js');
const L=require('./levels50.json');
const par=rows=>{const r=solve(parseLevel({rows}),700000);return r?r.path.length:null;};
const out=[];
for(let i=0;i<L.length;i++){const l=L[i];const txt=l.rows.join('');
  const a=analyse(l.rows,500000)||{};
  const objs=[];l.rows.forEach((r,y)=>[...r].forEach((c,x)=>{if(c==='C'||c==='B')objs.push({c,x,y});}));
  // each object individually: remove it -> still solvable? (then it's optional)
  const optional=objs.map(o=>{const rows=l.rows.map((r,y)=>y===o.y?r.slice(0,o.x)+'.'+r.slice(o.x+1):r);return par(rows)!=null;});
  const noSpikes=txt.includes('X')?par(l.rows.map(r=>r.replace(/X/g,'.'))):null;
  const noExit=txt.includes('E')?par(l.rows.map(r=>r.replace(/E/g,'.'))):null;
  // solution: count pushes / explosions / falls
  const lv=parseLevel(l);let st=lv.start,pushes=0,booms=0,falls=0,maxLen=0;const sol=solve(lv,700000).path;
  for(const c of sol){const [dx,dy]=DIRS.find(d=>d[2]===c);const r=stepState(lv,st,dx,dy);st=r.state;pushes+=r.events.filter(e=>e.type==='push').length;booms+=r.events.filter(e=>e.type==='explode').length;if(r.fell)falls++;maxLen=Math.max(maxLen,st.snake.length);}
  const row={n:i+1,name:l.name,par:l.par,apples:(txt.match(/A/g)||[]).length,crates:(txt.match(/C/g)||[]).length,bombs:(txt.match(/B/g)||[]).length,spikes:(txt.match(/X/g)||[]).length,exit:txt.includes('E'),
    states:a.states,dead:a.deadRatio,optionalObjs:optional.filter(Boolean).length,spikesMatter:noSpikes==null?null:(noSpikes!==l.par),exitMatters:noExit==null?null:(noExit!==l.par),pushes,booms,falls,maxLen,sol};
  out.push(row);
  console.error(`${row.n}. ${row.name.padEnd(18)} par ${String(row.par).padStart(3)} A${row.apples} C${row.crates} B${row.bombs} X${row.spikes} ${row.exit?'E':'-'} states ${row.states} dead ${row.dead!=null?(row.dead*100).toFixed(0)+'%':'?'} optObj ${row.optionalObjs} spikes ${row.spikesMatter} exit ${row.exitMatters} pushes ${pushes} booms ${booms} falls ${falls} maxLen ${maxLen}`);
}
require('fs').writeFileSync('review.json',JSON.stringify(out,null,1));
