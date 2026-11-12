// ---------------------------------------------------------------------------
// Scala: the ladder, solo, in the smallest square you can.
//
// Timothy, 2026-11-12, of the solitaire mode in the first Carcassonne app
// (2010): "it was like a daily version ... you had to make the smallest
// possible square size". What the reviews of that app wrote down about it:
// no followers; close roads and cities in increasing order, starting with
// two-tile ones; the game ends when a six-tile road and a six-tile city are
// done; the most compact board, the one that used the fewest tiles, scores
// best; and every player of a given "town" gets the same order of tiles.
//
// So, here: one shuffle a day, the same for everyone (like Tesserae, with its
// own salt so the two dailies differ). Close a road of exactly 2 tiles and a
// city of exactly 2, then 3, then 4, 5 and 6. Roads and cities climb their own
// ladders. A feature of any other size closes and counts for nothing. When
// both reach 6 the day is done, and the result is the side of the smallest
// square that holds every tile laid, then how many tiles it took.
//
// Two switches, for experimenting:
//   Fill the square   no ladder: lay 35 tiles round the start, and the result
//                     is the square alone. All 36 in a 6x6 is a perfect day.
//   Practice shuffle  a new shuffle every game instead of today's.
// ---------------------------------------------------------------------------

import { Mode } from './mode.js';
import { buildDeck, SIDE_STEP } from '../tiles.js';
import { dailySeed, dailyLabel } from './tesserae.js';

/** The rungs, in order, for roads and for cities alike. */
export const RUNGS = [2, 3, 4, 5, 6];
const KINDS = ['road', 'city'];

/** Fill the square: 35 drawn plus the start tile is 36, a 6x6 exactly. */
const FILL_DECK = 35;

/**
 * Par, measured rather than guessed: the Sharp bot's median over 100
 * shuffles (`node tools/scala-par.mjs`; MODES.md, section 14). It finishes
 * the ladder on 38 of them, in a median 60 tiles and a 10x10 square, and
 * fills 36 tiles into a 7x7 almost every time. It plays one tile ahead and
 * no further, so a person who plans should beat it.
 */
export const PAR = { ladder: { side: 10, tiles: 60 }, fill: { side: 7 } };

/** Today's Scala shuffle: Tesserae's day, salted so the two differ. */
export function scalaSeed(now = new Date()) {
  return Math.imul(dailySeed(now) ^ 0x5ca1a, 2654435761) >>> 0;
}

/**
 * The board's footprint: its bounding rectangle and the side of the smallest
 * square that holds it. `skip` leaves some cells out, which is how the bot
 * asks what the square was before the tile it is trying.
 */
export function footprint(board, skip = null) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const c of board.cells.values()) {
    if (skip?.has(c)) continue;
    if (c.x < minX) minX = c.x; if (c.x > maxX) maxX = c.x;
    if (c.y < minY) minY = c.y; if (c.y > maxY) maxY = c.y;
  }
  if (minX === Infinity) return { minX: 0, maxX: -1, minY: 0, maxY: -1, w: 0, h: 0, side: 0 };
  const w = maxX - minX + 1, h = maxY - minY + 1;
  return { minX, maxX, minY, maxY, w, h, side: Math.max(w, h) };
}

/**
 * The empty squares a road or city still reaches. Each one needs a tile to
 * close it, and that tile joins the feature, so `size + gaps` is the smallest
 * the feature can close at.
 */
export function openSquares(board, d) {
  const out = new Set();
  for (const part of d.parts) {
    const [key, idx] = part.split('#');
    const [x, y] = key.split(',').map(Number);
    const cell = board.get(x, y);
    const f = cell?.type.feats[Number(idx)];
    if (!f?.sides) continue;
    for (const s of f.sides) {
      const w = (s + cell.rot) % 4;
      const [dx, dy] = SIDE_STEP[w];
      if (!board.get(x + dx, y + dy)) out.add(`${x + dx},${y + dy}`);
    }
  }
  return out;
}

export class Scala extends Mode {
  get fill() { return !!this.game.options?.scalaFill; }
  get practice() { return !!this.game.options?.scalaPractice; }

  // The base tiles only, whatever the tile pool says: a daily puzzle is only
  // the same for everyone if everyone is dealt from the same box.
  deck() { return buildDeck(['base'], this.game.rng, 'D', this.fill ? FILL_DECK : 0); }

  setup() {
    this.next = { road: 0, city: 0 };      // index into RUNGS, per kind
    this.pending = [];                     // closures waiting to be read in size order
  }

  get rungs() { return this.next.road + this.next.city; }
  get done() { return !this.fill && this.next.road >= RUNGS.length && this.next.city >= RUNGS.length; }
  rungFor(kind) { return RUNGS[this.next[kind]] ?? null; }
  get tilesLaid() { return this.game.board.cells.size; }
  get square() { return footprint(this.game.board); }

  // Nothing pays here: the result is the square, not points. Zero also keeps
  // the bot from chasing big closures that don't climb anything.
  valueOf() { return 0; }

  afterPlace() { this.climb(); return null; }

  /**
   * One tile can close two things at once, a two-tile road and a three-tile
   * one, say. Read in the order they come, the three would miss its rung and
   * the two would take it. So closures wait here and are read smallest first,
   * which is always the reading that climbs furthest.
   */
  onClosed(d) {
    if (!this.fill && KINDS.includes(d.type)) this.pending.push(d);
  }

  endTurn() {
    this.climb();
    if (this.done) this.game.finish();
  }

  climb() {
    if (!this.pending.length) return;
    const g = this.game;
    const list = this.pending.sort((a, b) => a.tiles.size - b.tiles.size);
    this.pending = [];
    for (const d of list) {
      const want = this.rungFor(d.type);
      const size = d.tiles.size;
      if (want === size) {
        this.next[d.type]++;
        g.players[0].score = this.rungs;
        g.say(`A ${size}-tile ${d.type} closes: rung ${size} of the ${d.type}s.`);
        const spot = g.spotOf(d);
        if (spot) {
          g.emit('banner', { player: 0, ...spot });
          g.emit('landmark', spot);
        }
      } else if (want != null) {
        g.say(`A ${size}-tile ${d.type} closes, but the ${d.type}s want ${want}.`);
      }
    }
  }

  finish() {
    this.climb();
    const g = this.game;
    const sq = this.square;
    const shape = `${sq.side}×${sq.side}`;
    if (this.fill) {
      g.players[0].score = sq.side;
      g.say(`${this.tilesLaid} tiles inside a ${shape} square (${sq.w}×${sq.h} laid). ${this.verdict(sq.side, PAR.fill.side)}`);
      return;
    }
    if (this.done) {
      g.say(`The ladder is climbed in ${this.tilesLaid} tiles, inside a ${shape} square. `
        + `${this.verdict(sq.side, PAR.ladder.side, this.tilesLaid, PAR.ladder.tiles)}`);
    } else {
      g.say(`The pile ran out with ${this.next.road} of 5 road rungs and ${this.next.city} of 5 city rungs climbed: ${this.rungs} of 10.`);
    }
  }

  /** The square first; the tiles only part two results with the same square. */
  verdict(side, par, tiles = null, parTiles = null) {
    if (side < par) return `${par - side} under par.`;
    if (side > par) return `${side - par} over par.`;
    if (tiles == null || tiles === parTiles) return 'Par.';
    return tiles < parTiles ? `Par square, ${parTiles - tiles} tiles under.` : `Par square, ${tiles - parTiles} tiles over.`;
  }

  // --- the board --------------------------------------------------------------

  /**
   * The smallest square round everything laid, drawn on the board. Where the
   * board is wider than it is tall the square has room to spare one way, and
   * it is drawn centred on the board, snapped to the grid.
   */
  frame() {
    const sq = this.square;
    if (!sq.side) return null;
    const x0 = sq.minX - Math.floor((sq.side - sq.w) / 2);
    const y0 = sq.minY - Math.floor((sq.side - sq.h) / 2);
    return { x: x0, y: y0, side: sq.side, label: `${sq.side}×${sq.side}` };
  }

  // --- the bot ------------------------------------------------------------------

  /**
   * What the board alone can't tell the bot. Climbing a rung is worth a lot.
   * Short of that, the whole board is read, not just the tile being tried,
   * because the costly mistake is the quiet one: a tile that grows a city
   * which was one tile from its rung past it. For each kind, the best open
   * feature that can still close at the rung it is on is worth more the fewer
   * tiles it needs, one that can grow into it is worth a little, and one
   * shaped for a later rung a little less.
   *
   * On the ladder the bot ignores the square, and that is measured, not
   * forgotten: packing tight leaves new tiles no room except against features
   * already growing, which spoils their sizes. Even a tiebreak's weight on
   * the square took the Sharp bot from 20 finished ladders in 40 to 11. So it
   * climbs first and the square is whatever that leaves. Filling the square,
   * the square is all there is: growth costs and every neighbour helps.
   */
  botPlaceBonus(laid) {
    const board = this.game.board;
    if (this.fill) {
      const grew = footprint(board).side - footprint(board, new Set(laid)).side;
      let value = -6 * grew;
      for (const c of laid) value += 0.8 * board.degree(c.x, c.y);
      return value;
    }
    let value = 0;

    const fresh = new Set(laid.map((c) => `${c.x},${c.y}`));
    const closed = { road: [], city: [] };
    const best = { road: 0, city: 0 };
    const later = { road: 0, city: 0 };
    for (const d of board.allComponents()) {
      if (!KINDS.includes(d.type) || d.scored) continue;
      const want = this.rungFor(d.type);
      if (want == null) continue;
      const size = d.tiles.size;
      if (d.open === 0) {
        // Closed in this trial: only what the tile being tried closed.
        if ([...d.tiles].some((k) => fresh.has(k))) closed[d.type].push(size);
        continue;
      }
      const gaps = openSquares(board, d).size || 1;
      const least = size + gaps;
      if (least === want) best[d.type] = Math.max(best[d.type], 4 / gaps);
      else if (least < want) best[d.type] = Math.max(best[d.type], 1);
      else if (RUNGS.includes(least)) later[d.type] = Math.min(2, later[d.type] + 0.6 / gaps);
    }
    for (const kind of KINDS) {
      value += best[kind] + later[kind];
      // Closures read smallest first, as `climb` reads them.
      let at = this.next[kind];
      for (const size of closed[kind].sort((a, b) => a - b)) {
        if (RUNGS[at] === size) { value += 12; at++; } else if (size < (RUNGS[at] ?? 0)) value -= 1;
      }
    }
    return value;
  }

  // --- the panel ----------------------------------------------------------------

  status() {
    const day = this.practice ? 'practice' : dailyLabel();
    const sq = this.square.side;
    if (this.fill) return `${day} · fill · square ${sq}`;
    return `${day} · roads ${this.rungFor('road') ?? 'done'} · cities ${this.rungFor('city') ?? 'done'} · square ${sq}`;
  }

  ladderRow(kind) {
    const at = this.next[kind];
    const steps = RUNGS.map((n, i) => {
      const cls = i < at ? 'done' : i === at ? 'next' : '';
      return `<span class="scalaRung ${cls}">${n}</span>`;
    }).join('');
    return `<div class="scalaLadder"><span class="scalaKind">${kind === 'road' ? 'Roads' : 'Cities'}</span>${steps}</div>`;
  }

  panel() {
    const g = this.game;
    const sq = this.square;
    const day = this.practice ? 'Practice shuffle' : dailyLabel();
    const par = this.fill ? `${PAR.fill.side}×${PAR.fill.side}` : `${PAR.ladder.side}×${PAR.ladder.side}, ${PAR.ladder.tiles} tiles`;
    const left = g.deck.length;
    const top = `<div class="advTop"><span>${day}</span><span>Par <b>${par}</b></span></div>
      <div class="advTop"><span>Square <b>${sq.side}×${sq.side}</b></span><span>${this.tilesLaid} laid · ${left} left</span></div>`;
    if (this.fill) {
      return `${top}<p class="hint">Lay every tile. The result is the smallest square that holds them all: 36 tiles in a 6×6 is perfect.</p>`;
    }
    return `${top}${this.ladderRow('road')}${this.ladderRow('city')}
      <p class="hint">Close a road and a city of exactly 2 tiles, then 3, 4, 5 and 6. Any other size counts for nothing. Done at 6 and 6; the result is the smallest square round the board.</p>`;
  }
}

Scala.spec = {
  id: 'scala',
  name: 'Scala (daily)',
  Mode: Scala,
  groups: ['base'],
  solo: true,
  market: false,
  // Today's shuffle, unless the practice switch is ticked.
  seedFor: (options = {}) => (options.scalaPractice ? null : scalaSeed()),
  playerName: () => 'You',
  switches: [
    { id: 'scalaFill', name: 'Fill the square', note: 'No ladder: lay 35 tiles round the start, and the result is the smallest square that holds them.' },
    { id: 'scalaPractice', name: 'Practice shuffle', note: "A new shuffle every game instead of today's." },
  ],
  opening: "Today's ladder. Close a road and a city of 2 tiles, then 3, up to 6, in the smallest square you can.",
  hint: 'Solo, no followers, one shuffle a day for everyone. Close a road and a city of exactly 2 tiles, then 3, 4, 5 and 6; '
    + 'roads and cities climb separately, and any other size counts for nothing. Done at 6 and 6, and the result is the side '
    + 'of the smallest square round everything you laid (drawn on the board), then the tiles it took. '
    + 'Switches: Fill the square (no ladder, just the square) and Practice shuffle.',
};
