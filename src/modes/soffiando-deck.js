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
// ---------------------------------------------------------------------------

export const DECK_SIZE = 72;

/** The deck in the groups the rulebook page shows, each tile as [id, copies]. */
export const DECK_GROUPS = [
  { name: 'Cities', note: 'Districts: an end, a corner and a through-piece of each of the four kinds (garden, residential, industrial, trade). The three-way and all-round districts, and the temple districts, are extras.',
    tiles: [
      ['DEg', 1], ['DLg', 1], ['DIg', 1],
      ['DEr', 1], ['DLr', 1], ['DIr', 1],
      ['DEi', 1], ['DLi', 1], ['DIi', 1],
      ['DEm', 1], ['DLm', 1], ['DIm', 1],
      ['DEt', 0], ['DLt', 0], ['DIt', 0],
      ['DTg', 0], ['DTt', 0], ['DTr', 0], ['DTi', 0], ['DTm', 0],
      ['DXg', 0], ['DXt', 0], ['DXr', 0], ['DXi', 0], ['DXm', 0],
    ] },
  { name: 'Towers', note: 'All sixteen tower halves, four of each colour: a half meets only its own colour, and a closed tower fires its colour.',
    tiles: [
      ['Kso', 2], ['Ksr', 1], ['Ksx', 1],
      ['Kbo', 2], ['Kbr', 1], ['Kbx', 1],
      ['Kro', 2], ['Krr', 1], ['Krx', 1],
      ['Kyo', 2], ['Kyr', 1], ['Kyx', 1],
    ] },
  { name: 'Big towers', note: 'The sun and the black hole, four quarters each, closed as a 2x2. The sun fires every colour; the black hole swallows the ring around it.',
    tiles: [['Kqs', 4], ['Kqh', 4]] },
  { name: 'Weather', note: 'Zephyrs and gust cannons. A zephyr tile pushes only when your blow pushes it, with its own push plus yours.',
    tiles: [
      ['Kz', 2], ['Kzr', 2], ['Kzb', 1],
      ['Kzx', 1], ['Kzy', 1], ['Kzw', 1], ['Kzq', 1], ['Kzz', 1], ['Kzzr', 0],
      ['Kg', 1], ['Kgr', 1], ['Kgb', 0], ['Kgg', 0],
    ] },
  { name: 'Windmills', note: 'A windmill pays its holder 2 for every push that reaches it.',
    tiles: [['Ktc', 1], ['Ktr', 1], ['Ktw', 1]] },
  { name: 'The rest of the sky', note: 'Abbazias (each one adds 1 to everybody\'s push power), flying machines and a windvane. The temples are extras.',
    tiles: [['Kab', 11], ['Kfl', 2], ['Kw', 1], ['Kt', 0], ['Kta', 0]] },
  { name: 'Roads', note: 'Plain country: a straight, a bend, a crossing and a junction town.',
    tiles: [['U', 3], ['V', 2], ['X', 1], ['Gw', 1]] },
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
