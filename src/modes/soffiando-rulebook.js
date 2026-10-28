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
const LONE = 'for now remove single castle wall tiles from the tile pool, just want to see what it looks like.';
const BALENA = 'for now, remove the balena in the default rules';
// …and of 2026-10-25.
const D25 = '2026-10-25';
const SEVENTY_TWO = 'make sure we stick to 72 tiles, and add to the artifact a list of all our tiles, and any extra, and toggle for them all';
const SEVENTEEN = 'map needs to be 17x17 in order to allow the palazzo to be perfectly in the middle';
const WRAP = 'instead of flying off the side of the world, tiles that are pushed off the map appear on the other side pac-man style, still connected';
// …and of 2026-10-26.
const D26 = '2026-10-26';
const STICK = 'when I make the physical game, being like an actual little like stick that you use to push tiles, because it just sounds really fun. So with that said, that means that like That means you\'re going to be able to push like entire lanes of tiles, which could be really interesting. But I also want to still somehow make it so that it\'s possible for islands to form really often.';
const WOVEN = 'we need to weave these rules into the actual game, not as toggles.';
const MOVE_ON = 'Instead of the tiles that crack falling into the, just falling into nowhere land, if there\'s room for that tile to move, then you can basically move the tile one space away if your choice so that it is no longer mismatched with anything. If it is completely surrounded by tiles, then yes, it still falls into nowhere land.';
const GATES = 'since city walls now push to the edges of tiles, farmland can now be placed against a city wall, as well as roads, as if the road is running straight from the middle of the castle wall.';
// …and of 2026-10-27.
const D27 = '2026-10-27';
const UNCLAIMED = 'things that go unclaimed are scored by whoever places the last piece of that feature (roads and cities)';
const FIVE = 'you only have 5 meeple';
const MATCH = 'sfera can\'t be mixed and matched anymore, each color has to go to each color';
const BIG = 'one very large sfera that\'s a black hole, and one that\'s a sun. they do something, not sure yet. they are four corners of blocks that come together into a 2x2 sphere';
const TOWERS = 'sfera are now know as towers and look different but they still have the  colors and the round interior';
const POWER = '"push power" (how many tiles you can push with your cloud pusher zeyphr thing) is based on how many abbazzias are present on the board';
const JOIN = 'you can add meeple to finished roads and cities even if other meeple are there, but not if they are closed.';
const ONE = 'both players start with 1 "push power"';
const NO_TEMPLE = 'don\'t need temple district as abazzias are basically that, just give us a few more abbazias';
const PLAZA = 'i don\'t want the pallazzo to really do anything anymore. also, let\'s call is the plaza and make it more like a plaza';
const WHOLE = 'the rule about island being moved all as one piece is no longer a thing';
const CLOISTERS = 'the cloister types things we have, just make those abbazias, and you not longer claim them, and remind me if they did something  that i can\'t remember';
const CHAIN = 'chaining zephyrs from your main one works like this: your zephyrs blows, pushing what it pushes. if any of the pushed tiles had a zephyr, they then push tiles as well, based on their push power plus yours (a zephyr on a tile has one push power be default) and it chains as it goes.';
const EVERY_TURN = 'want to make it so you have to use your zephyr every turn in addition to placing a tile and placing a meeple (placing a meeple is still optional)';
const AREA = 'you can blow on an area even if you can\'t move any tiles, and it will still move meeple.';
const PROTECT = 'meeple can\'t be blow through walls but tiles with castle wall can still be moved by winds. castle walls protect meeple, towers/sfera protect tiles';
const OPEN_CLOSED = 'don\'t know if it\'s  thing yet but open cities make 1 per tile, closed make 2 per.';
const GARDENS = 'every garden district you have scores the city an extra 2p, closed or open.';
// …and of 2026-10-28.
const D28 = '2026-10-28';
const TWO_COLOURS = 'tiles that have towers on them should have different colored towers on the other side';
// …and later that day.
const WALLS_ANY = 'wall should be able to take field, wall, road, or city, basically like abbazias';
const NO_FLAT = 'remove laying meeple flat';
const ABB_CLAIM = 'abbazias can be claimed by flying machine or by just being blown into them as long as they are empty';
const ABB_SCORE = 'you can\'t place a meeple on an abbazia that you place, you have to blow or flying machine into them from elsewhere. when you do you hold it outright, and it scores 1 point for every tile surrounding it, and and extra point for every meeple (besides the one that claimed it)';
const NO_CUT = 'you can\'t "cut" with the zephyr, as in you can\'t only push from an open space, no from inbetween two tiles that are next to each other. you can however blow and have an anchor like a tower keep everything in your lane from moving,  but only up until the tower, stuff past it still moves.';
const ANCHORS = 'complete towers, and big tower quarters';
const MILLS3 = 'windmills should reward 3 points when blown or in a feature';
const EIGHT_MEEPLE = 'let\'s go back to having 8 meeple';
const MILLS_ON = 'windmills should just be on different kinds of tiles, not be specifically and side option on abbazia tiles, same goes for wind waves and flying machines';
const SMATTERING = 'we can just add a smattering of features';
const CITIES_HELD = 'let\'s make cities not give points but closing, just like normal claiming rules and from towers';
const FLIERS_ANY = 'flying machines shouldn\'t be competing with district faces, they should be on all different kinds of tiles';
// …and later still.
const STAY = 'when you stay in a city, or because you stay in a city even after you\'ve claimed it, that means that you\'re risking the chance to score continuously from towers, but at risk of losing points because you\'re still in the city and the city could get opened. So you\'re kind of testing fate, because you could just leave the city if you wanted to.';
const MOVE = 'instead of placing a meeple, you can move a meeple instead. And meeple can move, they can move one space for their turn. And if they move using a road, they can move all the way down the road.';
const ROADS_TOO = 'the closing rule also applies to roads as well. So you can\'t get points from a road that you don\'t own when you close it.';
const PER_TILE = 'towers score cities 1 point per tile, whether it\'s closed or open.';
const NO_JOIN = 'we\'re revoking the rule that says that you can place meeple even on things already claimed by enemy meeple.';
const BONUSES = 'bonuses are only for completing the city and at the end when scored';
// …and the round after that.
const CLOISTER = 'make abbazzias only get points for adjacent squares like cloisters';
const GATED = 'make it so meeple can move past walls, that have to have a road meet the wall to be able to move through them. this means cities with no roads attached them cannot leave that city that way';
const BOTH_ABBAZIA = 'the abbazias tiles should have abbazias on both sides';
// …and the round after that.
const STAY_ALL = 'followers no longer come back in general, even from roads.';
const SPECIALS = 'specials can be on city faces too';
const OVER_WALLS = 'meeple can be blown over walls now, to allow for placement into/out of  cities and abbazias';
const BLOWN_IN = 'Meeple that are blown into cities can enter them even if there are enemy meeple there.';
const CALCOLO = 'new wooden block call the Calcolo, its a square stone that can be moved instead of blowing something that turn. it cannot be blown, so putting but behind a lanes of tiles stops that lane from moving, and also in turn enables you to just move meeple instead';
const GARDEN_3 = 'cities earn and extra 1 point per garden district open or closed, scored either way, so you can say that garden tiles are worth 3p';
const EVERY = 'cities earn a bonus 5p if they have at least one of every district closed.';
const TRADE = 'trade districts are worth 2p extra for each road attached to the city, closed';
const KEEP = 'new district: keep. it replaces industrial district. the keep is a tower that grows upwards. you have tower peices and can place them to stack the tower instead of place or moving a meeple. the keep tile starts as worth the normal amount, 1 for open, 2 for closed, and every stack of the tower makes the keep worth double that (1, 2, 4, 8, 16). the towers can collapse if blown, wherein it goes back to being worth the original point amount.';
const RESIDENTIAL = 'the residential district is worth the normal amount but allows you to place meeple there on your turn if you own that city, even if you already have meeple there.';
const SAME_BOTH = 'Both sides of all the tiles should generally have like the same type of structure, just with some options changed. For example, like city tiles on both sides and roads on both sides.';
const NO_CANNON = 'totally forget what the cannon does but it may be usless now that we have the new zephyrs';
const NO_FARMERS = 'ok no more farmers actually. the green scoring from towers simply measures who has control of the landmass (who has the most meeple) a awards them with 5 points. this means you can get 5 points from even a tiny island';
// …and later on 2026-10-27.
const HALVES = 'let a blow move tower halves.';
const INEVITABLE = 'also make it so you must place a sun or black hole attached correctly to another, so there completion is inevitable.';
const EIGHT = 'there has to be eight tiles becuase there needs to be the choice of what to build and both need to be present by the end of the game, so yea back to eight tiles with both on each side sorry. if a sun is already made then you have to make a black hole, and vice versa';
const WALLED = 'the sun and black hole tiles should have castle walls on the field sides so they can be placed sort of no matter what';
const DOUBLE = 'make tiles double sided, and you choose what side to play when you place them. the sun and void tiles are actually the same four tiles just with the sun quarter one side and the black hole on the other. this also basically means that there are 72 tiles in the game but 72x2 of tiles faces to play.';

export const GROUPS = [
  { id: 'game', name: 'The game', ask: 'Who plays, what is on the table, and the map.' },
  { id: 'turn', name: 'Your turn', ask: 'Laying a tile, and what comes after it.' },
  { id: 'followers', name: 'Followers', ask: 'Claiming, staying, and moving.' },
  { id: 'stick', name: 'Your zephyr', ask: 'The blow every turn ends with, and how hard it pushes.' },
  { id: 'wind', name: 'The wind', ask: 'What a push does to the country.' },
  { id: 'storm', name: 'Zephyrs in a chain', ask: 'How one push sets off the next.' },
  { id: 'fall', name: 'Out of the sky', ask: 'What no longer fits, and where it goes.' },
  { id: 'blown', name: 'Followers in the wind', ask: 'Where a blow puts the people it picks up.' },
  { id: 'land', name: 'Mainland and islands', ask: 'Which country is which, and why it matters.' },
  { id: 'spheres', name: 'Towers', ask: 'The scoring: towers, the sun and the black hole.' },
  { id: 'colours', name: 'Green, red and yellow', ask: 'What three of the four colours pay.' },
  { id: 'cities', name: 'Cities', ask: 'Districts, walls, and what blue pays.' },
  { id: 'tiles', name: 'Windmills and flying machines', ask: 'Two tiles with rules of their own.' },
  { id: 'end', name: 'The end of the season', ask: 'When it ends, and the last scoring.' },
  { id: 'options', name: 'Options', ask: 'Rules that are off unless a game switches them on.' },
];

export const RULES = [
  // --- The game. --------------------------------------------------------------
  { n: 1, id: 'game-players', group: 'game',
    text: 'Soffiando is for one to four players, and each has eight followers.',
    from: T(D28, EIGHT_MEEPLE, 'Five from the day before ("' + FIVE + '").'),
    changed: D28,
    was: 'Soffiando is for one to four players, and each has five followers.' },
  { n: 2, id: 'game-start', group: 'game',
    text: 'The game starts with one tile on the board, the Plaza, in the middle of the map: a paved square with a road out of each side. It does nothing else. Players take turns in order.',
    from: T(D27, PLAZA, 'Four roads, each ending at the square, is Claude\'s reading of "more like a plaza". It was the Palazzo, the seat of the kingdom, which towed the islands (rule 42).'),
    changed: D27,
    was: 'The game starts with one tile on the board, the Palazzo, in the middle of the map. Players take turns in order.' },
  { n: 3, id: 'game-deck', group: 'game',
    text: 'The deck is 72 tiles, shuffled, each with two faces of the same structure (rule 80) and named in the deck list: 19 with a district on both faces, of the same shape and two different kinds; 18 with a road on both faces, of the same shape; 16 with a tower half on each face, of two different colours; 8 with a quarter of the sun on one face and a quarter of the black hole on the other; and 11 with an Abbazia on both faces. Among the districts and roads, twelve faces carry a zephyr, six a windmill, five a flying machine, and two crossings are windvanes. Every other tile is an extra, one-faced and not dealt: the zephyrs with no road, the temples and temple districts among them, and for now the lone city walls.',
    from: T(D28, SAME_BOTH, 'And "' + SPECIALS + '". Which pairs, and how the specials are spread (as many zephyrs, windmills and windvanes as before, a flying machine on a straight road too), is Claude\'s call, named to Timothy when it shipped. The cannons went ("' + NO_CANNON + '"; asked, remove it). Earlier the same day: "' + BOTH_ABBAZIA + '", and the towers two-coloured ("' + TWO_COLOURS + '"). Still 72 ("' + SEVENTY_TWO + '").'),
    settings: ['deck'], changed: D28,
    was: 'The deck is 72 tiles, shuffled, each with two faces (rule 80) and named in the deck list: 37 with a district on one face and a road of the same shape on the other, twelve of those roads carrying a zephyr or a gust cannon; 16 with a tower half on each face, of two different colours; 8 with a quarter of the sun on one face and a quarter of the black hole on the other; and 11 with an Abbazia on one face and a windmill, a flying machine or a windvane on the other. Every other tile is an extra, one-faced and not dealt: the zephyrs and cannons with no road, the temples and temple districts among them, and for now the lone city walls.' },
  { n: 4, id: 'game-map', group: 'game',
    text: 'The map is 17 squares a side, with the Plaza\'s square in the very middle.',
    from: T(D25, SEVENTEEN), changed: D27,
    was: 'The map is 17 squares a side, with the Palazzo\'s square in the very middle.' },
  { n: 67, id: 'game-wrap', group: 'game',
    text: 'The map wraps round: each edge meets the edge across from it, so the squares along the east edge are next to the squares along the west edge, and the north next to the south. A tile laid on one edge must match what is across the seam, and a tile pushed off one edge comes on at the other, still joined to whatever it was joined to. Nothing is ever lost off the map.',
    from: T(D25, WRAP, 'Read as a map whose edges meet everywhere, for everything: laying, joining, the islands and the wind, not only for a tile in flight.'),
    added: D25, changed: D27,
    was: 'The map wraps round: each edge meets the edge across from it, so the squares along the east edge are next to the squares along the west edge, and the north next to the south. A tile laid on one edge must match what is across the seam, and a tile the wind carries off one edge comes on at the other, still joined to whatever it was joined to. Nothing is ever lost off the map.' },

  // --- Your turn. -------------------------------------------------------------
  { n: 5, id: 'turn-draw', group: 'turn',
    text: 'On your turn you draw the top tile and lay it, either face up (rule 80). A tile that fits nowhere, either face up, is set aside and you draw the next.',
    from: CARC('Either face up since the tiles had two, 2026-10-27.'), changed: D27,
    was: 'On your turn you draw the top tile and lay it. A tile that fits nowhere is set aside and you draw the next.' },
  { n: 80, id: 'turn-faces', group: 'turn',
    text: 'Every tile has two faces, and you choose which one to lay: turn it over as well as round. It is drawn one face up, and turned over for you if only its other face fits anywhere. A tile that falls or is swallowed goes back into the deck with both its faces.',
    from: T(D27, DOUBLE, 'Drawn one face up and turned over for you when only the other fits is Claude\'s reading, so a tile is never set aside that could have been laid.'),
    added: D27 },
  { n: 6, id: 'turn-fit', group: 'turn',
    text: 'It must touch the country, and every edge it touches must match: road to road, city to city, field to field, and a tower half to a tower half of its own colour (rule 43). A city wall\'s edge takes anything (rule 68), and so does an Abbazia\'s, and the two outer edges of a quarter of the big tower, which goes only where rule 81 puts it. You may turn it first.',
    from: CARC('With the towers, the Abbazia and the city wall added.'),
    changed: D28,
    was: 'It must touch the country, and every edge it touches must match: road to road, city to city, field to field, a tower half to a tower half of its own colour (rule 43), and a city wall to a field, a road or another wall (rule 68). An Abbazia\'s edges match anything, and so do the two outer edges of a quarter of the big tower, which goes only where rule 81 puts it. You may turn it first.' },
  { n: 7, id: 'turn-reach', group: 'turn',
    text: 'It must touch the mainland (rule 40), or an island you already have a follower standing on. A quarter of the big tower goes into its 2x2 wherever that is (rule 81).',
    from: H('eighth', 'No building on islands at all at first; on an island you stand on since the fifteenth pass, and YOUR follower since the twenty-first. Timothy liked the island puzzle in his review of 2026-10-22 (INTENT.md). The big tower\'s exception is from 2026-10-27, so that it always closes.'),
    changed: D27,
    was: 'It must touch the mainland (rule 40), or an island you already have a follower standing on.' },
  { n: 8, id: 'turn-step', group: 'turn',
    text: 'Then your follower step: claim a feature on the tile you laid (rule 10), or move one of your followers already on the board instead (rule 82), or build a keep up instead (rule 83), or none of them. On a turn you laid a flying machine you may use its flight instead (rules 61 and 62). Then you blow (rule 70), or set the Calcolo down instead (rule 86), and your turn ends.',
    from: T(D27, EVERY_TURN, 'The blow last, after the follower step, is Claude\'s reading of the order he listed them in. Lying a follower flat went on 2026-10-28 ("' + NO_FLAT + '"), and moving one came in the same day ("' + MOVE + '").'),
    changed: D28,
    was: 'Then your follower step: claim a feature on the tile you laid (rule 10), or not. On a turn you laid a flying machine you may use its flight instead (rules 61 and 62). Before any of that, once a turn, you may lay one of your followers flat (rule 16). Then you blow (rule 70), and your turn ends.' },
  { n: 9, id: 'turn-catch', group: 'turn',
    text: 'If tiles fall back onto the deck on your turn (rule 31), you lay one more tile that turn: the top of the deck, which is the last tile that fell, and have a follower step for it, but you do not blow again. Once a turn, however many fall.',
    from: H('sixteenth', 'Catch and throw. Not blowing twice is Claude\'s call of 2026-10-27: one blow a turn, as he said.'), changed: D27,
    was: 'If tiles fall back onto the deck on your turn (rule 31), you lay one more tile that turn: the top of the deck, which is the last tile that fell. Once a turn, however many fall.' },

  // --- Followers. ------------------------------------------------------------
  { n: 10, id: 'followers-claim', group: 'followers',
    text: 'To claim, put a follower on a road or a district of the tile you just laid, if nobody has a follower in it, you included (but see rule 85). Never in a field (there are no farmers, rule 47), never on a road or city that is closed, a tower, a wall, or an Abbazia you have just laid: an Abbazia is held by a follower flown onto it (rule 61) or blown onto it (rule 39).',
    from: T(D28, NO_JOIN, 'Asked whether a road or city only you are in may be joined, he chose nobody\'s at all, as before 2026-10-27, when an open one could be joined ("' + JOIN + '"). No fields: "' + NO_FARMERS + '". The Abbazia: "' + ABB_SCORE + '".'),
    changed: D28,
    was: 'To claim, put a follower on a road, a field or a district of the tile you just laid. A road or city that is still open you may join however many followers are in it already, yours too; a field only if nobody has a follower in it. Never on a road or city that is closed, a tower, an Abbazia or a wall.' },
  { n: 11, id: 'followers-island', group: 'followers',
    text: 'You may only claim on an island if you already have a follower standing on it.',
    from: H('eighth', 'As rule 7. Timothy liked that reaching an island is a puzzle (review of 2026-10-22, INTENT.md).') },
  { n: 12, id: 'followers-one', group: 'followers',
    text: 'A tile holds one figure at most.',
    from: H(null) },
  { n: 13, id: 'followers-home', group: 'followers',
    text: 'A tower that pays a feature sends nobody home: a follower stays where it is, paid by every tower of its colour that fires, until the wind, a flight or a move takes it elsewhere.',
    from: T(D28, STAY_ALL, 'From the thirteenth pass a feature a tower paid was emptied, its followers home, so that one put down early did not collect for the rest of the game; earlier the same day a city kept its followers and a road did not.'),
    changed: D28,
    was: 'When a tower pays a feature (rule 44), every follower in it goes home, paid or not, except one lying flat.' },
  { n: 15, id: 'followers-hop', group: 'followers',
    text: 'A road that runs off a tile into open sky, and lines up with a road on the next tile along however far away, is one a follower moving down it (rule 82) can step across. The two halves still score as two roads.',
    from: H('twelfth', 'There was a sky bridge across a one-square gap at first, and the halves scored as one road; the step, over any distance, is the half that was kept. A walker sent home by a tower stepped across it until the walk went (rule 14, 2026-10-28).'),
    changed: D28,
    was: 'A road that runs off a tile into open sky, and lines up with a road on the next tile along however far away, is one a walker can step across. The two halves still score as two roads.' },
  { n: 82, id: 'followers-move', group: 'followers',
    text: 'Instead of claiming, you may move one of your followers already on the board: one square, to a tile beside it; or, if a road runs across the tile it stands on, down that road as far as it goes, and across any gap in it (rule 15), to any tile of it. Never onto a tile with a figure on it or an Abbazia, and never down a road somebody else has a follower on. Where it stops it keeps what it held, if that runs onto the tile, or takes up a feature there that nobody holds and that may be claimed (rule 10), or, with neither, stands holding nothing. Its square never crosses a city wall, on either tile, except where a road meets the wall at a gate (rule 68): so a city no road runs into cannot be walked out of. It costs no follower from your supply.',
    from: T(D28, MOVE, 'Onto an Abbazia, asked: no, only blown or flown. Walls: "' + GATED + '" (a wall did not stop a move earlier the same day). Claude\'s calls, named to Timothy when it shipped: the road is one on the tile it stands on, crossed over gaps (rule 15); and where it stops it keeps what it held, takes up a feature or stands holding nothing, as a blown follower does (rule 39).'),
    added: D28 },

  // --- Your zephyr. ------------------------------------------------------------
  { n: 70, id: 'stick-push', group: 'stick',
    text: 'Every turn, after your follower step, you blow with your own zephyr, unless you set the Calcolo down instead (rule 86): put it in open sky against any tile, on any side, never between two tiles, and that tile and every tile touching in front of it, up to the first gap, go one square, round the seam of the map too (rule 67), if there are no more of them than your push power (rule 72). Everything behind it stays where it is, and an anchor in front holds part of the lane still (rule 75).',
    from: T(D28, NO_CUT, 'It was a stick from 2026-10-26 ("' + STICK + '"), then his zephyr every turn ("' + EVERY_TURN + '").'),
    added: D26, changed: D28,
    was: 'Every turn, after your follower step, you blow with your own zephyr: put it against any tile, on any side, and that tile and every tile touching in front of it, up to the first gap, go one square, round the seam of the map too (rule 67), if there are no more of them than your push power (rule 72). Everything behind it stays where it is.' },
  { n: 86, id: 'stick-calcolo', group: 'stick',
    text: 'The Calcolo is one square stone for the whole table, off the board until it is first set down. Instead of your blow you may set it down on any empty square of sky (not the big tower\'s kept 2x2), from wherever it was. It stays there until somebody moves it again.',
    from: T(D28, CALCOLO, 'Asked: one for the table, anywhere.'),
    added: D28 },
  { n: 72, id: 'blow-power', group: 'stick',
    text: 'Your push power is 1, and 1 more for every Abbazia on the board. It is the same for every player.',
    from: T(D27, POWER, 'And "' + ONE + '". Read as every Abbazia on the board, whoever laid it, since nobody claims one.'),
    added: D27 },
  { n: 73, id: 'blow-chain', group: 'stick',
    text: 'A zephyr tile your blow pushes then blows too, once it has moved, the way it points: the tile in front of it and every tile touching in front of that, up to the first gap, go one square, if there are no more of them than its own push (rule 29) plus your push power. What that pushes chains on the same way.',
    from: T(D27, CHAIN),
    added: D27 },
  { n: 74, id: 'blow-heavy', group: 'stick',
    text: 'A push with more tiles to move than its power, or the big tower\'s kept 2x2 or the Calcolo where the front one would go (rules 81 and 87), moves no tile. Instead every follower on the tiles it would move, as many as its power, is blown one square downwind (rule 35).',
    from: T(D27, AREA, 'Which followers ("an area") is Claude\'s reading: those on the tiles the push would move, as many as its power. An anchor no longer makes a push too heavy (2026-10-28, rule 75).'),
    added: D27, changed: D28,
    was: 'A push with more tiles in front of it than its power, a quarter of the big tower among them (rule 75), or the big tower\'s kept 2x2 where the front tile would go (rule 81), moves no tile. Instead every follower on the tiles it reaches, as many as its power, is blown one square downwind (rule 35).' },
  { n: 75, id: 'blow-towers', group: 'stick',
    text: 'An anchor is a quarter of a big tower, or a half of a tower that has closed. No push moves one, and it holds still everything in its lane from the zephyr up to it; the tiles past it are pushed, counted against the push\'s power. An open tower half is pushed like any other tile, so a push can close a tower (rule 44).',
    from: T(D28, NO_CUT, 'Which tiles anchor: "' + ANCHORS + '". Before, an anchor made the whole push too heavy, and from 2026-10-27 ("' + HALVES + '") only the big tower\'s quarters held.'),
    added: D27, changed: D28,
    was: 'A quarter of the big tower is never moved by a push. A tower half is pushed like any other tile, so a push can close a tower (rule 44).' },

  // --- The wind. -------------------------------------------------------------
  { n: 17, id: 'wind-blows', group: 'wind',
    text: 'A zephyr tile does nothing when it is laid: it pushes only when a blow has pushed it (rule 73). Your own zephyr is the only wind there is.',
    from: T(D27, CHAIN, 'Asked whether a laid zephyr still blows by itself, he chose that it pushes only in your chain.'),
    changed: D27,
    was: 'A zephyr blows the moment its tile is laid, down its lane: every square from it the way it points, to the edge of the map. What it pushes over the edge comes on at the other side (rule 67), but the wind takes hold of nothing past the edge.' },
  { n: 20, id: 'wind-own-tile', group: 'wind',
    text: 'A zephyr\'s own tile never moves with its own push: it pushes what is in front of it.',
    from: H('thirteenth', 'For a few passes a zephyr went one square with its own wind; that was taken back.'),
    changed: D27,
    was: 'A zephyr\'s own tile never moves with its own wind.' },
  { n: 22, id: 'wind-walls', group: 'wind',
    text: 'A city wall holds nothing in the wind: a tile with walls on it is pushed like any other, and a follower is blown over a wall into or out of a city, or onto or off an Abbazia, like anywhere else.',
    from: T(D28, OVER_WALLS, 'Until then a wall held followers ("' + PROTECT + '", 2026-10-27).'),
    changed: D28,
    was: 'A city wall does not hold its tile: a tile with walls on it is pushed like any other. It holds followers: no follower is ever blown across a wall, whether the wall is on the edge of its own tile or of the tile it would come down on.' },
  { n: 87, id: 'wind-calcolo', group: 'wind',
    text: 'Nothing is laid on the Calcolo\'s square, no tile is pushed or moves on into it, no zephyr blows from it, and the wind never moves it. So a push whose front tile would go into its square is too heavy (rule 74), and blows the followers on its tiles instead.',
    from: T(D28, CALCOLO),
    added: D28 },
  { n: 23, id: 'wind-vane', group: 'wind',
    text: 'A windvane a push reaches turns so the road running through it lies along the push.',
    from: H('first', 'It is the only tile the weather turns; straight roads swung too for a while.'),
    changed: D27,
    was: 'A windvane the wind reaches turns so the road running through it lies along the wind.' },
  { n: 24, id: 'wind-turbine', group: 'wind',
    text: 'Every push that reaches a windmill, moving it or not, pays 3 to whoever holds the feature it stands in once the push has passed (a holder it blew off the mill is not paid).',
    from: T(D28, MILLS3, 'It was 2.'),
    changed: D28,
    was: 'Every push that reaches a windmill, moving it or not, pays 2 to whoever holds the feature it stands in once the push has passed (a holder it blew off the mill is not paid).' },

  // --- Zephyrs in a chain. ---------------------------------------------------
  { n: 27, id: 'storm-once', group: 'storm',
    text: 'In one blow each zephyr pushes each of its ways at most once.',
    from: H('sixteenth', 'This is what keeps a chain of zephyrs finite.'),
    changed: D27,
    was: 'In one storm each zephyr blows each of its ways at most once.' },
  { n: 28, id: 'storm-multi', group: 'storm',
    text: 'A zephyr that points two, three or four ways pushes down every one of those lanes. (The crosswind, split wind, trident and compass rose: all extras since 2026-10-28, when the zephyrs moved onto roads.)',
    from: H('fourth'),
    changed: D28,
    was: 'A zephyr that points two, three or four ways pushes down every one of those lanes.' },
  { n: 29, id: 'storm-double', group: 'storm',
    text: 'A zephyr\'s own push is 1, and a double zephyr\'s 2.',
    from: T(D27, CHAIN, '"A zephyr on a tile has one push power". The double zephyr has opened at two since the tenth pass.'),
    changed: D27,
    was: 'A double zephyr opens at power two.' },

  // --- Out of the sky. -------------------------------------------------------
  { n: 31, id: 'fall-mismatch', group: 'fall',
    text: 'A tile a push has moved that now meets a neighbour it does not match moves on, before anything else happens: the player whose turn it is picks a way, and it slides that way, square by square, to the first empty square where every edge meets what is beside it, or where nothing is. It cannot pass through a tile, or into the big tower\'s kept 2x2 (rule 81), so a way blocked before it fits is no way; with only one way it just goes. Only a tile with every way blocked falls, back on top of the deck. A follower on it rides it.',
    from: T(D26, MOVE_ON, 'Asked, he chose that it must move when it can, and that one with room but no square beside it that fits "keeps going". From 2026-10-24 ("' + MISMATCH + '") such a tile fell.'),
    changed: D27,
    was: 'A tile a push has moved that now meets a neighbour it does not match moves on, before anything else happens: the player whose turn it is picks a way, and it slides that way, square by square, to the first empty square where every edge meets what is beside it, or where nothing is. It cannot pass through a tile, so a way blocked before it fits is no way; with only one way it just goes. Only a tile with every way blocked falls, back on top of the deck. A follower on it rides it.' },
  { n: 32, id: 'fall-alone', group: 'fall',
    text: 'A tile touching nothing does not fall: it hangs in the sky.',
    from: H('fourteenth', 'Fragments are where islands come from; dropping them had healed the board back into one mass every turn.') },
  { n: 69, id: 'fall-loose', group: 'fall',
    text: 'Until it moves on, a tile that does not fit is joined to nothing across the edge it does not meet: no road, city, field or country runs across that seam (so it is loose from that neighbour, and may be an island, rule 40).',
    from: T(D26, STICK, 'Claude offered cracks as one of three ways to keep islands forming when a stick can push whole lanes; he chose them ("yea i like one and two"), and then that a tile which does not fit moves on (rule 31), which leaves the crack only until it does.'),
    added: D26 },
  { n: 34, id: 'fall-followers', group: 'fall',
    text: 'A follower on a tile that falls goes home.',
    from: H('fourteenth'), changed: D25,
    was: 'A follower on a tile that falls, or goes over the edge, goes home.' },

  // --- Followers in the wind. ------------------------------------------------
  { n: 35, id: 'blown-lane', group: 'blown',
    text: 'Followers on tiles that move ride them. A follower blown (rule 74) goes one square downwind, onto the tile there.',
    from: T(D27, AREA),
    changed: D27,
    was: 'Followers on tiles that move ride them. Every other follower on a tile the gust reaches is picked up and put down downwind, as many squares as the wind\'s power there.' },
  { n: 37, id: 'blown-fly-on', group: 'blown',
    text: 'A follower blown off the end of the country keeps flying downwind until it lands on a tile, round the map if it has to (rule 67).',
    from: T(D24, LEDGE, '"Until they land on an island" read as the next tile of any kind in its lane, which is usually an island. Since the map wraps there is always one, so the wind never sends a flier home.'),
    changed: D25,
    was: 'A follower blown off the end of the country keeps flying downwind until it lands on a tile. Only one with no tile anywhere ahead goes home.' },
  { n: 38, id: 'blown-occupied', group: 'blown',
    text: 'A follower that would land on a tile with a figure on it stays where it was.',
    from: H(null),
    changed: D27,
    was: 'A follower that would land on a tile with a figure on it stays where it was; if that tile has gone too, it goes home.' },
  { n: 39, id: 'blown-feature', group: 'blown',
    text: 'Where it lands, it holds the same kind of feature if the tile has one, or else whatever it can, never a field (rule 10), and a city or road somebody else is in as readily as an empty one. Landing on an empty Abbazia, it holds the Abbazia (rule 48); on any other tile with nothing to hold, it stands holding nothing.',
    from: T(D28, ABB_CLAIM, 'Before, a follower on an Abbazia held nothing (the third pass). Never a field since farmers went ("' + NO_FARMERS + '"). Into a city others hold: "' + BLOWN_IN + '"'),
    changed: D28,
    was: 'Where it lands, it holds the same kind of feature if the tile has one, or else whatever it can; on a tile with nothing to hold, like an Abbazia, it stands holding nothing.' },

  // --- Mainland and islands. -------------------------------------------------
  { n: 40, id: 'land-mainland', group: 'land',
    text: 'The biggest piece of connected country is the mainland. Every other piece, down to a single tile, is an island.',
    from: H('eighth', 'The mainland was wherever the Palazzo stood until the sixteenth pass made it the biggest piece; every fragment has been an island since the fifteenth.') },
  { n: 41, id: 'land-double', group: 'land',
    text: 'Everything on an island pays double, except green\'s 5 for holding it (rule 47).',
    from: H('eighth', 'Half again as much at first; double now. Green\'s 5 is the same on an island as on the mainland since 2026-10-28 ("this means you can get 5 points from even a tiny island"): Claude\'s reading of "5 points", named to Timothy when it shipped.'),
    changed: D28,
    was: 'Everything on an island pays double.' },

  // --- Towers. ---------------------------------------------------------------
  { n: 43, id: 'sphere-halves', group: 'spheres',
    text: 'A tower half meets only another tower half of its own colour.',
    from: T(D27, MATCH, 'And "' + TOWERS + '".'),
    changed: D27,
    was: 'A sfera half meets only another sfera half, of any colour.' },
  { n: 44, id: 'sphere-close', group: 'spheres',
    text: 'Two halves meeting close a tower, whether a tile was laid or a push brought them together, and it fires its colour once over the whole board (rules 47 to 49, and 51). A tower closes once.',
    from: T(D27, MATCH, 'Once, not once a half: two halves of one colour would only pay the same thing twice over. Claude\'s call, named to Timothy when it shipped. Closed by a push too since "' + HALVES + '". It paid "whoever holds each feature of that kind" until green paid the land (2026-10-28).'),
    changed: D28,
    was: 'Two halves meeting close a tower, whether a tile was laid or a push brought them together, and it fires its colour once over the whole board, paying whoever holds each feature of that kind (rules 47 to 49, and 51). A tower closes once.' },
  { n: 76, id: 'tower-big', group: 'spheres',
    text: 'The big towers are the sun and the black hole, made of eight tiles that carry a quarter of the sun on one face and a quarter of the black hole on the other. Each quarter sits in one corner of its tile, and four of one come together as a 2x2. A quarter\'s edge meets only the edge of a quarter of the same big tower that carries its circle on; its other two edges are walled, and like an Abbazia\'s take anything and cap what they meet.',
    from: T(D27, EIGHT, 'And "' + WALLED + '", read as the Abbazia\'s walls, which take anything, an open city too: a plain wall would not. And "' + BIG + '".'),
    added: D27, changed: D27,
    was: 'The sun and the black hole are big towers: each of their quarters sits in one corner of its tile, and four come together as a 2x2. A quarter\'s edge meets only the edge of a quarter of the same big tower that carries its circle on.' },
  { n: 81, id: 'tower-kept', group: 'spheres',
    text: 'A game makes both big towers, one at a time. The first quarter laid decides which comes first, and where: it goes anywhere a tile may go with the rest of its 2x2 open sky, and the rest is kept for the other three. Nothing else may be laid there, and no push or move-on goes into it. Each of the other three must be laid into the 2x2, turned to face in and touching a quarter already there, wherever that is, off the mainland too. So once begun, a big tower always closes. Then the next quarter begins the other one: once the sun is made it must be the black hole, and once the black hole is made the sun.',
    from: T(D27, EIGHT, 'And "' + INEVITABLE + '" The 2x2 kept from the wind, and the quarters ignoring rule 7, are Claude\'s reading of "inevitable", named to Timothy when it shipped.'),
    added: D27 },
  { n: 77, id: 'tower-sun', group: 'spheres',
    text: 'When the sun closes, every colour fires at once.',
    from: T(D27, BIG, 'Asked what they do, he chose that the sun scores everything and the black hole swallows the ring round it.'),
    added: D27 },
  { n: 78, id: 'tower-hole', group: 'spheres',
    text: 'When the black hole closes, every tile in the twelve squares round it, except a quarter of the sun, is swallowed: shuffled back into the deck, and every follower on them home.',
    from: T(D27, BIG, 'Asked what they do, he chose that the sun scores everything and the black hole swallows the ring round it. Sparing the sun is Claude\'s call, so both are on the board at the end ("' + EIGHT + '").'),
    added: D27, changed: D27,
    was: 'When the black hole closes, every tile in the twelve squares round it is swallowed: shuffled back into the deck, and every follower on them home.' },
  { n: 45, id: 'sphere-majority', group: 'spheres',
    text: 'A feature pays whoever has the most followers in it; tied, each of them is paid in full.',
    from: CARC() },
  { n: 46, id: 'sphere-only', group: 'spheres',
    text: 'Nothing pays for being finished, or for closing what nobody holds, except windmills (rule 59).',
    from: T(D28, ROADS_TOO, 'A road or city closed with nobody in it paid whoever closed it from 2026-10-27 ("' + UNCLAIMED + '"); cities stopped earlier on 2026-10-28 ("' + CITIES_HELD + '"), and roads with this. The rest is from the tenth pass.'),
    changed: D28,
    was: 'Nothing pays for being finished, except windmills (rule 59) and a road or city closed with nobody in it (rule 79).' },

  // --- Green, red and yellow. ------------------------------------------------
  { n: 47, id: 'colour-green', group: 'colours',
    text: 'Green pays every piece of country, the mainland and each island however small, 5 points to whoever has the most followers standing on it, holding anything or nothing; tied, each of them in full. Nobody comes home for it.',
    from: T(D28, NO_FARMERS, 'Ties paid in full as every majority is (rule 45): Claude\'s call, named to Timothy when it shipped.'),
    changed: D28,
    was: 'Green pays each farm a point for every two tiles of field, rounded down.' },
  { n: 48, id: 'colour-red', group: 'colours',
    text: 'Red pays each Abbazia a follower holds (rules 39 and 61), as a cloister pays its monk: that follower\'s player gets a point for every tile in the eight squares round it. One nobody holds pays nobody. Nobody comes home for it.',
    from: T(D28, CLOISTER, 'Read as the eight squares round it, not counting itself. Earlier the same day a held one paid a point more for every follower round it ("' + ABB_SCORE + '"), and one nobody held paid whoever had most followers round it, which became 57% of every point scored once followers stayed on the board and could walk.'),
    changed: D28,
    was: 'Red pays each Abbazia a point for every tile in the eight squares round it, to whoever has the most followers on those eight and on the Abbazia; tied, each in full. Nobody comes home for it.' },
  { n: 49, id: 'colour-yellow', group: 'colours',
    text: 'Yellow pays each road a point a tile, plus 1 for each city it runs into that is still open and 2 for each that is closed. A road runs into a city on a tile that carries both, or through a gate in its wall (rule 68).',
    from: T(D25, GATES, 'A road "running straight from the middle of the castle wall" read as one that arrives at the city behind the wall, so yellow pays for that city. The rest is from the twelfth pass.'),
    changed: D25,
    was: 'Yellow pays each road a point a tile, plus 1 for each city it runs into that is still open and 2 for each that is closed. A road runs into a city on a tile that carries both.' },

  // --- Cities. ---------------------------------------------------------------
  { n: 50, id: 'city-districts', group: 'cities',
    text: 'A city is made of districts: whole squares of garden, residential, keep or trade. A district opens onto the sides its city runs on through and is walled on the rest.',
    from: T(D28, KEEP, 'The kinds came on 2026-10-24 ("' + DISTRICTS + '"); the temple went on 2026-10-27 ("' + NO_TEMPLE + '").'),
    changed: D28,
    was: 'A city is made of districts: whole squares of garden, residential, industrial or trade. A district opens onto the sides its city runs on through and is walled on the rest.' },
  { n: 51, id: 'city-blue', group: 'cities',
    text: 'Blue pays each city a point a district while it is open and 2 a district once it is closed; a garden district a point more, open or closed; and a keep its district\'s points doubled for every piece on it (rule 83). A closed city is paid its bonuses on top: 5 if it has at least one district of every kind, and 2 for every road that meets it at a gate (rule 68) for every trade district in it. In the last scoring (rule 65) every city is paid its bonuses, closed or not.',
    from: T(D28, EVERY, 'With "' + GARDEN_3 + '", "' + TRADE + '" and the keep\'s "1 for open, 2 for closed" ("' + KEEP + '"). Asked, he chose 1 open and 2 closed for every district, over "' + PER_TILE + '" earlier the same day. The 5 for every kind taking the place of the 1, 3 or 6 for kinds, a road "attached" read as one meeting the city at a gate, and the last scoring still paying every city its bonuses ("' + BONUSES + '"), are Claude\'s readings, named to Timothy when they shipped.'),
    changed: D28,
    was: 'Blue pays each city a point a district, plus 1, 3 or 6 when its districts are of two, three or four different kinds, and 2 for every garden district in it, open or closed. A city closed all round by walls pays double for its districts and their kinds, not for its gardens (rule 52).' },
  { n: 68, id: 'city-gate', group: 'cities',
    text: 'A district\'s walls stand on the edge of its tile, and like an Abbazia\'s edges they take anything: farmland stops against a wall; a road runs into one and ends there, at a gate in its middle; a city runs into one and is closed on that side; and two walls may stand back to back.',
    from: T(D28, WALLS_ANY, 'Before, a wall took a field, a road or another wall (2026-10-26, "' + GATES + '").'),
    added: D25, changed: D28,
    was: 'A district\'s walls stand on the edge of its tile. Farmland may lie against a wall, and stops there; a road may run into one, and ends there, at a gate in the middle of the wall; and two walls may stand back to back.' },
  { n: 83, id: 'city-keep', group: 'cities',
    text: 'A keep district is a tower that grows upwards. Each player has four keep pieces. Instead of claiming or moving a follower, you may put one of yours on any keep on the board with fewer than four on it: each piece doubles what that district pays (rule 51), 1, 2, 4, 8 and 16 while its city is open, 2 to 32 once it is closed.',
    from: T(D28, KEEP, 'Asked, four pieces each, on any keep. Pieces belong to whoever put them there and are paid to the city\'s holders, like the district.'),
    added: D28 },
  { n: 84, id: 'city-keep-falls', group: 'cities',
    text: 'When the wind moves a keep\'s tile, by a push or by moving on (rule 31), the keep comes down: every piece on it is lost, and it pays as an ordinary district again.',
    from: T(D28, KEEP, '"If blown" read as its tile moved by the wind, and the pieces lost rather than given back: Claude\'s calls, named to Timothy when it shipped.'),
    added: D28 },
  { n: 85, id: 'city-residential', group: 'cities',
    text: 'On your follower step you may put a follower on a residential district of a city you hold (you have the most followers in it, tied or not), wherever it is on the board and closed or not, if the tile has no figure on it, even though your followers are in that city already.',
    from: T(D28, RESIDENTIAL, '"Own" read as holding the most followers in it, ties included; anywhere on the board, open or closed: Claude\'s calls, named to Timothy when it shipped.'),
    added: D28 },
  { n: 53, id: 'city-reopen', group: 'cities',
    text: 'If the wind opens a city that was closed, whoever holds it loses a point a district.',
    from: H('twelfth', 'A point a tile until districts, 2026-10-24.') },
  { n: 54, id: 'city-abbazia', group: 'cities',
    text: 'An Abbazia closes any road or city side it touches. If the wind takes it away, that side is open again.',
    from: H('second') },

  // --- Windmills and flying machines. -----------------------------------------
  { n: 59, id: 'windmill-finish', group: 'tiles',
    text: 'When a road or city with windmills in it closes, each windmill pays 3 to whoever holds it.',
    from: T(D28, MILLS3, 'It was 2.'),
    changed: D28,
    was: 'When a road or city with windmills in it closes, each windmill pays 2 to whoever holds it.' },
  { n: 60, id: 'flight-path', group: 'tiles',
    text: 'A flying machine, on the turn it is laid, flies its way across the board, over open sky too, and turns with any zephyr it crosses; one pointing back at it ends the flight.',
    from: H('second', 'Across open sky since the seventh pass.') },
  { n: 61, id: 'flight-claim', group: 'tiles',
    text: 'On that follower step you may put a follower on any feature of any tile along the flight that nobody has a follower in, on an island or not, if the tile has no figure on it; or on an empty Abbazia along it, which it then holds (rule 48). Never in a field, on a road or city that is closed, or on a wall.',
    from: T(D28, NO_JOIN, 'Until then it could go onto a feature somebody held. The Abbazia is from earlier the same day ("' + ABB_CLAIM + '").'),
    changed: D28,
    was: 'On that follower step you may put a follower on any feature of any tile along the flight, held or not and on an island or not, if the tile has no figure on it. Never on a wall.' },
  { n: 62, id: 'flight-lift', group: 'tiles',
    text: 'Or you may lift one of yours off a tile along the flight (it goes home), and then put one down further along, or not.',
    from: H('tenth') },

  // --- The end of the season. ------------------------------------------------
  { n: 63, id: 'end-when', group: 'end',
    text: 'The season ends when the deck runs out, when 96 tiles have been laid, or if the sky is ever empty. But not before both big towers are made: once 96 are laid, the quarters still in the deck come up next, and the season ends when they have been laid.',
    from: H('second', 'Counted in tiles laid, not rounds, because blown tiles come back. Waiting for the big towers is Claude\'s call of 2026-10-28, named to Timothy when it shipped: the backstop ended one game in twelve with a big tower still to make, and "both need to be present by the end of the game".'),
    changed: D28,
    was: 'The season ends when the deck runs out, when 96 tiles have been laid, or if the sky is ever empty.' },
  { n: 64, id: 'end-archipelago', group: 'end',
    text: 'At the end, 10 points go to whoever has followers on the most separate islands; tied, to each of them.',
    from: H('eighth', 'Counted before the last scoring since the ninth pass.') },
  { n: 65, id: 'end-last', group: 'end',
    text: 'Then every colour fires once more, and blue pays every city its bonuses, closed or not (rule 51).',
    from: T(D28, BONUSES, 'The last firing is from the ninth pass.'),
    changed: D28,
    was: 'Then every colour fires once more.' },

  // --- Options. --------------------------------------------------------------
  { n: 66, id: 'option-balena', group: 'options',
    text: 'With the Balena (off unless a game turns it on), a sky whale lies on one tile, which no push moves; instead of claiming you may send it to any tile.',
    from: T(D24, BALENA), settings: ['balena'], changed: D27,
    was: 'With the Balena (off unless a game turns it on), a sky whale lies on one tile, which no wind moves and no gust passes; instead of claiming you may send it to any tile.' },
];

/** Rule numbers taken out, never used again. */
export const RETIRED = [
  14,   // followers-walk, 2026-10-28: "One of yours that a tower sends home during your turn may walk instead: along a road on the tile it stood on, and any road that one hops to (rule 15), into a district or temple nobody holds on a tile along the way, but not back into what it just left. With nowhere to go it may stand on the road itself, if nobody is on it. It may not walk a road someone else has a follower on." No tower sends anyone home now (rule 13): "followers no longer come back in general, even from roads".
  16,   // followers-flat, 2026-10-28: "Once a turn you may lay one of your followers standing in a city flat. It never comes home again, even when the city is paid, and a city held only by followers lying flat never pays the walled double (rule 52)." Timothy: "remove laying meeple flat".
  18,   // wind-loose-end, 2026-10-27: "It does nothing to the country it passes through. It moves the loose end: where the line of tiles in its lane stops, the last tiles before the gap come away, as many as the wind's power, and each goes that many squares on." The blow pushes what is in front of it (rule 70).
  19,   // wind-every-run, 2026-10-27: the wind took the loose end of every run down its lane, across the gaps. A push stops at the first gap.
  21,   // wind-whole-island, 2026-10-27: an island the wind reached moved whole. Timothy: "the rule about island being moved all as one piece is no longer a thing".
  25,   // storm-absorb, 2026-10-27: a gust crossing a zephyr pointing its way absorbed it and blew one power harder. The chain (rule 73) took its place.
  26,   // storm-wake, 2026-10-27: a gust reaching a zephyr pointing another way woke it, one power harder. The chain (rule 73) took its place.
  30,   // storm-cannon, 2026-10-28: "A gust cannon your blow pushes fires instead of pushing: each tile in front of it flies until the square in front of it is taken, however far, round the map if it has to (rule 67). It fires no more tiles than its push plus yours." Timothy: "totally forget what the cannon does but it may be usless now that we have the new zephyrs"; asked, remove it.
  33,   // fall-edge, 2026-10-25: "A tile the wind carries over the edge of the map is gone for good." The map wraps now (rule 67).
  36,   // blown-ride, 2026-10-27: a follower put down on a zephyr went on down its lane. A blown follower goes one square (rule 35).
  42,   // land-tow, 2026-10-27: when the wind moved the Palazzo, every island slid one square with it. Timothy: "i don't want the pallazzo to really do anything anymore".
  52,   // city-walled, 2026-10-28: "A city closed all round by walls pays double for its districts and their kinds, not for its gardens." Timothy: "towers score cities 1 point per tile, whether it's closed or open".
  55,   // cloud-start, 2026-10-26: "Every player has a cloud of their own, a whole tile of cloud that blows one way. It starts in hand." The stick took its place (rule 70).
  56,   // cloud-set, 2026-10-26: setting the cloud down instead of claiming, beside the country, facing any way; it blew as it landed.
  57,   // cloud-zephyr, 2026-10-26: where it stood, a cloud was a zephyr to every storm, its own gust hardened by the zephyrs it crossed.
  58,   // cloud-fixed, 2026-10-26: the wind never moved a cloud.
  71,   // stick-not-wind, 2026-10-27: "A push is not wind: it wakes no zephyr, pays no windmill, moves no follower but those on the tiles it pushes, and tows no islands." The blow is the wind now (rule 70).
  79,   // close-unclaimed, 2026-10-28: "A road that closes with nobody in it pays whoever's turn it is, at once, what yellow would pay for it. It is closed by the tile they laid or by their blow. A city that closes pays nobody for closing: like any feature, it pays its holders when its tower fires (blue, or the sun)." Timothy: "the closing rule also applies to roads as well".
];

export const RULEBOOK = {
  soffiando: { name: 'Soffiando', groups: GROUPS, rules: RULES, retired: RETIRED },
};
