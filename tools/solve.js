const {LEVELS,parseLevel,stepState}=require('./core.js');
const DIRS=[[0,-1,'U'],[0,1,'D'],[-1,0,'L'],[1,0,'R']];
function key(s,a){ return s.map(p=>p.join(',')).join(';')+'|'+a.map(p=>p.join(',')).sort().join(';'); }
module.exports.solve=function(L){
  const lv=parseLevel(L);
  const start={snake:lv.snake,apples:lv.apples,path:''};
  const seen=new Set([key(start.snake,start.apples)]);
  let q=[start], found=null, n=0, best=0;
  while(q.length&&!found){
    const nq=[];
    for(const st of q){
      for(const [dx,dy,c] of DIRS){
        const r=stepState(lv,st.snake,st.apples,dx,dy);
        if(!r||r.dead) continue;
        best=Math.max(best,lv.apples.length-r.apples.length);
        if(r.apples.length===0){ found=st.path+c; break; }
        const k=key(r.snake,r.apples);
        if(seen.has(k)) continue;
        seen.add(k); nq.push({snake:r.snake,apples:r.apples,path:st.path+c});
      }
      if(found) break;
    }
    q=nq; n++;
    if(n>300) break;
  }
  return {found, best, total:lv.apples.length, states:seen.size};
};
if(require.main===module) for(const L of LEVELS){
  const r=module.exports.solve(L);
  console.log(L.name.padEnd(14), r.found?`solved in ${r.found.length} moves: ${r.found}`:`UNSOLVABLE (ate ${r.best}/${r.total})`, '| states', r.states);
}
