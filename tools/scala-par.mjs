// ---------------------------------------------------------------------------
// Scala's par, measured.
//
//   node tools/scala-par.mjs            100 shuffles, the Sharp bot
//   node tools/scala-par.mjs 200 steady
//
// Plays the ladder and the fill on the same shuffles and prints what the bot
// managed: how often it finished the ladder, and the tiles and the square
// when it did. `PAR` in src/modes/scala.js is the Sharp medians from here,
// so a change to the rules or the deck is a reason to run this again.
// ---------------------------------------------------------------------------

import { Game } from '../src/game.js';
import { Bot } from '../src/ai.js';
import { footprint, PAR } from '../src/modes/scala.js';

const games = Number(process.argv[2]) || 100;
const level = process.argv[3] || 'sharp';

const median = (l) => { const s = [...l].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : '-'; };
const spread = (l) => Object.entries(l.reduce((m, v) => ((m[v] = (m[v] || 0) + 1), m), {}))
  .map(([k, n]) => `${k}:${n}`).join(' ');

function play(seed, options) {
  const game = new Game({ mode: 'scala', seed, options });
  const bot = new Bot(game, 0, { level, seed });
  for (let steps = 0; game.phase !== 'over' && steps < 2000; steps++) bot.act();
  const sq = footprint(game.board);
  return { done: game.m.done, rungs: game.m.rungs, tiles: game.board.cells.size, side: sq.side };
}

const ladder = [], fill = [];
for (let seed = 1; seed <= games; seed++) {
  ladder.push(play(seed, {}));
  fill.push(play(seed, { scalaFill: true }));
}

const done = ladder.filter((r) => r.done);
console.log(`Scala, ${games} shuffles, the ${level} bot`);
console.log(`ladder  finished ${done.length}/${games}; rungs climbed ${spread(ladder.map((r) => r.rungs))}`);
console.log(`        finished: tiles median ${median(done.map((r) => r.tiles))} (best ${Math.min(...done.map((r) => r.tiles))}), `
  + `square median ${median(done.map((r) => r.side))} (${spread(done.map((r) => r.side))})`);
console.log(`fill    square median ${median(fill.map((r) => r.side))} (${spread(fill.map((r) => r.side))})`);
console.log(`par now ladder ${PAR.ladder.side}x${PAR.ladder.side} in ${PAR.ladder.tiles} tiles, fill ${PAR.fill.side}x${PAR.fill.side}`);
