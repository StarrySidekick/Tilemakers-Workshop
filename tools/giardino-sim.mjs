// ---------------------------------------------------------------------------
// Giardino measured (2026-11-22): what the daily garden pays, and where from.
//
// Plays the real mode through Game, on 100 deals, three ways:
//   RANDOM  a random tile from the hand at a random legal spot;
//   BOT     src/ai.js, with Giardino's advice (botPlaceBonus, botAction);
//   GREEDY  every tile in hand at every legal spot, keeping whichever has the
//           best company and water now (no look ahead at the weeks).
// None of them plans the season, so read their numbers as a floor on what a
// player who times the planting can reach.
//
//   node tools/giardino-sim.mjs           100 deals each
//   GAMES=20 node tools/giardino-sim.mjs
// ---------------------------------------------------------------------------

import { Game } from '../src/game.js';
import { Bot } from '../src/ai.js';
import { TILES } from '../src/tiles.js';
import { PLANTS, PLANT_IDS } from '../src/modes/giardino.js';

const GAMES = Number(process.env.GAMES || 100);

function mulberry(a) {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One of the hand at one legal spot, by `choose(options)`. */
function playBy(g, choose) {
  const opts = [];
  g.m.hand.forEach((id, i) => {
    for (const s of g.board.legalPlacements(TILES[id], g.placeOpts())) opts.push({ i, ...s });
  });
  const o = choose(opts);
  g.m.select(o.i);
  g.rot = o.rot;
  g.placeAt(o.x, o.y);
}

function run(seed, how) {
  const g = new Game({ mode: 'giardino', seed });
  const rng = mulberry(seed * 31 + 7);
  const bot = how === 'bot' ? new Bot(g, 0, { level: 'steady', seed }) : null;
  let guard = 0;
  while (g.phase !== 'over' && guard++ < 500) {
    if (bot) { bot.act(); continue; }
    if (how === 'random') playBy(g, (o) => o[Math.floor(rng() * o.length)]);
    else {
      playBy(g, (opts) => {
        let best = null;
        for (const o of opts) {
          const type = TILES[g.m.hand[o.i]];
          const cell = g.board.place(o.x, o.y, type, o.rot, { owner: 0 });
          const v = g.m.botPlaceBonus([cell]) + rng() * 0.01;
          g.board.remove(o.x, o.y, { quiet: true });
          g.board.rebuild();
          if (!best || v > best.v) best = { ...o, v };
        }
        return best;
      });
    }
  }
  const m = g.m;
  const ripened = Object.fromEntries(PLANT_IDS.map((k) => [k, [0, 0]]));
  for (const b of m.beds.values()) { ripened[b.kind][1]++; if (b.picks) ripened[b.kind][0]++; }
  return {
    score: g.players[0].score, beds: g.board.size, full: g.board.size === m.squares,
    weeks: m.week, picked: m.picked, lost: m.lost.length, tally: { ...m.tally }, ripened,
  };
}

const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
for (const how of ['random', 'greedy', 'bot']) {
  const rs = [];
  for (let s = 1; s <= GAMES; s++) rs.push(run(s, how));
  const sc = rs.map((r) => r.score);
  const t = (k) => mean(rs.map((r) => r.tally[k])).toFixed(1);
  console.log(`${how.padEnd(7)} mean ${mean(sc).toFixed(1)}  range ${Math.min(...sc)}–${Math.max(...sc)}  beds ${mean(rs.map((r) => r.beds)).toFixed(1)}/49  full ${rs.filter((r) => r.full).length}`
    + `  pickings ${mean(rs.map((r) => r.picked)).toFixed(1)}  lost ${mean(rs.map((r) => r.lost)).toFixed(1)}`
    + `  | harvest ${t('harvest')} friends ${t('friends')} foes ${t('foes')}`);
  const share = PLANT_IDS.map((k) => {
    const [a, n] = rs.reduce(([a, n], r) => [a + r.ripened[k][0], n + r.ripened[k][1]], [0, 0]);
    return `${PLANTS[k].name.toLowerCase()} ${n ? Math.round((100 * a) / n) : 0}%`;
  });
  console.log(`        ripened: ${share.join(', ')}`);
}
