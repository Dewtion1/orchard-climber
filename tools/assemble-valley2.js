// Build tools/levels-valley.json from the hand-designed chapters (valley/ch1.js ... ch10.js, entries carry `slot`)
// plus the kept generated levels in valley/kept.json (keyed by slot). Every slot 1-100 must be filled exactly once.
// usage: node assemble-valley2.js
const fs=require('fs');
const {parseLevel,solve}=require('./rules.js');
const slots={};const src={};
const kept=JSON.parse(fs.readFileSync('valley/kept.json'));for(const [n,l] of Object.entries(kept)){slots[n]=l;src[n]='kept';}
for(let ch=1;ch<=10;ch++){const f=`valley/ch${ch}.js`;if(!fs.existsSync(f)){console.error('missing',f);continue;}
  for(const l of require('./'+f)){if(!l.slot){console.error(f,'entry without slot',l.name);continue;}
    if(slots[l.slot]&&src[l.slot]!=='kept')console.error(f,'duplicate slot',l.slot);
    if(src[l.slot]==='kept'){console.error(f,'slot',l.slot,'is kept; ignoring the new design');continue;}
    slots[l.slot]=l;src[l.slot]=f;}}
const out=[];const names=new Set();let bad=0;
for(let n=1;n<=100;n++){const l=slots[n];if(!l){console.error('slot',n,'EMPTY');bad++;continue;}
  const r=solve(parseLevel({rows:l.rows,detonator:l.detonator}),1500000);if(!r){console.error('slot',n,l.name,'UNSOLVABLE');bad++;continue;}
  let name=l.name;while(names.has(name))name+=' II';names.add(name);
  const o={name,rows:l.rows,par:r.path.length};if(l.tip)o.tip=l.tip;if(l.detonator)o.detonator=true;out.push(o);}
if(bad){console.error('not written:',bad,'problems');process.exit(1);}
fs.writeFileSync('levels-valley.json','[\n'+out.map(l=>JSON.stringify(l)).join(',\n')+'\n]');
console.log('levels-valley.json:',out.length,'levels; pars:',out.map(l=>l.par).join(' '));
