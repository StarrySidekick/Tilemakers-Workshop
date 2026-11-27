// ---------------------------------------------------------------------------
// Starà measured: the seventh pass (2026-11-27), an open table, the wall that
// hugs the city, houses paid for what they have, the aqueduct over it all.
//
// Plays the real mode through Game, on the same deals, four ways:
//   RANDOM   a random piece from the hand at a random way it fits;
//   GREEDY   every piece in hand at every way it fits, keeping whichever
//            leaves the city worth most now (no look ahead);
//   AHEAD    greedy over two moves: each of greedy's best eight, then the
//            best move after it from what would be left in hand, keeping the
//            pair worth most;
//   PLAN     the architect's plan, laid as dealt: the day's target.
// None of them plans beyond that, so read their numbers as floors on what a
// person who studies the table can do.
//
// The measures are docs/STARA-DESIGN.md's: the FLOOR (random as a share of
// greedy), the SKILL GAP (greedy over random in random's standard
// deviations), TRIVIAL TURNS (the best move worth under 1 more than the
// median one), and how near the PLAN each comes; and now the wall: how long,
// how many gates.
//
// The sixth pass's simulator (the square, the careful player who lifts) is in
// the history at commit 60ebde3; the fifth pass's at 2cc10f8.
//
//   node tools/stara-sim.mjs            the 5 x 5, 60 deals each way
//   SIDE=7 node tools/stara-sim.mjs     the 7 x 7
//   GAMES=30 node tools/stara-sim.mjs
// ---------------------------------------------------------------------------

import { Game } from '../src/game.js';
import { appraiseCity, WAYS, isAbove } from '../src/modes/stara.js';

const GAMES = Number(process.env.GAMES || 60);
const SIDE = Number(process.env.SIDE || 5);
const MODE = SIDE === 5 ? 'stara5' : 'stara';

function mulberry(a) {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Every move: each piece in hand, each way it fits, with what the city is worth after. */
function moves(g) {
  const out = [];
  g.m.hand.forEach((id, i) => {
    const piece = g.m.pieces[id];
    for (const m of g.m.placements(piece)) {
      out.push({ i, id, ...m, v: appraiseCity(g.m.trialCity(piece, m.x, m.y, m.cells)).total });
    }
  });
  return out;
}

/**
 * Lay a move as a trial and take it back, putting the pile, the hand and the
 * score as they were. Returns what `look` said of the city in between.
 */
function trial(g, m, look) {
  const M = g.m;
  const hand = M.hand.slice(), sel = M.sel, deck = g.deck.length;
  M.select(m.i);
  M.lay(M.held, m.x, m.y, m.rot);
  const out = look();
  if (g.phase === 'over') g.phase = 'place';
  const piece = M.pieces[m.id];
  for (const s of M.squaresOf(m.id)) {
    if (isAbove(piece)) M.water.spans.delete(`${s.x},${s.y}`);
    else g.board.remove(s.x, s.y, { quiet: true });
  }
  if (isAbove(piece)) M.water.version++; else g.board.rebuild();
  M.laid.delete(m.id);
  while (g.deck.length < deck) g.deck.push(M.hand.pop());
  M.hand = hand;
  M.sel = sel;
  M.rescore();
  M.hold();
  g.turn--;
  return out;
}

/** One day, played `who` way. */
export function play(seed, who) {
  const g = new Game({ mode: MODE, seed });
  const r = mulberry(seed * 7919 + who.length);
  const spreads = [];
  let guard = 0;
  if (who === 'plan') {
    const at = Object.fromEntries(g.m.level.plan.map((p) => [p.id, p]));
    while (g.phase === 'place' && guard++ < 200) {
      const i = g.m.hand.findIndex((id) => g.m.fitsAt(at[id].x, at[id].y, g.m.pieces[id].cells, g.m.pieces[id]));
      g.m.select(i);
      g.m.lay(g.m.held, at[g.m.held.id].x, at[g.m.held.id].y, 0);
    }
  }
  while (g.phase === 'place' && guard++ < 300) {
    const all = moves(g);
    if (!all.length) { g.m.endDay(); break; }
    let pick;
    if (who === 'random') {
      pick = all[Math.floor(r() * all.length)];
    } else {
      all.sort((a, b) => b.v - a.v + (r() - 0.5) * 0.01);
      const vals = all.map((m) => m.v).sort((a, b) => a - b);
      if (who === 'greedy') spreads.push(all[0].v - vals[Math.floor(vals.length / 2)]);
      pick = all[0];
      if (who === 'ahead') {
        let best = -Infinity;
        for (const m of all.slice(0, 8)) {
          const next = trial(g, m, () => {
            if (g.phase !== 'place') return g.m.city.total;
            const after = moves(g);
            return after.length ? Math.max(...after.map((k) => k.v)) : g.m.city.total;
          });
          if (next > best) { best = next; pick = m; }
        }
      }
    }
    g.m.select(pick.i);
    g.m.lay(g.m.held, pick.x, pick.y, pick.rot);
  }
  const city = g.m.city;
  return {
    total: g.players[0].score, par: g.m.par, ways: city.ways, spreads,
    pieces: Object.keys(g.m.pieces).length, laid: g.m.laid.size,
    wall: city.wall.length, gates: city.wall.filter((w) => w.gate).length,
    running: city.running.size - 1, sides: city.roads[0]?.sides || 0,
  };
}

if (process.argv[1]?.endsWith('stara-sim.mjs')) {
  const mean = (a) => a.reduce((x, y) => x + y, 0) / (a.length || 1);
  const sd = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((x) => (x - m) ** 2))); };
  const ways = ['random', 'greedy', 'ahead', 'plan'];
  const runs = Object.fromEntries(ways.map((w) => [w, []]));
  const t0 = Date.now();
  for (let s = 1; s <= GAMES; s++) for (const w of ways) runs[w].push(play(s, w));
  const tot = (w) => runs[w].map((x) => x.total);
  console.log(`Starà ${SIDE}x${SIDE}, ${GAMES} deals, ${mean(runs.plan.map((x) => x.pieces)).toFixed(1)} pieces a day (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  for (const w of ways) {
    const L = runs[w];
    console.log(`  ${w.padEnd(8)} ${mean(tot(w)).toFixed(1).padStart(6)} (${Math.min(...tot(w))} to ${Math.max(...tot(w))})`
      + `  of the plan ${(mean(L.map((x) => x.total / x.par)) * 100).toFixed(0)}%`
      + `  wall ${mean(L.map((x) => x.wall)).toFixed(1)}, gates ${mean(L.map((x) => x.gates)).toFixed(1)}`
      + `  water ${mean(L.map((x) => x.running)).toFixed(1)}  beat the plan ${L.filter((x) => x.total > x.par).length}`);
  }
  const g = tot('greedy'), r = tot('random');
  const sp = runs.greedy.flatMap((x) => x.spreads);
  console.log(`floor ${(mean(r) / mean(g) * 100).toFixed(0)}%, skill gap ${((mean(g) - mean(r)) / sd(r)).toFixed(2)} sd, trivial turns ${(sp.filter((x) => x < 1).length / sp.length * 100).toFixed(0)}%`);
  console.log('by way (random / greedy / ahead / plan):');
  for (const w of WAYS) console.log(`  ${w.name.padEnd(22)} ${ways.map((k) => mean(runs[k].map((x) => x.ways[w.id])).toFixed(1).padStart(6)).join(' /')}`);
  const sides = (L) => [0, 2, 3, 4].map((k) => L.filter((x) => x.sides === k).length).join('/');
  console.log(`the high road, sides 0/2/3/4: ${ways.map((k) => `${k} ${sides(runs[k])}`).join(', ')}`);
}
