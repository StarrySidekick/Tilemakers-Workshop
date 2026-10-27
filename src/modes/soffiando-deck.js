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
// quarters onto the black hole's (the same four tiles). The four places the
// quarters gave back are four more tower halves, five of each colour now.
// Which back goes on which tower half, and the trade all-round district,
// are Claude's call: each colour gets one road zephyr and one cannon or
// double zephyr, the plainest weather on the plainest towers. The extras at
// 0 stay one-faced.
// ---------------------------------------------------------------------------

export const DECK_SIZE = 72;

const per = (kinds, make) => kinds.map(make);
const KINDS = ['g', 'r', 'i', 'm'];

/** The deck in the groups the rulebook page shows, each tile as [id, copies]. */
export const DECK_GROUPS = [
  { name: 'Cities and roads', note: 'A district on one face, a road of the same shape on the other: a through-piece on a straight, a corner on a bend, an end on a dead end, a three-way on a junction town, and one all-round district on the crossing. Three of each through-piece and corner, two of each end, in each of the four kinds (garden, residential, industrial, trade).',
    tiles: [
      ...per(KINDS, (k) => [`DI${k}|U`, 3]),
      ...per(KINDS, (k) => [`DL${k}|V`, 3]),
      ...per(KINDS, (k) => [`DE${k}|Kde`, 2]),
      ...per(KINDS, (k) => [`DT${k}|Gw`, 1]),
      ['DXm|X', 1],
    ] },
  { name: 'Towers and weather', note: 'A tower half on one face, a zephyr or a gust cannon on the other. Five halves of each colour: a half meets only its own colour, and a closed tower fires its colour. A zephyr tile pushes only when your blow pushes it, with its own push plus yours.',
    tiles: [
      ['Kso|Kz', 2], ['Kso|Kzx', 1], ['Ksr|Kzr', 1], ['Ksx|Kg', 1],
      ['Kbo|Kz', 2], ['Kbo|Kzy', 1], ['Kbr|Kzr', 1], ['Kbx|Kzz', 1],
      ['Kro|Kz', 1], ['Kro|Kzb', 1], ['Kro|Kzw', 1], ['Krr|Kzr', 1], ['Krx|Kg', 1],
      ['Kyo|Kzr', 1], ['Kyo|Kzb', 1], ['Kyo|Kzq', 1], ['Kyr|Kzzr', 1], ['Kyx|Kgr', 1],
    ] },
  { name: 'The big tower', note: 'Four tiles, a quarter of the sun on one face and a quarter of the black hole on the other. The first quarter laid decides which it will be; the rest must join its 2x2. The sun fires every colour; the black hole swallows the ring around it.',
    tiles: [['Kqs|Kqh', 4]] },
  { name: 'Abbazias', note: 'An Abbazia on one face (each one on the board adds 1 to everybody\'s push power), and on the other a windmill (pays its holder 2 for every push that reaches it), a flying machine or a windvane.',
    tiles: [['Kab|Ktc', 2], ['Kab|Ktr', 2], ['Kab|Ktw', 2], ['Kab|Kfl', 3], ['Kab|Kw', 2]] },
  { name: 'Extras', note: 'One-faced, and not dealt: the temple districts, the other all-round districts, the temples and two cannons.',
    tiles: [
      ['DEt', 0], ['DLt', 0], ['DIt', 0], ['DTt', 0],
      ['DXg', 0], ['DXt', 0], ['DXr', 0], ['DXi', 0],
      ['Kt', 0], ['Kta', 0], ['Kgb', 0], ['Kgg', 0],
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
