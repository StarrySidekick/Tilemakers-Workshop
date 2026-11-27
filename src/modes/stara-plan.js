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
// The seventh pass (later the same day) took the border away: the wall now
// hugs whatever is built and costs a point a stretch. The plan is still a
// square, because a square is the shortest wall round that many squares (a
// 5 x 5 city has 20 stretches, and no other shape of 25 has fewer); a
// player is free to build any shape, and pays for the wall it makes.
//
// So a day is made the other way round from a deck. The level maker draws a
// whole city first, the way an architect draws a plan, and cuts the deal
// from it:
//
//   1. THE PIECES. The square, less the Comune in the middle, cut into
//      pieces of one to four squares (Tetris's shapes, and smaller).
//   2. THE PLACES. One place to each piece: the cathedral and the day's
//      plazas on single squares, houses everywhere else.
//   3. THE STREETS. A street net grown out from the Comune, out through
//      some of the square's sides.
//   4. THE WATER. From the day's spring, two squares out from one side of
//      the square, an aqueduct over the country and on over the city toward
//      its middle. It is a layer over the city (the seventh pass): it takes
//      no square of it, and the plan's places stand under it.
//   5. THE SEARCH. Thousands of small changes, kept when the city is worth
//      more: a plaza or the cathedral swaps squares with a house, a street
//      is laid or taken up across one edge, a whole street is laid from a
//      side of the square to the Comune, or the aqueduct takes a new course.
//      What it ends on is the PLAN, and its worth is the day's target.
//   6. THE DEAL. The pieces, in an order the plan can be built in holding
//      three (a piece is laid beside one already down; an aqueduct beside
//      or over the city, the spring or another span).
//
// Every piece's streets come from the one street net, so the plan always
// fits together edge to edge: the deal can always build the square, and
// whatever the plan is worth, a player can reach.
//
// Is the plan the best city those pieces can make? Not provably: a 5 x 5
// deal has from tens of thousands to millions of complete arrangements in
// the square alone (measured in the sixth pass), and with no border there
// are more. The plan is the best the search found; a player who beats it is
// told so.
//
// Deterministic: only integer arithmetic, comparisons and the seeded PRNG
// below decide anything (no Math.exp, whose last bits differ between
// browsers), so everyone's phone makes the same city from the same seed.
// ---------------------------------------------------------------------------

import { SIDE_STEP, opposite } from '../tiles.js';
import { PLACES, appraiseCity, cityOf, tileFor, sidesOf } from './stara-city.js';

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
 * How the day is cut, by size: the sizes of the place pieces (they fill the
 * square round the Comune exactly), how many plazas, and how many squares
 * the aqueduct's course takes, the first of them out in the country.
 */
const CUTS = {
  5: { bag: [4, 4, 3, 2, 2, 2, 2, 1, 1, 1, 1, 1], plazas: 2, water: 4, steps: 2400 },
  7: { bag: [4, 4, 4, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], plazas: 4, water: 6, steps: 3200 },
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
 * Where the day's water rises: two squares out from one side of the plan's
 * square (0 N, 1 E, 2 S, 3 W), level with one of its squares but not a
 * corner, so the aqueduct has a span of open country to cross and comes
 * into the city along a side. The same for everyone.
 */
export function springFor(seed, side) {
  const r = rngOf(seed ^ 0xA9EDC7);
  const s = Math.floor(r() * 4);
  const R = (side - 1) / 2;
  const along = Math.floor(r() * (side - 2)) - R + 1;
  const out = R + 2;
  const at = [{ x: along, y: -out }, { x: out, y: along }, { x: along, y: out }, { x: -out, y: along }][s];
  return { ...at, s };
}

/**
 * The day's plan and deal, for a square `side` across, with the water
 * rising at `spring`.
 *
 * Returns `{pieces, order, plan, par, ways}`: `pieces` by id, each
 * `{id, kind, cells: [{dx, dy, type, rot}]}` lying the way the plan lays it;
 * `order` the deal, first drawn first; `plan` where each piece goes
 * (`{id, x, y}`, its top left, unturned); `par` what the plan is worth.
 */
export function makeLevel(seed, side, spring) {
  const cut = CUTS[side] || CUTS[7];
  const r = rngOf(seed ^ 0x5EA1ED);
  const R = (side - 1) / 2;

  for (let attempt = 0; attempt < 40; attempt++) {
    const owner = new Map([[keyOf(0, 0), 'comune']]);
    // 1. The square, cut into pieces.
    const cutUp = partition(r, R, owner, shuffle(cut.bag.slice(), r).sort((a, b) => b - a));
    if (!cutUp) continue;
    const pieces = [];
    for (const sq of cutUp) {
      const id = `p${pieces.length}`;
      for (const c of sq) owner.set(keyOf(c.x, c.y), id);
      pieces.push({ id, kind: null, squares: sq.map((c) => ({ x: c.x, y: c.y })) });
    }
    // 2. The places.
    if (!assignPlaces(r, pieces, cut)) continue;
    // 3, 4 and 5. The streets, the water, and the search.
    const plan = new Plan(R, spring, pieces, owner, cut.water);
    plan.growStreets(r);
    if (!plan.reroute(r)) continue;
    plan.search(r, cut.steps);
    // 6. The deal.
    const built = plan.pieces();
    const order = dealOrder(r, built, spring);
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

/** Cut the squares nobody owns into pieces of the bag's sizes, every square used. */
function partition(r, R, owner, bag) {
  const free = [];
  for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) if (!owner.has(keyOf(x, y))) free.push({ x, y });
  if (bag.reduce((a, b) => a + b, 0) !== free.length) return null;
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

/** The cathedral and the plazas on single squares, houses everywhere else. */
function assignPlaces(r, pieces, cut) {
  const ones = shuffle(pieces.filter((p) => p.squares.length === 1), r);
  if (ones.length < 1 + cut.plazas) return false;
  ones[0].kind = 'cathedral';
  for (let k = 1; k <= cut.plazas; k++) ones[k].kind = 'plaza';
  for (const p of pieces) if (!p.kind) p.kind = 'house';
  return true;
}

/**
 * A plan being drawn: who owns each square, each piece's place, the street
 * net (a mask of sides per square), and the aqueduct's course over it.
 */
class Plan {
  constructor(R, spring, pieces, owner, water) {
    this.R = R;
    this.spring = spring;
    this.list = pieces;
    this.byId = new Map(pieces.map((p) => [p.id, p]));
    this.owner = owner;
    this.waterLength = water;
    this.course = [];
    this.mask = new Map();
    for (const p of pieces) for (const s of p.squares) this.mask.set(keyOf(s.x, s.y), 0);
    this.mask.set(keyOf(0, 0), 15);
    // The edges a street can be laid across: between two squares neither of
    // which is the Comune (its four are always streets), and out of each
    // square on the side of the square, where it would be a gate.
    this.edges = [];
    for (let y = -R; y <= R; y++) {
      for (let x = -R; x <= R; x++) {
        for (let s = 0; s < 4; s++) {
          const nx = x + SIDE_STEP[s][0], ny = y + SIDE_STEP[s][1];
          const out = Math.abs(nx) > R || Math.abs(ny) > R;
          if (!out && s !== 1 && s !== 2) continue;      // each inner edge once
          if ((x === 0 && y === 0) || (nx === 0 && ny === 0)) continue;
          this.edges.push({ x, y, s, gate: out });
        }
      }
    }
    // The Comune's neighbours meet it with a street.
    for (let s = 0; s < 4; s++) this.lay(0, 0, s, true);
  }

  inside(x, y) { return Math.abs(x) <= this.R && Math.abs(y) <= this.R; }

  kindAt(x, y) {
    if (x === 0 && y === 0) return 'comune';
    return this.byId.get(this.owner.get(keyOf(x, y)))?.kind || null;
  }

  has(x, y, s) { return !!(this.mask.get(keyOf(x, y)) & (1 << s)); }

  /** Is there a street across this edge? */
  laid(e) { return this.has(e.x, e.y, e.s); }

  /** Lay (or take up) the street across side `s` of (x, y), on both squares it divides. */
  lay(x, y, s, on) {
    const set = (cx, cy, side) => {
      if (cx === 0 && cy === 0) return;
      const k = keyOf(cx, cy);
      if (!this.mask.has(k)) return;
      const m = this.mask.get(k);
      this.mask.set(k, on ? m | (1 << side) : m & ~(1 << side));
    };
    set(x, y, s);
    set(x + SIDE_STEP[s][0], y + SIDE_STEP[s][1], opposite(s));
  }

  /** A street net grown out from the Comune, with a loop or two, out through some sides. */
  growStreets(r) {
    const reached = new Set([keyOf(0, 0)]);
    const edges = [];
    const out = (x, y) => {
      for (let s = 0; s < 4; s++) {
        const nx = x + SIDE_STEP[s][0], ny = y + SIDE_STEP[s][1];
        if (this.inside(nx, ny)) edges.push([x, y, s]);
      }
    };
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
    for (const e of this.edges) if (e.gate && r() < 0.15) this.lay(e.x, e.y, e.s, true);
  }

  /**
   * A new course for the aqueduct: from the square beside the spring (out
   * in the country), into the city, and on toward its middle, each span
   * opening onto the last. It may cross the Comune, whose fountain it fills.
   */
  reroute(r) {
    const sp = this.spring;
    const toward = opposite(sp.s);
    for (let tries = 0; tries < 30; tries++) {
      const start = { x: sp.x + SIDE_STEP[toward][0], y: sp.y + SIDE_STEP[toward][1] };
      const path = [{ ...start, from: sp.s }];
      const used = new Set([keyOf(start.x, start.y)]);
      while (path.length < this.waterLength) {
        const at = path[path.length - 1];
        const steps = [0, 1, 2, 3].filter((s) => {
          const x = at.x + SIDE_STEP[s][0], y = at.y + SIDE_STEP[s][1];
          return this.inside(x, y) && !used.has(keyOf(x, y)) && s !== at.from;
        });
        if (!steps.length) break;
        // Toward the middle, mostly.
        steps.sort((s1, s2) => {
          const d = (s) => Math.abs(at.x + SIDE_STEP[s][0]) + Math.abs(at.y + SIDE_STEP[s][1]);
          return d(s1) - d(s2);
        });
        const s = r() < 0.7 ? steps[0] : steps[Math.floor(r() * steps.length)];
        at.to = s;
        const x = at.x + SIDE_STEP[s][0], y = at.y + SIDE_STEP[s][1];
        used.add(keyOf(x, y));
        path.push({ x, y, from: opposite(s) });
      }
      if (path.length < this.waterLength) continue;
      const last = path[path.length - 1];
      last.to = opposite(last.from);
      this.course = path.map((p) => ({ x: p.x, y: p.y, span: (1 << p.from) | (1 << p.to) }));
      return true;
    }
    return false;
  }

  /**
   * The plan as the scorer reads a city. Its squares never move, so the
   * entries are made once and brought up to date in place (the search asks
   * this thousands of times); the lookups are made again only when the
   * aqueduct takes a new course.
   */
  city() {
    if (!this.entries) {
      this.entries = [...this.mask.keys()].map((k) => {
        const [x, y] = k.split(',').map(Number);
        return { x, y, k, kind: null, streets: 0, piece: this.owner.get(k) };
      });
    }
    for (const e of this.entries) { e.kind = this.kindAt(e.x, e.y); e.streets = this.mask.get(e.k); }
    if (this.cityCourse !== this.course) {
      this.cityCourse = this.course;
      this.cached = cityOf(this.entries, this.course.map((c) => ({ x: c.x, y: c.y, span: c.span, piece: 'water' })), this.spring);
    }
    return this.cached;
  }

  appraise() { return appraiseCity(this.city()); }

  /**
   * How well the streets suit the places (the cathedral stands in a close,
   * a plaza is where streets meet), for the search only: it never scores.
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
    const ones = this.list.filter((p) => p.squares.length === 1);
    for (let i = 0; i < steps; i++) {
      const heat = 1 - i / steps;
      let undo;
      const roll = r();
      if (roll < 0.06) {
        const was = this.course;
        if (!this.reroute(r)) continue;
        undo = () => { this.course = was; };
      } else if (roll < 0.16) {
        // A whole street at once, from a side of the square in to the
        // Comune: one edge at a time, a street out of one side is worth
        // nothing until it is joined to one out of another.
        const masks = new Map(this.mask);
        if (!this.streetFromSide(r)) continue;
        undo = () => { this.mask = masks; };
      } else if (roll < 0.5 && ones.length > 1) {
        const a = ones[Math.floor(r() * ones.length)], b = ones[Math.floor(r() * ones.length)];
        if (a === b || a.kind === b.kind) continue;
        [a.kind, b.kind] = [b.kind, a.kind];
        undo = () => { [a.kind, b.kind] = [b.kind, a.kind]; };
      } else {
        const e = this.edges[Math.floor(r() * this.edges.length)];
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

  /** Lay a street out of a side of the square in to the Comune, by a shortest way (ties by the PRNG). */
  streetFromSide(r) {
    const gates = this.edges.filter((e) => e.gate);
    const g = gates[Math.floor(r() * gates.length)];
    const from = new Map([[keyOf(g.x, g.y), null]]);
    let todo = [[g.x, g.y]];
    while (todo.length && !from.has(keyOf(0, 0))) {
      const next = [];
      for (const [x, y] of todo) {
        for (const s of shuffle([0, 1, 2, 3], r)) {
          const nx = x + SIDE_STEP[s][0], ny = y + SIDE_STEP[s][1];
          if (!this.inside(nx, ny) || from.has(keyOf(nx, ny))) continue;
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

  save() { return { mask: new Map(this.mask), kinds: this.list.map((p) => p.kind), course: this.course }; }
  load(s) { this.mask = new Map(s.mask); this.list.forEach((p, i) => { p.kind = s.kinds[i]; }); this.course = s.course; }

  /**
   * The pieces, cut from the plan: each square's tile and turn, from its top
   * left; and the aqueduct's course, cut into runs of one to three spans
   * (by the PRNG of its own, so the cut never changes the search).
   */
  pieces() {
    const cutOf = (squares, kind, id, spanOf) => {
      const x = Math.min(...squares.map((s) => s.x)), y = Math.min(...squares.map((s) => s.y));
      const cells = squares.map((s) => {
        const t = tileFor(kind, kind === 'aqueduct' ? 0 : this.mask.get(keyOf(s.x, s.y)), spanOf(s));
        return { dx: s.x - x, dy: s.y - y, type: t.type, rot: t.rot };
      }).sort((a, b) => a.dy - b.dy || a.dx - b.dx);
      return { id, kind, x, y, cells, squares };
    };
    const out = this.list.map((p) => cutOf(p.squares, p.kind, p.id, () => 0));
    const r = rngOf(this.course.length * 7919 + this.course[0].x * 31 + this.course[0].y);
    for (let i = 0; i < this.course.length;) {
      const n = Math.min(this.course.length - i, 1 + Math.floor(r() * 3));
      const run = this.course.slice(i, i + n);
      out.push(cutOf(run.map((c) => ({ x: c.x, y: c.y, span: c.span })), 'aqueduct', `a${out.length}`, (s) => s.span));
      i += n;
    }
    return out;
  }
}

/**
 * The order the pieces are dealt in: shuffled, but always one the plan can be
 * built in, holding three. A place is laid where it touches a square already
 * built (the Comune is down from the start); an aqueduct where it is over or
 * beside the city, the spring or a span already up.
 */
function dealOrder(r, pieces, spring) {
  for (let tries = 0; tries < 60; tries++) {
    const pile = shuffle(pieces.slice(), r);
    const built = new Set([keyOf(0, 0)]);
    const spans = new Set();
    const touch = (x, y, also) => [0, 1, 2, 3].some((d) => {
      const nx = x + SIDE_STEP[d][0], ny = y + SIDE_STEP[d][1];
      return built.has(keyOf(nx, ny)) || (also && (spans.has(keyOf(nx, ny)) || (nx === spring.x && ny === spring.y)));
    });
    const reaches = (p) => (p.kind === 'aqueduct'
      ? p.squares.some((s) => built.has(keyOf(s.x, s.y)) || touch(s.x, s.y, true))
      : p.squares.some((s) => touch(s.x, s.y, false)));
    const hand = [];
    let i = 0, ok = true;
    while (i < pile.length || hand.length) {
      while (hand.length < 3 && i < pile.length) hand.push(pile[i++]);
      const j = hand.findIndex(reaches);
      if (j < 0) { ok = false; break; }
      for (const s of hand[j].squares) (hand[j].kind === 'aqueduct' ? spans : built).add(keyOf(s.x, s.y));
      hand.splice(j, 1);
    }
    if (ok) return pile.map((p) => p.id);
  }
  return null;
}
