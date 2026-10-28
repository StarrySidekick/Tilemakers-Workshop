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
const KINDS = ['g', 'r', 'k', 'm'];

/** The deck in the groups the rulebook page shows, each tile as [id, copies]. */
export const DECK_GROUPS = [
  // Both faces the same structure (Timothy, 2026-10-28: "Both sides of all
  // the tiles should generally have like the same type of structure, just
  // with some options changed. For example, like city tiles on both sides and
  // roads on both sides"), and the specials on city faces too ("specials can
  // be on city faces too"). Which pairs, and how the specials are spread, is
  // Claude's call: the same twelve zephyr faces, six windmills, two windvanes
  // as before, flying machines on four tiles, and no cannons ("Remove it").
  { name: 'Cities', note: 'A district on both faces, of the same shape and two different kinds: you choose which kind to build. Some faces carry a zephyr across the district, a windmill or a flying machine.',
    tiles: [
      ['DXg|DXr', 1], ['DXk|DXm', 1],
      ['DTg|DTk', 1], ['DTr|DTm', 1], ['DTg|DTm', 1], ['DTr|DTk', 1],
      ['DLg|DLr', 1], ['DLk|DLzm', 1], ['Ktc|DLg', 1], ['Ktc|DLm', 1], ['DLzk|DLr', 1],
      ['DIg|DIk', 1], ['DIr|DIm', 1], ['DIzg|DIm', 1], ['DIzr|DIk', 1],
      ['Kfg|Kft', 1], ['DEg|DEr', 1], ['DEk|DEm', 1], ['DEr|DEk', 1],
    ] },
  { name: 'Roads', note: 'A road on both faces, of the same shape, one of them often carrying something: a zephyr across the road, a windmill, a flying machine, or a windvane on the crossing.',
    tiles: [
      ['U|Kzr', 3], ['U|Ktr', 2], ['Kzr|Kzzr', 1], ['U|Kfr', 1],
      ['V|Kzb', 3], ['V|Ktw', 2],
      ['Kde|Kfl', 2],
      ['Gw|Gw', 2],
      ['Kw|X', 2],
    ] },
  { name: 'Towers', note: 'A tower half on each face, two colours, the same shape both sides: a plain half, a half on a road, or a half in a district of its colour\'s kind. Every colour is on eight faces. A half meets only its own colour, and a closed tower fires its colour.',
    tiles: [
      ['Kso|Kbo', 2], ['Kro|Kyo', 2], ['Kso|Kro', 1], ['Kbo|Kyo', 1], ['Kso|Kyo', 1], ['Kbo|Kro', 1],
      ['Ksr|Krr', 1], ['Kbr|Kyr', 1], ['Ksr|Kyr', 1], ['Kbr|Krr', 1],
      ['Ksx|Kbx', 1], ['Krx|Kyx', 1], ['Ksx|Kyx', 1], ['Kbx|Krx', 1],
    ] },
  { name: 'The big towers', note: 'Eight tiles, a quarter of the sun on one face and a quarter of the black hole on the other, walled on their outer sides. A game makes one of each: the first quarter laid decides which comes first, the rest must join its 2x2, and then the other is made. The sun fires every colour; the black hole swallows the ring around it.',
    tiles: [['Kqs|Kqh', 8]] },
  // An Abbazia on both faces (Timothy, 2026-10-28: "the abbazias tiles should
  // have abbazias on both sides"). Until then their backs were a smattering of
  // country: Kab|X, Kab|Gw, three flying machines (Kab|Kfr, Kab|Kfb, Kab|Kff)
  // and six districts (Kab|DXg, DXk, DTr, DTk, DIg, DLm).
  { name: 'Abbazias', note: 'An Abbazia on both faces. Each one on the board adds 1 to everybody\'s push power, and one is held by a follower flown or blown onto it.',
    tiles: [['Kab|Kab', 11]] },
  { name: 'Extras', note: 'One-faced, and not dealt: the zephyrs with no road (the plain zephyr, crosswind, split wind, trident, compass rose and double zephyr), the temple districts and the temples. The gust cannons went on 2026-10-28.',
    tiles: [
      ['Kz', 0], ['Kzx', 0], ['Kzy', 0], ['Kzw', 0], ['Kzq', 0], ['Kzz', 0],
      ['DEt', 0], ['DLt', 0], ['DIt', 0], ['DTt', 0], ['DXt', 0],
      ['Kt', 0], ['Kta', 0],
    ] },
  // Lone walls, out for now (Timothy, 2026-10-24: "for now remove single
  // castle wall tiles from the tile pool, just want to see what it looks
  // like").
  { name: 'Lone walls', note: 'Out for now, since 2026-10-24: a plain wall, a turbine tower, a town under a wall, and the tower and wind tiles that carry one.',
    tiles: [
      ['Kce', 0], ['Ktb', 0], ['Gl', 0], ['Kzc', 0], ['Kzt', 0],
      ['Ksc', 0], ['Kbc', 0], ['Krc', 0], ['Kyc', 0],
    ] },
];

/** The default deck as a map of id to copies, every extra at 0. */
export const DECK_COUNTS = Object.fromEntries(DECK_GROUPS.flatMap((g) => g.tiles));
