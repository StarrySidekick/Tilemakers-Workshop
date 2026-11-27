// ---------------------------------------------------------------------------
// Starà's city: the places, the ways a city is paid, and the one scorer.
//
// Split out of stara.js on 2026-11-27 (the sixth pass) so the level maker
// (stara-plan.js) and the mode (stara.js) score a city with the SAME code.
// The scorer reads a city as a list of squares, each with its place and the
// sides its streets run out of, plus the aqueduct's spans and the day's
// spring; `boardCity` reads one off a Board, and the level maker builds its
// own as it plans. Two implementations of the rules would drift; one cannot.
//
// THE SEVENTH PASS (2026-11-27). Timothy: "I feel like the mechanics for
// points should be a little simpler than they are now, and we should
// probably start with less kinds of tiles ... a cathedral, a plaza,
// housing, aqueducts, maybe one or two other things just to start because
// I'm trying to figure out the actual mechanics of the game." And, of the
// square: "having the border on the outside is kind of restricting ... the
// bigger the castle walls get, the less points you get ... the solitary
// version of Carcassonne that's in the old Carcassonne mobile app".
// Asked, he chose all three recommendations:
//
//   THE WALL HUGS THE CITY. There is no border. The town wall runs round
//   whatever is built, and every stretch of it (one side of a square left
//   facing open ground) costs a point, a gate two. The old app's Solitaire
//   charged for widening the field the same way: a compact city is a cheap
//   one.
//
//   HOUSES AND WHAT THEY HAVE. Only houses score: 1 a square, +1 beside a
//   plaza (the Comune is one), +1 watered, +1 beside the cathedral. The
//   plazas, the cathedral and the aqueduct score nothing themselves; they
//   are what makes a house worth more.
//
//   STREETS MEET, AND LEAVE BY GATES. A street must still meet a street. A
//   street that runs out of the city puts a gate in the wall, and the one
//   street that leaves the city on the most of its four sides (two or more)
//   is its high road.
//
// And, from the same list: "I feel like aqueducts should be like a second
// layer above all the other stuff ... you should be able to have a road go
// under an aqueduct". So the aqueduct is not a place on a square any more.
// It stands over the city on its arches, over anything, and out over the
// open country to the day's spring, and the wall takes no notice of it.
//
// THE WAYS, coloured as before, in heraldry's tinctures:
//
//   houses      argent (parchment)   1 for each square of houses
//   plaza       vert (green)         a house beside a plaza or the Comune
//   water       azure (blue)         a house the aqueduct waters
//   cathedral   purpure (violet)     a house beside the cathedral
//   roads       or (gold)            high roads out through the gates
//   wall        sable (black)        every stretch of wall, always a cost
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

/** The ways a city is paid, in the order a card and the charter list them. */
export const WAYS = [
  { id: 'houses', name: 'Houses', tincture: 'argent', colour: '#efe3c4', ink: '#3a2616' },
  { id: 'plaza', name: 'Beside a plaza', tincture: 'vert', colour: '#3f7d34', ink: '#fff6e4' },
  { id: 'water', name: 'Watered', tincture: 'azure', colour: '#2f6fb0', ink: '#fff6e4' },
  { id: 'cathedral', name: 'Beside the cathedral', tincture: 'purpure', colour: '#7b4f93', ink: '#fff6e4' },
  { id: 'roads', name: 'High roads', tincture: 'or', colour: '#c8961e', ink: '#2b1a0d' },
  { id: 'wall', name: 'The wall', tincture: 'sable', colour: '#2f2b28', ink: '#fff6e4' },
];
export const WAY = Object.fromEntries(WAYS.map((w) => [w.id, w]));
/** A loss, whichever way it came (a lift, a house no longer beside a plaza): gules. */
export const LOSS = { colour: '#a8392c', ink: '#fff6e4' };

/**
 * THE PLACES. Only houses score; the rest are what a house can have.
 *
 *   plaza    a house beside it (in the eight squares round it) has a plaza
 *   above    laid over the city, not on a square of it (the aqueduct)
 *
 * The level maker reads the rest: `sizes` is how many squares a piece of it
 * may cover, `streets` whether it wants few streets or many, and `one` a
 * place there is only one of.
 */
export const PLACES = {
  comune: {
    name: 'Piazza del Comune', start: true, plaza: true,
    about: 'The town hall\'s square, in the middle, where the day starts. A plaza: every house round it has one.',
  },
  house: {
    name: 'Houses', sizes: [1, 2, 3, 4], streets: 'any',
    about: 'Where the people live. The only place that scores.',
  },
  plaza: {
    name: 'Plaza', sizes: [1], streets: 'many', plaza: true,
    about: 'Where the streets meet. Every house round it has a plaza.',
  },
  cathedral: {
    name: 'Cathedral', one: true, sizes: [1], streets: 'few',
    about: 'The duomo. Every house round it is in its parish.',
  },
  aqueduct: {
    name: 'Aqueduct', sizes: [1, 2, 3], above: true,
    about: 'Carries the water in from the spring on its arches, over anything: streets and houses run on under it.',
  },
};
export const PLACE_IDS = Object.keys(PLACES);
/** The places that are plazas: a house beside one has a plaza. */
const PLAZAS = new Set(PLACE_IDS.filter((k) => PLACES[k].plaza));

/** The rules that are numbers. */
export const RULES = {
  /** A square of houses, and each thing it can have. */
  house: 1, plaza: 1, water: 1, cathedral: 1,
  /** Each stretch of wall: one side of a square facing open ground. */
  wall: 1,
  /**
   * …and a GATE, a stretch a street runs out through, this much more: a
   * gatehouse costs more than a curtain wall. A call of Claude's (MODES.md,
   * the seventh pass): with gates free, a street out on all four sides came
   * to every city whatever you did (16 points to random play as to careful),
   * and the plan let streets out of 13 of its 20 stretches. At 1 more, the
   * plan builds one gate a side, and a street left running out of the city
   * is a cost to be planned for: Carcassonne's open road, by another name.
   */
  gate: 1,
  /**
   * The high road: for each side of the city it leaves by, once it leaves by
   * two or more. Only the city's one best street pays: every separate
   * street paying would make a city of many short streets the best city.
   */
  highRoad: 4,
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
 * aqueduct's are by span and have no streets: they stand over the city,
 * never on a square of it. None is dealt by count: the day's plan cuts the
 * deal.
 */
export const CITY_TILES = [];
for (const kind of PLACE_IDS) {
  if (kind === 'aqueduct') continue;
  for (const shape of SHAPE_IDS) {
    CITY_TILES.push({
      id: `c-${kind}-${shape}`, n: 0, group: 'stara', name: PLACES[kind].name,
      place: kind, shape, feats: SHAPES[shape].length ? [street(SHAPES[shape])] : [],
    });
  }
}
for (const span of Object.keys(SPANS)) {
  CITY_TILES.push({
    id: `c-aqueduct-${span}`, n: 0, group: 'stara', name: 'Aqueduct', arched: true, above: true,
    place: 'aqueduct', shape: '0', span: SPANS[span], feats: [],
  });
}
registerTiles(CITY_TILES);

/** The first tile, in the middle. */
export const COMUNE = 'c-comune-X';

/** A cell's place, by kind. */
export const kindOf = (cell) => cell?.type?.place || null;

/** The tile id for a place with streets out of `mask` (world sides), and its turn. */
export function tileFor(kind, mask, span = 0) {
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
 * A city, as the scorer reads it: one entry per square built,
 * `{x, y, kind, streets, piece}` (`streets` a mask of world sides); the
 * aqueduct's spans over it, `{x, y, span, piece}`; and the day's `spring`,
 * `{x, y}`, where the water rises.
 *
 * `land` is the long form's (Contado, contado.js): the ground's level at
 * every square, `level(x, y)`, and the spring's, `spring`. The daily has
 * none, and its table is flat.
 */
export function cityOf(entries, spans = [], spring = null, land = null) {
  const at = new Map(entries.map((e) => [numKey(e.x, e.y), e]));
  const over = new Map(spans.map((s) => [numKey(s.x, s.y), s]));
  return {
    cells: entries, spans, spring, land,
    get: (x, y) => at.get(numKey(x, y)) || null,
    spanAt: (x, y) => over.get(numKey(x, y)) || null,
  };
}

/** A square as one number, for the scorer's own lookups (a string per lookup was most of its time). */
const numKey = (x, y) => (x + 4096) * 8192 + (y + 4096);

/** One board square as the scorer reads it. */
export function entryOf(cell) {
  const t = cell.type;
  const road = t.feats.find((f) => f.type === 'road');
  return {
    x: cell.x, y: cell.y, kind: kindOf(cell),
    streets: road ? turnMask(maskOf(road.sides), cell.rot) : 0,
    piece: cell.piece ?? null,
  };
}

/** One aqueduct square (a piece's cell laid at x, y) as the scorer reads it. */
export const spanEntry = (x, y, type, rot, piece = null) => ({ x, y, span: turnMask(maskOf(TILES[type].span), rot), piece });

/**
 * A Board, read as a city, with the water layer: `water` is the mode's
 * `{spring, spans}`, `spans` a Map of key to span entry.
 */
export const boardCity = (board, water = null) => cityOf(
  [...board.cells.values()].map(entryOf), water ? [...water.spans.values()] : [], water?.spring || null, water?.land || null);

// --- the wall -------------------------------------------------------------------

/**
 * THE WALL: every side of a built square that faces open ground, as
 * `{x, y, s}`, and which of them a street runs out through (`gate`). The
 * aqueduct is not built ground: it stands over the country, and the wall
 * runs on under it. Sorted, so a picture keyed on it is stable.
 *
 * On the long form's land a stretch facing LOWER ground is on the brow of
 * a slope (`slope`): the hill is its defence, and it costs nothing but its
 * gate (contado.js).
 */
export function wallOf(city) {
  const out = [];
  const lv = city.land?.level;
  for (const c of city.cells) {
    for (let s = 0; s < 4; s++) {
      const nx = c.x + SIDE_STEP[s][0], ny = c.y + SIDE_STEP[s][1];
      if (city.get(nx, ny)) continue;
      const w = { x: c.x, y: c.y, s, gate: !!(c.streets & (1 << s)) };
      if (lv && lv(nx, ny) < lv(c.x, c.y)) w.slope = true;
      out.push(w);
    }
  }
  return out.sort((a, b) => a.y - b.y || a.x - b.x || a.s - b.s);
}

// --- the day's water ------------------------------------------------------------

/**
 * The squares with running water. The spring's own square runs; a span
 * beside it opening onto it takes the water, and from there water runs into
 * a neighbouring span only where the two open onto each other. `dist` is how
 * many spans it has run through to reach each.
 *
 * On the long form's land the channel holds the spring's level, so water
 * never runs into a span over ground higher than the spring: it would have
 * to run uphill.
 */
export function waterOf(city) {
  const out = new Set();
  out.dist = new Map();
  const sp = city.spring;
  if (!sp) return out;
  const reach = (c, d) => { out.add(keyOf(c.x, c.y)); out.dist.set(keyOf(c.x, c.y), d); };
  const land = city.land;
  const opens = (c, s) => !!(c && c.span & (1 << s)) && (!land || land.level(c.x, c.y) <= land.spring);
  reach(sp, 0);
  let todo = [];
  for (let s = 0; s < 4; s++) {
    const nb = city.spanAt(sp.x + SIDE_STEP[s][0], sp.y + SIDE_STEP[s][1]);
    if (!nb || !opens(nb, opposite(s))) continue;
    reach(nb, 1);
    todo.push(nb);
  }
  // Breadth first, so each span is reached by its shortest way from the spring.
  while (todo.length) {
    const next = [];
    for (const c of todo) {
      const d = out.dist.get(keyOf(c.x, c.y));
      for (const s of sidesOf(c.span)) {
        const nb = city.spanAt(c.x + SIDE_STEP[s][0], c.y + SIDE_STEP[s][1]);
        if (!nb || out.dist.has(keyOf(nb.x, nb.y)) || !opens(nb, opposite(s))) continue;
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

/** Where a watered square's water is: itself, or the running square beside it. */
function waterFor(running, x, y) {
  if (running.has(keyOf(x, y))) return { x, y };
  for (const [dx, dy] of SIDE_STEP) if (running.has(keyOf(x + dx, y + dy))) return { x: x + dx, y: y + dy };
  return null;
}

// --- the streets ------------------------------------------------------------------

/**
 * The STREET NETWORKS, each with its squares and its gates: two squares are
 * on one network where a street runs across the edge between them, and a
 * street out of a side of a square that faces open ground is a gate, on
 * that side (0 N, 1 E, 2 S, 3 W) of the city. `sides` is which of the four a
 * network leaves the city by.
 */
export function networksOf(city) {
  const parent = new Map();
  const find = (k) => {
    while (parent.get(k) !== k) { parent.set(k, parent.get(parent.get(k))); k = parent.get(k); }
    return k;
  };
  const roads = city.cells.filter((c) => c.streets);
  for (const c of roads) parent.set(numKey(c.x, c.y), numKey(c.x, c.y));
  for (const c of roads) {
    for (let s = 0; s < 4; s++) {
      if (!(c.streets & (1 << s))) continue;
      const nb = city.get(c.x + SIDE_STEP[s][0], c.y + SIDE_STEP[s][1]);
      if (!nb || !(nb.streets & (1 << opposite(s)))) continue;
      const a = find(numKey(c.x, c.y)), b = find(numKey(nb.x, nb.y));
      if (a !== b) parent.set(a, b);
    }
  }
  const nets = new Map();
  for (const c of roads) {
    const r = find(numKey(c.x, c.y));
    if (!nets.has(r)) nets.set(r, { tiles: [], gates: [], sides: new Set() });
    const n = nets.get(r);
    n.tiles.push(keyOf(c.x, c.y));
    for (let s = 0; s < 4; s++) {
      if (!(c.streets & (1 << s)) || city.get(c.x + SIDE_STEP[s][0], c.y + SIDE_STEP[s][1])) continue;
      n.gates.push({ x: c.x, y: c.y, s });
      n.sides.add(s);
    }
  }
  const netOf = (c) => nets.get(find(numKey(c.x, c.y)));
  return { list: [...nets.values()], of: (c) => (c.streets ? netOf(c) : null) };
}

// --- what a city is worth -----------------------------------------------------------


export const noWays = () => ({ houses: 0, plaza: 0, water: 0, cathedral: 0, roads: 0, wall: 0 });

/**
 * What the whole city is worth as it stands: every square's worth and its
 * ways (only houses earn); the wall and what it costs; every high road and
 * what it pays; and the totals, overall and by way. Recomputed from
 * scratch each time (a few dozen squares): the score is always exactly
 * this, so laying a piece pays the difference it makes.
 *
 * With `sources`, each house also says WHERE its points came from (the
 * plaza and the cathedral beside it, the water that reaches it), so the
 * board can light them in their way's colour before a piece is sealed.
 */
export function appraiseCity(city, { sources = false } = {}) {
  const running = waterOf(city);
  const nets = networksOf(city);
  const per = new Map();
  const ways = noWays();
  let total = 0;
  for (const cell of city.cells) {
    const w = noWays();
    const from = sources ? [] : null;
    const wet = isWatered(running, cell.x, cell.y);
    if (cell.kind === 'house') {
      w.houses = RULES.house;
      let plaza = null, church = null;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (!dx && !dy) continue;
          const o = city.get(cell.x + dx, cell.y + dy);
          if (!o) continue;
          if (!plaza && PLAZAS.has(o.kind)) plaza = o;
          if (!church && o.kind === 'cathedral') church = o;
        }
      }
      if (plaza) { w.plaza = RULES.plaza; from?.push({ x: plaza.x, y: plaza.y, way: 'plaza' }); }
      if (church) { w.cathedral = RULES.cathedral; from?.push({ x: church.x, y: church.y, way: 'cathedral' }); }
      if (wet) { w.water = RULES.water; const f = waterFor(running, cell.x, cell.y); from?.push({ x: f.x, y: f.y, way: 'water' }); }
    }
    const pts = w.houses + w.plaza + w.water + w.cathedral;
    per.set(keyOf(cell.x, cell.y), { kind: cell.kind, pts, wet, ways: w, from });
    for (const k in w) ways[k] += w[k];
    total += pts;
  }
  const wall = wallOf(city);
  ways.wall = -RULES.wall * wall.filter((w) => !w.slope).length - RULES.gate * wall.filter((w) => w.gate).length;
  total += ways.wall;
  // THE HIGH ROAD: the one street that leaves the city on the most of its
  // four sides (the most gates, between two as good), from two sides up.
  const roads = [];
  let road = null;
  for (const n of nets.list) {
    if (n.sides.size < 2) continue;
    if (!road || n.sides.size > road.sides.size || (n.sides.size === road.sides.size && n.gates.length > road.gates.length)) road = n;
  }
  if (road) {
    const pts = RULES.highRoad * road.sides.size;
    roads.push({ pts, sides: road.sides.size, gates: road.gates, tiles: road.tiles });
    ways.roads += pts;
    total += pts;
  }
  return { total, per, ways, roads, running, nets, wall };
}

/** The same, off a Board and the mode's water. */
export const appraise = (board, water, opts) => appraiseCity(boardCity(board, water), opts);

/**
 * A place's card, for the tray: its name, what it is, and what it gives, as
 * chips by way (`{way, text}`), so each is drawn in its way's colour. Made
 * from PLACES and RULES, so it can never say other than what scores.
 */
export function describe(kind) {
  const P = PLACES[kind];
  if (!P) return null;
  const chips = [];
  const chip = (way, text) => chips.push({ way, text });
  const powers = [];
  if (kind === 'house') {
    chip('houses', `${RULES.house} a square`);
    chip('plaza', `+${RULES.plaza} beside a plaza`);
    chip('water', `+${RULES.water} watered`);
    chip('cathedral', `+${RULES.cathedral} beside the cathedral`);
  } else if (P.plaza) {
    chip('plaza', `+${RULES.plaza} to each house round it`);
  } else if (kind === 'cathedral') {
    chip('cathedral', `+${RULES.cathedral} to each house round it`);
  } else if (kind === 'aqueduct') {
    chip('water', `+${RULES.water} to each house under it or beside it, once the water runs`);
    powers.push('goes over anything; the wall takes no notice of it');
  }
  // Every place is walled round: what is left facing open ground costs.
  if (!P.above) chip('wall', `−${RULES.wall} a stretch of wall, −${RULES.wall + RULES.gate} a gate`);
  return { kind, name: P.name, about: P.about, chips, powers };
}

/** The tile types a piece is made of are all one place's: which. */
export const pieceKind = (piece) => kindOf({ type: TILES[piece.cells[0].type] });
