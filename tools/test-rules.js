const {parseLevel,stepState,solve}=require('./rules.js');
const OLD=require('./levels50.json');
let fails=0;const ok=(c,m)=>{if(!c){fails++;console.log('FAIL',m);}};
// 1. old levels: new rules give the same par as before
for(const L of OLD.slice(0,4)){const r=solve(parseLevel(L));ok(r&&r.path.length===L.par,`${L.name} par ${L.par} got ${r&&r.path.length}`);}
console.log('old levels checked');
// 2. crate: push off ledge, stand on it
const crate=parseLevel({rows:[
"...A....",
"........",
"........",
"oSC.....",
"########"]});
let r=stepState(crate,crate.start,1,0);ok(r&&r.events[0]&&r.events[0].type==='push'&&r.state.objs[0].x===3,'push crate right');
ok(solve(crate),'crate level solvable');ok(!solve(parseLevel({rows:crate.rowsNoCrate||['...A....','........','........','oS......','########']})),'same level without crate is unsolvable');
// a crate falling into a pit
const pit=parseLevel({rows:[
".........",
".........",
".........",
"oS.C...A.",
"####.####",
"#########"]});
r=stepState(pit,pit.start,1,0);r=stepState(pit,r.state,1,0);ok(r.state.objs[0].x===4&&r.state.objs[0].y===4,'crate fell into pit: '+JSON.stringify(r.state.objs));
ok(solve(pit),'pit bridged');
// 3. spikes kill
const sp=parseLevel({rows:["oS.X.","#####"]});
r=stepState(sp,sp.start,1,0);r=stepState(sp,r.state,1,0);ok(r.dead,'walked onto spikes = dead');
const spf=parseLevel({rows:["oS...",".###.","....X","#####"]});
r=stepState(spf,spf.start,1,0);r=stepState(spf,r.state,1,0);r=stepState(spf,r.state,1,0);r=stepState(spf,r.state,0,1);ok(r&&r.dead,'fell onto spikes = dead');
// crate covers spikes
const cov=parseLevel({rows:["oSC....A","####XX##","########"]});ok(!solve(parseLevel({rows:["oS.....A","####XX##","########"]})),'spike pit impassable without crate');
ok(solve(cov),'push crate onto spikes then walk over it');
// 4. bomb: pushed off a ledge, explodes, opens rock below
const bomb=parseLevel({rows:[
"........",
"oSB.....",
"########",
"....A...",
"########"]});
r=stepState(bomb,bomb.start,1,0);ok(r.state.objs.length===1&&!r.events.some(e=>e.type==='explode'),'bomb slid, no explosion');
const b2=parseLevel({rows:[
"oSB.....",
"###.....",
"...#....",
"........",
"#######."]});
r=stepState(b2,b2.start,1,0);
ok(r.events.some(e=>e.type==='explode')&&r.state.gone.includes('3,2')&&r.state.objs.length===0,'bomb fell and blew the rock below: '+JSON.stringify(r.events)+' gone='+r.state.gone);
ok(!r.dead,'snake not adjacent, alive');
// 5. exit: must reach it after apples
const ex=parseLevel({rows:["oS.A..E","#######"]});
r=stepState(ex,ex.start,1,0);r=stepState(ex,r.state,1,0);ok(r.ate&&!r.win,'ate last apple but not at exit yet');
const s=solve(ex);ok(s&&s.path.length===5,'exit solution length 5 got '+(s&&s.path.length));
console.log(fails?fails+' failures':'all rules tests passed');
