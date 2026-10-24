// Build tools/levels-valley.json: 100 levels in ten chapters of ten from pool4-ch<N>-*.json.
// Within a chapter the levels rise by difficulty; the 5th and 10th are the two hardest. The first level of each
// chapter carries a tip that introduces the chapter's mechanic.
// usage: node assemble-valley.js
const fs=require('fs');
const {parseLevel,solve}=require('./rules.js');
const TIPS={1:'Welcome to the Valley. Eat every apple, then reach the door. Push crates and stand on them.',
  2:'Bombs go off when they land after a fall and blow out the rock beneath. Keep your distance.',
  3:'The sword: pick it up, then swipe into rock to cut one block.',
  4:'The sour apple shrinks you by one. Sometimes shorter is better.',
  5:'The seed: pick it up, then tap Plant to grow a block in front of your head.',
  6:'The golden apple grows you by two.',
  7:'Honey: for six moves you cling to rock beside or above you.',
  8:'Bombs here wait for you. Tap Boom to set them off, once you are clear.',
  9:'Everything at once. Good luck.',
  10:'The deep end of the Valley.'};
const A=['Dew','Moss','Fern','Hazel','Bramble','Thorn','Quince','Damson','Pippin','Russet','Cider','Blossom','Orchard','Meadow','Hedge','Willow','Rowan','Elder','Hollow','Misty','Frosty','Sunny','Shady','Stony','Lofty','Crooked','Twisted','Windy','Rusty','Dusty','Mossy','Dewy'];
const B=['Hollow','Bank','Rise','Ridge','Dell','Glen','Gully','Brook','Ford','Crossing','Steps','Ladder','Loft','Gate','Wall','Bridge','Hook','Nook','Perch','Bough','Stump','Cart','Press','Cellar','Shed','Yard','Row','Path','Climb','Reach','Drop','Twist','Corner','Basket','Barrel','Ledge','Lantern','Well','Pond','Fence','Keep','Tower','Mill','Barn'];
let si=7;const names=[];for(const a of A)for(const b of B)names.push(a+' '+b);
for(let i=names.length-1;i>0;i--){si=(si*1103515245+12345)>>>0;const j=si%(i+1);[names[i],names[j]]=[names[j],names[i]];}
const used=new Set();for(const f of ['./levels50.json','./levels-big.json'])for(const l of JSON.parse(fs.readFileSync(f)))used.add(l.name);
const nextName=()=>{while(names.length){const n=names.shift();if(!used.has(n)){used.add(n);return n;}}throw new Error('out of names');};
const out=[];const score=c=>c.sol+120*c.deadRatio;
for(let ch=1;ch<=10;ch++){let pool=[];for(const f of fs.readdirSync('.'))if(new RegExp('^pool4-ch'+ch+'-.*\\.json$').test(f)){try{pool=pool.concat(JSON.parse(fs.readFileSync(f)));}catch(e){}}
  const seen=new Set();pool=pool.filter(c=>{const k=c.rows.join('');if(seen.has(k))return false;seen.add(k);return true;});
  pool.sort((a,b)=>score(a)-score(b));
  if(pool.length<10)console.error(`chapter ${ch}: only ${pool.length} candidates`);
  const hard=pool.slice(-2).reverse();const rest=pool.slice(0,-2);
  const take=[];const want=8;const step=Math.max(1,rest.length/want);for(let i=0;take.length<want&&Math.floor(i)<rest.length;i+=step)take.push(rest[Math.floor(i)]);
  while(take.length<want&&rest.length>take.length)for(const c of rest){if(take.length>=want)break;if(!take.includes(c))take.push(c);}
  take.sort((a,b)=>score(a)-score(b));
  const chapter=[...take.slice(0,4),hard[1]||take[4],...take.slice(4),hard[0]].filter(Boolean);
  chapter.forEach((c,i)=>{const r=solve(parseLevel({rows:c.rows,detonator:c.detonator}),1500000);if(!r||r.path.length!==c.sol)throw new Error('par mismatch ch'+ch);
    const l={name:nextName(),rows:c.rows,par:c.sol};if(i===0)l.tip=TIPS[ch];if(c.detonator)l.detonator=true;out.push(l);});
  console.log('chapter',ch,'pool',pool.length,'->',chapter.length,'pars',chapter.map(c=>c.sol).join(' '),'trap',chapter.map(c=>(c.deadRatio*100).toFixed(0)+'%').join(' '));}
fs.writeFileSync('levels-valley.json','[\n'+out.map(l=>JSON.stringify(l)).join(',\n')+'\n]');
console.log('levels-valley.json:',out.length,'levels');
