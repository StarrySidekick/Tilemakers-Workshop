// ---------------------------------------------------------------------------
// Starà — the daily square, a walled city-state.
//
// Timothy, 2026-11-18: "new mode, going to be daily, and based around the idea
// of fitting tiles into the area of your phone screen ... a square area of say
// 7x7 tiles. you have to get the best score possible within that shape. so
// regular carcassone rules but there's this border." Four passes followed on
// the 18th (MODES.md section 14): the castle walls, no followers, the two
// sizes, the town gates, the hand, the keep and the four quarters.
//
// The fifth pass, 2026-11-23: "drop the quarters idea for now. The framing
// we're going for is that these are the walls of an illustrious city-state.
// You are given the city walls in the form of a square of 5 by 5 or 7 by 7,
// and your job is to fill it in with all of these different things",
// cathedral, housing, plazas, gardens, markets, barracks, keeps, wizard
// towers, aqueducts, farms and roads; "one of those beautiful Italian
// city-states from the Middle Ages ... like the city of Lucca"; "Each time you
// play, I want the city state to feel a little bit different based on the
// tiles you get"; "Your goal is to kind of make that city state thrive".
// Asked four questions, he took the recommendation each time:
//
//   ONE PLACE PER TILE. Every tile is a place in the city (a house, a plaza,
//   a market, the cathedral...) with streets across its edges. A street must
//   meet a street and a frontage a frontage, as Giardino's rills do; the wall
//   takes either. Carcassonne's cities, fields and cloisters are gone.
//   NEIGHBOURS, PAID AS LAID. Each place wants things round it (the eight
//   squares), and some want the wall, water, or a street out through the
//   gates. Its worth is worked out from the city as it stands, so the score
//   is always the city's worth: a tile laid pays the difference it makes,
//   to itself and to everything round it, shown before the seal.
//   A CAST PER DAY. Houses, plazas, gardens, farms, markets, churches and the
//   aqueduct come every day; and the day deals one place of each of four
//   kinds, from two: faith (the cathedral or the convents), defence (the
//   barracks or the keep), industry (the silk works or the tannery) and a
//   wonder (the wizard's tower or the university). Tiny Towns does this.
//   AN AQUEDUCT FROM THE WALL. Each day puts a water arch in the wall. The
//   aqueduct tiles carry it across the square on arches, over the streets,
//   so they never stop a tile being laid; water runs only as far as their
//   spans line up from the arch. A square is watered if running water is on
//   it or beside it.
//
// Kept from the earlier passes: the town gates in the middle of each wall,
// the high roads through them (his favourite part: 2026-11-19, "besides the
// castle wall gates for connecting roads, that's fun"), the keep as a fifth
// gate, and the hand that grows (an abbey's rule then, a church's now).
//
// Calls of Claude's, each with why (MODES.md section 14, the fifth pass):
//   - THE PIAZZA DEL COMUNE is the first tile, in the middle: the town
//     hall's square, streets out of every side, a fountain that plays when
//     the aqueduct reaches it. Siena's Fonte Gaia was fed the same way, by
//     tunnels from the hills. The middle is a goal you can see from turn one.
//   - A HIGH ROAD is a street through two or more gates, and it pays by how
//     many it joins, on a rising table, not by how long it is. Every tile
//     has streets now, so a street network can grow over half the square,
//     and a per-tile price would pay for that size, which a full square
//     hands you anyway (docs/STARA-DESIGN.md: "a point that grows in a
//     straight line with tile count is a point you cannot earn").
//   - THE HAND holds 1, and 1 more for every church of any kind laid, up to
//     5. Past five the tray is two rows of small cards, and picking stops
//     being a decision and becomes a search.
//   - A PLACE IS NEVER WORTH LESS THAN 0: a house between two tanneries is
//     worth nothing, not a debt.
//
// The base of the old Starà: solo, the same deal for everyone on the same
// local date, the day ends when the square is full or nothing left fits, a
// tile that fits nowhere is set aside. It is `pure`: the workshop's
// bolted-on rules never reach it. The look is src/city.js and src/castle.js,
// the interface src/stara-ui.js.
// ---------------------------------------------------------------------------

import { Mode } from './mode.js';
import { registerTiles, opposite, TILES, N, E, S, W, SIDE_STEP } from '../tiles.js';

/** The first day there was a Starà, so day numbers start at 1. */
const FIRST_DAY = Date.UTC(2026, 10, 18);

/** The keep's tile id (tiles.js): walls on every side, so it fits anything. */
export const KEEP = 'KEEP';

/** The first tile, in the middle. */
export const COMUNE = 'c-comune-X';

/** The streets on a tile, by shape, in the tile's own frame (Giardino's shapes). */
export const SHAPES = { 0: [], U: [N], I: [N, S], L: [N, E], T: [E, S, W], X: [N, E, S, W] };

/** The aqueduct's span on a tile, in the tile's frame: straight across or a bend. */
export const SPANS = { I: [N, S], L: [N, E] };

/**
 * THE PLACES. What each wants, as numbers, so that the card under the hand
 * and the score come from the same table:
 *
 *   base     what it is worth by itself
 *   likes    for each place of that kind in the eight squares round it (a
 *            minus is a dislike; '*' is any place at all)
 *   variety  for each DIFFERENT kind of place round it
 *   wall     for each of its sides against the town wall
 *   water    when it is watered
 *   flow     for each span the water has run through to reach it, itself
 *            included (the aqueduct): the first span from the arch pays 1,
 *            the next 2, so a long aqueduct pays more than its length
 *   gates    for each gate its street runs out through (the keep counts)
 *   atGate   when it stands on or beside a town gate
 *   line     for each different kind of place in its row and its column
 *   church   it is a church: laid, you hold one more tile
 *   scry     while it stands you see this many tiles ahead in the pile
 *
 * `shapes` is how many come with each street shape; `cast` is the kind of
 * the day's cast it belongs to, if it is not in every day's deal; `one` is
 * a place there is only one of, dealt early (a keep dealt after the square
 * is full is a keep you never see).
 */
export const PLACES = {
  comune: {
    name: 'Piazza del Comune', group: 'open', start: true, shapes: { X: 1 },
    base: 2, variety: 1, water: 6,
    about: 'The town hall\'s square, in the middle. Its fountain plays when the aqueduct reaches it.',
  },
  house: {
    name: 'Houses', group: 'houses', shapes: { U: 6, I: 6, L: 6, T: 2, 0: 4 },
    base: 1, water: 1, likes: { garden: 1, plaza: 1, comune: 1, market: 1, church: 1, cathedral: 1, tannery: -2, barracks: -1 },
    about: 'Where the people live.',
  },
  plaza: {
    name: 'Plaza', group: 'open', shapes: { T: 2, X: 3 },
    variety: 1, water: 2,
    about: 'Where the streets meet and the city meets itself. Its fountain plays when watered.',
  },
  garden: {
    name: 'Garden', group: 'open', shapes: { 0: 4, U: 3 },
    base: 1, water: 2, likes: { tannery: -1 },
    about: 'The orti behind the houses, green when watered.',
  },
  farm: {
    name: 'Farm', group: 'open', shapes: { 0: 4, U: 2 },
    wall: 2,
    about: 'Orchards and vines inside the walls, so a siege never starved the town.',
  },
  market: {
    name: 'Market', group: 'trade', shapes: { I: 2, L: 2, T: 1 },
    likes: { house: 1, farm: 2 }, gates: 2,
    about: 'Stalls along the street, selling what the farms grow and the gates bring in.',
  },
  church: {
    name: 'Church', group: 'faith', shapes: { U: 2, I: 1 },
    base: 1, likes: { house: 1 }, church: true,
    about: 'A parish church. Laid, you hold one more tile.',
  },
  aqueduct: {
    name: 'Aqueduct', group: 'water', shapes: {},
    flow: 1,
    about: 'Carries the water in from the arch in the wall, on arches over the streets.',
  },
  // --- the day's cast: one of each pair ------------------------------------
  cathedral: {
    name: 'Cathedral', group: 'faith', cast: 'faith', one: true, shapes: { U: 1 },
    base: 4, likes: { house: 1, plaza: 3, comune: 3 }, church: true,
    about: 'The duomo. Its parish is the houses round it, and it wants a plaza before its doors.',
  },
  convent: {
    name: 'Convent', group: 'faith', cast: 'faith', shapes: { 0: 1, U: 2 },
    wall: 2, likes: { garden: 1, farm: 1 }, church: true,
    about: 'The friars built against the walls, among the gardens.',
  },
  barracks: {
    name: 'Barracks', group: 'defence', cast: 'defence', shapes: { U: 2, I: 1 },
    wall: 1, atGate: 3,
    about: 'The town\'s soldiers, by a gate. Nobody wants to live next door.',
  },
  keep: {
    name: 'Keep', group: 'defence', cast: 'defence', one: true, shapes: {},
    base: 2, likes: { house: 1 },
    about: 'A fortress inside the walls. It fits against anything, and a street that ends at it counts it as a gate.',
  },
  silk: {
    name: 'Silk works', group: 'industry', cast: 'industry', shapes: { U: 2, I: 1 },
    water: 3, likes: { house: 1, market: 2 },
    about: 'Lucca\'s trade: the mills need water, the weavers live nearby, the market sells the cloth.',
  },
  tannery: {
    name: 'Tannery', group: 'industry', cast: 'industry', shapes: { U: 2, 0: 1 },
    water: 5, wall: 1,
    about: 'Pays well with water, and smells: kept to the walls, away from the houses.',
  },
  wizard: {
    name: 'Wizard\'s tower', group: 'wonder', cast: 'wonder', one: true, shapes: { U: 1 },
    base: 8, likes: { '*': -1, garden: 0, farm: 0 }, scry: 2,
    about: 'Wants nothing next to it but quiet gardens and fields. While it stands you see the next two tiles in the pile.',
  },
  university: {
    name: 'University', group: 'wonder', cast: 'wonder', one: true, shapes: { U: 1 },
    line: 1,
    about: 'The studium gathers everything: it is paid for every different place in its row and column.',
  },
};
export const PLACE_IDS = Object.keys(PLACES);

/**
 * The aqueduct tiles, by span. Each stands on arches over a paved yard, so
 * its edges take a street or a frontage and a street meeting one runs on
 * under it (ARCH in tiles.js): an aqueduct never stops a tile being laid.
 */
const AQUEDUCTS = [{ span: 'I', n: 6 }, { span: 'L', n: 4 }];

/** The four kinds of the day's cast, and the two places each can be. */
export const CAST = [
  { id: 'faith', name: 'Faith', of: ['cathedral', 'convent'] },
  { id: 'defence', name: 'Defence', of: ['barracks', 'keep'] },
  { id: 'industry', name: 'Industry', of: ['silk', 'tannery'] },
  { id: 'wonder', name: 'Wonder', of: ['wizard', 'university'] },
];

/** The rules that are not a place's: the high roads and the hand. */
export const RULES = {
  /** What a high road pays by how many gates it joins (2 or more). */
  highRoad: [0, 2, 6, 14, 24, 36],
  handMax: 5,
};

/** What each tally is called on the end card, in the order it is listed. */
export const STARA_KINDS = [
  ['houses', 'Houses'], ['open', 'Plazas, gardens, farms'], ['trade', 'Markets'],
  ['faith', 'Churches'], ['industry', 'Industry'], ['defence', 'Defence'],
  ['wonder', 'Wonders'], ['roads', 'High roads'],
];

// --- the tiles ----------------------------------------------------------------

const street = (sides) => ({ type: 'road', sides });

/** Every place tile, one type per place and street shape. */
export const CITY_TILES = [];
for (const [kind, p] of Object.entries(PLACES)) {
  for (const [shape, n] of Object.entries(p.shapes)) {
    CITY_TILES.push({
      id: `c-${kind}-${shape}`, n, group: 'stara', name: p.name,
      place: kind, shape, feats: SHAPES[shape].length ? [street(SHAPES[shape])] : [],
    });
  }
}
for (const a of AQUEDUCTS) {
  CITY_TILES.push({
    id: `c-aqueduct-${a.span}`, n: a.n, group: 'stara', name: 'Aqueduct', arched: true,
    place: 'aqueduct', shape: 'X', span: SPANS[a.span], feats: [street(SHAPES.X)],
  });
}
registerTiles(CITY_TILES);

/** A cell's place, by kind: the keep is a place too, though it is a tile of tiles.js. */
export const kindOf = (cell) => cell?.type.place || (cell?.type.keep ? 'keep' : null);

// --- the day ----------------------------------------------------------------

/** A small seeded PRNG of the mode's own, so the cast never disturbs the deal. */
function rngOf(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

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

/** The square on the wall that the arch opens onto. */
export function archSquare(board, arch) {
  const b = board.bounds;
  if (arch.s === 0) return { x: b.minX + arch.i, y: b.minY };
  if (arch.s === 2) return { x: b.minX + arch.i, y: b.maxY };
  if (arch.s === 1) return { x: b.maxX, y: b.minY + arch.i };
  return { x: b.minX, y: b.minY + arch.i };
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

// --- the city's rules, as questions any board can be asked -----------------------

const keyOf = (x, y) => `${x},${y}`;

/** The aqueduct's span on a cell, in the world's frame. */
export const spanOf = (cell) => (cell.type.span || []).map((s) => (s + cell.rot) % 4);

/**
 * The squares with running water. The arch pours into a basin at the foot of
 * the wall, so its own square has water whatever is built there. A span on
 * that square opening onto the arch carries it on; if anything else stands
 * there, a span beside it opening onto the square takes it from the basin.
 * From there, water runs into a neighbouring span only where the two open
 * onto each other.
 */
export function runningWater(board, arch) {
  const out = new Set();
  /** How many spans the water has run through to reach each square, itself included. */
  out.dist = new Map();
  if (!arch || !board.bounds) return out;
  const at = archSquare(board, arch);
  const reach = (c, d) => { out.add(keyOf(c.x, c.y)); out.dist.set(keyOf(c.x, c.y), d); };
  out.add(keyOf(at.x, at.y));
  out.dist.set(keyOf(at.x, at.y), 0);
  let todo = [];
  const first = board.get(at.x, at.y);
  if (first && spanOf(first).includes(arch.s)) { reach(first, 1); todo.push(first); }
  // Built over with anything else, the basin still feeds a span beside it.
  else for (let s = 0; s < 4; s++) {
    const [dx, dy] = SIDE_STEP[s];
    const nb = board.get(at.x + dx, at.y + dy);
    if (!nb || out.dist.get(keyOf(nb.x, nb.y)) || !spanOf(nb).includes(opposite(s))) continue;
    reach(nb, 1);
    todo.push(nb);
  }
  // Breadth first, so each span is reached by its shortest way from the arch.
  while (todo.length) {
    const next = [];
    for (const c of todo) {
      const d = out.dist.get(keyOf(c.x, c.y));
      for (const s of spanOf(c)) {
        const [dx, dy] = SIDE_STEP[s];
        const nb = board.get(c.x + dx, c.y + dy);
        if (!nb || out.dist.get(keyOf(nb.x, nb.y)) || !spanOf(nb).includes(opposite(s))) continue;
        reach(nb, d + 1);
        next.push(nb);
      }
    }
    todo = next;
  }
  return out;
}

/** Is (x, y) watered: running water on it or on a square beside it? */
export function isWatered(running, x, y) {
  if (running.has(keyOf(x, y))) return true;
  return SIDE_STEP.some(([dx, dy]) => running.has(keyOf(x + dx, y + dy)));
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

/** The street running out through each gate, by side, or null. */
export function gateRoads(board) {
  return gateSquares(board).map(({ s, x, y }) => {
    const cell = board.get(x, y);
    if (!cell || board.edgeAt(cell, s) !== 'r') return null;
    const i = board.featAt(cell, s);
    return i == null ? null : board.featureOf(x, y, i);
  });
}

/**
 * The STREET NETWORKS, each with its tiles and the gates (sides) it runs out
 * through. Every place tile has one street on it however many sides it
 * reaches, so a network is one component; the union across a tile still
 * joins roads that end at a junction, for any tile that has several.
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
  // The keep is a gate too, a fifth: every street that ends against its walls
  // puts it on that street's network, once however many reach it.
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

/** The eight squares round (x, y). */
function* around(x, y) {
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (dx || dy) yield [x + dx, y + dy];
}

/**
 * What the whole city is worth as it stands: every place's worth, by square,
 * and every high road's, and the totals by tally. `arch` is the day's water
 * arch. Recomputed from scratch each time (49 squares at most): the score is
 * always exactly this, so laying a tile pays the difference it makes.
 */
export function appraise(board, arch) {
  const running = runningWater(board, arch);
  const ways = highways(board);
  const gatesOf = new Map();
  for (const w of ways) for (const d of w.roads) gatesOf.set(d, w.gates.size);
  const gates = gateSquares(board);
  const cells = [...board.cells.values()];
  const per = new Map();
  const groups = Object.fromEntries(STARA_KINDS.map(([k]) => [k, 0]));
  let total = 0;
  for (const cell of cells) {
    const kind = kindOf(cell);
    const P = PLACES[kind];
    if (!P) continue;
    let v = P.base || 0;
    const kinds = new Set();
    for (const [ax, ay] of around(cell.x, cell.y)) {
      const k = kindOf(board.get(ax, ay));
      if (!k) continue;
      kinds.add(k);
      if (P.likes) v += P.likes[k] ?? P.likes['*'] ?? 0;
    }
    if (P.variety) v += P.variety * kinds.size;
    if (P.wall) v += P.wall * board.wallSidesAt(cell.x, cell.y).length;
    const wet = isWatered(running, cell.x, cell.y);
    if (P.water && wet) v += P.water;
    if (P.flow && cell.type.span) v += P.flow * (running.dist.get(keyOf(cell.x, cell.y)) || 0);
    if (P.gates) {
      const i = cell.type.feats.findIndex((f) => f.type === 'road');
      const d = i < 0 ? null : board.featureOf(cell.x, cell.y, i);
      v += P.gates * (gatesOf.get(d) || 0);
    }
    if (P.atGate && gates.some((g) => Math.abs(g.x - cell.x) <= 1 && Math.abs(g.y - cell.y) <= 1)) v += P.atGate;
    if (P.line) {
      const seen = new Set();
      for (const o of cells) if (o !== cell && (o.x === cell.x || o.y === cell.y)) seen.add(kindOf(o));
      v += P.line * seen.size;
    }
    v = Math.max(0, v);
    per.set(keyOf(cell.x, cell.y), { kind, pts: v, wet });
    const g = P.group === 'water' ? 'open' : P.group;
    groups[g] += v;
    total += v;
  }
  const roads = [];
  for (const w of ways) {
    const pts = RULES.highRoad[Math.min(w.gates.size, RULES.highRoad.length - 1)] || 0;
    if (!pts) continue;
    roads.push({ pts, gates: w.gates.size, tiles: w.tiles.size, road: w.roads[0] });
    groups.roads += pts;
    total += pts;
  }
  return { total, per, groups, roads, running };
}

/**
 * A place's card, for the tray: its name, what it is, and what it wants, as
 * the chips the card shows (good in green, bad in red). Made from PLACES, so
 * it can never say other than what scores.
 */
export function describe(kind) {
  const P = PLACES[kind];
  if (!P) return null;
  const name = (k) => ({ '*': 'place', comune: 'the Comune', house: 'house' }[k] || (PLACES[k]?.name || k).toLowerCase());
  const spared = Object.entries(P.likes || {}).filter(([, v]) => v === 0).map(([k]) => `${name(k)}s`);
  const list = (ks) => (ks.length > 1 ? `${ks.slice(0, -1).join(', ')} or ${ks[ks.length - 1]}` : ks[0]);
  const good = [], bad = [];
  if (P.base) good.push(`${P.base} itself`);
  const by = new Map();
  for (const [k, v] of Object.entries(P.likes || {})) {
    if (!v) continue;
    if (!by.has(v)) by.set(v, []);
    by.get(v).push(name(k));
  }
  for (const [v, ks] of [...by].sort((a, b) => b[0] - a[0])) {
    const but = ks.includes('place') && spared.length ? `, not ${list(spared)}` : '';
    (v > 0 ? good : bad).push(`${v > 0 ? '+' : '−'}${Math.abs(v)} each ${list(ks)} round it${but}`);
  }
  if (P.variety) good.push(`+${P.variety} each different place round it`);
  if (P.wall) good.push(`+${P.wall} each side on the wall`);
  if (P.water) good.push(`+${P.water} watered`);
  if (P.flow) good.push(`+${P.flow} for each span the water has run through to reach it`);
  if (P.gates) good.push(`+${P.gates} each gate its street reaches`);
  if (P.atGate) good.push(`+${P.atGate} by a town gate`);
  if (P.line) good.push(`+${P.line} each different place in its row and column`);
  if (P.church) good.push('you hold one more tile');
  if (P.scry) good.push(`see ${P.scry} tiles ahead`);
  return { kind, name: P.name, about: P.about, good, bad };
}

/** Which places a place's worth goes up or down for, round it: {kind: +1 | -1}. */
function feelings(kind) {
  const out = {};
  for (const [k, v] of Object.entries(PLACES[kind]?.likes || {})) out[k] = Math.sign(v);
  return out;
}

// --- the mode ----------------------------------------------------------------

export class Stara extends Mode {
  get side() { return this.spec.side; }
  get squares() { return this.side * this.side; }

  /**
   * The day's deal: every day's places, the day's cast, shuffled; and each
   * place there is only one of dealt in the first third of the square's worth.
   */
  deck() {
    const rng = this.game.rng;
    this.cast = castFor(this.game.seed);
    const today = new Set(Object.values(this.cast));
    const deck = [], early = [];
    for (const t of CITY_TILES) {
      const P = PLACES[t.place];
      if (P.start || (P.cast && !today.has(t.place))) continue;
      for (let i = 0; i < t.n; i++) (P.one ? early : deck).push(t.id);
    }
    if (today.has('keep')) early.push(KEEP);
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    // The pile is dealt from the END, so "within the first k" is k from the end.
    for (const id of early) {
      const k = 1 + Math.floor(rng() * Math.floor(this.squares / 3));
      deck.splice(deck.length - k + 1, 0, id);
    }
    return deck;
  }

  seeds() { return [{ x: 0, y: 0, id: COMUNE, rot: 0 }]; }

  setup() {
    this.day = staraDay(new Date(), this.side);
    this.cast ||= castFor(this.game.seed);
    this.arch = archFor(this.game.seed, this.side);
    this.hand = [];
    this.sel = 0;
    this.churches = 0;
    this.city = appraise(this.game.board, this.arch);
    this.game.players[0].score = this.city.total;
    this.tally = { ...this.city.groups };
  }

  /** How many tiles you hold: 1, and 1 more for every church laid, up to five. */
  get handSize() { return Math.min(RULES.handMax, 1 + this.churches); }

  /** How many tiles ahead you see: the wizard's tower's, while it stands. */
  get foresight() {
    let n = 0;
    for (const c of this.game.board.cells.values()) n = Math.max(n, PLACES[kindOf(c)]?.scry || 0);
    return n;
  }

  /** The next tiles in the pile, as far as the wizard lets you see. */
  ahead() {
    const d = this.game.deck;
    return d.slice(Math.max(0, d.length - this.foresight)).reverse();
  }

  /**
   * The mode deals its own tiles (the host asks this instead of drawing):
   * set aside anything in hand that fits nowhere now, fill the hand from the
   * pile, setting aside what fits nowhere as it comes, and hold up whichever
   * tile was in hand before, or the first.
   */
  drawNext() {
    const g = this.game;
    const fits = (id) => g.placeableNow(TILES[id]);
    this.hand = this.hand.filter((id) => fits(id) || (g.say(`${this.nameOf(id)} no longer fits anywhere: set aside.`), false));
    while (this.hand.length < this.handSize && g.deck.length) {
      const id = g.deck.pop();
      if (fits(id)) this.hand.push(id);
      else g.say(`${this.nameOf(id)} had nowhere to go: set aside.`);
    }
    if (!this.hand.length || g.board.size >= this.squares) return g.finish();
    this.sel = Math.max(0, Math.min(this.sel, this.hand.length - 1));
    g.offer(this.hand[this.sel]);
  }

  /** A tile's place, by name, for the log. */
  nameOf(id) { return PLACES[kindOf({ type: TILES[id] })]?.name || id; }

  /** Hold up tile `i` of the hand instead. */
  select(i) {
    const g = this.game;
    if (g.phase !== 'place' || i < 0 || i >= this.hand.length || i === this.sel) return false;
    this.sel = i;
    g.offer(this.hand[i]);
    return true;
  }

  /** For the panel's redraw: what is in hand and which is held up. */
  signature() { return `${this.hand.join('.')}/${this.sel}/${this.game.board.size}`; }

  finalFarms = false;

  /** A street that closes is a finished street: pleasant, and worth nothing. */
  onClosed() {}

  /**
   * No followers, so nothing to claim: the turn ends as the tile goes down.
   * The city is worked out again and the score becomes what it is worth;
   * each place whose worth changed says by how much, where it stands.
   */
  afterPlace(cell) {
    const g = this.game;
    this.hand.splice(this.sel, 1);
    const kind = kindOf(cell);
    if (PLACES[kind]?.church) {
      this.churches++;
      if (this.handSize > this.churches) g.say(`A ${PLACES[kind].name.toLowerCase()}: you hold ${this.handSize} tiles now.`);
    }
    const was = this.city;
    this.city = appraise(g.board, this.arch);
    const p = g.players[0];
    const gain = this.city.total - was.total;
    p.score = this.city.total;
    this.tally = { ...this.city.groups };
    for (const [k, now] of this.city.per) {
      const d = now.pts - (was.per.get(k)?.pts || 0);
      if (!d) continue;
      const [x, y] = k.split(',').map(Number);
      g.emit('score', { points: d, players: [0], at: { x: x + 0.5, y: y + 0.5 } });
    }
    const roads = this.city.groups.roads - was.groups.roads;
    if (roads) {
      const best = [...this.city.roads].sort((a, b) => b.pts - a.pts)[0];
      const spot = (best && g.spotOf(best.road)) || { at: { x: cell.x + 0.5, y: cell.y + 0.5 } };
      g.emit('score', { points: roads, players: [0], ...spot });
    }
    g.say(`${PLACES[kind]?.name || 'A tile'} at (${cell.x}, ${cell.y}): ${gain >= 0 ? '+' : '−'}${Math.abs(gain)}, the city is worth ${p.score}.`);
    return null;
  }

  /** The square is full, or nothing is left to deal: the day is done. */
  anythingLeft() {
    return (this.hand.length > 0 || this.game.deck.length > 0) && this.game.board.size < this.squares;
  }

  finish() {
    const g = this.game;
    for (const r of this.city.roads) g.say(`A high road through ${r.gates} gates → ${r.pts}`);
    g.say(`Starà No. ${this.day.n}, ${this.side}×${this.side}: the city is worth ${g.players[0].score}, ${g.board.size} of ${this.squares} squares built.`);
  }

  // --- what the picture and the interface ask -----------------------------------

  /** How a square looks: whether water runs on it and whether it is watered. */
  lookOf(cell) {
    const k = keyOf(cell.x, cell.y);
    const run = this.city?.running.has(k) ? 'r' : '';
    const wet = this.city?.per.get(k)?.wet ? 'w' : '';
    return `${kindOf(cell)}${run}${wet}`;
  }

  /**
   * What laying the tile held up at (x, y) turned `rot` would do: the city's
   * worth after, the difference, how the tile itself would look, and every
   * square whose worth would change, with by how much. Tried on the board and
   * taken off again, once per square and turn (the staged tile is drawn every
   * frame).
   */
  preview(x, y, rot) {
    const g = this.game, type = g.tile;
    if (!type) return null;
    const key = `${type.id}|${x},${y}|${rot}|${g.board.version}`;
    if (this.previewKey === key) return this.previewValue;
    let out = null;
    if (g.board.canPlace(x, y, type, rot, g.placeOpts())) {
      g.board.place(x, y, type, rot, { owner: 0 });
      const after = appraise(g.board, this.arch);
      g.board.remove(x, y, { quiet: true });
      g.board.rebuild();
      const changes = [];
      for (const [k, now] of after.per) {
        const d = now.pts - (this.city.per.get(k)?.pts || 0);
        if (!d) continue;
        const [cx, cy] = k.split(',').map(Number);
        changes.push({ x: cx, y: cy, d, self: cx === x && cy === y });
      }
      const roads = after.groups.roads - this.city.groups.roads;
      const k = keyOf(x, y);
      out = {
        total: after.total, gain: after.total - this.city.total, changes, roads,
        look: `${type.place || (type.keep ? 'keep' : '')}${after.running.has(k) ? 'r' : ''}${after.per.get(k)?.wet ? 'w' : ''}`,
      };
    }
    this.previewKey = key;
    this.previewValue = out;
    return out;
  }

  /** How the staged tile would look there (render.js asks this of every mode). */
  previewLook(x, y, rot) { return this.preview(x, y, rot)?.look ?? null; }

  /** The card for a tile in hand. */
  card(id) {
    const type = TILES[id];
    return describe(kindOf({ type }));
  }

  /** Who round (x, y) a place of `kind` likes (+1) or dislikes (-1), and who likes it. */
  companyMarks(kind, x, y) {
    const out = [];
    const mine = feelings(kind);
    for (const [ax, ay] of around(x, y)) {
      const k = kindOf(this.game.board.get(ax, ay));
      if (!k) continue;
      const r = (mine[k] ?? mine['*'] ?? 0) + (feelings(k)[kind] ?? 0);
      if (r) out.push({ x: ax, y: ay, r: Math.sign(r) });
    }
    return out;
  }

  /** Which gates a street runs out through, by side: for the castle's banners. */
  gatesReached() { return gateRoads(this.game.board).map(Boolean); }

  // --- advice for the computer player -----------------------------------------

  /** What laying these cells is worth: what they add to the city, all of it. */
  botPlaceBonus() {
    return appraise(this.game.board, this.arch).total - this.city.total;
  }

  /** Hold up the tile in hand that has the best square, before the bot looks. */
  botAction() {
    const g = this.game;
    if (g.phase !== 'place' || this.hand.length < 2) return false;
    let best = null;
    this.hand.forEach((id, i) => {
      const type = TILES[id];
      for (const s of g.board.legalPlacements(type, g.placeOpts())) {
        g.board.place(s.x, s.y, type, s.rot, { owner: 0 });
        const v = appraise(g.board, this.arch).total;
        g.board.remove(s.x, s.y, { quiet: true });
        g.board.rebuild();
        if (!best || v > best.v) best = { i, v };
      }
    });
    if (best && best.i !== this.sel) this.select(best.i);
    return false;
  }

  status() {
    return `No. ${this.day.n} · ${this.game.board.size}/${this.squares} squares`;
  }

  panel() {
    const g = this.game, p = g.players[0];
    const cast = CAST.map((c) => PLACES[this.cast[c.id]].name).join(', ');
    return `
      <div class="advTop"><span>Starà No. ${this.day.n}, ${this.side}×${this.side}</span><span>Worth <b>${p.score}</b></span></div>
      <div class="advTop"><span>${g.board.size}/${this.squares} squares</span><span>${this.hand.length} in hand, ${g.deck.length} in the pile</span></div>
      <p class="hint">Today: ${cast}.</p>
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
    // The town wall round the square (board.js): it ends streets, and a tile
    // may be laid against it as well as beside another tile.
    walled: true,
    builtFromWall: true,
    // The city's own pictures (src/city.js).
    city: true,
    inked: true,
    antique: true,
    seedFor: () => staraDay(new Date(), side).seed,
    playerName: () => 'You',
    bounds: { minX: -r, maxX: r, minY: -r, maxY: r },
    opening: `Today's city, ${side}×${side}, walled round. Make it thrive.`,
    hint: `Daily and solo: a ${side}×${side} walled city-state to fill. Every tile is a place, with streets that must meet streets. Each place is worth what it wants round it (its card says), and the score is always what the whole city is worth, so a tile pays the difference it makes. A street through two or more town gates is a high road (the keep counts as a gate). Water comes in at the arch in the wall and runs along the aqueduct. Each church lets you hold one more tile. Every day deals a different cast: faith, defence, industry and a wonder.`,
  };
}

export class Stara5 extends Stara {}

Stara.spec = specFor(7, Stara);
Stara5.spec = specFor(5, Stara5);

/** Every Starà size, smallest first, for the size switch. */
export const STARA_SIZES = [Stara5.spec, Stara.spec];
