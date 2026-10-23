# Orchard Climber — design handoff

**Repo:** github.com/Dewtion1/orchard-climber (static site, Vercel auto-deploys `main`)
**Live:** https://orchard-climber-dewition.vercel.app (family, with photos) · https://orchard-climber-dewition.vercel.app/open (public, generic avatars)

## What the game is
A turn-based gravity snake puzzle (Snakebird-style) for Andrew's family, played on phones. You move one cell per swipe; after every move the snake and any objects fall until something rests on rock. Eating an apple adds a segment, and a longer snake can stack itself higher. Mechanics: **crates** (push, fall, stand on), **bombs** (explode when they land after a fall, blowing out the rock beneath; lethal if a segment is adjacent), **spikes** (lethal on contact; a crate can cover them) and an **exit door** (opens once every apple is eaten; you must then reach it). Each level has a **par** (shortest solution); matching it earns a gold apple on the path and counts on the shared family leaderboard; within five of par earns a green apple. Hint costs 3 moves over two stages; Undo is free.

The feel: a warm, hand-made orchard — wooden crates, grassy stone ledges, red apples, a slightly cheeky jade snake wearing a family member's face. Gentle, not arcade. Played in short bursts, often one-handed.

## Status of the design pass
Done, from the design mockups (`design-reference/*.dc.html` in the design folder, not in the repo):
1. **In-game art** — SVG sprites (`SPR_SVG` in the template) rasterised once and drawn per 40px cell on a 2× backing store; stroked jade snake with a face disc and tongue; landing squash, push anticipation, bomb screen shake, door fade, starburst explosion, "nom" burst.
2. **Splash** (`#splash`), **Home** (`#home`), **The Orchard** level path (`#levels`, nodes placed by `nodePos()` on a sine zig-zag, path curve by `curveThrough()`), **Game strip** (`.strip`), **Level clear / Splat / Orchard cleared** cards (`showCard()` fills `#msg` inside `#overlay`), leaf confetti.
3. Feel features from the review: service worker (`sw.js`, generated), two-stage hint in a Web Worker with on-board markers, auto-undo on repeat deaths, bomb blast preview (`blastPreview()` tints the cells a bomb would hit when it is about to fall or when the next swipe would push it off a ledge), three-tier rating, per-level best holder on the path, finale card with a share line, haptics via `navigator.vibrate`, restore progress by name.

Still open:
- **Sound** — all synthesised with WebAudio oscillators/noise in the `SFX` object (step, bump, eat, land, push, boom, die, rewind, door, win, finale). Replace with designed samples (short, embedded as base64 data URIs, ideally < 20 KB each) and consider an ambient orchard loop behind the mute toggle. Must stay silent until the first user gesture (the splash tap resumes the AudioContext).
- Isolated single rock blocks in generated levels could be re-skinned as trees, bushes or barrels.

## Tokens
Sky `#dfeff5`, ink `#213a2a`, cream `#f6f0e4` (shadow `#c9bfa9`), leaf `#4caf50` (decoration only), leaf-deep `#2f7d3a` (the only place for white text), gold `#e3a51f` (ink text on it; light `#fbe7a6`, dark `#a8770f`), apple `#e0493a`, splat red `#b5301f`, jade `#2e9e6b` / `#1d6e4a`, stone `#d6cfc1`, earth `#6f604d`, crate `#c98a4b`, bark `#7a4e2d`. Fonts: Lilita One for display, Nunito 600/800 for body. Buttons have a solid bottom shadow, tap targets are at least 44px, no emoji in the UI. All tokens are in `:root` at the top of `tools/template.html`.

## Architecture (what you'll be editing)
- **Edit `tools/template.html` only.** `index.html`, `open/index.html` and `sw.js` are *built* from it by `python3 tools/build.py` (run inside `tools/`), which pastes in the rules (`tools/rules.js`), the levels (`tools/levels50.json`), the level index map (`tools/level-map.json`) and the faces. Never edit the built files by hand; never commit `tools/faces.js` (git-ignored; if missing, recover it with `grep -m1 '^const FACES=' index.html > tools/faces.js`).
- One HTML file, no framework, no bundler, no external assets except Google Fonts. Five `<section class="screen">`s: `#splash`, `#home`, `#levels`, `#game`, `#board`; `show(id)` switches between them.
- **Rendering**: `<canvas id="c">`, `CELL=40`, `R=2` backing-store scale, board is `lv.W×lv.H` cells (14×12). `draw(p)` redraws everything each frame; `p` is the 0–1 interpolation of the current move. Sprites: `SPR_SVG` → `spr(name,px,py,scale,alpha)`. Drawing helpers: `drawRock`, `drawCrate`, `drawBomb`, `drawSpikes`, `drawExit`, `blastPreview`, the snake stroke and head in `draw`, `spawnBits`/particles, the `booms` loop, hint markers. State: `st.snake` (head first), `st.apples`, `st.objs` ({t:'C'|'B',x,y,id}), `st.gone`, `lv.walls`, `lv.spikes`, `lv.exit`, `facing`, `hintApple`, `hintDir`.
- **Sound**: `SFX.<name>()` from `move()` and the cards; `tone()` and `noise()` are the synth primitives; `setMute()` updates every `.mute` button and `localStorage['orchard.muted']`. Swapping to samples means replacing the bodies of the `SFX` functions with `AudioBufferSourceNode` playback from decoded base64.
- **Controls**: one swipe anywhere on `#game` = one move (28px threshold); keyboard arrows/WASD, Z undo, R restart. Keep this; tapping was tried and rejected. Keep `touch-action: none` on `#game`.
- **Copy that lives in the page**: tutorial tips (`LEVELS[i].tip` → the cream card under the board), the Splat reasons, the clear/finale lines, the first-run "Swipe anywhere to move" overlay (`#padHint`), the restore-by-name card.

## Constraints — please don't break these
- The rules engine (`tools/rules.js`, pasted in verbatim) and the level data are off-limits in a design pass; par and the leaderboard depend on them.
- Everything must stay in the single built page: images and sounds as data URIs, fonts from Google Fonts. Keep the built `index.html` under ~1 MB.
- Phone first, portrait, one-handed. The board fills the width edge to edge.
- The `/open` build is produced by `build.py` from the same template by string replacement (avatars instead of faces, "Leaderboard" instead of "Family Board", `pub-` player ids, `PUB=true`). `build.py` asserts each replaced string exists, so renaming one in the template fails the build until `build.py` is updated to match.
- Two player-facing wordings are deliberate: "par", and "Family Board".
- `remapRow`, the `LEVELS_V*` timestamps and `LEVEL_MAP` are load-bearing: they keep old leaderboard rows and local progress pointing at the right levels. Leave them.

## How to check your work
```
cd tools && node test-rules.js      # engine and tutorials untouched
cd tools && python3 build.py        # rebuild index.html, open/index.html and sw.js
```
Then open `index.html` in a phone-width window (390×780): tap the splash, add a player, open level 1 and play `solve(lv).path` from the console (arrow keys); the clear card should appear. `node review.js` (inside `tools/`) re-audits every level.

Commit to `main` and Vercel deploys it in about a minute.
