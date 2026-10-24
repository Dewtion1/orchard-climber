# Orchard Climber

A gravity snake puzzle for the family. Eat apples to grow; the longer you are, the higher you can climb. Hand-made tutorials, bridging levels, solver-verified main levels and a bonus level, family faces, a shared leaderboard, sound, and it works offline.

- `index.html` — the whole family game (levels, faces and rules are embedded). **Built**; do not edit by hand.
- `open/index.html` — the public version with generic avatars and its own leaderboard. **Built.**
- `sw.js` — the service worker (offline play, installable). **Built**; its cache version follows the page content.
- `supabase/orchard_climber_scores.sql` — the leaderboard table. Run once in the Quotal Supabase project.
- Deploys as a static site on Vercel; pushes to `main` go live.

## Rules
Move one cell at a time (one swipe = one move). After every move, if no part of the snake is resting on something solid, the whole snake falls. Eating an apple adds a segment. Mechanics: push **crates** and stand on them; **bombs** explode when they land after a fall, blowing out the rock beneath (stay out of the way); **spikes** kill on contact (a crate can cover them); on **detonator** levels (test map only for now) bombs wait instead of going off when they land, and a red Boom button on screen sets every bomb off where it sits, counting as one move; when a level has a **door**, eat every apple and then reach it. On the test map, five **power-ups** can be picked up: a **sword** (swipe into rock to cut one block), a **sour apple** (shrink by one), a **seed** (tap Plant to grow a block in front of your head), a **golden apple** (grow by two) and **honey** (cling to rock beside or above you for six moves). Only the red apples are needed to win. Falling off the bottom, spikes or a blast ends the attempt: the first death on a level shows the Splat card, later ones rewind one move automatically. Undo is free.

Every clear earns **stars** from the move count: three within about a fifth of the shortest solution (`ceil(par*1.2)+2` moves), two within about three fifths (`ceil(par*1.6)+4`), one for any clear. Matching the shortest solution (the stored `par`) earns a **gold apple stamp** on top. The leaderboard ranks by levels cleared, then stars, then stamps, then total moves. Hint costs 3 moves in two stages: the first tap (−1) marks the apple (or door) the shortest solution goes for next, the second (−2) shows the move. Hints are solved in a Web Worker so the phone never freezes.

## Screens
Splash (tap to start; also unlocks audio on iOS) → Home (player tiles, Play, Family Board, The Valley, Test map) → The Orchard (a winding path of level nodes, current level marked with your face, per-level best holder from the board) → Game (cream strip with Moves / par / Length and Undo / Restart / Hint / mute, board edge to edge, tutorial tip card under it) → Level clear / Splat / Orchard cleared cards. Adding a player whose name already has scores on the board from another phone offers to restore that progress.

## Tools
`tools/template.html` is the page without the embedded faces and levels; `python3 tools/build.py` (run inside `tools/`) assembles `index.html`, `open/index.html` and `sw.js` from it plus `tools/rules.js` (the single source of the rules), `tools/levels50.json` (the level set, in play order; entries are `{name, tip?, rows, par, bonus?}`), `tools/faces.js` (family photos as data URIs; git-ignored, recover it with `grep -m1 '^const FACES=' index.html > tools/faces.js`) and `tools/level-map.json` (old → new level index for leaderboard rows and local progress written before the current set).

`tools/test-rules.js` checks the mechanics, every tutorial and bridging level's par, and that each tutorial actually needs its mechanic. `tools/review.js` audits every level: par, trap ratio (share of reachable positions that can no longer be won), whether spikes/exit change the answer, whether crates are pushed and bombs detonated in the shortest solution. `tools/gen2.js <seed> <n> [bridge]` generates candidates that pass the acceptance tests (objects needed, crates pushed at least twice, bombs detonated, a trap-ratio floor for main levels; `bridge` mode makes short single-mechanic levels). `tools/levels-v2.js` holds the hand-made tutorials.

Older tools from the v1 engine (`core.js`, `levels.js`, `gen.js`, `solve.js`, `pick.js`) are kept for reference.
