// ---------------------------------------------------------------------------
// Contado: Starà's long form. One city, on a land with hills, over years.
//
// Timothy, 2026-11-27: "I also want to kind of start creating the idea that
// there's a long form version of this mode and a short form, and that we can
// kind of want to design them to be related to each other, but also like
// not necessarily the same. Like one is the daily mode and one is a longer
// form mode that might become like an actual video game." And, in the same
// breath, the model view (src/lowpoly.js), "so you can kind of see some
// elevation change as you build ... I think it would also engage with the
// kind of the gameplay style a little better."
//
// The CONTADO was the land a city-state ruled outside its walls: its farms,
// its hills, its springs. The daily is a city in a day; this is a city and
// its land over a lifetime. docs/STARA-FORMS.md has the two side by side and
// what is meant to stay shared.
//
// SHARED WITH THE DAILY (stara.js, stara-city.js, one scorer for both): the
// pieces and places, the ways a city is paid (houses, and +1 each for a
// plaza, water and the cathedral beside them), streets meeting streets, the
// wall that hugs the city at a point a stretch and a gate two, the high
// road, the aqueduct over everything, three in hand, hold to seal, lift for
// a point, and the whole screen.
//
// THE LONG FORM'S OWN, each a call of Claude's, named to him when it shipped
// (MODES.md, section 16, has the why of each):
//
//   A RUN, NOT A DAY. A new land and a new seed every run, kept in the
//     browser after every move, so a run is left and picked up again (it is
//     replayed from its seed and its moves: the deal is deterministic).
//
//   THE LAND HAS LEVELS. Every square is a level from 0 to 4: a hill on one
//     side of the Comune, a knoll on another, ripples between. Two rules
//     come from it, both how hill towns actually were:
//       - THE SLOPE IS A WALL. A stretch of wall facing LOWER ground costs
//         nothing (a gate there still costs its 1): a town on a brow is half
//         walled by the hill. So Siena, Orvieto, San Gimignano.
//       - WATER DOES NOT CLIMB. The spring is up the hill, and the aqueduct's
//         channel holds the spring's level, standing on taller arches over
//         lower ground; it cannot carry water over ground higher than the
//         spring. A town on the hilltop is cheap to wall and dry; one below
//         the spring is wet and costs more wall. Hill towns lived with
//         exactly that (Orvieto dug its well 54 m through the rock).
//
//   YEARS AND COMMISSIONS: the other half of the old Carcassonne app's
//     Solitaire (MODES.md, section 14, the seventh pass, Open). Each year
//     deals a handful of pieces and the Signoria sets a COMMISSION (so many
//     houses, so many beside a plaza, so many watered, in the cathedral's
//     parish, a high road out on so many sides, a city worth so much). When
//     the year's pieces are down, the city as it stands is measured: meet
//     it and it pays, and the next year comes, with each kind asked for more
//     each time it comes round; miss it and the run is over.
//
// Nothing here is final. It is the first pass of a long form, built so
// there is something to play and react to.
// ---------------------------------------------------------------------------

import { Stara, turnPiece } from './stara.js';
import { RULES, tileFor, SHAPES, maskOf } from './stara-city.js';
import { rngOf } from './stara-plan.js';
import { SIDE_STEP, opposite } from '../tiles.js';

/** What a commission met pays, on top of the city it asked for. */
export const COMMISSION_PAY = 5;

/** How many pieces a year deals: six, and one more every third year, up to nine. */
export const piecesFor = (year) => Math.min(9, 6 + Math.floor((year - 1) / 3));

/**
 * THE COMMISSIONS: what the Signoria can ask for, each measured off the
 * city as the shared scorer appraises it (so a commission can never
 * disagree with the score), and what it asks for in year `y`.
 *
 * The schedule (`target`) was set a little under what a greedy player's
 * city had at the end of each year, with every commission waved through
 * (tools/contado-sim.mjs, GROWTH=1). Moving the spring nearer and leaning
 * each year's deal toward its ask then made cities grow faster than that:
 * now about 14 squares of houses a year, 5 beside a plaza, 4 watered (2 on
 * the driest land) and 17 of worth. So for most cities what binds is the
 * other half of the rule, that the Signoria never asks for what the city
 * already has: the four that keep growing (`grow`) ask at least that much
 * more than the city has when the year begins (8 houses, 4 by a plaza, 2
 * watered, 10 of worth), and the plaza, slowest to grow, ends most runs.
 * The cathedral's parish (at most 8 houses round the one cathedral, fewer
 * if it was laid at the edge) rises only every other year and stops at 8;
 * the high road stops at 4 sides; those two are asked only while short.
 */
export const COMMISSIONS = {
  houses: { short: 'houses', text: (n) => `${n} squares of houses`, target: (y) => 10 * y - 5 + Math.floor((y - 1) ** 2 / 4), grow: 8, of: (c) => c.ways.houses / RULES.house },
  plaza: { short: 'by a plaza', text: (n) => `${n} houses beside a plaza`, target: (y) => 5 * y - 3 + Math.floor((y - 1) ** 2 / 6), grow: 4, of: (c) => c.ways.plaza / RULES.plaza },
  water: { short: 'watered', text: (n) => `${n} houses watered`, target: (y) => Math.round(2.2 * y - 2.4), grow: 2, of: (c) => c.ways.water / RULES.water },
  cathedral: { short: 'in the parish', text: (n) => `${n} houses in the cathedral's parish`, target: (y) => Math.min(8, 2 + Math.ceil(y / 2)), of: (c) => c.ways.cathedral / RULES.cathedral },
  road: { short: 'road sides', text: (n) => `a high road out on ${n} sides`, target: (y) => Math.min(4, y), of: (c) => c.roads[0]?.sides || 0 },
  worth: { short: 'worth', text: (n) => `a city worth ${n}`, target: (y) => 14 * y - 8, grow: 10, of: (c) => c.total },
};

// --- the land ----------------------------------------------------------------

/** The highest level of the land. */
export const TOP_LEVEL = 4;

/**
 * THE LAND for a run: a level (0 to TOP_LEVEL) for every square of the
 * table, worked out on demand and kept, and the spring. A hill stands three
 * and a half squares from the Comune in a direction of the seed's, a knoll
 * about six squares off on another side, and gentle ripples run between.
 * The spring rises on the hill's shoulder, two or three squares from the
 * Comune, a level below the hill's top where it can (so the very top is
 * dry).
 */
export function makeLand(seed) {
  const r = rngOf((seed ^ 0xC0A7AD0) >>> 0);
  const a = r() * Math.PI * 2;
  const hill = { x: 0.5 + Math.cos(a) * 3.6, y: 0.5 + Math.sin(a) * 3.6, h: 4.4, s: 2.7 };
  const b = a + Math.PI * (0.65 + r() * 0.7);
  const knoll = { x: 0.5 + Math.cos(b) * 6.2, y: 0.5 + Math.sin(b) * 6.2, h: 2.3, s: 1.9 };
  const ph = [r() * 6.283, r() * 6.283, r() * 6.283];
  const bump = (q, cx, cy) => q.h * Math.exp(-((cx - q.x) ** 2 + (cy - q.y) ** 2) / (2 * q.s * q.s));
  const raw = (x, y) => {
    const cx = x + 0.5, cy = y + 0.5;
    const ripple = 0.35 * Math.sin(cx * 0.55 + ph[0]) * Math.sin(cy * 0.47 + ph[1]) + 0.22 * Math.sin((cx + cy) * 0.3 + ph[2]);
    return 0.55 + bump(hill, cx, cy) + bump(knoll, cx, cy) + ripple;
  };
  const cache = new Map();
  const level = (x, y) => {
    const k = `${x},${y}`;
    let v = cache.get(k);
    if (v == null) { v = Math.max(0, Math.min(TOP_LEVEL, Math.round(raw(x, y)))); cache.set(k, v); }
    return v;
  };
  // The spring: on the hill's shoulder, two or three squares from the
  // Comune (as the daily's is two squares past its plan), on the hill's
  // side of it, as high as it can be while still a level under the top.
  const hx = Math.floor(hill.x), hy = Math.floor(hill.y);
  let top = 0;
  for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) top = Math.max(top, level(hx + dx, hy + dy));
  let spring = null, best = -Infinity;
  for (let x = -3; x <= 3; x++) {
    for (let y = -3; y <= 3; y++) {
      if (Math.max(Math.abs(x), Math.abs(y)) < 2) continue;
      const toward = (x + 0.5) * Math.cos(a) + (y + 0.5) * Math.sin(a);
      if (toward <= 0.5) continue;
      const l = level(x, y);
      const score = (l < top ? l * 10 : (top - 1) * 10 - 5) + toward;
      if (score > best) { best = score; spring = { x, y }; }
    }
  }
  return { level, spring, springLevel: level(spring.x, spring.y), hill, knoll };
}

// --- the year's pieces -----------------------------------------------------------

/** Every shape of one to four squares, as Tetris has them (and the smaller), each `[dx, dy]`. */
const SHAPES_BY_SIZE = {
  1: [[[0, 0]]],
  2: [[[0, 0], [1, 0]]],
  3: [[[0, 0], [1, 0], [2, 0]], [[0, 0], [1, 0], [0, 1]]],
  4: [[[0, 0], [1, 0], [2, 0], [3, 0]], [[0, 0], [1, 0], [2, 0], [0, 1]], [[0, 0], [1, 0], [2, 0], [1, 1]],
    [[0, 0], [1, 0], [1, 1], [2, 1]], [[0, 0], [1, 0], [0, 1], [1, 1]]],
};
/** An aqueduct's run is a line, or a line with one bend in it: one to three spans. */
const RUNS = [[[0, 0]], [[0, 0], [1, 0]], [[0, 0], [1, 0], [2, 0]], [[0, 0], [1, 0], [1, 1]]];

const pickW = (r, table) => {
  const total = table.reduce((a, [, w]) => a + w, 0);
  let x = r() * total;
  for (const [v, w] of table) { x -= w; if (x < 0) return v; }
  return table[table.length - 1][0];
};

/** Which side of square a its neighbour b is on. */
const sideTo = (a, b) => SIDE_STEP.findIndex(([dx, dy]) => a[0] + dx === b[0] && a[1] + dy === b[1]);

/**
 * One piece of a place: a shape of `size` squares, streets across its own
 * seams and out of its sides by chance (plazas want many, the cathedral
 * few), each square the place's tile for its streets.
 */
function placePiece(r, id, kind, size, streety = 0.3) {
  const shape = SHAPES_BY_SIZE[size][Math.floor(r() * SHAPES_BY_SIZE[size].length)];
  const masks = shape.map(() => 0);
  const at = new Map(shape.map((c, i) => [`${c[0]},${c[1]}`, i]));
  shape.forEach((c, i) => {
    for (let s = 0; s < 4; s++) {
      const j = at.get(`${c[0] + SIDE_STEP[s][0]},${c[1] + SIDE_STEP[s][1]}`);
      if (j != null) {
        // A seam inside the piece: a street runs across it (both sides) or not at all.
        if (j > i && r() < 0.5) { masks[i] |= 1 << s; masks[j] |= 1 << opposite(s); }
        continue;
      }
      const p = kind === 'plaza' ? 0.8 : kind === 'cathedral' ? 0.25 : streety;
      if (r() < p) masks[i] |= 1 << s;
    }
  });
  // A plaza is where streets meet: three of its sides at least.
  if (kind === 'plaza') while ([0, 1, 2, 3].filter((s) => masks[0] & (1 << s)).length < 3) masks[0] |= 1 << Math.floor(r() * 4);
  const cells = shape.map((c, i) => ({ dx: c[0], dy: c[1], ...tileFor(kind, masks[i]) }));
  return { id, kind, cells };
}

/** A run of aqueduct: each span opens toward the next, and the two ends run straight on out. */
function aqueductPiece(r, id, size) {
  const runs = RUNS.filter((q) => q.length === size);
  const run = runs[Math.floor(r() * runs.length)];
  const cells = run.map((c, i) => {
    const sides = [];
    if (i > 0) sides.push(sideTo(c, run[i - 1]));
    if (i < run.length - 1) sides.push(sideTo(c, run[i + 1]));
    if (sides.length < 2) sides.push(sides.length ? opposite(sides[0]) : 0, ...(sides.length ? [] : [2]));
    const f = tileFor('aqueduct', 0, maskOf(sides.slice(0, 2)));
    return { dx: c[0], dy: c[1], type: f.type, rot: f.rot };
  });
  return { id, kind: 'aqueduct', cells };
}

/**
 * A YEAR'S DEAL: `n` pieces, mostly houses, some plazas and aqueduct, the
 * one cathedral once in the run's first years; leaning toward what the
 * year's commission asks for, so a commission is always something the
 * year's pieces can do.
 */
export function dealYear(r, year, n, ask, state, target = 0) {
  const out = [];
  const add = (p) => out.push(p);
  const id = () => `y${year}p${out.length}`;
  const want = [];
  if (ask === 'water') want.push('aqueduct', 'aqueduct');
  if (ask === 'plaza') want.push('plaza');
  if (ask === 'cathedral' && !state.cathedral) want.push('cathedral');
  if (!state.cathedral && year >= 2 && !want.includes('cathedral')) want.push('cathedral');
  for (const kind of want.slice(0, n)) {
    if (kind === 'cathedral') state.cathedral = true;
    add(kind === 'aqueduct' ? aqueductPiece(r, id(), pickW(r, [[2, 2], [3, 2]]))
      : placePiece(r, id(), kind, 1));
  }
  const streety = ask === 'road' ? 0.5 : 0.3;
  const houses = ask === 'houses' ? [['house', 88], ['plaza', 8], ['aqueduct', 4]] : [['house', 70], ['plaza', 12], ['aqueduct', 14]];
  while (out.length < n) {
    const kind = pickW(r, houses);
    if (kind === 'aqueduct') add(aqueductPiece(r, id(), pickW(r, [[1, 1], [2, 2], [3, 2]])));
    else if (kind === 'plaza') add(placePiece(r, id(), 'plaza', 1));
    else add(placePiece(r, id(), 'house', pickW(r, [[1, 2], [2, 3], [3, 3], [4, 2]]), streety));
  }
  // A year that asks for houses deals enough of them to do it, with a little over.
  if (ask === 'houses') {
    const squares = () => out.filter((p) => p.kind === 'house').reduce((a, p) => a + p.cells.length, 0);
    for (let i = 0; squares() < target + 3 && i < 3; i++) add(placePiece(r, id(), 'house', 3, streety));
  }
  // Shuffled, so what the commission needs does not always come first.
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

// --- keeping a run ------------------------------------------------------------------

const RUN_KEY = 'tilemakers-workshop/contado/run';
/** localStorage that never throws, and is not there at all under Node. */
const store = {
  get() { try { return JSON.parse(globalThis.localStorage?.getItem(RUN_KEY) || 'null'); } catch { return null; } },
  set(v) { try { globalThis.localStorage?.setItem(RUN_KEY, JSON.stringify(v)); } catch { /* forgotten */ } },
};

/**
 * The seed a new Contado game is played with: the run left unfinished in
 * this browser, if there is one, so it is picked up where it was left;
 * otherwise a new one, kept at once.
 */
function seedForRun() {
  const run = store.get();
  if (run && !run.over && Number.isFinite(run.seed)) return run.seed;
  const seed = Math.floor(Math.random() * 2 ** 32) >>> 0;
  store.set({ seed, log: [], over: false });
  return seed;
}

// --- the mode ------------------------------------------------------------------------

export class Contado extends Stara {
  /** The land's level at a square (0 to TOP_LEVEL). */
  levelAt(x, y) { return this.land.level(x, y); }

  /** The aqueduct's channel over a square: the spring's level, or the ground where that is higher (a dry span). */
  deckAt(x, y) { return Math.max(this.land.springLevel, this.levelAt(x, y)); }

  /** No plan: the first year is dealt once the water and the land are set up. */
  deck() {
    const g = this.game;
    this.land = makeLand(g.seed >>> 0);
    this.spring = this.land.spring;
    this.level = { par: 0, plan: [], pieces: {}, order: [] };
    this.pieces = {};
    this.rng = rngOf(((g.seed >>> 0) ^ 0x5EED1E5) >>> 0);
    return [];
  }

  setup() {
    super.setup();
    this.water.land = { level: (x, y) => this.levelAt(x, y), spring: this.land.springLevel };
    this.year = 0;
    this.bonus = 0;
    this.met = [];          // each year: {year, ask, target, had, met}
    this.asked = {};        // how many times each kind has been asked
    this.dealtState = { cathedral: false };
    this.over = false;
    this.missed = null;
    const run = store.get();
    this.runLog = run && run.seed === (this.game.seed >>> 0) && !run.over ? run.log.slice() : [];
    this.pendingReplay = this.runLog.length ? this.runLog.slice() : null;
    this.newYear();
    this.rescore();
  }

  /** Everything the screen keys its redraws on. */
  signature() { return `${super.signature()}/${this.year}`; }

  rescore() {
    super.rescore();
    this.game.players[0].score += this.bonus || 0;
    this.tally.commissions = this.bonus || 0;
  }

  // --- years and commissions ----------------------------------------------------

  /**
   * What the Signoria asks for this year: houses the first year, then any
   * kind by the seed, never the same twice running, never the cathedral's
   * parish before there is a cathedral to have one, and never what the
   * city already has.
   */
  nextAsk() {
    if (this.year === 1) return 'houses';
    const last = this.commission?.ask;
    const open = Object.keys(COMMISSIONS).filter((k) => {
      if (k === last) return false;
      if (k === 'cathedral' && !this.dealtState.cathedral) return false;
      return COMMISSIONS[k].of(this.city) < this.targetFor(k);
    });
    return open[Math.floor(this.rng() * open.length)];
  }

  /** What a kind asks for this year: the schedule, or, for a city ahead of it, that much more than it has. */
  targetFor(kind) {
    const C = COMMISSIONS[kind];
    return C.grow ? Math.max(C.target(this.year), Math.floor(C.of(this.city)) + C.grow) : C.target(this.year);
  }

  /** A new year: its commission and its pieces, onto the pile. */
  newYear() {
    this.year++;
    const ask = this.nextAsk();
    const target = this.targetFor(ask);
    this.asked[ask] = (this.asked[ask] || 0) + 1;
    this.commission = { ask, target };
    const pieces = dealYear(this.rng, this.year, piecesFor(this.year), ask, this.dealtState, target);
    for (const p of pieces) this.pieces[p.id] = p;
    // The pile is dealt from the end.
    this.game.deck.push(...pieces.map((p) => p.id).reverse());
    this.day = { n: this.year, iso: 'run' };
    this.game.say(`Year ${this.year}: the Signoria asks for ${COMMISSIONS[ask].text(target)}. ${pieces.length} pieces.`);
  }

  /** How the city stands against this year's commission. */
  progress() {
    const c = this.commission;
    if (!c) return null;
    const had = Math.floor(COMMISSIONS[c.ask].of(this.city));
    return { ...c, had, met: had >= c.target };
  }

  /** The line under the title: the year, and how the commission stands. */
  headline() {
    const p = this.progress();
    return p ? `Year ${this.year} · ${COMMISSIONS[p.ask].short} ${p.had} of ${p.target}` : `Year ${this.year}`;
  }

  /**
   * The year is done (its pieces are down, or it was ended): measure the
   * city against the commission. Met, it pays and the next year is dealt;
   * missed, the run is over. Returns whether the run goes on.
   */
  closeYear() {
    const p = this.progress();
    this.met.push({ year: this.year, ...p });
    if (!p.met) {
      this.missed = p;
      this.game.say(`The Signoria asked for ${COMMISSIONS[p.ask].text(p.target)} and the city has ${p.had}. The run ends in year ${this.year}.`);
      return false;
    }
    this.bonus += COMMISSION_PAY;
    this.game.emit?.('score', { points: COMMISSION_PAY, players: [0], at: { x: 0.5, y: 0.5 } });
    this.game.say(`Year ${this.year}'s commission is met: +${COMMISSION_PAY}.`);
    this.newYear();
    this.rescore();
    return true;
  }

  /** Fill the hand; when the year's pieces are all down, close the year. */
  drawNext() {
    const g = this.game;
    const fill = () => { while (this.hand.length < this.handSize && g.deck.length) this.hand.push(g.deck.pop()); };
    fill();
    if (!this.hand.length) {
      if (!this.closeYear()) { this.over = true; return g.finish(); }
      fill();
    }
    this.sel = Math.max(0, Math.min(this.sel, this.hand.length - 1));
    this.hold();
    if (this.pendingReplay && !this.replaying) this.replay();
  }

  /** The run goes on until a commission is missed. */
  anythingLeft() { return !this.over; }

  /** Nothing in hand fits, or the year is given up: what is left of it is set aside, and the year closes as the city stands. */
  endDay() {
    const g = this.game;
    if (g.phase !== 'place') return false;
    this.note(['end']);
    g.say(`Year ${this.year} is closed with ${this.hand.length + g.deck.length} pieces left unlaid.`);
    this.hand = [];
    g.deck.length = 0;
    this.drawNext();
    return true;
  }

  // --- keeping the run ------------------------------------------------------------

  lay(piece, ax, ay, rot) {
    const ok = super.lay(piece, ax, ay, rot);
    if (ok) this.note(['lay', piece.id, ax, ay, rot]);
    return ok;
  }

  lift(id) {
    const ok = super.lift(id);
    if (ok) this.note(['lift', id]);
    return ok;
  }

  /** Write a move down, so the run can be picked up again. Not while it is being replayed. */
  note(move) {
    if (this.replaying) return;
    this.runLog.push(move);
    store.set({ seed: this.game.seed >>> 0, log: this.runLog, over: false });
  }

  /** Play a kept run's moves again, as they were made, through the same functions. */
  replay() {
    const moves = this.pendingReplay;
    this.pendingReplay = null;
    this.replaying = true;
    try {
      for (const m of moves) {
        if (this.game.phase !== 'place') break;
        if (m[0] === 'lay') {
          const i = this.hand.indexOf(m[1]);
          if (i < 0) break;
          if (i !== this.sel) this.select(i);
          if (!this.lay(this.pieces[m[1]], m[2], m[3], m[4])) break;
        } else if (m[0] === 'lift') {
          if (!this.lift(m[1])) break;
        } else if (m[0] === 'end') this.endDay();
      }
    } finally { this.replaying = false; }
  }

  finish() {
    const g = this.game;
    const met = this.met.filter((y) => y.met).length;
    g.say(`Contado: the city is worth ${this.city.total} after ${this.year} year${this.year === 1 ? '' : 's'}, ${met} commission${met === 1 ? '' : 's'} met (+${this.bonus}).`);
    store.set({ seed: g.seed >>> 0, log: this.runLog, over: true });
  }

  status() { return `Year ${this.year} · ${this.laid.size} pieces laid`; }

  panel() {
    const g = this.game, p = g.players[0], c = this.progress();
    return `
      <div class="advTop"><span>Contado, year ${this.year}</span><span>Worth <b>${p.score}</b></span></div>
      <div class="advTop"><span>${c ? COMMISSIONS[c.ask].text(c.target) : ''}</span><span>${c ? `${c.had} so far` : ''}</span></div>
      <p class="hint">${this.spec.hint}</p>`;
  }

  /** The bot plays the year as the daily's does; when it is stuck, the year closes. */
  botAction() { return super.botAction(); }
}

Contado.spec = {
  id: 'contado',
  name: 'Starà Contado (long)',
  title: 'Contado',
  Mode: Contado,
  side: 5,
  groups: ['base'],
  meeples: false,
  solo: true,
  pure: true,
  market: false,
  table: true,
  city: true,
  inked: true,
  antique: true,
  // The long form: a land with levels, which only the model can show.
  land: true,
  long: true,
  seedFor: seedForRun,
  playerName: () => 'You',
  opening: 'A new city on a new land. The Signoria will ask something of it every year.',
  hint: 'Starà\'s long form: one city on a land of hills, year after year, kept between visits. Every year deals a handful of pieces and the Signoria sets a commission (so many houses, so many beside a plaza or watered, a high road, a city worth so much). Meet it when the year\'s pieces are down and it pays 5 and the next year comes, asking more; miss it and the run is over. Scored as the daily: houses 1 a square, +1 beside a plaza, +1 watered, +1 beside the cathedral; the wall costs 1 a stretch and a gate 2; a street out on two or more sides is a high road, 4 a side. The land: a stretch of wall facing lower ground costs nothing (the slope defends it), and the aqueduct carries water only as high as the spring.',
};

export { turnPiece, SHAPES };
