#!/bin/sh
# Second pass: top up the thin chapters with new seeds and longer budgets.
cd "$(dirname "$0")"
run(){ s=$1; shift; for ch in "$@"; do timeout 1500 node gen4.js $((s+ch*13)) 12 $ch > run4b-ch$ch-$s.log 2>&1; done; }
run 2000 4 6 4 &
run 3000 6 4 6 &
run 4000 5 7 10 &
run 5000 9 10 8 &
wait
echo "pass 2 done at $(date -u +%H:%M)"
