// ---------------------------------------------------------------------------
// Starà measured: a simulator for docs/STARA-DESIGN.md (2026-11-19).
//
// Built straight on the Board rather than through Game, so the rules can be
// varied. Two players on the same deals: RANDOM (a random tile from the hand,
// a random legal spot) and GREEDY (every tile in hand at every legal spot,
// keeping whichever leaves the highest score as if the day ended there). The
// greedy player does not plan, so rules that reward planning look worse to it
// than they are: read its numbers as a floor on what skill can do.
//
//   node tools/stara-sim.mjs            the 7 x 7, every variant, 100 deals each
//   SIDE=5 node tools/stara-sim.mjs     the 5 x 5
// ---------------------------------------------------------------------------
// A Starà simulator built straight on the Board, so rules can be varied.
// Players: random, and greedy (maximises the true end-of-day score after each
// placement, over every tile in hand and every legal spot).
import { Board } from '../src/board.js';
import { buildDeck, TILES, opposite } from '../src/tiles.js';
import { quietOf, highways as shippedHighways, tradesFor, QUARTERS, quarterWorth } from '../src/modes/stara.js';

function mulberry(a) {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const BASE = {
  side: 7,
  unfinishedPays: true,   // current: unfinished road 1/tile, district 1/tile+pennant
  quarters: true,
  charter: true,
  gates: true,
  gateCurve: null,        // null = gates*tiles; else array by gate count of flat points
  deal: 'all',            // 'all' = whole deck, free set-aside; number = deal that many
  holePenalty: 0,         // points per empty square at the end
  gateOnlyRoads: false,   // roads may meet the wall only at a gate
  handBase: 1,
  abbeyHand: true,
};

// Highways with the gates as a parameter: R.gatesAt = 'mid' (shipped, middle of
// each side) or 'two' (two per side, one square in from each corner).
function gateList(board, R) {
  const b = board.bounds, side = R.side, mx = 0, my = 0;
  const idx = R.gatesAt === 'two' ? [b.minX + 1, b.maxX - 1] : [mx];
  const out = [];
  for (const i of idx) {
    out.push({ s: 0, x: i, y: b.minY }, { s: 2, x: i, y: b.maxY });
    out.push({ s: 1, x: b.maxX, y: i }, { s: 3, x: b.minX, y: i });
  }
  return out;
}
export function highways(board, R) {
  if (!R || !R.gatesAt || R.gatesAt === 'mid') return shippedHighways(board);
  const parent = new Map();
  const find = (d) => { while (parent.get(d) !== d) { parent.set(d, parent.get(parent.get(d))); d = parent.get(d); } return d; };
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
    if (!ways.has(r)) ways.set(r, { tiles: new Set(), gates: new Set() });
    for (const t of d.tiles) ways.get(r).tiles.add(t);
  }
  gateList(board, R).forEach(({ s, x, y }, gi) => {
    const cell = board.get(x, y);
    if (!cell || board.edgeAt(cell, s) !== 'r') return;
    const i = board.featAt(cell, s);
    const d = i == null ? null : board.featureOf(x, y, i);
    if (d && parent.has(d)) ways.get(find(d)).gates.add(gi);
  });
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

function score(board, R, trades) {
  const t = { districts: 0, roads: 0, abbeys: 0, gates: 0, quarters: 0, charter: 0, unfinished: 0, holes: 0 };
  let closedCities = 0, cityMass = 0, roadMass = 0, cityParts = 0;
  for (const d of board.allComponents()) {
    if (d.type === 'field') continue;
    if (d.type === 'city') { cityMass += 2 * d.tiles.size + 2 * (d.shields || 0); cityParts++; }
    if (d.type === 'road') roadMass += d.tiles.size;
    if (d.type === 'monastery') { t.abbeys += quietOf(board, d.at.x, d.at.y); continue; }
    const n = d.tiles.size, s = d.shields || 0;
    if (d.type === 'city') {
      if (d.open === 0) { t.districts += R.cityCurve ? R.cityCurve(n, s) : 2 * n + 2 * s; closedCities++; }
      else if (R.unfinishedPays) t.unfinished += n + s;
    } else if (d.type === 'road') {
      if (d.open === 0) t.roads += n;
      else if (R.unfinishedPays) t.unfinished += n;
    }
  }
  if (R.gates) {
    for (const w of highways(board, R)) {
      const g = w.gates.size;
      if (!g) continue;
      t.gates += R.gateCurve ? R.gateCurve[Math.min(g, R.gateCurve.length - 1)] : g * w.tiles.size;
    }
  }
  if (R.quarters) for (const q of QUARTERS) t.quarters += quarterWorth(board, q, trades[q]).pts;
  if (R.charter) t.charter += 2 * closedCities;
  t.holes = -R.holePenalty * (R.side * R.side - board.size);
  t.total = Object.values(t).reduce((a, b) => a + b, 0);
  t.cityMass = cityMass; t.roadMass = roadMass; t.cityParts = cityParts;
  return t;
}

// The greedy player's eye for what is still open: a fraction of what it would
// pay closed, beyond what it pays as it stands. The same for every variant.
function hope(board, R) {
  let h = 0;
  for (const d of board.allComponents()) {
    if (d.open === 0 || (d.type !== 'city' && d.type !== 'road')) continue;
    const n = d.tiles.size, s = d.shields || 0;
    const closed = d.type === 'city' ? 2 * n + 2 * s + (R.charter ? 2 : 0) : n;
    const now = R.unfinishedPays ? (d.type === 'city' ? n + s : n) : 0;
    h += 0.4 * (closed - now);
  }
  return h;
}

function makeBoard(R) {
  const r = (R.side - 1) / 2;
  const b = new Board({ bounds: { minX: -r, maxX: r, minY: -r, maxY: r }, walled: true });
  if (R.gateOnlyRoads) {
    const gates = new Set(gateList(b, R).map((g) => `${g.x},${g.y},${g.s}`));
    const base = b.canPlace.bind(b);
    b.canPlace = (x, y, type, rot, opts) => {
      if (!base(x, y, type, rot, opts)) return false;
      for (const s of b.wallSidesAt(x, y)) {
        if (b.edgeAt({ type, rot }, s) === 'r' && !gates.has(`${x},${y},${s}`)) return false;
      }
      return true;
    };
  }
  return b;
}

function legal(board, id) {
  return board.legalPlacements(TILES[id]);
}

export function play(seed, R = BASE, who = 'greedy') {
  R = { ...BASE, ...R };
  const rng = mulberry(seed * 7919 + 13);
  const choose = mulberry(seed * 104729 + 7);
  const squares = R.side * R.side;
  let deck = buildDeck(['base'], rng, 'D');
  const k = 1 + Math.floor(rng() * Math.floor(squares / 3));
  deck.splice(deck.length - k + 1, 0, 'KEEP');
  if (typeof R.deal === 'number') deck = deck.slice(deck.length - R.deal);
  const trades = tradesFor(seed);
  const board = makeBoard(R);
  board.place(0, 0, TILES.D, 0);
  let hand = [], abbeys = 0, setAside = 0, drawn = 0, turns = 0;
  const spreads = [], options = [];
  for (;;) {
    hand = hand.filter((id) => legal(board, id).length || (setAside++, false));
    const size = R.handBase + (R.abbeyHand ? abbeys : 0);
    while (hand.length < size && deck.length) {
      const id = deck.pop(); drawn++;
      if (legal(board, id).length) hand.push(id); else setAside++;
    }
    if (!hand.length || board.size >= squares) break;
    turns++;
    // every (tile in hand, spot)
    const moves = [];
    hand.forEach((id, hi) => { for (const p of legal(board, id)) moves.push({ hi, id, ...p }); });
    let pick;
    if (who === 'random') {
      const hi = Math.floor(choose() * hand.length);
      const mine = moves.filter((m) => m.hi === hi);
      pick = mine[Math.floor(choose() * mine.length)];
    } else {
      let best = -Infinity; const vals = [];
      for (const m of moves) {
        board.place(m.x, m.y, TILES[m.id], m.rot);
        const v = score(board, R, trades).total + (R.hope ? hope(board, R) : 0) + choose() * 0.01;
        board.remove(m.x, m.y);
        vals.push(v);
        if (v > best) { best = v; pick = m; }
      }
      vals.sort((a, b) => a - b);
      spreads.push(best - vals[Math.floor(vals.length / 2)]);
      options.push(moves.length);
    }
    board.place(pick.x, pick.y, TILES[pick.id], pick.rot);
    hand.splice(pick.hi, 1);
    if (TILES[pick.id].feats.some((f) => f.type === 'monastery')) abbeys++;
  }
  const t = score(board, R, trades);
  const ways = highways(board, R).map((w) => w.gates.size);
  return { seed, ...t, filled: board.size, full: board.size >= squares, setAside, drawn, turns,
    bestGates: Math.max(0, ...ways), spread: spreads, options, maxHand: R.handBase + abbeys };
}

// --- the variants table ---------------------------------------------------------

if (process.argv[1]?.endsWith('stara-sim.mjs')) {
  const N = 100;
  const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const sd = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((x) => (x - m) ** 2))); };
  const tri = (n, s) => (n * (n + 1)) / 2 + 2 * s;
  const side = +process.env.SIDE || 7, sq = side * side - 1;
  const V = [
    ['as shipped', {}],
    ['A unfinished pays 0', { unfinishedPays: false }],
    ['B finite deal (+6), -2 a hole', { deal: sq + 6, holePenalty: 2 }],
    ['C roads leave only by a gate', { gateOnlyRoads: true }],
    ['D no quarters, no charter', { quarters: false, charter: false }],
    ['E hand 1, no abbey growth', { abbeyHand: false }],
    ['F hand 2, no abbey growth', { abbeyHand: false, handBase: 2 }],
    ['H districts n(n+1)/2, unfin 0', { cityCurve: tri, unfinishedPays: false }],
    ['I two gates a side', { gatesAt: 'two' }],
    ['J I + roads only by a gate', { gatesAt: 'two', gateOnlyRoads: true }],
    ['L I + no quarters, no charter', { gatesAt: 'two', quarters: false, charter: false }],
    ['M L + unfin 0, -2 a hole, +6 deal', { gatesAt: 'two', quarters: false, charter: false, unfinishedPays: false, deal: sq + 6, holePenalty: 2 }],
  ];
  console.log(`${side}x${side} | variant | greedy | random | floor | gap(sd) | gates g/r | dist g/r | best hwy 3+ gates | trivial turns | filled | set aside`);
  for (const [label, R0] of V) {
    const R = { side, ...R0 };
    const G = [], Rn = [];
    for (let s = 1; s <= N; s++) { G.push(play(s, R, 'greedy')); Rn.push(play(s, R, 'random')); }
    const g = G.map((r) => r.total), r = Rn.map((r) => r.total);
    const sp = G.flatMap((x) => x.spread);
    console.log([label, mean(g).toFixed(0), mean(r).toFixed(0), (mean(r) / mean(g) * 100).toFixed(0) + '%',
      ((mean(g) - mean(r)) / sd(r)).toFixed(2), `${mean(G.map((x) => x.gates)).toFixed(0)}/${mean(Rn.map((x) => x.gates)).toFixed(0)}`,
      `${mean(G.map((x) => x.districts)).toFixed(0)}/${mean(Rn.map((x) => x.districts)).toFixed(0)}`,
      G.filter((x) => x.bestGates >= 3).length + '%', (sp.filter((x) => x < 1).length / sp.length * 100).toFixed(0) + '%',
      mean(G.map((x) => x.filled)).toFixed(1), mean(G.map((x) => x.setAside)).toFixed(1)].join(' | '));
  }
}
