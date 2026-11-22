// ---------------------------------------------------------------------------
// Giardino: the daily walled garden.
//
// Timothy, 2026-11-22: "so i want, based on stara, to have a mode that's
// actually like a little walled garden, and each tile is a plant, and the
// mechanics are based off how plants actually need to be planted in a
// polyculture farm. things like irrigations, some plants liking other plants,
// some not liking others, and potentially something where every tile places
// progresses time, so plants grow and change as we go. this new mode will be
// called Giardino."
//
// From Starà it keeps the square, the wall round it, the daily deal, the
// solitaire, the hand and the table. Everything else is the garden's own,
// and each rule is one thing a real kitchen garden does:
//
//   THE FOUNTAIN is the middle square, with a rill (a narrow stone water
//   channel, as in the Moorish and Persian four-fold gardens) running out of
//   each side. A rill must meet a rill; soil meets soil; the wall takes
//   either, and a rill ends at it.
//   WATER runs in every rill joined to the fountain. A plant is WATERED if
//   running water is on its square or on one of the four squares beside it
//   (water seeps sideways through soil a little way, no further).
//   THIRST. A thirsty plant grows only in the weeks it is watered. A plant
//   that likes it dry (rosemary: "wet feet" rot it) grows only in the weeks
//   it is not. A hardy one grows either way.
//   TIME. Every tile laid is a week. At the end of each week every plant
//   whose water is right grows a week, and a plant that has grown the weeks
//   on its seed packet ripens and is picked there and then.
//   COMPANIONS. A plant picked pays its yield, +1 for every friend in the
//   eight squares round it and -1 for every foe, never below 0. Friends and
//   foes are pairs, so it works both ways.
//   ANNUALS are picked once and then left to go to seed, standing (and
//   counting as company) until the frost. PERENNIALS (rosemary, the fig) are
//   picked again every few weeks for the rest of the season.
//   THE FROST. The season ends when the garden is full or nothing left
//   fits. Whatever has not ripened by then is lost.
//   NOTHING IS WASTED. You draw the first plant in the pile that has
//   somewhere to go; the ones passed over stay on top until they fit.
//
// Calls of Claude's, each with why (MODES.md section 15):
//   - a hand of two, fixed, because when to plant is half the game and a
//     single tile gives you no say in it;
//   - the fig, one to a deal and dealt in the first third, like Starà's keep:
//     a tree planted late never fruits, so a fig you see after week 16 is a
//     fig you can do nothing with;
//   - watered reaches the four squares beside a running rill, not the eight:
//     water seeps through soil, it does not cut corners;
//   - friends and foes are counted when the plant is picked, not when it is
//     sown, so a garden can still be improved round a plant that is growing;
//   - a picked annual stays in its bed, gone to seed (a gardener leaves some
//     to save seed), and still counts as company: a bed picked bare would
//     leave the garden straw by midsummer, and a neighbour that vanishes the
//     week it ripens is a rule nobody can see coming;
//   - the plants and their pairings are the commonly published companion
//     charts, and the why of each is in PAIRS below. Some are well studied
//     (the Three Sisters, alliums against carrot fly, fennel's allelopathy),
//     some are gardeners' lore; the mode does not pretend otherwise.
//
// Pure, solo, the same deal for everyone on the same local date. The look is
// src/garden.js; the interface is Starà's (src/stara-ui.js).
// ---------------------------------------------------------------------------

import { Mode } from './mode.js';
import { registerTiles, TILES, N, E, S, W, SIDE_STEP } from '../tiles.js';

/** The first day there was a Giardino, so day numbers start at 1. */
const FIRST_DAY = Date.UTC(2026, 10, 22);

/** The fountain's tile id. */
export const FOUNTAIN = 'FONTE';

/**
 * The plants. `water` is thirsty, hardy or dry; `weeks` the weeks to ripen
 * (a seed packet's "days to maturity", in turns); `again` the weeks between
 * pickings for a perennial; `yield` what a picking pays before its company;
 * `deck` how many come, by rill shape (see SHAPES). The weeks keep their real
 * order: lettuce and basil are quick, the Three Sisters and the brassicas
 * slow, a fig tree slowest of all.
 */
export const PLANTS = {
  tomato: { name: 'Tomato', water: 'thirsty', weeks: 10, yield: 3, deck: { I: 2, L: 2, U: 1, 0: 1 } },
  basil: { name: 'Basil', water: 'hardy', weeks: 4, yield: 1, deck: { 0: 3, I: 1, L: 1 } },
  bean: { name: 'Bean', water: 'hardy', weeks: 7, yield: 2, deck: { 0: 4, I: 1, L: 1, T: 1 } },
  corn: { name: 'Corn', water: 'thirsty', weeks: 11, yield: 3, deck: { I: 2, L: 1, T: 1, 0: 2 } },
  squash: { name: 'Squash', water: 'thirsty', weeks: 11, yield: 3, deck: { L: 2, U: 1, I: 1, 0: 2 } },
  onion: { name: 'Onion', water: 'hardy', weeks: 9, yield: 2, deck: { 0: 4, I: 1, L: 1 } },
  carrot: { name: 'Carrot', water: 'hardy', weeks: 8, yield: 2, deck: { 0: 4, I: 1, L: 1, U: 1 } },
  cabbage: { name: 'Cabbage', water: 'thirsty', weeks: 10, yield: 3, deck: { I: 1, L: 1, T: 1, U: 1, 0: 1 } },
  lettuce: { name: 'Lettuce', water: 'thirsty', weeks: 4, yield: 1, deck: { U: 2, I: 2, L: 1, X: 1, 0: 1 } },
  rosemary: { name: 'Rosemary', water: 'dry', weeks: 6, again: 6, yield: 1, deck: { 0: 5 } },
  marigold: { name: 'Marigold', water: 'hardy', weeks: 5, yield: 1, deck: { 0: 3, I: 1, L: 1, T: 1 } },
  fennel: { name: 'Fennel', water: 'hardy', weeks: 8, yield: 5, deck: { 0: 4 } },
  fig: { name: 'Fig tree', water: 'hardy', weeks: 14, again: 6, yield: 4, deck: { 0: 1 } },
};
export const PLANT_IDS = Object.keys(PLANTS);

/** What each water need means, for the seed packet. */
export const WATER = {
  thirsty: 'grows only while watered',
  hardy: 'grows wet or dry',
  dry: 'grows only while dry',
};

/**
 * The rill on a tile, by shape, in the tile's own frame: none, a stub ending
 * in a little basin, straight through, a bend, a tee and a cross. One rill
 * per tile, however many sides it reaches: water branches, it does not stop
 * at a junction the way a road does.
 */
export const SHAPES = { 0: [], U: [N], I: [N, S], L: [N, E], T: [E, S, W], X: [N, E, S, W] };

const VEGETABLES = ['tomato', 'basil', 'bean', 'corn', 'squash', 'onion', 'carrot', 'cabbage', 'lettuce'];

/**
 * Who likes whom, in pairs, both ways, each with the reason a gardener gives.
 * FOE pairs are the same with a minus.
 */
export const FRIENDS = [
  ['corn', 'bean', 'the beans climb the corn and feed the soil it is hungry for (the Three Sisters)'],
  ['corn', 'squash', 'the squash leaves shade the ground under the corn and keep it damp (the Three Sisters)'],
  ['bean', 'squash', 'the beans feed the soil, the squash keeps it cool (the Three Sisters)'],
  ['tomato', 'basil', 'basil is said to keep whitefly and thrips off tomatoes'],
  ['tomato', 'carrot', 'carrots loosen the soil round tomato roots ("Carrots Love Tomatoes")'],
  ['tomato', 'onion', 'the smell of onions hides tomatoes from their pests'],
  ['carrot', 'onion', 'onions hide carrots from the carrot fly, and carrots hide onions from the onion fly'],
  ['carrot', 'lettuce', 'shallow lettuce and deep carrots share a bed without competing'],
  ['carrot', 'bean', 'beans feed the soil the carrots grow in'],
  ['carrot', 'rosemary', 'rosemary is said to keep the carrot fly away'],
  ['lettuce', 'onion', 'onions keep aphids off lettuce'],
  ['cabbage', 'onion', 'onions confuse the cabbage white butterfly'],
  ['cabbage', 'rosemary', 'rosemary is said to keep the cabbage moth away'],
  ['fig', 'lettuce', 'lettuce likes the fig\'s dappled shade, and bolts less under it'],
  ...VEGETABLES.map((v) => ['marigold', v, 'marigolds draw hoverflies that eat aphids, and their roots trouble nematodes']),
];
export const FOES = [
  ['tomato', 'corn', 'the same caterpillar eats both (the corn earworm is the tomato fruitworm)'],
  ['tomato', 'cabbage', 'tomatoes and cabbages stunt each other'],
  ['bean', 'onion', 'onions hold back the bacteria a bean feeds the soil with'],
  ...VEGETABLES.map((v) => ['fennel', v, 'fennel poisons the soil round it for almost everything (allelopathy)']),
];

const RELATION = new Map();
for (const [a, b] of FRIENDS) { RELATION.set(`${a}|${b}`, 1); RELATION.set(`${b}|${a}`, 1); }
for (const [a, b] of FOES) { RELATION.set(`${a}|${b}`, -1); RELATION.set(`${b}|${a}`, -1); }

/** +1 friends, -1 foes, 0 neither. */
export const relation = (a, b) => RELATION.get(`${a}|${b}`) || 0;

/** A plant's friends and foes, by id. */
export const friendsOf = (k) => PLANT_IDS.filter((o) => relation(k, o) > 0);
export const foesOf = (k) => PLANT_IDS.filter((o) => relation(k, o) < 0);

// --- the tiles ----------------------------------------------------------------

const rill = (sides) => ({ type: 'rill', sides });

/** The fountain, the first square: a rill out of every side. */
const FOUNTAIN_TILE = { id: FOUNTAIN, n: 0, group: 'giardino', name: 'Fountain', fountain: true, feats: [rill([N, E, S, W])] };

/** Every plant tile, one type per plant and rill shape. */
export const GARDEN_TILES = [FOUNTAIN_TILE];
for (const [kind, p] of Object.entries(PLANTS)) {
  for (const [shape, n] of Object.entries(p.deck)) {
    GARDEN_TILES.push({
      id: `g-${kind}-${shape}`, n, group: 'giardino', name: `${p.name}${shape === '0' ? '' : ', rill'}`,
      plant: kind, shape, feats: SHAPES[shape].length ? [rill(SHAPES[shape])] : [],
    });
  }
}
registerTiles(GARDEN_TILES);

/** How many tiles a Giardino deal has: 71 plants and the fountain, 72. */
export const DECK_SIZE = GARDEN_TILES.reduce((n, t) => n + t.n, 0);

// --- the day ----------------------------------------------------------------

/** Today, where you are: its number, its date and the seed of its deal. */
export function giardinoDay(now = new Date()) {
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  const n = Math.round((Date.UTC(y, m, d) - FIRST_DAY) / 86400000) + 1;
  const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const key = `giardino:${iso}`;
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
  return { n, iso, seed: h >>> 0 };
}

// --- water, as a question any board can be asked ------------------------------

const keyOf = (x, y) => `${x},${y}`;

/** The squares with running water on them: every rill joined to the fountain. */
export function runningWater(board) {
  const out = new Set();
  const src = board.get(0, 0);
  if (!src?.type.fountain) return out;
  const spring = board.featureOf(0, 0, 0);
  for (const cell of board.cells.values()) {
    cell.type.feats.forEach((f, i) => {
      if (f.type === 'rill' && board.featureOf(cell.x, cell.y, i) === spring) out.add(keyOf(cell.x, cell.y));
    });
  }
  return out;
}

/** Is (x, y) watered: running water on it or on a square beside it? */
export function isWatered(running, x, y) {
  if (running.has(keyOf(x, y))) return true;
  return SIDE_STEP.some(([dx, dy]) => running.has(keyOf(x + dx, y + dy)));
}

/** Does a plant with this need grow on a square watered or not? */
export const thrives = (need, watered) => (need === 'thirsty' ? watered : need === 'dry' ? !watered : true);

/** The eight squares round (x, y). */
function* around(x, y) {
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (dx || dy) yield [x + dx, y + dy];
}

/** What each tally is called on the end card, in the order it is listed. */
export const GIARDINO_KINDS = [
  ['harvest', 'Harvests'], ['friends', 'Friends'], ['foes', 'Foes'],
];

// --- the mode ----------------------------------------------------------------

export class Giardino extends Mode {
  get side() { return this.spec.side; }
  get squares() { return this.side * this.side; }

  /** Every plant, shuffled, and the fig dealt somewhere in the first third. */
  deck() {
    const rng = this.game.rng;
    const deck = [];
    for (const t of GARDEN_TILES) {
      if (t.id === FOUNTAIN || t.plant === 'fig') continue;
      for (let i = 0; i < t.n; i++) deck.push(t.id);
    }
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    // The pile is dealt from the END, so "within the first k" is k from the end.
    const k = 1 + Math.floor(rng() * Math.floor(this.squares / 3));
    deck.splice(deck.length - k + 1, 0, 'g-fig-0');
    return deck;
  }

  seeds() { return [{ x: 0, y: 0, id: FOUNTAIN, rot: 0 }]; }

  setup() {
    this.day = giardinoDay();
    this.tally = Object.fromEntries(GIARDINO_KINDS.map(([k]) => [k, 0]));
    this.hand = [];
    this.sel = 0;
    this.week = 0;
    /** The beds, by square: {kind, grown, picks, spent, watered, sown}. */
    this.beds = new Map();
    this.picked = 0;
    this.lost = [];
    this.running = runningWater(this.game.board);
  }

  /** The hand: two tiles, always (Claude's call: when to sow is half the game). */
  get handSize() { return 2; }

  /** A tile's plant, by name, for the log. */
  nameOf(id) { const t = TILES[id]; return t?.plant ? PLANTS[t.plant].name.toLowerCase() : id; }

  /**
   * Fill the hand. NOTHING IS SET ASIDE (Claude's call): you draw the first
   * plant from the top of the pile that has somewhere to go, and the ones
   * passed over stay on top, to come up as soon as they fit. A plant in hand
   * that no longer fits goes back on top of the pile the same way. Without
   * it the fountain's four rills turned away every plant without a rill in
   * the opening, the fig among them, one deal in five.
   */
  drawNext() {
    const g = this.game;
    const fits = (id) => g.placeableNow(TILES[id]);
    for (let i = this.hand.length - 1; i >= 0; i--) {
      if (fits(this.hand[i])) continue;
      g.deck.push(...this.hand.splice(i, 1));
    }
    let from = g.deck.length - 1;
    while (this.hand.length < this.handSize && from >= 0) {
      if (fits(g.deck[from])) this.hand.push(...g.deck.splice(from, 1));
      from--;
    }
    if (!this.hand.length || g.board.size >= this.squares) return g.finish();
    this.sel = Math.max(0, Math.min(this.sel, this.hand.length - 1));
    g.offer(this.hand[this.sel]);
  }

  select(i) {
    const g = this.game;
    if (g.phase !== 'place' || i < 0 || i >= this.hand.length || i === this.sel) return false;
    this.sel = i;
    g.offer(this.hand[i]);
    return true;
  }

  signature() { return `${this.hand.join('.')}/${this.sel}/${this.week}`; }

  finalFarms = false;

  anythingLeft() {
    return (this.hand.length > 0 || this.game.deck.length > 0) && this.game.board.size < this.squares;
  }

  /** A rill that closes is a finished channel: pleasant, and worth nothing. */
  onClosed() {}

  /** The tile leaves the hand, the seed goes in, and a week goes by. */
  afterPlace(cell) {
    this.hand.splice(this.sel, 1);
    if (cell.type.plant) {
      this.beds.set(keyOf(cell.x, cell.y), {
        kind: cell.type.plant, grown: 0, picks: 0, spent: false, watered: false, sown: this.week + 1,
      });
    }
    this.passWeek();
    return null;
  }

  /** The bed at (x, y), growing or gone to seed: either is company. */
  living(x, y) {
    return this.beds.get(keyOf(x, y)) || null;
  }

  /** The friends and foes growing round (x, y) for a plant of `kind`. */
  company(kind, x, y) {
    let friends = 0, foes = 0;
    for (const [ax, ay] of around(x, y)) {
      const b = this.living(ax, ay);
      if (!b) continue;
      const r = relation(kind, b.kind);
      if (r > 0) friends++; else if (r < 0) foes++;
    }
    return { friends, foes };
  }

  /** How many weeks a bed still needs to its next picking. */
  weeksToGo(b) {
    const p = PLANTS[b.kind];
    return p.weeks + b.picks * (p.again || 0) - b.grown;
  }

  /**
   * THE WEEK. Water runs; every bed whose water is right grows; and every
   * bed that has grown its weeks is picked, all at once, each counting the
   * company it had before any of this week's were picked.
   */
  passWeek() {
    const g = this.game;
    this.week++;
    this.running = runningWater(g.board);
    const ripe = [];
    for (const [k, b] of this.beds) {
      if (b.spent) continue;
      const [x, y] = k.split(',').map(Number);
      b.watered = isWatered(this.running, x, y);
      if (thrives(PLANTS[b.kind].water, b.watered)) b.grown++;
      if (this.weeksToGo(b) <= 0) ripe.push([x, y, b]);
    }
    const pay = ripe.map(([x, y, b]) => [x, y, b, this.company(b.kind, x, y)]);
    for (const [x, y, b, { friends, foes }] of pay) {
      const p = PLANTS[b.kind];
      const pts = Math.max(0, p.yield + friends - foes);
      b.picks++;
      this.picked++;
      if (!p.again) b.spent = true;
      // The tally keeps the parts: what it yields, what friends add, what foes
      // take (never more than there was to take).
      const taken = Math.min(foes, p.yield + friends);
      this.tally.harvest += p.yield;
      this.tally.friends += friends;
      this.tally.foes -= taken;
      g.players[0].score += pts;
      const company = [friends && `${friends} friend${friends > 1 ? 's' : ''}`, foes && `${foes} foe${foes > 1 ? 's' : ''}`].filter(Boolean).join(', ');
      g.say(`Week ${this.week}: the ${p.name.toLowerCase()} is picked${company ? ` (${company})` : ''} → +${pts}`);
      if (pts) g.emit('score', { points: pts, players: [0], at: { x: x + 0.5, y: y + 0.5 } });
    }
  }

  /** What is still green is lost to the frost. */
  finish() {
    const g = this.game;
    this.lost = [];
    for (const [k, b] of this.beds) {
      if (b.spent || b.picks) continue;
      this.lost.push(k);
    }
    const lost = this.lost.length;
    if (lost) g.say(`The first frost: ${lost} plant${lost > 1 ? 's' : ''} still green, lost.`);
    g.say(`Giardino No. ${this.day.n}: ${g.players[0].score} points, ${this.picked} pickings in ${this.week} weeks.`);
  }

  // --- what the picture and the interface ask -----------------------------------

  /**
   * How a square looks this week, for garden.js: the plant's stage (0 sown
   * to 4 ripe, 5 picked bare), whether its rill runs, and whether its soil is
   * watered. A string, because it is a sprite's cache key.
   */
  lookOf(cell) {
    const k = keyOf(cell.x, cell.y);
    const run = this.running?.has(k) ? 'r' : '';
    if (!cell.type.plant) return `f${run}`;
    const b = this.beds.get(k);
    if (!b) return `0${run}`;
    const wet = isWatered(this.running, cell.x, cell.y) ? 'w' : '';
    if (b.spent) return `5${run}${wet}`;
    const p = PLANTS[b.kind];
    // A perennial once picked stands grown, and fruits again before its next.
    const span = b.picks ? (p.again || 1) : p.weeks;
    const into = b.picks ? b.grown - p.weeks - (b.picks - 1) * p.again : b.grown;
    const f = Math.max(0, Math.min(1, into / span));
    const stage = b.picks ? (f >= 0.6 ? 4 : 3) : f >= 1 ? 4 : f >= 0.7 ? 3 : f >= 0.4 ? 2 : f > 0 ? 1 : 0;
    return `${stage}${run}${wet}`;
  }

  /**
   * How the tile in hand would look sown at (x, y) turned `rot`: whether its
   * rill would run and its soil be watered. Tried on the board and taken off
   * again, once per square and turn (the staged tile is drawn every frame).
   */
  previewLook(x, y, rot) {
    const g = this.game, type = g.tile;
    if (!type?.plant) return null;
    const key = `${type.id}|${x},${y}|${rot}|${g.board.size}`;
    if (this.previewKey === key) return this.previewValue;
    let look = '0';
    if (g.board.canPlace(x, y, type, rot, g.placeOpts())) {
      g.board.place(x, y, type, rot, { owner: 0 });
      const running = runningWater(g.board);
      g.board.remove(x, y, { quiet: true });
      g.board.rebuild();
      look = `0${running.has(keyOf(x, y)) ? 'r' : ''}${isWatered(running, x, y) ? 'w' : ''}`;
    }
    this.previewKey = key;
    this.previewValue = look;
    return look;
  }

  /** The seed packet for a tile: what it is, what it needs, who it likes. */
  packet(id) {
    const t = TILES[id];
    if (!t?.plant) return null;
    const p = PLANTS[t.plant];
    return {
      kind: t.plant, name: p.name, water: p.water, need: WATER[p.water], weeks: p.weeks, again: p.again || 0,
      yield: p.yield, friends: friendsOf(t.plant), foes: foesOf(t.plant),
    };
  }

  /** Round (x, y), for a plant of `kind`: each growing neighbour's +1 or -1. */
  companyMarks(kind, x, y) {
    const out = [];
    for (const [ax, ay] of around(x, y)) {
      const b = this.living(ax, ay);
      const r = b ? relation(kind, b.kind) : 0;
      if (r) out.push({ x: ax, y: ay, r });
    }
    return out;
  }

  // --- advice for the computer player -----------------------------------------

  /**
   * What sowing these cells is worth: the company it keeps and gives, whether
   * its water is right and stays right for its neighbours, and whether it has
   * the weeks left to ripen at all.
   */
  botPlaceBonus(laid) {
    const board = this.game.board;
    const running = runningWater(board);
    const left = this.squares - board.size;
    let v = 0;
    for (const cell of laid) {
      const kind = cell.type.plant;
      if (!kind) continue;
      const p = PLANTS[kind];
      const { friends, foes } = this.company(kind, cell.x, cell.y);
      v += 1.6 * (friends - foes);
      const wet = isWatered(running, cell.x, cell.y);
      v += thrives(p.water, wet) ? 1.5 : -2;
      if (p.weeks <= left) v += p.yield * (p.again ? 1 + Math.floor((left - p.weeks) / p.again) : 1);
      else v -= 1;
      // What this square's water does to the beds already growing round it.
      for (const [k, b] of this.beds) {
        if (b.spent) continue;
        const [x, y] = k.split(',').map(Number);
        if (Math.abs(x - cell.x) + Math.abs(y - cell.y) > 2) continue;
        const now = isWatered(running, x, y);
        if (now !== b.watered) v += thrives(PLANTS[b.kind].water, now) ? 1 : -1.5;
      }
    }
    return v;
  }

  /** Hold up the tile in hand that has the best square, before the bot looks. */
  botAction() {
    const g = this.game;
    if (g.phase !== 'place' || this.hand.length < 2) return false;
    let best = null;
    this.hand.forEach((id, i) => {
      const type = TILES[id];
      for (const s of g.board.legalPlacements(type, g.placeOpts())) {
        const cell = g.board.place(s.x, s.y, type, s.rot, { owner: 0 });
        const v = this.botPlaceBonus([cell]);
        g.board.remove(s.x, s.y, { quiet: true });
        g.board.rebuild();
        if (!best || v > best.v) best = { i, v };
      }
    });
    if (best && best.i !== this.sel) this.select(best.i);
    return false;
  }

  // --- the workshop's panel ---------------------------------------------------

  status() { return `No. ${this.day.n} · week ${this.week} · ${this.game.board.size}/${this.squares} beds`; }

  panel() {
    const g = this.game, p = g.players[0];
    return `
      <div class="advTop"><span>Giardino No. ${this.day.n}</span><span>Score <b>${p.score}</b></span></div>
      <div class="advTop"><span>Week ${this.week}, ${g.board.size}/${this.squares} beds</span><span>${this.hand.length} in hand, ${g.deck.length} in the pile</span></div>
      <p class="hint">${this.spec.hint}</p>`;
  }
}

Giardino.spec = {
  id: 'giardino',
  name: 'Giardino 7×7 (daily)',
  title: 'Giardino',
  Mode: Giardino,
  side: 7,
  groups: ['base'],
  meeples: false,
  solo: true,
  pure: true,
  market: false,
  table: true,
  walled: true,
  // A garden wall round the square, not a castle (garden.js).
  garden: true,
  inked: true,
  antique: true,
  seedFor: () => giardinoDay().seed,
  playerName: () => 'You',
  bounds: { minX: -3, maxX: 3, minY: -3, maxY: 3 },
  opening: "Today's garden, 7×7. Sow it well before the frost.",
  hint: 'Daily and solo, a 7×7 walled garden round a fountain. Every tile is a plant, and every tile laid is a week. Rills joined to the fountain run with water and water the squares beside them: thirsty plants grow only while watered, rosemary only while dry. A plant that has grown its weeks is picked: its yield, +1 for every friend round it, −1 for every foe. Whatever is still green at the frost is lost.',
};
