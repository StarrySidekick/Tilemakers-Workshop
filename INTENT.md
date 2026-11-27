# Intent

What this is for, and what to build next. Recorded **2026-09-06** from Timothy's
own answers to a direct set of questions, so this is *stated* intent rather than
intent inferred from the code.

**Read this before choosing what to build.** Where it disagrees with the rest of
the docs about **direction**, this file is newer and wins. Where it disagrees
about **mechanics** — how the code works, what was decided deliberately, the
invariants — the other docs win, always.

When something here is done, or turns out to be wrong, **edit it**. A stale
intent file is worse than no intent file.

## What it is for

**The workshop, not the product.** It exists so Timothy can find out which tile
mechanic is worth building a real game around. If a mode proves itself it may
move to its own repo. That has not happened yet, and it is the only reason any
of this is here.

But: he does want **the workshop itself to look and feel good**, and to be
presentable enough that someone interested could be shown it. Polish on the
workshop is legitimate work, unlike depth on any one mode.

## What is next

**Soffiando is the primary game: stated 2026-10-22.** Timothy thinks it is the
strongest thing in the workshop, wants it codified, fair, balanced and
intuitive, and expects to make it a **physical** game eventually. What he named
as the fun: making islands by blowing the board apart, getting followers out
to those islands by a variety of routes, and scoring on the islands. He likes
that you may not put a follower on an island unless you already have one
there, so that reaching one is a puzzle, and floated letting anyone lay TILES
on an island. **[`docs/SOFFIANDO-ISLANDS.md`](docs/SOFFIANDO-ISLANDS.md)** is
the measured analysis and the proposals; read it before changing the mode.

This overrides "depth on any single mode" below, for Soffiando only.

**Soffiando's rules, 2026-10-24, in his words.** "For now, remove the balena
in the default rules." Cities are made of districts (garden, temple,
residential, industrial, trade), "each a different color and texture", and
"get compounding levels of points depending on how many different districts
they have". City caps stay as flat city walls; "a city that isn't surrounded
by walls can be pushed and gets more points if fully surrounded", and "wind
cannot push tiles with city walls, if the wind is perpendicular to the wall,
it still can if it's parallel". "Roads can no longer mismatch in any way and
still stay together": a blown piece that mismatches falls. Followers "blown
off a ledge keep flying until they land on an island". "Road intersections
have cute little towns that have different little visual features." What was
built, and how the scoring was tuned, is the twenty-third pass in `MODES.md`.
Later the same day: the Abbazia gets "the four castle walls on its edges to
mirror the look of the city tiles"; "every player start with a person zephyr
that is an entire cloud as a tile, that blows in one direction. it can be
moved every turn instead of placing a meeple. it activates when moved. it's
interacts with zephyrs on tiles the same in that its gust can be amplified by
them and vice versa"; "for now remove single castle wall tiles from the tile
pool, just want to see what it looks like"; and "the map has a border, and if
island tiles are blown off it, they fly off into the aether and are gone.
let's say it's a 16x16 border." That is the twenty-fourth pass.
On 2026-10-25: "make sure we stick to 72 tiles", "map needs to be 17x17 in
order to allow the palazzo to be perfectly in the middle", "instead of flying
off the side of the world, tiles that are pushed off the map appear on the
other side pac-man style, still connected", and farmland and roads may meet a
city wall, "as if the road is running straight from the middle of the castle
wall". He wants to comment on rules and toggle tiles in the rulebook page and
have Claude save the changes. That is the twenty-sixth pass.
On 2026-10-26, thinking of the physical game: "an actual little like stick
that you use to push tiles ... you're going to be able to push like entire
lanes of tiles ... But I also want to still somehow make it so that it's
possible for islands to form really often." He chose a stick that cuts the
lane where it goes in, and cracks instead of falls ("yea i like one and
two"), then "weave these rules into the actual game, not as toggles", and
that a tile which no longer fits moves on, the way its player picks, to
where it fits, falling only when "completely surrounded". The stick has
taken the cloud's place. That is the twenty-seventh pass, merged on his
word.

On 2026-10-27, "crazy changes, but i want to try them": every turn ends with
a blow of your own zephyr, its push power 1 and 1 an Abbazia on the board,
zephyr tiles chaining from it; sferas become towers that meet only their own
colour and are never pushed; walls hold followers, not tiles; a sun and a
black hole as 2x2 towers; a road or city nobody holds pays whoever closes
it; five followers, open roads and cities shared; the Palazzo a Plaza that
does nothing; temples and temple districts Abbazias, which red now pays;
gardens 2 more; the panel folded away with a tile list. And "gather insights
on scoring after all this": towers hardly close under these rules, so
followers rarely come home and half the points are for closing what nobody
holds (MODES.md, twenty-eighth pass). Merged on his word ("merge").

Later the same day: "let a blow move tower halves. also make it so you must
place a sun or black hole attached correctly to another, so there
completion is inevitable. - also, much larger change make tiles double
sided, and you choose what side to play when you place them. the sun and
void tiles are actually the same four tiles just with the sun quarter one
side and the black hole on the other. this also basically means that there
are 72 tiles in the game but 72x2 of tiles faces to play." Asked, he chose
opposites for the backs (a road onto a district of its shape, a zephyr onto
a tower half, a windmill or flying machine onto an Abbazia), the four places
the big tower gave back as four more tower halves, and quarters whose outer
edges take anything so one always fits its 2x2. Then: "there has to be
eight tiles becuase there needs to be the choice of what to build and both
need to be present by the end of the game ... if a sun is already made then
you have to make a black hole, and vice versa", and walls on the quarters'
field sides "so they can be placed sort of no matter what". That is the
twenty-ninth pass, merged on his word ("merge").

On 2026-10-28: "tiles that have towers on them should have different
colored towers on the other side". Asked where the zephyrs on their backs go,
he chose that they ride on roads. He also asked for "any insights you have
one scoring an mechanics that may be falling by the wayside" and "a concise
synopsis of the rules for soffiando here so i can see if anything is off".
That is the thirtieth pass.

Later on 2026-10-28, a list: walls "should be able to take field, wall,
road, or city, basically like abbazias"; "remove laying meeple flat";
"abbazias can be claimed by flying machine or by just being blown into
them as long as they are empty", and you never claim the one you lay ("when
you do you hold it outright, and it scores 1 point for every tile
surrounding it, and and extra point for every meeple"); no cutting with the
zephyr, and "an anchor like a tower keep everything in your lane from
moving, but only up until the tower, stuff past it still moves" (anchors:
"complete towers, and big tower quarters"); windmills 3; eight followers
again; windmills, windvanes and flying machines on road and district faces
rather than the Abbazias' backs, which take "a smattering of features"; "lets
get the ai to learn how to play better"; and "data as to what percentage of
scored games goes to what kind of point". That is the thirty-first pass,
built on the thirtieth.

Then: "ok let's make cities not give points but closing, just like normal
claiming rules and from towers", and "flying machines shouldn't be competing
with district faces, they should be on all different kinds of tiles". That
is the thirty-second pass.

Then the idea behind cities: "when you stay in a city ... you're risking the
chance to score continuously from towers, but at risk of losing points
because you're still in the city and the city could get opened. So you're
kind of testing fate, because you could just leave the city if you wanted
to." And a new move: "instead of placing a meeple, you can move a meeple
instead ... they can move one space for their turn. And if they move using a
road, they can move all the way down the road." Also: no points for closing
a road you do not own; "towers score cities 1 point per tile, whether it's
closed or open"; and "we're revoking the rule that says that you can place
meeple even on things already claimed by enemy meeple". Asked, he said the
city bonuses "are only for completing the city and at the end when scored",
nobody's feature may be joined (yours included), and a move never goes onto
an Abbazia. That is the thirty-third pass.

Then: "make abbazzias only get points for adjacent squares like cloisters";
"make it so meeple can move past walls, that have to have a road meet the
wall to be able to move through them. this means cities with no roads
attached them cannot leave that city that way"; and he asked what farmers
score and "is there any incentive still to make islands? Because that's a
big part of this." Asked what he meant for farmers: "ok no more farmers
actually. the green scoring from towers simply measures who has control of
the landmass (who has the most meeple) a awards them with 5 points. this
means you can get 5 points from even a tiny island". That is the
thirty-fourth pass.

Then: "the abbazias tiles should have abbazias on both sides", and "The AI
seems to not be really choosing to play the city side of tiles. why? and
what could we do about that". That is the thirty-fifth pass.

Then a list: "followers no longer come back in general, even from roads";
"specials can be on city faces too"; "meeple can be blown over walls now",
and "Meeple that are blown into cities can enter them even if there are
enemy meeple there"; a new "wooden block call the Calcolo, its a square
stone that can be moved instead of blowing something that turn"; cities
earn "an extra 1 point per garden district open or closed", "a bonus 5p if
they have at least one of every district closed", trade districts "2p extra
for each road attached to the city, closed"; a new district, the keep,
replacing industrial ("a tower that grows upwards ... every stack of the
tower makes the keep worth double that (1, 2, 4, 8, 16). the towers can
collapse if blown"); the residential district "allows you to place meeple
there on your turn if you own that city, even if you already have meeple
there"; "Both sides of all the tiles should generally have like the same
type of structure, just with some options changed"; and the cannon "may be
usless now". Asked: districts pay 1 open and 2 closed; one Calcolo for the
table, anywhere; four keep pieces each, any keep; remove the cannon. That is
the thirty-sixth pass.

Then, of the Calcolo: "The idea with the stone is that you can use it to
move meeple on purpose, because it stops landmasses from moving, but not
meeple ... If we could potentially retrain the AI to know how to use it,
that'd be great. And then once we're done, please merge everything. I give
you permission." The bot aims the stone now (MODES.md, the end of the
thirty-sixth pass), and the thirtieth to thirty-sixth passes are merged on
his word.

**Starà, the daily square: asked for 2026-11-18.** "new mode, going to be
daily, and based around the idea of fitting tiles into the area of your phone
screen ... a square area of say 7x7 tiles ... regular carcassone rules but
there's this border", with a "very minimalist" placement interface of its own
and "real wood" behind it. Built as `stara`; what was decided and what it
measures is section 14 of `MODES.md`. The same day: the square edge to edge,
"top down castle walls" round it that "end features for the sake of scoring
and finishing", and everything "medival themes and cool" and hand-drawn. The
open question it raised: the square is almost never filled, and plain
Carcassonne pays nothing for filling it. Then the third pass: no followers
("it's a solitary game"), a 5x5 and a 7x7, a town gate in the middle of each
wall paying highways that reach them, the cities rethemed as quarters of one
walled town with a charter, abbeys that want quiet, and fields as gardens.
Asked, he took each recommendation. The fourth pass: a hand that grows by one
with every abbey laid, a keep that ends what it touches and counts as a gate,
the high street cutting the town into four quarters each with a trade for the
day (the tile cities are districts now), and the seal moved onto the board
beside the tile it lays. Again he took each recommendation.
On 2026-11-19 he asked for a design analysis of the square itself ("i'm not
convinced on what we have at the moment, besides the castle wall gates for
connecting roads, that's fun"). **[`docs/STARA-DESIGN.md`](docs/STARA-DESIGN.md)**
is that analysis and its proposals; read it before changing the mode.
On 2026-11-23 the fifth pass: "drop the quarters idea for now", and the
square is "the walls of an illustrious city-state ... like the city of
Lucca", to fill with "all of these different things" (cathedral, housing,
plazas, gardens, markets, barracks, keeps, wizard towers, aqueducts, farms,
roads), different each day, the goal to "make that city state thrive". Asked,
he chose one place per tile with streets on its edges, places paid by their
neighbours as they are laid, a cast of four places dealt per day, and an
aqueduct from an arch in the wall. Built, and measured with
`tools/stara-sim.mjs` (which now plays the city): the floor and the trivial
turns fell and the skill gap nearly doubled on both sizes. Section 14 of
`MODES.md` has the rules, the calls of Claude's (the city may be built from
its walls inward, the aqueduct stands on arches over the streets) and what is
open (more places, two gates a side).
On 2026-11-27 the sixth pass, a list: "tap a tile to rotate it, tap and hold
to seal the tile (place it) ... it sort of seals to the table like a wax
seal"; "tiles can be more than one tile big, sort of like tetris"; "you start
with the choice of three tiles"; "tiles can be picked up and placed again by
paying a point"; "5x5 levels should have 25 tiles, and it's about the order
you place them and where that the skill lies ... there is a layout ... that
is theoretically 'perfect' ... so the player has the correct set of tiles to
reach towards this perfection"; and "things that score points in different
way should be clearly color coded". Built: a day is a PLAN, a whole city the
level maker draws and improves by search, cut into pieces of one to four
squares that exactly fill the square; its worth is the day's target, and the
plan can be seen once the day is over. Held, a piece is sealed; held, a laid
one is lifted for a point. Six ways to be paid, each in a heraldic colour on
the card, the board and the charter. The plan is the best the search found,
not a proven best (a 5x5 deal has too many layouts to try on a phone).
Section 14 of `MODES.md`, the sixth pass, has the rules, the calls and the
measurements.
The same day, the seventh pass, a list: pieces dragged "really freeform",
"the rotate button" and "an additional rotate button somewhere on the
bottom"; aqueducts "a second layer above all the other stuff" that a road
can run under; a faster seal; the corner labels gone ("I thought we didn't
have quarters anymore"); simpler scoring with fewer places ("a cathedral, a
plaza, housing, aqueducts ... just to start because I'm trying to figure out
the actual mechanics"); and no border: "the bigger the castle walls get, the
less points you get", after the Solitaire mode of the old Carcassonne app.
Asked, he took each recommendation: the wall hugs the city and costs a point
a stretch; only houses score, for a plaza, water and the cathedral beside
them; streets meet and leave by gates, the best street out on two or more
sides a high road. Built: an open table, the plan still a square (the
cheapest wall), the aqueduct laid over anything from a spring outside, and a
gate costing a point more than wall (Claude's call: without it the high road
came free to everyone). Section 14, the seventh pass, has it all, and what is
open: the high road still comes to every player, and the app's growing
commissions are the other half of its Solitaire.
Later the same day, the eighth pass and a long form: "pseudo pixel 3D ...
like a Nintendo 64 ... an isometric view and a regular top-down view like we
have now", and "a long form version of this mode and a short form ...
related to each other, but also like not necessarily the same ... one is the
daily mode and one is a longer form mode that might become like an actual
video game." Built: the city as a low-poly model (`src/lowpoly.js`), Ink, Top
and Iso under the title, isometric by default, a house as tall as it is
worth; and **Contado**, the long form: one city on a land with levels, year
after year, the Signoria's commissions taking the place of the plan, kept in
the browser between visits. No rule of the daily changed.
**[`docs/STARA-FORMS.md`](docs/STARA-FORMS.md)** is the frame for the two
forms and what keeps them related; read it before changing either. MODES.md
has the eighth pass in section 14 and Contado in section 16, with what is
open (the name, whether one miss should end a run, places that come back
over the years).
The same evening: sliders to tilt and turn the Top and Iso views; then the
camera set free ("freely scroll around the board instead of being locked in
one place"), every square any of a piece's four turns could cover lit, and a
piece put down settling the way that scores best there ("automatically snaps
to whatever might work the best for it"). Section 14's eighth pass has both.

**Giardino, the daily walled garden: asked for 2026-11-22.** "based on
stara ... a little walled garden, and each tile is a plant, and the mechanics
are based off how plants actually need to be planted in a polyculture farm.
things like irrigations, some plants liking other plants, some not liking
others, and potentially something where every tile places progresses time,
so plants grow and change as we go." Built as `giardino` on Starà's screen:
rills from a central fountain, thirsty and dry plants, a week per tile,
friends and foes paid at picking, perennials, the frost. What was decided,
what it measures and what is open (sun and shade, succession, bees) is
section 15 of `MODES.md`.

**Fields: settled 2026-09-06, and Timothy was right.** They are fully built.
`src/tiles.js` cuts the perimeter into eight half-edges with `halfPartner` as the
joining rule; fields are ordinary components; `allFields`, `citiesFed` and
`farmPayouts` settle the farms at the end with majority, pigs and the 3-or-4
rate; the `fields` mechanic is `on` by default and marked `live`. `MODES.md` said
"not built" in two places and has been corrected. Nothing to implement here.

So the open question in this repo is the next one down, not this one.

**Workshop feel.** How it looks, how it reads, how quickly someone can
understand what they are looking at.

## Deliberately not next

- **Depth on any single mode, except Soffiando.** Modes are going to be cut and
  Timothy is unsure about a lot of them. Do not invest in the others.
- **Marches.** He has not touched that mode and does not want effort spent there.
- **Relief and the 3D tiles.** Experimental, and explicitly tabled for now.
  `docs/RELIEF.md` stays as the scoped spike it is. (Starà's low-poly model,
  asked for on 2026-11-27, is a different thing: a model built per place,
  not the tile art extruded.)

## A useful thing that is not code

Modes are going to be cut, and he does not yet know which.
**[`docs/MODE-REVIEW.md`](docs/MODE-REVIEW.md)**, written 2026-09-06, is the
assessment: what each mode cost, what question it was built to answer, whether
that question is settled, and which are still earning a row in the dropdown.
Offered as a proposal. Nothing was deleted.

Its two findings worth acting on regardless of any cut:

- **Soffiando is 40% of all mode code**, more than four times the next largest,
  which is the clearest signal in the repo about where the interest actually is.
- **Three shipped modes have no design section at all** — Classic, Expedition
  and Adventure, 780 lines between them. A mode whose purpose is unwritten
  cannot be fairly judged, so that gap wants closing *before* any cutting.

## Where it is going

Some modes eventually become **physical board games** and some become **digital
games**. There may one day be a per-mode distinction, so that a digital-only
mode can do things a physical one never could, and vice versa. Worth keeping in
mind when judging whether a mechanic is good. Not a thing to build yet.
