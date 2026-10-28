// ---------------------------------------------------------------------------
// Soffiando — the cloud kingdom, where the board itself is weather.
//
// You lay tiles and claim features as in Carcassonne, and then you blow the
// country about underneath everybody. The rulebook (soffiando-rulebook.js) is
// the short version of all of this, every rule tested on this engine;
// MODES.md has the history and the measurements.
//
// EVERY TILE HAS TWO FACES (Timothy, 2026-10-27: "make tiles double sided,
// and you choose what side to play when you place them"): 72 tiles, 144
// faces, of the same structure on both ("Both sides of all the tiles should
// generally have like the same type of structure, just with some options
// changed"): a district onto a district of its shape and another kind, a
// road onto a road of its shape, the zephyrs, windmills and flying machines
// on either ("specials can be on city faces too"), a tower half onto a tower half of another
// colour (2026-10-28: "tiles that have towers on them should have different
// colored towers on the other side"), an Abbazia onto an Abbazia ("the
// abbazias tiles should have abbazias on both sides"), and the sun's
// quarters onto the black hole's. Windmills,
// flying machines and windvanes ride on roads ("windmills should just be on
// different kinds of tiles"). You turn the
// tile over as well as round (the host's `flipTile`, F); one whose front
// fits nowhere is dealt back up. The deck holds them as "front|back"
// (soffiando-deck.js), and so does every tile on the board (`cell.key`), so
// one that falls or is swallowed goes back two-faced.
//
// A TURN is three steps (Timothy, 2026-10-27: "you have to use your zephyr
// every turn in addition to placing a tile and placing a meeple"): lay a
// tile, claim on it or not, and then BLOW. Every player has a zephyr of their
// own. You put it against any tile, on any side, and that tile and every tile
// touching in front of it, up to the first gap, go one square, if there are
// no more of them than your PUSH POWER: 1, plus 1 for every Abbazia on the
// board, the same for everybody ("push power ... is based on how many
// abbazzias are present on the board"; "both players start with 1"). A
// zephyr tile the blow pushes then pushes in its turn, the way it points, at
// its own push plus yours, and what that pushes chains on ("if any of the
// pushed tiles had a zephyr, they then push tiles as well ... and it chains
// as it goes"). (The gust cannon, which fired what was in front of it, went
// on 2026-10-28.) A zephyr tile does nothing
// when it is laid: the blow is the only wind there is (wind.js `blow`).
//
// NO CUTTING (2026-10-28): your zephyr blows from open sky, never from
// between two tiles. AN ANCHOR, a quarter of a big tower or a half of a
// closed tower, holds its lane still from the zephyr up to it, and what is
// past it is pushed ("have an anchor like a tower keep everything in your
// lane from moving, but only up until the tower, stuff past it still moves").
// A push too heavy to move moves no tile, but blows the followers on the
// tiles it reaches a square downwind ("you can blow on an area even if you
// can't move any tiles, and it will still move meeple"), OVER CITY WALLS
// since 2026-10-28 ("meeple can be blown over walls now, to allow for
// placement into/out of cities and abbazias"; walls had held followers,
// "castle walls protect meeple"), and into a city somebody holds. Towers held tiles too ("towers/sfera protect tiles")
// until later the same day ("let a blow move tower halves"): now only the big
// tower's quarters hold, and a push can close a tower.
//
// A TILE THAT NO LONGER FITS MOVES ON. One a blow moved that comes to rest
// with any edge against country it cannot meet slides on, the way the player
// whose turn it is chooses, to the first empty square where it fits; only one
// with every way blocked falls, back on top of the deck, and the player whose
// turn it is lays one more tile. Until it moves, the seam it does not meet
// joins nothing (Board.cracks).
//
// TOWERS ARE THE SCORING (sferas until 2026-10-27). A tower half meets only a
// half of its own colour ("each color has to go to each color"), and the two
// close a tower, laid or pushed together, which fires its colour once: a
// scoring pass over the whole board, paying whoever holds the most of each
// feature of that kind.
//
//   GREEN  the land: 5 to whoever has the most followers on each piece of
//          country, the mainland and every island alike (no farmers)
//   BLUE   the cities: a point a district open, 2 closed, a garden a point
//          more, a keep doubled for every piece built on it; closed, and in
//          the last scoring, 5 for one of every kind and a trade district 2
//          for every road at a gate
//   RED    the Abbazias: one a follower HOLDS (flown or blown onto it) pays
//          its holder a point for every tile in the eight squares round it,
//          like a cloister; one nobody holds pays nobody
//   YELLOW the roads: a point a tile, plus 1 for each open city a road
//          reaches and 2 for each closed one
//
// THE BIG TOWERS are the sun and the black hole: eight tiles with a sun
// quarter on one face and a black hole quarter on the other, walled on their
// outer sides, four closing a 2x2. A game makes one of each. The first
// quarter laid decides which comes first, and where; the rest of its 2x2 is
// kept for the other three, which must go into it, so once begun it always
// closes ("so there completion is inevitable"; `judgeBig`). Then the next
// quarter begins the other ("if a sun is already made then you have to make
// a black hole, and vice versa"). The sun fires every colour, and the black
// hole swallows the twelve squares round it, shuffled back into the deck,
// sparing the sun.
//
// NOBODY COMES HOME (2026-10-28: "followers no longer come back in general,
// even from roads"): a follower stays where it is and is paid by every tower
// of its colour, which is a gamble in a city: a closed city the wind blows
// open costs its holders a point a district ("you're kind of testing fate,
// because you could just leave the city if you wanted to"). Nothing pays for being finished, except a
// windmill, and nothing pays for closing what nobody holds (it did from
// 2026-10-27 to 2026-10-28: "you can't get points from a road that you don't
// own when you close it").
//
// FOLLOWERS: eight each (2026-10-28: "let's go back to having 8 meeple"; five
// the day before). A follower goes only where NOBODY is, you included ("we're
// revoking the rule that says that you can place meeple even on things
// already claimed by enemy meeple"), never into a closed road or city, nor a
// tower. An Abbazia is never claimed by laying it: a follower flown onto an
// empty one, or blown onto it, holds it ("you have to blow or flying machine
// into them from elsewhere"). Instead of claiming you may MOVE one of yours a
// square, or down a road it stands on as far as the road goes ("instead of
// placing a meeple, you can move a meeple instead"; `strideTargets`), which is
// how a follower leaves a city, at a gate. A RESIDENTIAL district takes another
// of yours in a city you hold. THE KEEP grows upwards: four pieces each, any
// keep, each doubling it, all lost when the wind moves it. THE CALCOLO, one
// stone for the table, is set down on open sky instead of a blow, and no push
// goes into its square. The wind blows followers over walls.
//
// THE MAINLAND is whatever piece of country is biggest, and every other piece,
// down to a single tile, is an ISLAND: it pays double, and you may build onto
// it only if you already stand on it. At the end, 10 to whoever stands on the
// most islands, and then every colour fires once more.
//
// THE PLAZA is the tile the game starts on, in the middle of a 17 x 17 map
// whose edges meet, and it does nothing else (it was the Palazzo, which towed
// the islands; Timothy: "i don't want the pallazzo to really do anything
// anymore"). Islands no longer travel as one piece either.
//
// CITIES ARE DISTRICTS: garden, residential, keep and trade, each a
// whole square, walled on every edge its city does not run on through. A wall
// takes anything an Abbazia does (2026-10-28): a road runs into it and ends at
// a gate, a city runs into it and is closed there. THE ABBAZIA fits anything,
// caps what it touches and adds to everybody's push. THE FLYING MACHINE flies
// a follower out down its lane, or fetches one home. THE WINDVANE turns onto
// the wind. THE BALENA, a sky whale, is an option: no push moves its tile.
// ---------------------------------------------------------------------------

import { Mode } from './mode.js';
import {
  CENTRE_FEATURES, SIDE_STEP, opposite, wallSides, WALL, edgesMeet, TILES,
} from '../tiles.js';
import { PLAYER_COLORS } from '../theme.js';
import { DECK_COUNTS } from './soffiando-deck.js';
import { DESIGN } from '../design.js';
import { claimableFeatures, citiesFed, hasMark } from '../mechanics.js';
import {
  zephyrDirs, isCannon, worldDir, turbineOn, isTemple, fitsAll, blow, runFrom, immovable,
} from '../wind.js';

/**
 * The backstop, in tiles laid rather than rounds played. Counting placements
 * is the only clock that means the same thing at every player count, and this
 * one sits a third above the 72-tile deck: tiles the wind knocks out of the
 * sky go back on it, so a stormy game runs past the deck it started with.
 */
const STORM_LIMIT = 96;
const TURBINE = 3;           // to the feature's holder, per push that reaches it (2 until 2026-10-28)
/**
 * EVERY OPINION THE COMPUTER PLAYER HAS, in one object.
 *
 * The bot reads the board — what is standing where, who holds it, what it
 * would pay — but none of that tells it how much it should CARE about a farm
 * against a temple, or whether shoving a rival's follower into open sky is
 * worth giving up a placement for. Those are judgements, and in a mode this
 * young they are guesses.
 *
 * So they live here as numbers rather than being spread through the methods,
 * and `tools/train.mjs` plays the mode against itself to improve them. A seat
 * can be handed its own set, which is what lets a trainer put two different
 * strategies in the same game and find out which one is right.
 *
 * `ahead` is the one with a real-world meaning: roughly how many more times a
 * given tower colour will fire from the middle of a game, the last round
 * included. Everything a claim is worth is multiplied by it,
 * so it is also, in effect, how eagerly the bot spends followers.
 *
 * THESE NUMBERS WERE MEASURED, not guessed. A sensitivity sweep and a
 * self-play climb agreed on all of them, and the set below beats the guesses
 * it started from in 62.5% of 120 games at a mean margin of 19 points. What it
 * says about the mode is worth reading off directly: FARMS ARE THE GAME (2× as
 * important as first assumed, and the strongest single signal in the sweep by
 * a distance), temples come second, roads are worth about half what they look
 * like, and a windmill in a city you hold is worth twice the guess.
 *
 * RETRAINED 2026-10-28 (Timothy: "lets get the ai to learn how to play
 * better"), under the rules of that day (two faces, walls that take
 * anything, held Abbazias, anchors, eight followers): sixteen rounds of
 * self-play (tools/train.mjs, tools/brains/soffiando-2026-10-28.json) took
 * three challengers, and the result beat the old set in 75% of 60 games on
 * seeds it never trained on, by 27 points. What moved says what changed in
 * the mode: FARMS ARE NO LONGER THE GAME (4 to 1.2; green fires only when a
 * green tower or the sun closes, and a farmer is a follower gone for good),
 * roads are worth a little more, and a tower closed is worth a little less
 * net of what it hands the table.
 *
 * AND AGAIN, after farms went and green paid for holding a piece of country
 * (the thirty-fourth pass): twenty rounds took two challengers, and the
 * result beat the set before in 73% of 32 unseen games and 78% of 60, by 29
 * points. It looks further ahead (ahead 2 to 5.9), cares less for each piece
 * of country than the raw 5 says (land 0.57), more for roads (1.57), and
 * less for its own windmills (10 to 6.1).
 *
 * AND AGAIN after the thirty-sixth pass (nobody comes home, the keep, the
 * residential district, the Calcolo, districts on both faces): twenty rounds
 * took six challengers. The result won 55% of 32 unseen games (by -1) and
 * 62.5% of 60 more (by 4), about 60% of the 92: a smaller step than the last
 * two. It looks much further ahead (ahead 5.9 to 17: with no follower ever
 * coming back, a claim is for the whole game), prices roads lower (0.67),
 * and sets the Calcolo down more readily (calcolo 0.36).
 */
export const SOFFIANDO_WEIGHTS = {
  ahead: 17.136,     // firings a claim is priced over — and claim eagerness
  land: 0.448,       // …scaled per colour, because the four colours pay
  city: 1,           //    over different numbers of tiles and the bot has no
  road: 0.672,       //    way of knowing which of them is actually winnable
  sphere: 0.834,     // closing a tower, net of what it hands the table
  closeTower: 8.892,  // …and closing one at all (measured: 8 against 2, even over 24 games; 8 closes more, as people do)
  quarter: 1.633,    // a quarter of a big tower laid against another, per quarter it joins
  parish: 0.6,       // a tile round an Abbazia, to whoever holds its neighbourhood
  stride: 0.93,      // what moving a follower has to be worth over the best claim
  keep: 1,           // …and building a keep up
  calcolo: 0.356,    // how much every blow has to cost before the Calcolo is set down instead
  turbineMine: 6.114, // a windmill in a feature we hold
  turbineTheirs: -2.901, // …or one somebody else does
  blowLook: 15,      // blows tried for real each turn, of the best guessed
  whale: 0,          // points of shelter before the Balena is worth a turn
};

/** A seat's own weights, or the defaults. */
const weightsFor = (mode, seat) => mode.brains?.[seat] || SOFFIANDO_WEIGHTS;
const WINDMILL = 3;          // …and per windmill, to whoever HOLDS the feature it finishes (2 until 2026-10-28)
const REOPENED = 1;          // per tile, off a held city the wind blows open again
const FLIGHT_RANGE = 24;     // squares, before we assume the zephyrs are a loop
const ARCHIPELAGO = 10;      // at the end, to whoever stands on the most islands
const FOLLOWERS = 8;         // each (Timothy, 2026-10-28: "let's go back to having 8 meeple"; 5 from the day before)
const SUPPLY = FOLLOWERS;    // …which is what the panel draws
const BASE_PUSH = 1;         // everybody's push power with no Abbazia on the board
const GARDEN = 1;            // blue, per garden district, open or closed, on top of its district
const CLOSED_DISTRICT = 2;   // blue, per district of a closed city (1 open)
const EVERY_KIND = ['garden', 'residential', 'keep', 'trade'];
const EVERY_BONUS = 5;       // blue, to a closed city with at least one of every kind
const TRADE = 2;             // blue, per trade district, per road that meets the closed city at a gate
const KEEP_PIECES = 4;       // each player's pieces for building keeps up
const KEEP_MAX = 4;          // pieces on one keep: 1, 2, 4, 8, 16
const LAND = 5;              // green, to whoever has most followers on a piece of country, a tiny island too
const MOVE_ON_PAUSE = 260;   // ms between the ring on a tile that no longer fits and its slide

/**
 * What everything pays, on the mainland and out on an island — and everything
 * out on an island pays exactly DOUBLE. Nothing here is paid for finishing
 * (nor, since 2026-10-28, for closing what nobody holds); it is all paid by
 * a tower closing, over the whole board at once.
 */
/**
 * A CITY (Timothy, 2026-10-28) pays a point a district while it is open and 2
 * once it is closed; a GARDEN district a point more, open or closed ("garden
 * tiles are worth 3p"); a KEEP its district's points doubled for every piece
 * built on it (1, 2, 4, 8, 16, or 2 to 32 closed). Its bonuses are paid once
 * it is closed, and to every city in the last scoring: 5 if it has at least
 * one district of every kind, and 2 for every road that meets it at a gate
 * for every trade district in it. Out on an island, double the lot.
 *
 * Earlier the same day a district paid 1 open or closed, and the bonus was
 * one for variety (1, 3 or 6 for two, three or four kinds) and 2 a garden;
 * before that a closed city paid double. The bonus was a multiplier first
 * (a point a district, times 1, 2, 3, 5 or 8 for the kinds), and in 30 bot
 * games that made cities 62% of all the points: see MODES.md, twenty-third
 * pass.
 */

/** The city feature on a tile that is a district, if it has one. *//** The city feature on a tile that is a district, if it has one. */
const districtOf = (type) => type.feats.find((f) => f.district) || null;


const RATE = {
  cityOpen: { main: 1, isle: 2 },         // per tile, unfinished
  cityDone: { main: 2, isle: 4 },         // per tile, finished
  abbazia: { main: 1, isle: 2 },          // red, per tile standing around one
  road: { main: 1, isle: 2 },             // per tile
  roadCity: { main: 1, isle: 2 },         // …plus this per city the road reaches
  roadCityDone: { main: 2, isle: 4 },     // …and this if that city is finished
};

/**
 * What each tower colour counts when its tower closes. Each is a scoring pass
 * over one kind of thing, EVERYWHERE ON THE BOARD, paying whoever holds each
 * one, which is why closing a tower is the event the whole mode turns on
 * rather than a bonus on top of it.
 */
const COLOURS = {
  green: 'the land',
  blue: 'the cities',
  red: 'the Abbazias',
  yellow: 'the roads',
};

/** The colour of the tower on a tile (a half, or a quarter of a big one), if there is one. */
const sferaHue = (cell) =>
  cell?.type.feats.find((f) => f.type === 'sfera')?.hue || null;

/** "green and blue", "green, blue and red" — for the log. */
const listOf = (words) => (words.length < 2 ? words.join('')
  : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`);

/**
 * The same list with repeats folded into a count. A matched pair fires the
 * same effect twice, and "2 a finished city and 2 a finished city" is a
 * sentence nobody should have to read.
 */
const tallyOf = (things) => {
  const seen = new Map();
  for (const t of things) seen.set(t, (seen.get(t) || 0) + 1);
  return [...seen];
};
const listTally = (things, label = (t) => t) =>
  listOf(tallyOf(things).map(([t, n]) => `${label(t)}${n > 1 ? ` ×${n}` : ''}`));

const DIR_NAMES = ['north', 'east', 'south', 'west'];

/** The eight squares around a tile: an Abbazia's neighbourhood, and what red counts. */
const RING = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];

/**
 * A quarter of the sun or the black hole: no push moves it. A tower half
 * blows like any other tile since 2026-10-27 (Timothy: "let a blow move tower
 * halves"), so a push can close a tower.
 */
const isQuarter = (cell) => cell.type.feats.some((f) => f.quarter);

/** A half of a tower that has closed: with the big tower's quarters, an ANCHOR (2026-10-28). */
const closedHalf = (board, cell) => {
  const i = cell.type.feats.findIndex((f) => f.type === 'sfera' && !f.quarter);
  if (i < 0) return false;
  const d = board.featureOf(cell.x, cell.y, i);
  return !!d && d.open === 0 && d.tiles.size >= 2;
};

/** A deck entry with a quarter of a big tower on either face. */
const quarterKey = (key) => String(key).split('|').some((id) => TILES[id]?.feats.some((f) => f.quarter));

/** Is world side set `a` the same two sides as `b`? */
const sameSides = (a, b) => a.length === b.length && a.every((s) => b.includes(s));
const key = (c) => `${c.x},${c.y}`;

export class Soffiando extends Mode {
  /** The kingdom starts with the Plaza, as blowable as anything. */
  seeds() { return [{ x: 0, y: 0, id: 'Kpz', rot: 0 }]; }

  /**
   * The SPACE between the tiles is open sky, not the ground on them. That
   * distinction is the whole readability of the mode: every gap you can see
   * through is somewhere a tile could fall out of, and every gap wide enough
   * to walk round is what makes the country on the far side an island.
   */
  backdrop = 'sky';

  /** The farms are counted when a tower closes, and never again at the end. */
  finalFarms = false;

  /**
   * The deck is a table, not a cut of a shuffled pool (soffiando-deck.js):
   * this mode is its weather, and a deck that happened to deal no zephyrs
   * would be a different game entirely. Seventy-two tiles, each named and
   * counted. `options.deck` replaces counts by id, which is how a tile
   * toggled on the rulebook page is tried before it is written in.
   */
  deck() {
    const rng = this.game.rng;
    const counts = { ...DECK_COUNTS, ...(this.game.options?.deck || {}) };
    const deck = [];
    for (const [id, n] of Object.entries(counts)) for (let i = 0; i < n; i++) deck.push(id);
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  setup() {
    // Five each (2026-10-27). Everything comes home off a scored feature, so
    // the supply turns over, and a short one makes every claim a choice.
    for (const p of this.game.players) { p.meeples = FOLLOWERS; p.keeps = KEEP_PIECES; }
    this.flight = null;
    this.lifted = null;
    this.laid = 0;
    this.gusts = 0;            // pushes a zephyr tile made, in somebody's chain
    this.blows = 0;            // blows made, one a turn
    this.pushes = 0;           // …and every push of either kind
    this.fallen = 0;           // tiles the wind has taken out of the sky
    this.swallowed = 0;        // …and the black hole
    this.lost = 0;             // …of them, the ones blown off the map for good
    this.caught = false;       // …and whether one has come back to hand this turn
    this.spheres = 0;          // towers closed so far
    this.hues = {};            // …and how many of each colour
    this.blowing = false;
    this.blame = null;         // whose weather is currently running
    this.final = false;        // the last scoring, which pays every city its bonuses
    this.striding = null;      // a follower lifted to move this step, rule 82
    this.strideFrom = null;    // …and, while one is being picked, which could
    this.balenaMoved = false;  // …and the whale has already swum this turn
    // The whale starts asleep over the Plaza. OUT OF THE DEFAULT RULES
    // (Timothy, 2026-10-24: "for now, remove the balena in the default
    // rules"); a game with `options.balena` plays it.
    this.balena = this.game.options?.balena ? { x: 0, y: 0 } : null;
    this.calcolo = null;       // the stone, off the board until somebody sets it down (rule 86)
    this.settleBalena();
    // YOUR ZEPHYR, every turn, after the follower step (see the header).
    this.blowDir = 1;
    this.blown = false;        // …and whether this turn's blow has been made
    // …and what no longer fits moves on: until it does, the seam it does
    // not meet joins nothing (Board.cracks).
    this.game.board.cracks = true;
    this.movedNow = new Set(); // tiles moved since the last look for loose ones
    this.astray = [];          // loose tiles still to move on, first first
    this.astrayAt = null;      // …the one whose way is being chosen, and where it can go
    this.astrayThen = 'meeple';
    this.movedOn = 0;
  }

  // --- the mainland, and everything adrift from it ---------------------------
  //
  // The biggest piece of country is the mainland, and everything else
  // follows from that one fact: where you may build, where a follower may be
  // put down, and what every closure is worth. The wind moves it about, so
  // all of that moves with it.

  /**
   * Where every tile on the board stands: the kingdom, and the sky adrift from
   * it. Everything downstream of this — where you may build, where a follower
   * may be put down, what every closure is worth — is one lookup in the two
   * key sets it returns.
   *
   * Cached against the board's mutation counter rather than against a turn,
   * because the wind rearranges the board several times inside a single turn —
   * and this is asked once per visible tile per frame by the renderer and once
   * per candidate square per turn by the computer player, so the cache check
   * itself has to be a single integer compare. The flood fill behind it only
   * runs when the country has actually changed shape.
   */
  land() {
    const board = this.game.board;
    const stamp = board.version;
    if (this._land && this._land.stamp === stamp) return this._land;

    const groups = board.groups();                    // biggest first
    // THE MAINLAND IS WHATEVER IS BIGGEST. It used to be whichever piece the
    // Palazzo (the Plaza now) stood on, which meant a gust that blew the seat
    // onto a two-tile rock demoted the entire kingdom to an island and doubled
    // every rate on the board in one move. Size is the reading a player makes
    // anyway: the big one is the mainland.
    const main = groups[0] || [];
    // EVERY piece of country off the mainland is an island, down to a single
    // tile. It used to take two — "a lone tile adrift is not an island, it is a
    // tile adrift" — and that sentence was the reason the archipelago never
    // grew. The wind's commonest act is popping ONE tile off a loose end, so
    // nearly every fragment it makes is a singleton; calling those rocks rather
    // than islands meant they scored nothing, counted for nothing, and above
    // all could never be BUILT ON, because you may only build onto an island
    // you are standing on. They sat there forever. A rock you have somebody
    // standing on is now somewhere you may lay a tile, which is the whole
    // engine: the wind makes the seed and the players grow it.
    const isles = groups.filter((g) => g !== main && g.length >= 1);
    const mainKeys = new Set(main.map(key));
    const isleKeys = new Set();
    for (const g of isles) for (const c of g) isleKeys.add(key(c));
    this._land = { stamp, groups, main, isles, mainKeys, isleKeys };
    return this._land;
  }

  /** Is this square out on an island — a group of two or more, off the seat? */
  onIsland(cell) { return !!cell && this.land().isleKeys.has(key(cell)); }

  /** What a component pays per tile, given where in the sky it is standing. */
  rateFor(kind, cells) {
    return this.onIsland(cells[0]) ? RATE[kind].isle : RATE[kind].main;
  }

  /**
   * You may only put a tile down where it touches the kingdom. This is passed
   * straight through to the board, so the legal-square wash, the bot and the
   * "this tile has nowhere to go" check all agree about it without any of them
   * knowing what an island is.
   */
  placeOpts() {
    return { onto: this.reachable(), judge: (x, y, type, rot) => this.judgeBig(x, y, type, rot) };
  }

  // --- the big towers --------------------------------------------------------
  //
  // The sun and the black hole are the same eight tiles, a sun quarter on one
  // face and a black hole quarter on the other, and a game makes one of each
  // (Timothy, 2026-10-27: "there needs to be the choice of what to build and
  // both need to be present by the end of the game ... if a sun is already
  // made then you have to make a black hole, and vice versa"). The first
  // quarter laid decides which comes first, and where: the rest of its 2x2
  // is KEPT for the other three (nothing else is laid there, and no push or
  // move-on goes into it), and each of them may only go into it, touching a
  // quarter already laid, wherever on the map that is. Their outer edges are
  // walled and take anything, so they always fit: once the first is down the
  // big tower is sure to close ("so there completion is inevitable"). Then
  // the next quarter begins the other one.

  /**
   * The big towers begun, read off the board: each one's colour, whether it
   * is closed, and its four squares, each with the two sides that face into
   * the 2x2 and what is on it.
   */
  bigTowers() {
    const board = this.game.board;
    // Asked for every square a tile might go, so kept until the board changes.
    if (this.bigSeen?.version === board.version && this.bigSeen.board === board) return this.bigSeen.towers;
    const blocks = new Map();
    for (const q of this.tiles().filter(isQuarter)) {
      const f = q.type.feats.find((x) => x.quarter);
      const [a, b] = f.sides.map((s) => (s + q.rot) % 4);
      const slots = this.blockOf(q.x, q.y, a, b);
      const id = slots.map((sq) => `${sq.x},${sq.y}`).sort().join(' ');
      if (!blocks.has(id)) blocks.set(id, { hue: f.hue, slots: slots.map((sq) => ({ ...sq, cell: board.get(sq.x, sq.y) })) });
    }
    const towers = [...blocks.values()].map((t) => ({ ...t, done: t.slots.every((sq) => sq.cell && isQuarter(sq.cell)) }));
    this.bigSeen = { board, version: board.version, towers };
    return towers;
  }

  /** The big tower begun and not yet closed, if there is one. */
  openBig() { return this.bigTowers().find((t) => !t.done) || null; }

  /** The 2x2 a quarter at (x, y) facing into it on sides a and b makes, each square with its own two inward sides. */
  blockOf(x, y, a, b) {
    const board = this.game.board;
    const step = (sides) => {
      let nx = x, ny = y;
      for (const s of sides) { nx += SIDE_STEP[s][0]; ny += SIDE_STEP[s][1]; }
      return board.norm(nx, ny);
    };
    return [
      { ...step([]), sides: [a, b] },
      { ...step([a]), sides: [opposite(a), b] },
      { ...step([b]), sides: [a, opposite(b)] },
      { ...step([a, b]), sides: [opposite(a), opposite(b)] },
    ];
  }

  /** Is the Calcolo standing on (x, y)? */
  stoneAt(x, y) {
    if (!this.calcolo) return false;
    const sq = this.game.board.norm(x, y);
    return sq.x === this.calcolo.x && sq.y === this.calcolo.y;
  }

  /** A square no tile may be laid, pushed or moved on into: the big tower's kept 2x2, or the Calcolo's. */
  shut(x, y) {
    return this.keptFor(x, y) || this.stoneAt(x, y);
  }

  /** Is (x, y) a square of a big tower's 2x2 still kept for a quarter? */
  keptFor(x, y) {
    const big = this.openBig();
    if (!big) return false;
    const sq = this.game.board.norm(x, y);
    return big.slots.some((s) => !s.cell && s.x === sq.x && s.y === sq.y);
  }

  /**
   * The board's placement rules, for what the big towers change: true or
   * false settles it, undefined leaves it to the ordinary rules. While one is
   * open a quarter goes only into its 2x2, turned to face into it, touching a
   * quarter already there; otherwise a quarter begins the big tower not yet
   * made, anywhere the ordinary rules allow with the rest of its 2x2 open
   * sky. Nothing else goes into a kept square.
   */
  judgeBig(x, y, type, rot) {
    const board = this.game.board;
    if (this.stoneAt(x, y)) return false;               // the Calcolo stands there (rule 87)
    const f = type.feats.find((t) => t.quarter);
    const towers = this.bigTowers();
    const big = towers.find((t) => !t.done);
    if (!f) return big && big.slots.some((s) => !s.cell && s.x === x && s.y === y) ? false : undefined;
    const sides = f.sides.map((s) => (s + rot) % 4);
    if (!big) {
      if (towers.some((t) => t.hue === f.hue)) return false;       // made already: the other one now
      const rest = this.blockOf(x, y, sides[0], sides[1]).slice(1);
      return rest.every((sq) => !board.get(sq.x, sq.y)) ? undefined : false;
    }
    if (f.hue !== big.hue) return false;
    const slot = big.slots.find((s) => !s.cell && s.x === x && s.y === y);
    if (!slot || !sameSides(sides, slot.sides)) return false;
    return slot.sides.some((s) => {
      const n = board.norm(x + SIDE_STEP[s][0], y + SIDE_STEP[s][1]);
      const c = board.get(n.x, n.y);
      return !!c && isQuarter(c);
    });
  }

  /**
   * Where a tile may go: the mainland, plus any island you already have a
   * follower standing on. You cannot sail out to a rock and start building on
   * it — but a piece of country that came apart under your own people is still
   * yours to build on, and cutting it off entirely made being blown onto one a
   * punishment rather than an opportunity.
   */
  reachable() {
    const { isles, mainKeys } = this.land();
    // YOUR follower, not anybody's. It used to be any figure at all, which let
    // a rival who had been stranded on a rock open it to everyone at the table:
    // 2.5 followers a game walked onto islands that way at two players and 5.8
    // at three, every one of them riding on somebody else's route.
    const seat = this.game.current;
    const mine = isles.filter((g) => g.some((c) => c.meeple?.player === seat));
    if (!mine.length) return mainKeys;
    const out = new Set(mainKeys);
    for (const g of mine) for (const c of g) out.add(key(c));
    return out;
  }

  /**
   * On top of the host's own rule (a feature has to be unclaimed):
   *
   *   AN ISLAND is somewhere you are blown or flown to, unless you are already
   *     standing on it — the same reach that decides where a tile may go.
   *   and everything `freeToTake` says.
   *
   * A follower being MOVED (rule 82) claims nothing on the tile just laid:
   * its places are the mode's own list (`flightTargets`).
   */
  claimAllowed({ x, y, i, f }) {
    if (this.striding) return false;
    const board = this.game.board;
    const cell = board.get(x, y);
    if (!cell) return false;
    if (this.onIsland(cell) && !this.reachable().has(key(cell))) return false;
    return this.freeToTake(cell, i, f);
  }

  /**
   * May a follower take up feature `i` of this tile, wherever it came from
   * (a claim, a flight, a move)?
   *
   *   A FEATURE ANYBODY IS IN is closed to you, yours included (Timothy,
   *     2026-10-28: "we're revoking the rule that says that you can place
   *     meeple even on things already claimed by enemy meeple"; asked, nobody's
   *     at all). Open roads and cities could be joined from 2026-10-27.
   *   A CLOSED ROAD OR CITY is never claimed (Timothy, 2026-10-27: "not if
   *     they are closed").
   *   A WALL IS NOT A CITY TO STAND IN. A city is claimed in one of its
   *     districts; the city feature on a wall tile is only there so the wall
   *     closes the city it faces.
   */
  freeToTake(cell, i, f) {
    // NO MORE FARMERS (2026-10-28): green pays for holding the land, and a
    // field is held by nobody.
    if (f.type === 'field') return false;
    if (f.type === 'city' && !f.district) return false;
    const d = this.game.board.featureOf(cell.x, cell.y, i);
    if (!d || d.meeples.length) return false;
    return !((d.type === 'road' || d.type === 'city') && d.open === 0);
  }

  // --- placing --------------------------------------------------------------

  afterPlace(cell) {
    cell.round = this.game.round;
    this.laid++;
    // A zephyr tile does nothing when it is laid (2026-10-27): it pushes only
    // when a blow has pushed it. Closing things does: a road or city closed
    // with nobody in it pays whoever closed it, on the spot, and a tower
    // fires.
    this.settle(this.game.current);
    this.joinSferas();
    this.flight = this.flightPath(cell);
    // A tower that just paid one of your followers has opened a WALK, and
    // the answer here becomes the host's next phase.
    this.astrayThen = 'meeple';
    if (this.resolveAstray()) return 'astray';
    if (this.game.phase === 'over') return null;
    return 'meeple';
  }

  /**
   * THE BLOW IS THE LAST STEP OF A TURN, and it is not optional. The host
   * asks this before it ends a turn; the first time each turn the answer is
   * to hold it and hand the player their zephyr. Once the blow has been made
   * (`blowAt`) the turn ends as it always did. A tile caught on the same turn
   * is laid and claimed on without a second blow.
   */
  holdTurn() {
    const g = this.game;
    // A follower lifted to move and not set down goes back first.
    this.settleStride();
    if (this.blown || g.phase === 'over' || !g.board.size) return false;
    // Nowhere to blow from (no tile with open sky on any side): no blow.
    if (![0, 1, 2, 3].some((d) => this.blowTargets(d).length)) return false;
    g.phase = 'blow';
    return true;
  }

  endTurn() {
    this.flight = null;
    this.caught = false;
    this.lifted = null;
    this.striding = null;
    this.strideFrom = null;
    this.balenaMoved = false;
    this.blown = false;
    this.astray = [];
    this.astrayAt = null;
    this.movedNow.clear();
    if (this.laid >= STORM_LIMIT) {
      // Not before both big towers are made (Timothy, 2026-10-28: "both need
      // to be present by the end of the game"): the quarters still in the
      // deck come up next, and the season ends once they are laid. Without
      // this the backstop ended about one game in twelve with one of them
      // still to make.
      const g = this.game;
      const quarters = g.deck.filter(quarterKey);
      if (quarters.length && this.bigTowers().filter((t) => t.done).length < 2) {
        if (!this.lastQuarters) g.say('The season is turning, but a big tower is still to be made: the last quarters come up first.');
        this.lastQuarters = true;
        g.deck = [...g.deck.filter((k) => !quarterKey(k)), ...quarters];
        return;
      }
      g.say('The season turns, and the wind drops.');
      g.finish();
    }
  }

  /**
   * What a feature is worth to a computer player. Everything in Soffiando is
   * paid by the sferas, over the whole board, several times a game — so the
   * price of standing in something is what its colour pays TIMES the number of
   * times that colour is still likely to fire. Without this the bot reads the
   * board's ordinary Carcassonne values, which price a field at nothing at all
   * and a temple at nothing at all, and those are two of the four things
   * actually worth holding here.
   */
  valueOf(d) {
    const board = this.game.board;
    // `d.at` is the tile the component was first linked on, which is always a
    // real square — so the island test costs one lookup rather than building
    // the whole cell list, and this is asked for every component on the board
    // for every candidate placement the bot prices.
    const on = board.get(d.at.x, d.at.y);
    if (!on) return null;
    // Whoever is thinking is whoever's turn it is: this is only ever asked by
    // a computer player pricing its own move.
    const w = weightsFor(this, this.game.current);
    const isle = this.onIsland(on);
    const per = (kind) => (isle ? RATE[kind].isle : RATE[kind].main) * w.ahead;
    switch (d.type) {
      case 'city':
        return this.cityPoints(d).pts * w.ahead * w.city;
      case 'road':
        return d.tiles.size * per('road') * w.road;
      default:
        return null;
    }
  }

  // --- turbines -------------------------------------------------------------

  /**
   * Every push that reaches a windmill pays whoever holds the feature it
   * stands in. Nobody there, nobody paid.
   */
  payTurbines(cells) {
    const board = this.game.board;
    for (const cell of cells) {
      if (board.get(cell.x, cell.y) !== cell) continue;
      const t = turbineOn(cell);
      if (!t || t.on == null) continue;
      const d = board.featureOf(cell.x, cell.y, t.on);
      if (!d || !d.meeples.length) continue;
      for (const p of board.majority(d)) {
        this.pay(p, TURBINE, `${this.game.players[p].name}'s ${d.type} turbine turns`,
          [{ x: cell.x, y: cell.y }]);
      }
    }
  }

  /** One place where points are handed out, so every stream looks the same. */
  pay(player, points, line, cells) {
    const g = this.game;
    g.players[player].score += points;
    g.say(`${line} ${points < 0 ? '' : '+'}${points}`);
    g.emit('score', {
      points, player, players: [player], cells,
      at: { x: cells[0].x + 0.5, y: cells[0].y + 0.5 },
    });
  }

  // --- the towers ------------------------------------------------------------

  /**
   * Two tower halves of one colour meeting close a tower, and four quarters
   * meeting close a big one. Either can only happen by a tile being laid: no
   * push moves a tower. A tower fires its colour ONCE (it fired a pass per
   * half when any half fitted any other, and two of one colour fired twice;
   * one colour a tower now, so once). The sun fires every colour; the black
   * hole swallows what is round it.
   *
   * The pair is remembered on the tiles (`sphered`), so a tower is counted
   * once however often the board is rebuilt.
   */
  joinSferas() {
    const board = this.game.board;
    for (let guard = 0; guard < 32; guard++) {
      const d = board.allComponents().find((c) => c.type === 'sfera' && c.tiles.size >= 2
        && c.open === 0 && !board.cellsOf(c).every((cell) => cell.sphered));
      if (!d) return;
      const cells = board.cellsOf(d);
      for (const c of cells) c.sphered = true;
      const hue = sferaHue(cells[0]);
      this.spheres++;
      this.hues[hue] = (this.hues[hue] || 0) + 1;
      this.game.emit('landmark');
      if (hue === 'hole') {
        this.swallow(cells);
        continue;
      }
      if (hue === 'sun') {
        this.game.say('The sun rises over the kingdom: every colour fires at once.');
        for (const h of Object.keys(COLOURS)) this.fire(h);
      } else {
        this.game.say(`A ${hue} tower closes: the sky scores ${COLOURS[hue]}.`);
        this.fire(hue);
      }
    }
  }

  /**
   * THE BLACK HOLE. Every tile in the twelve squares round the 2x2 goes into
   * it: shuffled back into the deck, every follower on them home. What it
   * swallowed was finishing things, so they are open again (`reopen`).
   */
  swallow(hole) {
    const g = this.game;
    const board = g.board;
    const inHole = new Set(hole.map((c) => board.key(c.x, c.y)));
    const ring = new Map();
    for (const c of hole) {
      for (const [dx, dy] of RING) {
        const k = board.key(c.x + dx, c.y + dy);
        if (inHole.has(k) || ring.has(k)) continue;
        const t = board.get(c.x + dx, c.y + dy);
        if (t && !isQuarter(t)) ring.set(k, t);     // never the sun: no push or pull moves a quarter
      }
    }
    const fell = [];
    for (const t of ring.values()) {
      if (t.meeple) {
        g.emit('meeple', { recall: true, player: t.meeple.player, at: { x: t.x + 0.5, y: t.y + 0.5 } });
        g.sendHome(t);
      }
      fell.push({ x: t.x, y: t.y, type: t.type, rot: t.rot, look: t.seq });
      g.deck.splice(Math.floor(g.rng() * (g.deck.length + 1)), 0, t.key || t.type.id);
      board.remove(t.x, t.y, { quiet: true });
    }
    this.swallowed += fell.length;
    board.rebuild();
    this.reopen();
    this.settleBalena();
    g.say(fell.length
      ? `The black hole closes and swallows ${fell.length} tile${fell.length > 1 ? 's' : ''} round it, back into the deck.`
      : 'The black hole closes, and there is nothing round it to swallow.');
    if (fell.length) g.emit('gust', { dir: 0, moves: [], fell });
  }

  /**
   * One colour going off: a scoring pass over one kind of thing, over the
   * whole board, paying whoever holds each one.
   */
  fire(hue) {
    switch (hue) {
      case 'green': return this.scoreLand();
      case 'blue': return this.scoreCities();
      case 'red': return this.scoreAbbazias();
      case 'yellow': return this.scoreRoads();
      default: return undefined;
    }
  }

  /** Which of a rate pair applies to a component, by where it is standing. */
  rate(kind, cells) {
    return this.onIsland(cells[0]) ? RATE[kind].isle : RATE[kind].main;
  }

  /**
   * GREEN — the land (Timothy, 2026-10-28: "no more farmers actually. the
   * green scoring from towers simply measures who has control of the
   * landmass (who has the most meeple) a awards them with 5 points. this
   * means you can get 5 points from even a tiny island"). Every piece of
   * country, the mainland and each island, pays 5 to whoever has the most
   * followers standing on it, holding anything or nothing; tied, each in
   * full. Not doubled out on an island: the 5 is the same on a rock as on
   * the mainland, which is what makes the rock worth having. Nobody goes
   * home for it. Until then green paid farms, a point for every two tiles of
   * field.
   */
  scoreLand() {
    const g = this.game;
    const { main, isles } = this.land();
    for (const group of [main, ...isles]) {
      const winners = this.landHolders(group);
      if (!winners.length) continue;
      const where = group.map((c) => ({ x: c.x, y: c.y }));
      const what = group === main ? 'The mainland' : `An island of ${group.length} tile${group.length === 1 ? '' : 's'}`;
      for (const p of winners) this.pay(p, LAND, `${what}, held by the most followers — ${g.players[p].name}`, where);
    }
  }

  /** Who has the most followers standing on a piece of country (ties all). */
  landHolders(group) {
    const counts = new Map();
    for (const c of group) if (c.meeple) counts.set(c.meeple.player, (counts.get(c.meeple.player) || 0) + 1);
    const best = Math.max(0, ...counts.values());
    return best ? [...counts].filter(([, n]) => n === best).map(([p]) => p) : [];
  }

  /**
   * BLUE — the cities, by their districts (`cityPoints`). Finishing a city
   * pays nothing by itself; what walls it in is its bonuses on every blue
   * tower still to come.
   */
  scoreCities() {
    const board = this.game.board;
    for (const d of board.allComponents()) {
      if (d.type !== 'city' || !d.meeples.length) continue;
      const cells = board.cellsOf(d);
      if (!cells.length) continue;
      const { pts, line } = this.cityPoints(d);
      this.payHolders(d, pts, line, cells);
    }
  }

  /**
   * What blue pays a city (see the note on cities above `districtOf`).
   */
  cityPoints(d) {
    const board = this.game.board;
    const cells = board.cellsOf(d);
    const walled = d.open === 0;
    const bonus = walled || this.final;
    const base = walled ? CLOSED_DISTRICT : 1;
    const isle = cells.length > 0 && this.onIsland(cells[0]);
    const kinds = new Set();
    let pts = 0, n = 0, gardens = 0, trades = 0, built = 0;
    for (const cell of cells) {
      const i = board.featIndexOn(cell, d);
      const kind = i == null ? null : cell.type.feats[i].district;
      if (!kind) continue;
      n++;
      kinds.add(kind);
      pts += kind === 'keep' ? base * 2 ** (cell.keep || 0) : base;
      if (kind === 'keep' && cell.keep) built += cell.keep;
      if (kind === 'garden') { pts += GARDEN; gardens++; }
      if (kind === 'trade') trades++;
    }
    let every = false, roads = 0;
    if (bonus) {
      every = EVERY_KIND.every((k) => kinds.has(k));
      if (every) pts += EVERY_BONUS;
      if (trades) { roads = this.roadsAt(d).size; pts += TRADE * roads * trades; }
    }
    pts *= isle ? 2 : 1;
    const line = `${walled ? 'A walled city' : 'An open city'}`
      + ` of ${n} district${n === 1 ? '' : 's'}`
      + `${gardens ? `, ${gardens} garden${gardens === 1 ? '' : 's'}` : ''}`
      + `${built ? `, its keep${built > 1 ? 's' : ''} built ${built} high` : ''}`
      + `${every ? ', every kind' : ''}`
      + `${roads && trades ? `, ${roads} road${roads === 1 ? '' : 's'} to its trade` : ''}`
      + `${isle ? ' out on an island' : ''}`;
    return { pts, line };
  }

  /**
   * Every road that meets a city at a gate: a road on the next tile running
   * into one of its districts' walls (rule 68). Districts carry no roads of
   * their own, so these are the roads "attached to the city".
   */
  roadsAt(d) {
    const board = this.game.board;
    const out = new Set();
    for (const cell of board.cellsOf(d)) {
      if (board.featIndexOn(cell, d) == null) continue;
      for (let s = 0; s < 4; s++) {
        if (board.edgeAt(cell, s) !== WALL) continue;
        const nb = board.neighbor(cell.x, cell.y, s);
        if (!nb || board.edgeAt(nb, opposite(s)) !== 'r') continue;
        const fi = board.featAt(nb, opposite(s));
        const road = fi == null ? null : board.featureOf(nb.x, nb.y, fi);
        if (road) out.add(board.find(road.parts[0]));
      }
    }
    return out;
  }

  /**
   * How many districts a city has, of how many kinds, and how many of them
   * are gardens. Walls are part of the city's component (they are what
   * closes it) but they are not districts, and pay nothing.
   */
  districtsIn(d) {
    const board = this.game.board;
    const kinds = new Set();
    let n = 0, gardens = 0;
    for (const cell of board.cellsOf(d)) {
      const i = board.featIndexOn(cell, d);
      const kind = i == null ? null : cell.type.feats[i].district;
      if (!kind) continue;
      n++;
      if (kind === 'garden') gardens++;
      kinds.add(kind);
    }
    return { n, kinds: kinds.size, gardens };
  }

  /**
   * RED — the Abbazias (2026-10-27; it was the temples, and the temples are
   * Abbazias now, which nobody claims). Each pays a point for every tile in
   * the eight squares round it, doubled on an island, to whoever has the
   * most followers on those eight and on the Abbazia itself; tied, each in
   * full. They are paid as neighbours, not as holders, so nobody comes home.
   */
  scoreAbbazias() {
    const g = this.game;
    for (const cell of this.tiles()) {
      if (!hasMark(cell, 'abbazia')) continue;
      const pts = this.abbaziaPoints(cell);
      if (!pts) continue;
      const winners = this.abbaziaHolders(cell);
      if (!winners.length) continue;
      const isle = this.onIsland(cell);
      const held = !!cell.meeple;
      for (const p of winners) {
        this.pay(p, pts,
          `The Abbazia at (${cell.x}, ${cell.y})${held ? ', held,' : ''} with ${this.game.board.surroundCount(cell.x, cell.y)} tiles round it`
          + `${isle ? ' out on an island' : ''} — ${g.players[p].name}`,
          [{ x: cell.x, y: cell.y }]);
      }
    }
  }

  /**
   * What red pays for an Abbazia: a point for every tile in the eight squares
   * round it, as a cloister does (Timothy, 2026-10-28: "make abbazzias only
   * get points for adjacent squares like cloisters"). Double on an island.
   * Until then a held one paid a point more for every follower round it.
   */
  abbaziaPoints(cell) {
    return this.game.board.surroundCount(cell.x, cell.y)
      * (this.onIsland(cell) ? RATE.abbazia.isle : RATE.abbazia.main);
  }

  /**
   * Where a follower on `cell` would come down if a push blew it `dir`, as
   * the wind does it (wind.js `blowFollower`): the next tile downwind, or
   * null if a figure keeps it where it is.
   */
  landingOf(cell, dir) {
    const board = this.game.board;
    const [dx, dy] = SIDE_STEP[dir];
    const lap = board.wraps ? (dx === 0 ? board.span.h : board.span.w) : 64;
    for (let n = 1; n <= lap; n++) {
      const sq = board.norm(cell.x + dx * n, cell.y + dy * n);
      const dest = board.get(sq.x, sq.y);
      if (!dest) continue;
      if (dest === cell || dest.meeple) return null;
      return dest;
    }
    return null;
  }

  /** What standing on an empty Abbazia (a claim with no feature, flown out to) is worth to a computer player. */
  botTileClaim(o, seat) {
    const cell = this.game.board.get(o.x, o.y);
    if (!cell || !hasMark(cell, 'abbazia') || cell.meeple) return null;
    const w = weightsFor(this, seat);
    const before = this.abbaziaHolders(cell);
    const was = before.length ? (before.includes(seat) ? 1 : -0.7) * this.abbaziaPoints(cell) : 0;
    cell.meeple = { player: seat, feat: null };
    const now = this.abbaziaPoints(cell);
    cell.meeple = null;
    return (now - was) * w.ahead * w.parish;
  }

  /**
   * Who red pays for an Abbazia: the follower standing on it, flown or blown
   * there, as a cloister pays its monk; one nobody holds pays nobody. Until
   * 2026-10-28 it paid whoever had most followers round it, and with
   * followers staying on the board and walking, that was 57% of every point
   * scored (MODES.md, thirty-third pass).
   */
  abbaziaHolders(cell) {
    return cell.meeple ? [cell.meeple.player] : [];
  }

  /**
   * YELLOW — the roads (`roadPoints`).
   */
  scoreRoads() {
    const board = this.game.board;
    for (const d of board.allComponents()) {
      if (d.type !== 'road' || !d.meeples.length) continue;
      const cells = board.cellsOf(d);
      if (!cells.length) continue;
      const { pts, line } = this.roadPoints(d);
      this.payHolders(d, pts, line, cells);
    }
  }

  /**
   * What yellow pays a road: a point a tile, plus what each city it runs
   * into is worth, 1 for one still open and 2 for one that has closed. WHOSE
   * city that is doesn't matter: a road is paid for what it reaches.
   */
  roadPoints(d) {
    const board = this.game.board;
    const cells = board.cellsOf(d);
    const isle = cells.length > 0 && this.onIsland(cells[0]);
    const per = isle ? RATE.road.isle : RATE.road.main;
    let pts = per * d.tiles.size;
    // Cities the road arrives at, deduped: one city sprawling over four of
    // the road's tiles is one city and is counted once.
    const seen = new Set();
    let reached = 0;
    const reach = (city) => {
      if (!city) return;
      const root = board.find(city.parts[0]);
      if (seen.has(root)) return;
      seen.add(root);
      reached++;
      const key2 = city.open === 0 ? 'roadCityDone' : 'roadCity';
      pts += isle ? RATE[key2].isle : RATE[key2].main;
    };
    const mine = board.find(d.parts[0]);
    for (const cell of cells) {
      cell.type.feats.forEach((f, i) => {
        if (f.type === 'city') reach(board.featureOf(cell.x, cell.y, i));
      });
      // …and the city behind a wall the road runs into: it ends at a gate
      // in the middle of that wall (2026-10-25), and through the gate is
      // the city.
      for (let s = 0; s < 4; s++) {
        const fi = board.featAt(cell, s);
        if (fi == null || board.find(`${key(cell)}#${fi}`) !== mine) continue;
        const nb = board.neighbor(cell.x, cell.y, s);
        if (!nb || board.edgeAt(nb, opposite(s)) !== WALL) continue;
        const di = nb.type.feats.findIndex((g) => g.district);
        if (di >= 0) reach(board.featureOf(nb.x, nb.y, di));
      }
    }
    const line = `Road of ${d.tiles.size} tile${d.tiles.size === 1 ? '' : 's'}`
      + `${reached ? ` into ${reached} cit${reached === 1 ? 'y' : 'ies'}` : ''}`
      + `${isle ? ' out on an island' : ''}`;
    return { pts, line };
  }

  /**
   * Pay a component's majority. NOBODY COMES HOME FOR IT (Timothy,
   * 2026-10-28: "followers no longer come back in general, even from
   * roads"): a follower stays where it is, paid by every tower of its colour
   * that fires, until the wind, a flight or a move takes it elsewhere. The
   * brake on that is the wind (a closed city blown open costs its holders a
   * point a district, rule 53) and having only eight.
   *
   * From the thirteenth pass to then, a feature a tower paid was emptied,
   * its followers home or walking on down a road (the walk, rule 14); a city
   * kept its followers from earlier that day.
   */
  payHolders(d, pts, line, cells) {
    const g = this.game;
    if (pts <= 0) return;
    const where = cells.map((c) => ({ x: c.x, y: c.y }));
    for (const p of g.board.majority(d)) {
      this.pay(p, pts, `${line} — ${g.players[p].name}`, where);
    }
  }

  // --- moving a follower (rule 82) --------------------------------------------
  //
  // Instead of claiming, a follower already on the board may MOVE (Timothy,
  // 2026-10-28: "instead of placing a meeple, you can move a meeple instead.
  // And meeple can move, they can move one space for their turn. And if they
  // move using a road, they can move all the way down the road"). It is what
  // makes staying in a city a choice: a city keeps its followers through
  // every tower that pays it, and the wind can blow it open under them.
  //
  // It goes in two clicks, as the flying machine does: pick the follower,
  // which lifts it into your hand (`striding`), then pick where it goes from
  // the same targets a claim uses (`flightTargets`), so the host's own claim
  // puts it down. Not put down by the end of the step, it goes back.

  /**
   * Where the follower at (x, y) could move to: the four squares beside it
   * (across the map's edge too, never through a wall but at a gate,
   * `gateOpen`), and every square of a road running across
   * its tile, and of any road that one hops to (rule 15), unless somebody
   * else has a follower on it. Never a square with a figure on it or an
   * Abbazia. On each it keeps what it held, if that runs onto the square (a
   * road walked down, a city crossed, closed or not), or takes up a feature
   * nobody holds (`freeToTake`), or, with neither there, stands holding
   * nothing.
   *
   * Asked with the follower still standing, so it is lifted for the asking.
   */
  strideTargets(x, y) {
    const g = this.game;
    const board = g.board;
    const cell = board.get(x, y);
    const m = cell?.meeple;
    if (!m) return [];
    const d0 = m.feat != null ? board.featureOf(x, y, m.feat) : null;
    const idx = d0 ? d0.meeples.findIndex((o) => o.x === x && o.y === y) : -1;
    const held = idx >= 0 ? d0.meeples.splice(idx, 1)[0] : null;
    cell.meeple = null;
    try {
      const squares = new Map();
      const add = (c) => {
        if (!c || c === cell || c.meeple || hasMark(c, 'abbazia')) return;
        // Only the tile on top of its square: a road's cells can include one
        // buried under another (the stack modifier).
        if (board.get(c.x, c.y) !== c) return;
        squares.set(key(c), c);
      };
      SIDE_STEP.forEach(([dx, dy], dir) => {
        const n = board.norm(x + dx, y + dy);
        const there = board.get(n.x, n.y);
        if (there && this.gateOpen(cell, dir, there)) add(there);
      });
      const seen = new Set();
      cell.type.feats.forEach((f, i) => {
        if (f.type !== 'road') return;
        const road = board.featureOf(x, y, i);
        if (!road) return;
        const root = board.find(road.parts[0]);
        if (seen.has(root)) return;
        seen.add(root);
        if (road.meeples.some((o) => o.player !== m.player)) return;
        const reach = [road];
        for (const other of board.hopsFrom(root)) {
          if (seen.has(other)) continue;
          seen.add(other);
          const d = board.data.get(other);
          if (d && !d.meeples.some((o) => o.player !== m.player)) reach.push(d);
        }
        for (const d of reach) for (const c of board.cellsOf(d)) add(c);
      });
      const out = [];
      for (const c of squares.values()) {
        const here = claimableFeatures(c.type, { fields: g.has('fields') })
          .filter(({ i, f }) => (d0 && board.featureOf(c.x, c.y, i) === d0
            && !(f.type === 'city' && !f.district)) || this.freeToTake(c, i, f))
          .map(({ i, f }) => ({ x: c.x, y: c.y, i, f, moving: true }));
        out.push(...(here.length ? here : [{ x: c.x, y: c.y, i: null, f: null, moving: true, what: 'square' }]));
      }
      return out;
    } finally {
      cell.meeple = m;
      if (held) d0.meeples.splice(idx, 0, held);
    }
  }

  /**
   * May a follower step from `cell` to `there`, the square `dir` of it? Not
   * across a city wall, on either tile's edge, unless a road meets the wall
   * there: a gate (rule 68). So a city no road runs into is walked out of no
   * way but down a road of its own (Timothy, 2026-10-28: "meeple can move
   * past walls, that have to have a road meet the wall to be able to move
   * through them").
   */
  gateOpen(cell, dir, there) {
    const board = this.game.board;
    const out = board.edgeAt(cell, dir);
    const back = board.edgeAt(there, opposite(dir));
    if (out !== WALL && back !== WALL) return true;
    return (out === WALL && back === 'r') || (back === WALL && out === 'r');
  }

  /** Your followers on the board that have somewhere to move to. */
  striders() {
    const seat = this.game.current;
    return this.tiles()
      .filter((c) => c.meeple?.player === seat && this.strideTargets(c.x, c.y).length)
      .map((c) => ({ x: c.x, y: c.y }));
  }

  /** Could a follower move this step? Cheaper than `striders`: the first one will do. */
  hasStrider() {
    const seat = this.game.current;
    return this.tiles().some((c) => c.meeple?.player === seat && this.strideTargets(c.x, c.y).length);
  }

  canStride() {
    return this.game.phase === 'meeple' && !this.striding && !this.lifted && this.hasStrider();
  }

  beginStride() {
    if (!this.canStride()) return false;
    this.strideFrom = this.striders();
    this.game.phase = 'stride';
    return true;
  }

  /** The first click: lift the follower at (x, y) into your hand. */
  pickStrider(x, y) {
    const g = this.game;
    if (!this.strideFrom?.some((o) => o.x === x && o.y === y)) return false;
    const cell = g.board.get(x, y);
    const m = cell.meeple;
    const targets = this.strideTargets(x, y);
    g.sendHome(cell);
    g.board.rebuild();
    this.striding = { from: { x, y }, m, targets, seat: g.current, supply: g.players[g.current].meeples };
    this.strideFrom = null;
    g.phase = 'meeple';
    g.say(`${g.player.name} moves the follower at (${x}, ${y}).`);
    return true;
  }

  /**
   * Put a lifted follower back where it stood, if it was not set down: the
   * step ended (skipped, or put back by the button) with it still in hand.
   * Placing it takes one out of the supply, so the supply says which.
   */
  settleStride() {
    const s = this.striding;
    if (!s) return;
    this.striding = null;
    const g = this.game;
    const owner = g.players[s.seat];
    if (owner.meeples !== s.supply) return;            // it was put down
    const cell = g.board.get(s.from.x, s.from.y);
    if (!cell || cell.meeple) return;                  // nowhere to go back to: it stays home
    if (s.m.feat == null) cell.meeple = { ...s.m };
    else g.board.addMeeple(s.from.x, s.from.y, s.m.feat, s.seat, { big: s.m.big, kind: s.m.kind });
    owner.meeples--;
    if (s.m.big) owner.big--;
    g.board.rebuild();
  }

  /** The button: changed your mind, the follower goes back. */
  unstride() {
    const g = this.game;
    if (g.phase === 'stride') { this.strideFrom = null; g.phase = 'meeple'; return true; }
    if (g.phase !== 'meeple' || !this.striding) return false;
    this.settleStride();
    return true;
  }

  // --- the keep (rules 84 and 85) ------------------------------------------
  //
  // A keep district is a tower that grows upwards (Timothy, 2026-10-28: "you
  // have tower pieces and can place them to stack the tower instead of place
  // or moving a meeple"). Every piece doubles what its district pays, and the
  // wind brings it down: a keep whose tile the wind moves loses every piece
  // on it, and they are gone.

  /** Every keep that can take another piece. */
  keepTargets() {
    return this.tiles()
      .filter((c) => c.type.feats.some((f) => f.district === 'keep') && (c.keep || 0) < KEEP_MAX)
      .map((c) => ({ x: c.x, y: c.y }));
  }

  canBuildKeep() {
    const g = this.game;
    return g.phase === 'meeple' && !this.striding && !this.lifted
      && (g.player.keeps || 0) > 0 && this.keepTargets().length > 0;
  }

  /** Instead of claiming or moving: pick a keep to build up. */
  beginKeep() {
    if (!this.canBuildKeep()) return false;
    this.game.phase = 'keep';
    return true;
  }

  buildKeep(x, y) {
    const g = this.game;
    if (g.phase !== 'keep' || !this.keepTargets().some((t) => t.x === x && t.y === y)) return false;
    const cell = g.board.get(x, y);
    cell.keep = (cell.keep || 0) + 1;
    g.player.keeps--;
    g.say(`${g.player.name} builds the keep at (${x}, ${y}) up: ${cell.keep} high, ${2 ** cell.keep} times what its district pays.`);
    g.emit('landmark');
    g.phase = 'meeple';
    g.endTurn();
    return true;
  }

  cancelKeep() {
    if (this.game.phase !== 'keep') return false;
    this.game.phase = 'meeple';
    return true;
  }

  /** The wind moved this tile: a keep on it comes down, and its pieces are lost. */
  collapseKeep(cell) {
    if (!cell?.keep) return;
    const n = cell.keep;
    cell.keep = 0;
    this.game.say(`The keep that was at (${cell.x}, ${cell.y}) comes down in the wind: ${n} piece${n === 1 ? '' : 's'} lost.`);
  }

  // --- the Calcolo (rules 86 and 87) ------------------------------------------
  //
  // A square stone, one for the whole table (Timothy, 2026-10-28: "a square
  // stone that can be moved instead of blowing something that turn. it cannot
  // be blown, so putting but behind a lanes of tiles stops that lane from
  // moving, and also in turn enables you to just move meeple instead"; asked,
  // one shared, anywhere). It starts off the board. Instead of your blow you
  // may set it down on any empty square of sky. Nothing is laid, pushed or
  // moved on into its square (`shut`), and no zephyr blows from it, so a push
  // whose front tile would go there is too heavy and blows the followers on
  // its tiles instead.

  /** Every square the Calcolo may be set down on. */
  calcoloTargets() {
    const board = this.game.board;
    const b = board.bounds;
    if (!b) return [];
    const out = [];
    for (let y = b.minY; y <= b.maxY; y++) {
      for (let x = b.minX; x <= b.maxX; x++) {
        if (board.get(x, y) || this.keptFor(x, y) || this.stoneAt(x, y)) continue;
        out.push({ x, y });
      }
    }
    return out;
  }

  canCalcolo() {
    return this.game.phase === 'blow' && !this.blown && this.calcoloTargets().length > 0;
  }

  beginCalcolo() {
    if (!this.canCalcolo()) return false;
    this.game.phase = 'calcolo';
    return true;
  }

  cancelCalcolo() {
    if (this.game.phase !== 'calcolo') return false;
    this.game.phase = 'blow';
    return true;
  }

  /** Set the stone down at (x, y): that is this turn's blow. */
  placeCalcolo(x, y) {
    const g = this.game;
    if (g.phase !== 'calcolo' || !this.calcoloTargets().some((t) => t.x === x && t.y === y)) return false;
    const was = this.calcolo;
    this.calcolo = g.board.norm(x, y);
    this.blown = true;
    g.say(`${g.player.name} sets the Calcolo down at (${x}, ${y})${was ? `, from (${was.x}, ${was.y})` : ''}, and does not blow.`);
    g.emit('landmark');
    g.phase = 'meeple';
    g.endTurn();
    return true;
  }

  // --- the Balena -----------------------------------------------------------
  //
  // A whale the size of a district, and the only brake in the mode. It is not
  // anybody's piece: whoever is willing to spend their follower placement on
  // it decides what the weather can't touch this turn.

  /** Keep `cell.balena` true on exactly one square, wherever it drifted to. */
  settleBalena() {
    const board = this.game.board;
    for (const cell of board.cells.values()) cell.balena = false;
    if (!this.balena) return;
    let cell = board.get(this.balena.x, this.balena.y);
    // The whale can't be blown, but the tile under it can be taken off the
    // board other ways. If its perch has gone, it settles on the nearest one.
    if (!cell) {
      let best = null;
      for (const c of board.cells.values()) {
        const d = Math.abs(c.x - this.balena.x) + Math.abs(c.y - this.balena.y);
        if (!best || d < best.d) best = { c, d };
      }
      if (!best) { this.balena = null; return; }
      cell = best.c;
      this.balena = { x: cell.x, y: cell.y };
    }
    cell.balena = true;
  }

  /**
   * Anywhere on the board — that's the whole of it. It used to swim three
   * squares, which meant the whale could only ever shelter the neighbourhood
   * it was already in, and the tile you actually wanted saved was reliably
   * four squares away. A brake anybody can pick up is only a brake if it can
   * reach the thing that needs stopping.
   */
  balenaTargets() {
    if (!this.balena) return [];
    const out = [];
    for (const cell of this.tiles()) {
      if (cell.x === this.balena.x && cell.y === this.balena.y) continue;
      out.push({ x: cell.x, y: cell.y });
    }
    return out;
  }

  canSwim() {
    return this.game.phase === 'meeple' && !this.striding && !this.balenaMoved && this.balenaTargets().length > 0;
  }

  /**
   * There is very often nothing to claim on the tile you just laid — roads
   * belong to nobody now — and the host would skip the follower step entirely.
   * The whale is spent INSTEAD of a follower, so the step has to stay open for
   * as long as there is a whale to send.
   */
  holdsMeeplePhase() {
    return !!this.lifted || !!this.striding || this.flightLifts().length > 0
      || (!this.balenaMoved && this.balenaTargets().length > 0)
      || this.hasStrider()
      || ((this.game.player.keeps || 0) > 0 && this.keepTargets().length > 0);
  }

  /** Instead of putting a follower down: send the whale somewhere. */
  beginSwim() {
    if (!this.canSwim()) return false;
    this.game.phase = 'balena';
    this.game.say(`${this.game.player.name} calls the Balena.`);
    return true;
  }

  onCellClick(x, y) {
    if (this.game.phase === 'stride') return this.pickStrider(x, y);
    if (this.game.phase === 'keep') return this.buildKeep(x, y);
    if (this.game.phase === 'calcolo') return this.placeCalcolo(x, y);
    if (this.game.phase === 'flight') return this.liftAt(x, y);
    if (this.game.phase === 'blow') return this.blowAt(x, y);
    if (this.game.phase === 'astray') return this.sendAstray(x, y);
    if (this.game.phase !== 'balena') return false;
    if (!this.balenaTargets().some((t) => t.x === x && t.y === y)) return false;
    this.balena = { x, y };
    this.balenaMoved = true;
    this.settleBalena();
    this.game.say(`The Balena settles over (${x}, ${y}) — nothing there moves while it stays.`);
    this.game.emit('landmark');
    this.game.endTurn();
    return true;
  }

  // --- your zephyr ------------------------------------------------------------
  //
  // Every turn, after the follower step, you blow (Timothy, 2026-10-27; it
  // was a stick you could push with instead of claiming, 2026-10-26, and a
  // cloud before that). Turn it (R) to the way you mean to blow, then pick
  // the tile to put it against. That tile and every one touching in front of
  // it, up to the first gap, go a square, if your push power will move them;
  // every zephyr tile among them pushes in its turn (wind.js `blow`).

  /** R, or the button: the zephyr in hand turns a quarter. */
  turnOther(dir = 1) {
    if (this.game.phase !== 'blow') return false;
    this.blowDir = (this.blowDir + dir + 4) % 4;
    return true;
  }

  /** Everybody's push power: 1, and 1 more for every Abbazia on the board. */
  pushPower() {
    let n = BASE_PUSH;
    for (const c of this.tiles()) if (hasMark(c, 'abbazia')) n++;
    return n;
  }

  /** The tiles on the board you can see (a tide may have drowned some). */
  tiles() {
    const board = this.game.board;
    return [...board.cells.values()].filter((c) => board.get(c.x, c.y) === c);
  }

  /** A tile no push moves: a tower, or the whale's. */
  /**
   * AN ANCHOR: a quarter of a big tower or a half of a tower that has closed
   * (Timothy, 2026-10-28: "complete towers, and big tower quarters"). No push
   * moves one, and it holds the lane still up to it; what is past it is
   * pushed (wind.js `pushOnce`). An open tower half is pushed like any tile.
   */
  holds(cell) { return isQuarter(cell) || closedHalf(this.game.board, cell) || immovable(cell); }

  /**
   * NO CUTTING: your zephyr blows from open sky, never from between two
   * tiles (Timothy, 2026-10-28: "you can't only push from an open space, no
   * from inbetween two tiles that are next to each other"). The square
   * behind the tile, against the wind, must be empty.
   */
  openBehind(x, y, dir) {
    const board = this.game.board;
    const [dx, dy] = SIDE_STEP[dir];
    const sq = board.norm(x - dx, y - dy);
    if (board.bounds && !board.wraps && !board.inBounds(sq.x, sq.y)) return true;
    return !board.get(sq.x, sq.y) && !this.stoneAt(sq.x, sq.y);
  }

  /**
   * What a blow against (x, y) the current way would do first: the run of
   * tiles in front of it, and whether it is too heavy to move (in which case
   * it blows the followers on the first `power` of them instead).
   */
  trainAt(x, y, dir = this.blowDir) {
    const board = this.game.board;
    if (!board.get(x, y) || !this.openBehind(x, y, dir)) return null;
    const { cells, ring } = runFrom(board, { x, y }, dir);
    const lane = this.laneOf(cells, ring, this.pushPower(), dir);
    return { cells: lane.pushed, heavy: lane.heavy, held: lane.held };
  }

  /**
   * A push on a lane, the same test the wind makes (wind.js, pushOnce): what
   * its anchors hold still (up to the last one), what it pushes past them,
   * and whether that is too heavy to move (longer than its power, or the big
   * tower's kept 2x2 where its front tile would go), in which case it blows
   * the followers on the first `power` of them instead.
   */
  laneOf(cells, ring, power, dir) {
    let held = 0;
    for (let i = cells.length - 1; i >= 0; i--) if (this.holds(cells[i])) { held = i + 1; break; }
    const run = cells.slice(held);
    const last = run[run.length - 1];
    const heavy = !!run.length && (ring || run.length > power
      || this.shut(last.x + SIDE_STEP[dir][0], last.y + SIDE_STEP[dir][1]));
    return { held: cells.slice(0, held), run, heavy, pushed: heavy ? run.slice(0, power) : run };
  }

  /** Every tile a blow the current way may go against: one with open sky behind it. */
  blowTargets(dir = this.blowDir) {
    return this.tiles().filter((c) => this.openBehind(c.x, c.y, dir)).map((c) => ({ x: c.x, y: c.y }));
  }

  /** Blow against (x, y), and the turn ends once what it moved has settled. */
  blowAt(x, y) {
    const g = this.game;
    if (g.phase !== 'blow' || !g.board.get(x, y)) return false;
    if (!this.openBehind(x, y, this.blowDir)) {
      g.say('Your zephyr blows from open sky: it cannot get between two tiles.');
      return false;
    }
    const dir = this.blowDir;
    const power = this.pushPower();
    this.blown = true;
    this.blows++;
    g.phase = 'meeple';
    g.say(`${g.player.name} blows ${DIR_NAMES[dir]} at (${x}, ${y}), with a push of ${power}.`);
    g.emit('landmark');
    this.blowing = true;
    this.stormAt = 0;
    this.stormN = 0;
    this.slidesEnd = 0;
    this.blame = g.current;
    try {
      const reports = blow(g.board, { at: { x, y }, dir, power, holds: (c) => this.holds(c), keepOut: (kx, ky) => this.shut(kx, ky) });
      for (const r of reports) this.applyGust(r);
      this.windUntil(this.slidesEnd);
      this.settleBalena();
      this.reopen();
      this.settle(g.current);
    } finally {
      this.blowing = false;
      this.blame = null;
    }
    this.joinSferas();
    // What no longer fits moves on, and then the turn ends.
    this.astrayThen = 'end';
    if (this.resolveAstray()) return true;
    this.afterAstray();
    return true;
  }

  // --- a tile that no longer fits moves on -------------------------------------
  //
  // Timothy, 2026-10-26: "Instead of the tiles that crack falling ... into
  // nowhere land, if there's room for that tile to move, then you can
  // basically move the tile one space away [of] your choice so that it is no
  // longer mismatched with anything. If it is completely surrounded by tiles,
  // then yes, it still falls into nowhere land." Asked, he chose that it MUST
  // move when it can, and that one with room but no square that fits beside
  // it "keeps going".
  //
  // So a tile a push moved (the stick's then, the blow's now) that comes to rest
  // against an edge it does not meet moves on, before anything else happens:
  // the player whose turn it is picks a way, and it slides that way square by
  // square to the first empty square where every edge meets what is beside it
  // (or nothing is). It cannot pass through a tile, so a way blocked before
  // it fits is no way. With one way it just goes; with none it falls, back on
  // top of the deck. Until then the seam it does not meet joins nothing
  // (Board.cracks), so it is loose from everything it disagrees with.

  /** The tiles moved this turn that meet a neighbour they do not match, in the order they moved. */
  collectAstray() {
    const board = this.game.board;
    const loose = (c) => board.get(c.x, c.y) === c && board.degree(c.x, c.y) > 0 && !fitsAll(board, c);
    for (const c of this.movedNow) if (!this.astray.includes(c)) this.astray.push(c);
    this.movedNow.clear();
    this.astray = this.astray.filter(loose);
    return this.astray;
  }

  /** Could `cell` stand on the square `sq` with every edge meeting what is beside it? */
  fitsAt(cell, sq) {
    const board = this.game.board;
    for (let s = 0; s < 4; s++) {
      const [dx, dy] = SIDE_STEP[s];
      const nb = board.get(sq.x + dx, sq.y + dy);
      if (!nb || nb === cell) continue;
      if (!edgesMeet(board.edgeAt(cell, s), board.edgeAt(nb, opposite(s)))) return false;
    }
    return true;
  }

  /**
   * Where a loose tile can move on to: each way, the first empty square it
   * fits on, if it gets there before running into a tile. Round the seam of
   * the map, at most a lap.
   */
  astrayTargets(cell) {
    const board = this.game.board;
    const out = [];
    for (let dir = 0; dir < 4; dir++) {
      const [dx, dy] = SIDE_STEP[dir];
      const lap = board.wraps ? (dx === 0 ? board.span.h : board.span.w) : 64;
      for (let n = 1; n < lap; n++) {
        const sq = board.norm(cell.x + dx * n, cell.y + dy * n);
        if (board.bounds && !board.wraps && !board.inBounds(sq.x, sq.y)) break;
        if (board.get(sq.x, sq.y) || this.shut(sq.x, sq.y)) break;   // a tile in the way, the big tower's, or the Calcolo's
        if (this.fitsAt(cell, sq)) { out.push({ x: sq.x, y: sq.y, dir, n }); break; }
      }
    }
    return out;
  }

  /**
   * Settle every loose tile that leaves nothing to choose (one way, or none),
   * and stop at the first with a choice. True if a choice is waiting.
   */
  resolveAstray() {
    const g = this.game;
    for (let guard = 0; guard < 200; guard++) {
      this.collectAstray();
      const cell = this.astray[0];
      if (!cell) break;
      const targets = this.astrayTargets(cell);
      if (targets.length > 1) {
        this.astrayAt = { cell, targets };
        g.phase = 'astray';
        return true;
      }
      this.astray.shift();
      if (targets.length) this.moveOn(cell, targets[0]); else this.fallLoose(cell);
    }
    this.astrayAt = null;
    return false;
  }

  /** The player's choice for the loose tile in question: a square it can move on to. */
  sendAstray(x, y) {
    const g = this.game;
    if (g.phase !== 'astray' || !this.astrayAt) return false;
    const t = this.astrayAt.targets.find((q) => q.x === x && q.y === y);
    if (!t) return false;
    const { cell } = this.astrayAt;
    this.astray.shift();
    this.astrayAt = null;
    this.moveOn(cell, t);
    if (this.resolveAstray()) return true;
    this.afterAstray();
    return true;
  }

  /** Slide a loose tile on to where it fits, and settle what that changes. */
  moveOn(cell, t) {
    const g = this.game;
    const from = { x: cell.x, y: cell.y };
    if (!g.board.shift(from, { x: t.x, y: t.y })) return;
    g.board.rebuild();
    this.movedOn++;
    this.collapseKeep(cell);
    g.say(`The tile at (${from.x}, ${from.y}) no longer fits, and moves on ${t.n} square${t.n > 1 ? 's' : ''} ${DIR_NAMES[t.dir]}.`);
    // On screen, after the push that moved it has landed: a ring on it, then
    // the slide. They used to start together, and the tile seemed to jump.
    const wait = this.afterWind();
    g.emit('wake', { at: { x: from.x + 0.5, y: from.y + 0.5 }, delay: wait });
    g.emit('gust', { dir: t.dir, delay: wait + MOVE_ON_PAUSE, hold: wait, moves: [this.slide(cell, from, t.dir, t.n)], fell: [] });
    this.windUntil(wait + MOVE_ON_PAUSE + DESIGN.storm.tileGlide);
    this.settleBalena();
    this.reopen();
    this.settle(g.current);
    this.joinSferas();
  }

  /**
   * How long, from now, until the wind on screen has finished: what moves on
   * waits for it, so each step can be watched. `windUntil` sets it.
   */
  afterWind() {
    const c = this.stormClock;
    return c ? Math.max(0, c.until - (Date.now() - c.at)) : 0;
  }

  windUntil(ms) { this.stormClock = { at: Date.now(), until: ms }; }

  /** A loose tile with every way blocked falls, back on top of the deck. */
  fallLoose(cell) {
    const g = this.game;
    const fell = { x: cell.x, y: cell.y, type: cell.type, rot: cell.rot, look: cell.seq };
    if (cell.meeple) {
      g.players[cell.meeple.player].meeples++;
      if (cell.meeple.big) g.players[cell.meeple.player].big++;
      g.say(`${g.players[cell.meeple.player].name}'s follower goes down with its tile and comes home.`);
      cell.meeple = null;
    }
    g.board.remove(cell.x, cell.y);
    g.deck.push(cell.key || cell.type.id);
    this.fallen++;
    g.say(`The tile at (${fell.x}, ${fell.y}) no longer fits and has nowhere to go: it falls, back to the top of the deck.`);
    g.emit('gust', { dir: 0, delay: this.afterWind() + 120, moves: [], fell: [fell] });
    // Out of the sky by your own hand: one more tile this turn (rule 9).
    if (!this.caught) {
      this.caught = true;
      g.tilesLeft++;
      g.say(`${g.player.name} catches it, and throws it straight back down: one more tile this turn.`);
    }
    this.settleBalena();
    this.reopen();
    this.settle(g.current);
    this.joinSferas();
  }

  /**
   * Every loose tile has moved on or fallen: carry on with the turn. A walk a
   * tower opened meanwhile comes first; then the follower step after a
   * placement, or the end of the turn after the blow.
   */
  afterAstray() {
    const g = this.game;
    if (g.phase === 'over') return;
    g.phase = 'meeple';
    if (this.astrayThen === 'end') { g.endTurn(); return; }
    if (!g.meepleOptions().length && !this.holdsMeeplePhase()) g.endTurn();
  }

  // --- flying machines ------------------------------------------------------

  /**
   * The lane a machine sends a follower down: straight out the way it points,
   * over whatever tiles are there, until the country runs out — but a zephyr
   * crossed on the way is a wind you're in, not a wind you watch, so the
   * flight turns and follows it.
   */
  flightPath(cell) {
    const flier = cell.type.marks.find((m) => m.kind === 'flier');
    if (!flier) return null;
    const board = this.game.board;
    let dir = worldDir(cell, flier);
    let { x, y } = cell;
    const path = [];
    // Its own square too: round a wrapping world a flight can come all the
    // way back to the machine it took off from.
    const seen = new Set([`${x},${y}`]);
    for (let step = 0; step < FLIGHT_RANGE; step++) {
      const [dx, dy] = SIDE_STEP[dir];
      ({ x, y } = board.norm(x + dx, y + dy));
      const k = `${x},${y}`;
      if (seen.has(k)) break;                    // zephyrs pointed in a circle
      seen.add(k);
      // Open sky is something a flying machine crosses, not something that
      // stops it: reaching an island nobody has built a road to is most of
      // what the machine is for.
      const over = board.get(x, y);
      if (!over) continue;
      path.push(over);
      const winds = zephyrDirs(over);
      if (!winds.length || winds.includes(dir)) continue;
      const turn = winds.find((d) => d !== opposite(dir));
      if (turn == null) break;
      dir = turn;
    }
    return path.length ? path : null;
  }

  /**
   * Anywhere along that flight will do — and unlike an ordinary claim, it
   * doesn't matter whether somebody already holds the feature, and the island
   * rule doesn't apply. Flying out to one is the one way to CHOOSE to be
   * there. What it can't do is land on a tile with a figure already on it.
   *
   * If a follower has been LIFTED off the path, the flight carries on from
   * where it picked them up: only squares further along the lane are offered,
   * because the machine is flying, not turning round.
   */
  flightTargets() {
    // A follower being moved goes where the move reaches, not along a flight.
    if (this.striding) return this.striding.targets;
    const homes = this.homeTargets();
    if (!this.flight) return homes;
    return [...this.flightOnly(), ...homes];
  }

  /**
   * A RESIDENTIAL district takes another of yours in a city you hold, open or
   * closed, wherever it is on the board (Timothy, 2026-10-28: "allows you to
   * place meeple there on your turn if you own that city, even if you already
   * have meeple there"): the one claim into a feature somebody is in. Held
   * means you have the most followers in it, tied or not.
   */
  homeTargets() {
    const g = this.game;
    const board = g.board;
    const out = [];
    for (const cell of this.tiles()) {
      if (cell.meeple) continue;
      const i = cell.type.feats.findIndex((f) => f.district === 'residential');
      if (i < 0) continue;
      const d = board.featureOf(cell.x, cell.y, i);
      if (!d?.meeples.length || !board.majority(d).includes(g.current)) continue;
      out.push({ x: cell.x, y: cell.y, i, f: cell.type.feats[i], home: true });
    }
    return out;
  }

  /** The squares along this turn's flight a follower may be set down on. */
  flightOnly() {
    if (!this.flight) return [];
    const board = this.game.board;
    const from = this.lifted ? this.lifted.step + 1 : 0;
    const out = [];
    this.flight.forEach((cell, step) => {
      if (step < from) return;
      if (!board.get(cell.x, cell.y) || cell.meeple) return;
      // An empty Abbazia along the flight is held outright by the follower
      // set down on it (rule 48); it has no feature to claim.
      if (hasMark(cell, 'abbazia')) { out.push({ x: cell.x, y: cell.y, i: null, f: null, flying: true, what: 'Abbazia' }); return; }
      for (const { i, f } of claimableFeatures(cell.type, { fields: this.game.has('fields') })) {
        if (this.freeToTake(cell, i, f)) out.push({ x: cell.x, y: cell.y, i, f, flying: true });
      }
    });
    return out;
  }

  // --- the flying machine's other two verbs ---------------------------------
  //
  // A machine can put a follower DOWN on its lane, or it can pick one UP. The
  // second is the one that matters in a mode where nothing else ever comes
  // home: a figure you put in a city three storms ago, out on a rock you have
  // stopped caring about, is a figure you can go and fetch. Having fetched it
  // you may set it down again further along the same flight, or bring it home.

  /** Your own followers standing along this turn's flight. */
  flightLifts() {
    if (!this.flight || this.lifted) return [];
    const board = this.game.board;
    const out = [];
    this.flight.forEach((cell, step) => {
      if (board.get(cell.x, cell.y) !== cell) return;
      if (cell.meeple?.player !== this.game.current) return;
      out.push({ x: cell.x, y: cell.y, step });
    });
    return out;
  }

  canLift() {
    return this.game.phase === 'meeple' && !this.striding && this.flightLifts().length > 0;
  }

  beginLift() {
    if (!this.canLift()) return false;
    this.game.phase = 'flight';
    this.game.say(`${this.game.player.name} sends the flying machine down the lane to pick somebody up.`);
    return true;
  }

  /**
   * Lift one off. The follower goes straight back into its owner's supply,
   * which is also how it gets spent again if they set it down further along —
   * placing takes one out of the supply, so a lift-and-place nets to nothing
   * and a lift-and-leave gives a follower back.
   */
  liftAt(x, y) {
    const spot = this.flightLifts().find((o) => o.x === x && o.y === y);
    if (!spot) return false;
    const g = this.game;
    const cell = g.board.get(x, y);
    const m = cell.meeple;
    g.sendHome(cell);
    this.lifted = { step: spot.step, from: { x, y }, big: !!m.big };
    g.board.rebuild();
    g.phase = 'meeple';
    g.say(`${g.player.name}'s follower is lifted off (${x}, ${y}) — it may ride on down the lane, or go home.`);
    g.emit('meeple', { recall: true, player: m.player, at: { x: x + 0.5, y: y + 0.5 } });
    // Nowhere further to set it down: the flight ends and so does the turn.
    if (!this.flightTargets().length && !g.meepleOptions().length) g.endTurn();
    return true;
  }

  // --- the weather ----------------------------------------------------------

  /** Turn one gust's report into points, losses, log lines and pictures. */
  applyGust(r) {
    const g = this.game;
    this.pushes++;
    if (r.by) this.gusts++;
    for (const m of r.moved) { this.movedNow.add(m.cell); this.collapseKeep(m.cell); }
    const at = this.stormAt || 0;
    // The first gusts of a storm take a full beat; later ones come quicker, so
    // a six-gust chain reads as weather picking up pace rather than a queue.
    // Beats SHORTEN as a storm goes on: by the third corner you have
    // understood the shape and only want to see where it ends up. Never below
    // the floor, and both dials live in the design book.
    const BEAT = Math.max(DESIGN.storm.minBeat,
      DESIGN.storm.beat * (DESIGN.storm.decay ** (this.stormN || 0)));
    // The gust's own streak, down the lane it actually reached — and a beat on
    // the clock only if there was anything to watch.
    const acted = r.moved.length || r.fell.length || r.swung.length
      || r.homed.length || r.carried.length || r.lifted.length || r.zephyrs.length;
    if (r.from && acted) {
      const [dx, dy] = SIDE_STEP[r.dir];
      const far = r.reached.length
        ? Math.max(...r.reached.map((c) => (c.x - r.from.x) * dx + (c.y - r.from.y) * dy)) + 1
        : 2;
      g.emit('wind', {
        dir: r.dir, blast: !!r.blast, delay: at,
        legs: this.legs(r.from, r.dir, far),
      });
    }
    // Every zephyr this gust wakes flashes just before its own gust plays.
    for (const zz of r.zephyrs) {
      const w = zz.cell;
      g.emit('wake', { at: { x: w.x + 0.5, y: w.y + 0.5 }, blast: !!zz.blast, delay: at + BEAT * 0.55 });
    }
    if (acted) { this.stormAt = at + BEAT; this.stormN = (this.stormN || 0) + 1; }
    this.payTurbines(r.turbines);
    // A gust that found nothing has to SAY it found nothing. Nearly half the
    // zephyrs played point out over the edge of the country into open sky —
    // there is no run downwind, so there is no loose end and nothing happens —
    // and a silent nothing reads as a broken rule rather than as an empty lane.
    // (A gust that only knocked tiles out of the sky did something, and so
    // did one that blew a tile over the edge of a map that has one. Those
    // used to stop here, so a fallen tile never went back on the deck.)
    const who = r.by ? (r.blast ? 'The cannon' : 'The zephyr') : 'The blow';
    if (r.heavy && r.reached.length) {
      g.say(`${who} is too weak for the ${r.reached.length > 1 || !r.reached.length ? 'tiles' : 'tile'} in front of it`
        + `${r.carried.length ? `, and blows ${r.carried.length} follower${r.carried.length > 1 ? 's' : ''} a square instead` : ', and nobody standing there moves'}.`);
    }
    if (!r.moved.length && !r.fell.length && !r.swung.length && !r.homed.length && !r.lifted.length) {
      if (!r.reached.length) g.say(`${who} blows out over open sky and finds nothing to push.`);
      if (r.carried.length) this.stepFollowers(r, at);
      return;
    }

    g.emit('gust', {
      dir: r.dir,
      delay: at + 140,
      moves: r.moved.map((m) => this.slide(m.cell, m.from, r.dir, m.steps)),
      fell: r.fell.map((f) => ({ x: f.x, y: f.y, type: f.type, rot: f.rot, look: f.cell?.seq })),
    });
    // When the last slide of this blow lands: what moves on starts then.
    this.slidesEnd = Math.max(this.slidesEnd || 0, at + 140 + DESIGN.storm.tileGlide);
    if (r.moved.length) {
      g.say(`${who} ${r.blast ? 'fires' : 'pushes'} ${r.moved.length} tile${r.moved.length > 1 ? 's' : ''} ${DIR_NAMES[r.dir]}`
        + `${r.blast ? '' : ' a square'}.`);
    }

    // A TILE OUT OF THE SKY IS A TILE BACK IN YOUR HAND. Whatever took it —
    // fired down a lane with nothing in it, or landed where it fits nothing —
    // it goes back on top of the deck, and whoever set the wind off may throw
    // ONE of them straight back down this turn, while the hole the wind just
    // made is still open. That is what turns a big storm from bookkeeping into
    // a swing, and it is the only thing that gives back what the cannon takes.
    // Once a turn, however many fall.
    //
    // EXCEPT OFF THE MAP, on a map with an edge: a tile the wind carries over
    // it has gone into the aether, not into the deck. Soffiando's map wraps
    // (2026-10-25), so nothing goes that way any more.
    const gone = r.fell.filter((f) => f.why === 'aether');
    const back = r.fell.filter((f) => f.why !== 'aether');
    this.fallen += r.fell.length;
    this.lost += gone.length;
    if (gone.length) {
      g.say(`${gone.length} tile${gone.length > 1 ? 's fly' : ' flies'} off the edge of the map into the aether, gone for good.`);
    }
    if (back.length) {
      // The deck is drawn from its END, so the end is the top. These went on
      // the front until 2026-10-25, which is the BOTTOM: the tile you caught
      // was never the one that fell (found writing the rulebook).
      for (const f of back) g.deck.push(f.id);
      const fired = back.filter((f) => f.why === 'fired').length;
      const bad = back.length - fired;
      const said = [];
      if (fired) said.push(`${fired} tile${fired > 1 ? 's are' : ' is'} fired clean out of the world`);
      if (bad) said.push(`${bad} land${bad > 1 ? '' : 's'} where nothing fits`);
      g.say(`${said.join(' and ')} — back to the top of the deck.`);
    }
    if (back.length && this.blame === g.current && !this.caught) {
      this.caught = true;
      g.tilesLeft++;
      g.say(`${g.player.name} catches one out of the air, and throws it straight back down: one more tile this turn.`);
      g.emit('landmark');
    }

    // Followers travel with the weather. One the wind put down somewhere is
    // still on the board and still counts for whoever owns it; one it carried
    // out over open sky is the only figure that ever comes home by accident.
    this.stepFollowers(r, at);
    for (const m of r.homed) {
      g.players[m.player].meeples++;
      if (m.big) g.players[m.player].big++;
      g.say(m.why === 'fell'
        ? `${g.players[m.player].name}'s follower goes down with its tile and comes home.`
        : `${g.players[m.player].name}'s follower is blown into open sky and comes home.`);
      g.emit('meeple', { recall: true, player: m.player, at: { x: m.x + 0.5, y: m.y + 0.5 } });
    }

    if (r.swung.length) {
      g.say(`${r.swung.length} road${r.swung.length > 1 ? 's swing' : ' swings'} onto the wind.`);
    }
    this.joinSferas();
  }

  /**
   * Followers the wind put down somewhere: each steps there on screen. One
   * carried round the seam of the map comes in from beyond the edge across
   * from the one it left by, rather than back over the board.
   */
  stepFollowers(r, at) {
    const g = this.game;
    for (const m of r.carried) {
      const d = this.ahead(m.from, m.to, r.dir);
      const [dx, dy] = SIDE_STEP[r.dir];
      const from = d != null ? { x: m.to.x - dx * d, y: m.to.y - dy * d } : m.from;
      g.emit('step', {
        from: { x: from.x + 0.5, y: from.y + 0.5 },
        at: { x: m.to.x + 0.5, y: m.to.y + 0.5 },
        key: `meeple:${m.to.x},${m.to.y}`, player: m.player,
        delay: at + 220,
      });
    }
  }

  /**
   * A tile the wind moved, as the picture shows it: from where it was to where
   * it is. Round the seam of the map that is two slides, one off the edge it
   * left by and one in from the edge across from it, because a tile that
   * zipped back over the whole board to get one square east would read as a
   * different rule entirely.
   */
  slide(cell, from, dir, steps) {
    const [dx, dy] = SIDE_STEP[dir];
    const out = {
      from: { x: from.x + 0.5, y: from.y + 0.5 },
      at: { x: cell.x + 0.5, y: cell.y + 0.5 },
      type: cell.type, rot: cell.rot, look: cell.seq,
    };
    const via = { x: from.x + dx * steps + 0.5, y: from.y + dy * steps + 0.5 };
    if (via.x !== out.at.x || via.y !== out.at.y) out.via = via;
    return out;
  }

  /**
   * How many squares downwind of `from` the square `to` is, round the seam of
   * a wrapping map if need be, or null if it is not straight downwind.
   */
  ahead(from, to, dir) {
    const board = this.game.board;
    const [dx, dy] = SIDE_STEP[dir];
    if (dx === 0 ? from.x !== to.x : from.y !== to.y) return null;
    const d = (to.x - from.x) * dx + (to.y - from.y) * dy;
    if (!board.wraps) return d > 0 ? d : null;
    const lap = dx === 0 ? board.span.h : board.span.w;
    return ((d % lap) + lap) % lap || null;
  }

  /**
   * A gust's streak, `far` squares down its lane from `from`: one leg, or on a
   * wrapping map as many as it takes to go round, each running from where it
   * comes on to where it goes off (or ends), with its share of the length.
   */
  legs(from, dir, far) {
    const board = this.game.board;
    const [dx, dy] = SIDE_STEP[dir];
    if (!board.wraps) return [{ from: { x: from.x, y: from.y }, to: { x: from.x + dx * far, y: from.y + dy * far }, share: 1 }];
    const b = board.bounds;
    const out = [];
    let at = board.norm(from.x, from.y), left = far;
    while (left > 0 && out.length < 4) {
      // Squares from here to the edge downwind, and the square past it.
      const room = dx > 0 ? b.maxX - at.x : dx < 0 ? at.x - b.minX : dy > 0 ? b.maxY - at.y : at.y - b.minY;
      const n = Math.min(left, room + 1);
      out.push({ from: at, to: { x: at.x + dx * n, y: at.y + dy * n }, share: n / far });
      left -= n;
      at = board.norm(at.x + dx * n, at.y + dy * n);
      // A leg that starts at an edge comes on from beyond it.
      at = { x: at.x - dx, y: at.y - dy };
      left += left > 0 ? 1 : 0;
    }
    return out;
  }

  /**
   * …and the wind can UN-finish things. An Abbazia was capping that road; the
   * wind took the Abbazia away, and the road is open country again. Nothing is
   * taken back — nothing was paid for finishing in the first place — but it
   * has to stop counting as scored, or its windmills can never pay again and a
   * blue tower would keep paying it at the finished rate for a city that is
   * standing open.
   */
  reopen() {
    const board = this.game.board;
    for (const d of board.allComponents()) {
      if (!d.scored) continue;
      const done = CENTRE_FEATURES.has(d.type)
        ? board.surroundCount(d.at.x, d.at.y) === 8
        : d.open === 0;
      if (done) continue;
      board.unmark(d);
      this.game.say(`The ${d.type} at (${d.at.x}, ${d.at.y}) is open country again.`);
      // A city you were standing in and had FINISHED is worth less open than
      // it was shut, and the difference comes off you. Nothing was paid for
      // finishing it, so this is not a clawback — it is the cost of having
      // been holding the thing when the weather got to it.
      if (d.type !== 'city' || !d.meeples.length) continue;
      const cells = board.cellsOf(d);
      const { n } = this.districtsIn(d);
      if (!n) continue;
      for (const p of board.majority(d)) {
        this.pay(p, -REOPENED * n,
          `${this.game.players[p].name}'s city is blown open — a point a district`,
          cells.map((c) => ({ x: c.x, y: c.y })));
      }
    }
  }

  /**
   * The wind can finish things. Two halves of a city shoved together close it;
   * so does the country closing around a temple. Nothing else in the engine
   * looks for a completion that no tile placement caused, so this does.
   */
  settle(by) {
    const board = this.game.board;
    for (const d of board.allComponents()) {
      if (d.scored || d.type === 'field') continue;   // a field is never finished
      const done = CENTRE_FEATURES.has(d.type)
        ? board.surroundCount(d.at.x, d.at.y) === 8
        : d.open === 0;
      if (!done) continue;
      board.markScored(d);
      this.game.noteClosure(d, by);
      this.onClosed(d, by);
    }
  }

  // --- closing --------------------------------------------------------------

  onClosed(d, closer) {
    if (d.type !== 'city' && d.type !== 'road') return;
    this.millsPay(d);
  }

  /**
   * Finishing something pays nothing by itself. What it does is earn a city
   * its bonuses on every blue tower still to come, and let a road be walked
   * away from.
   *
   * The WINDMILL is the one exception left in the mode: every turbine standing
   * in a feature that finishes pays 3, and it pays WHOEVER HOLDS THE FEATURE
   * rather than whoever laid the closing tile. That distinction is the whole
   * point of it — a mill is a thing you own, not a race you win, and paying
   * the closer made the last tile of somebody else's city the most valuable
   * square on the board.
   */
  millsPay(d) {
    const g = this.game;
    const board = g.board;
    const cells = board.cellsOf(d);
    if (!cells.length) return;
    // A turbine is anchored to one feature on its tile, and on a tile carrying
    // two features that distinction is the difference between paying for the
    // one that closed and the one that didn't.
    const mills = cells.filter((c) => {
      const t = turbineOn(c);
      return t && t.on != null && board.featIndexOn(c, d) === t.on;
    }).length;
    if (!mills) return;
    const where = cells.map((c) => ({ x: c.x, y: c.y }));
    for (const p of board.majority(d)) {
      this.pay(p, WINDMILL * mills,
        `${mills} windmill${mills > 1 ? 's' : ''} in a finished ${d.type} — ${g.players[p].name}`,
        where);
    }
  }

  // --- the season -----------------------------------------------------------

  endRound() {
    if (this.game.board.size === 0) this.game.finish();
  }

  /**
   * The end of the season. Carcassonne's endgame, bent to a board that never
   * settled: the harvest is called in one last time, the cities that never
   * finished are paid for what they got to, and the sky counts who is standing
   * where.
   */
  finish() {
    // The islands are counted FIRST, off the board exactly as play left it —
    // before the last scoring round moves anything's rate around.
    this.archipelago();
    this.lastRound();
  }

  /**
   * The end of the season, and it is every colour going off at once: the
   * land, the cities, the Abbazias and the roads are all scored one final
   * time. Everything you are still standing in pays, which is the whole point
   * of a mode where nothing is ever finished for good.
   *
   * Four passes, one each, and no more. Unpaired halves used to fire again
   * here, which made a half you could not place worth keeping.
   */
  lastRound() {
    this.game.say('The season turns, and the sky scores everything one last time.');
    // Every city gets its bonuses in this one, closed or not (rule 51).
    this.final = true;
    try {
      for (const hue of Object.keys(COLOURS)) this.fire(hue);
    } finally {
      this.final = false;
    }
  }

  /**
   * The archipelago. Ten flat points to whoever is standing on more separate
   * islands than anybody else — one follower on each of three islands beats
   * five followers parked on one, which is the whole of what it is for.
   */
  archipelago() {
    const g = this.game;
    const { isles } = this.land();
    const counts = g.players.map(() => 0);
    for (const group of isles) {
      const here = new Set();
      for (const cell of group) if (cell.meeple) here.add(cell.meeple.player);
      for (const p of here) counts[p]++;
    }
    const best = Math.max(0, ...counts);
    if (!best) {
      g.say('Nobody is standing on an island when the wind drops.');
      return;
    }
    const winners = counts.map((n, p) => (n === best ? p : -1)).filter((p) => p >= 0);
    for (const p of winners) {
      g.players[p].score += ARCHIPELAGO;
      g.say(`${g.players[p].name} holds ${best} island${best > 1 ? 's' : ''} at the end — +${ARCHIPELAGO}`);
    }
    g.emit('landmark');
  }

  // --- what a computer player can't see -------------------------------------
  //
  // The bot reads the board: what closed, who holds it, what it pays. None of
  // that includes the towers, the Abbazias or the blow, and in this mode
  // those are most of the game.

  botPlaceBonus(cells, player) {
    const w = weightsFor(this, player);
    let value = 0;
    for (const cell of cells) {
      // Closing a tower is the scoring round: priced as what it would pay US
      // minus what it would pay the best rival, so a tower the table is
      // better placed for is one the bot leaves alone.
      const hue = this.closesTower(cell);
      if (hue) value += this.towerValue(hue, cell, player) * w.sphere + w.closeTower;
      else value += this.quarterValue(cell) * w.quarter;
      value += this.turbineValue(cell, player);
      value += this.abbaziaValue(cell, player);
    }
    return value;
  }

  /** The colour of the tower this tile closes, laid where it is, or null. */
  closesTower(cell) {
    const board = this.game.board;
    const i = cell.type.feats.findIndex((f) => f.type === 'sfera');
    if (i < 0) return null;
    const d = board.featureOf(cell.x, cell.y, i);
    if (!d || d.open !== 0 || d.tiles.size < 2) return null;
    if (board.cellsOf(d).every((c) => c.sphered)) return null;
    return cell.type.feats[i].hue;
  }

  /** How many quarters of a big tower this one joins, laid where it is (the sun's 2x2 is a set of four). */
  quarterValue(cell) {
    const f = cell.type.feats.find((x) => x.quarter);
    if (!f || f.hue === 'hole') return 0;
    const board = this.game.board;
    const d = board.featureOf(cell.x, cell.y, cell.type.feats.indexOf(f));
    return d ? d.tiles.size - 1 : 0;
  }

  /** What closing a tower of this colour is worth to us, net of the table. */
  towerValue(hue, cell, player) {
    if (hue === 'sun') return this.sphereValue(Object.keys(COLOURS), player);
    if (hue !== 'hole') return this.sphereValue([hue], player);
    // The black hole: what it swallows of ours is lost, of theirs a gain.
    const board = this.game.board;
    const i = cell.type.feats.findIndex((f) => f.type === 'sfera');
    const d = board.featureOf(cell.x, cell.y, i);
    const hole = new Set(board.cellsOf(d).map((c) => key(c)));
    let value = 0;
    const seen = new Set();
    for (const c of board.cellsOf(d)) {
      for (const [dx, dy] of RING) {
        const t = board.get(c.x + dx, c.y + dy);
        if (!t || hole.has(key(t)) || seen.has(t)) continue;
        seen.add(t);
        const m = t.meeple;
        if (!m || m.feat == null) continue;
        const f = board.featureOf(t.x, t.y, m.feat);
        const worth = (f && this.valueOf(f)) || 1;
        value += m.player === player ? -worth : 0.7 * worth;
      }
    }
    return value;
  }

  /**
   * What closing a tower would pay us, net of what it hands everybody else.
   * The pass is run for real against a scratch tally rather than estimated,
   * because the board-wide passes are cheap and guessing at them was never
   * going to be close.
   */
  sphereValue(hues, player) {
    const before = this.game.players.map((p) => p.score);
    const quiet = this.game.say;
    const emit = this.game.emit;
    this.game.say = () => {};
    this.game.emit = () => {};
    try {
      for (const hue of hues) this.fire(hue);
    } finally {
      this.game.say = quiet;
      this.game.emit = emit;
    }
    let mine = 0, best = 0;
    this.game.players.forEach((p, i) => {
      const gained = p.score - before[i];
      p.score = before[i];
      if (i === player) mine = gained; else best = Math.max(best, gained);
    });
    return mine - best;
  }

  /**
   * Filling a square round an Abbazia, or laying one. Red pays an Abbazia's
   * holder a point for every tile round it, so a square filled next to one
   * we hold is worth a point on every red tower still to come, and next to
   * one a rival holds the same to them.
   */
  abbaziaValue(cell, player) {
    const board = this.game.board;
    const w = weightsFor(this, player);
    let value = 0;
    for (const [dx, dy] of [[0, 0], ...RING]) {
      const a = board.get(cell.x + dx, cell.y + dy);
      if (!a || !hasMark(a, 'abbazia')) continue;
      const holders = this.abbaziaHolders(a);
      if (!holders.length) continue;
      const tiles = a === cell ? board.surroundCount(a.x, a.y) : 1;
      const per = (this.onIsland(a) ? RATE.abbazia.isle : RATE.abbazia.main) * w.ahead * w.parish;
      value += (holders.includes(player) ? 1 : -0.7) * per * tiles;
    }
    return value;
  }

  /** A windmill is an annuity plus a bounty, so it's worth more than one gust. */
  turbineValue(cell, player) {
    const t = turbineOn(cell);
    if (!t || t.on == null) return 0;
    const w = weightsFor(this, player);
    const d = this.game.board.featureOf(cell.x, cell.y, t.on);
    if (!d) return 0;                            // no feature under it, no income
    const mine = d.meeples.some((m) => m.player === player);
    return mine ? w.turbineMine : w.turbineTheirs;
  }

  /**
   * Sending the whale instead of putting a follower down. Only worth the turn
   * when there is nothing to claim — a follower on the board earns for the
   * rest of the game and the whale only stops things happening — and then only
   * when there is something specific under it worth stopping.
   */
  botAction(seat) {
    const g = this.game;
    const w = weightsFor(this, seat);
    if (g.current !== seat || g.phase !== 'meeple') return false;
    if (this.botStride(seat)) return true;
    if (!this.canSwim()) return false;
    if (g.meepleOptions().length) return false;
    let best = null;
    for (const t of this.balenaTargets()) {
      const value = this.shelterValue(t, seat);
      if (!best || value > best.value) best = { ...t, value };
    }
    if (!best || best.value <= w.whale) return false;
    if (!this.beginSwim()) return false;
    return this.onCellClick(best.x, best.y);
  }

  /**
   * The choices the rules force on whoever's turn it is, which every
   * computer player answers whatever its level: the blow, which is every
   * turn, and where a tile that no longer fits moves on to. Both are decided
   * by the board they leave (`holding`).
   */
  botMust(seat) {
    const g = this.game;
    if (g.current !== seat) return false;
    if (g.phase === 'blow') return this.botBlow(seat);
    if (g.phase !== 'astray' || !this.astrayAt) return false;
    const { cell, targets } = this.astrayAt;
    const board = g.board;
    let best = null;
    for (const t of targets) {
      const from = { x: cell.x, y: cell.y };
      board.shift(from, t); board.rebuild();
      const value = this.holding(seat);
      board.shift(t, from); board.rebuild();
      if (!best || value > best.value) best = { ...t, value };
    }
    return this.sendAstray(best.x, best.y);
  }

  /** Blow where it does most for us, or, if nothing helps, where it does nothing. */
  botBlow(seat) {
    const best = this.bestBlow(seat);
    // Every blow costs us: set the Calcolo down instead (rule 86), beside
    // the most of our followers, where a push towards them stops.
    const w = weightsFor(this, seat);
    if (best.value < -(w.calcolo ?? SOFFIANDO_WEIGHTS.calcolo) && this.canCalcolo()) {
      const board = this.game.board;
      let spot = null;
      for (const t of this.calcoloTargets()) {
        let mine = 0;
        for (const [dx, dy] of SIDE_STEP) {
          const n = board.norm(t.x + dx, t.y + dy);
          if (board.get(n.x, n.y)?.meeple?.player === seat) mine++;
        }
        if (mine && (!spot || mine > spot.mine)) spot = { ...t, mine };
      }
      if (spot && this.beginCalcolo()) return this.placeCalcolo(spot.x, spot.y);
    }
    this.blowDir = best.dir;
    return this.blowAt(best.x, best.y);
  }

  /**
   * The best blow for a seat. Every blow is sorted out cheaply first: one
   * that would move no tile and blow nobody does nothing at all, and is the
   * fallback; the rest are guessed at by whose followers they touch and how
   * much moves (`blowGuess`), and the few that guess best are then MADE,
   * priced and taken back (`tryBlow`). Only the board after a blow can say
   * what it did, because a moved tile that no longer fits moves on, and a
   * chain can carry the push anywhere.
   */
  bestBlow(seat) {
    const board = this.game.board;
    const power = this.pushPower();
    let idle = null;
    const guesses = [];
    for (const c of this.tiles()) {
      for (let dir = 0; dir < 4; dir++) {
        if (!this.openBehind(c.x, c.y, dir)) continue;          // no cutting
        const { cells, ring } = runFrom(board, c, dir);
        const lane = this.laneOf(cells, ring, power, dir);
        const { heavy, pushed: reached } = lane;
        const touches = reached.some((t) => (heavy ? !!t.meeple : true) || isCannon(t) || zephyrDirs(t).length)
          || [...lane.held, ...reached].some((t) => turbineOn(t));
        if (!touches) {
          if (!idle) idle = { x: c.x, y: c.y, dir, value: 0 };
          continue;
        }
        guesses.push({ x: c.x, y: c.y, dir, guess: this.blowGuess(reached, heavy, seat, dir) });
      }
    }
    let best = idle;
    guesses.sort((a, b) => b.guess - a.guess);
    const w = weightsFor(this, seat);
    const base = this.holding(seat);
    for (const t of guesses.slice(0, w.blowLook)) {
      const value = this.tryBlow(t, t.dir, seat) - base;
      if (!best || value > best.value) best = { x: t.x, y: t.y, dir: t.dir, value };
    }
    return best || { x: guesses[0].x, y: guesses[0].y, dir: guesses[0].dir, value: 0 };
  }

  /** A quick guess at a blow: whose followers it carries or blows, and how much it moves. */
  blowGuess(reached, heavy, seat, dir) {
    let value = 0;
    for (const t of reached) {
      // A follower of ours a heavy push would blow onto an empty Abbazia
      // claims it (rule 39): worth trying for real.
      if (heavy && t.meeple?.player === seat && hasMark(this.landingOf(t, dir) || t, 'abbazia')) value += 4;
      else if (t.meeple) value += t.meeple.player === seat ? -1 : 1;
      if (!heavy && zephyrDirs(t).length) value += 1;
      if (!heavy && sferaHue(t)) value += 1;     // a tower half on the move might meet its other half
    }
    return value + (heavy ? 0 : 0.2 * reached.length) + this.game.rng() * 0.5;
  }

  /**
   * Make a blow, price the board it leaves for `seat` (`holding`, plus what
   * its windmills and closings pay), and put every tile, follower and
   * finished feature back as it was. Payments are not made: they are counted.
   */
  tryBlow(at, dir, seat) {
    const g = this.game;
    const board = g.board;
    const was = [...board.cells.values()].map((c) => ({ c, x: c.x, y: c.y, rot: c.rot, type: c.type, meeple: c.meeple, keep: c.keep }));
    const scored = [...board.scoredParts];
    const supply = g.players.map((p) => p.meeples);
    try {
      const reports = blow(board, { at, dir, power: this.pushPower(), holds: (c) => this.holds(c), keepOut: (kx, ky) => this.shut(kx, ky) });
      let paid = 0;
      for (const r of reports) {
        for (const t of r.turbines) {
          const m = turbineOn(t);
          if (!m || m.on == null || board.get(t.x, t.y) !== t) continue;
          const d = board.featureOf(t.x, t.y, m.on);
          if (!d || !d.meeples.length) continue;
          for (const p of board.majority(d)) paid += p === seat ? TURBINE : -TURBINE;
        }
      }
      // …and what no longer fits moves on, the nearest way it can, or falls.
      for (const r of reports) {
        for (const m of r.moved) {
          const c = m.cell;
          if (board.get(c.x, c.y) !== c || !board.degree(c.x, c.y) || fitsAll(board, c)) continue;
          const t = this.astrayTargets(c).sort((a, b) => a.n - b.n)[0];
          if (t) board.shift({ x: c.x, y: c.y }, t); else board.remove(c.x, c.y, { quiet: true });
        }
      }
      board.rebuild();
      // A tower the blow closed fires (tower halves blow, since 2026-10-27).
      const w = weightsFor(this, seat);
      for (const d of board.allComponents()) {
        if (d.type !== 'sfera' || d.tiles.size < 2 || d.open !== 0) continue;
        const cells = board.cellsOf(d);
        if (cells.every((c) => c.sphered)) continue;
        paid += this.towerValue(sferaHue(cells[0]), cells[0], seat) * w.sphere + w.closeTower;
      }
      return this.holding(seat) + paid;
    } finally {
      board.cells.clear();
      for (const w of was) {
        w.c.x = w.x; w.c.y = w.y; w.c.rot = w.rot; w.c.type = w.type; w.c.meeple = w.meeple; w.c.keep = w.keep;
        board.cells.set(board.key(w.x, w.y), w.c);
      }
      board.scoredParts.clear();
      for (const p of scored) board.scoredParts.add(p);
      g.players.forEach((p, i) => { p.meeples = supply[i]; });
      board.version++;
      board.rebuild();
    }
  }

  /**
   * What the board as it stands is worth to a seat: what its followers stand
   * in (valueOf, which doubles it out on an island), less a little of what
   * everybody else's do; the pieces of country it would win green for; the
   * Abbazias it would win red for; and 2 for every separate island it is
   * standing on (the archipelago's 10, a little at a time).
   */
  holding(seat) {
    const board = this.game.board;
    const w = weightsFor(this, seat);
    const { main, isles } = this.land();
    const isleOf = new Map();
    isles.forEach((grp, i) => { for (const c of grp) isleOf.set(c, i); });
    const mine = new Set();
    let value = 0;
    // Green: 5 for every piece of country we have the most followers on,
    // and as much against us where a rival has.
    for (const group of [main, ...isles]) {
      const top = this.landHolders(group);
      if (!top.length) continue;
      value += (top.includes(seat) ? 1 : -0.7) * LAND * w.ahead * (w.land ?? 1);
    }
    for (const c of this.tiles()) {
      if (hasMark(c, 'abbazia')) {
        const holders = this.abbaziaHolders(c);
        if (holders.length) {
          value += (holders.includes(seat) ? 1 : -0.7) * this.abbaziaPoints(c) * w.ahead * w.parish;
        }
      }
      if (!c.meeple) continue;
      if (c.meeple.player === seat && isleOf.has(c)) mine.add(isleOf.get(c));
      if (c.meeple.feat == null) continue;
      const d = board.featureOf(c.x, c.y, c.meeple.feat);
      const worth = (d && this.valueOf(d)) || 0;
      if (c.meeple.player !== seat) { value -= 0.7 * worth; continue; }
      value += worth;
    }
    return value + 2 * mine.size;
  }

  /**
   * Moving a follower (rule 82) or building a keep up (rule 83) instead of
   * claiming, for a computer player. Every move, every keep piece and every
   * claim it could make are priced the same way, by the board they leave
   * (`holding`), a claim less what a follower out of the supply costs; a
   * move or a piece is made if it beats the best claim by its weight
   * (`stride`, `keep`). Each is tried on the board and taken back.
   */
  botStride(seat) {
    const g = this.game;
    const canMove = this.canStride(), canKeep = this.canBuildKeep();
    if (!canMove && !canKeep) return false;
    const board = g.board;
    const w = weightsFor(this, seat);
    const now = this.holding(seat);
    const put = (c, i, m) => {
      c.meeple = { ...m, feat: i };
      if (i != null) board.featureOf(c.x, c.y, i).meeples.push({ ...c.meeple, x: c.x, y: c.y });
    };
    const take = (c) => {
      const m = c.meeple;
      const d = m.feat != null ? board.featureOf(c.x, c.y, m.feat) : null;
      if (d) d.meeples = d.meeples.filter((o) => !(o.x === c.x && o.y === c.y));
      c.meeple = null;
      return m;
    };
    let claim = 0;
    const cost = 2.2 + 9 / Math.max(1, g.player.meeples);
    for (const o of g.meepleOptions()) {
      const c = board.get(o.x, o.y);
      if (o.i == null || !c || c.meeple) continue;
      put(c, o.i, { player: seat, big: false, kind: null });
      claim = Math.max(claim, this.holding(seat) - now - cost);
      take(c);
    }
    let move = null;
    if (canMove) {
      for (const from of this.striders()) {
        const c0 = board.get(from.x, from.y);
        for (const t of this.strideTargets(from.x, from.y)) {
          const c = board.get(t.x, t.y);
          const m = take(c0);
          put(c, t.i, m);
          const gain = this.holding(seat) - now;
          take(c);
          put(c0, m.feat, m);
          if (!move || gain > move.gain) move = { from, t, gain };
        }
      }
    }
    let keep = null;
    if (canKeep) {
      for (const t of this.keepTargets()) {
        const c = board.get(t.x, t.y);
        c.keep = (c.keep || 0) + 1;
        const gain = this.holding(seat) - now;
        c.keep--;
        if (!keep || gain > keep.gain) keep = { ...t, gain };
      }
    }
    const keepBy = keep ? keep.gain - Math.max(claim, 0) - (w.keep ?? SOFFIANDO_WEIGHTS.keep) : -Infinity;
    const moveBy = move ? move.gain - Math.max(claim, 0) - (w.stride ?? SOFFIANDO_WEIGHTS.stride) : -Infinity;
    if (keepBy > 0 && keepBy >= moveBy) return this.beginKeep() && this.buildKeep(keep.x, keep.y);
    if (moveBy <= 0) return false;
    if (!this.beginStride() || !this.pickStrider(move.from.x, move.from.y)) return false;
    if (g.placeMeeple(move.t.i, move.t)) return true;
    this.settleStride();
    return false;
  }

  /** What parking the whale on a square is worth: what it stops happening. */
  shelterValue(at, seat) {
    const board = this.game.board;
    const cell = board.get(at.x, at.y);
    if (!cell) return 0;
    let value = 0;
    if (cell.meeple) value += cell.meeple.player === seat ? 3 : -1;
    cell.type.feats.forEach((f, i) => {
      if (f.type !== 'city') return;
      const d = board.featureOf(cell.x, cell.y, i);
      if (!d || !d.scored) return;
      // A finished city we hold is a payout the weather can reverse. Pinning a
      // tile of it is worth a share of what blowing it open would cost us.
      const mine = d.meeples.some((m) => m.player === seat);
      value += mine ? RATE.cityDone.main * d.tiles.size * 0.25 : -1;
    });
    return value;
  }

  // --- UI -------------------------------------------------------------------

  /**
   * Everything is cloud, because nothing is ever settled. What the overlay has
   * to say instead is WHERE you are: an island is somewhere you can't build,
   * and it pays more, so it gets a rim of its own.
   */
  cellOverlay(cell) {
    const out = { cloud: true };
    if (this.onIsland(cell)) out.island = true;
    if (turbineOn(cell)) out.turbine = true;
    if (cell.balena) out.balena = true;
    if (cell.keep) out.keep = cell.keep;
    return out;
  }

  actions() {
    const g = this.game;
    if (g.phase === 'balena') {
      return [{ label: 'Leave the Balena where it is', fn: () => this.cancelSwim() }];
    }
    if (g.phase === 'flight') {
      return [{ label: 'Leave them where they are', fn: () => this.cancelLift() }];
    }
    if (g.phase === 'stride') {
      return [{ label: 'Leave them where they are', fn: () => this.unstride() }];
    }
    if (g.phase === 'keep') {
      return [{ label: 'Leave the keeps as they are', fn: () => this.cancelKeep() }];
    }
    if (g.phase === 'calcolo') {
      return [{ label: 'Blow after all', fn: () => this.cancelCalcolo() }];
    }
    if (g.phase === 'blow') {
      return [
        { label: `Turn your zephyr (blowing ${DIR_NAMES[this.blowDir]}, push ${this.pushPower()})`, key: 'R', fn: () => g.rotate(1), wide: true },
        ...(this.canCalcolo() ? [{ label: this.calcolo ? 'Move the Calcolo instead' : 'Set the Calcolo down instead', fn: () => this.beginCalcolo() }] : []),
      ];
    }
    if (g.phase !== 'meeple') return [];
    const out = this.balena ? [{
      label: 'Send the Balena (anywhere)',
      fn: () => this.beginSwim(),
      disabled: !this.canSwim(),
    }] : [];
    if (this.canLift()) {
      out.unshift({ label: 'Fly out and pick a follower up', fn: () => this.beginLift() });
    }
    if (this.striding) {
      out.unshift({ label: 'Put the follower back', fn: () => this.unstride(), wide: true });
    } else if (this.canStride()) {
      out.unshift({ label: 'Move a follower instead', key: 'M', fn: () => this.beginStride() });
    }
    if (this.canBuildKeep()) {
      out.unshift({ label: `Build a keep up instead (${g.player.keeps} piece${g.player.keeps === 1 ? '' : 's'} left)`, fn: () => this.beginKeep() });
    }
    if (this.lifted) {
      out.unshift({ label: 'Bring the lifted follower home', fn: () => g.skipMeeple(), wide: true });
    }
    return out;
  }

  /** What the panel names that the host's own signature does not see: which way the zephyr faces, the push, and which loose tile is moving on. */
  signature() {
    return `${this.blowDir}/${this.pushPower()}/${this.astrayAt ? `${this.astrayAt.cell.x},${this.astrayAt.cell.y}` : '-'}`;
  }

  cancelLift() {
    if (this.game.phase !== 'flight') return false;
    this.game.phase = 'meeple';
    return true;
  }

  cancelSwim() {
    if (this.game.phase !== 'balena') return false;
    this.game.phase = 'meeple';
    return true;
  }

  status() {
    const { main, isles } = this.land();
    const adrift = isles.reduce((n, g) => n + g.length, 0);
    return `${this.laid} tiles laid · mainland of ${main.length}`
      + ` · ${isles.length} island${isles.length === 1 ? '' : 's'} (${adrift} tiles)`
      + ` · push ${this.pushPower()}`
      + ` · ${this.blows} blow${this.blows === 1 ? '' : 's'}`;
  }

  panel() {
    const g = this.game;
    const { isles } = this.land();
    const rows = g.players.map((p, i) => {
      const active = i === g.current && g.phase !== 'over';
      const meeples = '●'.repeat(p.meeples) + `<span class="dim">${'○'.repeat(Math.max(0, SUPPLY - p.meeples))}</span>`;
      const mine = isles.filter((grp) => grp.some((c) => c.meeple?.player === i)).length;
      return `<div class="player ${active ? 'active' : ''}">
          <span class="swatch" style="background:${PLAYER_COLORS[i]}"></span>
          <span class="pname">${p.name}${mine ? ` <span class="dim">${mine}⌖</span>` : ''}</span>
          <span class="pmeta">${meeples}</span>
          <span class="pscore">${p.score}</span>
        </div>`;
    }).join('');
    const whale = this.balena ? ` · The Balena rests at (${this.balena.x}, ${this.balena.y}).` : '';
    const closed = ['green', 'blue', 'red', 'yellow', 'sun', 'hole'].filter((h) => this.hues[h])
      .map((h) => `${this.hues[h]} ${h === 'hole' ? 'black hole' : h}`).join(', ');
    return `${rows}<p class="hint">Push power ${this.pushPower()} · ${this.fallen} tile${this.fallen === 1 ? '' : 's'} fallen · ${this.spheres ? `towers closed: ${closed}` : 'no tower closed yet'}${whale}</p>`;
  }
}

Soffiando.spec = {
  id: 'soffiando',
  name: 'Soffiando (cloud kingdom)',
  Mode: Soffiando,
  groups: ['base', 'cloud'],
  // Ink on aged paper rather than twilight: the whole mode is a chart, the
  // zephyrs are the wind-heads drawn in its corners, and the panel has to be
  // the same sheet as the board.
  antique: true,
  // …and its tiles, sky and coastlines are pixel art on a 51 px grid, in the
  // hand Timothy draws Composer's Key in, coloured for a kingdom in the
  // clouds. See src/pixel.js. The chart stays as the backdrop of nothing.
  pixel: true,
  // SEVENTEEN SQUARES A SIDE (Timothy, 2026-10-25: "map needs to be 17x17 in
  // order to allow the palazzo to be perfectly in the middle"), and its edges
  // meet: what goes off one side comes on at the other (Board's `wrap`).
  bounds: { minX: -8, maxX: 8, minY: -8, maxY: 8 },
  wrap: true,
  meeples: true,
  minPlayers: 1,
  maxPlayers: 4,
  // The mode's own switches, ticked in the Game panel and passed in as
  // options for the next new game (rule 66).
  switches: [
    { id: 'balena', name: 'The Balena', note: 'A sky whale no wind moves, sent anywhere instead of claiming.' },
  ],
  tideStart: 5,
  opening: 'A first stone hangs in the cloud. Everything else is weather.',
  hint: 'A turn is three steps: lay a tile, claim on it or not, and BLOW. '
    + 'Every tile has TWO FACES: F (or the little tile under your hand) turns it over, R turns it round. Both faces are the same structure: a district has another kind of district of its shape on the back, a road another road of its shape (some faces of either carry a zephyr, a windmill or a flying machine; two crossings are windvanes), a tower half a tower half of another colour, and an Abbazia is an Abbazia on both faces. '
    + 'Your zephyr goes in open sky against any tile on any side, never between two tiles (R turns it): that tile and every tile touching in front of it, up to the first gap, go one square, if there are no more of them than your PUSH POWER, which is 1 plus every Abbazia on the board. An ANCHOR (a quarter of a big tower, or a half of a closed tower) holds the lane still up to it, and what is past it is pushed. Instead of blowing you may set the CALCOLO down, one stone for the table, on any empty square of sky: nothing is laid, pushed or moved on into its square, so a push that would go there moves nothing and blows its followers instead. '
    + 'A zephyr tile your blow pushes then pushes the way it points, at its own push plus yours, and that chains on. Zephyr tiles do nothing when laid. '
    + 'Too heavy to move, a blow moves no tile but blows the followers it reaches a square downwind, over walls too, into a city somebody holds too; one blown onto an empty Abbazia holds it. '
    + 'A moved tile that no longer meets all its neighbours MOVES ON: you pick a way, and it slides to the first empty square where it fits. Only one with every way blocked falls, and you lay one more tile. '
    + 'TOWERS are the scoring: a half meets only its own colour, and a closed tower, laid or pushed together, scores its colour over the whole board. '
    + 'Green the land (5 to whoever has the most followers on each piece of country, a tiny island too; there are no farmers), blue the cities (1 a district open, 2 closed, a garden 1 more, a KEEP doubled for every piece built on it; closed, and every city at the end, 5 more for one of every kind and 2 a road at a gate for every trade district), red the Abbazias (one a follower holds, flown or blown onto it, pays it 1 per tile round it, like a cloister; one nobody holds pays nobody), yellow the roads (1 a tile plus 1 or 2 for each city they reach). '
    + 'The BIG TOWERS are eight tiles with the SUN on one face and the BLACK HOLE on the other, walled outside, and a game makes one of each: the first quarter laid decides which comes first, and the rest of its 2x2 is kept for the other three, which must go into it; then the other is made. The sun fires every colour; the black hole swallows the ring round it (never the sun) back into the deck. '
    + 'Closing something pays nobody: things pay their holders when their tower fires. '
    + 'Eight followers each. You may claim only what nobody is in, yourself included, never a closed road or city. Instead of claiming you may MOVE one of your followers (M): a square, or down a road it stands on as far as the road goes; never through a city wall except where a road meets it (a gate), so a city no road runs into is not walked out of. NOBODY COMES HOME: a tower pays its followers again every time it fires, until the wind takes them or they move; a closed city blown open costs a point a district. A RESIDENTIAL district takes another of yours in a city you hold. Instead of a follower you may put one of your four KEEP pieces on any keep; the wind moving its tile brings it down, pieces lost. Windmills pay 3 for every push that reaches one and 3 when their road or city closes. City walls take anything, as an Abbazia does. '
    + 'The biggest piece of country is the mainland; every other piece is an ISLAND, pays double, and is buildable only by somebody standing on it. At the end, 10 to whoever stands on most islands. '
    + 'The map is 17 squares a side with the Plaza in the middle, and its edges meet: a tile pushed off one side comes on at the other, still joined.',
};
