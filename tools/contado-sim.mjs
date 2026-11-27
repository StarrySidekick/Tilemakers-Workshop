// ---------------------------------------------------------------------------
// Contado measured: Starà's long form (2026-11-27), a city on a land of
// levels, year after year, until a commission is missed.
//
// Plays the real mode through Game with the GREEDY player (every piece in
// hand at every way it fits, keeping whichever leaves the city worth most
// now; no look ahead), which never reads the year's commission. Two
// measures:
//
//   RUNS    how many years a run lasts, and which commission ends it;
//   GROWTH  with every commission waved through, what the city has at the
//           end of each year, by the measure each commission asks for. The
//           commissions' targets (contado.js, COMMISSIONS) were set from
//           this: each a little under the greedy average.
//
// A person who plans for the year's ask should beat both, so read these as
// floors.
//
//   node tools/contado-sim.mjs              30 runs, capped at 14 years
//   RUNS=60 CAP=20 node tools/contado-sim.mjs
//   GROWTH=1 YEARS=8 node tools/contado-sim.mjs
// ---------------------------------------------------------------------------

import { Game } from '../src/game.js';
import { COMMISSIONS } from '../src/modes/contado.js';

const RUNS = Number(process.env.RUNS || 30);
const CAP = Number(process.env.CAP || 14);
const YEARS = Number(process.env.YEARS || 8);

if (process.env.GROWTH) {
  const rows = {};
  for (let seed = 1; seed <= RUNS; seed++) {
    const g = new Game({ mode: 'contado', seed, players: 1 });
    const m = g.m;
    const real = m.progress.bind(m);
    m.progress = () => ({ ...real(), met: true });
    const close = m.closeYear.bind(m);
    m.closeYear = () => {
      (rows[m.year] ||= []).push(Object.fromEntries(Object.entries(COMMISSIONS).map(([k, C]) => [k, C.of(m.city)])));
      return m.year >= YEARS ? false : close();
    };
    for (let n = 0; n < 600 && g.phase !== 'over'; n++) m.botAction();
  }
  console.log(`What a greedy city has at the end of each year (${RUNS} runs, every commission waved through): mean (least)`);
  for (const [y, list] of Object.entries(rows)) {
    const mean = (k) => (list.reduce((a, r) => a + r[k], 0) / list.length).toFixed(1);
    const least = (k) => Math.min(...list.map((r) => r[k]));
    console.log(`  year ${y}: ${Object.keys(COMMISSIONS).map((k) => `${k} ${mean(k)} (${least(k)})`).join(' · ')}`);
  }
} else {
  const years = [], ends = {}, scores = [];
  for (let seed = 1; seed <= RUNS; seed++) {
    const g = new Game({ mode: 'contado', seed, players: 1 });
    for (let n = 0; n < 1000 && g.phase !== 'over' && g.m.year <= CAP; n++) g.m.botAction();
    years.push(g.m.year);
    scores.push(g.players[0].score);
    const why = g.m.missed ? g.m.missed.ask : `past year ${CAP}`;
    ends[why] = (ends[why] || 0) + 1;
  }
  years.sort((a, b) => a - b);
  console.log(`${RUNS} greedy runs: years ${years.join(' ')}`);
  console.log(`  median ${years[Math.floor(years.length / 2)]} years · mean score ${(scores.reduce((a, b) => a + b, 0) / RUNS).toFixed(1)}`);
  console.log(`  ended by: ${Object.entries(ends).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(', ')}`);
}
