// ---------------------------------------------------------------------------
// Starà — the daily city-state.
//
// Timothy, 2026-11-18: "new mode, going to be daily, and based around the idea
// of fitting tiles into the area of your phone screen ... a square area of say
// 7x7 tiles. you have to get the best score possible within that shape. so
// regular carcassone rules but there's this border." Four passes followed on
// the 18th (MODES.md section 14): the castle walls, no followers, the two
// sizes, the town gates, the hand, the keep and the four quarters. The fifth,
// on the 23rd, made it "the walls of an illustrious city-state ... like the
// city of Lucca": one place to a tile, each paid for what stands round it.
// The sixth, on the 27th, dealt a day as a PLAN cut into pieces of one to
// four squares, sealed with a hold, lifted again for a point.
//
// The seventh pass, later on 2026-11-27, in his words:
//
//   "You should be able to pick up and place and drag tiles as you see fit
//   ... really freeform ... tapping and holding still seals them ... because
//   we now have Tetris pieces, I think we should probably have the rotate
//   button ... an additional rotate button somewhere on the bottom"
//                                                         (stara-ui.js)
//   "I feel like aqueducts should be like a second layer above all the other
//   stuff ... you should be able to have a road go under an aqueduct"
//   "the tap and hold to place should be a bit faster"     (stara-ui.js)
//   "I don't understand what the labels in the all four corners are, like
//   the convent and the tannery and stuff. I thought we didn't have
//   quarters anymore."                       (the day's cast is gone)
//   "the mechanics for points should be a little simpler ... a cathedral, a
//   plaza, housing, aqueducts, maybe one or two other things just to start"
//   "having the border on the outside is kind of restricting ... the bigger
//   the castle walls get, the less points you get ... the solitary version
//   of Carcassonne that's in the old Carcassonne mobile app"
//
// Asked, he took the three recommendations (stara-city.js has them in full):
// the wall hugs the city and costs a point a stretch; only houses score,
// for a plaza, water and the cathedral beside them; streets meet streets and
// leave the city by gates, and a street out on two or more sides is a high
// road.
//
// So there is no border. The Comune is laid in the middle of an open table,
// and each piece goes down beside what is built, its streets meeting
// streets. The wall is drawn round whatever stands, and its length is the
// day's cost. The aqueduct is laid over the city, or out over the country
// to the day's spring, and takes no square of it. The day is still a plan:
// the architect's city, a square (the shortest wall there is round that
// many squares), cut into the pieces you are dealt; its worth is the target.
//
// Calls of Claude's, each with why (MODES.md section 14, the seventh pass):
//   - THE COMUNE IS A PLAZA: the town hall's square is the one plaza every
//     day has, in the middle from the first turn.
//   - "BESIDE" IS THE EIGHT SQUARES ROUND IT, as "round it" was before; the
//     water is the square itself or the four beside it, as before.
//   - A HOLE IN THE CITY IS WALLED ROUND TOO: every side of a square facing
//     open ground is a stretch, wherever it is.
//   - A HIGH ROAD PAYS 4 A SIDE OF THE CITY IT LEAVES BY, from two sides
//     up. With a gate wherever a street leaves, gates are easy to make; the
//     four sides are what is hard to join.
//   - THE SPRING is two squares out from one side of the plan's square, so
//     every day the aqueduct has open country to cross.
//   - THE AQUEDUCT IS LIFTED FIRST: a hold on a square with an aqueduct over
//     it lifts the aqueduct, the top layer.
//   - A STAGED PIECE MAY SIT WHERE IT DOES NOT FIT (freeform), drawn in red
//     there, and only seals where it fits.
//
// Kept from the sixth pass: the plan, three in hand, hold to seal, lift for a
// point, the colours by way, the plan shown once the day is over.
// ---------------------------------------------------------------------------

import { Mode } from './mode.js';
import { TILES, opposite, edgesMeet, SIDE_STEP } from '../tiles.js';
import {
  PLACES, WAYS, RULES, COMUNE, kindOf, appraise, appraiseCity, describe, cityOf, boardCity,
  entryOf, spanEntry, networksOf, waterOf, wallOf, isWatered, SHAPES, SPANS, CITY_TILES,
} from './stara-city.js';
import { makeLevel, springFor } from './stara-plan.js';

export {
  PLACES, WAYS, RULES, COMUNE, kindOf, appraise, describe, isWatered, wallOf, SHAPES, SPANS, CITY_TILES,
};
export { WAY, LOSS, PLACE_IDS, appraiseCity, boardCity, cityOf, spanEntry } from './stara-city.js';
export { makeLevel, springFor } from './stara-plan.js';

/** The first day there was a Starà, so day numbers start at 1. */
const FIRST_DAY = Date.UTC(2026, 10, 18);

/** What each tally is called on the end card, in the order it is listed: the ways. */
export const STARA_KINDS = WAYS.map((w) => [w.id, w.name]);

// --- the day ----------------------------------------------------------------

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

/** The street networks on a board, each with its squares, its gates and the sides it leaves by. */
export const highways = (board) => networksOf(boardCity(board)).list;

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

/** A piece's squares at turn `rot`, each knowing which of the piece's own squares it is (`i`). */
export const tagged = (piece, rot) => turnPiece({ cells: piece.cells.map((c, i) => ({ ...c, i })) }, rot);

/** Is this piece the aqueduct, laid over the city rather than on it? */
export const isAbove = (piece) => !!TILES[piece?.cells?.[0]?.type]?.above;

// --- the mode ----------------------------------------------------------------

export class Stara extends Mode {
  get side() { return this.spec.side; }
  /** The plan's squares: the Comune and every place piece. */
  get squares() { return this.side * this.side; }

  /** The day's plan, and the pieces cut from it in the order they are dealt. */
  deck() {
    const g = this.game;
    this.spring = springFor(g.seed, this.side);
    this.level = makeLevel(g.seed, this.side, this.spring);
    this.pieces = this.level.pieces;
    // The pile is dealt from the END.
    return this.level.order.slice().reverse();
  }

  seeds() { return [{ x: 0, y: 0, id: COMUNE, rot: 0 }]; }

  setup() {
    this.day = staraDay(new Date(), this.side);
    this.spring ||= springFor(this.game.seed, this.side);
    // THE WATER LAYER: the aqueduct's spans, by square, over the city.
    this.water = { spring: { x: this.spring.x, y: this.spring.y }, spans: new Map(), version: 0 };
    this.hand = [];
    this.sel = 0;
    this.rots = {};
    this.lifts = 0;
    this.laid = new Map();
    this.par = this.level.par;
    this.rescore();
  }

  /** Changes whenever the board or the water does: what caches key on. */
  get version() { return `${this.game.board.version}.${this.water.version}`; }

  /** Work the city out again: the score is its worth, less a point for every lift. */
  rescore() {
    this.city = appraise(this.game.board, this.water);
    this.game.players[0].score = this.city.total - this.lifts * RULES.lift;
    this.tally = { ...this.city.ways, lifts: -this.lifts * RULES.lift };
  }

  /** How many pieces you hold. */
  get handSize() { return RULES.hand; }

  /** The piece in hand that is held up. */
  get held() { return this.pieces[this.hand[this.sel]] || null; }

  /**
   * The mode deals its own pieces (the host asks this instead of drawing):
   * fill the hand back up to three from the pile and hold up whichever was
   * held before. Nothing is set aside: every piece has its square in the
   * plan, and one that fits nowhere now waits in your hand. With nothing in
   * hand and nothing in the pile, the day is done.
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
  signature() { return `${this.hand.join('.')}/${this.sel}/${this.version}/${this.lifts}`; }

  finalFarms = false;
  onClosed() {}

  // --- laying a piece ---------------------------------------------------------

  /** The held piece's squares at turn `rot` (the game's turn, by default). */
  shape(rot = this.game.rot, piece = this.held) { return piece ? turnPiece(piece, rot) : []; }

  /**
   * Can these squares of a PLACE go down with their top left at (ax, ay)?
   * Every square empty (the aqueduct over a square does not fill it), every
   * edge meeting what is already there (the piece's own seams were cut to
   * meet), and the piece touching a square already built. There is no
   * border.
   */
  placeFits(ax, ay, cells) {
    const b = this.game.board;
    const own = new Set(cells.map((c) => keyOf(ax + c.dx, ay + c.dy)));
    const sp = this.water.spring;
    for (const c of cells) {
      const x = ax + c.dx, y = ay + c.dy;
      if (b.get(x, y) || (x === sp.x && y === sp.y)) return false;
    }
    let touches = false;
    for (const c of cells) {
      const x = ax + c.dx, y = ay + c.dy;
      const probe = { x, y, type: TILES[c.type], rot: c.rot };
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
   * Can these spans of AQUEDUCT go up with their top left at (ax, ay)? Over
   * anything, built or not, but never over a span already up or the spring
   * itself; and touching the city (over it or beside it), the spring, or a
   * span already up.
   */
  spanFits(ax, ay, cells) {
    const b = this.game.board, sp = this.water.spring, spans = this.water.spans;
    let touches = false;
    for (const c of cells) {
      const x = ax + c.dx, y = ay + c.dy;
      if (spans.has(keyOf(x, y)) || (x === sp.x && y === sp.y)) return false;
      if (b.get(x, y)) touches = true;
      for (const [dx, dy] of SIDE_STEP) {
        const nx = x + dx, ny = y + dy;
        if (b.get(nx, ny) || spans.has(keyOf(nx, ny)) || (nx === sp.x && ny === sp.y)) touches = true;
      }
    }
    return touches;
  }

  /** Can these squares of `piece` go down (or up) with their top left at (ax, ay)? */
  fitsAt(ax, ay, cells, piece = this.held) {
    return isAbove(piece) ? this.spanFits(ax, ay, cells) : this.placeFits(ax, ay, cells);
  }

  /**
   * The city as it would be with these squares of `piece` at (ax, ay),
   * without touching the board: the scorer reads lists of squares and
   * spans, so a trial is the board's lists and the piece's. The board's are
   * kept until either changes.
   */
  trialCity(piece, ax, ay, cells) {
    const b = this.game.board;
    if (this.baseKey !== this.version || this.baseBoard !== b) {
      this.baseKey = this.version;
      this.baseBoard = b;
      this.base = [...b.cells.values()].map(entryOf);
      this.baseSpans = [...this.water.spans.values()];
    }
    if (isAbove(piece)) {
      const extra = cells.map((c) => spanEntry(ax + c.dx, ay + c.dy, c.type, c.rot, piece.id));
      return cityOf(this.base, [...this.baseSpans, ...extra], this.water.spring, this.water.land || null);
    }
    const extra = cells.map((c) => entryOf({ x: ax + c.dx, y: ay + c.dy, type: TILES[c.type], rot: c.rot, piece: piece.id }));
    return cityOf([...this.base, ...extra], this.baseSpans, this.water.spring, this.water.land || null);
  }

  /** The squares a piece might touch from: where to look for ways to lay it. */
  touchSquares(piece) {
    const b = this.game.board;
    const out = new Map();
    const add = (x, y) => out.set(keyOf(x, y), { x, y });
    for (const f of b.frontier()) add(f.x, f.y);
    if (isAbove(piece)) {
      for (const c of b.cells.values()) add(c.x, c.y);
      const sp = this.water.spring;
      for (const s of [...this.water.spans.values(), sp]) for (const [dx, dy] of SIDE_STEP) add(s.x + dx, s.y + dy);
    }
    return [...out.values()];
  }

  /**
   * Every way the held piece fits with one of its squares on (x, y), at any
   * of its four turns: `{ax, ay, rot, grip, cells}`, its top left, its turn,
   * which of its squares is on (x, y), and its squares at that turn.
   */
  fitsOver(x, y, piece = this.held) {
    const out = [];
    if (!piece) return out;
    for (let rot = 0; rot < 4; rot++) {
      const cells = tagged(piece, rot);
      for (const c of cells) {
        const ax = x - c.dx, ay = y - c.dy;
        if (this.fitsAt(ax, ay, cells, piece)) out.push({ ax, ay, rot, grip: c.i, cells });
      }
    }
    return out;
  }

  /**
   * THE BEST WAY DOWN over (x, y) (2026-11-27: "make it so that the
   * calculation for where a tile goes is done based on all four of its
   * orientations, not just the one you currently are on. And when you put
   * it down, it just automatically snaps to whatever might work the best
   * for it"): of every way the piece fits with one of its squares on
   * (x, y), any turn, the one that leaves the city worth most. Between two
   * as good, the turn it is held at, then the square it is held by. Null
   * where it fits no way over (x, y). Kept until the question changes,
   * since a mouse over the table asks it every frame.
   */
  bestAt(x, y, { rot = this.game.rot, grip = null, piece = this.held } = {}) {
    if (!piece) return null;
    const key = `${piece.id}|${x},${y}|${rot}|${grip}|${this.version}`;
    if (this.bestKey === key) return this.bestValue;
    let best = null;
    for (const f of this.fitsOver(x, y, piece)) {
      const v = appraiseCity(this.trialCity(piece, f.ax, f.ay, f.cells)).total;
      const pref = (f.rot === rot ? 2 : 0) + (f.grip === grip ? 1 : 0);
      if (!best || v > best.v || (v === best.v && pref > best.pref)) best = { ...f, v, pref };
    }
    this.bestKey = key;
    this.bestValue = best;
    return best;
  }

  /**
   * Where the held piece goes when it is put down over (x, y) at turn
   * `rot`, held by square `grip` of it (an index into its squares; its
   * middle, by default): its top left, its turn, the square it is held by,
   * and whether it fits there. With `magnet` (a tap, or a piece let go of)
   * it goes the best way it fits over (x, y), any turn (bestAt); without
   * (while it is being dragged) exactly where it is put. One that fits no
   * way over (x, y) stays where it was put, not fitting (the seventh pass:
   * "really freeform").
   */
  stageAt(x, y, rot = this.game.rot, { grip = null, magnet = true, piece = this.held } = {}) {
    if (!piece) return null;
    const cells = tagged(piece, rot);
    const g = (grip != null && cells.find((c) => c.i === grip)) || gripOf(cells);
    const at = { x, y, rot, ax: x - g.dx, ay: y - g.dy, grip: g.i };
    if (magnet) {
      const b = this.bestAt(x, y, { rot, grip: g.i, piece });
      if (b) return { x, y, rot: b.rot, ax: b.ax, ay: b.ay, grip: b.grip, fits: true };
    }
    return { ...at, fits: this.fitsAt(at.ax, at.ay, cells, piece) };
  }

  /**
   * A staged piece turned a quarter (or back), about the square it is held
   * by: that square stays where it is and the rest swings round it, so the
   * piece turns in place. Not moved to fit: it shows whether it does.
   */
  turnStaged(p, dir = 1) {
    const cells = tagged(this.held, p.rot);
    const g = cells.find((c) => c.i === p.grip) || gripOf(cells);
    return this.stageAt(p.ax + g.dx, p.ay + g.dy, (p.rot + dir + 4) % 4, { grip: g.i, magnet: false });
  }

  /** Every way the held piece can go down now: `{x, y, rot, cells}`, its top left. */
  placements(piece = this.held, rots = [0, 1, 2, 3]) {
    const out = [];
    if (!piece) return out;
    const seen = new Set();
    const touch = this.touchSquares(piece);
    for (const rot of rots) {
      const cells = turnPiece(piece, rot);
      const sig = JSON.stringify(cells.map((c) => [c.dx, c.dy, c.type, c.rot]));
      if (seen.has(sig)) continue;
      seen.add(sig);
      const tried = new Set();
      for (const { x, y } of touch) {
        for (const c of cells) {
          const ax = x - c.dx, ay = y - c.dy, k = `${ax},${ay}`;
          if (tried.has(k)) continue;
          tried.add(k);
          if (this.fitsAt(ax, ay, cells, piece)) out.push({ x: ax, y: ay, rot, cells });
        }
      }
    }
    return out;
  }

  /**
   * Every square the held piece could cover, any of its four turns: the
   * squares lit for it (2026-11-27: "based on all four of its orientations,
   * not just the one you currently are on").
   */
  litSquares() {
    const key = `${this.hand[this.sel]}|${this.version}`;
    if (this.litKey === key) return this.litValue;
    const out = new Set();
    for (const p of this.placements(this.held)) for (const c of p.cells) out.add(keyOf(p.x + c.dx, p.y + c.dy));
    this.litKey = key;
    this.litValue = out;
    return out;
  }

  /** Can this piece go down anywhere at all, any way round? Stops at the first way. */
  fitsAnywhere(piece) {
    const touch = this.touchSquares(piece);
    for (let rot = 0; rot < 4; rot++) {
      const cells = turnPiece(piece, rot);
      for (const { x, y } of touch) for (const c of cells) if (this.fitsAt(x - c.dx, y - c.dy, cells, piece)) return true;
    }
    return false;
  }

  /** Does anything in hand fit anywhere? If not, lift something or end the day. */
  anyFits() {
    return this.hand.some((id) => this.fitsAnywhere(this.pieces[id]));
  }

  /** The host asks this for each square: can the held piece go over (x, y), any way round? */
  canPlaceAt(x, y) {
    if (this.game.phase !== 'place' || !this.held) return false;
    return this.fitsOver(x, y).length > 0;
  }

  /** Lay the held piece over (x, y), the best way it fits there (the workshop's click, and Enter). */
  placeAt(x, y) {
    const g = this.game;
    if (g.phase !== 'place' || !this.held) return false;
    const at = this.stageAt(x, y);
    if (!at?.fits) return false;
    return this.lay(this.held, at.ax, at.ay, at.rot);
  }

  /** Lay the held piece with its top left at (ax, ay), turned `rot`: a staged piece, sealed. */
  layAnchored(ax, ay, rot) {
    if (this.game.phase !== 'place' || !this.held) return false;
    return this.lay(this.held, ax, ay, rot);
  }

  /** Put piece `piece` down (or up, an aqueduct) with its top left at (ax, ay), turned `rot`. */
  lay(piece, ax, ay, rot) {
    const g = this.game, b = g.board;
    const cells = turnPiece(piece, rot);
    if (!this.fitsAt(ax, ay, cells, piece)) return false;
    let laid;
    if (isAbove(piece)) {
      laid = cells.map((c) => {
        const x = ax + c.dx, y = ay + c.dy;
        const s = { ...spanEntry(x, y, c.type, c.rot, piece.id), type: c.type, rot: c.rot };
        this.water.spans.set(keyOf(x, y), s);
        return s;
      });
      this.water.version++;
    } else {
      laid = cells.map((c) => {
        const cell = b.place(ax + c.dx, ay + c.dy, TILES[c.type], c.rot, { owner: 0 });
        cell.piece = piece.id;
        return cell;
      });
    }
    this.laid.set(piece.id, { x: ax, y: ay, rot });
    const i = this.hand.indexOf(piece.id);
    if (i >= 0) this.hand.splice(i, 1);
    delete this.rots[piece.id];
    g.lastPlaced = b.get(laid[0].x, laid[0].y) || laid[0];
    g.tile = null;
    g.tileKey = null;
    // Sealed where it sits: it does not fly in from anywhere. An aqueduct is
    // not a board cell, so nothing on the board is veiled for it.
    if (!isAbove(piece)) g.emit('place', { cells: laid, still: true });
    const was = this.city;
    this.rescore();
    this.announce(was, laid);
    g.say(`${this.nameOf(piece.id)} at (${ax}, ${ay}): ${this.signed(this.city.total - was.total)}, the city is worth ${this.city.total}.`);
    g.endTurn();
    return true;
  }

  signed(n) { return `${n >= 0 ? '+' : '−'}${Math.abs(n)}`; }

  /** Each square whose worth changed says by how much, where it stands; and the wall and the high roads. */
  announce(was, laid) {
    const g = this.game;
    for (const [k, now] of this.city.per) {
      const d = now.pts - (was.per.get(k)?.pts || 0);
      if (!d) continue;
      const [x, y] = k.split(',').map(Number);
      g.emit('score', { points: d, players: [0], at: { x: x + 0.5, y: y + 0.5 } });
    }
    const mid = { x: laid[0].x + 0.5, y: laid[0].y + 0.5 };
    const wall = this.city.ways.wall - was.ways.wall;
    if (wall) g.emit('score', { points: wall, players: [0], at: { x: mid.x, y: mid.y - 0.3 } });
    const roads = this.city.ways.roads - was.ways.roads;
    if (roads) {
      const best = [...this.city.roads].sort((a, b) => b.pts - a.pts)[0];
      const [x, y] = (best?.tiles[0] || `${laid[0].x},${laid[0].y}`).split(',').map(Number);
      g.emit('score', { points: roads, players: [0], at: { x: x + 0.5, y: y + 0.5 } });
    }
  }

  // --- lifting a piece --------------------------------------------------------

  /**
   * The piece on top at (x, y), if it is one you may lift (never the
   * Comune): the aqueduct over a square before the place under it.
   */
  pieceAt(x, y) {
    const span = this.water.spans.get(keyOf(x, y));
    if (span && this.laid.has(span.piece)) return span.piece;
    const id = this.game.board.get(x, y)?.piece;
    return id != null && this.laid.has(id) ? id : null;
  }

  /** The squares a laid piece stands on (or over). */
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
    const at = this.laid.get(id);
    if (isAbove(this.pieces[id])) {
      for (const s of this.squaresOf(id)) this.water.spans.delete(keyOf(s.x, s.y));
      this.water.version++;
    } else {
      for (const s of this.squaresOf(id)) g.board.remove(s.x, s.y, { quiet: true });
      g.board.rebuild();
    }
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

  /** Anything still to lay? The day is done when the hand and the pile are empty, or it is ended. */
  anythingLeft() {
    return this.hand.length > 0 || this.game.deck.length > 0;
  }

  finish() {
    const g = this.game;
    for (const r of this.city.roads) g.say(`A high road out on ${r.sides} sides → ${r.pts}`);
    const lifts = this.lifts ? `, less ${this.lifts} for lifting` : '';
    g.say(`Starà No. ${this.day.n}, ${this.side}×${this.side}: the city is worth ${this.city.total}${lifts}, its wall ${this.city.wall.length} long; the plan was worth ${this.par}.`);
  }

  /**
   * Where the city is on the table: the squares built, the aqueduct's and
   * the spring's, as a box (`minX` to `maxX` inclusive). The screen keeps it
   * in view.
   */
  extent() {
    const b = this.game.board;
    const pts = [...b.cells.values(), ...this.water.spans.values(), this.water.spring];
    return {
      minX: Math.min(...pts.map((p) => p.x)), maxX: Math.max(...pts.map((p) => p.x)),
      minY: Math.min(...pts.map((p) => p.y)), maxY: Math.max(...pts.map((p) => p.y)),
    };
  }

  // --- the plan ---------------------------------------------------------------

  /** The day's plan as a board and a water layer of its own, to be looked at once the day is over. */
  planBoard() {
    if (this.planned) return this.planned;
    const B = this.game.board;
    const b = new B.constructor({});
    const water = { spring: this.water.spring, spans: new Map(), version: 0 };
    b.place(0, 0, TILES[COMUNE], 0, {});
    for (const p of this.level.plan) {
      const piece = this.pieces[p.id];
      for (const c of piece.cells) {
        const x = p.x + c.dx, y = p.y + c.dy;
        if (isAbove(piece)) { water.spans.set(keyOf(x, y), { ...spanEntry(x, y, c.type, c.rot, p.id), type: c.type, rot: c.rot }); continue; }
        const cell = b.place(x, y, TILES[c.type], c.rot, { owner: 0 });
        cell.piece = p.id;
      }
    }
    this.planned = { board: b, water };
    return this.planned;
  }

  /**
   * Show the plan on the table instead of your city, or your city again.
   * Only once the day is over: it would give the puzzle away.
   */
  showPlan(on) {
    const g = this.game;
    if (g.phase !== 'over') return false;
    if (on && !this.mine) {
      this.mine = { board: g.board, water: this.water, city: this.city };
      const plan = this.planBoard();
      g.board = plan.board;
      this.water = plan.water;
      this.city = appraise(g.board, this.water);
    } else if (!on && this.mine) {
      g.board = this.mine.board;
      this.water = this.mine.water;
      this.city = this.mine.city;
      this.mine = null;
    }
    return true;
  }

  get showingPlan() { return !!this.mine; }

  // --- what the picture and the interface ask -----------------------------------

  /**
   * How a square looks: its place, whether it is watered (its fountain
   * plays), which sides it joins the rest of its piece on, and which piece it
   * is (so a piece's squares are drawn as one place).
   */
  lookOf(cell) {
    const k = keyOf(cell.x, cell.y);
    const wet = this.city?.per.get(k)?.wet ? 'w' : '';
    const b = this.game.board;
    let joined = '';
    if (cell.piece != null) {
      for (let s = 0; s < 4; s++) if (b.get(cell.x + SIDE_STEP[s][0], cell.y + SIDE_STEP[s][1])?.piece === cell.piece) joined += s;
    }
    return lookString(kindOf(cell), wet, joined, cell.piece);
  }

  /** The aqueduct's spans as they stand, each with whether water runs in it. */
  spansNow() {
    return [...this.water.spans.values()].map((s) => ({ ...s, run: this.city.running.has(keyOf(s.x, s.y)) }));
  }

  /**
   * What the held piece would do with its top left at (ax, ay), turned
   * `rot`: whether it fits; how each of its squares would look; and, where
   * it fits, the city's worth after, the difference by way, every square
   * whose worth would change (with by how much, and which way most), where
   * the piece's own points come from, and the stretches of wall it would
   * add. Worked out once per place and turn (the staged piece is drawn every
   * frame).
   */
  preview(ax, ay, rot) {
    const g = this.game, piece = this.held;
    if (!piece) return null;
    const key = `${piece.id}|${ax},${ay}|${rot}|${this.version}`;
    if (this.previewKey === key) return this.previewValue;
    const cells = this.shape(rot, piece);
    const above = isAbove(piece);
    const fits = this.fitsAt(ax, ay, cells, piece);
    const mine = new Set(cells.map((c) => keyOf(ax + c.dx, ay + c.dy)));
    let after = null;
    if (fits) after = appraiseCity(this.trialCity(piece, ax, ay, cells), { sources: true });
    const looks = cells.map((c) => {
      const lx = ax + c.dx, ly = ay + c.dy, k = keyOf(lx, ly);
      let joined = '';
      for (let s = 0; s < 4; s++) if (mine.has(keyOf(lx + SIDE_STEP[s][0], ly + SIDE_STEP[s][1]))) joined += s;
      const flags = after?.per.get(k)?.wet ? 'w' : '';
      return {
        x: lx, y: ly, rot: c.rot, type: TILES[c.type], look: lookString(piece.kind, flags, joined, piece.id),
        span: above ? spanEntry(lx, ly, c.type, c.rot).span : 0, run: !!after?.running.has(k),
      };
    });
    let out = { x: ax, y: ay, rot, above, fits, cells: looks };
    if (fits) {
      const changes = [];
      for (const [k, now] of after.per) {
        if (mine.has(k) && !above) continue;
        const was = this.city.per.get(k);
        const d = now.pts - (was?.pts || 0);
        if (!d) continue;
        const [cx, cy] = k.split(',').map(Number);
        let way = 'houses', most = 0;
        for (const w of WAYS) {
          const dw = (now.ways[w.id] || 0) - (was?.ways[w.id] || 0);
          if (Math.abs(dw) > most) { most = Math.abs(dw); way = w.id; }
        }
        changes.push({ x: cx, y: cy, d, way });
      }
      const ways = {};
      for (const w of WAYS) ways[w.id] = (after.ways[w.id] || 0) - (this.city.ways[w.id] || 0);
      const from = [];
      for (const k of mine) for (const f of after.per.get(k)?.from || []) from.push({ ...f, for: k });
      // The wall it would add: stretches in the new city that were not there.
      const had = new Set(this.city.wall.map((w) => `${w.x},${w.y},${w.s}`));
      const wallAdded = after.wall.filter((w) => !had.has(`${w.x},${w.y},${w.s}`));
      out = {
        ...out, total: after.total, gain: after.total - this.city.total, ways, changes, from, wallAdded,
        wet: looks.some((l) => after.per.get(keyOf(l.x, l.y))?.wet),
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

  // --- advice for the computer player -----------------------------------------

  /** What laying these cells is worth: what they add to the city, all of it. */
  botPlaceBonus() {
    return appraise(this.game.board, this.water).total - this.city.total;
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
        const v = appraiseCity(this.trialCity(piece, m.x, m.y, m.cells)).total;
        if (!best || v > best.v) best = { i, v, x: m.x, y: m.y, rot: m.rot };
      }
    });
    return best;
  }

  status() {
    return `No. ${this.day.n} · ${this.laid.size} of ${Object.keys(this.pieces).length} pieces`;
  }

  panel() {
    const g = this.game, p = g.players[0];
    return `
      <div class="advTop"><span>Starà No. ${this.day.n}, ${this.side}×${this.side}</span><span>Worth <b>${p.score}</b> of ${this.par}</span></div>
      <div class="advTop"><span>A wall ${this.city.wall.length} long</span><span>${this.hand.length} in hand, ${g.deck.length} in the pile</span></div>
      <p class="hint">${this.spec.hint}</p>`;
  }
}

/** A square's look, for city.js: place and water flags, then the sides it joins its piece on, then the piece. */
export function lookString(kind, flags, joined, piece) {
  return `${kind}${flags}|j${joined}|p${piece ?? ''}`;
}

/** The two sizes, as two daily puzzles: 7 x 7 is `stara`, 5 x 5 `stara5`. */
function specFor(side, Mode) {
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
    // The city's own pictures (src/city.js), and the wall round it (castle.js).
    city: true,
    inked: true,
    antique: true,
    seedFor: () => staraDay(new Date(), side).seed,
    playerName: () => 'You',
    opening: `Today's city, a ${side}×${side} plan. The wall goes up round whatever you build, and every stretch of it costs a point.`,
    hint: `Daily and solo: a city-state on an open table, dealt as pieces of one to four squares, the architect's ${side}×${side} plan cut up. Hold three; drag a piece where you want it (it settles the best way it fits there, any way round), turn it with the turn button (or tap it), and hold it to seal it down. Drag the table to look about it; pinch or scroll to zoom. Streets must meet streets. Only houses score: 1 a square, +1 beside a plaza (the Comune is one), +1 watered, +1 beside the cathedral. The aqueduct goes over anything, carrying water in from the spring. The wall goes round whatever is built, and every stretch of it costs 1. A street out of the city is a gate; one street out on two or more of the city's sides is a high road, 4 a side. Hold a laid piece to lift it back for a point. The architect's plan for the day is the target.`,
  };
}

export class Stara5 extends Stara {}

Stara.spec = specFor(7, Stara);
Stara5.spec = specFor(5, Stara5);

/** Every Starà size, smallest first, for the size switch. */
export const STARA_SIZES = [Stara5.spec, Stara.spec];
