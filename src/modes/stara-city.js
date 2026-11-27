// ---------------------------------------------------------------------------
// Starà's city: the places, the six ways a place is paid, and the one scorer.
//
// Split out of stara.js on 2026-11-27 (the sixth pass) so the level maker
// (stara-plan.js) and the mode (stara.js) score a city with the SAME code.
// The scorer reads a city as a list of squares, each with its place, the
// sides its street runs out of, and its aqueduct span; `boardCity` reads one
// off a Board, and the level maker builds its own as it plans. Two
// implementations of the rules would drift; one cannot.
//
// THE WAYS (2026-11-27): Timothy, "things that score points in different way
// should be clearly color coded. like right now it's hard to tell what scores
// point for what." Every point a place earns is earned one of six ways, and
// each way has a colour of its own everywhere it shows (the card under the
// hand, the tags on the board, the charter at the end). The colours are
// heraldry's tinctures, because the rest of the screen already is:
//
//   itself      argent (parchment)   what the place is worth by itself
//   neighbours  vert (green)         the places round it it likes; a dislike
//                                    is gules (red), the one colour for a loss
//   variety     purpure (violet)     different places round it, or in its row
//                                    and column
//   water       azure (blue)         watered, or how far the aqueduct has come
//   the wall    sable (black)        its sides on the town wall
//   gates       or (gold)            streets out through the town gates, and
//                                    the high roads
// ---------------------------------------------------------------------------

import { registerTiles, TILES, opposite, N, E, S, W, SIDE_STEP } from '../tiles.js';

/** The streets on a tile, by shape, in the tile's own frame (Giardino's shapes). */
export const SHAPES = { 0: [], U: [N], I: [N, S], L: [N, E], T: [E, S, W], X: [N, E, S, W] };
const SHAPE_IDS = Object.keys(SHAPES);

/** The aqueduct's span on a tile, in the tile's frame: straight across or a bend. */
export const SPANS = { I: [N, S], L: [N, E] };

/** A set of sides as a bitmask (bit s is side s), and back. */
export const maskOf = (sides) => sides.reduce((m, s) => m | (1 << s), 0);
export const sidesOf = (mask) => [0, 1, 2, 3].filter((s) => mask & (1 << s));
/** A mask turned `rot` quarter turns clockwise. */
export const turnMask = (mask, rot) => maskOf(sidesOf(mask).map((s) => (s + rot) % 4));

/** For every mask of street sides, the shape and the turn that make it. */
export const SHAPE_FOR = (() => {
  const out = [];
  for (const shape of SHAPE_IDS) {
    for (let rot = 0; rot < 4; rot++) {
      const m = turnMask(maskOf(SHAPES[shape]), rot);
      if (!out[m]) out[m] = { shape, rot };
    }
  }
  return out;
})();
/** …and for every span mask (two sides), the span and its turn. */
export const SPAN_FOR = (() => {
  const out = [];
  for (const span of Object.keys(SPANS)) {
    for (let rot = 0; rot < 4; rot++) {
      const m = turnMask(maskOf(SPANS[span]), rot);
      if (!out[m]) out[m] = { span, rot };
    }
  }
  return out;
})();

/** The six ways to be paid, in the order a card and the charter list them. */
export const WAYS = [
  { id: 'self', name: 'Itself', tincture: 'argent', colour: '#efe3c4', ink: '#3a2616' },
  { id: 'near', name: 'Neighbours', tincture: 'vert', colour: '#3f7d34', ink: '#fff6e4' },
  { id: 'variety', name: 'Variety', tincture: 'purpure', colour: '#7b4f93', ink: '#fff6e4' },
  { id: 'water', name: 'Water', tincture: 'azure', colour: '#2f6fb0', ink: '#fff6e4' },
  { id: 'wall', name: 'The wall', tincture: 'sable', colour: '#2f2b28', ink: '#fff6e4' },
  { id: 'gates', name: 'Gates', tincture: 'or', colour: '#c8961e', ink: '#2b1a0d' },
];
export const WAY = Object.fromEntries(WAYS.map((w) => [w.id, w]));
/** A loss, whichever way it came: gules. */
export const LOSS = { colour: '#a8392c', ink: '#fff6e4' };

/**
 * THE PLACES. What each wants, as numbers, so that the card under the hand
 * and the score come from the same table:
 *
 *   base     what it is worth by itself                           (itself)
 *   likes    for each square of that place in the eight round it (a minus is
 *            a dislike; '*' is any place at all)                  (neighbours)
 *   variety  for each DIFFERENT place round it                    (variety)
 *   line     for each different place in its row and its column   (variety)
 *   water    when it is watered                                   (water)
 *   flow     for each span the water has run through to reach it,
 *            itself included (the aqueduct): 1, 2, 3 ...          (water)
 *   wall     for each of its sides against the town wall          (the wall)
 *   gates    for each gate its street runs out through            (gates)
 *   atGate   when it stands on or beside a town gate              (gates)
 *   scry     while it stands you see this many pieces ahead
 *
 * A place on a piece of several squares is that many squares of the place:
 * a terrace of three houses is three houses, each paid for what is round
 * it (never the rest of its own piece). The level maker reads the rest:
 * `sizes` is how many squares a piece of it may cover, `share` how much of
 * the square it takes on a usual day, `streets` whether it wants few streets
 * or many (so a farm is not cut in four), `cast` the kind of the day's cast
 * it belongs to, if it is not dealt every day, and `one` a place there is
 * only one of.
 */
export const PLACES = {
  comune: {
    name: 'Piazza del Comune', start: true,
    base: 2, variety: 1, water: 6,
    about: 'The town hall\'s square, in the middle. Its fountain plays when the aqueduct reaches it.',
  },
  house: {
    name: 'Houses', sizes: [1, 2, 3, 4], share: 0.36, streets: 'any',
    base: 1, water: 1, likes: { garden: 1, plaza: 1, comune: 1, market: 1, church: 1, cathedral: 1, tannery: -2, barracks: -1 },
    about: 'Where the people live.',
  },
  plaza: {
    name: 'Plaza', sizes: [1], share: 0.07, streets: 'many',
    variety: 1, water: 2,
    about: 'Where the streets meet and the city meets itself. Its fountain plays when watered.',
  },
  garden: {
    name: 'Garden', sizes: [1, 2], share: 0.09, streets: 'few',
    base: 1, water: 2, likes: { tannery: -1 },
    about: 'The orti behind the houses, green when watered.',
  },
  farm: {
    name: 'Farm', sizes: [1, 2, 3, 4], share: 0.1, streets: 'few',
    wall: 2,
    about: 'Orchards and vines inside the walls, so a siege never starved the town.',
  },
  market: {
    name: 'Market', sizes: [1, 2], share: 0.07, streets: 'many',
    likes: { house: 1, farm: 2 }, gates: 2,
    about: 'Stalls along the street, selling what the farms grow and the gates bring in.',
  },
  church: {
    name: 'Church', sizes: [1], share: 0.05, streets: 'any',
    base: 1, likes: { house: 1 },
    about: 'A parish church, with its parish round it.',
  },
  aqueduct: {
    name: 'Aqueduct', sizes: [1, 2, 3],
    flow: 1,
    about: 'Carries the water in from the arch in the wall, on arches over the streets.',
  },
  // --- the day's cast: one of each pair ------------------------------------
  cathedral: {
    name: 'Cathedral', cast: 'faith', one: true, sizes: [1], streets: 'few',
    base: 4, likes: { house: 1, plaza: 3, comune: 3 },
    about: 'The duomo. Its parish is the houses round it, and it wants a plaza before its doors.',
  },
  convent: {
    name: 'Convent', cast: 'faith', sizes: [1, 2], streets: 'few',
    wall: 2, likes: { garden: 1, farm: 1 },
    about: 'The friars built against the walls, among the gardens.',
  },
  barracks: {
    name: 'Barracks', cast: 'defence', sizes: [1, 2], streets: 'any',
    wall: 1, atGate: 3,
    about: 'The town\'s soldiers, by a gate. Nobody wants to live next door.',
  },
  keep: {
    name: 'Keep', cast: 'defence', one: true, sizes: [1],
    base: 2, likes: { house: 1 },
    about: 'A fortress inside the walls. It fits against anything, and a street that ends at it counts it as a gate.',
  },
  silk: {
    name: 'Silk works', cast: 'industry', sizes: [1, 2], streets: 'any',
    water: 3, likes: { house: 1, market: 2 },
    about: 'Lucca\'s trade: the mills need water, the weavers live nearby, the market sells the cloth.',
  },
  tannery: {
    name: 'Tannery', cast: 'industry', sizes: [1, 2], streets: 'few',
    water: 5, wall: 1,
    about: 'Pays well with water, and smells: kept to the walls, away from the houses.',
  },
  wizard: {
    name: 'Wizard\'s tower', cast: 'wonder', one: true, sizes: [1], streets: 'few',
    base: 8, likes: { '*': -1, garden: 0, farm: 0 }, scry: 2,
    about: 'Wants nothing next to it but quiet gardens and fields. While it stands you see the next two pieces in the pile.',
  },
  university: {
    name: 'University', cast: 'wonder', one: true, sizes: [1], streets: 'few',
    line: 1,
    about: 'The studium gathers everything: it is paid for every different place in its row and column.',
  },
};
export const PLACE_IDS = Object.keys(PLACES);

/** The four kinds of the day's cast, and the two places each can be. */
export const CAST = [
  { id: 'faith', name: 'Faith', of: ['cathedral', 'convent'] },
  { id: 'defence', name: 'Defence', of: ['barracks', 'keep'] },
  { id: 'industry', name: 'Industry', of: ['silk', 'tannery'] },
  { id: 'wonder', name: 'Wonder', of: ['wizard', 'university'] },
];

/** The rules that are not a place's. */
export const RULES = {
  /** What a high road pays by how many gates it joins (2 or more). */
  highRoad: [0, 2, 6, 14, 24, 36],
  /** How many pieces you hold: three, from the first turn (2026-11-27). */
  hand: 3,
  /** What lifting a piece off the board again costs. */
  lift: 1,
};

// --- the tiles ----------------------------------------------------------------

const street = (sides) => ({ type: 'road', sides });

/**
 * Every place tile, one type per place and street shape: the level maker
 * plans the streets first and the places after, so any place may have any
 * street shape (its picture is drawn into what its streets leave). The
 * aqueduct's are by span, on arches over a street that runs on under them
 * (ARCH in tiles.js). None is dealt by count: the day's plan cuts the deal.
 */
export const CITY_TILES = [];
for (const kind of PLACE_IDS) {
  if (kind === 'aqueduct' || kind === 'keep') continue;
  for (const shape of SHAPE_IDS) {
    CITY_TILES.push({
      id: `c-${kind}-${shape}`, n: 0, group: 'stara', name: PLACES[kind].name,
      place: kind, shape, feats: SHAPES[shape].length ? [street(SHAPES[shape])] : [],
    });
  }
}
for (const span of Object.keys(SPANS)) {
  CITY_TILES.push({
    id: `c-aqueduct-${span}`, n: 0, group: 'stara', name: 'Aqueduct', arched: true,
    place: 'aqueduct', shape: 'X', span: SPANS[span], feats: [street(SHAPES.X)],
  });
}
registerTiles(CITY_TILES);

/** The keep's tile id (tiles.js): walls on every side, so it fits anything. */
export const KEEP = 'KEEP';
/** The first tile, in the middle. */
export const COMUNE = 'c-comune-X';

/** A cell's place, by kind: the keep is a place too, though it is a tile of tiles.js. */
export const kindOf = (cell) => cell?.type?.place || (cell?.type?.keep ? 'keep' : null);

/** The tile id for a place with streets out of `mask` (world sides), and its turn. */
export function tileFor(kind, mask, span = 0) {
  if (kind === 'keep') return { type: KEEP, rot: 0 };
  if (kind === 'aqueduct') {
    const f = SPAN_FOR[span];
    return { type: `c-aqueduct-${f.span}`, rot: f.rot };
  }
  const f = SHAPE_FOR[mask];
  return { type: `c-${kind}-${f.shape}`, rot: f.rot };
}

// --- reading a city -------------------------------------------------------------

const keyOf = (x, y) => `${x},${y}`;

/**
 * A city, as the scorer reads it: `bounds`, and one entry per square built,
 * `{x, y, kind, streets, span, arched, keep, piece}`, where `streets` and
 * `span` are masks of world sides. An aqueduct has a street out of every side
 * (it stands over one) and a keep none.
 */
export function cityOf(bounds, entries) {
  const at = new Map(entries.map((e) => [keyOf(e.x, e.y), e]));
  return { bounds, cells: entries, get: (x, y) => at.get(keyOf(x, y)) || null };
}

/** One board square as the scorer reads it. */
export function entryOf(cell) {
  const t = cell.type;
  const road = t.feats.find((f) => f.type === 'road');
  return {
    x: cell.x, y: cell.y, kind: kindOf(cell),
    streets: road ? turnMask(maskOf(road.sides), cell.rot) : 0,
    span: t.span ? turnMask(maskOf(t.span), cell.rot) : 0,
    arched: !!t.arched, keep: !!t.keep, piece: cell.piece ?? null,
  };
}

/** A Board, read as a city. */
export const boardCity = (board) => cityOf(board.bounds, [...board.cells.values()].map(entryOf));

const inside = (b, x, y) => x >= b.minX && x <= b.maxX && y >= b.minY && y <= b.maxY;

/** The sides of (x, y) against the town wall. */
export function wallSides(b, x, y) {
  return [0, 1, 2, 3].filter((s) => !inside(b, x + SIDE_STEP[s][0], y + SIDE_STEP[s][1]));
}

// --- the day's water ------------------------------------------------------------

/** The square on the wall that the arch opens onto. */
export function archSquare(of, arch) {
  const b = of.bounds || of;
  if (arch.s === 0) return { x: b.minX + arch.i, y: b.minY };
  if (arch.s === 2) return { x: b.minX + arch.i, y: b.maxY };
  if (arch.s === 1) return { x: b.maxX, y: b.minY + arch.i };
  return { x: b.minX, y: b.minY + arch.i };
}

/**
 * The squares with running water. The arch pours into a basin at the foot of
 * the wall, so its own square has water whatever is built there. A span on
 * that square opening onto the arch carries it on; if anything else stands
 * there, a span beside it opening onto the square takes it from the basin.
 * From there, water runs into a neighbouring span only where the two open
 * onto each other. `dist` is how many spans it has run through to reach each.
 */
export function waterOf(city, arch) {
  const out = new Set();
  out.dist = new Map();
  if (!arch || !city.bounds) return out;
  const at = archSquare(city.bounds, arch);
  const reach = (c, d) => { out.add(keyOf(c.x, c.y)); out.dist.set(keyOf(c.x, c.y), d); };
  const opens = (c, s) => !!(c && c.span & (1 << s));
  out.add(keyOf(at.x, at.y));
  out.dist.set(keyOf(at.x, at.y), 0);
  let todo = [];
  const first = city.get(at.x, at.y);
  if (opens(first, arch.s)) { reach(first, 1); todo.push(first); } else {
    // Built over with anything else, the basin still feeds a span beside it.
    for (let s = 0; s < 4; s++) {
      const nb = city.get(at.x + SIDE_STEP[s][0], at.y + SIDE_STEP[s][1]);
      if (!nb || out.dist.get(keyOf(nb.x, nb.y)) || !opens(nb, opposite(s))) continue;
      reach(nb, 1);
      todo.push(nb);
    }
  }
  // Breadth first, so each span is reached by its shortest way from the arch.
  while (todo.length) {
    const next = [];
    for (const c of todo) {
      const d = out.dist.get(keyOf(c.x, c.y));
      for (const s of sidesOf(c.span)) {
        const nb = city.get(c.x + SIDE_STEP[s][0], c.y + SIDE_STEP[s][1]);
        if (!nb || out.dist.get(keyOf(nb.x, nb.y)) || !opens(nb, opposite(s))) continue;
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

// --- the streets ------------------------------------------------------------------

/**
 * The four town gates, in the middle of each wall: the square on that side's
 * middle and the side it faces out of (0 N, 1 E, 2 S, 3 W).
 */
export function gatesOf(b) {
  const mx = (b.minX + b.maxX) / 2, my = (b.minY + b.maxY) / 2;
  return [
    { s: 0, x: mx, y: b.minY }, { s: 1, x: b.maxX, y: my },
    { s: 2, x: mx, y: b.maxY }, { s: 3, x: b.minX, y: my },
  ];
}

/**
 * The STREET NETWORKS, each with its squares and the gates it runs out
 * through (a side, or the keep). Two squares are on one network where a
 * street runs across the edge between them: both have a street on it, and
 * an aqueduct has one on every side. A street out through a town gate puts
 * the gate on its network (not an aqueduct's, which only stands over one);
 * so does a street that ends against a keep, a fifth gate.
 */
export function networksOf(city) {
  const parent = new Map();
  const find = (k) => {
    while (parent.get(k) !== k) { parent.set(k, parent.get(parent.get(k))); k = parent.get(k); }
    return k;
  };
  const roads = city.cells.filter((c) => c.streets);
  for (const c of roads) parent.set(keyOf(c.x, c.y), keyOf(c.x, c.y));
  for (const c of roads) {
    for (const s of sidesOf(c.streets)) {
      const nb = city.get(c.x + SIDE_STEP[s][0], c.y + SIDE_STEP[s][1]);
      if (!nb || !(nb.streets & (1 << opposite(s)))) continue;
      const a = find(keyOf(c.x, c.y)), b = find(keyOf(nb.x, nb.y));
      if (a !== b) parent.set(a, b);
    }
  }
  const nets = new Map();
  for (const c of roads) {
    const r = find(keyOf(c.x, c.y));
    if (!nets.has(r)) nets.set(r, { tiles: [], gates: new Set() });
    nets.get(r).tiles.push(keyOf(c.x, c.y));
  }
  const netOf = (c) => nets.get(find(keyOf(c.x, c.y)));
  for (const g of gatesOf(city.bounds)) {
    const c = city.get(g.x, g.y);
    if (c && !c.arched && c.streets & (1 << g.s)) netOf(c).gates.add(g.s);
  }
  for (const k of city.cells) {
    if (!k.keep) continue;
    for (let s = 0; s < 4; s++) {
      const nb = city.get(k.x + SIDE_STEP[s][0], k.y + SIDE_STEP[s][1]);
      if (nb && !nb.arched && nb.streets & (1 << opposite(s))) netOf(nb).gates.add(`keep ${k.x},${k.y}`);
    }
  }
  return { list: [...nets.values()], of: (c) => (c.streets ? netOf(c) : null) };
}

// --- what a city is worth -----------------------------------------------------------

/** The eight squares round (x, y). */
function* around(x, y) {
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (dx || dy) yield [x + dx, y + dy];
}

const noWays = () => ({ self: 0, near: 0, variety: 0, water: 0, wall: 0, gates: 0 });

/**
 * What the whole city is worth as it stands: every place's worth by square,
 * and by WAY; every high road's; and the totals, overall and by way. `arch`
 * is the day's water arch. Recomputed from scratch each time (49 squares at
 * most): the score is always exactly this, so laying a piece pays the
 * difference it makes.
 *
 * With `sources`, each square also says WHERE its points came from (the
 * squares round it it likes or dislikes, the sides on the wall), so the
 * board can light them in their way's colour before a piece is sealed.
 */
export function appraiseCity(city, arch, { sources = false } = {}) {
  const running = waterOf(city, arch);
  const nets = networksOf(city);
  const gates = gatesOf(city.bounds);
  const per = new Map();
  const ways = noWays();
  let total = 0;
  for (const cell of city.cells) {
    const P = PLACES[cell.kind];
    if (!P) continue;
    const w = noWays();
    const from = sources ? [] : null;
    w.self = P.base || 0;
    const kinds = new Set();
    for (const [ax, ay] of around(cell.x, cell.y)) {
      const o = city.get(ax, ay);
      if (!o || !o.kind || (cell.piece != null && o.piece === cell.piece)) continue;
      kinds.add(o.kind);
      const v = P.likes ? P.likes[o.kind] ?? P.likes['*'] ?? 0 : 0;
      w.near += v;
      if (from && v) from.push({ x: ax, y: ay, way: 'near', v });
    }
    if (P.variety) {
      w.variety += P.variety * kinds.size;
      if (from) for (const [ax, ay] of around(cell.x, cell.y)) {
        const o = city.get(ax, ay);
        if (o?.kind && !(cell.piece != null && o.piece === cell.piece)) from.push({ x: ax, y: ay, way: 'variety', v: 0 });
      }
    }
    if (P.line) {
      const seen = new Set();
      for (const o of city.cells) {
        if (o === cell || (o.x !== cell.x && o.y !== cell.y) || (cell.piece != null && o.piece === cell.piece)) continue;
        if (o.kind) seen.add(o.kind);
      }
      w.variety += P.line * seen.size;
    }
    if (P.wall) {
      const sides = wallSides(city.bounds, cell.x, cell.y);
      w.wall += P.wall * sides.length;
      if (from) for (const s of sides) from.push({ x: cell.x, y: cell.y, s, way: 'wall', v: P.wall });
    }
    const wet = isWatered(running, cell.x, cell.y);
    if (P.water && wet) w.water += P.water;
    if (P.flow && cell.span) w.water += P.flow * (running.dist.get(keyOf(cell.x, cell.y)) || 0);
    if (P.gates) w.gates += P.gates * (nets.of(cell)?.gates.size || 0);
    if (P.atGate && gates.some((g) => Math.abs(g.x - cell.x) <= 1 && Math.abs(g.y - cell.y) <= 1)) w.gates += P.atGate;
    let v = w.self + w.near + w.variety + w.water + w.wall + w.gates;
    // A place is never worth less than 0: what a dislike would take below
    // nothing is not taken.
    if (v < 0) { w.near -= v; v = 0; }
    per.set(keyOf(cell.x, cell.y), { kind: cell.kind, pts: v, wet, ways: w, from });
    for (const k in w) ways[k] += w[k];
    total += v;
  }
  const roads = [];
  for (const n of nets.list) {
    const pts = RULES.highRoad[Math.min(n.gates.size, RULES.highRoad.length - 1)] || 0;
    if (!pts) continue;
    roads.push({ pts, gates: n.gates.size, tiles: n.tiles });
    ways.gates += pts;
    total += pts;
  }
  return { total, per, ways, roads, running, nets };
}

/** The same, off a Board. */
export const appraise = (board, arch, opts) => appraiseCity(boardCity(board), arch, opts);

/**
 * A place's card, for the tray: its name, what it is, and what it wants, as
 * chips by way (`{way, text, loss}`), so each is drawn in its way's colour.
 * Made from PLACES, so it can never say other than what scores.
 */
export function describe(kind) {
  const P = PLACES[kind];
  if (!P) return null;
  const name = (k) => ({ '*': 'place', comune: 'the Comune', house: 'house' }[k] || (PLACES[k]?.name || k).toLowerCase());
  const spared = Object.entries(P.likes || {}).filter(([, v]) => v === 0).map(([k]) => `${name(k)}s`);
  const list = (ks) => (ks.length > 1 ? `${ks.slice(0, -1).join(', ')} or ${ks[ks.length - 1]}` : ks[0]);
  const chips = [];
  const chip = (way, text, loss = false) => chips.push({ way, text, loss });
  if (P.base) chip('self', `${P.base} itself`);
  const by = new Map();
  for (const [k, v] of Object.entries(P.likes || {})) {
    if (!v) continue;
    if (!by.has(v)) by.set(v, []);
    by.get(v).push(name(k));
  }
  for (const [v, ks] of [...by].sort((a, b) => b[0] - a[0])) {
    const but = ks.includes('place') && spared.length ? `, not ${list(spared)}` : '';
    chip('near', `${v > 0 ? '+' : '−'}${Math.abs(v)} each ${list(ks)} round it${but}`, v < 0);
  }
  if (P.variety) chip('variety', `+${P.variety} each different place round it`);
  if (P.line) chip('variety', `+${P.line} each different place in its row and column`);
  if (P.water) chip('water', `+${P.water} watered`);
  if (P.flow) chip('water', `+${P.flow} for each span the water has come`);
  if (P.wall) chip('wall', `+${P.wall} each side on the wall`);
  if (P.gates) chip('gates', `+${P.gates} each gate its street reaches`);
  if (P.atGate) chip('gates', `+${P.atGate} by a town gate`);
  const powers = [];
  if (kind === 'keep') powers.push('fits anything; a street ending at it is a gate');
  if (P.scry) powers.push(`see ${P.scry} pieces ahead`);
  return { kind, name: P.name, about: P.about, chips, powers };
}

/** The tile types a piece is made of are all one place's: which. */
export const pieceKind = (piece) => kindOf({ type: TILES[piece.cells[0].type] });
