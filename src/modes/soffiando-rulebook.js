// ---------------------------------------------------------------------------
// Every rule Soffiando plays by, in plain words.
//
// Begun 2026-10-25, the way Grove Chess keeps its rulebook in the
// Interpersonal Games repo (Timothy there, 2026-10-18: "it is very important
// the rules listed are real and reflect the actual gameplay"), because the
// mode had grown over twenty-four passes and nobody could say all of its
// rules any more.
//
// One entry a rule. Each has a test of the same id in
// tools/soffiando-rulebook.mjs that plays it on the real engine, so a rule
// listed here is how the game plays; the check fails on a rule with no test,
// a test with no rule, a number used twice or taken back from RETIRED.
//
//   n         its number, for good: say "rule 14". Never reused (RETIRED).
//   id        its test's name in tools/soffiando-rulebook.mjs.
//   group     which part of the game it belongs to (GROUPS).
//   text      the rule, as a player would say it.
//   from      who it came from: { by: 'timothy', on, said } with his words
//             (and `call`, what in it was Claude's reading); { by: 'claude',
//             why }; { by: 'history', pass, why }, a rule from the design
//             passes in MODES.md whose author was never written down; or
//             { by: 'carcassonne' }.
//   settings  the game options that switch it, if any.
//   added, changed, was   from 2026-10-25 on: the date it came in or last
//             changed, and how it read before. Every rule here when the list
//             began was already in the game.
//
// Any change to how Soffiando plays changes its rules here in the same
// commit (CLAUDE.md, "Rules").
// ---------------------------------------------------------------------------

const T = (on, said, call) => ({ by: 'timothy', on, said, ...(call ? { call } : {}) });
const C = (why) => ({ by: 'claude', why });
const H = (pass, why) => ({ by: 'history', ...(pass ? { pass } : {}), ...(why ? { why } : {}) });
const CARC = (why) => ({ by: 'carcassonne', ...(why ? { why } : {}) });

// His words of 2026-10-24, which most of the newest rules came from.
const D24 = '2026-10-24';
const WALLS = 'city caps are still present in the form of city walls (these are flat instead of curved like city caps) and sort of act as city walls. a city that isn\'t surrounded by walls can be pushed and gets more points if fully surrounded.';
const ACROSS = 'Wind cannot push tiles with city walls, if the wind is perpendicular to the wall, it still can if it\'s parallel.';
const MISMATCH = 'roads can no longer mismatch in any way and still stay together, when a peice is blown in such a way as to cause a mismatch, the piece falls instead';
const LEDGE = 'I don\'t know if we did this yet, but meeple that are blown off a ledge keep flying until they land on an island.';
const DISTRICTS = 'cities have different districts, garden, temple, residential, industrial, and trade, each a different color and texture.';
const COMPOUND = 'Cities get compounding levels of points depending on how many different districts they have.';
const CLOUD = 'every player start with a person zephyr that is an entire cloud as a tile, that blows in one direction. it can be moved every turn instead of placing a meeple. it activates when moved. it\'s interacts with zephyrs on tiles the same in that its gust can be amplified by them and vice versa.';
const LONE = 'for now remove single castle wall tiles from the tile pool, just want to see what it looks like.';
const BALENA = 'for now, remove the balena in the default rules';
// …and of 2026-10-25.
const D25 = '2026-10-25';
const SEVENTY_TWO = 'make sure we stick to 72 tiles, and add to the artifact a list of all our tiles, and any extra, and toggle for them all';
const SEVENTEEN = 'map needs to be 17x17 in order to allow the palazzo to be perfectly in the middle';
const WRAP = 'instead of flying off the side of the world, tiles that are pushed off the map appear on the other side pac-man style, still connected';
const GATES = 'since city walls now push to the edges of tiles, farmland can now be placed against a city wall, as well as roads, as if the road is running straight from the middle of the castle wall.';

export const GROUPS = [
  { id: 'game', name: 'The game', ask: 'Who plays, what is on the table, and the map.' },
  { id: 'turn', name: 'Your turn', ask: 'Laying a tile, and what comes after it.' },
  { id: 'followers', name: 'Followers', ask: 'Claiming, going home, walking and lying flat.' },
  { id: 'wind', name: 'The wind', ask: 'What a gust does to the country.' },
  { id: 'storm', name: 'Zephyrs in a storm', ask: 'How one wind sets off the next.' },
  { id: 'fall', name: 'Out of the sky', ask: 'What falls, and where it goes.' },
  { id: 'blown', name: 'Followers in the wind', ask: 'Where a gust puts the people it picks up.' },
  { id: 'land', name: 'Mainland and islands', ask: 'Which country is which, and why it matters.' },
  { id: 'spheres', name: 'Spheres', ask: 'The only thing that scores.' },
  { id: 'colours', name: 'Green, red and yellow', ask: 'What three of the four colours pay.' },
  { id: 'cities', name: 'Cities', ask: 'Districts, walls, and what blue pays.' },
  { id: 'cloud', name: 'Your cloud', ask: 'The wind of your own.' },
  { id: 'tiles', name: 'Windmills and flying machines', ask: 'Two tiles with rules of their own.' },
  { id: 'end', name: 'The end of the season', ask: 'When it ends, and the last scoring.' },
  { id: 'options', name: 'Options', ask: 'Rules that are off unless a game switches them on.' },
];

export const RULES = [
  // --- The game. --------------------------------------------------------------
  { n: 1, id: 'game-players', group: 'game',
    text: 'Soffiando is for one to four players, and each has eight followers.',
    from: H('twelfth', 'Eight each, one more than Carcassonne\'s seven, because everything comes home off a scored feature and the supply turns over.') },
  { n: 2, id: 'game-start', group: 'game',
    text: 'The game starts with one tile on the board, the Palazzo, in the middle of the map. Players take turns in order.',
    from: H('seventh', 'The Palazzo is the seat of the kingdom, the tile the game starts on.') },
  { n: 3, id: 'game-deck', group: 'game',
    text: 'The deck is 72 tiles, shuffled, each one named in the deck list: 15 districts, 16 sfera halves (four of each colour), 18 zephyrs and cannons, 3 windmills, 4 temples and a temple on a road, 3 Abbazias, 3 flying machines, 2 windvanes and 7 plain roads. Every other tile is an extra, not dealt; lone city walls are among them, for now.',
    from: T(D25, SEVENTY_TWO, 'Which 72 is Claude\'s call, named to Timothy when it shipped: every sfera half, an end, a corner and a through-piece of each district kind, a quarter of the deck weather; the three-way and all-round districts wait as extras. The lone walls have been out since 2026-10-24 ("' + LONE + '").'),
    settings: ['deck'], changed: D25,
    was: 'The deck is 112 tiles, shuffled: every tile of the cloud set, filled up with roads, fields and temples from the base set. For now no tile that is mainly a lone city wall is dealt; a sfera or wind tile that carried one comes without it.' },
  { n: 4, id: 'game-map', group: 'game',
    text: 'The map is 17 squares a side, with the Palazzo\'s square in the very middle.',
    from: T(D25, SEVENTEEN), changed: D25,
    was: 'The map is 16 squares a side, with the Palazzo\'s square one off its middle. Nothing is ever laid outside it.' },
  { n: 67, id: 'game-wrap', group: 'game',
    text: 'The map wraps round: each edge meets the edge across from it, so the squares along the east edge are next to the squares along the west edge, and the north next to the south. A tile laid on one edge must match what is across the seam, and a tile the wind carries off one edge comes on at the other, still joined to whatever it was joined to. Nothing is ever lost off the map.',
    from: T(D25, WRAP, 'Read as a map whose edges meet everywhere, for everything: laying, joining, the islands and the wind, not only for a tile in flight.'),
    added: D25 },

  // --- Your turn. -------------------------------------------------------------
  { n: 5, id: 'turn-draw', group: 'turn',
    text: 'On your turn you draw the top tile and lay it. A tile that fits nowhere is set aside and you draw the next.',
    from: CARC() },
  { n: 6, id: 'turn-fit', group: 'turn',
    text: 'It must touch the country, and every edge it touches must match: road to road, city to city, field to field, sfera half to sfera half, and a city wall to a field, a road or another wall (rule 68). An Abbazia\'s edges match anything. You may turn it first.',
    from: CARC('With the sfera half, the Abbazia and the city wall added.'), changed: D25,
    was: 'It must touch the country, and every edge it touches must match: road to road, city to city, field to field, sfera half to sfera half. An Abbazia\'s edges match anything. You may turn it first.' },
  { n: 7, id: 'turn-reach', group: 'turn',
    text: 'It must touch the mainland (rule 40), or an island you already have a follower standing on.',
    from: H('eighth', 'No building on islands at all at first; on an island you stand on since the fifteenth pass, and YOUR follower since the twenty-first. Timothy liked the island puzzle in his review of 2026-10-22 (INTENT.md).') },
  { n: 8, id: 'turn-step', group: 'turn',
    text: 'Then your follower step: claim a feature on the tile you laid (rule 10), set your cloud down (rule 56), or neither. On a turn you laid a flying machine you may use its flight instead (rules 61 and 62). Before any of that, once a turn, you may lay one of your followers flat (rule 16).',
    from: CARC('The follower step is Carcassonne\'s; the cloud, the flight and lying flat are this mode\'s.') },
  { n: 9, id: 'turn-catch', group: 'turn',
    text: 'If your own weather knocks tiles out of the sky back onto the deck (rule 31), you lay one more tile that turn: the top of the deck, which is the last tile that fell. Once a turn, however many fall.',
    from: H('sixteenth', 'Catch and throw. Until 2026-10-25 the fallen tiles went to the bottom of the deck, so the tile you laid was not one that fell; found writing this rulebook and fixed to what the rule always said.') },

  // --- Followers. ------------------------------------------------------------
  { n: 10, id: 'followers-claim', group: 'followers',
    text: 'To claim, put a follower on a road, a field, a temple or a district of the tile you just laid, if nobody has a follower anywhere in that feature. Never on a sfera half, and never on a wall.',
    from: T(D24, WALLS, 'A wall closes the city it faces but is not part of it you can stand in. The rest is Carcassonne.') },
  { n: 11, id: 'followers-island', group: 'followers',
    text: 'You may only claim on an island if you already have a follower standing on it.',
    from: H('eighth', 'As rule 7. Timothy liked that reaching an island is a puzzle (review of 2026-10-22, INTENT.md).') },
  { n: 12, id: 'followers-one', group: 'followers',
    text: 'A tile holds one figure at most.',
    from: H(null) },
  { n: 13, id: 'followers-home', group: 'followers',
    text: 'When a sphere pays a feature (rule 44), every follower in it goes home, paid or not, except one lying flat.',
    from: H('thirteenth', 'Scoring a feature empties it, finished or not, so a follower put down early does not collect from every sphere for the rest of the game.') },
  { n: 14, id: 'followers-walk', group: 'followers',
    text: 'One of yours that a sphere sends home during your turn may walk instead: along a road on the tile it stood on, and any road that one hops to (rule 15), into a district or temple nobody holds on a tile along the way, but not back into what it just left. With nowhere to go it may stand on the road itself, if nobody is on it. It may not walk a road someone else has a follower on.',
    from: H('twelfth', 'Made reachable in the twenty-first pass; until then the host overwrote the walk the moment it was offered.') },
  { n: 15, id: 'followers-hop', group: 'followers',
    text: 'A road that runs off a tile into open sky, and lines up with a road on the next tile along however far away, is one a walker can step across. The two halves still score as two roads.',
    from: H('twelfth', 'There was a sky bridge across a one-square gap at first, and the halves scored as one road; the step, over any distance, is the half that was kept.') },
  { n: 16, id: 'followers-flat', group: 'followers',
    text: 'Once a turn you may lay one of your followers standing in a city flat. It never comes home again, even when the city is paid, and a city held only by followers lying flat never pays the walled double (rule 52).',
    from: H('twelfth', 'Until 2026-10-24 a flat follower held its city at "the lower rate", a point a tile; with districts that became no walled double.') },

  // --- The wind. -------------------------------------------------------------
  { n: 17, id: 'wind-blows', group: 'wind',
    text: 'A zephyr blows the moment its tile is laid, down its lane: every square from it the way it points, to the edge of the map. What it pushes over the edge comes on at the other side (rule 67), but the wind takes hold of nothing past the edge.',
    from: H('first', 'The edge part is Claude\'s call of 2026-10-25, named to Timothy when it shipped: measured with the wind going on round the map to its own back as well, a game had half as many gusts again and twice the falls.'),
    changed: '2026-10-25',
    was: 'A zephyr blows the moment its tile is laid, down its lane: every square from it the way it points, to the edge of the map.' },
  { n: 18, id: 'wind-loose-end', group: 'wind',
    text: 'It does nothing to the country it passes through. It moves the loose end: where the line of tiles in its lane stops, the last tiles before the gap come away, as many as the wind\'s power, and each goes that many squares on, stopping early against anything in its way.',
    from: H('thirteenth') },
  { n: 19, id: 'wind-every-run', group: 'wind',
    text: 'The wind crosses gaps: it takes the loose end of every run of tiles down its lane, and keeps its power across the open sky between them.',
    from: H('fifteenth') },
  { n: 20, id: 'wind-own-tile', group: 'wind',
    text: 'A zephyr\'s own tile never moves with its own wind.',
    from: H('thirteenth', 'For a few passes a zephyr went one square with its own wind; that was taken back.') },
  { n: 21, id: 'wind-whole-island', group: 'wind',
    text: 'Only the mainland is too big to lift: an island the wind reaches moves whole, with everything on it, up to the wind\'s power, and comes to rest against whatever stops it.',
    from: H('fifteenth') },
  { n: 22, id: 'wind-walls', group: 'wind',
    text: 'A tile with a city wall standing square across the wind is not moved by it, and neither is an island with such a tile in it. A wind running along a wall moves it like anything else.',
    from: T(D24, ACROSS) },
  { n: 23, id: 'wind-vane', group: 'wind',
    text: 'A windvane the wind reaches turns so the road running through it lies along the wind.',
    from: H('first', 'It is the only tile the weather turns; straight roads swung too for a while.') },
  { n: 24, id: 'wind-turbine', group: 'wind',
    text: 'Every gust that reaches a windmill pays 2 to whoever holds the feature it stands in once the gust has passed (a holder it blew off the mill is not paid).',
    from: H('fifth') },

  // --- Zephyrs in a storm. ---------------------------------------------------
  { n: 25, id: 'storm-absorb', group: 'storm',
    text: 'A gust that crosses a zephyr pointing its own way absorbs it, and blows one power harder beyond it.',
    from: H('third', 'It stopped at power three until the sixteenth pass.') },
  { n: 26, id: 'storm-wake', group: 'storm',
    text: 'A gust that reaches a zephyr pointing any other way wakes it: the storm carries on down that zephyr\'s lane, one power harder than it arrived, or at the zephyr\'s own power if that is more.',
    from: H('fourth', 'One power harder for every corner since the sixteenth pass.') },
  { n: 27, id: 'storm-once', group: 'storm',
    text: 'In one storm each zephyr blows each of its ways at most once.',
    from: H('sixteenth', 'This is what keeps a chain of zephyrs finite.') },
  { n: 28, id: 'storm-multi', group: 'storm',
    text: 'A zephyr that points two, three or four ways blows down every one of those lanes.',
    from: H('fourth') },
  { n: 29, id: 'storm-double', group: 'storm',
    text: 'A double zephyr opens at power two.',
    from: H('tenth') },
  { n: 30, id: 'storm-cannon', group: 'storm',
    text: 'A gust cannon fires the loose end instead of carrying it: each tile flies until the square in front of it is taken, however far, round the map if it has to (rule 67). With nothing else in its row or column, that is the back of its own cannon.',
    from: H('sixteenth', 'Before the map had an edge a tile fired at nothing went back on the deck; from 2026-10-24 it flew off the map; since the map wraps, it comes round.'),
    changed: D25,
    was: 'A gust cannon fires the loose end instead of carrying it: each tile flies until the square in front of it is taken, however far, and one with nothing in front flies off the map (rule 33).' },

  // --- Out of the sky. -------------------------------------------------------
  { n: 31, id: 'fall-mismatch', group: 'fall',
    text: 'A tile the wind moved falls if any of its edges now meets a neighbour it does not match. It goes back on top of the deck.',
    from: T(D24, MISMATCH, 'Until then a moved tile stayed up if any one edge matched.') },
  { n: 32, id: 'fall-alone', group: 'fall',
    text: 'A tile touching nothing does not fall: it hangs in the sky.',
    from: H('fourteenth', 'Fragments are where islands come from; dropping them had healed the board back into one mass every turn.') },
  { n: 34, id: 'fall-followers', group: 'fall',
    text: 'A follower on a tile that falls goes home.',
    from: H('fourteenth'), changed: D25,
    was: 'A follower on a tile that falls, or goes over the edge, goes home.' },

  // --- Followers in the wind. ------------------------------------------------
  { n: 35, id: 'blown-lane', group: 'blown',
    text: 'Followers on tiles that move ride them. Every other follower on a tile the gust reaches is picked up and put down downwind, as many squares as the wind\'s power there.',
    from: H('third') },
  { n: 36, id: 'blown-ride', group: 'blown',
    text: 'A follower put down on a zephyr is in that wind: it goes on down the zephyr\'s lane as far as its power, and again if that lands it on another.',
    from: H('thirteenth') },
  { n: 37, id: 'blown-fly-on', group: 'blown',
    text: 'A follower blown off the end of the country keeps flying downwind until it lands on a tile, round the map if it has to (rule 67).',
    from: T(D24, LEDGE, '"Until they land on an island" read as the next tile of any kind in its lane, which is usually an island. Since the map wraps there is always one, so the wind never sends a flier home.'),
    changed: D25,
    was: 'A follower blown off the end of the country keeps flying downwind until it lands on a tile. Only one with no tile anywhere ahead goes home.' },
  { n: 38, id: 'blown-occupied', group: 'blown',
    text: 'A follower that would land on a tile with a figure on it stays where it was; if that tile has gone too, it goes home.',
    from: H(null) },
  { n: 39, id: 'blown-feature', group: 'blown',
    text: 'Where it lands, it holds the same kind of feature if the tile has one, or else whatever it can; on a tile with nothing to hold, like an Abbazia, it stands holding nothing.',
    from: H('third') },

  // --- Mainland and islands. -------------------------------------------------
  { n: 40, id: 'land-mainland', group: 'land',
    text: 'The biggest piece of connected country is the mainland. Every other piece, down to a single tile, is an island.',
    from: H('eighth', 'The mainland was wherever the Palazzo stood until the sixteenth pass made it the biggest piece; every fragment has been an island since the fifteenth.') },
  { n: 41, id: 'land-double', group: 'land',
    text: 'Everything on an island pays double.',
    from: H('eighth', 'Half again as much at first; double now.') },
  { n: 42, id: 'land-tow', group: 'land',
    text: 'When the wind moves the Palazzo, every island slides one square the same way, if all of it can: nothing in its way and no wall across the wind. That includes the Palazzo itself if the gust has left it adrift. A tile towed against an edge it does not match falls.',
    from: H('eighth', 'Walls across the wind since 2026-10-24.'), changed: D25,
    was: 'When the wind moves the Palazzo, every island slides one square the same way, if all of it can: nothing in its way and no wall across the wind. That includes the Palazzo itself if the gust has left it adrift. A tile towed over the edge is gone, and one towed against an edge it does not match falls.' },

  // --- Spheres. --------------------------------------------------------------
  { n: 43, id: 'sphere-halves', group: 'spheres',
    text: 'A sfera half meets only another sfera half, of any colour.',
    from: H('third', 'Colours since the ninth pass.') },
  { n: 44, id: 'sphere-close', group: 'spheres',
    text: 'Two halves meeting close a sphere, whether a tile was laid or the wind pushed them together. Both halves fire: each scores its colour over the whole board, paying whoever holds each feature of that kind (rules 47 to 49, and 51). A pair fires once.',
    from: H('tenth', 'Nothing else in the mode scores; the pairing is the decision.') },
  { n: 45, id: 'sphere-majority', group: 'spheres',
    text: 'A feature pays whoever has the most followers in it; tied, each of them is paid in full.',
    from: CARC() },
  { n: 46, id: 'sphere-only', group: 'spheres',
    text: 'Nothing pays for being finished, except windmills (rule 59).',
    from: H('tenth') },

  // --- Green, red and yellow. ------------------------------------------------
  { n: 47, id: 'colour-green', group: 'colours',
    text: 'Green pays each farm a point for every two tiles of field, rounded down.',
    from: H('tenth') },
  { n: 48, id: 'colour-red', group: 'colours',
    text: 'Red pays each temple\'s keeper a point for every tile in the eight squares around it. An Abbazia with a follower on it counts as a temple.',
    from: H('tenth', 'Red is a temple\'s only income since the temple\'s offering went.') },
  { n: 49, id: 'colour-yellow', group: 'colours',
    text: 'Yellow pays each road a point a tile, plus 1 for each city it runs into that is still open and 2 for each that is closed. A road runs into a city on a tile that carries both, or through a gate in its wall (rule 68).',
    from: T(D25, GATES, 'A road "running straight from the middle of the castle wall" read as one that arrives at the city behind the wall, so yellow pays for that city. The rest is from the twelfth pass.'),
    changed: D25,
    was: 'Yellow pays each road a point a tile, plus 1 for each city it runs into that is still open and 2 for each that is closed. A road runs into a city on a tile that carries both.' },

  // --- Cities. ---------------------------------------------------------------
  { n: 50, id: 'city-districts', group: 'cities',
    text: 'A city is made of districts: whole squares of garden, temple, residential, industrial or trade. A district opens onto the sides its city runs on through and is walled on the rest.',
    from: T(D24, DISTRICTS) },
  { n: 51, id: 'city-blue', group: 'cities',
    text: 'Blue pays each city a point a district, plus 1, 3, 6 or 10 when its districts are of two, three, four or five different kinds.',
    from: T(D24, COMPOUND, 'The compounding is a bonus that grows by one more with each new kind. A multiplier was measured first and made cities 62% of all points (MODES.md, twenty-third pass).') },
  { n: 52, id: 'city-walled', group: 'cities',
    text: 'A city closed all round by walls pays double.',
    from: T(D24, WALLS, '"More points" read as double.') },
  { n: 68, id: 'city-gate', group: 'cities',
    text: 'A district\'s walls stand on the edge of its tile. Farmland may lie against a wall, and stops there; a road may run into one, and ends there, at a gate in the middle of the wall; and two walls may stand back to back.',
    from: T(D25, GATES, 'A road into a wall is closed at that end, as a road into an Abbazia is. No field runs under a wall any more: until this a district tile carried a strip of farmland on its walled sides that joined the farms on either side of a city through it.'),
    added: D25 },
  { n: 53, id: 'city-reopen', group: 'cities',
    text: 'If the wind opens a city that was closed, whoever holds it loses a point a district.',
    from: H('twelfth', 'A point a tile until districts, 2026-10-24.') },
  { n: 54, id: 'city-abbazia', group: 'cities',
    text: 'An Abbazia closes any road or city side it touches. If the wind takes it away, that side is open again.',
    from: H('second') },

  // --- Your cloud. -----------------------------------------------------------
  { n: 55, id: 'cloud-start', group: 'cloud',
    text: 'Every player has a cloud of their own, a whole tile of cloud that blows one way. It starts in hand.',
    from: T(D24, CLOUD), settings: ['clouds'] },
  { n: 56, id: 'cloud-set', group: 'cloud',
    text: 'Instead of claiming, you may set your cloud down on an open square of sky beside the country, across the seam of the map too (rule 67), and not where a cloud is, facing any way. It blows the moment it lands, and your turn ends.',
    from: T(D24, CLOUD, 'Two calls of Claude\'s, told to Timothy when it shipped: you choose the facing each time, and only beside the country, since a cloud further out in the same lane blows the same tiles.'), settings: ['clouds'],
    changed: D25,
    was: 'Instead of claiming, you may set your cloud down on an open square of sky beside the country, inside the map and not where a cloud is, facing any way. It blows the moment it lands, and your turn ends.' },
  { n: 57, id: 'cloud-zephyr', group: 'cloud',
    text: 'Where it stands, a cloud is a zephyr to every storm (rules 25 to 27), and its own gust is hardened by the zephyrs it crosses.',
    from: T(D24, CLOUD), settings: ['clouds'] },
  { n: 58, id: 'cloud-fixed', group: 'cloud',
    text: 'The wind never moves a cloud; tiles slide under it as under the sky.',
    from: C('Only its owner moves it, which is the point of having one.'), settings: ['clouds'] },

  // --- Windmills and flying machines. -----------------------------------------
  { n: 59, id: 'windmill-finish', group: 'tiles',
    text: 'When a road or city with windmills in it closes, each windmill pays 2 to whoever holds it.',
    from: H('twelfth', 'Paid to the holder, not to whoever laid the last tile.') },
  { n: 60, id: 'flight-path', group: 'tiles',
    text: 'A flying machine, on the turn it is laid, flies its way across the board, over open sky too, and turns with any zephyr it crosses; one pointing back at it ends the flight.',
    from: H('second', 'Across open sky since the seventh pass.') },
  { n: 61, id: 'flight-claim', group: 'tiles',
    text: 'On that follower step you may put a follower on any feature of any tile along the flight, held or not and on an island or not, if the tile has no figure on it. Never on a wall.',
    from: H('second', 'The one way to choose to be somewhere.') },
  { n: 62, id: 'flight-lift', group: 'tiles',
    text: 'Or you may lift one of yours off a tile along the flight (it goes home), and then put one down further along, or not.',
    from: H('tenth') },

  // --- The end of the season. ------------------------------------------------
  { n: 63, id: 'end-when', group: 'end',
    text: 'The season ends when the deck runs out, when 96 tiles have been laid, or if the sky is ever empty.',
    from: H('second', 'Counted in tiles laid, not rounds, because blown tiles come back.') },
  { n: 64, id: 'end-archipelago', group: 'end',
    text: 'At the end, 10 points go to whoever has followers on the most separate islands; tied, to each of them.',
    from: H('eighth', 'Counted before the last scoring since the ninth pass.') },
  { n: 65, id: 'end-last', group: 'end',
    text: 'Then every colour fires once more.',
    from: H('ninth') },

  // --- Options. --------------------------------------------------------------
  { n: 66, id: 'option-balena', group: 'options',
    text: 'With the Balena (off unless a game turns it on), a sky whale lies on one tile, which no wind moves and no gust passes; instead of claiming you may send it to any tile.',
    from: T(D24, BALENA), settings: ['balena'] },
];

/** Rule numbers taken out, never used again. */
export const RETIRED = [
  33,   // fall-edge, 2026-10-25: "A tile the wind carries over the edge of the map is gone for good." The map wraps now (rule 67).
];

export const RULEBOOK = {
  soffiando: { name: 'Soffiando', groups: GROUPS, rules: RULES, retired: RETIRED },
};
