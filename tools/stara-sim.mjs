// ---------------------------------------------------------------------------
// Starà measured: the walled city-state (the fifth pass, 2026-11-23).
//
// Plays the real mode through Game, on the same deals, two ways:
//   RANDOM  a random tile from the hand at a random legal spot;
//   GREEDY  every tile in hand at every legal spot, keeping whichever leaves
//           the city worth most now (no look ahead);
//   WATER   greedy, but an aqueduct that would carry the water further is
//           laid first, whatever it pays now: one plan, and the plainest.
// Greedy does not plan (it never keeps a square for the aqueduct or a road
// for the third gate), so read its numbers as a floor on what skill can do.
//
// The measures are docs/STARA-DESIGN.md's: the FLOOR (random as a share of
// greedy: points that arrive whatever you do), the SKILL GAP (greedy over
// random in random's standard deviations) and TRIVIAL TURNS (the best spot
// worth under 1 more than the median one).
//
// The fourth pass's simulator (Carcassonne's tiles, the quarters, the
// variants that document measured) is in the history at commit 286ab76.
//
//   node tools/stara-sim.mjs            the 7 x 7, 100 deals each way
//   SIDE=5 node tools/stara-sim.mjs     the 5 x 5
//   GAMES=30 node tools/stara-sim.mjs
// ---------------------------------------------------------------------------

import { Game } from '../src/game.js';
import { TILES } from '../src/tiles.js';
import { appraise, PLACES, STARA_KINDS, runningWater, spanOf } from '../src/modes/stara.js';

const GAMES = Number(process.env.GAMES || 100);
const SIDE = Number(process.env.SIDE || 7);
const MODE = SIDE === 5 ? 'stara5' : 'stara';

function mulberry(a) {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One day, played `who` way. */
export function play(seed, who) {
  const g = new Game({ mode: MODE, seed });
  const r = mulberry(seed * 7919 + (who === 'random' ? 1 : 2));
  const spreads = [];
  let guard = 0, maxHand = 1;
  while (g.phase === 'place' && guard++ < 200) {
    maxHand = Math.max(maxHand, g.m.hand.length);
    const moves = [];
    g.m.hand.forEach((id, i) => {
      for (const s of g.board.legalPlacements(TILES[id], g.placeOpts())) moves.push({ i, ...s });
    });
    let pick;
    if (who === 'random') {
      const i = Math.floor(r() * g.m.hand.length);
      const mine = moves.filter((m) => m.i === i);
      pick = mine[Math.floor(r() * mine.length)];
    } else {
      const vals = [];
      let best = -Infinity;
      const run = who === 'water' ? runningWater(g.board, g.m.arch) : new Set();
      const wet = run.size;
      const ends = new Set();
      for (const k of run) {
        const [x, y] = k.split(',').map(Number);
        const c = g.board.get(x, y);
        for (const sd of c ? spanOf(c) : [0, 1, 2, 3]) {
          const [dx, dy] = [[0, -1], [1, 0], [0, 1], [-1, 0]][sd];
          if (!g.board.get(x + dx, y + dy) && g.board.inBounds(x + dx, y + dy)) ends.add(`${x + dx},${y + dy}`);
        }
      }
      for (const m of moves) {
        const type = TILES[g.m.hand[m.i]];
        g.board.place(m.x, m.y, type, m.rot, { owner: 0 });
        let v = appraise(g.board, g.m.arch).total + r() * 0.01;
        if (who === 'water' && type.span && runningWater(g.board, g.m.arch).size > wet) v += 100;
        // ...and the square a running span opens onto is kept for one.
        if (who === 'water' && !type.span && ends.has(`${m.x},${m.y}`)) v -= 8;
        g.board.remove(m.x, m.y, { quiet: true });
        g.board.rebuild();
        vals.push(v);
        if (v > best) { best = v; pick = m; }
      }
      vals.sort((a, b) => a - b);
      if (who === 'greedy') spreads.push(best - vals[Math.floor(vals.length / 2)]);
    }
    g.m.select(pick.i);
    g.rot = pick.rot;
    g.placeAt(pick.x, pick.y);
  }
  const city = g.m.city;
  const best = Math.max(0, ...city.roads.map((w) => w.gates));
  const kinds = {};
  for (const v of city.per.values()) kinds[v.kind] = (kinds[v.kind] || 0) + v.pts;
  return {
    total: g.players[0].score, groups: city.groups, kinds, filled: g.board.size,
    full: g.board.size >= SIDE * SIDE, spreads, running: city.running.size,
    comuneWet: !!city.per.get('0,0')?.wet, bestGates: best, maxHand, cast: g.m.cast,
  };
}

if (process.argv[1]?.endsWith('stara-sim.mjs')) {
  const mean = (a) => a.reduce((x, y) => x + y, 0) / (a.length || 1);
  const sd = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((x) => (x - m) ** 2))); };
  const G = [], R = [], Wt = [];
  for (let s = 1; s <= GAMES; s++) { G.push(play(s, 'greedy')); R.push(play(s, 'random')); Wt.push(play(s, 'water')); }
  const g = G.map((x) => x.total), r = R.map((x) => x.total);
  const sp = G.flatMap((x) => x.spreads);
  console.log(`Starà ${SIDE}x${SIDE}, ${GAMES} deals`);
  console.log(`greedy ${mean(g).toFixed(1)} (${Math.min(...g)}-${Math.max(...g)}), random ${mean(r).toFixed(1)} (${Math.min(...r)}-${Math.max(...r)})`);
  const w = Wt.map((x) => x.total);
  console.log(`water-first ${mean(w).toFixed(1)}: water ${mean(Wt.map((x) => x.running)).toFixed(1)} squares, the Comune's fountain ${Wt.filter((x) => x.comuneWet).length} days, beats greedy on ${Wt.filter((x, i) => x.total > G[i].total).length} of ${GAMES}`);
  console.log(`floor ${(mean(r) / mean(g) * 100).toFixed(0)}%, skill gap ${((mean(g) - mean(r)) / sd(r)).toFixed(2)} sd, trivial turns ${(sp.filter((x) => x < 1).length / sp.length * 100).toFixed(0)}%`);
  console.log(`filled ${mean(G.map((x) => x.filled)).toFixed(1)} / ${mean(R.map((x) => x.filled)).toFixed(1)}, full ${G.filter((x) => x.full).length} / ${R.filter((x) => x.full).length}, biggest hand ${mean(G.map((x) => x.maxHand)).toFixed(1)}`);
  console.log(`water runs (squares) ${mean(G.map((x) => x.running)).toFixed(1)} / ${mean(R.map((x) => x.running)).toFixed(1)}, days any water ${G.filter((x) => x.running).length} / ${R.filter((x) => x.running).length}, the Comune's fountain ${G.filter((x) => x.comuneWet).length} / ${R.filter((x) => x.comuneWet).length}`);
  const gates = (L) => [0, 1, 2, 3, 4, 5].map((k) => L.filter((x) => Math.min(x.bestGates, 5) === k).length).join('/');
  console.log(`best high road, gates 0..5: greedy ${gates(G)}, random ${gates(R)}`);
  console.log('by tally (greedy / random):');
  for (const [k, name] of STARA_KINDS) console.log(`  ${name.padEnd(24)} ${mean(G.map((x) => x.groups[k])).toFixed(1).padStart(6)} / ${mean(R.map((x) => x.groups[k])).toFixed(1)}`);
  console.log('by place, on the days it is dealt (greedy / random):');
  for (const k of Object.keys(PLACES)) {
    const on = (L) => L.filter((x) => k in x.kinds);
    const a = on(G), b = on(R);
    if (!a.length) continue;
    console.log(`  ${PLACES[k].name.padEnd(24)} ${mean(a.map((x) => x.kinds[k])).toFixed(1).padStart(6)} / ${mean(b.map((x) => x.kinds[k] || 0)).toFixed(1)}   (${a.length} days)`);
  }
}
