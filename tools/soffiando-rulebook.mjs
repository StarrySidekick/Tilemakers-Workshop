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
// game runs: the mode's own weather, scoring and turn steps, the wind engine
// (src/wind.js) and the host (src/game.js). A test that drives the raw wind
// engine instead says so; that is where a single gust has to be watched on
// its own, without a storm or a mainland in the way.
// ---------------------------------------------------------------------------

import { Game, MODES } from '../src/game.js';
import { Board } from '../src/board.js';
import { TILES, wallSides, DISTRICTS, edgesMeet } from '../src/tiles.js';
import { gust, storm } from '../src/wind.js';
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
const blow = (g, x, y, dir, more = {}, by = g.current) => g.m.weather([{ dir, from: { x, y }, ...more }], by);
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
    ok(g.players.length === n && g.players.every((p) => p.meeples === 8), `eight followers each at ${n}`);
  }
});
prove('game-start', (ok) => {
  const g = new Game({ mode: 'soffiando', players: 2, seed: 3 });
  const cells = [...g.board.cells.values()];
  ok(cells.length === 1 && cells[0].type.id === 'Kpz' && cells[0].x === 0 && cells[0].y === 0, 'the Palazzo alone, in the middle');
  ok(g.current === 0 && g.phase === 'place', 'the first player lays first');
  const s = g.board.legalPlacements(g.tile, g.placeOpts())[0];
  g.rot = s.rot; g.placeAt(s.x, s.y);
  if (g.phase === 'meeple') g.skipMeeple();
  ok(g.current === 1, 'then the next player');
});
prove('game-deck', (ok) => {
  const ids = (o, seed = 5) => { const g = new Game({ mode: 'soffiando', players: 2, seed, options: o }); return [g.tile.id, ...g.deck]; };
  const plain = ids({});
  ok(plain.length === 72, `72 tiles (${plain.length})`);
  const tally = {};
  for (const id of plain) tally[id] = (tally[id] || 0) + 1;
  ok(Object.entries(DECK_COUNTS).every(([id, n]) => (tally[id] || 0) === n) && Object.keys(tally).every((id) => id in DECK_COUNTS), 'each tile as many times as the deck list says');
  ok(ids({}, 6).join() !== plain.join(), 'shuffled');
  const lone = (id) => TILES[id].feats.some((f) => f.type === 'city' && !f.district);
  const has = (kind) => (id) => TILES[id].feats.some((f) => f.type === kind);
  const mark = (kind) => (id) => TILES[id].marks.some((m) => m.kind === kind);
  const count = (f) => plain.filter(f).length;
  const isDistrict = (id) => TILES[id].feats.some((f) => f.district) && !mark('turbine')(id) && !has('sfera')(id);
  ok(count(isDistrict) === 15, `15 districts (${count(isDistrict)})`);
  ok(count(has('sfera')) === 16 && ['green', 'blue', 'red', 'yellow'].every((h) => plain.filter((id) => TILES[id].feats.some((f) => f.hue === h)).length === 4), '16 sfera halves, four of each colour');
  ok(count(mark('zephyr')) === 18, `18 zephyrs and cannons (${count(mark('zephyr'))})`);
  ok(count(mark('turbine')) === 3, '3 windmills');
  ok(count((id) => id === 'Kt') === 4 && count((id) => id === 'Kta') === 1, '4 temples and a temple on a road');
  ok(count((id) => id === 'Kab') === 3 && count((id) => id === 'Kfl') === 3 && count((id) => id === 'Kw') === 2, '3 Abbazias, 3 flying machines, 2 windvanes');
  ok(count((id) => ['U', 'V', 'X', 'Gw'].includes(id)) === 7, '7 plain roads');
  ok(!plain.some(lone), 'no lone wall dealt');
  ok(Object.entries(DECK_COUNTS).some(([id, n]) => !n && lone(id)), 'the lone walls are extras');
  const more = ids({ deck: { Kce: 2, U: 1 } });
  ok(more.filter((id) => id === 'Kce').length === 2 && more.filter((id) => id === 'U').length === 1 && more.length === 72, 'a game\'s own deck list replaces counts by tile');
});
prove('game-map', (ok) => {
  const b = SPEC.bounds;
  ok(b.maxX - b.minX + 1 === 17 && b.maxY - b.minY + 1 === 17, '17 by 17');
  ok(b.minX === -8 && b.maxX === 8 && b.minY === -8 && b.maxY === 8, 'the Palazzo\'s square in the very middle');
  const g = new Game({ mode: 'soffiando', players: 2, seed: 4 });
  ok(g.board.get(0, 0)?.type.id === 'Kpz', 'and the Palazzo on it');
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
  lay(h, -1, 4, 'Kz', 1);                   // east
  lay(h, 7, 4, 'U', 1); lay(h, 8, 4, 'U', 1); lay(h, 8, 3, 'B');   // an island against the east edge
  h.board.rebuild();
  const deck = h.deck.length;
  blow(h, -1, 4, 1);
  ok(at(h, 8, 4)?.type.id === 'U' && at(h, -8, 4)?.type.id === 'U' && at(h, -8, 3)?.type.id === 'B' && !at(h, 7, 4), 'carried off the east edge, it comes on at the west');
  ok(h.board.groups().some((gr) => gr.length === 3 && gr.some((c) => c.x === 8) && gr.some((c) => c.x === -8)), 'still joined');
  ok(h.m.lost === 0 && h.deck.length === deck, 'nothing lost');
});

// --- Your turn. -----------------------------------------------------------------
prove('turn-draw', (ok) => {
  let g = fresh(6);
  lay(g, 0, 0, 'DXg');
  g.deck = ['DXr', 'DXt'];
  g.drawTile();
  ok(g.tile.id === 'DXt' && g.phase === 'place', 'the top tile is drawn');
  g = fresh(7);
  lay(g, 0, 0, 'DXg');                     // a city all round: a plain road fits nowhere
  g.deck = ['DXm', 'U'];
  const lines = said(g, () => g.drawTile());
  ok(lines.some((l) => /U had nowhere to go/.test(l)) && g.tile.id === 'DXm', 'a tile that fits nowhere is set aside, and the next drawn');
  g.deck = ['U'];
  g.tile = null;
  g.drawTile();
  ok(g.phase === 'over', 'with the deck run out, the season ends');
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
  lay(g, 3, 0, 'Kso', 2);                  // a sfera half facing south
  ok(b.canPlace(3, 1, TILES.Kso, 0) && !b.canPlace(3, 1, TILES.U, 0), 'sfera half to sfera half, nothing else');
  lay(g, 5, 0, 'DXg');
  ok(b.canPlace(6, 0, TILES.DXr, 0) && !b.canPlace(6, 0, TILES.B, 0), 'city to city');
  lay(g, 0, 5, 'DEg', 0);                  // walls east, south and west
  ok(b.canPlace(1, 5, TILES.B, 0) && b.canPlace(1, 5, TILES.U, 1) && b.canPlace(1, 5, TILES.DEt, 1), 'a wall to a field, a road or another wall');
  ok(!b.canPlace(1, 5, TILES.DXr, 0) && !b.canPlace(1, 5, TILES.Kso, 3), 'never an open city or a sfera half');
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
});
prove('turn-step', (ok) => {
  const g = fresh(10);
  lay(g, 0, 0, 'U'); lay(g, 0, 1, 'U');
  lay(g, 3, 0, 'DXg');
  g.board.rebuild();
  put(g, 3, 0, 'city', 0);
  ok(layHand(g, 'U', 0, 2) && g.phase === 'meeple', 'after laying, the follower step');
  ok(g.meepleOptions().length > 0 && g.m.canBlow(), 'a claim or your cloud on offer');
  ok(g.m.canLieDown() && g.m.beginFlat() && g.cellClick(3, 0), 'lying flat first');
  ok(g.phase === 'meeple' && g.meepleOptions().length > 0, 'still your follower step after');
  ok(!g.m.canLieDown(), 'once a turn');
  const o = g.meepleOptions()[0];
  g.placeMeeple(o.i, o);
  ok(g.current === 1, 'a claim ends the turn');
});
prove('turn-catch', (ok) => {
  const g = fresh(11);
  lay(g, 0, 0, 'Kz', 1);                   // east
  lay(g, 1, 0, 'U');                        // the loose end, a road
  lay(g, 2, 1, 'B');                        // a field below where it lands
  g.board.rebuild();
  const left = g.tilesLeft;
  blow(g, 0, 0, 1);
  ok(!at(g, 2, 0) && g.deck[g.deck.length - 1] === 'U', 'the fallen tile is on top of the deck');
  ok(g.tilesLeft === left + 1, 'and you lay one more tile this turn');
  lay(g, 5, 0, 'Kz', 1); lay(g, 6, 0, 'U'); lay(g, 7, 1, 'B');
  g.board.rebuild();
  blow(g, 5, 0, 1);
  ok(g.tilesLeft === left + 1, 'once a turn, however many fall');
  g.phase = 'meeple';
  g.skipMeeple();
  ok(g.current === 0 && g.phase === 'place' && g.tile?.id === 'U', 'the extra tile is the last that fell');
  const h = fresh(12);
  lay(h, 0, 0, 'Kz', 1); lay(h, 1, 0, 'U'); lay(h, 2, 1, 'B');
  h.board.rebuild();
  const l2 = h.tilesLeft;
  blow(h, 0, 0, 1, {}, 1);                 // somebody else's weather
  ok(h.tilesLeft === l2, 'only your own weather');
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
  ok(pz.includes('road') && pz.includes('field') && !pz.includes('city'), 'a road and a field, never the wall');
  const sx = kinds('Ksx');
  ok(sx.includes('city') && !sx.includes('sfera'), 'a district, never a sfera half');
  ok(kinds('Kt').includes('temple'), 'a temple');
  for (const c of [...g.board.cells.values()]) g.board.remove(c.x, c.y);
  lay(g, 0, 0, 'U');
  g.lastPlaced = lay(g, 0, 1, 'U');
  g.board.rebuild();
  put(g, 0, 0, 'road', 1);
  g.phase = 'meeple';
  ok(!g.meepleOptions().some((o) => o.f.type === 'road'), 'not a feature somebody holds anywhere');
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
  const b = raw();
  rlay(b, 0, 0, 'Kz', 1); rlay(b, 1, 0, 'B'); rlay(b, 2, 0, 'B'); rlay(b, 3, 0, 'B');
  rput(b, 2, 0, 'monastery', 0);
  rput(b, 3, 0, 'monastery', 1);
  gust(b, { dir: 1, from: { x: 0, y: 0 } });
  const figures = [...b.cells.values()].filter((c) => c.meeple);
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
  ok(![0, 1, 2].some((x) => at(g, x, 0).meeple) && g.players[0].meeples === 8 && g.players[1].meeples === 8, 'everyone in it goes home, paid or not');
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
  lay(g, 0, 0, 'DEg', 2); lay(g, 0, 1, 'DEt', 0);   // two districts, walled all round
  lay(g, 5, 5, 'U');
  g.board.rebuild();
  put(g, 0, 0, 'city', 0);
  put(g, 5, 5, 'road', 0);
  g.phase = 'meeple';
  ok(g.m.flatTargets().length === 1 && g.m.flatTargets()[0].y === 0, 'only one standing in a city');
  g.m.beginFlat(); g.cellClick(0, 0);
  g.m.fire('blue'); g.m.sweep();
  ok(at(g, 0, 0).meeple?.flat, 'it never comes home');
  ok(g.players[0].score === 3, `no walled double while only flat followers hold it (paid ${g.players[0].score})`);
  const h = fresh(22);
  lay(h, 0, 0, 'DEg', 2); lay(h, 0, 1, 'DEt', 0);
  h.board.rebuild();
  put(h, 0, 0, 'city', 0);
  h.m.fire('blue');
  ok(h.players[0].score === 6, 'standing, the same city pays the double');
});

// --- The wind. ------------------------------------------------------------------
prove('wind-blows', (ok) => {
  const g = fresh(23);
  lay(g, 0, 0, 'B'); lay(g, 1, 0, 'B');
  g.board.rebuild();
  const gusts = g.m.gusts;
  layHand(g, 'Kz', -1, 0, 1);              // a zephyr pointing east
  ok(g.m.gusts > gusts && at(g, 2, 0) && !at(g, 1, 0), 'it blows the moment it is laid');
  const g2 = fresh(24);
  lay(g2, -7, 0, 'Kz', 1); lay(g2, -6, 0, 'B');
  lay(g2, 6, 0, 'B'); lay(g2, 6, 1, 'B');
  g2.board.rebuild();
  blow(g2, -7, 0, 1);
  ok(at(g2, 7, 0) && at(g2, 7, 1), 'all the way down its lane, to the far side of the map');
  const g3 = fresh(124);
  lay(g3, 4, 0, 'Kz', 1); lay(g3, 3, 0, 'B'); lay(g3, 2, 0, 'B');
  for (const y of [1, 2, 3, 4]) lay(g3, 2, y, 'B');
  lay(g3, -4, 0, 'B');                      // an island behind it, round the seam
  lay(g3, 7, 0, 'B'); lay(g3, 8, 0, 'B');   // and in front of it, a piece at the edge
  g3.board.rebuild();
  blow(g3, 4, 0, 1);
  ok(at(g3, -4, 0) && !at(g3, -3, 0), 'the wind takes hold of nothing past the edge');
  ok(at(g3, 8, 0) && at(g3, -8, 0) && !at(g3, 7, 0), 'but what it pushes over the edge comes on at the other side');
});
prove('wind-loose-end', (ok) => {
  const g = fresh(25);
  lay(g, 4, 0, 'Kz', 3);                   // west
  for (const x of [3, 2, 1, 0]) lay(g, x, 0, 'B');
  g.board.rebuild();
  blow(g, 4, 0, 3);
  ok(at(g, -1, 0) && !at(g, 0, 0) && [1, 2, 3, 4].every((x) => at(g, x, 0)), 'one tile off the end, one square');
  const h = fresh(26);
  lay(h, 4, 0, 'Kzz', 3);                  // west, at power two
  for (const x of [3, 2, 1, 0]) lay(h, x, 0, 'B');
  h.board.rebuild();
  blow(h, 4, 0, 3, { push: 2 });
  ok(at(h, -2, 0) && at(h, -1, 0) && !at(h, 0, 0) && !at(h, 1, 0), 'power two: two tiles, two squares each');
  const b = raw();
  rlay(b, 4, 0, 'Kzz', 3); for (const x of [3, 2, 1, 0]) rlay(b, x, 0, 'B');
  rlay(b, -2, 1, 'B');                     // not in the lane
  rlay(b, -3, 0, 'B'); b.get(-3, 0).anchored = true;   // something in the way, two squares on
  gust(b, { dir: 3, from: { x: 4, y: 0 }, push: 2 });
  ok(b.get(-2, 0) && b.get(-1, 0) && !b.get(0, 0), 'stopping early against what is in the way (raw engine)');
});
prove('wind-every-run', (ok) => {
  const g = fresh(27);
  lay(g, 0, 0, 'Kz', 1); lay(g, 1, 0, 'B'); lay(g, 2, 0, 'B');
  lay(g, 0, 1, 'B'); lay(g, 0, 2, 'B');    // a mainland of five
  lay(g, 5, 0, 'B');                        // across a gap, more country
  g.board.rebuild();
  blow(g, 0, 0, 1);
  ok(at(g, 3, 0) && !at(g, 2, 0), 'the first run\'s loose end');
  ok(at(g, 6, 0) && !at(g, 5, 0), 'and the next one\'s, across the gap');
  const b = raw();
  rlay(b, 0, 0, 'Kzz', 1); rlay(b, 1, 0, 'B');
  rlay(b, 4, 0, 'B'); rlay(b, 5, 0, 'B');
  const r = gust(b, { dir: 1, from: { x: 0, y: 0 }, push: 2 });
  ok(b.get(6, 0) && b.get(7, 0) && !b.get(4, 0), 'at the same power on the far side (raw engine)');
  ok(r.reached.some((c) => c.x >= 6), 'the far run was reached');
});
prove('wind-own-tile', (ok) => {
  const g = fresh(28);
  lay(g, 0, 0, 'Kz', 1); lay(g, 1, 0, 'B');
  lay(g, 0, 1, 'B'); lay(g, 0, 2, 'B');
  g.board.rebuild();
  blow(g, 0, 0, 1);
  ok(at(g, 0, 0)?.type.id === 'Kz' && at(g, 2, 0), 'the zephyr stays where it is');
});
prove('wind-whole-island', (ok) => {
  const g = fresh(29);
  lay(g, 0, 0, 'Kzz', 1);                  // east, power two
  for (const y of [1, 2, 3, 4]) lay(g, 0, y, 'B');   // the mainland
  lay(g, 3, 0, 'B'); lay(g, 3, 1, 'B');     // an island, one arm out of the lane
  lay(g, 5, 1, 'B');                        // something it will come up against
  g.board.rebuild();
  put(g, 3, 1, 'monastery', 0);
  blow(g, 0, 0, 1, { push: 2 });
  ok(at(g, 4, 0) && at(g, 4, 1) && !at(g, 3, 0) && !at(g, 3, 1), 'the whole island, its arm too, up to what stops it');
  ok(at(g, 4, 1).meeple?.player === 0, 'with everything on it');
  ok([1, 2, 3, 4].every((y) => at(g, 0, y)), 'the mainland only loses its loose end');
});
prove('wind-walls', (ok) => {
  const g = fresh(30);
  lay(g, 0, 0, 'Kz');                       // north
  lay(g, 0, -1, 'DEg');                     // walls east, south and west: the south one is across the wind
  lay(g, 1, 0, 'B'); lay(g, 2, 0, 'B');
  g.board.rebuild();
  blow(g, 0, 0, 0);
  ok(at(g, 0, -1)?.type.id === 'DEg' && !at(g, 0, -2), 'a wall across the wind holds');
  const h = fresh(31);
  lay(h, 0, 0, 'Kz');                       // north
  lay(h, 0, -1, 'DIg', 1);                  // walls east and west only: along the wind
  lay(h, 1, 0, 'B'); lay(h, 2, 0, 'B');
  h.board.rebuild();
  blow(h, 0, 0, 0);
  ok(!at(h, 0, -1) && at(h, 0, -2)?.type.id === 'DIg', 'a wall along the wind moves');
  const k = fresh(32);
  lay(k, 0, 0, 'Kz', 1);
  for (const y of [1, 2, 3, 4]) lay(k, 0, y, 'B');
  lay(k, 3, 0, 'B'); lay(k, 3, 1, 'DEg', 0);   // an island with a wall across an east wind
  k.board.rebuild();
  blow(k, 0, 0, 1);
  ok(at(k, 3, 0) && at(k, 3, 1), 'an island with such a tile stays where it is');
});
prove('wind-vane', (ok) => {
  const b = raw();
  rlay(b, 0, 0, 'Kz', 1); rlay(b, 1, 0, 'Kw', 0); rlay(b, 2, 0, 'B');
  gust(b, { dir: 1, from: { x: 0, y: 0 } });
  const vane = [...b.cells.values()].find((c) => c.type.id === 'Kw');
  ok(vane && (vane.rot & 1) === 1, 'turned to lie east to west');
  gust(b, { dir: 0, from: { x: vane.x, y: vane.y + 1 } });
  ok((vane.rot & 1) === 0, 'and back along a north wind');
});
prove('wind-turbine', (ok) => {
  const g = fresh(33);
  lay(g, 0, 0, 'Kz', 1); lay(g, 1, 0, 'Ktr'); lay(g, 2, 0, 'B'); lay(g, 3, 0, 'B');
  lay(g, 1, -1, 'U');                       // the mill's road runs on north, out of the lane
  g.board.rebuild();
  put(g, 1, -1, 'road', 0);
  blow(g, 0, 0, 1);
  ok(g.players[0].score === 2 && g.players[1].score === 0, `2 to its holder per gust (${g.players[0].score})`);
  blow(g, 0, 0, 1);
  ok(g.players[0].score === 4, 'and again');
  const h = fresh(133);
  lay(h, 0, 0, 'Kz', 1); lay(h, 1, 0, 'Ktr', 1); lay(h, 2, 0, 'B'); lay(h, 3, 0, 'B');
  h.board.rebuild();
  put(h, 1, 0, 'road', 0);                  // standing on the mill, in the lane
  blow(h, 0, 0, 1);
  ok(h.players[0].score === 0, 'a holder the gust blows off it is not paid');
});

// --- Zephyrs in a storm. --------------------------------------------------------
prove('storm-absorb', (ok) => {
  const g = fresh(34);
  lay(g, 0, 0, 'Kz', 1); lay(g, 1, 0, 'B'); lay(g, 2, 0, 'Kz', 1); lay(g, 3, 0, 'B'); lay(g, 4, 0, 'B');
  g.board.rebuild();
  blow(g, 0, 0, 1);
  ok(at(g, 5, 0) && at(g, 6, 0) && !at(g, 3, 0) && !at(g, 4, 0), 'power two beyond it');
  ok(at(g, 2, 0)?.type.id === 'Kz' && at(g, 1, 0), 'and nothing upwind of it moves');
});
prove('storm-wake', (ok) => {
  const g = fresh(35);
  lay(g, 0, 0, 'Kz', 1); lay(g, 1, 0, 'B'); lay(g, 2, 0, 'Kz', 0); lay(g, 3, 0, 'B'); lay(g, 4, 0, 'B');
  lay(g, 2, -1, 'B'); lay(g, 2, -2, 'B');
  g.board.rebuild();
  blow(g, 0, 0, 1);
  ok(at(g, 2, -3) && at(g, 2, -4) && !at(g, 2, -1), 'it turns north, a power harder');
  const b = raw();
  rlay(b, 0, 0, 'Kz', 1); rlay(b, 1, 0, 'Kzz', 0); rlay(b, 2, 0, 'B');
  const r = gust(b, { dir: 1, from: { x: 0, y: 0 } });
  const w = r.zephyrs.find((z) => z.cell.type.id === 'Kzz');
  ok(w && w.push === 2, 'arriving at one, it wakes at two');
  const b2 = raw();
  rlay(b2, 0, 0, 'Kz', 1); rlay(b2, 1, 0, 'Kzz', 0); rlay(b2, 2, 0, 'B'); rlay(b2, 1, -1, 'B');
  const rs = storm(b2, { dir: 1, from: { x: 0, y: 0 } });
  ok(rs.length === 2 && rs[1].push === 2, 'and the double zephyr opens at its own two (raw engine)');
});
prove('storm-once', (ok) => {
  const b = raw();
  rlay(b, 0, 0, 'Kz', 1); rlay(b, 1, 0, 'B'); rlay(b, 2, 0, 'Kz', 3); rlay(b, 3, 0, 'B'); rlay(b, 4, 0, 'B');
  const rs = storm(b, { dir: 1, from: { x: 0, y: 0 } });
  ok(rs.length === 2, `two zephyrs facing each other blow once each (${rs.length} gusts)`);
});
prove('storm-multi', (ok) => {
  const g = fresh(36);
  lay(g, 0, -1, 'B'); lay(g, 1, -1, 'B'); lay(g, 1, 0, 'B');
  g.board.rebuild();
  layHand(g, 'Kzx', 0, 0, 0);               // north and east at once
  ok(at(g, 0, -2) && !at(g, 0, -1), 'down the north lane');
  ok(at(g, 2, 0) && !at(g, 1, 0), 'and the east one');
});
prove('storm-double', (ok) => {
  const h = fresh(38);
  lay(h, 0, 1, 'B'); lay(h, 1, 1, 'B'); lay(h, 2, 1, 'B'); lay(h, 3, 1, 'B');
  lay(h, 1, 0, 'B'); lay(h, 2, 0, 'B'); lay(h, 3, 0, 'B');
  h.board.rebuild();
  layHand(h, 'Kzz', 0, 0, 1);               // a double zephyr laid pointing east
  ok(at(h, 4, 0) && at(h, 5, 0) && !at(h, 2, 0) && !at(h, 3, 0), 'two tiles, two squares: power two');
});
prove('storm-cannon', (ok) => {
  const g = fresh(39);
  lay(g, 0, 0, 'Kg', 1); lay(g, 1, 0, 'B');
  for (const y of [1, 2, 3]) lay(g, 0, y, 'B');
  lay(g, 5, 0, 'B'); lay(g, 5, -1, 'B'); lay(g, 5, -2, 'B'); lay(g, 5, -3, 'B'); lay(g, 5, -4, 'B');  // a far shore, the biggest piece
  g.board.rebuild();
  blow(g, 0, 0, 1, { blast: true });
  ok(at(g, 4, 0) && !at(g, 1, 0), 'it flies until the square in front of it is taken');
  const h = fresh(40);
  lay(h, 0, 0, 'Kg', 1); lay(h, 1, 0, 'B');
  for (const y of [1, 2, 3]) lay(h, 0, y, 'B');
  h.board.rebuild();
  const deck = h.deck.length;
  blow(h, 0, 0, 1, { blast: true });
  ok(!at(h, 1, 0) && at(h, -1, 0)?.type.id === 'B' && h.m.lost === 0 && h.deck.length === deck, 'with nothing else in its row, round the map to the back of its own cannon');
});

// --- Out of the sky. ------------------------------------------------------------
prove('fall-mismatch', (ok) => {
  const g = fresh(41);
  lay(g, 0, 0, 'Kz', 1); lay(g, 1, 0, 'U');
  lay(g, 2, -1, 'U');                       // a road above where it lands: that edge matches
  lay(g, 2, 1, 'B');                        // a field below: that one does not
  for (const y of [1, 2]) lay(g, 0, y, 'B');
  g.board.rebuild();
  blow(g, 0, 0, 1);
  ok(!at(g, 2, 0) && g.deck[g.deck.length - 1] === 'U', 'one wrong edge and it falls, onto the top of the deck');
});
prove('fall-alone', (ok) => {
  const g = fresh(42);
  lay(g, 0, 0, 'Kz', 1); lay(g, 1, 0, 'B');
  for (const y of [1, 2]) lay(g, 0, y, 'B');
  g.board.rebuild();
  blow(g, 0, 0, 1);
  ok(at(g, 2, 0) && g.board.degree(2, 0) === 0, 'touching nothing, it hangs there');
});
prove('fall-followers', (ok) => {
  const g = fresh(44);
  lay(g, 0, 0, 'Kz', 1); lay(g, 1, 0, 'U'); lay(g, 2, 1, 'B');
  for (const y of [1, 2]) lay(g, 0, y, 'B');
  g.board.rebuild();
  put(g, 1, 0, 'road', 0);
  blow(g, 0, 0, 1);
  ok(!at(g, 2, 0) && g.players[0].meeples === 8, 'a follower on a tile that falls goes home');
});

// --- Followers in the wind. -----------------------------------------------------
prove('blown-lane', (ok) => {
  const b = raw();
  rlay(b, 0, 0, 'Kz', 1); rlay(b, 1, 0, 'B'); rlay(b, 2, 0, 'B'); rlay(b, 3, 0, 'B');
  rput(b, 1, 0, 'monastery', 0);           // in the lane, not on the loose end
  rput(b, 3, 0, 'monastery', 1);           // on the loose end
  gust(b, { dir: 1, from: { x: 0, y: 0 } });
  ok(b.get(4, 0)?.meeple?.player === 1, 'one on a tile that moves rides it');
  ok(b.get(2, 0)?.meeple?.player === 0 && !b.get(1, 0).meeple, 'one in the lane is put down a square on');
  const b2 = raw();
  rlay(b2, 0, 0, 'Kzz', 1); rlay(b2, 1, 0, 'B'); rlay(b2, 2, 0, 'B'); rlay(b2, 3, 0, 'B'); rlay(b2, 4, 0, 'B'); rlay(b2, 5, 0, 'B');
  rput(b2, 1, 0, 'monastery', 0);
  gust(b2, { dir: 1, from: { x: 0, y: 0 }, push: 2 });
  ok(b2.get(3, 0)?.meeple?.player === 0, 'as many squares as the power where it stood (raw engine)');
});
prove('blown-ride', (ok) => {
  const b = raw();
  rlay(b, 0, 0, 'Kz', 1); rlay(b, 1, 0, 'B'); rlay(b, 2, 0, 'Kz', 2); rlay(b, 3, 0, 'B');
  rlay(b, 2, 1, 'B');                       // where the south zephyr carries it
  rput(b, 1, 0, 'monastery', 0);
  gust(b, { dir: 1, from: { x: 0, y: 0 } });
  ok(b.get(2, 1)?.meeple?.player === 0 && !b.get(2, 0).meeple, 'put down on a zephyr, it goes on down its lane (raw engine)');
});
prove('blown-fly-on', (ok) => {
  const b = raw();
  rlay(b, 0, 0, 'Kz', 1); rlay(b, 1, 0, 'B'); rlay(b, 2, 0, 'B');
  rput(b, 1, 0, 'monastery', 0);
  gust(b, { dir: 1, from: { x: 0, y: 0 } });
  ok(b.get(3, 0)?.meeple?.player === 0, 'off the ledge, it flies on to the next tile (raw engine)');
  const b2 = raw(SPEC.bounds, true);
  rlay(b2, 5, 0, 'Kg', 1); rlay(b2, 6, 0, 'B'); rlay(b2, 7, 0, 'B'); rlay(b2, 5, 1, 'B');
  rput(b2, 6, 0, 'monastery', 0);
  const r = gust(b2, { dir: 1, from: { x: 5, y: 0 }, blast: true });
  ok(b2.get(4, 0)?.meeple?.player === 0 && !r.homed.length, 'round the map, onto the tile its cannon fired behind it (raw engine, wrapping)');
});
prove('blown-occupied', (ok) => {
  const b = raw();
  rlay(b, 0, 0, 'Kz', 1); rlay(b, 1, 0, 'B'); rlay(b, 2, 0, 'B'); rlay(b, 3, 0, 'B');
  rput(b, 3, 0, 'monastery', 1);           // rides the loose end on to (4, 0)
  rput(b, 2, 0, 'monastery', 0);           // would fly on to (4, 0) too
  gust(b, { dir: 1, from: { x: 0, y: 0 } });
  ok(b.get(4, 0)?.meeple?.player === 1 && b.get(2, 0)?.meeple?.player === 0, 'it stays where it was (raw engine)');
});
prove('blown-feature', (ok) => {
  const b = raw();
  rlay(b, 0, 0, 'Kz', 1); rlay(b, 1, 0, 'U'); rlay(b, 2, 0, 'U'); rlay(b, 3, 0, 'U');
  rput(b, 1, 0, 'road', 0);
  rlay(b, 0, 5, 'Kz', 1); rlay(b, 1, 5, 'U'); rlay(b, 2, 5, 'Kab'); rlay(b, 3, 5, 'B');
  rput(b, 1, 5, 'road', 1);
  rlay(b, 0, 9, 'Kz', 1); rlay(b, 1, 9, 'U'); rlay(b, 2, 9, 'B'); rlay(b, 3, 9, 'B');
  rput(b, 1, 9, 'road', 0);
  gust(b, { dir: 1, from: { x: 0, y: 0 } });
  gust(b, { dir: 1, from: { x: 0, y: 5 } });
  gust(b, { dir: 1, from: { x: 0, y: 9 } });
  const m1 = b.get(2, 0).meeple, m2 = b.get(2, 5).meeple, m3 = b.get(2, 9).meeple;
  ok(m1 && b.get(2, 0).type.feats[m1.feat].type === 'road', 'a road for a road');
  ok(m3 && m3.feat != null && b.get(2, 9).type.feats[m3.feat].type !== 'road', 'or whatever the tile has');
  ok(m2 && m2.feat === null, 'on an Abbazia, nothing (raw engine)');
});

// --- Mainland and islands. ------------------------------------------------------
prove('land-mainland', (ok) => {
  const g = fresh(46);
  lay(g, 0, 0, 'Kpz');
  for (const x of [4, 5, 6]) lay(g, x, 0, 'B');
  lay(g, -5, -5, 'B');
  g.board.rebuild();
  const land = g.m.land();
  ok(land.main.length === 3 && land.main.every((c) => c.x >= 4), 'the biggest piece, Palazzo or not');
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
prove('land-tow', (ok) => {
  const g = fresh(48);
  lay(g, -1, 0, 'Kz', 1); lay(g, 0, 0, 'Kpz');
  for (const y of [1, 2, 3, 4]) lay(g, -1, y, 'B');   // the mainland
  lay(g, 3, 5, 'B');                        // an island
  lay(g, 8, -3, 'Kz');                      // one on the east edge
  lay(g, -3, 2, 'U', 1);                    // one that will come to rest against a field
  g.board.rebuild();
  blow(g, -1, 0, 1);
  ok(at(g, 2, 0)?.type.id === 'Kpz', 'the Palazzo moves, and blown adrift it is an island and goes on with them');
  ok(at(g, 4, 5) && !at(g, 3, 5), 'every island slides one square with it');
  ok(!at(g, 8, -3) && at(g, -8, -3)?.type.id === 'Kz' && g.m.lost === 0, 'towed off the east edge, on at the west');
  ok(!at(g, -2, 2) && !at(g, -3, 2), 'towed against an edge it does not match, it falls');
});

// --- Spheres. -------------------------------------------------------------------
prove('sphere-halves', (ok) => {
  ok(TILES.Kso.edges.includes('o') && edgesMeet('o', 'o') && !edgesMeet('o', 'f') && !edgesMeet('o', 'r') && !edgesMeet('o', 'c'), 'a half meets only a half');
  const g = fresh(49);
  lay(g, 0, 0, 'Kro', 2);
  ok(g.board.canPlace(0, 1, TILES.Kbo, 0) && g.board.canPlace(0, 1, TILES.Kyo, 0), 'of any colour');
});
prove('sphere-close', (ok) => {
  const g = fresh(50);
  lay(g, 0, 0, 'Kso', 2);                   // green, facing south
  for (const x of [-1, -2, -3]) lay(g, x, 0, 'B');   // on the mainland
  for (const x of [3, 4]) lay(g, x, 3, 'B');
  lay(g, 6, 6, 'DXg');
  g.board.rebuild();
  put(g, 3, 3, 'field', 0);
  put(g, 6, 6, 'city', 1);
  layHand(g, 'Kbo', 0, 1, 0);               // blue, facing north: the sphere closes
  ok(g.m.spheres === 1, 'a tile laid closes it');
  ok(g.players[0].score >= 1 && g.players[1].score >= 1, 'both halves fire: the farm and the city are paid');
  const before = g.players.map((p) => p.score);
  g.m.joinSferas();
  ok(g.m.spheres === 1 && g.players.every((p, i) => p.score === before[i]), 'a pair fires once');
  const h = fresh(51);
  lay(h, 0, 5, 'Kz', 1); lay(h, 1, 5, 'B'); lay(h, 2, 5, 'Kyo', 0);   // yellow facing north, the loose end
  for (const y of [6, 7]) lay(h, 0, y, 'B');
  lay(h, 3, 4, 'Kro', 2);                   // red facing south, where it lands
  h.board.rebuild();
  blow(h, 0, 5, 1);
  ok(h.m.spheres === 1 && h.m.hues.yellow === 1 && h.m.hues.red === 1, 'the wind can close one too');
});
prove('sphere-majority', (ok) => {
  const g = fresh(52);
  for (const x of [0, 1, 2]) lay(g, x, 0, 'DXg');
  g.board.rebuild();
  put(g, 0, 0, 'city', 0); put(g, 1, 0, 'city', 0); put(g, 2, 0, 'city', 1);
  g.m.fire('blue');
  ok(g.players[0].score === 3 && g.players[1].score === 0, 'the most followers');
  const h = fresh(53);
  for (const x of [0, 1]) lay(h, x, 0, 'DXg');
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
  lay(g, 0, 0, 'Kt'); lay(g, 1, 0, 'B'); lay(g, 2, 0, 'B'); lay(g, 3, 0, 'Kab'); lay(g, 4, 0, 'B');
  lay(g, 1, 1, 'B'); lay(g, 0, -1, 'B');
  g.board.rebuild();
  put(g, 0, 0, 'temple', 0);
  at(g, 3, 0).meeple = { player: 1, feat: null };
  g.m.fire('red');
  ok(g.players[0].score === 3, `a point a tile round the temple (${g.players[0].score})`);
  ok(g.players[1].score === 2, `and an Abbazia with somebody on it (${g.players[1].score})`);
});
prove('colour-yellow', (ok) => {
  const g = fresh(57);
  lay(g, -1, 0, 'U', 1); lay(g, 0, 0, 'Kpz'); lay(g, 1, 0, 'U', 1);
  g.board.rebuild();
  put(g, 1, 0, 'road', 0);
  g.m.fire('yellow');
  ok(g.players[0].score === 4, `three tiles and an open city (${g.players[0].score})`);
  const h = fresh(58);
  lay(h, -1, 0, 'U', 1); lay(h, 0, 0, 'Kpz'); lay(h, 1, 0, 'U', 1);
  lay(h, 0, -1, 'DEg', 2);                  // closes the Palazzo's city
  h.board.rebuild();
  put(h, 1, 0, 'road', 0);
  h.m.fire('yellow');
  ok(h.players[0].score === 5, `three tiles and a closed city (${h.players[0].score})`);
  const k = fresh(158);
  lay(k, 0, 0, 'DEg', 0); lay(k, 0, -1, 'DEt', 2);   // a city of two, closed all round
  lay(k, 1, 0, 'U', 1); lay(k, 2, 0, 'U', 1);        // a road east from its wall
  k.board.rebuild();
  put(k, 2, 0, 'road', 0);
  k.m.fire('yellow');
  ok(k.players[0].score === 4, `two tiles and the closed city through the gate (${k.players[0].score})`);
});

// --- Cities. --------------------------------------------------------------------
prove('city-districts', (ok) => {
  ok(Object.keys(DISTRICTS).join() === 'garden,temple,residential,industrial,trade', 'five kinds');
  for (const [kind, k] of Object.entries(DISTRICTS)) {
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
  ok(pay(['DXg', 'DXg', 'DXg']) === 3, 'one kind: a point a district');
  ok(pay(['DXg', 'DXt']) === 3, 'two kinds: plus 1');
  ok(pay(['DXg', 'DXt', 'DXr']) === 6, 'three kinds: plus 3');
  ok(pay(['DXg', 'DXt', 'DXr', 'DXi']) === 10, 'four kinds: plus 6');
  ok(pay(['DXg', 'DXt', 'DXr', 'DXi', 'DXm']) === 15, 'five kinds: plus 10');
});
prove('city-walled', (ok) => {
  const g = fresh(60);
  lay(g, 0, 0, 'DEg', 2); lay(g, 0, 1, 'DEg', 0);
  g.board.rebuild();
  put(g, 0, 0, 'city', 0);
  ok(g.board.featureOf(0, 0, 0).open === 0, 'closed all round');
  g.m.fire('blue');
  ok(g.players[0].score === 4, `two districts of one kind, doubled (${g.players[0].score})`);
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
  lay(g, -1, 0, 'Kab'); lay(g, 0, 0, 'DIg'); lay(g, 1, 0, 'DIt'); lay(g, 2, 0, 'Kab');
  lay(g, 2, 1, 'Kz'); lay(g, -1, 1, 'B'); lay(g, -1, 2, 'B');
  g.board.rebuild();
  put(g, 0, 0, 'city', 0);
  g.m.settle(0);
  ok(g.board.featureOf(0, 0, 0).scored, 'closed by its Abbazias');
  blow(g, 2, 1, 0);                         // the east Abbazia blows north, out of the way
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

// --- Your cloud. ----------------------------------------------------------------
prove('cloud-start', (ok) => {
  const g = new Game({ mode: 'soffiando', players: 3, seed: 63 });
  ok(g.m.clouds.length === 3 && g.m.clouds.every((c, i) => c.player === i && c.x == null), 'one each, in hand');
  ok(!new Game({ mode: 'soffiando', players: 2, seed: 63, options: { clouds: false } }).m.clouds.length, 'none with clouds switched off');
});
prove('cloud-set', (ok) => {
  const g = fresh(64);
  for (const x of [0, 1, 2]) lay(g, x, 0, 'U');
  lay(g, 8, 5, 'B');
  g.board.rebuild();
  g.phase = 'meeple';
  const t = g.m.cloudTargets();
  const b = SPEC.bounds;
  ok(t.every((q) => !at(g, q.x, q.y) && q.x >= b.minX && q.x <= b.maxX && q.y >= b.minY && q.y <= b.maxY), 'on open sky, a square of the map');
  ok(t.every((q) => [[0, -1], [1, 0], [0, 1], [-1, 0]].some(([dx, dy]) => at(g, q.x + dx, q.y + dy))), 'beside the country');
  ok(t.some((q) => q.x === -8 && q.y === 5), 'across the seam too');
  ok(g.m.beginBlow(), 'instead of claiming');
  while (g.m.myCloud().dir !== 1) g.rotate(1);
  ok(g.cellClick(-1, 0) && at(g, 3, 0) && !at(g, 2, 0), 'facing any way, it blows as it lands');
  ok(g.current === 1, 'and your turn ends');
  ok(!g.m.cloudTargets().some((q) => q.x === -1 && q.y === 0), 'not where a cloud is');
});
prove('cloud-zephyr', (ok) => {
  let g = fresh(65);
  lay(g, -2, 0, 'Kz', 1); lay(g, 0, 0, 'B'); lay(g, 1, 0, 'B');
  for (const y of [1, 2, 3]) lay(g, -2, y, 'B');
  g.board.rebuild();
  Object.assign(g.m.clouds[1], { x: -1, y: 0, dir: 1 });
  blow(g, -2, 0, 1);
  ok(at(g, 2, 0) && at(g, 3, 0) && !at(g, 0, 0), 'absorbed like a zephyr');
  g = fresh(66);
  lay(g, -2, 0, 'Kz', 1); lay(g, -1, 1, 'B'); lay(g, -1, 2, 'B');
  for (const y of [1, 2, 3]) lay(g, -2, y, 'B');
  g.board.rebuild();
  Object.assign(g.m.clouds[1], { x: -1, y: 0, dir: 2 });
  blow(g, -2, 0, 1);
  ok(at(g, -1, 3) && at(g, -1, 4) && !at(g, -1, 1), 'woken like a zephyr, a power harder');
  g = fresh(67);
  lay(g, 0, 0, 'Kz', 1); lay(g, 1, 0, 'B'); lay(g, 2, 0, 'B');
  for (const y of [1, 2, 3]) lay(g, 0, y, 'B');
  g.board.rebuild();
  g.phase = 'meeple'; g.m.beginBlow();
  while (g.m.myCloud().dir !== 1) g.rotate(1);
  g.cellClick(-1, 0);
  ok(at(g, 3, 0) && at(g, 4, 0) && !at(g, 1, 0), 'its own gust hardened by the zephyr it crosses');
});
prove('cloud-fixed', (ok) => {
  const g = fresh(68);
  lay(g, 0, 0, 'Kz', 1); lay(g, 1, 0, 'B');
  for (const y of [1, 2]) lay(g, 0, y, 'B');
  g.board.rebuild();
  Object.assign(g.m.clouds[1], { x: 2, y: 0, dir: 1 });
  blow(g, 0, 0, 1);
  ok(g.m.clouds[1].x === 2 && g.m.clouds[1].y === 0, 'the wind never moves it');
  ok(at(g, 2, 0), 'a tile slides under it');
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
  lay(g, 0, -1, 'U'); lay(g, 0, -2, 'U'); lay(g, 0, -4, 'Kpz');
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
  ok(!at(g, 0, -2).meeple && g.players[0].meeples === 8, 'it goes home');
  const t = g.meepleOptions().filter((o) => o.flying);
  ok(t.length && t.every((o) => o.y < -2), 'and may be put down further along');
  g.skipMeeple();
  ok(g.current === 1, 'or not');
});

// --- The end of the season. -----------------------------------------------------
prove('end-when', (ok) => {
  let g = fresh(74);
  lay(g, 0, 0, 'B');
  g.m.laid = 96;
  g.phase = 'meeple'; g.skipMeeple();
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
  lay(g, 0, 5, 'Kt'); lay(g, 1, 5, 'B'); lay(g, 2, 5, 'DXg'); lay(g, 3, 5, 'DXg');
  lay(g, 0, 8, 'U'); lay(g, 0, 9, 'U');
  g.board.rebuild();
  put(g, 0, 0, 'field', 0); put(g, 0, 5, 'temple', 1); put(g, 2, 5, 'city', 0); put(g, 0, 8, 'road', 1);
  const lines = said(g, () => g.finish());
  ok(lines.some((l) => /^Farm/.test(l)) && lines.some((l) => /temple/.test(l)) && lines.some((l) => /city/.test(l)) && lines.some((l) => /^Road/.test(l)), 'every colour fires');
  ok(lines.findIndex((l) => /island|Nobody is standing/.test(l)) < lines.findIndex((l) => /every colour|last time/.test(l)), 'after the islands are counted');
});

// --- Options. -------------------------------------------------------------------
prove('option-balena', (ok) => {
  ok(!new Game({ mode: 'soffiando', players: 2, seed: 80 }).m.balena, 'off unless switched on');
  const g = fresh(81, { balena: true });
  lay(g, 0, 0, 'Kz', 1); lay(g, 1, 0, 'B'); lay(g, 2, 0, 'B');
  for (const y of [1, 2]) lay(g, 0, y, 'B');
  g.board.rebuild();
  g.m.balena = { x: 2, y: 0 }; g.m.settleBalena();
  blow(g, 0, 0, 1);
  ok(at(g, 2, 0)?.balena && !at(g, 3, 0), 'its tile does not move, and the gust does not pass');
  g.phase = 'meeple';
  ok(g.m.canSwim() && g.m.beginSwim() && g.cellClick(0, 2) && g.m.balena.y === 2, 'sent to any tile instead of claiming');
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
