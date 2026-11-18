// ---------------------------------------------------------------------------
// Starà — the daily square.
//
// Timothy, 2026-11-18: "new mode, going to be daily, and based around the idea
// of fitting tiles into the area of your phone screen ... a square area of say
// 7x7 tiles. you have to get the best score possible within that shape. so
// regular carcassone rules but there's this border."
//
// So: the base game as printed, solo, with its seven followers and its farms,
// on a 7 x 7 square that fits a phone held upright. Everybody gets the same
// shuffle on the same day (by the calendar where you are, so it turns over at
// your midnight), and the deck is the whole base deck, which is more tiles
// than the square has room for: the game ends when the square is full, or
// when nothing left in the deck fits it. A tile that fits nowhere is set
// aside, as in Carcassonne.
//
// The same day: "the perimeter of the square should be top down castle walls.
// they also end features for the sake of scoring and finishing." So the
// square is `walled` (board.js): a road that runs into the wall ends there, a
// city that runs into it is closed by it, and a cloister counts the wall
// round it as tiles (that last one Claude's call: the wall surrounds it).
//
// It is `pure`: whatever rules the workshop has bolted on for the other modes
// are left off here, because a daily puzzle has to be the same puzzle for
// everyone who opens it.
//
// The mode keeps a tally of where the points came from, so the end card can
// say it. The look and the one-tile-at-a-time interface are in
// src/stara-ui.js; this file is only the rules.
// ---------------------------------------------------------------------------

import { Mode } from './mode.js';
import { buildDeck } from '../tiles.js';

export const STARA_RADIUS = 3;                       // 7 x 7
export const STARA_SIDE = STARA_RADIUS * 2 + 1;
export const STARA_SQUARES = STARA_SIDE * STARA_SIDE;

/** The first day there was a Starà, so day numbers start at 1. */
const FIRST_DAY = Date.UTC(2026, 10, 18);

/**
 * Today, by the calendar where you are: its number, its date, and the seed
 * the deal comes from. Taken from the LOCAL date on purpose, so the puzzle
 * turns over at your midnight rather than at Greenwich's.
 */
export function staraDay(now = new Date()) {
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  const n = Math.round((Date.UTC(y, m, d) - FIRST_DAY) / 86400000) + 1;
  const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  // FNV-1a over a string of its own, so Starà and Tesserae never share a deal.
  const key = `stara:${iso}`;
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
  return { n, iso, seed: h >>> 0 };
}

/** Which kind of points a feature pays. */
const KIND = { city: 'cities', road: 'roads', monastery: 'cloisters' };

export class Stara extends Mode {
  deck() { return buildDeck(['base'], this.game.rng, 'D'); }

  setup() {
    this.day = staraDay();
    // Where the points came from: closed on the way, unfinished at the end,
    // and the farms. Read by the end card.
    this.tally = { cities: 0, roads: 0, cloisters: 0, farms: 0, unfinished: 0 };
    this.setAside = 0;
  }

  // The farms are scored here rather than by the host, so their points land
  // in the tally like everything else.
  finalFarms = false;

  afterPlace() { return 'meeple'; }

  /** The square is full: nothing more can go down, so the day is done. */
  anythingLeft() {
    return this.game.deck.length > 0 && this.game.board.size < STARA_SQUARES;
  }

  onClosed(d, closer) { this.pay(d, false, closer, KIND[d.type] || 'cities'); }

  finish() {
    const g = this.game;
    for (const d of g.board.allComponents()) {
      if (d.scored || d.meeples.length === 0 || d.type === 'field') continue;
      this.pay(d, true, null, 'unfinished');
    }
    if (g.has('fields')) {
      const before = g.players[0].score;
      g.scoreFarms();
      this.tally.farms += g.players[0].score - before;
    }
    const s = g.players[0].score;
    const filled = g.board.size;
    g.say(`Starà No. ${this.day.n}: ${s} points, ${filled} of ${STARA_SQUARES} squares filled.`);
  }

  /** Award through the host, and book what it paid under `kind`. */
  pay(d, final, closer, kind) {
    const p = this.game.players[0];
    const before = p.score;
    this.game.award(d, final, closer);
    this.tally[kind] += p.score - before;
  }

  status() {
    return `No. ${this.day.n} · ${this.game.board.size}/${STARA_SQUARES} squares`;
  }

  panel() {
    const g = this.game, p = g.players[0];
    return `
      <div class="advTop"><span>Starà No. ${this.day.n}</span><span>Score <b>${p.score}</b></span></div>
      <div class="advTop"><span>${g.board.size}/${STARA_SQUARES} squares</span><span>${p.meeples} followers in hand</span></div>
      <p class="hint">Today's square: the base game, solo, ${STARA_SIDE}×${STARA_SIDE} and walled round: the wall ends roads and closes cities. Same deal for everyone today.</p>`;
  }
}

Stara.spec = {
  id: 'stara',
  name: 'Starà (daily)',
  Mode: Stara,
  groups: ['base'],
  meeples: true,
  solo: true,
  pure: true,
  market: false,
  // The interface: one tile at a time on a wooden table (src/stara-ui.js).
  table: true,
  seedFor: () => staraDay().seed,
  playerName: () => 'You',
  bounds: { minX: -STARA_RADIUS, maxX: STARA_RADIUS, minY: -STARA_RADIUS, maxY: STARA_RADIUS },
  // Castle walls round the square (2026-11-18): they end every road and city
  // that runs into them, and stand round a cloister like tiles (board.js).
  walled: true,
  // Medieval (2026-11-18: "make all the ui and everything medival themes and
  // cool"): tiles drawn in the chart's inks with a hand-drawn line, and the
  // workshop's panel, when the menu brings it back, on parchment.
  inked: true,
  antique: true,
  opening: "Today's square. Fill it as well as you can.",
  hint: 'Daily and solo: the base game with followers and farms, on a 7×7 square walled round. The wall ends roads and closes cities. Ends when the square is full or nothing fits.',
};
