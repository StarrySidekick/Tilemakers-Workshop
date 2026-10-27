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
holds (MODES.md, twenty-eighth pass). Not merged until he says.

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
  `docs/RELIEF.md` stays as the scoped spike it is.

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
