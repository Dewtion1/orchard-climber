# Assemble ../index.html (family) and ../open/index.html (no photos) from template.html + rules.js + faces.js + levels50.json
import pathlib,json,re
from urllib.parse import quote
h=pathlib.Path(__file__).parent
t=(h/'template.html').read_text()
rules=(h/'rules.js').read_text().replace("if(typeof module!=='undefined')module.exports={parseLevel,stepState,stateKey,solve,hintMove,DIRS};\n","")
levels=(h/'levels50.json').read_text()
base=t.replace('/*RULES*/',rules).replace('/*LEVELS*/[]',levels)
# family
fam=base.replace('/*FACES*/',(h/'faces.js').read_text().strip())
(h.parent/'index.html').write_text(fam)
# open: generic avatars, separate board, no unlock-all
emo=['🐍','🍎','🐸','🦎','🐢','🐛','🌱','🍏'];cols=['#2f7d3a','#e0493a','#3a8fd1','#e3a51f','#7b5ea7','#d86b2a','#2aa39a','#b03a6b']
def av(e,c):
    svg=f"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='{c}'/><text x='50' y='66' font-size='52' text-anchor='middle'>{e}</text></svg>"
    return 'data:image/svg+xml;utf8,'+quote(svg,safe="/:=,'() <>").replace('#','%23')
faces='const FACES='+json.dumps([av(e,c) for e,c in zip(emo,cols)])+';'
op=base.replace('/*FACES*/',faces)
op=op.replace("const FACE_NAMES=['','','','','','','Iain'];","const FACE_NAMES=['','','','','','','',''];")
op=op.replace("const p={id:'p'+Date.now().toString(36),","const p={id:'pub-'+Date.now().toString(36),")
op=op.replace("LB_CACHE=(await r.json()).filter(x=>!x.pid.startsWith('pub-')&&rowValid(x));","LB_CACHE=(await r.json()).filter(x=>x.pid.startsWith('pub-')&&rowValid(x));")
op=op.replace("const open=/^andrew$/i.test(p.name.trim())?LEVELS.length:unlockedUpTo(p);","const open=unlockedUpTo(p);")
op=op.replace('<h2>Family Board</h2>','<h2>Leaderboard</h2>').replace('50 levels, one family leaderboard.','50 levels and a leaderboard.').replace('<h2>Pick your face</h2>','<h2>Pick an avatar</h2>')
op=op.replace('href="manifest.json"','href="../manifest.json"').replace('href="apple-touch-icon.png"','href="../apple-touch-icon.png"')
op=op.replace("const KEY='orchard.v1';","const KEY='orchard.open.v1';")
assert 'Iain' not in op and '/9j/' not in op and 'pub-' in op
(h.parent/'open').mkdir(exist_ok=True)
(h.parent/'open'/'index.html').write_text(op)
print('built',len(fam),len(op))
