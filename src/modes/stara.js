// ---------------------------------------------------------------------------
// Starà — the daily square, a walled city-state.
//
// Timothy, 2026-11-18: "new mode, going to be daily, and based around the idea
// of fitting tiles into the area of your phone screen ... a square area of say
// 7x7 tiles. you have to get the best score possible within that shape. so
// regular carcassone rules but there's this border." Four passes followed on
// the 18th (MODES.md section 14): the castle walls, no followers, the two
// sizes, the town gates, the hand, the keep and the four quarters. The fifth,
// on the 23rd, made it "the walls of an illustrious city-state ... like the
// city of Lucca": one place to a tile, each paid for what stands round it,
// a cast of four places dealt per day, and an aqueduct from an arch in the
// wall.
//
// The sixth pass, 2026-11-27, in his words:
//
//   "tap a tile to rotate it, tap and hold to seal the tile (place it). the
//   animation start when you start holding, then over about a second or so
//   it sort of seals to the table like a wax seal."   (stara-ui.js)
//   "tiles can be more than one tile big, sort of like tetris."
//   "you start with the choice of three tiles instead of working up to that"
//   "tiles can be picked up and placed again by paying a point"
//   "5x5 levels should have 25 tiles, and it's about the order you place
//   them and where that the skill lies ... there is a layout ... that is
//   theoretically 'perfect' ... so the player has the correct set of tiles
//   to reach towards this perfection"                 (stara-plan.js)
//   "things that score points in different way should be clearly color
//   coded"                                              (stara-city.js, WAYS)
//
// So a day is a PLAN cut into PIECES. The level maker draws a whole city,
// the best it can find, and deals it as pieces of one to four squares, each
// one place (a terrace of houses, a big farm, a run of aqueduct), exactly
// enough to fill the square with the Comune in the middle. You hold three,
// lay one a turn wherever it fits, and draw back up to three. The city you
// build is scored the way it always was, square by square; the plan's worth
// is the day's target, shown from the first turn. A piece already down can
// be lifted back into your hand for a point.
//
// Calls of Claude's, each with why (MODES.md section 14, the sixth pass):
//   - THE PLAN IS THE TARGET, NOT A PROOF. A 5 x 5 deal has from tens of
//     thousands to millions of ways to fill the square (measured), too many
//     to try on a phone, so the plan is the best city the level maker's
//     search found, and a player who beats it is told so.
//   - THE 7 x 7 IS MADE THE SAME WAY, 49 squares' worth.
//   - NOTHING IS SET ASIDE ANY MORE: every piece has its square in the plan.
//     A piece that fits nowhere now waits in your hand; when none of the
//     three fits, lift a piece (a point) or end the day.
//   - THE CHURCH'S EXTRA TILE IS GONE: you hold three from the start, which
//     was what it was working up to.
//   - A PIECE IS THAT MANY SQUARES OF ITS PLACE: a terrace of three houses
//     pays as three houses, each for what is round it, never for the rest of
//     its own piece.
//
// Kept: the town gates and their high roads ("besides the castle wall gates
// for connecting roads, that's fun", 2026-11-19), the keep as a fifth gate,
// the water arch, the day's cast, the wizard's sight, and the square that
// may be built from its walls inward as well as from the middle out.
// ---------------------------------------------------------------------------

import { Mode } from './mode.js';
import { TILES, opposite, edgesMeet, SIDE_STEP } from '../tiles.js';
import {
  PLACES, WAYS, CAST, RULES, KEEP, COMUNE, kindOf, appraise, appraiseCity, describe, cityOf, boardCity,
  entryOf, networksOf, waterOf, gatesOf, archSquare, isWatered, SHAPES, SPANS, CITY_TILES,
} from './stara-city.js';
import { makeLevel, rngOf } from './stara-plan.js';

export {
  PLACES, WAYS, CAST, RULES, KEEP, COMUNE, kindOf, appraise, describe, isWatered, archSquare,
  SHAPES, SPANS, CITY_TILES,
};
export { WAY, LOSS, PLACE_IDS, appraiseCity, boardCity } from './stara-city.js';
export { makeLevel } from './stara-plan.js';

/** The first day there was a Starà, so day numbers start at 1. */
const FIRST_DAY = Date.UTC(2026, 10, 18);

/** What each tally is called on the end card, in the order it is listed: the ways. */
export const STARA_KINDS = WAYS.map((w) => [w.id, w.name]);

// --- the day ----------------------------------------------------------------

/** The day's cast: {faith: 'cathedral', defence: 'keep', ...}, the same for everyone. */
export function castFor(seed) {
  const r = rngOf(seed ^ 0xC17A57);
  return Object.fromEntries(CAST.map((c) => [c.id, c.of[Math.floor(r() * c.of.length)]]));
}

/**
 * Where the day's water comes in: a side of the wall (0 N, 1 E, 2 S, 3 W)
 * and a square along it, never a town gate's.
 */
export function archFor(seed, side) {
  const r = rngOf(seed ^ 0xA9EDC7);
  const s = Math.floor(r() * 4);
  const mid = (side - 1) / 2;
  const along = [...Array(side).keys()].filter((i) => i !== mid);
  return { s, i: along[Math.floor(r() * along.length)] };
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

// --- the city's rules, asked of a Board -------------------------------------------

const keyOf = (x, y) => `${x},${y}`;

/** The aqueduct's span on a cell, in the world's frame. */
export const spanOf = (cell) => (cell.type.span || []).map((s) => (s + cell.rot) % 4);

/** The squares with running water on a board. */
export const runningWater = (board, arch) => waterOf(boardCity(board), arch);

/** The town gates of a board's square. */
export const gateSquares = (board) => gatesOf(board.bounds);

/** The street networks on a board, each with its squares and the gates it reaches. */
export const highways = (board) => networksOf(boardCity(board)).list;

/** Which gates a street runs out through, by side. */
export function gateRoads(board) {
  const city = boardCity(board);
  return gatesOf(board.bounds).map((g) => {
    const c = city.get(g.x, g.y);
    return !!(c && !c.arched && c.streets & (1 << g.s));
  });
}

// --- pieces -----------------------------------------------------------------------

/** A piece turned `rot` quarter turns clockwise: its squares, from their new top left. */
export function turnPiece(piece, rot) {
  let cells = piece.cells.map((c) => ({ ...c }));
  for (let t = 0; t < (rot & 3); t++) cells = cells.map((c) => ({ ...c, dx: -c.dy, dy: c.dx, rot: (c.rot + 1) & 3 }));
  const mx = Math.min(...cells.map((c) => c.dx)), my = Math.min(...cells.map((c) => c.dy));
  return cells.map((c) => ({ ...c, dx: c.dx - mx, dy: c.dy - my })).sort((a, b) => a.dy - b.dy || a.dx - b.dx);
}

/** The square of a piece a finger holds it by: the one nearest its middle. */
export function gripOf(cells) {
  const cx = cells.reduce((a, c) => a + c.dx, 0) / cells.length;
  const cy = cells.reduce((a, c) => a + c.dy, 0) / cells.length;
  let best = cells[0], d = Infinity;
  for (const c of cells) {
    const e = (c.dx - cx) ** 2 + (c.dy - cy) ** 2;
    if (e < d - 1e-9) { d = e; best = c; }
  }
  return best;
}

// --- the mode ----------------------------------------------------------------

export class Stara extends Mode {
  get side() { return this.spec.side; }
  get squares() { return this.side * this.side; }

  /** The day's plan, and the pieces cut from it in the order they are dealt. */
  deck() {
    const g = this.game;
    this.cast = castFor(g.seed);
    this.arch = archFor(g.seed, this.side);
    this.level = makeLevel(g.seed, this.side, this.cast, this.arch);
    this.pieces = this.level.pieces;
    // The pile is dealt from the END.
    return this.level.order.slice().reverse();
  }

  seeds() { return [{ x: 0, y: 0, id: COMUNE, rot: 0 }]; }

  setup() {
    this.day = staraDay(new Date(), this.side);
    this.cast ||= castFor(this.game.seed);
    this.arch ||= archFor(this.game.seed, this.side);
    this.hand = [];
    this.sel = 0;
    this.rots = {};
    this.lifts = 0;
    this.laid = new Map();
    this.par = this.level.par;
    this.rescore();
  }

  /** Work the city out again: the score is its worth, less a point for every lift. */
  rescore() {
    this.city = appraise(this.game.board, this.arch);
    this.game.players[0].score = this.city.total - this.lifts * RULES.lift;
    this.tally = { ...this.city.ways, lifts: -this.lifts * RULES.lift };
  }

  /** How many pieces you hold. */
  get handSize() { return RULES.hand; }

  /** How many pieces ahead you see: the wizard's tower's, while it stands. */
  get foresight() {
    let n = 0;
    for (const c of this.game.board.cells.values()) n = Math.max(n, PLACES[kindOf(c)]?.scry || 0);
    return n;
  }

  /** The next pieces in the pile, as far as the wizard lets you see. */
  ahead() {
    const d = this.game.deck;
    return d.slice(Math.max(0, d.length - this.foresight)).reverse();
  }

  /** The piece in hand that is held up. */
  get held() { return this.pieces[this.hand[this.sel]] || null; }

  /**
   * The mode deals its own pieces (the host asks this instead of drawing):
   * fill the hand back up to three from the pile and hold up whichever was
   * held before. Nothing is set aside: every piece has its square in the
   * plan, and one that fits nowhere now waits in your hand. With nothing in
   * hand and nothing in the pile, the square is full.
   */
  drawNext() {
    const g = this.game;
    while (this.hand.length < this.handSize && g.deck.length) this.hand.push(g.deck.pop());
    if (!this.hand.length) return g.finish();
    this.sel = Math.max(0, Math.min(this.sel, this.hand.length - 1));
    this.hold();
  }

  /** Make the held piece the game's tile in hand, turned the way it was left. */
  hold() {
    const g = this.game, p = this.held;
    g.tile = TILES[p.cells[0].type];
    g.tileKey = p.id;
    g.rot = this.rots[p.id] ?? 0;
    g.flipped = false;
    g.phase = 'place';
  }

  /** A piece's place, by name, for the log and the cards. */
  nameOf(id) {
    const p = this.pieces[id];
    if (!p) return id;
    const name = PLACES[p.kind]?.name || p.kind;
    return p.cells.length > 1 ? `${name} (${p.cells.length} squares)` : name;
  }

  /** Hold up piece `i` of the hand instead. */
  select(i) {
    const g = this.game;
    if (g.phase !== 'place' || i < 0 || i >= this.hand.length || i === this.sel) return false;
    this.rots[this.hand[this.sel]] = g.rot;
    this.sel = i;
    this.hold();
    return true;
  }

  /** For the panel's redraw: what is in hand and which is held up. */
  signature() { return `${this.hand.join('.')}/${this.sel}/${this.game.board.size}/${this.lifts}`; }

  finalFarms = false;
  onClosed() {}

  // --- laying a piece ---------------------------------------------------------

  /** The held piece's squares at turn `rot` (the game's turn, by default). */
  shape(rot = this.game.rot, piece = this.held) { return piece ? turnPiece(piece, rot) : []; }

  /**
   * Can these squares go down with their top left at (ax, ay)? Every square
   * in the wall and empty, every edge meeting what is already there (the
   * piece's own seams were cut to meet), and the piece touching a square
   * already built or the town wall.
   */
  fitsAt(ax, ay, cells) {
    const b = this.game.board;
    const own = new Set(cells.map((c) => keyOf(ax + c.dx, ay + c.dy)));
    for (const c of cells) if (!b.inBounds(ax + c.dx, ay + c.dy) || b.get(ax + c.dx, ay + c.dy)) return false;
    let touches = false;
    for (const c of cells) {
      const x = ax + c.dx, y = ay + c.dy;
      const probe = { x, y, type: TILES[c.type], rot: c.rot };
      if (b.wallSidesAt(x, y).length) touches = true;
      for (let s = 0; s < 4; s++) {
        const nx = x + SIDE_STEP[s][0], ny = y + SIDE_STEP[s][1];
        if (own.has(keyOf(nx, ny))) continue;
        const nb = b.get(nx, ny);
        if (!nb) continue;
        touches = true;
        if (!edgesMeet(b.edgeAt(probe, s), b.edgeAt(nb, opposite(s)))) return false;
      }
    }
    return touches;
  }

  /**
   * The city as it would be with these squares of `piece` down at (ax, ay),
   * without touching the board: the scorer reads a list of squares, so a
   * trial is the board's list and the piece's. The board's is kept until
   * the board changes.
   */
  trialCity(piece, ax, ay, cells) {
    const b = this.game.board;
    if (this.baseKey !== b.version || this.baseBoard !== b) {
      this.baseKey = b.version;
      this.baseBoard = b;
      this.base = [...b.cells.values()].map(entryOf);
    }
    const extra = cells.map((c) => entryOf({ x: ax + c.dx, y: ay + c.dy, type: TILES[c.type], rot: c.rot, piece: piece.id }));
    return cityOf(b.bounds, [...this.base, ...extra]);
  }

  /**
   * Where the held piece goes when (x, y) is touched at turn `rot`: its top
   * left, with the square it is held by on (x, y) if it fits that way, or
   * the nearest other square of it that lets it fit. Null if it fits over
   * (x, y) no way at that turn.
   */
  anchorFor(x, y, rot = this.game.rot, piece = this.held) {
    const cells = this.shape(rot, piece);
    if (!cells.length) return null;
    const grip = gripOf(cells);
    const order = cells.slice().sort((a, b) => ((a.dx - grip.dx) ** 2 + (a.dy - grip.dy) ** 2) - ((b.dx - grip.dx) ** 2 + (b.dy - grip.dy) ** 2));
    for (const c of order) {
      const ax = x - c.dx, ay = y - c.dy;
      if (this.fitsAt(ax, ay, cells)) return { x: ax, y: ay, cells };
    }
    return null;
  }

  /** Every way the held piece can go down now: `{x, y, rot, cells}`, its top left. */
  placements(piece = this.held) {
    const out = [];
    if (!piece) return out;
    const b = this.game.board;
    const seen = new Set();
    for (let rot = 0; rot < 4; rot++) {
      const cells = turnPiece(piece, rot);
      const sig = JSON.stringify(cells.map((c) => [c.dx, c.dy, c.type, c.rot]));
      if (seen.has(sig)) continue;
      seen.add(sig);
      const tried = new Set();
      for (const { x, y } of b.frontier()) {
        for (const c of cells) {
          const ax = x - c.dx, ay = y - c.dy, k = `${ax},${ay}`;
          if (tried.has(k)) continue;
          tried.add(k);
          if (this.fitsAt(ax, ay, cells)) out.push({ x: ax, y: ay, rot, cells });
        }
      }
    }
    return out;
  }

  /** Every square the held piece could cover somewhere: the squares lit for it. */
  litSquares() {
    const key = `${this.hand[this.sel]}|${this.game.board.version}`;
    if (this.litKey === key) return this.litValue;
    const out = new Set();
    for (const p of this.placements()) for (const c of p.cells) out.add(keyOf(p.x + c.dx, p.y + c.dy));
    this.litKey = key;
    this.litValue = out;
    return out;
  }

  /** Can this piece go down anywhere at all, any way round? Stops at the first way. */
  fitsAnywhere(piece) {
    const front = this.game.board.frontier();
    for (let rot = 0; rot < 4; rot++) {
      const cells = turnPiece(piece, rot);
      for (const { x, y } of front) for (const c of cells) if (this.fitsAt(x - c.dx, y - c.dy, cells)) return true;
    }
    return false;
  }

  /** Does anything in hand fit anywhere? If not, lift something or end the day. */
  anyFits() {
    return this.hand.some((id) => this.fitsAnywhere(this.pieces[id]));
  }

  /** The host asks this for each square and turn: can the held piece go over (x, y)? */
  canPlaceAt(x, y) {
    if (this.game.phase !== 'place' || !this.held) return false;
    return !!this.anchorFor(x, y);
  }

  /** Lay the held piece over (x, y), at the game's turn. */
  placeAt(x, y) {
    const g = this.game;
    if (g.phase !== 'place' || !this.held) return false;
    const at = this.anchorFor(x, y);
    if (!at) return false;
    return this.lay(this.held, at.x, at.y, g.rot);
  }

  /** Put piece `piece` down with its top left at (ax, ay), turned `rot`. */
  lay(piece, ax, ay, rot) {
    const g = this.game, b = g.board;
    const cells = turnPiece(piece, rot);
    if (!this.fitsAt(ax, ay, cells)) return false;
    const laid = cells.map((c) => {
      const cell = b.place(ax + c.dx, ay + c.dy, TILES[c.type], c.rot, { owner: 0 });
      cell.piece = piece.id;
      return cell;
    });
    this.laid.set(piece.id, { x: ax, y: ay, rot });
    const i = this.hand.indexOf(piece.id);
    if (i >= 0) this.hand.splice(i, 1);
    delete this.rots[piece.id];
    g.lastPlaced = laid[0];
    g.tile = null;
    g.tileKey = null;
    // Sealed where it sits: it does not fly in from anywhere.
    g.emit('place', { cells: laid, still: true });
    const was = this.city;
    this.rescore();
    this.announce(was, laid);
    g.say(`${this.nameOf(piece.id)} at (${ax}, ${ay}): ${this.signed(this.city.total - was.total)}, the city is worth ${this.city.total}.`);
    g.endTurn();
    return true;
  }

  signed(n) { return `${n >= 0 ? '+' : '−'}${Math.abs(n)}`; }

  /** Each square whose worth changed says by how much, where it stands; and the high roads. */
  announce(was, laid) {
    const g = this.game;
    for (const [k, now] of this.city.per) {
      const d = now.pts - (was.per.get(k)?.pts || 0);
      if (!d) continue;
      const [x, y] = k.split(',').map(Number);
      g.emit('score', { points: d, players: [0], at: { x: x + 0.5, y: y + 0.5 } });
    }
    const roads = this.city.roads.reduce((a, r) => a + r.pts, 0) - was.roads.reduce((a, r) => a + r.pts, 0);
    if (roads) {
      const best = [...this.city.roads].sort((a, b) => b.pts - a.pts)[0];
      const [x, y] = (best?.tiles[0] || `${laid[0].x},${laid[0].y}`).split(',').map(Number);
      g.emit('score', { points: roads, players: [0], at: { x: x + 0.5, y: y + 0.5 } });
    }
  }

  // --- lifting a piece --------------------------------------------------------

  /** The piece standing on (x, y), if it is one you may lift (never the Comune). */
  pieceAt(x, y) {
    const id = this.game.board.get(x, y)?.piece;
    return id != null && this.laid.has(id) ? id : null;
  }

  /** The squares a laid piece stands on. */
  squaresOf(id) {
    const at = this.laid.get(id);
    if (!at) return [];
    return turnPiece(this.pieces[id], at.rot).map((c) => ({ x: at.x + c.dx, y: at.y + c.dy }));
  }

  /**
   * Lift a laid piece back into your hand, for a point (2026-11-27: "tiles
   * can be picked up and placed again by paying a point"). It is held up,
   * turned the way it lay, ready to go down somewhere better.
   */
  lift(id) {
    const g = this.game;
    if (g.phase !== 'place' || !this.laid.has(id)) return false;
    const was = this.city;
    const at = this.laid.get(id);
    for (const s of this.squaresOf(id)) g.board.remove(s.x, s.y, { quiet: true });
    g.board.rebuild();
    this.laid.delete(id);
    this.lifts++;
    if (this.hand.length) this.rots[this.hand[this.sel]] = g.rot;
    this.hand.push(id);
    this.sel = this.hand.length - 1;
    this.rots[id] = at.rot;
    this.rescore();
    const c = this.gripSquare(id, at);
    g.emit('score', { points: -RULES.lift, players: [0], at: { x: c.x + 0.5, y: c.y + 0.5 } });
    g.emit('lift', { at: { x: c.x + 0.5, y: c.y + 0.5 } });
    g.say(`${this.nameOf(id)} lifted for a point: the city is worth ${this.city.total}, you have ${g.players[0].score}.`);
    this.hold();
    return true;
  }

  /** The square a piece is held by, where it lay. */
  gripSquare(id, at) {
    const cells = turnPiece(this.pieces[id], at.rot);
    const grip = gripOf(cells);
    return { x: at.x + grip.dx, y: at.y + grip.dy };
  }

  /** Nothing in hand fits and you would rather not lift: the day ends as it stands. */
  endDay() {
    if (this.game.phase !== 'place') return false;
    this.game.say('The day is ended with the city as it stands.');
    this.game.finish();
    return true;
  }

  /** The square is full, or the day was ended: the day is done. */
  anythingLeft() {
    return (this.hand.length > 0 || this.game.deck.length > 0) && this.game.board.size < this.squares;
  }

  finish() {
    const g = this.game;
    for (const r of this.city.roads) g.say(`A high road through ${r.gates} gates → ${r.pts}`);
    const lifts = this.lifts ? `, less ${this.lifts} for lifting` : '';
    g.say(`Starà No. ${this.day.n}, ${this.side}×${this.side}: the city is worth ${this.city.total}${lifts}; the plan was worth ${this.par}. ${g.board.size} of ${this.squares} squares built.`);
  }

  // --- the plan ---------------------------------------------------------------

  /** The day's plan as a board of its own, to be looked at once the day is over. */
  planBoard() {
    if (this.planned) return this.planned;
    const B = this.game.board;
    const b = new B.constructor({ bounds: B.bounds, walled: B.walled, builtFromWall: B.builtFromWall });
    b.place(0, 0, TILES[COMUNE], 0, {});
    for (const p of this.level.plan) {
      for (const c of this.pieces[p.id].cells) {
        const cell = b.place(p.x + c.dx, p.y + c.dy, TILES[c.type], c.rot, { owner: 0 });
        cell.piece = p.id;
      }
    }
    this.planned = b;
    return b;
  }

  /**
   * Show the plan on the table instead of your city, or your city again.
   * Only once the day is over: it would give the puzzle away.
   */
  showPlan(on) {
    const g = this.game;
    if (g.phase !== 'over') return false;
    if (on && !this.mine) {
      this.mine = { board: g.board, city: this.city };
      g.board = this.planBoard();
      this.city = appraise(g.board, this.arch);
    } else if (!on && this.mine) {
      g.board = this.mine.board;
      this.city = this.mine.city;
      this.mine = null;
    }
    return true;
  }

  get showingPlan() { return !!this.mine; }

  // --- what the picture and the interface ask -----------------------------------

  /**
   * How a square looks: its place, whether water runs on it and whether it
   * is watered, which sides it joins the rest of its piece on, and which
   * piece it is (so a piece's squares are drawn as one place: one crop
   * across a farm, one terrace of roofs).
   */
  lookOf(cell) {
    const k = keyOf(cell.x, cell.y);
    const run = this.city?.running.has(k) ? 'r' : '';
    const wet = this.city?.per.get(k)?.wet ? 'w' : '';
    const b = this.game.board;
    let joined = '';
    if (cell.piece != null) {
      for (let s = 0; s < 4; s++) if (b.get(cell.x + SIDE_STEP[s][0], cell.y + SIDE_STEP[s][1])?.piece === cell.piece) joined += s;
    }
    return lookString(kindOf(cell), run + wet, joined, cell.piece);
  }

  /**
   * What laying the held piece over (x, y) at turn `rot` would do: where it
   * goes, how each of its squares would look, the city's worth after, the
   * difference by way, every square whose worth would change (with by how
   * much, and which way most), and where the piece's own points come from.
   * Tried on the board and taken off again, once per square and turn (the
   * staged piece is drawn every frame).
   */
  preview(x, y, rot) {
    const g = this.game, piece = this.held;
    if (!piece) return null;
    const key = `${piece.id}|${x},${y}|${rot}|${g.board.version}`;
    if (this.previewKey === key) return this.previewValue;
    let out = null;
    const at = this.anchorFor(x, y, rot);
    if (at) {
      const after = appraiseCity(this.trialCity(piece, at.x, at.y, at.cells), this.arch, { sources: true });
      const mine = new Set(at.cells.map((c) => keyOf(at.x + c.dx, at.y + c.dy)));
      const looks = at.cells.map((c) => {
        const lx = at.x + c.dx, ly = at.y + c.dy, k = keyOf(lx, ly);
        let joined = '';
        for (let s = 0; s < 4; s++) if (mine.has(keyOf(lx + SIDE_STEP[s][0], ly + SIDE_STEP[s][1]))) joined += s;
        const flags = (after.running.has(k) ? 'r' : '') + (after.per.get(k)?.wet ? 'w' : '');
        return { x: lx, y: ly, rot: c.rot, type: TILES[c.type], look: lookString(piece.kind, flags, joined, piece.id) };
      });
      const own = new Set(looks.map((l) => keyOf(l.x, l.y)));
      const changes = [];
      for (const [k, now] of after.per) {
        if (own.has(k)) continue;
        const was = this.city.per.get(k);
        const d = now.pts - (was?.pts || 0);
        if (!d) continue;
        const [cx, cy] = k.split(',').map(Number);
        let way = 'near', most = 0;
        for (const w of WAYS) {
          const dw = (now.ways[w.id] || 0) - (was?.ways[w.id] || 0);
          if (Math.abs(dw) > most) { most = Math.abs(dw); way = w.id; }
        }
        changes.push({ x: cx, y: cy, d, way });
      }
      const ways = {};
      for (const w of WAYS) ways[w.id] = (after.ways[w.id] || 0) - (this.city.ways[w.id] || 0);
      // Where the piece's own points come from: the squares round it it
      // likes or dislikes, and its sides on the wall.
      const from = [];
      for (const k of own) for (const f of after.per.get(k)?.from || []) from.push(f);
      const roads = after.roads.reduce((a, r) => a + r.pts, 0) - this.city.roads.reduce((a, r) => a + r.pts, 0);
      out = {
        x: at.x, y: at.y, cells: looks, total: after.total, gain: after.total - this.city.total,
        ways, changes, from, roads, wet: looks.some((l) => after.per.get(keyOf(l.x, l.y))?.wet),
      };
    }
    this.previewKey = key;
    this.previewValue = out;
    return out;
  }

  /** The card for a piece in hand. */
  card(id) {
    const p = this.pieces[id];
    if (!p) return null;
    const d = describe(p.kind);
    return { ...d, squares: p.cells.length };
  }

  /** Which gates a street runs out through, by side: for the castle's banners. */
  gatesReached() { return gateRoads(this.game.board); }

  // --- advice for the computer player -----------------------------------------

  /** What laying these cells is worth: what they add to the city, all of it. */
  botPlaceBonus() {
    return appraise(this.game.board, this.arch).total - this.city.total;
  }


  /**
   * The bot's whole turn: every piece in hand, every way it fits, keeping
   * whichever leaves the city worth most now. With nothing that fits, it
   * ends the day (it never lifts).
   */
  botAction() {
    const g = this.game;
    if (g.phase !== 'place') return false;
    const best = this.bestMove();
    if (!best) { this.endDay(); return true; }
    if (best.i !== this.sel) this.select(best.i);
    this.lay(this.held, best.x, best.y, best.rot);
    return true;
  }

  /** The best piece and place for it, by the city's worth just after. */
  bestMove() {
    let best = null;
    this.hand.forEach((id, i) => {
      const piece = this.pieces[id];
      for (const m of this.placements(piece)) {
        const v = appraiseCity(this.trialCity(piece, m.x, m.y, m.cells), this.arch).total;
        if (!best || v > best.v) best = { i, v, x: m.x, y: m.y, rot: m.rot };
      }
    });
    return best;
  }

  status() {
    return `No. ${this.day.n} · ${this.game.board.size}/${this.squares} squares`;
  }

  panel() {
    const g = this.game, p = g.players[0];
    const cast = CAST.map((c) => PLACES[this.cast[c.id]].name).join(', ');
    return `
      <div class="advTop"><span>Starà No. ${this.day.n}, ${this.side}×${this.side}</span><span>Worth <b>${p.score}</b> of ${this.par}</span></div>
      <div class="advTop"><span>${g.board.size}/${this.squares} squares</span><span>${this.hand.length} in hand, ${g.deck.length} in the pile</span></div>
      <p class="hint">Today: ${cast}.</p>
      <p class="hint">${this.spec.hint}</p>`;
  }
}

/** A square's look, for city.js: place and water flags, then the sides it joins its piece on, then the piece. */
export function lookString(kind, flags, joined, piece) {
  return `${kind}${flags}|j${joined}|p${piece ?? ''}`;
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
    // The interface: one piece at a time on a wooden table (src/stara-ui.js).
    table: true,
    // The town wall round the square (board.js): it ends streets, and a piece
    // may be laid against it as well as beside another.
    walled: true,
    builtFromWall: true,
    // The city's own pictures (src/city.js).
    city: true,
    inked: true,
    antique: true,
    seedFor: () => staraDay(new Date(), side).seed,
    playerName: () => 'You',
    bounds: { minX: -r, maxX: r, minY: -r, maxY: r },
    opening: `Today's city, ${side}×${side}, walled round. The architect has drawn a plan: build it, or better it.`,
    hint: `Daily and solo: a ${side}×${side} walled city-state, dealt as pieces of one to four squares that exactly fill it. Hold three; tap a piece to turn it, touch a lit square to put it there, and hold it to seal it down. Streets must meet streets. Each place is paid for what is round it, its card says how, in colours by way: itself, neighbours (green, a loss in red), variety (violet), water (blue), the wall (black) and gates (gold). The score is always what the whole city is worth, so a piece pays the difference it makes. Hold a laid piece to lift it back into your hand for a point. The architect's plan for the day is the target.`,
  };
}

export class Stara5 extends Stara {}

Stara.spec = specFor(7, Stara);
Stara5.spec = specFor(5, Stara5);

/** Every Starà size, smallest first, for the size switch. */
export const STARA_SIZES = [Stara5.spec, Stara.spec];
