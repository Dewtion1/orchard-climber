# Designing Orchard Climber levels by hand

You are designing levels for The Valley, a 100-level map. Work in `tools/valley/chN.js` (one file per chapter, a CommonJS module exporting an array of levels). Check your work with `node check-levels.js valley/chN.js` from inside `tools/`; it prints one line per level and, at the end, a PASS/FAIL verdict per level with reasons. Only PASS levels count. `DIAG=1 node check-levels.js valley/chN.js "Name"` prints a map of every cell the head can reach and which apples are gettable, which is how you debug an UNSOLVABLE design.

## Level format
```js
{name:"Hay Loft",tip:"optional one-line hint shown under the board",detonator:true /* only on Boom levels */,rows:[
"..............",   // W characters per row, H rows; every row the same length
...
"##############",   // bottom row is always solid rock
]}
```
Tiles: `#` rock, `.` empty, `A` apple (red, required), `S` head, `o` the one body cell next to the head, `C` crate, `B` bomb, `X` spikes, `E` door (exit), and the pickups `K` sword, `Q` sour apple, `P` seed, `G` golden apple, `H` honey.
The snake starts as two cells on the floor row (the row above the bottom rock row): `oS` faces right, `So` faces left. **Face the way the first move goes.** If the solver's first move is left, write `So`, not `oS`.

## The rules the solver uses
- A move steps the head one cell up, down, left or right. The body follows. The head can't enter rock, its own body, or push an object into anything but empty space. Pushing a crate or bomb moves it one cell.
- Gravity after every move: the snake and every object fall until some part rests on rock or on an object that rests on rock. The snake cannot reverse into itself, so **a snake of length n cannot turn round inside a corridor less than n cells wide or tall**.
- Climbing: a snake can raise its head while its tail rests on something. A ledge `h` cells up and `d` cells across needs length `h + d` (a crate under the tail adds one). Length 2 climbs one; eating apples grows the snake by one each.
- Apples (`A`) must all be eaten, then the head must reach the door `E`.
- Spikes `X` kill any segment that touches them. A crate pushed onto spikes covers them. A snake can arc over a one-wide spike strip if there is headroom, so a strip you want to force a crate onto needs to be wider than the snake can bridge, or capped by a low ceiling.
- Bombs `B`: on ordinary levels a bomb explodes when it lands after falling. On `detonator:true` levels bombs never go off by landing; the player taps the on-screen Boom button (a move, path letter `B`), and every bomb explodes where it sits. Either way an explosion removes the one rock cell directly beneath the bomb and kills the snake if any segment is next to the bomb. **All new bomb levels in the Valley are `detonator:true`.**
- Pickups: `K` sword, then swiping into rock cuts that one block (one cut per sword). `Q` shrinks the snake by one (never below two). `P` seed, then the Plant move (letter `P`) grows a block in the empty cell in front of the head. `G` grows the snake by two. `H` makes the snake cling to rock beside or above it for six moves.

## What makes a level PASS
The checker enforces all of this:
1. Solvable, with the shortest solution inside the chapter's move window.
2. Every crate and bomb is individually necessary (remove it and the level is unsolvable). Every pickup is individually necessary too (unsolvable without it, or at least 4 moves longer). A level must not contain decoration objects.
3. If the level has crates, the shortest solution pushes at least once. If it has bombs, the shortest solution explodes one. A sword is used to cut, a seed to plant.
4. Spikes, if present, must matter: removing them changes the shortest solution.
5. The snake faces the direction of its first move.
6. No isolated single rock cells (a rock with no rock neighbour) unless the level has at most two and they read as posts or stepping stones. Structures, not scatter.
7. Trap ratio (share of reachable positions that can no longer win) at least the chapter's floor; the two hardest levels in a chapter go in slots 5 and 10.

## What makes a level good
- **Draw something.** Each board should read as a place: a barn with a loft, a well, a staircase, a bridge over a gap, a tower with alcoves, a castle with two towers and a gate, a cottage with a chimney, a train with carriages, a wagon on wheels, a mill with a sealed wheelhouse. Rock in solid shapes: walls, floors, platforms, pillars, roofs. Symmetry and repetition look designed; single floating blocks look random.
- **One idea per level**, visible from the start: "the bucket has to go down the well first", "cut into the tomb then cut out", "grow on the branch before the wall". The tip (first level of a chapter only, or where a twist needs a nudge) says the idea in one sentence.
- **Order of operations is the puzzle.** Good levels make you choose which apple to eat first, where to leave a crate, when to shrink. A level that is just a walk is a waste of a slot.
- **Difficulty rises through the chapter.** Slot 1 is gentle, slots 5 and 10 are the hard ones (long solution or high trap ratio).
- Keep the start on the floor row near a wall edge and the door somewhere that needs the whole level to reach.
- Bigger boards must use their space: structures across the width, height used for climbing.

## Pitfalls that cost iterations
- A one-high corridor with an apple at the dead end: the snake can't turn round after eating. Give it a 2-high room or put the door at the end.
- A corridor one cell tall under a long ceiling: a snake longer than two can't reverse. Design the route as a loop or an out-and-back with room to turn.
- A floating apple more than (length - 1) cells above anything standable is unreachable.
- Objects fall at the first move; draw crates and bombs resting on rock.
- A pickup the solver never needs will fail the check. Place it so the route is impossible without it (the sword's wall is the only way through; the shrink is the only way to fit; the planted block is the only step).
- Spikes under a route of length-3 snakes get bridged; make strips 2 wide for length 3, 3 wide for length 4, or cap them.
