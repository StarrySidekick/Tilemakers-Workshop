// ---------------------------------------------------------------------------
// Starà's level maker: the day's PLAN, and the pieces cut from it.
//
// Timothy, 2026-11-27: "5x5 levels should have 25 tiles, and it's about the
// order you place them and where that the skill lies. this means there is a
// layout of the 5x5 tile grid of tiles that is theoretically 'perfect' in
// that it has the highest possible point count. so when we are making a
// level, we have to make sure there is a layout of tiles that is like this
// so the player has the correct set of tiles to reach towards this
// perfection." And "tiles can be more than one tile big, sort of like
// tetris."
//
// So a day is made the other way round from a deck. The level maker draws a
// whole city first, the way an architect draws a plan, and cuts the deal
// from it:
//
//   1. THE WATER. From the day's arch in the wall, a course of aqueduct a
//      few squares long, walked toward the middle (so its water can reach
//      the Comune's fountain).
//   2. THE PIECES. The rest of the square, less the Comune in the middle, cut
//      into pieces of one to four squares (Tetris's shapes, and smaller).
//   3. THE PLACES. One place to each piece: the day's cast (its faith,
//      defence, industry and wonder), then houses, farms, gardens, plazas,
//      markets and churches in their usual shares, each only on a piece of a
//      size it can be.
//   4. THE STREETS. A street net grown out from the Comune, out through some
//      of the gates.
//   5. THE SEARCH. Thousands of small changes, kept when the city is worth
//      more: two pieces swap places' kinds, a street is laid or taken up
//      across one edge, or a whole street is laid from a town gate to the
//      Comune. What it ends on is the PLAN, and its worth is the day's target.
//   6. THE DEAL. The pieces, in an order the plan can be built in holding
//      three (a piece is laid against the wall or beside one already down).
//
// Every piece's streets come from the one street net, so the plan always
// fits together edge to edge: the deal can always fill the square, and
// whatever the plan is worth, a player can reach.
//
// Is the plan the best city those pieces can make? Not provably. Measured
// (MODES.md, the sixth pass): a 5 x 5 deal has from tens of thousands to
// millions of complete arrangements, too many to try in a browser, so the
// plan is the best the search found. A player who beats it is told so.
//
// Deterministic: only integer arithmetic, comparisons and the seeded PRNG
// below decide anything (no Math.exp, whose last bits differ between
// browsers), so everyone's phone makes the same city from the same seed.
// ---------------------------------------------------------------------------

import { SIDE_STEP, opposite } from '../tiles.js';
import { PLACES, CAST, appraiseCity, cityOf, tileFor, gatesOf, archSquare, sidesOf } from './stara-city.js';

/** A small seeded PRNG of the mode's own. */
export function rngOf(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tetris's shapes, and the smaller ones, as cells [x, y], by size. */
const POLY = {
  1: [[[0, 0]]],
  2: [[[0, 0], [1, 0]]],
  3: [[[0, 0], [1, 0], [2, 0]], [[0, 0], [1, 0], [0, 1]]],
  4: [
    [[0, 0], [1, 0], [2, 0], [3, 0]],          // I
    [[0, 0], [1, 0], [0, 1], [1, 1]],          // O
    [[0, 0], [1, 0], [2, 0], [1, 1]],          // T
    [[0, 0], [0, 1], [0, 2], [1, 2]],          // L
    [[1, 0], [1, 1], [1, 2], [0, 2]],          // J
    [[1, 0], [2, 0], [0, 1], [1, 1]],          // S
    [[0, 0], [1, 0], [1, 1], [2, 1]],          // Z
  ],
};

/** Every distinct way round a shape can lie, normalised to its top left. */
function orientations(cells) {
  const out = [], seen = new Set();
  let c = cells;
  for (let k = 0; k < 4; k++) {
    const mx = Math.min(...c.map((p) => p[0])), my = Math.min(...c.map((p) => p[1]));
    const n = c.map(([x, y]) => [x - mx, y - my]).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
    const sig = JSON.stringify(n);
    if (!seen.has(sig)) { seen.add(sig); out.push(n); }
    c = c.map(([x, y]) => [-y, x]);
  }
  return out;
}
const LIES = Object.fromEntries(Object.entries(POLY).map(([n, shapes]) => [n, shapes.flatMap(orientations)]));

/**
 * How the day is cut, by size: the squares the aqueduct's course takes, the
 * sizes of the other pieces, and how many pieces of each kind of the cast a
 * place that is not one of a kind comes as.
 */
const CUTS = {
  5: { water: 3, bag: [4, 3, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1], cast: 2, steps: 2600 },
  7: { water: 5, bag: [4, 4, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1], cast: 3, steps: 3400 },
};

const keyOf = (x, y) => `${x},${y}`;

function shuffle(list, r) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

/**
 * The day's plan and deal, for a square `side` across. `cast` is the day's
 * cast ({faith: 'cathedral', ...}) and `arch` where its water comes in.
 *
 * Returns `{pieces, order, plan, par, ways}`: `pieces` by id, each
 * `{id, kind, cells: [{dx, dy, type, rot}]}` lying the way the plan lays it;
 * `order` the deal, first drawn first; `plan` where each piece goes
 * (`{id, x, y}`, its top left, unturned); `par` what the plan is worth.
 */
export function makeLevel(seed, side, cast, arch) {
  const cut = CUTS[side] || CUTS[7];
  const r = rngOf(seed ^ 0x5EA1ED);
  const R = (side - 1) / 2;
  const bounds = { minX: -R, maxX: R, minY: -R, maxY: R };
  const inB = (x, y) => x >= -R && x <= R && y >= -R && y <= R;

  for (let attempt = 0; attempt < 40; attempt++) {
    const owner = new Map([[keyOf(0, 0), 'comune']]);
    // 1. The water's course, from the arch toward the middle.
    const course = waterCourse(r, bounds, arch, cut.water, inB);
    if (!course) continue;
    const pieces = [];
    for (let i = 0; i < course.length;) {
      const n = Math.min(course.length - i, 1 + Math.floor(r() * 3));
      const id = `p${pieces.length}`;
      const cells = course.slice(i, i + n);
      for (const c of cells) owner.set(keyOf(c.x, c.y), id);
      pieces.push({ id, kind: 'aqueduct', squares: cells.map((c) => ({ x: c.x, y: c.y, span: c.span })) });
      i += n;
    }
    // 2. The rest, cut into pieces.
    const cutUp = partition(r, side, R, owner, shuffle(cut.bag.slice(), r).sort((a, b) => b - a));
    if (!cutUp) continue;
    for (const sq of cutUp) {
      const id = `p${pieces.length}`;
      for (const c of sq) owner.set(keyOf(c.x, c.y), id);
      pieces.push({ id, kind: null, squares: sq.map((c) => ({ x: c.x, y: c.y })) });
    }
    // 3. The places.
    if (!assignPlaces(r, pieces, cast, cut)) continue;
    // 4 and 5. The streets, and the search.
    const plan = new Plan(bounds, arch, pieces, owner);
    plan.growStreets(r);
    plan.search(r, cut.steps);
    // 6. The deal.
    const built = plan.pieces();
    const order = dealOrder(r, built, bounds);
    if (!order) continue;
    const city = plan.appraise();
    return {
      pieces: Object.fromEntries(built.map((p) => [p.id, { id: p.id, kind: p.kind, cells: p.cells }])),
      order,
      plan: built.map((p) => ({ id: p.id, x: p.x, y: p.y })),
      par: city.total,
      ways: city.ways,
    };
  }
  throw new Error(`Starà: no plan for seed ${seed}`);
}

/** The aqueduct's course: `n` squares from the arch's, each span opening onto the last. */
function waterCourse(r, b, arch, n, inB) {
  const start = archSquare(b, arch);
  for (let tries = 0; tries < 30; tries++) {
    const path = [{ x: start.x, y: start.y, from: arch.s }];
    const used = new Set([keyOf(start.x, start.y), keyOf(0, 0)]);
    while (path.length < n) {
      const at = path[path.length - 1];
      const steps = [0, 1, 2, 3].filter((s) => {
        const x = at.x + SIDE_STEP[s][0], y = at.y + SIDE_STEP[s][1];
        return inB(x, y) && !used.has(keyOf(x, y)) && s !== at.from;
      });
      if (!steps.length) break;
      // Toward the middle, mostly.
      steps.sort((s1, s2) => {
        const d = (s) => Math.abs(at.x + SIDE_STEP[s][0]) + Math.abs(at.y + SIDE_STEP[s][1]);
        return d(s1) - d(s2);
      });
      const s = r() < 0.75 ? steps[0] : steps[Math.floor(r() * steps.length)];
      at.to = s;
      const x = at.x + SIDE_STEP[s][0], y = at.y + SIDE_STEP[s][1];
      used.add(keyOf(x, y));
      path.push({ x, y, from: opposite(s) });
    }
    if (path.length < n) continue;
    const last = path[path.length - 1];
    last.to = opposite(last.from);
    return path.map((p) => ({ x: p.x, y: p.y, span: (1 << p.from) | (1 << p.to) }));
  }
  return null;
}

/** Cut the squares nobody owns into pieces of the bag's sizes, every square used. */
function partition(r, side, R, owner, bag) {
  const free = [];
  for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) if (!owner.has(keyOf(x, y))) free.push({ x, y });
  if (bag.reduce((a, b) => a + b, 0) !== free.length) {
    // The water took a different number of squares than planned: make it up in ones.
    const need = free.length - bag.reduce((a, b) => a + b, 0);
    if (need < 0) { for (let k = 0; k < -need; k++) { const i = bag.lastIndexOf(1); if (i < 0) return null; bag.splice(i, 1); } } else for (let k = 0; k < need; k++) bag.push(1);
  }
  const taken = new Set(owner.keys());
  const out = [];
  let budget = 20000;
  const left = bag.slice();
  const fill = () => {
    if (--budget < 0) return false;
    const first = free.find((c) => !taken.has(keyOf(c.x, c.y)));
    if (!first) return true;
    // Sizes in a shuffled order, so the big pieces are not all at the top.
    const sizes = shuffle([...new Set(left)], r);
    for (const n of sizes) {
      for (const lie of shuffle(LIES[n].slice(), r)) {
        const [fx, fy] = lie[0];
        const sq = lie.map(([x, y]) => ({ x: first.x + x - fx, y: first.y + y - fy }));
        if (!sq.every((c) => Math.abs(c.x) <= R && Math.abs(c.y) <= R && !taken.has(keyOf(c.x, c.y)))) continue;
        for (const c of sq) taken.add(keyOf(c.x, c.y));
        left.splice(left.indexOf(n), 1);
        out.push(sq);
        if (fill()) return true;
        out.pop();
        left.push(n);
        left.sort((a, b) => b - a);
        for (const c of sq) taken.delete(keyOf(c.x, c.y));
      }
    }
    return false;
  };
  return fill() ? out : null;
}

/** The day's cast first, then the everyday places in their shares, each on a piece it fits. */
function assignPlaces(r, pieces, cast, cut) {
  const open = pieces.filter((p) => !p.kind);
  const fits = (kind, p) => PLACES[kind].sizes.includes(p.squares.length);
  const take = (kind) => {
    const can = open.filter((p) => !p.kind && fits(kind, p));
    if (!can.length) return false;
    can[Math.floor(r() * can.length)].kind = kind;
    return true;
  };
  // The one-of-a-kind places first, so the single squares they need are
  // still there for them.
  const order = CAST.slice().sort((a, b) => (PLACES[cast[b.id]].one ? 1 : 0) - (PLACES[cast[a.id]].one ? 1 : 0));
  for (const c of order) {
    const kind = cast[c.id];
    const n = PLACES[kind].one ? 1 : cut.cast;
    for (let k = 0; k < n; k++) if (!take(kind)) return false;
  }
  const common = ['house', 'farm', 'garden', 'plaza', 'market', 'church'];
  const squares = open.filter((p) => !p.kind).reduce((a, p) => a + p.squares.length, 0);
  const want = Object.fromEntries(common.map((k) => [k, PLACES[k].share]));
  const sum = common.reduce((a, k) => a + want[k], 0);
  for (const k of common) want[k] = (want[k] / sum) * squares;
  const got = Object.fromEntries(common.map((k) => [k, 0]));
  const rest = open.filter((p) => !p.kind).sort((a, b) => b.squares.length - a.squares.length || r() - 0.5);
  for (const p of rest) {
    const can = common.filter((k) => fits(k, p));
    can.sort((a, b) => (want[b] - got[b]) - (want[a] - got[a]) || r() - 0.5);
    p.kind = can[0];
    got[p.kind] += p.squares.length;
  }
  return true;
}

/**
 * A plan being drawn: who owns each square, each piece's place, and the
 * street net, as a mask of sides per square. The aqueduct stands over a
 * street on every side and the keep has none; neither has a say in the
 * streets of the squares beside it, which meet them however they like.
 */
class Plan {
  constructor(bounds, arch, pieces, owner) {
    this.bounds = bounds;
    this.arch = arch;
    this.list = pieces;
    this.byId = new Map(pieces.map((p) => [p.id, p]));
    this.owner = owner;
    this.mask = new Map();
    this.span = new Map();
    for (const p of pieces) for (const s of p.squares) {
      this.mask.set(keyOf(s.x, s.y), p.kind === 'aqueduct' ? 15 : 0);
      if (s.span) this.span.set(keyOf(s.x, s.y), s.span);
    }
    this.mask.set(keyOf(0, 0), 15);
    // The edges a street can be laid across: between two squares neither of
    // which is the Comune (its four are always streets), and out through
    // each town gate. Edges onto an aqueduct or the keep belong to the other
    // square alone.
    this.edges = [];
    const R = bounds.maxX;
    for (let y = -R; y <= R; y++) {
      for (let x = -R; x <= R; x++) {
        for (const s of [1, 2]) {
          const nx = x + SIDE_STEP[s][0], ny = y + SIDE_STEP[s][1];
          if (nx > R || ny > R) continue;
          if ((x === 0 && y === 0) || (nx === 0 && ny === 0)) continue;
          if (this.fixed(x, y) && this.fixed(nx, ny)) continue;
          this.edges.push({ x, y, s });
        }
      }
    }
    for (const g of gatesOf(bounds)) if (!this.fixed(g.x, g.y)) this.edges.push({ x: g.x, y: g.y, s: g.s, gate: true });
    // The Comune's neighbours meet it with a street.
    for (let s = 0; s < 4; s++) this.lay(0, 0, s, true);
  }

  kindAt(x, y) {
    if (x === 0 && y === 0) return 'comune';
    return this.byId.get(this.owner.get(keyOf(x, y)))?.kind || null;
  }

  /** A square whose streets are its own (an aqueduct's, the keep's, the Comune's). */
  fixed(x, y) {
    const k = this.kindAt(x, y);
    return k === 'aqueduct' || k === 'keep' || k === 'comune';
  }

  has(x, y, s) { return !!(this.mask.get(keyOf(x, y)) & (1 << s)); }

  /** Is there a street across this edge? Asked of the square that owns it. */
  laid(e) {
    if (e.gate || !this.fixed(e.x, e.y)) return this.has(e.x, e.y, e.s);
    return this.has(e.x + SIDE_STEP[e.s][0], e.y + SIDE_STEP[e.s][1], opposite(e.s));
  }

  /** Lay (or take up) the street across side `s` of (x, y), on whichever squares own it. */
  lay(x, y, s, on) {
    const set = (cx, cy, side) => {
      if (this.fixed(cx, cy)) return;
      const k = keyOf(cx, cy);
      const m = this.mask.get(k) || 0;
      this.mask.set(k, on ? m | (1 << side) : m & ~(1 << side));
    };
    set(x, y, s);
    const nx = x + SIDE_STEP[s][0], ny = y + SIDE_STEP[s][1];
    if (Math.abs(nx) <= this.bounds.maxX && Math.abs(ny) <= this.bounds.maxX) set(nx, ny, opposite(s));
  }

  /**
   * The streets a square must have to meet its neighbours': where the keep
   * stood (it takes anything) a place must give a street to every street
   * that came to it. Toward an aqueduct or the wall, none.
   */
  meetNeighbours(x, y) {
    let m = 0;
    for (let s = 0; s < 4; s++) {
      const nx = x + SIDE_STEP[s][0], ny = y + SIDE_STEP[s][1];
      if (Math.abs(nx) > this.bounds.maxX || Math.abs(ny) > this.bounds.maxX) continue;
      const k = this.kindAt(nx, ny);
      if (k === 'aqueduct' || k === 'keep') continue;
      if (this.has(nx, ny, opposite(s))) m |= 1 << s;
    }
    return m;
  }

  /** A street net grown out from the Comune, with a loop or two, out through some gates. */
  growStreets(r) {
    const R = this.bounds.maxX;
    const reached = new Set([keyOf(0, 0)]);
    const edges = [];
    const out = (x, y) => { for (let s = 0; s < 4; s++) { const nx = x + SIDE_STEP[s][0], ny = y + SIDE_STEP[s][1]; if (Math.abs(nx) <= R && Math.abs(ny) <= R) edges.push([x, y, s]); } };
    out(0, 0);
    while (edges.length) {
      const [x, y, s] = edges.splice(Math.floor(r() * edges.length), 1)[0];
      const nx = x + SIDE_STEP[s][0], ny = y + SIDE_STEP[s][1];
      if (reached.has(keyOf(nx, ny))) { if (r() < 0.12) this.lay(x, y, s, true); continue; }
      const want = PLACES[this.kindAt(nx, ny)]?.streets;
      if (r() < (want === 'few' ? 0.35 : want === 'many' ? 0.95 : 0.7)) {
        this.lay(x, y, s, true);
        reached.add(keyOf(nx, ny));
        out(nx, ny);
      }
    }
    for (const e of this.edges) if (e.gate && r() < 0.6) this.lay(e.x, e.y, e.s, true);
  }

  /** The plan as the scorer reads a city. */
  city() {
    const entries = [];
    for (const [k, m] of this.mask) {
      const [x, y] = k.split(',').map(Number);
      const kind = this.kindAt(x, y);
      entries.push({
        x, y, kind, streets: kind === 'keep' ? 0 : m, span: this.span.get(k) || 0,
        arched: kind === 'aqueduct', keep: kind === 'keep', piece: this.owner.get(k),
      });
    }
    return cityOf(this.bounds, entries);
  }

  appraise() { return appraiseCity(this.city(), this.arch); }

  /**
   * How well the streets suit the places (a farm is not cut in four, a
   * plaza is where streets meet), for the search only: it never scores.
   */
  fit() {
    let f = 0;
    for (const p of this.list) {
      const want = PLACES[p.kind]?.streets;
      if (!want || want === 'any') continue;
      for (const s of p.squares) {
        const n = sidesOf(this.mask.get(keyOf(s.x, s.y)) || 0).length;
        if (want === 'few' && n > 1) f -= (n - 1);
        if (want === 'many' && n < 3) f -= (3 - n);
      }
    }
    return f;
  }

  /**
   * Thousands of small changes, kept when the city is worth more. A change
   * that loses a little is kept now and then early on (less and less often),
   * so the search can step off a small hill to find a bigger one; the best
   * city seen is the one it ends on.
   */
  search(r, steps) {
    const worth = () => this.appraise().total * 4 + this.fit();
    let now = worth();
    let best = now, bestState = this.save();
    const swappable = this.list.filter((p) => p.kind !== 'aqueduct');
    for (let i = 0; i < steps; i++) {
      const heat = 1 - i / steps;
      let undo;
      const roll = r();
      if (roll < 0.1) {
        // A whole street at once, from a town gate in to the Comune: one
        // edge at a time, a street that reaches a gate is worth nothing
        // until it is joined up, so the search would never find it.
        const masks = new Map(this.mask);
        if (!this.streetFromGate(r)) continue;
        undo = () => { this.mask = masks; };
      } else if (roll < 0.55 && swappable.length > 1) {
        const a = swappable[Math.floor(r() * swappable.length)], b = swappable[Math.floor(r() * swappable.length)];
        if (a === b || a.kind === b.kind) continue;
        if (!PLACES[a.kind].sizes.includes(b.squares.length) || !PLACES[b.kind].sizes.includes(a.squares.length)) continue;
        const masks = new Map(this.mask);
        const wasKeep = a.kind === 'keep' ? a : b.kind === 'keep' ? b : null;
        [a.kind, b.kind] = [b.kind, a.kind];
        // The keep has no streets of its own and takes any: the place that
        // takes its square gives a street to every street that came to it.
        if (wasKeep) {
          const now = wasKeep === a ? b : a;
          for (const s of now.squares) this.mask.set(keyOf(s.x, s.y), 0);
          for (const s of wasKeep.squares) this.mask.set(keyOf(s.x, s.y), this.meetNeighbours(s.x, s.y));
        }
        undo = () => { [a.kind, b.kind] = [b.kind, a.kind]; this.mask = masks; };
      } else {
        const e = this.edges[Math.floor(r() * this.edges.length)];
        if (this.fixed(e.x, e.y) && (e.gate || this.fixed(e.x + SIDE_STEP[e.s][0], e.y + SIDE_STEP[e.s][1]))) continue;
        const was = this.laid(e);
        this.lay(e.x, e.y, e.s, !was);
        undo = () => this.lay(e.x, e.y, e.s, was);
      }
      const next = worth();
      const loss = now - next;
      // Integer arithmetic and the PRNG only, so every browser agrees.
      if (loss <= 0 || r() < heat * 0.3 / (1 + loss)) {
        now = next;
        if (now > best) { best = now; bestState = this.save(); }
      } else undo();
    }
    this.load(bestState);
  }

  /**
   * Lay a street from one of the town gates to the Comune, by a shortest way
   * (ties broken by the PRNG), over any square but the keep's, which ends
   * streets. Under an aqueduct the street runs on, so it may pass beneath.
   */
  streetFromGate(r) {
    const gates = this.edges.filter((e) => e.gate);
    if (!gates.length) return false;
    const g = gates[Math.floor(r() * gates.length)];
    const R = this.bounds.maxX;
    const from = new Map([[keyOf(g.x, g.y), null]]);
    let todo = [[g.x, g.y]];
    while (todo.length && !from.has(keyOf(0, 0))) {
      const next = [];
      for (const [x, y] of todo) {
        for (const s of shuffle([0, 1, 2, 3], r)) {
          const nx = x + SIDE_STEP[s][0], ny = y + SIDE_STEP[s][1];
          if (Math.abs(nx) > R || Math.abs(ny) > R || from.has(keyOf(nx, ny))) continue;
          if (this.kindAt(nx, ny) === 'keep') continue;
          from.set(keyOf(nx, ny), [x, y, s]);
          next.push([nx, ny]);
        }
      }
      todo = next;
    }
    if (!from.has(keyOf(0, 0))) return false;
    this.lay(g.x, g.y, g.s, true);
    for (let at = from.get(keyOf(0, 0)); at; at = from.get(keyOf(at[0], at[1]))) this.lay(at[0], at[1], at[2], true);
    return true;
  }

  save() { return { mask: new Map(this.mask), kinds: this.list.map((p) => p.kind) }; }
  load(s) { this.mask = new Map(s.mask); this.list.forEach((p, i) => { p.kind = s.kinds[i]; }); }

  /** The pieces, cut from the plan: each square's tile and turn, from its top left. */
  pieces() {
    return this.list.map((p) => {
      const x = Math.min(...p.squares.map((s) => s.x)), y = Math.min(...p.squares.map((s) => s.y));
      const cells = p.squares.map((s) => {
        const k = keyOf(s.x, s.y);
        const t = tileFor(p.kind, p.kind === 'keep' ? 0 : this.mask.get(k), this.span.get(k) || 0);
        return { dx: s.x - x, dy: s.y - y, type: t.type, rot: t.rot };
      }).sort((a, b) => a.dy - b.dy || a.dx - b.dx);
      return { id: p.id, kind: p.kind, x, y, cells, squares: p.squares };
    });
  }
}

/**
 * The order the pieces are dealt in: shuffled, but always one the plan can be
 * built in, holding three. A piece can be laid where it touches the wall or
 * a square already built (the Comune is down from the start).
 */
function dealOrder(r, pieces, b) {
  for (let tries = 0; tries < 60; tries++) {
    const pile = shuffle(pieces.slice(), r);
    const built = new Set([keyOf(0, 0)]);
    const reaches = (p) => p.squares.some((s) => [0, 1, 2, 3].some((d) => {
      const x = s.x + SIDE_STEP[d][0], y = s.y + SIDE_STEP[d][1];
      return x < b.minX || x > b.maxX || y < b.minY || y > b.maxY || built.has(keyOf(x, y));
    }));
    const hand = [];
    let i = 0, ok = true;
    while (i < pile.length || hand.length) {
      while (hand.length < 3 && i < pile.length) hand.push(pile[i++]);
      const j = hand.findIndex(reaches);
      if (j < 0) { ok = false; break; }
      for (const s of hand[j].squares) built.add(keyOf(s.x, s.y));
      hand.splice(j, 1);
    }
    if (ok) return pile.map((p) => p.id);
  }
  return null;
}
