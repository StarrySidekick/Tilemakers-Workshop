// ---------------------------------------------------------------------------
// Soffiando's deck, tile by tile: every tile the mode can deal and how many
// copies of each go in. 72 in all (Timothy, 2026-10-25: "make sure we stick
// to 72 tiles"). A tile at 0 is one of the extras: drawn and known, not
// dealt. The Soffiando Rulebook page lists every row with a toggle and a
// count; what Timothy changes there comes back here.
//
// Why these counts (Claude's call, 2026-10-25, cutting 112 to 72): every
// tower half stays, because the towers are all the scoring there is and a
// shorter game needs as many of them, not fewer. Each district kind keeps
// its end, its corner and its through-piece, which makes every city a chain
// two ends can close; the three-way and all-round districts wait as extras.
//
// 2026-10-27, Timothy's round: the temple district is gone ("abazzias are
// basically that, just give us a few more abbazias") and so are the temples
// ("the cloister types things we have, just make those abbazias"): their
// eight places are Abbazias, eleven in all, which is also how far a blow can
// push (1 plus every Abbazia on the board). The red tower's district is
// industrial now. The black hole and the sun, four quarters each, took eight
// places from the weather (eighteen to twelve, now that a zephyr tile only
// pushes in your chain), a windvane and a flying machine: Claude's call.
//
// 2026-10-27, later: EVERY TILE HAS TWO FACES (Timothy: "make tiles double
// sided, and you choose what side to play when you place them ... there are
// 72 tiles in the game but 72x2 of tiles faces to play"). A row's id is
// "front|back". He chose the backs, opposites: a road onto a district of the
// same shape (a straight onto a through-piece, a bend onto a corner, a dead
// end onto an end, a junction town onto a three-way district, the crossing
// onto the one all-round district), a zephyr or cannon onto a tower half, a
// windmill, flying machine or windvane onto an Abbazia, and the sun's
// quarters onto the black hole's. Which back goes on which tower half, and
// the trade all-round district, are Claude's call: each colour gets one road
// zephyr and one cannon or double zephyr, the plainest weather on the
// plainest towers. The extras at 0 stay one-faced.
//
// Eight sun and black hole tiles, not four (Timothy, the same evening:
// "there has to be eight tiles becuase there needs to be the choice of what
// to build and both need to be present by the end of the game"): a game
// makes one of each. The four places that took are four tower halves, four
// of each colour again, as before the faces (one plain half a colour).
//
// 2026-10-28: a tower tile has a tower of ANOTHER colour on its back
// (Timothy: "tiles that have towers on them should have different colored
// towers on the other side"), so laying one is choosing which colour to
// build, and every tower tile goes down a tower. The zephyrs and cannons it
// carried RIDE ON ROADS now, his choice: twelve of the roads on a district's
// back carry one, the same road with the wind across it. The zephyrs with
// no road (the crosswind, split wind, trident, compass rose, double zephyr
// and the plain zephyr and cannon) are extras. Claude's calls: each tower
// tile has the same shape on both faces (plain, road or district), every
// colour is on eight faces and meets every other colour on some tile; which
// roads carry wind is spread over the four district kinds.
//
// Later on 2026-10-28: windmills, flying machines and windvanes are on
// "different kinds of tiles, not be specifically and side option on abbazia
// tiles": they ride on roads too, his choice, a windmill on a straight or a
// bend (and the windmill district on a corner's face), a flying machine at a
// dead end, a windvane on a crossing. The Abbazias' backs are "a smattering
// of features": roads and districts of every shape. Which ones is Claude's
// call.
//
// Later still: flying machines "shouldn't be competing with district faces,
// they should be on all different kinds of tiles". Two district ends carry
// one on BOTH faces (the district with a machine in it, the dead end into
// one), so whichever face goes down flies; three Abbazias carry one on their
// backs, in a field, on a straight road and on a bend. Seven machine faces
// on five tiles, none of them the other side of a plain district: Claude's
// call.
// ---------------------------------------------------------------------------

export const DECK_SIZE = 72;

const per = (kinds, make) => kinds.map(make);
const KINDS = ['g', 'r', 'i', 'm'];

/** The deck in the groups the rulebook page shows, each tile as [id, copies]. */
export const DECK_GROUPS = [
  { name: 'Cities and roads', note: 'A district on one face, a road of the same shape on the other: a through-piece on a straight, a corner on a bend, an end on a dead end, a three-way on a junction town, an all-round district on a crossing. Some of the roads carry something: a zephyr or a gust cannon across the road (twelve), a windmill (four; two more are windmill districts, on a corner\'s face), a flying machine at a dead end (three), a windvane on a crossing (two). A zephyr tile pushes only when your blow pushes it, with its own push plus yours.',
    tiles: [
      ['DIg|U', 1], ['DIg|Kzr', 1], ['DIg|Kgr', 1],
      ['DIr|Ktr', 1], ['DIr|Kzr', 1], ['DIr|Kzzr', 1],
      ['DIi|U', 1], ['DIi|Kzr', 1], ['DIi|Kgr', 1],
      ['DIm|Ktr', 1], ['DIm|U', 1], ['DIm|Kzr', 1],
      ['DLg|V', 1], ['DLg|Ktw', 1], ['DLg|Kzb', 1],
      ['DLr|V', 1], ['DLr|Ktw', 1], ['DLr|Kzb', 1],
      ['Ktc|V', 2], ['DLi|Kgb', 1],
      ['DLm|V', 1], ['DLm|Kzb', 2],
      ['Kfg|Kfl', 1], ['DEg|Kde', 1], ['DEr|Kde', 2],
      ['DEi|Kde', 2], ['Kft|Kfl', 1],
      ...per(KINDS, (k) => [`DT${k}|Gw`, 1]),
      ['DXm|Kw', 1], ['DXr|Kw', 1],
    ] },
  { name: 'Towers', note: 'A tower half on each face, two colours, the same shape both sides: a plain half, a half on a road, or a half in a district of its colour\'s kind. Every colour is on eight faces. A half meets only its own colour, and a closed tower fires its colour.',
    tiles: [
      ['Kso|Kbo', 2], ['Kro|Kyo', 2], ['Kso|Kro', 1], ['Kbo|Kyo', 1], ['Kso|Kyo', 1], ['Kbo|Kro', 1],
      ['Ksr|Krr', 1], ['Kbr|Kyr', 1], ['Ksr|Kyr', 1], ['Kbr|Krr', 1],
      ['Ksx|Kbx', 1], ['Krx|Kyx', 1], ['Ksx|Kyx', 1], ['Kbx|Krx', 1],
    ] },
  { name: 'The big towers', note: 'Eight tiles, a quarter of the sun on one face and a quarter of the black hole on the other, walled on their outer sides. A game makes one of each: the first quarter laid decides which comes first, the rest must join its 2x2, and then the other is made. The sun fires every colour; the black hole swallows the ring around it.',
    tiles: [['Kqs|Kqh', 8]] },
  { name: 'Abbazias', note: 'An Abbazia on one face (each one on the board adds 1 to everybody\'s push power; held by a follower flown or blown onto it), and a smattering of country on the other: roads and districts of every shape.',
    tiles: [
      ['Kab|X', 1], ['Kab|Gw', 1], ['Kab|Kfr', 1], ['Kab|Kfb', 1], ['Kab|Kff', 1],
      ['Kab|DXg', 1], ['Kab|DXi', 1], ['Kab|DTr', 1], ['Kab|DTi', 1], ['Kab|DIg', 1], ['Kab|DLm', 1],
    ] },
  { name: 'Extras', note: 'One-faced, and not dealt: the zephyrs and cannons with no road (the plain zephyr, crosswind, split wind, trident, compass rose, double zephyr, gust cannon and double cannon), the temple districts and the temples.',
    tiles: [
      ['Kz', 0], ['Kzx', 0], ['Kzy', 0], ['Kzw', 0], ['Kzq', 0], ['Kzz', 0], ['Kg', 0], ['Kgg', 0],
      ['DEt', 0], ['DLt', 0], ['DIt', 0], ['DTt', 0], ['DXt', 0],
      ['Kt', 0], ['Kta', 0],
    ] },
  // Lone walls, out for now (Timothy, 2026-10-24: "for now remove single
  // castle wall tiles from the tile pool, just want to see what it looks
  // like").
  { name: 'Lone walls', note: 'Out for now, since 2026-10-24: a plain wall, a turbine tower, a town under a wall, and the tower and wind tiles that carry one.',
    tiles: [
      ['Kce', 0], ['Ktb', 0], ['Gl', 0], ['Kzc', 0], ['Kzt', 0], ['Kgc', 0],
      ['Ksc', 0], ['Kbc', 0], ['Krc', 0], ['Kyc', 0],
    ] },
];

/** The default deck as a map of id to copies, every extra at 0. */
export const DECK_COUNTS = Object.fromEntries(DECK_GROUPS.flatMap((g) => g.tiles));
