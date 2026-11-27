// ---------------------------------------------------------------------------
// Starà measured: the day's plan and its pieces (the sixth pass, 2026-11-27).
//
// Plays the real mode through Game, on the same deals, four ways:
//   RANDOM   a random piece from the hand at a random way it fits;
//   GREEDY   every piece in hand at every way it fits, keeping whichever
//            leaves the city worth most now (no look ahead);
//   CAREFUL  greedy, but never a move after which some piece still to come
//            (in hand or in the pile) has nowhere left to go; and when
//            nothing fits, it lifts the piece whose lifting lets most go
//            down again, for its point, up to six times a day;
//   PLAN     the architect's plan, laid as dealt: the day's target.
// None of them plans ahead beyond that, so read their numbers as floors on
// what a person who studies the square can do.
//
// The measures are docs/STARA-DESIGN.md's: the FLOOR (random as a share of
// greedy), the SKILL GAP (greedy over random in random's standard
// deviations), TRIVIAL TURNS (the best move worth under 1 more than the
// median one), and now how often the square is FILLED and how near the PLAN
// each comes.
//
// The fifth pass's simulator (one place to a tile, no plan) is in the
// history at commit 2cc10f8.
//
//   node tools/stara-sim.mjs            the 5 x 5, 60 deals each way
//   SIDE=7 node tools/stara-sim.mjs     the 7 x 7
//   GAMES=30 node tools/stara-sim.mjs
// ---------------------------------------------------------------------------

import { Game } from '../src/game.js';
import { appraiseCity, WAYS } from '../src/modes/stara.js';

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
      out.push({ i, id, ...m, v: appraiseCity(g.m.trialCity(piece, m.x, m.y, m.cells), g.m.arch).total });
    }
  });
  return out;
}

/** Would every piece still to come have somewhere to go after this move? */
function leavesRoom(g, m) {
  const piece = g.m.pieces[m.id];
  g.m.lay(piece, m.x, m.y, m.rot);
  const ok = g.phase === 'over' || [...g.m.hand, ...g.deck].every((id) => g.m.fitsAnywhere(g.m.pieces[id]));
  // Take it back off, quietly (it was a trial), and put the hand as it was.
  undo(g, m.id);
  return ok;
}

/** Take a piece laid as a trial back off, putting pile, hand and score as they were. */
function undo(g, id) {
  const m = g.m;
  if (g.phase === 'over') g.phase = 'place';
  // The trial drew the hand back up from the pile: return what it drew.
  const drawn = m.hand.length - (m.trialHand.length - 1);
  for (let k = 0; k < drawn; k++) g.deck.push(m.hand.pop());
  for (const s of m.squaresOf(id)) g.board.remove(s.x, s.y, { quiet: true });
  g.board.rebuild();
  m.laid.delete(id);
  m.hand = m.trialHand.slice();
  m.sel = m.trialSel;
  m.rescore();
  m.hold();
  g.turn--;
}

/** One day, played `who` way. */
export function play(seed, who) {
  const g = new Game({ mode: MODE, seed });
  const r = mulberry(seed * 7919 + who.length);
  const spreads = [];
  let guard = 0, lifts = 0;
  if (who === 'plan') {
    const at = Object.fromEntries(g.m.level.plan.map((p) => [p.id, p]));
    while (g.phase === 'place' && guard++ < 200) {
      const i = g.m.hand.findIndex((id) => g.m.fitsAt(at[id].x, at[id].y, g.m.pieces[id].cells));
      g.m.select(i);
      g.m.lay(g.m.held, at[g.m.held.id].x, at[g.m.held.id].y, 0);
    }
  }
  while (g.phase === 'place' && guard++ < 300) {
    let all = moves(g);
    if (!all.length) {
      // Careful play lifts its way out of a dead end; the others stop there.
      if (who !== 'careful' || lifts >= 6 || !g.m.laid.size) { g.m.endDay(); break; }
      let best = null;
      for (const id of [...g.m.laid.keys()]) {
        const at = g.m.laid.get(id);
        g.m.lift(id);
        const n = g.m.hand.filter((h) => g.m.fitsAnywhere(g.m.pieces[h])).length;
        g.m.lifts--;
        // Put it back as it was.
        g.m.hand.splice(g.m.hand.indexOf(id), 1);
        g.m.sel = 0;
        g.m.lay(g.m.pieces[id], at.x, at.y, at.rot);
        g.turn--;
        if (!best || n > best.n) best = { id, n };
      }
      lifts++;
      g.m.lift(best.id);
      continue;
    }
    let pick;
    if (who === 'random') {
      pick = all[Math.floor(r() * all.length)];
    } else {
      all.sort((a, b) => b.v - a.v + (r() - 0.5) * 0.01);
      const vals = all.map((m) => m.v).sort((a, b) => a - b);
      if (who === 'greedy') spreads.push(all[0].v - vals[Math.floor(vals.length / 2)]);
      pick = all[0];
      if (who === 'careful') {
        g.m.trialHand = g.m.hand.slice();
        g.m.trialSel = g.m.sel;
        const safe = all.slice(0, 12).find((m) => {
          g.m.select(m.i);
          g.m.trialSel = m.i;
          return leavesRoom(g, m);
        });
        if (safe) pick = safe;
      }
    }
    g.m.select(pick.i);
    g.m.lay(g.m.held, pick.x, pick.y, pick.rot);
  }
  const city = g.m.city;
  return {
    total: g.players[0].score, worth: city.total, par: g.m.par, ways: city.ways, filled: g.board.size,
    full: g.board.size >= SIDE * SIDE, spreads, lifts: g.m.lifts, pieces: Object.keys(g.m.pieces).length,
    running: city.running.size, comuneWet: !!city.per.get('0,0')?.wet,
    bestGates: Math.max(0, ...city.roads.map((w) => w.gates)),
  };
}

if (process.argv[1]?.endsWith('stara-sim.mjs')) {
  const mean = (a) => a.reduce((x, y) => x + y, 0) / (a.length || 1);
  const sd = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((x) => (x - m) ** 2))); };
  const ways = ['random', 'greedy', 'careful', 'plan'];
  const runs = Object.fromEntries(ways.map((w) => [w, []]));
  const t0 = Date.now();
  for (let s = 1; s <= GAMES; s++) for (const w of ways) runs[w].push(play(s, w));
  const tot = (w) => runs[w].map((x) => x.total);
  console.log(`Starà ${SIDE}x${SIDE}, ${GAMES} deals, ${mean(runs.plan.map((x) => x.pieces)).toFixed(1)} pieces a day (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  for (const w of ways) {
    const L = runs[w];
    console.log(`  ${w.padEnd(8)} ${mean(tot(w)).toFixed(1).padStart(6)} (${Math.min(...tot(w))}-${Math.max(...tot(w))})`
      + `  of the plan ${(mean(L.map((x) => x.total / x.par)) * 100).toFixed(0)}%`
      + `  full ${L.filter((x) => x.full).length}/${GAMES}, filled ${mean(L.map((x) => x.filled)).toFixed(1)}`
      + `  lifts ${mean(L.map((x) => x.lifts)).toFixed(1)}  beat the plan ${L.filter((x) => x.total > x.par).length}`);
  }
  const g = tot('greedy'), r = tot('random');
  const sp = runs.greedy.flatMap((x) => x.spreads);
  console.log(`floor ${(mean(r) / mean(g) * 100).toFixed(0)}%, skill gap ${((mean(g) - mean(r)) / sd(r)).toFixed(2)} sd, trivial turns ${(sp.filter((x) => x < 1).length / sp.length * 100).toFixed(0)}%`);
  console.log('by way (random / greedy / careful / plan):');
  for (const w of WAYS) console.log(`  ${w.name.padEnd(12)} ${ways.map((k) => mean(runs[k].map((x) => x.ways[w.id])).toFixed(1).padStart(6)).join(' /')}`);
  const gates = (L) => [0, 1, 2, 3, 4, 5].map((k) => L.filter((x) => Math.min(x.bestGates, 5) === k).length).join('/');
  console.log(`best high road, gates 0..5: ${ways.map((k) => `${k} ${gates(runs[k])}`).join(', ')}`);
  console.log(`the Comune's fountain: ${ways.map((k) => `${k} ${runs[k].filter((x) => x.comuneWet).length}`).join(', ')}`);
}
