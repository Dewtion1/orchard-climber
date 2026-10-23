# Orchard Climber — design handoff

**Repo:** github.com/Dewtion1/orchard-climber (static site, Vercel auto-deploys `main`)
**Live:** https://orchard-climber-dewition.vercel.app (family, with photos) · https://orchard-climber-dewition.vercel.app/open (public, generic avatars)

## What the game is
A turn-based gravity snake puzzle (Snakebird-style) for Andrew's family, played on phones. You move one cell per swipe; after every move the snake and any objects fall until something rests on rock. Eating an apple adds a segment, and a longer snake can stack itself higher. From the mechanics set: **crates** (push, fall, stand on), **bombs** (explode when they land after a fall, blowing out the rock beneath; lethal if a segment is adjacent), **spikes** (lethal on contact; a crate can cover them) and an **exit door** (opens once every apple is eaten; you must then reach it). 31 levels: 4 hand-made tutorials, then 27 generated and solver-verified. Each level has a **par** (shortest solution); matching it earns gold on the level grid and counts on the shared family leaderboard. Hint costs 3 moves, Undo is free.

The feel we want: a warm, hand-made orchard — wooden crates, grassy stone ledges, red apples, a slightly cheeky snake wearing a family member's face. Gentle, not arcade. It is played in short bursts, often one-handed.

## What we'd like help with
1. **Splash / launch screen** — currently none; the app opens straight on the player picker. Wanted: a short branded moment (logo, orchard scene, "tap to start") that also covers the first audio unlock on iOS.
2. **Home screen** — player picker with the seven family faces (or avatars on /open), Play and Leaderboard. Make it feel like a game menu rather than a form.
3. **Level select** — 5-column grid of numbers with "par 44" / "55 mv" captions; locked, cleared and gold states. Could be a path up an orchard / tree instead of a grid.
4. **In-game art** — everything is drawn procedurally on a canvas at 40px cells (see Rendering). Candidates: rock/grass tiles, snake body and head, apple, crate, bomb (with fuse flicker), spikes, closed/open door, bomb rubble, explosion, the "nom" eating burst, death ("Splat!"), and the level-clear card. Sprite sheets or SVG are both fine as long as they end up embedded (data URIs) — see Constraints.
5. **Motion** — snake moves/falls are linearly interpolated (90ms + 55ms per cell fallen). Could use squash on landing, a little anticipation on push, screen shake for bombs, door opening animation, level-clear confetti.
6. **Sound** — all synthesised with WebAudio oscillators/noise in the `SFX` object (step, bump, eat, land, push, boom, die, door, win). Replace with designed samples (short, embedded as base64 data URIs, ideally < 20 KB each) and consider ambient orchard background (birds, wind) behind a mute toggle. Must stay silent until the first user gesture (iOS).
7. **Typography / colour** — current tokens are in `:root` at the top of `tools/template.html`: display face Lilita One, body Nunito, palette sky `#dfeff5`, ink `#213a2a`, leaf `#4caf50` / `#2f7d3a`, apple `#e0493a`, card `#f6f0e4`, gold `#e3a51f`. Free to change; keep contrast high for outdoor phone use.

## Architecture (what you'll be editing)
- **Edit `tools/template.html` only.** `index.html` and `open/index.html` are *built* from it by `python3 tools/build.py` (run inside `tools/`), which pastes in the rules (`tools/rules.js`), the levels (`tools/levels50.json`) and the faces. Never edit the two built files by hand; never commit `tools/faces.js` (it holds the family photos as data URIs and is git-ignored; if it is missing, recover it with `grep -m1 '^const FACES=' index.html > tools/faces.js`).
- One HTML file, no framework, no bundler, no external assets except Google Fonts. Four `<section class="screen">`s: `#home`, `#levels`, `#game`, `#board`; `show(id)` switches between them.
- **Rendering**: `<canvas id="c">`, `CELL=40`, board is `lv.W×lv.H` cells (14×12 today). `draw(p)` redraws everything each frame; `p` is the 0–1 interpolation of the current move. Drawing helpers to restyle or replace: `drawRock`, `drawCrate`, `drawBomb`, `drawSpikes`, `drawExit`, the apple block inside `draw`, the snake segment loop, the head (face image clipped to a circle, or eyes), `spawnBits`/particle loop, the explosion loop (`booms`). State you can read: `st.snake` (array of [x,y], head first), `st.apples`, `st.objs` ({t:'C'|'B',x,y,id}), `st.gone` (rock cells a bomb removed), `lv.walls`, `lv.spikes`, `lv.exit`, `facing`.
- **Sound**: `SFX.<name>()` is called from `move()`; `tone()` and `noise()` are the synth primitives; `setMute()` handles the 🔊 button and `localStorage['orchard.muted']`. Swapping to samples means replacing the bodies of the `SFX` functions with `AudioBufferSourceNode` playback from decoded base64.
- **Controls**: one swipe anywhere on `#game` = one move (`pointerdown/move/up` on `#game`, 28px threshold); keyboard arrows/WASD, Z undo, R restart. Keep this; tapping was tried and rejected.
- **Screens that already carry copy**: tutorial tips (`LEVELS[i].tip` → toast), "Splat!" card with reason, "Level clear!" / "Under par!" card, first-run "Swipe to move" overlay (`#padHint`).

## Constraints — please don't break these
- The rules engine (`tools/rules.js`, pasted in verbatim) and the level data are off-limits; par and the leaderboard depend on them. Visual/audio changes only.
- Everything must stay in the single built page: images and sounds as data URIs, fonts from Google Fonts. Keep the built `index.html` under ~1 MB.
- Phone first, portrait, one-handed. The board fills the width edge-to-edge; the top strip has Levels / level name / Moves-Par-Length and a row of Undo / Restart / Hint / mute. iOS double-tap zoom is suppressed with `touch-action` and `pointerdown` handlers; keep `touch-action: none` on `#game`.
- The `/open` build is produced by `build.py` from the same template by string replacement (avatars instead of faces, "Leaderboard" instead of "Family Board", `pub-` player ids). If you rename those strings in the template, update `build.py` to match.
- Two player-facing wordings are deliberate: "par", and "Family Board".
- Leaderboard timestamps and the `remapRow` logic in the template are load-bearing; leave them.

## How to check your work
```
cd tools && node test-rules.js      # engine untouched
cd tools && python3 build.py        # rebuild index.html and open/index.html
```
Then open `index.html` in a phone-width window (390×780). A quick headless check that the page still plays: add a player, open level 1, send ArrowRight/ArrowUp keys and confirm the "Level clear" card appears after `R U U R D R R U R U U U`.

Commit to `main` and Vercel deploys it in about a minute.
