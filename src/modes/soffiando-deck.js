// ---------------------------------------------------------------------------
// Soffiando's deck, tile by tile: every tile the mode can deal and how many
// copies of each go in. 72 in all (Timothy, 2026-10-25: "make sure we stick
// to 72 tiles"). A tile at 0 is one of the extras: drawn and known, not
// dealt. The Soffiando Rulebook page lists every row with a toggle and a
// count; what Timothy changes there comes back here.
//
// Why these counts (Claude's call, 2026-10-25, cutting 112 to 72): every
// sfera half stays, because the spheres are all the scoring there is and a
// shorter game needs as many of them, not fewer. Each district kind keeps
// its end, its corner and its through-piece, which makes every city a chain
// two ends can close; the three-way and all-round districts wait as extras.
// The weather keeps its share (a quarter of the deck) and every special
// wind. What gave way is the plain country: roads, temples, flying machines.
// ---------------------------------------------------------------------------

export const DECK_SIZE = 72;

/** The deck in the groups the rulebook page shows, each tile as [id, copies]. */
export const DECK_GROUPS = [
  { name: 'Cities', note: 'Districts: an end, a corner and a through-piece of each of the five kinds. The three-way and all-round districts are extras.',
    tiles: [
      ['DEg', 1], ['DLg', 1], ['DIg', 1],
      ['DEt', 1], ['DLt', 1], ['DIt', 1],
      ['DEr', 1], ['DLr', 1], ['DIr', 1],
      ['DEi', 1], ['DLi', 1], ['DIi', 1],
      ['DEm', 1], ['DLm', 1], ['DIm', 1],
      ['DTg', 0], ['DTt', 0], ['DTr', 0], ['DTi', 0], ['DTm', 0],
      ['DXg', 0], ['DXt', 0], ['DXr', 0], ['DXi', 0], ['DXm', 0],
    ] },
  { name: 'Spheres', note: 'All sixteen sfera halves, four of each colour: the only thing that scores.',
    tiles: [
      ['Kso', 2], ['Ksr', 1], ['Ksx', 1],
      ['Kbo', 2], ['Kbr', 1], ['Kbx', 1],
      ['Kro', 2], ['Krr', 1], ['Krx', 1],
      ['Kyo', 2], ['Kyr', 1], ['Kyx', 1],
    ] },
  { name: 'Weather', note: 'Zephyrs and gust cannons, a quarter of the deck, every special wind among them.',
    tiles: [
      ['Kz', 4], ['Kzr', 3], ['Kzb', 2],
      ['Kzx', 1], ['Kzy', 1], ['Kzw', 1], ['Kzq', 1], ['Kzz', 1], ['Kzzr', 1],
      ['Kg', 2], ['Kgr', 1], ['Kgb', 0], ['Kgg', 0],
    ] },
  { name: 'Windmills', note: 'A windmill pays its holder 2 for every gust through it.',
    tiles: [['Ktc', 1], ['Ktr', 1], ['Ktw', 1]] },
  { name: 'The rest of the sky', note: 'Temples, Abbazias, flying machines and windvanes.',
    tiles: [['Kt', 4], ['Kta', 1], ['Kab', 3], ['Kfl', 3], ['Kw', 2]] },
  { name: 'Roads', note: 'Plain country: a straight, a bend, a crossing and a junction town.',
    tiles: [['U', 3], ['V', 2], ['X', 1], ['Gw', 1]] },
  // Lone walls, out for now (Timothy, 2026-10-24: "for now remove single
  // castle wall tiles from the tile pool, just want to see what it looks
  // like").
  { name: 'Lone walls', note: 'Out for now, since 2026-10-24: a plain wall, a turbine tower, a town under a wall, and the sfera and wind tiles that carry one.',
    tiles: [
      ['Kce', 0], ['Ktb', 0], ['Gl', 0], ['Kzc', 0], ['Kzt', 0], ['Kgc', 0],
      ['Ksc', 0], ['Kbc', 0], ['Krc', 0], ['Kyc', 0],
    ] },
];

/** The default deck as a map of id to copies, every extra at 0. */
export const DECK_COUNTS = Object.fromEntries(DECK_GROUPS.flatMap((g) => g.tiles));
