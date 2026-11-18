// ---------------------------------------------------------------------------
// Starà — the daily square, a walled town.
//
// Timothy, 2026-11-18: "new mode, going to be daily, and based around the idea
// of fitting tiles into the area of your phone screen ... a square area of say
// 7x7 tiles. you have to get the best score possible within that shape. so
// regular carcassone rules but there's this border." Then: "the perimeter of
// the square should be top down castle walls. they also end features for the
// sake of scoring and finishing." Then, the third pass:
//
//   "no meeple. it's a solitary game, so you just claim stuff simply
//   automatically", "a 5x5 and 7x7 version", "the middle top left right and
//   bottom castle wall is a special gate, and if a road is connected to it
//   scores +1 per tile. this can stack if the road connects two three or all
//   four gates", the cities "rethemed" now that the wall round the square is
//   the town wall, and the cloisters given "a new function now that there a
//   guarantee you'll fill the board up".
//
// Asked, he chose (MODES.md section 14 has the why of each):
//
//   QUARTERS. The square is one walled town, the way Carcassonne's own Cité
//   grew from several cores inside one wall, so a tile city is a QUARTER of
//   it. A quarter pays as a city does, and at the end the town is granted a
//   charter: +2 for every finished quarter.
//   HIGHWAYS. The middle of each wall is a town gate. Roads joined at a
//   crossroads are one highway; at the end every highway pays +1 per tile for
//   each of the four gates it reaches.
//   ABBEYS want quiet. An abbey pays 1, and for each tile round it 2 if that
//   tile is all fields, 1 if a road runs through it, nothing if a quarter
//   stands on it. (He picked "+1 for each square that is only field"; in the
//   base deck the only all-field tile is the abbey itself, so that would
//   almost never pay. The grading keeps his order of quiet and makes it
//   score: Claude's call, named to him.)
//   FIELDS are the town's gardens and score nothing.
//
// No followers: everything you build is yours. A road, a quarter or an abbey
// pays when it is finished (an abbey is finished when every square round it
// is filled, the wall counting as filled), and whatever is unfinished pays at
// the end: a road 1 a tile, a quarter 1 a tile and 1 a pennant, an abbey its
// quiet as it stands.
//
// The fourth pass (2026-11-18): "when a cloister is placed, your hand size is
// now +1 ... you can choose any tile from your hand to play, you still draw
// 1"; "a keep tile with walls that end feature on each side, and some effect
// of some kind"; and "different quarters, like housing, trade, military ...
// maybe the board is split into four smaller sections and like there's a
// tile that want to be in each section". Asked, he chose:
//
//   THE FOUR QUARTERS. A quarter is literally one of the four parts a town's
//   two main streets cut it into, gate to gate. So the middle row and column
//   are the HIGH STREET, and the four corners of the square are the town's
//   quarters. Each day gives each quarter a trade, and each trade wants one
//   thing, paid at the end: HOUSING +1 per district tile in it, TRADE +3 per
//   market cross (a crossroads tile), CHURCH +3 per abbey, GARRISON +6 if the
//   keep stands in it. The tile cities are DISTRICTS now, so that "quarter"
//   means the four; the charter pays +2 per finished district.
//   THE KEEP, a citadel: walls on all four sides (KEEP_TILE in tiles.js), so
//   it fits against anything and ends what it touches, and a road that ends
//   at it counts it as a gate, a fifth one, for its highway. One to a deck,
//   dealt within the first third of the square's worth of tiles (Claude's
//   call: a keep dealt after the square is full would be a keep you never see).
//   THE HAND. You hold 1 tile, and 1 more for every abbey you have laid. At
//   the start of a turn the hand is filled from the pile, so you still draw
//   one a turn (two, the turn after an abbey); you play any tile in it. A tile
//   that fits nowhere is set aside, from the pile or the hand.
//
// The base deck plus the keep, solo, the same deal for everyone on the same
// local date; the day ends when the square is full or nothing left fits. It is `pure`: the workshop's bolted-on rules never reach
// it. The look and the interface are in src/stara-ui.js and src/castle.js.
// ---------------------------------------------------------------------------

import { Mode } from './mode.js';
import { buildDeck, opposite, TILES } from '../tiles.js';

/** The keep's tile id (tiles.js). */
const KEEP = 'KEEP';

/** The first day there was a Starà, so day numbers start at 1. */
const FIRST_DAY = Date.UTC(2026, 10, 18);

/** What each tally is called on the end card, in the order it is listed. */
export const STARA_KINDS = [
  ['districts', 'Districts'], ['roads', 'Roads'], ['abbeys', 'Abbeys'],
  ['gates', 'Highways'], ['quarters', 'The quarters'], ['charter', 'Charter'],
  ['unfinished', 'Unfinished'],
];

/**
 * The four trades a quarter can have, and what each wants (the fourth pass).
 * `per` is what one of the wanted things pays at the end.
 */
// Each in a heraldic tincture (2026-11-18: "color coded sections on the wood
// background"): purpure, or, azure and gules, tinting its quarter of the
// floor and its tag.
export const TRADES = [
  { id: 'housing', name: 'Housing', wants: 'district tiles', per: 1, color: '#7b4f93', is: (c) => c.type.feats.some((f) => f.type === 'city') },
  { id: 'trade', name: 'Trade', wants: 'market crosses', per: 3, color: '#d9a338', is: (c) => c.type.feats.filter((f) => f.type === 'road').length > 1 },
  { id: 'church', name: 'Church', wants: 'abbeys', per: 3, color: '#3e66b0', is: (c) => c.type.feats.some((f) => f.type === 'monastery') },
  { id: 'garrison', name: 'Garrison', wants: 'the keep', per: 6, color: '#b23a2c', is: (c) => !!c.type.keep },
];
export const TRADE_BY_ID = Object.fromEntries(TRADES.map((t) => [t.id, t]));

/** The four quarters, in reading order round the square. */
export const QUARTERS = ['NW', 'NE', 'SE', 'SW'];

/** Which quarter a square is in, or null on the high street (the middle cross). */
export function quarterOf(board, x, y) {
  const b = board.bounds;
  const mx = (b.minX + b.maxX) / 2, my = (b.minY + b.maxY) / 2;
  if (x === mx || y === my) return null;
  return y < my ? (x < mx ? 'NW' : 'NE') : (x < mx ? 'SW' : 'SE');
}

/** What a quarter of trade `tradeId` is worth on this board as it stands. */
export function quarterWorth(board, q, tradeId) {
  const t = TRADE_BY_ID[tradeId];
  let n = 0;
  for (const c of board.cells.values()) if (quarterOf(board, c.x, c.y) === q && t.is(c)) n++;
  return { n, pts: n * t.per };
}

/** A small seeded PRNG of the mode's own, so the trades never disturb the deal. */
function rngOf(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The day's trades by quarter: {NW: 'church', ...}, the same for everyone. */
export function tradesFor(seed) {
  const r = rngOf(seed ^ 0x5157A7);
  const ids = TRADES.map((t) => t.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return Object.fromEntries(QUARTERS.map((q, i) => [q, ids[i]]));
}

/**
 * Today, by the calendar where you are: its number, its date, and the seed
 * the deal comes from. Taken from the LOCAL date on purpose, so the puzzle
 * turns over at your midnight rather than at Greenwich's. Each size has its
 * own deal; the 7 x 7's key is the one it has had since day 1.
 */
export function staraDay(now = new Date(), side = 7) {
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  const n = Math.round((Date.UTC(y, m, d) - FIRST_DAY) / 86400000) + 1;
  const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  // FNV-1a over a string of its own, so Starà and Tesserae never share a deal.
  const key = side === 7 ? `stara:${iso}` : `stara${side}:${iso}`;
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
  return { n, iso, seed: h >>> 0 };
}

// --- the town's rules, as questions any board can be asked ------------------

/** What a tile is, for an abbey's quiet: a quarter, a road, or all fields. */
function bustle(cell) {
  if (cell.type.feats.some((f) => f.type === 'city')) return 0;
  if (cell.type.feats.some((f) => f.type === 'road')) return 1;
  return 2;
}

/** An abbey's worth: 1, and 2, 1 or 0 for each tile round it by its quiet. */
export function quietOf(board, x, y) {
  let pts = 1;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (!dx && !dy) continue;
      const c = board.get(x + dx, y + dy);
      if (c) pts += bustle(c);
    }
  }
  return pts;
}

/**
 * The four town gates, in the middle of each wall: the square on that side's
 * middle and the side it faces out of (0 N, 1 E, 2 S, 3 W).
 */
export function gateSquares(board) {
  const b = board.bounds;
  const mx = (b.minX + b.maxX) / 2, my = (b.minY + b.maxY) / 2;
  return [
    { s: 0, x: mx, y: b.minY }, { s: 1, x: b.maxX, y: my },
    { s: 2, x: mx, y: b.maxY }, { s: 3, x: b.minX, y: my },
  ];
}

/** The road running out through each gate, by side, or null. */
export function gateRoads(board) {
  return gateSquares(board).map(({ s, x, y }) => {
    const cell = board.get(x, y);
    if (!cell || board.edgeAt(cell, s) !== 'r') return null;
    const i = board.featAt(cell, s);
    return i == null ? null : board.featureOf(x, y, i);
  });
}

/**
 * The HIGHWAYS: roads joined at a crossroads are one. A crossroads is a tile
 * with more than one road on it (in the base deck, the three- and four-way
 * junctions), so every road ending on the same such tile is on the same
 * highway. Each comes back with its tiles and the gates (sides) it reaches.
 */
export function highways(board) {
  const parent = new Map();
  const find = (d) => {
    while (parent.get(d) !== d) { parent.set(d, parent.get(parent.get(d))); d = parent.get(d); }
    return d;
  };
  for (const cell of board.cells.values()) {
    const roads = [];
    cell.type.feats.forEach((f, i) => {
      if (f.type !== 'road') return;
      const d = board.featureOf(cell.x, cell.y, i);
      if (!d) return;
      if (!parent.has(d)) parent.set(d, d);
      roads.push(d);
    });
    for (let k = 1; k < roads.length; k++) parent.set(find(roads[k]), find(roads[0]));
  }
  const ways = new Map();
  for (const d of parent.keys()) {
    const r = find(d);
    if (!ways.has(r)) ways.set(r, { tiles: new Set(), gates: new Set(), roads: [] });
    const w = ways.get(r);
    w.roads.push(d);
    for (const t of d.tiles) w.tiles.add(t);
  }
  gateRoads(board).forEach((d, s) => { if (d && parent.has(d)) ways.get(find(d)).gates.add(s); });
  // The keep is a gate too, a fifth: every road that ends against its walls
  // puts it on that road's highway, once however many roads reach it.
  for (const cell of board.cells.values()) {
    if (!cell.type.keep) continue;
    for (let s = 0; s < 4; s++) {
      const nb = board.neighbor(cell.x, cell.y, s);
      if (!nb || board.edgeAt(nb, opposite(s)) !== 'r') continue;
      const i = board.featAt(nb, opposite(s));
      const d = i == null ? null : board.featureOf(nb.x, nb.y, i);
      if (d && parent.has(d)) ways.get(find(d)).gates.add(`keep ${cell.x},${cell.y}`);
    }
  }
  return [...ways.values()];
}

// --- the mode ----------------------------------------------------------------

export class Stara extends Mode {
  get side() { return this.spec.side; }
  get squares() { return this.side * this.side; }

  /** The base deck, and the keep dealt somewhere in the first third. */
  deck() {
    const deck = buildDeck(['base'], this.game.rng, 'D');
    // The pile is dealt from the END, so "within the first k" is k from the end.
    const k = 1 + Math.floor(this.game.rng() * Math.floor(this.squares / 3));
    deck.splice(deck.length - k + 1, 0, KEEP);
    return deck;
  }

  setup() {
    this.day = staraDay(new Date(), this.side);
    this.tally = Object.fromEntries(STARA_KINDS.map(([k]) => [k, 0]));
    this.trades = tradesFor(this.day.seed);
    this.hand = [];
    this.sel = 0;
    this.abbeysLaid = 0;
  }

  /** How many tiles you hold: 1, and 1 more for every abbey you have laid. */
  get handSize() { return 1 + this.abbeysLaid; }

  /**
   * The mode deals its own tiles (the host asks this instead of drawing):
   * set aside anything in hand that fits nowhere now, fill the hand from the
   * pile, setting aside what fits nowhere as it comes, and hold up whichever
   * tile was in hand before, or the first.
   */
  drawNext() {
    const g = this.game;
    const fits = (id) => g.placeableNow(TILES[id]);
    this.hand = this.hand.filter((id) => fits(id) || (g.say(`Tile ${id} no longer fits anywhere: set aside.`), false));
    while (this.hand.length < this.handSize && g.deck.length) {
      const id = g.deck.pop();
      if (fits(id)) this.hand.push(id);
      else g.say(`Tile ${id} had nowhere to go: set aside.`);
    }
    if (!this.hand.length || g.board.size >= this.squares) return g.finish();
    this.sel = Math.max(0, Math.min(this.sel, this.hand.length - 1));
    g.offer(this.hand[this.sel]);
  }

  /** Hold up tile `i` of the hand instead. */
  select(i) {
    const g = this.game;
    if (g.phase !== 'place' || i < 0 || i >= this.hand.length || i === this.sel) return false;
    this.sel = i;
    g.offer(this.hand[i]);
    return true;
  }

  /** For the panel's redraw: what is in hand and which is held up. */
  signature() { return `${this.hand.join('.')}/${this.sel}`; }

  // Fields are gardens: nothing to harvest at the end.
  finalFarms = false;

  /**
   * No followers, so nothing to claim: the turn ends as the tile goes down.
   * The tile leaves the hand, and an abbey makes the hand one bigger.
   */
  afterPlace(cell) {
    this.hand.splice(this.sel, 1);
    if (cell.type.feats.some((f) => f.type === 'monastery')) {
      this.abbeysLaid++;
      this.game.say(`An abbey: you hold ${this.handSize} tiles now.`);
    }
    return null;
  }

  /** The square is full, or nothing is left to deal: the day is done. */
  anythingLeft() {
    return (this.hand.length > 0 || this.game.deck.length > 0) && this.game.board.size < this.squares;
  }

  /** An abbey is worth its quiet, finished or not. */
  valueOf(d) {
    if (d.type === 'monastery') return quietOf(this.game.board, d.at.x, d.at.y);
    return null;
  }

  /** Which gates a road runs out through, by side: for the castle's banners. */
  gatesReached() { return gateRoads(this.game.board).map(Boolean); }

  onClosed(d) {
    const kind = d.type === 'city' ? 'districts' : d.type === 'road' ? 'roads' : 'abbeys';
    const p = this.game.players[0];
    const before = p.score;
    // With no followers the host pays whoever closed it: you, always.
    this.game.award(d, false, 0);
    this.tally[kind] += p.score - before;
  }

  finish() {
    const g = this.game, board = g.board;
    // What is unfinished pays as it stands. With no followers the host pays
    // nobody at the end, so the mode pays it.
    for (const d of board.allComponents()) {
      if (d.scored || d.type === 'field') continue;
      const kind = d.type === 'monastery' ? 'abbeys' : 'unfinished';
      const name = d.type === 'monastery' ? 'abbey' : d.type === 'city' ? 'district' : d.type;
      this.grant(g.valueOf(d, true), kind, `Unfinished ${name} of ${d.tiles.size}`, d);
    }
    // The highways, through the town gates.
    for (const w of highways(board)) {
      if (!w.gates.size) continue;
      const pts = w.gates.size * w.tiles.size;
      this.grant(pts, 'gates', `Highway of ${w.tiles.size} tiles through ${w.gates.size} gate${w.gates.size > 1 ? 's' : ''}`, w.roads[0]);
    }
    // The four quarters, each paid for what its trade wants.
    for (const q of QUARTERS) {
      const t = TRADE_BY_ID[this.trades[q]];
      const { n, pts } = quarterWorth(board, q, t.id);
      if (pts) this.grant(pts, 'quarters', `The ${t.name.toLowerCase()} quarter (${q}), ${n} of ${t.wants}`);
    }
    // The town's charter: +2 for every finished district.
    const districts = board.allComponents().filter((d) => d.type === 'city' && d.open === 0).length;
    if (districts) this.grant(2 * districts, 'charter', `The town's charter, ${districts} finished district${districts > 1 ? 's' : ''}`);
    g.say(`Starà No. ${this.day.n}, ${this.side}×${this.side}: ${g.players[0].score} points, ${board.size} of ${this.squares} squares filled.`);
  }

  /** Pay the player `pts` under `kind`, say why, and float it where `d` is. */
  grant(pts, kind, why, d = null) {
    if (pts <= 0) return;
    const g = this.game;
    g.players[0].score += pts;
    this.tally[kind] += pts;
    g.say(`${why} → +${pts}`);
    const spot = d ? g.spotOf(d) : null;
    if (spot) g.emit('score', { points: pts, players: [0], ...spot });
  }

  status() {
    return `No. ${this.day.n} · ${this.game.board.size}/${this.squares} squares`;
  }

  panel() {
    const g = this.game, p = g.players[0];
    return `
      <div class="advTop"><span>Starà No. ${this.day.n}, ${this.side}×${this.side}</span><span>Score <b>${p.score}</b></span></div>
      <div class="advTop"><span>${g.board.size}/${this.squares} squares</span><span>${this.hand.length} in hand, ${g.deck.length} in the pile</span></div>
      <p class="hint">${this.spec.hint}</p>`;
  }
}

/** The two sizes, as two daily puzzles: 7 x 7 is `stara`, 5 x 5 `stara5`. */
function specFor(side, Mode) {
  const r = (side - 1) / 2;
  return {
    id: side === 7 ? 'stara' : `stara${side}`,
    name: `Starà ${side}×${side} (daily)`,
    Mode,
    side,
    groups: ['base'],
    meeples: false,
    solo: true,
    pure: true,
    market: false,
    // The interface: one tile at a time on a wooden table (src/stara-ui.js).
    table: true,
    // The town wall round the square (board.js): it ends roads and closes quarters.
    walled: true,
    // Medieval and drawn by hand: inked tiles, the panel on parchment.
    inked: true,
    antique: true,
    seedFor: () => staraDay(new Date(), side).seed,
    playerName: () => 'You',
    bounds: { minX: -r, maxX: r, minY: -r, maxY: r },
    opening: `Today's town, ${side}×${side}. Fill it as well as you can.`,
    hint: `Daily and solo, a ${side}×${side} walled town, no followers. Districts, roads and abbeys pay when finished. At the end highways pay +1 a tile per gate they reach (the keep is one), each of the four quarters pays for what its trade wants, and the charter +2 per finished district. Abbeys want quiet, and each one laid lets you hold one more tile.`,
  };
}

export class Stara5 extends Stara {}

Stara.spec = specFor(7, Stara);
Stara5.spec = specFor(5, Stara5);

/** Every Starà size, smallest first, for the size switch. */
export const STARA_SIZES = [Stara5.spec, Stara.spec];
