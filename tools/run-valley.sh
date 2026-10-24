#!/bin/sh
# Generate the Valley candidate pools: four workers, each running its chapters in turn.
cd "$(dirname "$0")"
run(){ for ch in "$@"; do timeout 900 node gen4.js $((1000+ch*7)) 14 $ch > run4-ch$ch.log 2>&1; done; }
run 1 5 9 &
run 2 6 10 &
run 3 7 &
run 4 8 &
wait
echo "all chapters done at $(date -u +%H:%M)"
