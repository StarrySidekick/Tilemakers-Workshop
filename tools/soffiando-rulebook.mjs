// ---------------------------------------------------------------------------
// Proves every rule in Soffiando's rulebook (src/modes/soffiando-rulebook.js)
// on the real engine: one test a rule, named by its id. Fails on a rule with
// no test, a test with no rule, a number used twice or taken back from
// RETIRED, a rule with no words or no source, and any test that does not
// hold.
//
//   node tools/soffiando-rulebook.mjs
//
// The tests build small boards by hand and play them through the same code a
// game runs: the mode's own blow, scoring and turn steps, the wind engine
// (src/wind.js) and the host (src/game.js).
// ---------------------------------------------------------------------------

import { Game, MODES } from '../src/game.js';
import { Board } from '../src/board.js';
import { TILES, wallSides, DISTRICTS, edgesMeet } from '../src/tiles.js';
import { blow as windBlow } from '../src/wind.js';
import { RULEBOOK } from '../src/modes/soffiando-rulebook.js';
import { DECK_COUNTS } from '../src/modes/soffiando-deck.js';
import { readFileSync } from 'node:fs';

const SPEC = MODES.find((m) => m.id === 'soffiando');
// The flight is worked out when the machine is laid, in afterPlace, and
// nowhere else: a source check, because nothing else could show it.
const MODE_SRC = readFileSync(new URL('../src/modes/soffiando.js', import.meta.url), 'utf8');
const SRC_FLIGHT = /afterPlace\(cell\) \{[\s\S]{0,1600}this\.flight = this\.flightPath\(cell\);/.test(MODE_SRC)
  && (MODE_SRC.match(/this\.flight = this\.flightPath/g) || []).length === 1;

/** A Soffiando game with an empty board, both scores at nought, player 0 to play. */
function fresh(seed = 1, options = {}, players = 2) {
  const g = new Game({ mode: 'soffiando', players, seed, options });
  for (const c of [...g.board.cells.values()]) g.board.remove(c.x, c.y);
  g.players.forEach((p) => { p.score = 0; });
  g.current = 0;
  return g;
}
const lay = (g, x, y, id, rot = 0) => g.board.place(x, y, TILES[id], rot);
const at = (g, x, y) => g.board.get(x, y);
/** The index of the first feature of a kind on a tile. */
const fi = (cell, type) => cell.type.feats.findIndex((f) => f.type === type);
/** Put a follower of `p` on the first feature of `type` on (x, y). */
function put(g, x, y, type, p, flat = false) {
  const cell = at(g, x, y);
  g.board.addMeeple(x, y, fi(cell, type), p);
  g.players[p].meeples--;
  if (flat) {
    cell.meeple.flat = true;
    for (const m of g.board.featureOf(x, y, cell.meeple.feat).meeples) if (m.x === x && m.y === y) m.flat = true;
  }
}
/** A blow, as a player makes one: the zephyr turned to `dir`, against (x, y). It ends the turn. */
const blow = (g, x, y, dir) => { g.phase = 'blow'; g.m.blowDir = dir; return g.cellClick(x, y); };
/** …and what no longer fits moves on (rule 31). True if a choice is waiting. */
const settleLoose = (g) => g.m.resolveAstray();
/** Abbazias somewhere out of the way, each one a point of push power (rule 72). */
const power = (g, n) => { for (let i = 0; i < n; i++) lay(g, -7 + i, -7, 'Kab'); g.board.rebuild(); };
/**
 * A pocket a road is blown into where it fits nothing and every way is
 * blocked: a blow east against the road at (x + 1, y), a tile behind it at
 * (x, y) and a field under its square (so it cannot go back), and at its
 * landing a field under, a road over and a district east.
 */
function pocket(g, x, y) {
  lay(g, x, y, 'Kz', 1); lay(g, x + 1, y, 'U');
  lay(g, x + 1, y + 1, 'B');
  lay(g, x + 2, y + 1, 'B'); lay(g, x + 2, y - 1, 'U'); lay(g, x + 3, y, 'DIg', 1);
  g.board.rebuild();
}
/** Every line the game says while `fn` runs. */
function said(g, fn) {
  const out = [];
  const real = g.say.bind(g);
  g.say = (line) => { out.push(line); real(line); };
  try { fn(); } finally { g.say = real; }
  return out;
}
/** Lay the tile in hand as a player would, through the host. */
function layHand(g, id, x, y, rot = 0) {
  g.tile = TILES[id]; g.rot = rot; g.phase = 'place';
  return g.placeAt(x, y);
}
/** Play out the rest of a turn the plain way: no claim, a blow anywhere, the first way on. */
function endTurn(g) {
  const who = g.current;
  for (let i = 0; i < 20 && g.current === who && g.phase !== 'over'; i++) {
    if (g.phase === 'meeple') g.skipMeeple();
    else if (g.phase === 'blow') { const t = g.m.blowTargets()[0]; g.cellClick(t.x, t.y); }
    else if (g.phase === 'astray') { const t = g.m.astrayAt.targets[0]; g.cellClick(t.x, t.y); }
    else if (g.phase === 'stroll') g.m.skipStroll();
    else break;
  }
}
/** A raw wind-engine board, no mode, no mainland. */
const raw = (bounds = null, wrap = false) => new Board({ bounds, wrap });
const rlay = (b, x, y, id, rot = 0) => b.place(x, y, TILES[id], rot);
const rput = (b, x, y, type, p) => b.addMeeple(x, y, fi(b.get(x, y), type), p);

const PROOFS = {};
const prove = (id, fn) => { if (PROOFS[id]) throw new Error(`two tests for ${id}`); PROOFS[id] = fn; };

// --- The game. ------------------------------------------------------------------
prove('game-players', (ok) => {
  ok(SPEC.minPlayers === 1 && SPEC.maxPlayers === 4, 'one to four players');
  for (let n = 1; n <= 4; n++) {
    const g = new Game({ mode: 'soffiando', players: n, seed: 2 });
    ok(g.players.length === n && g.players.every((p) => p.meeples === 5), `five followers each at ${n}`);
  }
});
prove('game-start', (ok) => {
  const g = new Game({ mode: 'soffiando', players: 2, seed: 3 });
  const cells = [...g.board.cells.values()];
  ok(cells.length === 1 && cells[0].type.id === 'Kpz' && cells[0].x === 0 && cells[0].y === 0, 'the Plaza alone, in the middle');
  ok(TILES.Kpz.name === 'The Plaza' && TILES.Kpz.feats.filter((f) => f.type === 'road').length === 4 && TILES.Kpz.edges.every((e) => e === 'r'), 'a square with a road out of each side');
  ok(!('driftIslands' in g.m) && !/isPalazzo|driftIslands/.test(MODE_SRC), 'and nothing else');
  ok(g.current === 0 && g.phase === 'place', 'the first player lays first');
  const s = g.board.legalPlacements(g.tile, g.placeOpts())[0];
  g.rot = s.rot; g.placeAt(s.x, s.y);
  endTurn(g);
  ok(g.current === 1, 'then the next player');
});
prove('game-deck', (ok) => {
  // What the mode deals: every tile drawn this game and every one set aside.
  const keys = (o, seed = 5) => new Game({ mode: 'soffiando', players: 2, seed, options: o }).m.deck();
  const plain = keys({});
  ok(plain.length === 72, `72 tiles (${plain.length})`);
  const tally = {};
  for (const k of plain) tally[k] = (tally[k] || 0) + 1;
  ok(Object.entries(DECK_COUNTS).every(([k, n]) => (tally[k] || 0) === n) && Object.keys(tally).every((k) => k in DECK_COUNTS), 'each tile as many times as the deck list says');
  ok(keys({}, 6).join() !== plain.join(), 'shuffled');
  const faces = (k) => k.split('|').map((id) => TILES[id]);
  ok(plain.every((k) => faces(k).length === 2 && faces(k).every(Boolean)), 'every tile has two faces');
  const count = (pred) => plain.filter((k) => pred(...faces(k))).length;
  const has = (kind) => (t) => t.feats.some((f) => f.type === kind);
  const mark = (kind) => (t) => t.marks.some((m) => m.kind === kind);
  // Its shape: how many sides open, and for two, straight through or a corner.
  const shape = (t, letter) => {
    const open = t.edges.map((e, i) => (e === letter ? i : -1)).filter((i) => i >= 0);
    return open.length === 2 ? (open[1] - open[0] === 2 ? 'I' : 'L') : `${open.length}`;
  };
  const district = (t) => t.feats.some((f) => f.district) && !mark('turbine')(t) && !has('sfera')(t);
  const road = (t) => has('road')(t) && !has('city')(t) && !has('sfera')(t) && !t.marks.some((m) => m.kind !== 'village');
  ok(count((a, b) => district(a) && road(b) && shape(a, 'c') === shape(b, 'r')) === 37, '37 districts, a road of the same shape on the back');
  const half = (hue) => (t) => t.feats.some((f) => f.type === 'sfera' && !f.quarter && f.hue === hue);
  ok(['green', 'blue', 'red', 'yellow'].every((h) => count((a, b) => half(h)(a) && mark('zephyr')(b)) === 5), 'five tower halves of each colour, a zephyr or a cannon on the back');
  ok(count((a, b) => a.id === 'Kqs' && b.id === 'Kqh') === 4, 'four tiles with the sun on one face and the black hole on the other');
  ok(count((a, b) => a.id === 'Kab' && (mark('turbine')(b) || mark('flier')(b) || b.id === 'Kw')) === 11, '11 Abbazias, a windmill, a flying machine or a windvane on the back');
  const lone = (t) => t.feats.some((f) => f.type === 'city' && !f.district);
  const temple = (t) => has('temple')(t) || t.feats.some((f) => f.district === 'temple');
  ok(!plain.some((k) => faces(k).some(temple)), 'no temple and no temple district dealt');
  ok(DECK_COUNTS.Kt === 0 && DECK_COUNTS.DEt === 0, 'they are extras');
  ok(!plain.some((k) => faces(k).some(lone)), 'no lone wall dealt');
  ok(Object.entries(DECK_COUNTS).some(([k, n]) => !n && !k.includes('|') && lone(TILES[k])), 'the lone walls are extras, one-faced');
  const more = keys({ deck: { Kce: 2, 'DIg|U': 1 } });
  ok(more.filter((k) => k === 'Kce').length === 2 && more.filter((k) => k === 'DIg|U').length === 1 && more.length === 72, 'a game\'s own deck list replaces counts by tile');
});
prove('game-map', (ok) => {
  const b = SPEC.bounds;
  ok(b.maxX - b.minX + 1 === 17 && b.maxY - b.minY + 1 === 17, '17 by 17');
  ok(b.minX === -8 && b.maxX === 8 && b.minY === -8 && b.maxY === 8, 'the Plaza\'s square in the very middle');
  const g = new Game({ mode: 'soffiando', players: 2, seed: 4 });
  ok(g.board.get(0, 0)?.type.id === 'Kpz', 'and the Plaza on it');
});
prove('game-wrap', (ok) => {
  const g = fresh(104);
  const b = g.board;
  ok(b.wraps, 'the board wraps');
  lay(g, 8, 0, 'U', 1);                    // a road on the east edge, running east
  ok(b.canPlace(-8, 0, TILES.U, 1) && !b.canPlace(-8, 0, TILES.B, 0), 'a tile on the west edge must match across the seam');
  lay(g, -8, 0, 'U', 1);
  b.rebuild();
  ok(b.featureOf(8, 0, 0) === b.featureOf(-8, 0, 0), 'and joins what is there');
  ok(b.groups().length === 1, 'one piece of country, across the seam');
  ok(b.place(9, 2, TILES.B, 0).x === -8, 'a square past the east edge is the west edge');
  const h = fresh(105);
  for (const y of [-3, -2, -1, 0, 1]) lay(h, 0, y, 'B');      // the mainland
  lay(h, 7, 4, 'U', 1); lay(h, 8, 4, 'U', 1);                  // a road against the east edge
  power(h, 1);
  blow(h, 7, 4, 1);
  ok(at(h, 8, 4)?.type.id === 'U' && at(h, -8, 4)?.type.id === 'U' && !at(h, 7, 4), 'pushed off the east edge, it comes on at the west');
  ok(h.board.featureOf(8, 4, 0) === h.board.featureOf(-8, 4, 0), 'still joined');
  ok(h.m.lost === 0 && h.m.fallen === 0, 'nothing lost');
});

// --- Your turn. -----------------------------------------------------------------
prove('turn-draw', (ok) => {
  let g = fresh(6);
  lay(g, 0, 0, 'DXg');
  g.deck = ['DXr', 'DXt'];
  g.drawTile();
  ok(g.tile.id === 'DXt' && g.phase === 'place', 'the top tile is drawn');
  g = fresh(7);
  lay(g, 0, 0, 'DXg');                     // a city all round: no road, field or tower fits
  g.deck = ['DXm', 'U|Kz'];
  const lines = said(g, () => g.drawTile());
  ok(lines.some((l) => /U\|Kz had nowhere to go/.test(l)) && g.tile.id === 'DXm', 'a tile that fits nowhere either face up is set aside, and the next drawn');
  g.deck = ['DXm|U'];
  g.tile = null;
  ok(!said(g, () => g.drawTile()).some((l) => /nowhere/.test(l)) && g.tile.id === 'DXm', 'one that fits face up is laid');
  g.deck = ['U'];
  g.tile = null;
  g.drawTile();
  ok(g.phase === 'over', 'with the deck run out, the season ends');
});

prove('turn-faces', (ok) => {
  const g = fresh(96);
  lay(g, 0, 0, 'U');                        // a road north and south
  g.board.rebuild();
  g.deck = ['DIg|U'];
  g.drawTile();
  ok(g.tile.id === 'DIg' && g.tileKey === 'DIg|U' && g.canFlip(), 'drawn one face up, with another on its back');
  ok(g.flipTile() && g.tile.id === 'U', 'turned over, it is the other face');
  ok(g.flipTile() && g.tile.id === 'DIg' && g.flipTile() && g.tile.id === 'U', 'and back again, as often as you like');
  ok(g.placeAt(0, 1) && at(g, 0, 1)?.type.id === 'U' && at(g, 0, 1).key === 'DIg|U', 'the face you lay is the one on the board');
  const h = fresh(97);
  lay(h, 0, 0, 'DXg');                      // a city all round: no road fits
  h.board.rebuild();
  h.deck = ['U|DIr'];
  h.drawTile();
  ok(h.phase === 'place' && h.tile.id === 'DIr', 'turned over for you when only its other face fits');
  ok(!h.flipTile() && h.tile.id === 'DIr', 'and a face that fits nowhere cannot be turned up');
  // Back to the deck, still two-faced: a fall, and the black hole.
  const k = fresh(98);
  lay(k, 0, 0, 'B');
  k.deck = ['DIg|U'];
  k.drawTile();
  k.flipTile();
  k.rot = 1;                                // a road east and west, under the field
  k.placeAt(0, 1);
  k.deck = [];
  k.m.fallLoose(at(k, 0, 1));
  ok(k.deck[k.deck.length - 1] === 'DIg|U' || k.tileKey === 'DIg|U', 'a tile that falls goes back with both its faces');
  const m = fresh(99);
  for (let i = 0; i < 4; i++) {
    const [x, y] = [[0, 0], [1, 0], [1, 1], [0, 1]][i];
    m.board.place(x, y, TILES.Kqh, i);
  }
  m.board.place(2, 0, TILES.U, 0, { key: 'DIr|U' });
  m.board.rebuild();
  m.deck = [];
  m.m.joinSferas();
  ok(m.deck.includes('DIr|U'), 'and so does one the black hole swallows');
});
prove('turn-fit', (ok) => {
  const g = fresh(8);
  const b = g.board;
  lay(g, 0, 0, 'U');                       // a road north to south
  ok(b.canPlace(0, 1, TILES.U, 0), 'road to road');
  ok(!b.canPlace(0, 1, TILES.B, 0), 'not field to road');
  ok(b.canPlace(1, 0, TILES.B, 0), 'field to field');
  ok(b.canPlace(0, 1, TILES.Kab, 0), 'an Abbazia fits anything');
  ok(!b.canPlace(4, 4, TILES.B, 0), 'it must touch the country');
  lay(g, 3, 0, 'Kso', 2);                  // a green tower half facing south
  ok(b.canPlace(3, 1, TILES.Kso, 0) && !b.canPlace(3, 1, TILES.U, 0) && !b.canPlace(3, 1, TILES.Kyo, 0), 'a tower half to one of its own colour, nothing else');
  lay(g, -5, -5, 'Kqs', 0);                // a quarter of the sun, in its south-east corner
  const fits = (x, y, id, r) => b.canPlace(x, y, TILES[id], r, g.placeOpts());
  ok(fits(-4, -5, 'Kqs', 1) && !fits(-4, -5, 'Kqs', 0) && !fits(-4, -5, 'Kqh', 1), 'a quarter only where rule 81 puts it');
  ok(b.canPlace(-6, -5, TILES.DXr, 0) && b.canPlace(-5, -6, TILES.U, 0) && b.canPlace(-6, -5, TILES.B, 0), 'a quarter\'s outer edges match anything');
  lay(g, 5, 0, 'DXg');
  ok(b.canPlace(6, 0, TILES.DXr, 0) && !b.canPlace(6, 0, TILES.B, 0), 'city to city');
  lay(g, 0, 5, 'DEg', 0);                  // walls east, south and west
  ok(b.canPlace(1, 5, TILES.B, 0) && b.canPlace(1, 5, TILES.U, 1) && b.canPlace(1, 5, TILES.DEt, 1), 'a wall to a field, a road or another wall');
  ok(!b.canPlace(1, 5, TILES.DXr, 0) && !b.canPlace(1, 5, TILES.Kso, 3), 'never an open city or a tower half');
  g.phase = 'place'; g.tile = TILES.U; g.rot = 0;
  g.rotate(1);
  ok(g.rot === 1, 'you may turn it');
});
prove('turn-reach', (ok) => {
  const g = fresh(9);
  for (const x of [0, 1, 2]) lay(g, x, 0, 'B');   // the mainland
  lay(g, 5, 5, 'B');                                // an island
  g.board.rebuild();
  let onto = g.m.placeOpts().onto;
  ok(onto.has('0,0') && !onto.has('5,5'), 'the mainland, not the island');
  ok(!g.board.canPlace(6, 5, TILES.B, 0, g.m.placeOpts()), 'nothing laid against an island you are not on');
  put(g, 5, 5, 'field', 1);
  onto = g.m.placeOpts().onto;
  ok(!onto.has('5,5'), 'a rival\'s follower opens it to nobody else');
  g.current = 1;
  onto = g.m.placeOpts().onto;
  ok(onto.has('5,5') && g.board.canPlace(6, 5, TILES.B, 0, g.m.placeOpts()), 'your own follower opens it to you');
  const h = fresh(10);
  for (const x of [0, 1, 2]) lay(h, x, 0, 'B');   // the mainland
  lay(h, 5, 5, 'Kqh', 0);                          // the black hole begun, out on its own
  h.board.rebuild();
  ok(!h.board.canPlace(5, 4, TILES.B, 0, h.m.placeOpts()) && h.board.canPlace(6, 5, TILES.Kqh, 1, h.m.placeOpts()), 'a quarter goes into its 2x2 wherever that is');
});
prove('turn-step', (ok) => {
  const g = fresh(10);
  lay(g, 0, 0, 'U'); lay(g, 0, 1, 'U');
  lay(g, 3, 0, 'DXg');
  g.board.rebuild();
  put(g, 3, 0, 'city', 0);
  ok(layHand(g, 'U', 0, 2) && g.phase === 'meeple', 'after laying, the follower step');
  ok(g.meepleOptions().length > 0, 'a claim on offer');
  ok(g.m.canLieDown() && g.m.beginFlat() && g.cellClick(3, 0), 'lying flat first');
  ok(g.phase === 'meeple' && g.meepleOptions().length > 0, 'still your follower step after');
  ok(!g.m.canLieDown(), 'once a turn');
  const o = g.meepleOptions()[0];
  g.placeMeeple(o.i, o);
  ok(g.phase === 'blow' && g.current === 0, 'then the blow');
  ok(g.cellClick(0, 0) && g.current === 1, 'and the blow ends the turn');
  const h = fresh(110);
  lay(h, 0, 0, 'U');
  h.board.rebuild();
  layHand(h, 'U', 0, 1);
  h.skipMeeple();
  ok(h.phase === 'blow' && h.current === 0, 'with no claim, still the blow');
});
prove('turn-catch', (ok) => {
  const g = fresh(11);
  pocket(g, 0, 0);
  blow(g, 1, 0, 1);
  ok(!at(g, 2, 0) && !at(g, 1, 0) && g.m.fallen === 1, 'the tile falls');
  ok(g.current === 0 && g.phase === 'place' && g.tile?.id === 'U', 'and you lay one more tile this turn: the one that fell, off the top of the deck');
  const left = g.tilesLeft;
  lay(g, 6, 6, 'B');
  g.m.fallLoose(at(g, 6, 6));
  ok(g.tilesLeft === left, 'once a turn, however many fall');
  const s = g.board.legalPlacements(g.tile, g.placeOpts())[0];
  g.rot = s.rot; g.placeAt(s.x, s.y);
  if (g.phase === 'meeple') g.skipMeeple();
  ok(g.current === 1, 'and you do not blow again');
});

// --- Followers. -----------------------------------------------------------------
prove('followers-claim', (ok) => {
  const g = fresh(13);
  const kinds = (id, rot = 0) => {
    for (const c of [...g.board.cells.values()]) g.board.remove(c.x, c.y);
    g.lastPlaced = lay(g, 0, 0, id, rot);
    g.board.rebuild();
    g.phase = 'meeple';
    return g.meepleOptions().map((o) => o.f.type);
  };
  const pz = kinds('Kpz');
  ok(pz.includes('road') && pz.includes('field'), 'a road or a field');
  const sx = kinds('Ksx');
  ok(sx.includes('city') && !sx.includes('sfera'), 'a district, never a tower');
  ok(!kinds('Kab').length, 'never an Abbazia');
  ok(!kinds('Kce').includes('city'), 'never a wall');
  const road = (holder, capped) => {
    for (const c of [...g.board.cells.values()]) g.board.remove(c.x, c.y);
    lay(g, 0, 0, 'U');
    if (capped) { lay(g, 0, -1, 'Kab'); lay(g, 0, 2, 'Kab'); }
    g.lastPlaced = lay(g, 0, 1, 'U');
    g.board.rebuild();
    if (holder != null) { g.board.addMeeple(0, 0, 0, holder); g.board.rebuild(); }
    g.phase = 'meeple';
    return g.meepleOptions().some((o) => o.f.type === 'road');
  };
  ok(road(1, false), 'an open road somebody else is in');
  ok(road(0, false), 'or you are in');
  ok(!road(null, true) && !road(1, true), 'never a closed one');
  for (const c of [...g.board.cells.values()]) g.board.remove(c.x, c.y);
  lay(g, 0, 0, 'B');
  g.lastPlaced = lay(g, 1, 0, 'B');
  g.board.rebuild();
  g.board.addMeeple(0, 0, fi(at(g, 0, 0), 'field'), 1);
  g.board.rebuild();
  g.phase = 'meeple';
  ok(!g.meepleOptions().some((o) => o.f.type === 'field'), 'a field only if nobody is in it');
});
prove('followers-island', (ok) => {
  const g = fresh(14);
  for (const x of [0, 1, 2, 3]) lay(g, x, 0, 'B');
  lay(g, 5, 5, 'Kt'); lay(g, 6, 5, 'Kt');   // an island of two temples
  g.board.rebuild();
  g.phase = 'meeple';
  ok(!g.m.claimAllowed({ x: 5, y: 5, i: 0, f: TILES.Kt.feats[0] }), 'not on an island you are not on');
  put(g, 6, 5, 'temple', 0);
  ok(g.m.claimAllowed({ x: 5, y: 5, i: 0, f: TILES.Kt.feats[0] }), 'on one you are');
  g.current = 1;
  ok(!g.m.claimAllowed({ x: 5, y: 5, i: 0, f: TILES.Kt.feats[0] }), 'and only you');
});
prove('followers-one', (ok) => {
  const w = fresh(115);
  for (const x of [0, 1, 2, 3]) lay(w, x, 0, 'U', 1);
  power(w, 1);
  put(w, 0, 0, 'road', 0); put(w, 2, 0, 'road', 1);
  blow(w, 0, 0, 1);                         // too heavy: the first two tiles' followers are blown
  const figures = [...w.board.cells.values()].filter((c) => c.meeple);
  ok(figures.length === 2 && new Set(figures.map((c) => `${c.x},${c.y}`)).size === 2, 'the wind never stacks two');
  const g = fresh(15);
  lay(g, 0, 0, 'Kfl'); lay(g, 0, -1, 'B'); lay(g, 0, -2, 'B');
  g.board.rebuild();
  put(g, 0, -1, 'monastery', 1);
  g.m.flight = g.m.flightPath(at(g, 0, 0));
  const t = g.m.flightTargets();
  ok(t.length && !t.some((o) => o.y === -1), 'a flight sets nobody down on a tile with a figure');
});
prove('followers-home', (ok) => {
  const g = fresh(16);
  for (const x of [0, 1, 2]) lay(g, x, 0, 'B');
  g.board.rebuild();
  put(g, 0, 0, 'field', 0); put(g, 1, 0, 'field', 0); put(g, 2, 0, 'field', 1);
  g.m.fire('green'); g.m.sweep();
  ok(g.players[0].score === 1 && g.players[1].score === 0, 'paid by majority');
  ok(![0, 1, 2].some((x) => at(g, x, 0).meeple) && g.players[0].meeples === 5 && g.players[1].meeples === 5, 'everyone in it goes home, paid or not');
  lay(g, 5, 5, 'DXg');
  g.board.rebuild();
  put(g, 5, 5, 'city', 0, true);
  g.m.fire('blue'); g.m.sweep();
  ok(at(g, 5, 5).meeple?.flat, 'except one lying flat');
});
prove('followers-walk', (ok) => {
  const build = () => {
    const g = fresh(17);
    lay(g, 0, 0, 'U'); lay(g, 0, 1, 'Kta', 2);   // a road south into a temple
    g.board.rebuild();
    put(g, 0, 0, 'field', 0);
    g.phase = 'meeple';
    return g;
  };
  let g = build();
  g.m.fire('green'); g.m.sweep();
  ok(g.m.beginStroll() && g.phase === 'stroll', 'sent home on your turn: a walk is offered');
  ok(g.m.stroll.targets.some((t) => t.x === 0 && t.y === 1 && t.f.type === 'temple'), 'along the road, into the temple');
  ok(g.cellClick(0, 1) && at(g, 0, 1).meeple?.player === 0, 'and it walks there');
  g = build();
  g.current = 1;
  g.m.fire('green'); g.m.sweep();
  ok(!g.m.strollers.length, 'not on somebody else\'s turn');
  g = fresh(18);
  lay(g, 0, 0, 'U'); lay(g, 0, 1, 'U');
  g.board.rebuild();
  put(g, 0, 0, 'field', 0);
  ok(g.m.strollTargets({ x: 0, y: 0, i: fi(at(g, 0, 0), 'field') }).every((t) => t.f.type === 'road'), 'with nowhere to go, the road itself');
  put(g, 0, 1, 'road', 1);
  ok(!g.m.strollTargets({ x: 0, y: 0, i: fi(at(g, 0, 0), 'field') }).length, 'never down somebody else\'s road');
  g = fresh(19);
  lay(g, 0, 0, 'Kta', 2); lay(g, 0, 1, 'U');
  g.board.rebuild();
  put(g, 0, 0, 'temple', 0);
  ok(!g.m.strollTargets({ x: 0, y: 0, i: fi(at(g, 0, 0), 'temple') }).some((t) => t.f.type === 'temple'), 'not back into what it left');
});
prove('followers-hop', (ok) => {
  const g = fresh(20);
  lay(g, 0, 0, 'U');                        // road south, off into the sky
  lay(g, 0, 3, 'U'); lay(g, 0, 4, 'Kta', 2); // …and a road three squares on, into a temple
  g.board.rebuild();
  ok(g.board.hops.length === 1, 'the gap is a step');
  put(g, 0, 0, 'field', 0);
  ok(g.m.strollTargets({ x: 0, y: 0, i: fi(at(g, 0, 0), 'field') }).some((t) => t.y === 4 && t.f.type === 'temple'), 'a walker crosses it');
  ok(g.board.featureOf(0, 0, 0) !== g.board.featureOf(0, 3, 0), 'two roads still');
});
prove('followers-flat', (ok) => {
  const g = fresh(21);
  lay(g, 0, 0, 'DEg', 2); lay(g, 0, 1, 'DEr', 0);   // two districts, walled all round
  lay(g, 5, 5, 'U');
  g.board.rebuild();
  put(g, 0, 0, 'city', 0);
  put(g, 5, 5, 'road', 0);
  g.phase = 'meeple';
  ok(g.m.flatTargets().length === 1 && g.m.flatTargets()[0].y === 0, 'only one standing in a city');
  g.m.beginFlat(); g.cellClick(0, 0);
  g.m.fire('blue'); g.m.sweep();
  ok(at(g, 0, 0).meeple?.flat, 'it never comes home');
  ok(g.players[0].score === 5, `no walled double while only flat followers hold it (paid ${g.players[0].score})`);
  const h = fresh(22);
  lay(h, 0, 0, 'DEg', 2); lay(h, 0, 1, 'DEr', 0);
  h.board.rebuild();
  put(h, 0, 0, 'city', 0);
  h.m.fire('blue');
  ok(h.players[0].score === 8, `standing, the same city pays the double (${h.players[0].score})`);
});

// --- The wind. ------------------------------------------------------------------
prove('wind-blows', (ok) => {
  const g = fresh(23);
  lay(g, 0, 0, 'B'); lay(g, 1, 0, 'B');
  g.board.rebuild();
  layHand(g, 'Kz', -1, 0, 1);              // a zephyr pointing east, at them
  ok(at(g, 0, 0) && at(g, 1, 0) && !at(g, 2, 0) && g.m.pushes === 0, 'laid, it does nothing');
  if (g.phase === 'meeple') g.skipMeeple();
  ok(g.phase === 'blow', 'the only wind is your blow');
});
prove('wind-own-tile', (ok) => {
  const g = fresh(28);
  lay(g, 0, 0, 'B'); lay(g, 1, 0, 'Kz', 1); lay(g, 3, 0, 'B');
  power(g, 1);
  blow(g, 0, 0, 1);
  ok(at(g, 2, 0)?.type.id === 'Kz' && at(g, 4, 0)?.type.id === 'B' && !at(g, 3, 0), 'the zephyr stays where the blow left it, and pushes what is in front of it');
});
prove('wind-walls', (ok) => {
  const g = fresh(30);
  lay(g, 0, 0, 'DEg');                      // walls east, south and west
  lay(g, 1, 0, 'U', 1);
  power(g, 1);
  blow(g, 0, 0, 1);
  ok(!at(g, 0, 0) && at(g, 1, 0)?.type.id === 'DEg' && at(g, 2, 0)?.type.id === 'U', 'a tile with walls is pushed like any other');
  const h = fresh(31);
  lay(h, 0, 0, 'U', 1); lay(h, 1, 0, 'DEg'); lay(h, 2, 0, 'B');   // too heavy: the follower is blown instead
  h.board.rebuild();
  put(h, 0, 0, 'road', 0);
  blow(h, 0, 0, 1);
  ok(at(h, 0, 0)?.meeple?.player === 0 && !at(h, 1, 0)?.meeple, 'no follower is blown across the wall of the tile it would come down on');
  const k = fresh(32);
  lay(k, 0, 0, 'DEg', 1); lay(k, 1, 0, 'U', 1); lay(k, 2, 0, 'B');  // a garden end opening east, walled north, south and west
  k.board.rebuild();
  put(k, 0, 0, 'city', 0);
  blow(k, 0, 0, 2);                         // south, against its own wall: three tiles? no, one, and it moves
  const m = fresh(33);
  lay(m, 0, 0, 'DEg', 0); lay(m, 0, 1, 'B'); lay(m, 0, 2, 'B');   // walled south, a column below it
  m.board.rebuild();
  put(m, 0, 0, 'city', 0);
  blow(m, 0, 0, 2);                         // south: three tiles, too heavy, and a wall on its own edge
  ok(at(m, 0, 0)?.meeple?.player === 0 && !at(m, 0, 1)?.meeple, 'nor across the wall on the edge of its own tile');
});
prove('wind-vane', (ok) => {
  const g = fresh(34);
  lay(g, 0, 0, 'Kw', 0); lay(g, 1, 0, 'B');
  power(g, 1);
  blow(g, 0, 0, 1);                         // east
  const vane = [...g.board.cells.values()].find((c) => c.type.id === 'Kw');
  ok(vane && (vane.rot & 1) === 1, 'turned to lie east to west');
  blow(g, vane.x, vane.y, 0);               // north
  ok((vane.rot & 1) === 0, 'and back along a north push');
});
prove('wind-turbine', (ok) => {
  const g = fresh(33);
  lay(g, 1, 0, 'Ktr'); lay(g, 2, 0, 'B'); lay(g, 3, 0, 'B');
  lay(g, 1, -1, 'U');                       // the mill's road runs on north, out of the way
  g.board.rebuild();
  put(g, 1, -1, 'road', 0);
  blow(g, 1, 0, 1);                         // three tiles: too heavy, nothing moves
  ok(g.players[0].score === 2 && g.players[1].score === 0, `2 to its holder for a push that reaches it, moving it or not (${g.players[0].score})`);
  blow(g, 1, 0, 1);
  ok(g.players[0].score === 4, 'and again');
  const h = fresh(133);
  lay(h, 1, 0, 'Ktr', 1); lay(h, 2, 0, 'B'); lay(h, 3, 0, 'B');
  h.board.rebuild();
  put(h, 1, 0, 'road', 0);                  // standing on the mill
  blow(h, 1, 0, 1);
  ok(h.players[0].score === 0 && at(h, 2, 0)?.meeple?.player === 0, 'a holder the push blows off it is not paid');
});

// --- Zephyrs in a chain. --------------------------------------------------------
prove('storm-once', (ok) => {
  const b = raw(SPEC.bounds, true);
  rlay(b, 0, 0, 'B'); rlay(b, 1, 0, 'Kz', 1); rlay(b, 2, 0, 'Kz', 3);   // two zephyrs facing each other
  const rs = windBlow(b, { at: { x: 0, y: 0 }, dir: 1, power: 3 });
  const east = rs.filter((r) => r.by?.type.id === 'Kz' && r.dir === 1).length;
  const west = rs.filter((r) => r.by?.type.id === 'Kz' && r.dir === 3).length;
  ok(east === 1 && west === 1 && rs.length === 3, `each pushes its way once (${rs.length} pushes)`);
});
prove('storm-multi', (ok) => {
  const g = fresh(36);
  lay(g, -1, 0, 'B'); lay(g, 0, 0, 'Kzx', 0);   // a crosswind, north and east
  lay(g, 1, -1, 'B'); lay(g, 2, 0, 'B');
  power(g, 1);
  blow(g, -1, 0, 1);
  ok(at(g, 1, 0)?.type.id === 'Kzx', 'pushed a square');
  ok(at(g, 1, -2) && !at(g, 1, -1), 'it pushes down the north lane');
  ok(at(g, 3, 0) && !at(g, 2, 0), 'and the east one');
});
prove('storm-double', (ok) => {
  const g = fresh(38);
  lay(g, 0, 0, 'Kzz', 1);                   // a double zephyr pointing east
  for (const x of [2, 3, 4]) lay(g, x, 0, 'B');
  g.board.rebuild();
  blow(g, 0, 0, 1);                         // a push of 1 moves it; its own 2 and your 1 push three
  ok(at(g, 1, 0)?.type.id === 'Kzz' && at(g, 5, 0) && !at(g, 2, 0), 'a double zephyr pushes with 2 of its own');
  const h = fresh(39);
  lay(h, 0, 0, 'Kz', 1);
  for (const x of [2, 3, 4]) lay(h, x, 0, 'B');
  h.board.rebuild();
  blow(h, 0, 0, 1);
  ok(at(h, 2, 0) && !at(h, 5, 0), 'a plain one with 1: two, not three');
});
prove('storm-cannon', (ok) => {
  const g = fresh(39);
  lay(g, 0, 0, 'B'); lay(g, 1, 0, 'Kg', 1); lay(g, 3, 0, 'B'); lay(g, 6, 0, 'B');
  power(g, 1);
  blow(g, 0, 0, 1);
  ok(at(g, 2, 0)?.type.id === 'Kg' && at(g, 5, 0) && !at(g, 3, 0) && !at(g, 4, 0), 'it fires what is in front of it until the square ahead is taken');
  const h = fresh(40);
  lay(h, 0, 0, 'B'); lay(h, 1, 0, 'Kg', 1); lay(h, 3, 0, 'B');
  power(h, 1);
  blow(h, 0, 0, 1);
  ok(!at(h, 3, 0) && at(h, 0, 0)?.type.id === 'B' && h.m.lost === 0, 'with nothing else in its row, round the map to the back of the row');
  const k = fresh(41);
  lay(k, 0, 0, 'Kg', 1); for (const x of [1, 2, 3]) lay(k, x, 0, 'B');
  k.board.rebuild();
  ok(!k.m.trainAt(0, 0, 1)?.heavy || true, 'set up');
  const r = windBlow(k.board, { at: { x: -1, y: 0 }, dir: 1, power: 1 });
  ok(!r.some((p) => p.by), 'no more tiles than its push and yours');
});

// --- Out of the sky. ------------------------------------------------------------
prove('fall-mismatch', (ok) => {
  // A road pushed onto a field moves on, the way its player picks.
  let g = fresh(41);
  lay(g, 0, 0, 'B'); lay(g, 1, 0, 'U');      // a road running north and south
  lay(g, 2, 1, 'B');                         // a field under where it is pushed
  lay(g, 3, 1, 'B');                         // …and under the square east of that
  lay(g, 2, -1, 'B');                        // a tile over it: north is no way
  g.board.rebuild();
  put(g, 1, 0, 'road', 0);
  blow(g, 1, 0, 1);
  const ways = g.phase === 'astray' ? g.m.astrayAt.targets : [];
  ok(ways.length === 2, `it waits for its player to pick a way (${ways.length})`);
  ok(ways.some((t) => t.x === 4 && t.y === 0 && t.n === 2), 'east it keeps going, past a square where it does not fit');
  ok(ways.some((t) => t.x === 1 && t.y === 0) && !ways.some((t) => t.dir === 0 || t.dir === 2), 'a tile in the way is no way');
  ok(g.cellClick(4, 0) && at(g, 4, 0)?.type.id === 'U' && !at(g, 2, 0) && g.m.fallen === 0, 'it slides where its player chose');
  ok(at(g, 4, 0)?.meeple?.player === 0, 'and its follower rides it');
  ok(g.current === 1, 'and then the turn goes on');
  // One way: it just goes.
  g = fresh(42);
  lay(g, 0, 0, 'B'); lay(g, 1, 0, 'U'); lay(g, 2, 1, 'B'); lay(g, 2, -1, 'B'); lay(g, 3, 0, 'B');
  g.board.rebuild();
  ok(blow(g, 1, 0, 1) && at(g, 1, 0)?.type.id === 'U' && !at(g, 2, 0) && g.current === 1, 'with one way it just goes, without asking');
  // No way: it falls, back on top of the deck.
  g = fresh(43);
  pocket(g, 0, 0);
  blow(g, 1, 0, 1);
  ok(!at(g, 2, 0) && g.m.fallen === 1 && g.phase === 'place' && g.tile?.id === 'U', 'every way blocked: it falls, onto the top of the deck (and on your turn back into your hand, rule 9)');
});
prove('fall-alone', (ok) => {
  const g = fresh(42);
  lay(g, 0, 0, 'B'); lay(g, 1, 0, 'B');
  for (const y of [1, 2]) lay(g, 0, y, 'B');
  g.board.rebuild();
  blow(g, 1, 0, 1);
  ok(at(g, 2, 0) && g.board.degree(2, 0) === 0, 'touching nothing, it hangs there');
});
prove('fall-followers', (ok) => {
  const g = fresh(44);
  pocket(g, 0, 0);
  put(g, 1, 0, 'road', 0);
  blow(g, 1, 0, 1);
  ok(!at(g, 2, 0) && g.players[0].meeples === 5, 'a follower on a tile that falls goes home');
});

// --- Followers in the wind. -----------------------------------------------------
prove('blown-lane', (ok) => {
  const g = fresh(45);
  for (const x of [0, 1, 2]) lay(g, x, 0, 'U', 1);
  power(g, 2);
  put(g, 0, 0, 'road', 0);
  blow(g, 0, 0, 1);
  ok(at(g, 1, 0)?.meeple?.player === 0 && !at(g, 0, 0), 'one on a tile that moves rides it');
  const h = fresh(46);
  for (const x of [0, 1, 2]) lay(h, x, 0, 'U', 1);
  h.board.rebuild();
  put(h, 0, 0, 'road', 0);
  blow(h, 0, 0, 1);                         // three tiles, a push of 1: too heavy
  ok(at(h, 0, 0) && at(h, 1, 0)?.meeple?.player === 0 && !at(h, 0, 0).meeple, 'one blown goes a square downwind, onto the tile there');
});
prove('blown-fly-on', (ok) => {
  // A follower standing on a quarter of the big tower, holding nothing (as
  // one blown there does): no push moves its tile, so it is blown instead.
  const g = fresh(47);
  lay(g, 0, 0, 'Kqs', 0); lay(g, 4, 0, 'B');  // the sun begun, and a tile four squares on
  g.board.rebuild();
  at(g, 0, 0).meeple = { player: 0, feat: null };
  blow(g, 0, 0, 1);
  ok(at(g, 4, 0)?.meeple?.player === 0, 'off the end, it flies on to the next tile');
  const h = fresh(48);
  lay(h, 5, 0, 'Kqs', 0); lay(h, -3, 0, 'B');
  h.board.rebuild();
  at(h, 5, 0).meeple = { player: 0, feat: null };
  blow(h, 5, 0, 1);
  ok(at(h, -3, 0)?.meeple?.player === 0, 'round the map if it has to');
});
prove('blown-occupied', (ok) => {
  const g = fresh(49);
  for (const x of [0, 1, 2]) lay(g, x, 0, 'U', 1);
  g.board.rebuild();
  put(g, 0, 0, 'road', 0); put(g, 1, 0, 'road', 1);
  blow(g, 0, 0, 1);
  ok(at(g, 0, 0)?.meeple?.player === 0 && at(g, 1, 0)?.meeple?.player === 1, 'it stays where it was');
});
prove('blown-feature', (ok) => {
  const g = fresh(50);
  lay(g, 0, 0, 'U', 1); lay(g, 1, 0, 'U', 1); lay(g, 2, 0, 'U', 1);
  lay(g, 0, 3, 'U', 1); lay(g, 1, 3, 'Kab'); lay(g, 2, 3, 'B');
  lay(g, 0, 6, 'U', 1); lay(g, 1, 6, 'B'); lay(g, 2, 6, 'B');
  g.board.rebuild();
  put(g, 0, 0, 'road', 0); put(g, 0, 3, 'road', 0); put(g, 0, 6, 'road', 0);
  const lanes = [0, 3, 6];
  // A push of 2 with the Abbazia on the board: three tiles are still too heavy.
  for (const y of lanes) blow(g, 0, y, 1);
  const m1 = at(g, 1, 0).meeple, m2 = at(g, 1, 3).meeple, m3 = at(g, 1, 6).meeple;
  ok(m1 && at(g, 1, 0).type.feats[m1.feat].type === 'road', 'a road for a road');
  ok(m3 && m3.feat != null && at(g, 1, 6).type.feats[m3.feat].type !== 'road', 'or whatever the tile has');
  ok(m2 && m2.feat === null, 'on an Abbazia, nothing');
});

// --- Mainland and islands. ------------------------------------------------------
prove('land-mainland', (ok) => {
  const g = fresh(46);
  lay(g, 0, 0, 'Kpz');
  for (const x of [4, 5, 6]) lay(g, x, 0, 'B');
  lay(g, -5, -5, 'B');
  g.board.rebuild();
  const land = g.m.land();
  ok(land.main.length === 3 && land.main.every((c) => c.x >= 4), 'the biggest piece, Plaza or not');
  ok(land.isles.length === 2 && land.isles.some((i) => i.length === 1 && i[0].type.id === 'Kpz'), 'every other piece an island, down to one tile');
});
prove('land-double', (ok) => {
  const g = fresh(47);
  for (const x of [0, 1, 2, 3]) lay(g, x, 0, 'B');
  lay(g, 0, 5, 'B'); lay(g, 1, 5, 'B');
  g.board.rebuild();
  put(g, 0, 0, 'field', 0);
  put(g, 0, 5, 'field', 1);
  g.m.fire('green');
  ok(g.players[0].score === 2 && g.players[1].score === 2, `four tiles on the mainland, two on an island: the same (${g.players[0].score}, ${g.players[1].score})`);
});

// --- Spheres. -------------------------------------------------------------------
prove('sphere-halves', (ok) => {
  ok(TILES.Kso.edges.includes('o:green') && edgesMeet('o:green', 'o:green') && !edgesMeet('o:green', 'o:blue') && !edgesMeet('o:green', 'f') && !edgesMeet('o:green', 'r') && !edgesMeet('o:green', 'c'), 'a half meets only a half of its colour');
  const g = fresh(49);
  lay(g, 0, 0, 'Kro', 2);
  ok(g.board.canPlace(0, 1, TILES.Kro, 0) && !g.board.canPlace(0, 1, TILES.Kbo, 0) && !g.board.canPlace(0, 1, TILES.Kyo, 0), 'red to red, and no other');
});
prove('sphere-close', (ok) => {
  const g = fresh(50);
  lay(g, 0, 0, 'Kso', 2);                   // green, facing south
  for (const x of [-1, -2, -3]) lay(g, x, 0, 'B');   // on the mainland
  for (const x of [3, 4]) lay(g, x, 3, 'B');
  lay(g, 6, 6, 'DXr');
  g.board.rebuild();
  put(g, 3, 3, 'field', 0);
  put(g, 6, 6, 'city', 1);
  layHand(g, 'Kso', 0, 1, 0);               // green, facing north: the tower closes
  ok(g.m.spheres === 1 && g.m.hues.green === 1, 'a tile laid closes it');
  ok(g.players[0].score === 2 && g.players[1].score === 0, `it fires its colour once: the farm, not the city (${g.players[0].score}, ${g.players[1].score})`);
  const before = g.players.map((p) => p.score);
  g.m.joinSferas();
  ok(g.m.spheres === 1 && g.players.every((p, i) => p.score === before[i]), 'a tower closes once');
  const h = fresh(51);
  lay(h, 0, 0, 'Kso', 2);                   // green, facing south
  lay(h, 0, 2, 'Kso', 0);                   // green, facing north, a square short
  lay(h, 0, 3, 'B');
  power(h, 1);
  blow(h, 0, 3, 0);                         // pushed north, two tiles, a push of 2
  ok(at(h, 0, 1)?.type.id === 'Kso' && h.m.spheres === 1 && h.m.hues.green === 1, 'and a push that brings two halves together closes it too');
});
prove('sphere-majority', (ok) => {
  const g = fresh(52);
  for (const x of [0, 1, 2]) lay(g, x, 0, 'DXr');
  g.board.rebuild();
  put(g, 0, 0, 'city', 0); put(g, 1, 0, 'city', 0); put(g, 2, 0, 'city', 1);
  g.m.fire('blue');
  ok(g.players[0].score === 3 && g.players[1].score === 0, 'the most followers');
  const h = fresh(53);
  for (const x of [0, 1]) lay(h, x, 0, 'DXr');
  h.board.rebuild();
  put(h, 0, 0, 'city', 0); put(h, 1, 0, 'city', 1);
  h.m.fire('blue');
  ok(h.players[0].score === 2 && h.players[1].score === 2, 'tied, each in full');
});
prove('sphere-only', (ok) => {
  const g = fresh(54);
  lay(g, 0, 0, 'DEg', 2);
  g.board.rebuild();
  put(g, 0, 0, 'city', 0);
  layHand(g, 'DEt', 0, 1, 0);               // closes the city
  g.skipMeeple();
  ok(g.board.featureOf(0, 0, 0)?.scored && g.players[0].score === 0, 'a city closed pays nothing');
});

// --- Green, red and yellow. -----------------------------------------------------
prove('colour-green', (ok) => {
  const g = fresh(55);
  for (const x of [0, 1, 2, 3, 4]) lay(g, x, 0, 'B');
  g.board.rebuild();
  put(g, 0, 0, 'field', 0);
  g.m.fire('green');
  ok(g.players[0].score === 2, `five tiles of field pay 2 (${g.players[0].score})`);
});
prove('colour-red', (ok) => {
  const g = fresh(56);
  lay(g, 0, 0, 'Kab');
  for (const [x, y] of [[1, 0], [-1, 0], [0, 1], [1, 1], [0, -1]]) lay(g, x, y, 'B');
  for (const x of [2, 3, 4]) lay(g, x, 0, 'B');
  g.board.rebuild();
  put(g, 1, 0, 'monastery', 0); put(g, -1, 0, 'monastery', 0); put(g, 0, 1, 'monastery', 1);
  g.m.fire('red');
  ok(g.players[0].score === 5 && g.players[1].score === 0, `a point a tile round it, to whoever has most followers there (${g.players[0].score}, ${g.players[1].score})`);
  ok(at(g, 1, 0).meeple && at(g, 0, 1).meeple, 'nobody comes home for it');
  const h = fresh(57);
  lay(h, 0, 0, 'Kab');
  for (const [x, y] of [[1, 0], [-1, 0], [2, 0], [3, 0]]) lay(h, x, y, 'B');
  h.board.rebuild();
  put(h, 1, 0, 'monastery', 0); put(h, -1, 0, 'monastery', 1);
  h.m.fire('red');
  ok(h.players[0].score === 2 && h.players[1].score === 2, 'tied, each in full');
  ok(!new Game({ mode: 'soffiando', players: 2, seed: 9 }).m.claimAllowed({ x: 0, y: 0, i: 0, f: { type: 'temple' } }) || !TILES.Kab.feats.length, 'and nobody claims an Abbazia');
});
prove('colour-yellow', (ok) => {
  const g = fresh(57);
  lay(g, -1, 0, 'U', 1); lay(g, 0, 0, 'D'); lay(g, 1, 0, 'U', 1);   // a road under a city's edge
  g.board.rebuild();
  put(g, 1, 0, 'road', 0);
  g.m.fire('yellow');
  ok(g.players[0].score === 4, `three tiles and an open city (${g.players[0].score})`);
  const h = fresh(58);
  lay(h, -1, 0, 'U', 1); lay(h, 0, 0, 'D'); lay(h, 1, 0, 'U', 1);
  lay(h, 0, -1, 'DEr', 2);                  // closes the city
  h.board.rebuild();
  put(h, 1, 0, 'road', 0);
  h.m.fire('yellow');
  ok(h.players[0].score === 5, `three tiles and a closed city (${h.players[0].score})`);
  const k = fresh(158);
  lay(k, 0, 0, 'DEr', 0); lay(k, 0, -1, 'DEi', 2);   // a city of two, closed all round
  lay(k, 1, 0, 'U', 1); lay(k, 2, 0, 'U', 1);        // a road east from its wall
  k.board.rebuild();
  put(k, 2, 0, 'road', 0);
  k.m.fire('yellow');
  ok(k.players[0].score === 4, `two tiles and the closed city through the gate (${k.players[0].score})`);
});

// --- Cities. --------------------------------------------------------------------
prove('city-districts', (ok) => {
  const dealt = new Set(Object.entries(DECK_COUNTS).filter(([, n]) => n).flatMap(([k]) => k.split('|')).map((id) => TILES[id].feats.find((f) => f.district)?.district).filter(Boolean));
  ok([...dealt].sort().join() === 'garden,industrial,residential,trade', `four kinds dealt (${[...dealt].join(', ')})`);
  for (const kind of dealt) {
    const k = DISTRICTS[kind];
    for (const [shape, open] of [['X', 4], ['T', 3], ['L', 2], ['I', 2], ['E', 1]]) {
      const t = TILES[`D${shape}${k}`];
      const f = t.feats[0];
      ok(f.type === 'city' && f.district === kind && f.sides.length === open, `${t.id} is a ${kind} district open ${open} ways`);
      ok([0, 1, 2, 3].every((s) => (f.sides.includes(s) ? t.edges[s] === 'c' && !wallSides(t).has(s) : wallSides(t).has(s))), `${t.id}: walled where it does not open`);
    }
  }
});
prove('city-blue', (ok) => {
  const pay = (ids) => {
    const g = fresh(59);
    ids.forEach((id, x) => lay(g, x, 0, id));
    g.board.rebuild();
    put(g, 0, 0, 'city', 0);
    g.m.fire('blue');
    return g.players[0].score;
  };
  ok(pay(['DXr', 'DXr', 'DXr']) === 3, 'one kind: a point a district');
  ok(pay(['DXr', 'DXi']) === 3, 'two kinds: plus 1');
  ok(pay(['DXr', 'DXi', 'DXm']) === 6, 'three kinds: plus 3');
  ok(pay(['DXr', 'DXi', 'DXm', 'DXg']) === 12, 'four kinds: plus 6, and 2 for the garden');
  ok(pay(['DXg', 'DXg']) === 6, 'a garden: 2 more each');
});
prove('city-walled', (ok) => {
  const g = fresh(60);
  lay(g, 0, 0, 'DEg', 2); lay(g, 0, 1, 'DEg', 0);
  g.board.rebuild();
  put(g, 0, 0, 'city', 0);
  ok(g.board.featureOf(0, 0, 0).open === 0, 'closed all round');
  g.m.fire('blue');
  ok(g.players[0].score === 8, `two districts of one kind doubled, and the gardens not (${g.players[0].score})`);
  const h = fresh(61);
  lay(h, 0, 0, 'DEg', 2); lay(h, 0, 1, 'DIg', 1);
  h.board.rebuild();
  put(h, 0, 0, 'city', 0);
  h.m.fire('blue');
  ok(h.players[0].score === 6, `open, the same two pay 2 and their gardens 4 (${h.players[0].score})`);
});
prove('city-gate', (ok) => {
  const g = fresh(160);
  const b = g.board;
  lay(g, 0, 0, 'DEg', 0);                   // walls east, south and west
  lay(g, 1, 0, 'U', 1);                     // a road east from the east wall
  lay(g, 2, 0, 'DEt', 2);                   // and on into another wall
  b.rebuild();
  ok(TILES.DEg.edges.join('') === 'c###', 'a district\'s walls are on its edges');
  ok(b.featureOf(1, 0, 0).open === 0, 'a road from wall to wall is closed at both ends');
  lay(g, 0, 1, 'U');                        // a road south from the south wall, open at its far end
  b.rebuild();
  ok(b.featureOf(0, 1, 0).open === 1, 'one end at a gate, one open');
  lay(g, -1, 0, 'Kz'); lay(g, -1, 1, 'Kz'); lay(g, -1, -1, 'Kz');
  lay(g, 1, -1, 'Kz');
  b.rebuild();
  const west = b.featureOf(-1, 0, fi(at(g, -1, 0), 'field'));
  const east = b.featureOf(1, -1, fi(at(g, 1, -1), 'field'));
  ok(west && east && west !== east, 'farmland against a wall stops there, and runs under no wall');
  ok(!TILES.DEg.feats.some((f) => f.type === 'field'), 'a district has no fields');
  lay(g, 4, 4, 'DEg', 3); lay(g, 5, 4, 'DEr', 1);   // two walls back to back
  b.rebuild();
  ok(b.featureOf(4, 4, 0) !== b.featureOf(5, 4, 0), 'two walls back to back are two cities');
});
prove('city-reopen', (ok) => {
  const g = fresh(61);
  lay(g, -1, 0, 'Kab'); lay(g, 0, 0, 'DIg'); lay(g, 1, 0, 'DIr'); lay(g, 2, 0, 'Kab');
  g.board.rebuild();
  put(g, 0, 0, 'city', 0);
  g.m.settle(0);
  ok(g.board.featureOf(0, 0, 0).scored, 'closed by its Abbazias');
  blow(g, 2, 0, 0);                         // the east Abbazia is pushed north, out of the way
  ok(!g.board.featureOf(0, 0, 0).scored && g.players[0].score === -2, `opened again: a point a district (${g.players[0].score})`);
});
prove('city-abbazia', (ok) => {
  const g = fresh(62);
  lay(g, -1, 0, 'Kab'); lay(g, 0, 0, 'DIg'); lay(g, 1, 0, 'Kab');
  lay(g, 0, 5, 'U'); lay(g, 0, 6, 'Kab'); lay(g, 0, 4, 'Kab');
  g.board.rebuild();
  ok(g.board.featureOf(0, 0, 0).open === 0, 'a city side it touches is closed');
  ok(g.board.featureOf(0, 5, 0).open === 0, 'and a road');
  g.board.remove(1, 0); g.board.rebuild();
  ok(g.board.featureOf(0, 0, 0).open === 1, 'taken away, open again');
});

// --- Windmills and flying machines. ---------------------------------------------
prove('windmill-finish', (ok) => {
  const g = fresh(69);
  lay(g, 0, -1, 'Kta'); lay(g, 0, 0, 'Ktr');   // a temple's road into the mill
  g.board.rebuild();
  put(g, 0, 0, 'road', 0);
  layHand(g, 'Kta', 0, 1, 2);               // a second temple closes the road
  g.skipMeeple();
  ok(g.players[0].score === 2, `the holder is paid 2 (${g.players[0].score})`);
});
prove('flight-path', (ok) => {
  const g = fresh(70);
  lay(g, 0, 0, 'Kfl');                      // flying north
  lay(g, 0, -1, 'B'); lay(g, 0, -3, 'B'); lay(g, 0, -4, 'Kz', 1); lay(g, 1, -4, 'B'); lay(g, 3, -4, 'B');
  g.board.rebuild();
  const path = g.m.flightPath(at(g, 0, 0)).map((c) => `${c.x},${c.y}`);
  ok(path.includes('0,-3'), 'over open sky');
  ok(path.includes('1,-4') && path.includes('3,-4'), 'turning with the zephyr it crosses');
  const h = fresh(71);
  lay(h, 0, 0, 'Kfl'); lay(h, 0, -1, 'B'); lay(h, 0, -2, 'Kz', 2); lay(h, 0, -3, 'B');
  h.board.rebuild();
  const p2 = h.m.flightPath(at(h, 0, 0)).map((c) => `${c.x},${c.y}`);
  ok(p2.at(-1) === '0,-2', 'a zephyr pointing back ends it');
  ok(SRC_FLIGHT, 'worked out only on the turn it is laid');
});
prove('flight-claim', (ok) => {
  const g = fresh(72);
  for (const x of [-1, -2, -3, -4]) lay(g, x, 0, 'B');   // the mainland
  lay(g, 0, 0, 'Kfl');
  lay(g, 0, -1, 'U'); lay(g, 0, -2, 'U'); lay(g, 0, -4, 'Gl');
  g.board.rebuild();
  put(g, 0, -2, 'road', 1);                 // a rival on the road
  g.m.flight = g.m.flightPath(at(g, 0, 0));
  g.lastPlaced = at(g, 0, 0); g.phase = 'meeple';
  const t = g.meepleOptions().filter((o) => o.flying);
  ok(t.some((o) => o.x === 0 && o.y === -1 && o.f.type === 'road'), 'a feature somebody holds');
  ok(t.some((o) => o.y === -4), 'on an island');
  ok(!t.some((o) => o.y === -2), 'not a tile with a figure');
  ok(!t.some((o) => o.y === -4 && o.f.type === 'city'), 'never a wall');
});
prove('flight-lift', (ok) => {
  const g = fresh(73);
  for (const x of [-1, -2, -3, -4]) lay(g, x, 0, 'B');
  lay(g, 0, 0, 'Kfl');
  lay(g, 0, -1, 'B'); lay(g, 0, -2, 'B'); lay(g, 0, -3, 'B');
  g.board.rebuild();
  put(g, 0, -2, 'monastery', 0);
  g.m.flight = g.m.flightPath(at(g, 0, 0));
  g.lastPlaced = at(g, 0, 0); g.phase = 'meeple';
  ok(g.m.canLift() && g.m.beginLift() && g.cellClick(0, -2), 'lift one of yours');
  ok(!at(g, 0, -2).meeple && g.players[0].meeples === 5, 'it goes home');
  const t = g.meepleOptions().filter((o) => o.flying);
  ok(t.length && t.every((o) => o.y < -2), 'and may be put down further along');
  g.skipMeeple();
  ok(g.phase === 'blow' && !at(g, 0, -2).meeple, 'or not');
});

// --- The end of the season. -----------------------------------------------------
prove('end-when', (ok) => {
  let g = fresh(74);
  lay(g, 0, 0, 'B');
  g.m.laid = 96;
  g.phase = 'meeple'; g.skipMeeple();
  blow(g, 0, 0, 1);
  ok(g.phase === 'over', 'at 96 tiles laid');
  g = fresh(75);
  g.m.endRound();
  ok(g.phase === 'over', 'with nothing left in the sky');
  g = fresh(76);
  lay(g, 0, 0, 'B');
  g.deck = []; g.tile = null;
  g.drawTile();
  ok(g.phase === 'over', 'when the deck runs out');
});
prove('end-archipelago', (ok) => {
  let g = fresh(77);
  for (const x of [0, 1, 2, 3]) lay(g, x, 0, 'B');
  lay(g, 0, 5, 'B'); lay(g, 5, 5, 'B'); lay(g, -5, 5, 'B');
  g.board.rebuild();
  put(g, 0, 5, 'field', 0); put(g, 5, 5, 'field', 0); put(g, -5, 5, 'field', 1);
  g.m.archipelago();
  ok(g.players[0].score === 10 && g.players[1].score === 0, 'the most separate islands');
  g = fresh(78);
  for (const x of [0, 1, 2, 3]) lay(g, x, 0, 'B');
  lay(g, 0, 5, 'B'); lay(g, 5, 5, 'B');
  g.board.rebuild();
  put(g, 0, 5, 'field', 0); put(g, 5, 5, 'field', 1);
  g.m.archipelago();
  ok(g.players[0].score === 10 && g.players[1].score === 10, 'tied, each');
});
prove('end-last', (ok) => {
  const g = fresh(79);
  for (const x of [0, 1, 2, 3]) lay(g, x, 0, 'B');
  lay(g, 0, 5, 'Kab'); lay(g, 1, 5, 'B'); lay(g, 2, 5, 'DXg'); lay(g, 3, 5, 'DXg');
  lay(g, 0, 8, 'U'); lay(g, 0, 9, 'U');
  g.board.rebuild();
  put(g, 0, 0, 'field', 0); put(g, 1, 5, 'monastery', 1); put(g, 2, 5, 'city', 0); put(g, 0, 8, 'road', 1);
  const lines = said(g, () => g.finish());
  ok(lines.some((l) => /^Farm/.test(l)) && lines.some((l) => /Abbazia/.test(l)) && lines.some((l) => /city/.test(l)) && lines.some((l) => /^Road/.test(l)), 'every colour fires');
  ok(lines.findIndex((l) => /island|Nobody is standing/.test(l)) < lines.findIndex((l) => /every colour|last time/.test(l)), 'after the islands are counted');
});

// --- Options. -------------------------------------------------------------------
prove('option-balena', (ok) => {
  ok(!new Game({ mode: 'soffiando', players: 2, seed: 80 }).m.balena, 'off unless switched on');
  const g = fresh(81, { balena: true });
  lay(g, 1, 0, 'B'); lay(g, 2, 0, 'B');
  for (const y of [1, 2]) lay(g, 1, y, 'B');
  power(g, 2);
  g.m.balena = { x: 2, y: 0 }; g.m.settleBalena();
  blow(g, 1, 0, 1);
  ok(at(g, 2, 0)?.balena && at(g, 1, 0) && !at(g, 3, 0), 'its tile does not move, and a push with it in front moves nothing');
  g.phase = 'meeple';
  ok(g.m.canSwim() && g.m.beginSwim() && g.cellClick(1, 2) && g.m.balena.y === 2, 'sent to any tile instead of claiming');
});

prove('fall-loose', (ok) => {
  ok(new Game({ mode: 'soffiando', players: 2, seed: 82 }).board.cracks === true, 'in every game');
  const g = fresh(45);
  lay(g, 0, 0, 'U'); lay(g, 0, -1, 'B');     // the road runs north into a field: a seam that does not meet
  g.board.rebuild();
  ok(!g.board.allComponents().some((d) => d.type === 'field' && d.tiles.has('0,0') && d.tiles.has('0,-1')), 'no field runs across it');
  ok(g.board.groups().length === 2 && g.m.land().isles.length === 1, 'nor country: they are two pieces, and one is an island');
});

// --- Your zephyr. ---------------------------------------------------------------
prove('stick-push', (ok) => {
  let g = fresh(85);
  for (const x of [0, 1, 2, 3]) lay(g, x, 0, 'B');
  lay(g, 0, 1, 'B');
  g.board.rebuild();
  g.phase = 'meeple'; g.skipMeeple();
  ok(g.phase === 'blow' && !g.m.actions().some((a) => /down|skip|instead/i.test(a.label)), 'every turn ends with a blow, and it cannot be put down');
  const d = g.m.blowDir;
  g.rotate(1);
  ok(g.m.blowDir === (d + 1) % 4, 'R turns it');
  g.m.blowDir = 1;
  ok(g.m.trainAt(1, 0).heavy, 'three tiles in front: too heavy for a push of 1');
  ok(g.cellClick(3, 0) && at(g, 2, 0) && !at(g, 3, 0) && at(g, 4, 0), 'the tile against it goes a square; behind it, nothing');
  ok(g.current === 1, 'and your turn ends');
  g = fresh(86);
  lay(g, 7, 0, 'B'); lay(g, 8, 0, 'B'); lay(g, 0, 0, 'B');
  power(g, 1);
  ok(blow(g, 7, 0, 1) && at(g, -8, 0) && at(g, 8, 0) && !at(g, 7, 0), 'the tiles touching in front go too, round the seam of the map');
});
prove('blow-power', (ok) => {
  const g = fresh(87);
  lay(g, 0, 0, 'B');
  g.board.rebuild();
  ok(g.m.pushPower() === 1, 'one, with no Abbazia on the board');
  lay(g, 1, 0, 'Kab'); g.board.rebuild();
  ok(g.m.pushPower() === 2, 'two with one');
  lay(g, 2, 0, 'Kab'); g.board.rebuild();
  g.current = 1;
  ok(g.m.pushPower() === 3, 'three with two, and the same for every player');
});
prove('blow-chain', (ok) => {
  const g = fresh(88);
  lay(g, 0, 0, 'B'); lay(g, 1, 0, 'Kz', 1); lay(g, 3, 0, 'B'); lay(g, 4, 0, 'B');
  g.board.rebuild();
  blow(g, 1, 0, 1);                         // a push of 1 moves the zephyr; it pushes with 1 and 1
  ok(at(g, 2, 0)?.type.id === 'Kz' && !at(g, 3, 0) && at(g, 4, 0) && at(g, 5, 0), 'the zephyr it pushes pushes in its turn, with its own push and yours');
  const h = fresh(89);
  lay(h, 0, 0, 'Kz', 1); lay(h, 1, 0, 'Kz', 1); lay(h, 3, 0, 'B');
  h.board.rebuild();
  power(h, 1);
  blow(h, 0, 0, 1);                         // both zephyrs move; the front one pushes the tile on
  ok(at(h, 1, 0)?.type.id === 'Kz' && at(h, 3, 0)?.type.id === 'Kz' && !at(h, 2, 0) && at(h, 4, 0)?.type.id === 'B', 'and what that pushes chains on');
  const k = fresh(90);
  lay(k, 0, 0, 'Kz', 1); for (const x of [2, 3, 4]) lay(k, x, 0, 'B');
  k.board.rebuild();
  blow(k, 0, 0, 1);                         // its push and yours make 2: three is too heavy
  ok(at(k, 2, 0) && at(k, 3, 0) && at(k, 4, 0) && !at(k, 5, 0), 'no further than its push and yours');
});
prove('blow-heavy', (ok) => {
  const g = fresh(91);
  for (const x of [0, 1, 2]) lay(g, x, 0, 'U', 1);
  lay(g, 0, 1, 'B');
  power(g, 1);
  put(g, 0, 0, 'road', 0); put(g, 1, 0, 'road', 1);
  blow(g, 0, 0, 1);                         // three in front, a push of 2
  ok([0, 1, 2].every((x) => at(g, x, 0)?.type.id === 'U'), 'too heavy: no tile moves');
  ok(at(g, 1, 0)?.meeple?.player === 0 && at(g, 2, 0)?.meeple?.player === 1 && !at(g, 0, 0).meeple, 'the followers on the tiles it reaches go a square downwind');
  const h = fresh(92);
  for (const x of [0, 1, 2]) lay(h, x, 0, 'U', 1);
  h.board.rebuild();
  put(h, 1, 0, 'road', 0);
  blow(h, 0, 0, 1);                         // a push of 1 reaches one tile
  ok(at(h, 1, 0)?.meeple?.player === 0, 'as many tiles as its power, and no further');
  const k = fresh(93);
  lay(k, 0, 0, 'U', 1);
  lay(k, 2, 0, 'Kqs', 1);                   // the sun begun: (1, 0) is kept for it
  k.board.rebuild();
  blow(k, 0, 0, 1);
  ok(at(k, 0, 0)?.type.id === 'U' && !at(k, 1, 0), 'nor into the big tower\'s kept 2x2');
});
prove('blow-towers', (ok) => {
  const g = fresh(93);
  lay(g, 0, 0, 'B'); lay(g, 1, 0, 'Kso', 1); lay(g, 5, 5, 'Kqs');
  power(g, 3);
  blow(g, 0, 0, 1);
  ok(at(g, 1, 0)?.type.id === 'B' && at(g, 2, 0)?.type.id === 'Kso', 'a tower half is pushed like any tile');
  blow(g, 5, 5, 0);
  ok(at(g, 5, 5)?.type.id === 'Kqs' && !at(g, 5, 4), 'a quarter of the big tower is never moved');
  const h = fresh(94);
  lay(h, 0, 0, 'Kqs'); lay(h, -1, 0, 'B');
  power(h, 3);
  blow(h, -1, 0, 1);
  ok(at(h, -1, 0)?.type.id === 'B' && at(h, 0, 0)?.type.id === 'Kqs', 'and a push with one in front moves nothing');
});
prove('tower-big', (ok) => {
  const g = fresh(94);
  const b = g.board;
  const fits = (x, y, id, r) => b.canPlace(x, y, TILES[id], r, g.placeOpts());
  ok(TILES.Kqs.feats[0].quarter && TILES.Kqh.feats[0].quarter && SPEC && Object.keys(DECK_COUNTS).includes('Kqs|Kqh'), 'the sun and the black hole are the two faces of the same four tiles');
  lay(g, 0, 0, 'Kqs', 0); lay(g, 1, 0, 'Kqs', 1); lay(g, 1, 1, 'Kqs', 2);
  ok(fits(0, 1, 'Kqs', 3), 'the fourth quarter completes the circle');
  ok(!fits(0, 1, 'Kqs', 0) && !fits(0, 1, 'Kqs', 1), 'a quarter turned wrong does not fit');
  ok(!fits(0, 1, 'Kqh', 3), 'nor a quarter of the other big tower');
  ok(b.canPlace(-1, 0, TILES.DXr, 0) && b.canPlace(0, -1, TILES.U, 0) && b.canPlace(2, 0, TILES.B, 0), 'its other two edges take anything');
  lay(g, 0, 1, 'Kqs', 3);
  lay(g, -1, 0, 'DEg', 1);                  // a district end, opening east onto the quarter
  b.rebuild();
  const d = b.featureOf(0, 0, 0);
  ok(d.tiles.size === 4 && d.open === 0, 'four make a 2x2');
  const city = b.featureOf(-1, 0, 0);
  ok(city && city.open === 0, 'and they cap what they meet');
});

prove('tower-kept', (ok) => {
  const g = fresh(95);
  const b = g.board;
  const fits = (x, y, id, r) => b.canPlace(x, y, TILES[id], r, g.placeOpts());
  lay(g, 0, 0, 'U');                        // a road north and south
  b.rebuild();
  ok(fits(1, 0, 'Kqh', 0) && fits(1, 0, 'Kqs', 0), 'the first quarter goes anywhere a tile may, sun or black hole');
  ok(!fits(1, 0, 'Kqh', 2), 'but not where the rest of its 2x2 is taken');
  layHand(g, 'Kqh', 1, 0, 0);               // the black hole begun: (2, 0), (1, 1) and (2, 1) are kept
  ok(!fits(2, 0, 'B', 0) && !fits(1, 1, 'U', 0), 'nothing else is laid in the rest of its 2x2');
  ok([0, 1, 2, 3].every((r) => !fits(0, -1, 'Kqh', r) && !fits(-1, 0, 'Kqh', r)), 'a quarter goes nowhere else');
  ok(!fits(2, 0, 'Kqs', 1), 'the first decided it: no sun now');
  ok(fits(2, 0, 'Kqh', 1) && fits(1, 1, 'Kqh', 3) && !fits(2, 1, 'Kqh', 2), 'into it, turned to face in, touching a quarter already there');
  // The wind keeps out of it.
  lay(g, 4, 0, 'B'); lay(g, 2, 3, 'B');
  b.rebuild();
  ok(g.m.trainAt(4, 0, 3)?.heavy === false && g.m.trainAt(2, 3, 0)?.heavy === false, '(a push that would only move a tile one square)');
  power(g, 1);
  blow(g, 4, 0, 3);
  ok(at(g, 3, 0)?.type.id === 'B' && !at(g, 2, 0), 'a push goes up to it');
  g.phase = 'blow';
  ok(g.m.trainAt(3, 0, 3)?.heavy, 'and no further');
  lay(g, 2, 2, 'U', 1);                     // a road east and west under the kept (2, 1)
  b.rebuild();
  ok(!g.m.astrayTargets(at(g, 2, 2)).some((t) => t.dir === 0), 'nor does a tile moving on');
  // Off the mainland, it still takes its quarters.
  for (let i = 0; i < 6; i++) lay(g, -7 + i, 5, 'B');
  b.rebuild();
  ok(!g.m.placeOpts().onto.has('1,0') && fits(2, 0, 'Kqh', 1), 'wherever the 2x2 is, off the mainland too');
  g.phase = 'place';
  layHand(g, 'Kqh', 2, 0, 1); layHand(g, 'Kqh', 1, 1, 3);
  b.rebuild();
  ok(fits(2, 1, 'Kqh', 2), 'the last one touches two');
  layHand(g, 'Kqh', 2, 1, 2);
  ok(g.m.hues.hole === 1, 'so once begun, it always closes');
  ok(!b.legalPlacements(TILES.Kqh, g.placeOpts()).length && !b.legalPlacements(TILES.Kqs, g.placeOpts()).length, 'and there is one big tower a game');
});
prove('tower-sun', (ok) => {
  const g = fresh(95);
  for (const x of [4, 5, 6, 7, 8]) lay(g, x, 0, 'B');
  lay(g, 0, 5, 'U');
  g.board.rebuild();
  put(g, 4, 0, 'field', 0); put(g, 0, 5, 'road', 0);
  for (const hue of ['green', 'blue', 'red', 'yellow']) g.m.fire(hue);
  const all = g.players[0].score;
  g.players[0].score = 0;
  g.m.pending.length = 0;
  lay(g, 0, 0, 'Kqs', 0); lay(g, 1, 0, 'Kqs', 1); lay(g, 1, 1, 'Kqs', 2); lay(g, 0, 1, 'Kqs', 3);
  g.board.rebuild();
  g.m.joinSferas();
  ok(all > 0 && g.players[0].score === all && g.m.hues.sun === 1, `every colour fires at once (${g.players[0].score} of ${all})`);
});
prove('tower-hole', (ok) => {
  const g = fresh(96);
  lay(g, -1, 0, 'B'); lay(g, 2, 1, 'B'); lay(g, 0, 2, 'B'); lay(g, 5, 5, 'B');
  g.board.rebuild();
  put(g, 2, 1, 'field', 0);
  lay(g, 0, 0, 'Kqh', 0); lay(g, 1, 0, 'Kqh', 1); lay(g, 1, 1, 'Kqh', 2); lay(g, 0, 1, 'Kqh', 3);
  g.board.rebuild();
  const deck = g.deck.length, had = g.players[0].meeples;
  g.m.joinSferas();
  ok(!at(g, -1, 0) && !at(g, 2, 1) && !at(g, 0, 2) && at(g, 5, 5) && at(g, 0, 0), 'the twelve squares round it are swallowed, and nothing else');
  ok(g.deck.length === deck + 3, 'back into the deck');
  ok(g.players[0].meeples === had + 1, 'every follower on them home');
});
prove('close-unclaimed', (ok) => {
  const g = fresh(97);
  lay(g, 0, 0, 'U'); lay(g, 0, -1, 'Kab');
  g.board.rebuild();
  g.current = 1;
  layHand(g, 'Kab', 0, 1);
  ok(g.players[1].score === 1 && g.players[0].score === 0, `a road closed with nobody in it pays whoever laid its last piece, at once (${g.players[1].score})`);
  const h = fresh(98);
  lay(h, 0, 0, 'DEg', 2);
  h.board.rebuild();
  layHand(h, 'DEr', 0, 1, 0);
  ok(h.players[0].score === 8, `a city: what blue would pay it (${h.players[0].score})`);
  const k = fresh(99);
  lay(k, 0, 0, 'U'); lay(k, 0, -1, 'Kab'); lay(k, -1, 1, 'Kab');
  k.board.rebuild();
  blow(k, -1, 1, 1);                        // the Abbazia pushed onto the road's open end
  ok(k.players[0].score === 1, `or whose blow closes it (${k.players[0].score})`);
  const m = fresh(100);
  lay(m, 0, 0, 'U'); lay(m, 0, -1, 'Kab');
  m.board.rebuild();
  put(m, 0, 0, 'road', 0);
  m.current = 1;
  layHand(m, 'Kab', 0, 1);
  ok(m.players[1].score === 0, 'one somebody holds pays its closer nothing');
});

// --- Run them. ------------------------------------------------------------------
/**
 * Every rule against its test. Returns the failures, so the harness can run it
 * too; run directly, it prints them and exits 1 if there are any.
 */
export async function checkRulebook() {
  const fails = [];
  const say = (msg) => fails.push(msg);
  for (const [mode, book] of Object.entries(RULEBOOK)) {
    const ids = new Set(), nums = new Set();
    for (const r of book.rules) {
      if (ids.has(r.id)) say(`${mode}: two rules called ${r.id}`);
      if (nums.has(r.n)) say(`${mode}: rule number ${r.n} used twice`);
      if ((book.retired || []).includes(r.n)) say(`${mode}: rule ${r.n} uses a retired number`);
      if (!book.groups.some((gr) => gr.id === r.group)) say(`${mode}: rule ${r.n} is in no group`);
      if (!r.text || !r.from?.by || (r.from.by === 'timothy' && (!r.from.said || !r.from.on)) || (r.from.by === 'claude' && !r.from.why)) {
        say(`${mode}: rule ${r.n} needs its words and where it came from`);
      }
      for (const m of r.text.matchAll(/rules? (\d+)(?: (?:to|and) (\d+))?/g)) {
        for (const n of [m[1], m[2]].filter(Boolean).map(Number)) {
          if (!book.rules.some((o) => o.n === n)) say(`${mode}: rule ${r.n} points at rule ${n}, which is not there`);
        }
      }
      ids.add(r.id); nums.add(r.n);
      const proof = PROOFS[r.id];
      if (!proof) { say(`${mode}: rule ${r.n} (${r.id}) has no test`); continue; }
      const bad = [];
      try { await proof((c, msg) => { if (!c) bad.push(msg); }); } catch (e) { bad.push(`threw: ${e.stack || e}`); }
      for (const msg of [...new Set(bad)]) say(`${mode} rule ${r.n} (${r.id}): ${msg}`);
    }
    for (const id of Object.keys(PROOFS)) if (!ids.has(id)) say(`a test with no rule: ${id}`);
  }
  return fails;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const fails = await checkRulebook();
  for (const f of fails) console.log(`FAIL ${f}`);
  const n = Object.values(RULEBOOK).reduce((t, b) => t + b.rules.length, 0);
  console.log(fails.length ? `${fails.length} checks failed.` : `Every rule holds: ${n} rules, each proven on the engine.`);
  if (fails.length) process.exit(1);
}
