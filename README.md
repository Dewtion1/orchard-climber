# Orchard Climber

A gravity snake puzzle for the family. Eat apples to grow; the longer you are, the higher you can climb. 50 levels, family faces, shared leaderboard.

- `index.html` — the whole game (levels, faces and rules are embedded; no build step).
- `supabase/orchard_climber_scores.sql` — the leaderboard table. Run once in the Quotal Supabase project.
- Deploys as a static site on Vercel; pushes to `main` go live.

## Rules
Move one cell at a time. After every move, if no part of the snake is resting on a platform, the whole snake falls. Eating an apple adds a segment. Clear a level by eating every apple. Falling off the bottom restarts the level (Undo also works). Hint costs 3 moves.

Par is the shortest solution found by the solver. Matching or beating par earns gold on the level grid and counts on the leaderboard (ranked by levels cleared, then levels under par, then total moves).

## Tools
`tools/core.js`, `tools/levels.js`, `tools/gen.js`, `tools/solve.js` — rules, the five hand-made levels, the procedural generator, and the BFS solver that verified every level and set its par. `node tools/gen.js` (run inside `tools/`) regenerates `levels50.json`. `tools/template.html` is the page without the embedded faces and levels; `index.html` is assembled from it by replacing `/*FACES*/` with the `const FACES=[...]` line and `/*LEVELS*/[]` with the contents of `levels50.json`.
