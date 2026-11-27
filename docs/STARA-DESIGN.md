# Starà: what makes a small walled square fun

Written 2026-11-19, from Timothy's brief and about 4,800 simulated days.
Everything here is either a measurement or a proposal, and each says which it is.
No rule was changed.

> **Since then (2026-11-23):** the fifth pass made the square a walled
> city-state, one place to a tile, paid by its neighbours as it is laid, and
> dropped the quarters. It follows this document's principles 1, 2, 5, 6 and 7
> (arrangement, goals on the frame, escalation, points on the board, a preview
> through the wizard's tower) rather than its proposals one by one; the
> numbers are in `MODES.md` section 14. `tools/stara-sim.mjs` now plays the
> city; the simulator that made the tables below is at commit 286ab76.
>
> **And since (2026-11-27):** the sixth pass deals the day as pieces cut from
> a plan that exactly fills the square, with the plan's worth as the target.
> That is proposal 1's finite deal taken to its end (the square's worth and
> not one more, so every hole is points left on the table) and proposal 5's
> par for the day, made by a level maker rather than the bot.
>
> **And later the same day:** the seventh pass took the square away. Timothy:
> "having the border on the outside is kind of restricting ... the bigger the
> castle walls get, the less points you get". The wall now hugs whatever is
> built and costs a point a stretch, the way the old Carcassonne app's
> Solitaire charged for widening its field, and the plan is a square because a
> square is the cheapest wall. Much of this document is about filling a fixed
> square; read it as the history of that question. `MODES.md` section 14, the
> seventh pass, has the rules and the numbers.

## The brief

Timothy, 2026-11-19: *"run a design analysis as to way to make the idea of a
tile game confined to a 5x5/7x7 grid feel good and fun, building of the
foundation of carcassonne. i'm not convinced on what we have at the moment,
besides the castle wall gates for connecting roads, that's fun."*

So two questions: why do the gates work, and what would make the rest of the
square work the way they do.

## How it was measured

`tools/stara-sim.mjs` plays Starà straight on the board, so the rules can be
varied, with two players on the same 100 deals:

- **Random**: a random tile from the hand, laid at a random legal spot.
- **Greedy**: every tile in hand at every legal spot, keeping whichever leaves
  the highest score as if the day ended right there. It knows every Starà rule
  (unlike `src/ai.js`, which knows none of them), so it scores more than the
  bot numbers in `MODES.md`.

Three numbers come out of each run, and they are the ones this document uses:

- **The floor**: random's score as a share of greedy's. Points random play gets
  are points that arrive whatever you do. A high floor means your choices
  move little of the score.
- **The skill gap**: how far greedy beats random, measured in random's own
  spread (standard deviations). Around 1 means a good player is barely
  distinguishable from a coin; above 2 means play clearly shows.
- **Trivial turns**: the share of turns where the best spot is worth less than
  1 point more than the median spot. Those are turns where nothing is being
  decided.

**What greedy cannot tell you.** It does not plan. It never holds a square open
for a tile it hopes for, and it closes things the moment closing pays. Rules
that reward planning (growing something big, keeping a gap for later) look
worse to it than they are. Read its numbers as a floor on what skill can do,
and treat a rule it scores badly as untested rather than bad.

## What the square does to Carcassonne

### 1. The decisions Carcassonne had are gone

Carcassonne's interesting choices are mostly about followers: where to commit
one, whether to gamble it on a city that might never close, whom to fight.
Starà has no followers and no opponent. Placement is the only decision left,
so placement has to carry the whole game.

### 2. Most of the score is fixed when the tiles are dealt (measured, the main finding)

Carcassonne pays **per tile**: 2 a city tile, 1 a road tile. On an open table
that is fine, because a feature can fail to close and a follower is stuck in
it. On a walled square almost every tile gets laid, and the wall closes almost
everything that touches it. So the city and road points are nearly a
**conserved quantity**: they depend on what you drew, not on what you did.

| | closed-district points as a share of the most the drawn city tiles could pay | road points, same |
|---|---|---|
| 5×5 random | 91% | 94% |
| 5×5 greedy | 88% | 94% |
| 7×7 random | 75% | 82% |
| 7×7 greedy | 73% | 87% |

Random play closes as much city as careful play. By kind, on the 7×7 as shipped
(greedy / random):

| districts | roads | abbeys | highways | quarters | charter | unfinished |
|---|---|---|---|---|---|---|
| 55 / 57 | 35 / 33 | 27 / 14 | 31 / 17 | 26 / 11 | 31 / 20 | 16 / 16 |

The districts, roads and unfinished columns, about half of every score, show
no skill at all. Every column that does show skill (abbeys, highways, quarters,
charter) pays for **where things are relative to each other**, not for how
many there are.

The rule of thumb this gives, and the most useful sentence in this document:
**a point that grows in a straight line with tile count is a point you cannot
earn. Only points that depend on arrangement are decisions.**

### 3. The square never pushes back

The deck is 72 tiles for 24 or 48 free squares, and a tile that fits nowhere is
set aside for free. Measured: the 5×5 sets aside **48 of 72** tiles, the 7×7
**26**. The 7×7 leaves about 2.5 holes a day, and a hole costs nothing.

That throws away the best part of every fitting game: the squeeze at the end,
where the space left is awkward and every tile has to earn its square
(Patchwork, Tetris, Kingdomino all live there). In Starà the last turns are the
pile running down until something fits.

### 4. Leaving things open costs nothing

An unfinished road pays exactly what a finished one does, 1 a tile either way
(`Board.value`). An abbey pays its quiet finished or not. Only a district gains
from closing (2 a tile against 1). So Carcassonne's central gamble, "will this
close?", exists for one feature in three.

### 5. Seven ledgers, mostly paid at the end

Districts, roads, abbeys, highways, quarters, charter, unfinished. Four of them
pay only on the end card, including the two biggest skill-bearing ones
(highways and quarters). So the best moments of the day, the ones you planned,
land after the game instead of on the board during it.

### 6. The hand matters a lot (measured)

With a hand of 1 for the whole day, **48% of turns are trivial** on the 7×7
(54% on the 5×5). The abbey's growing hand brings that down to 23% (33%). A flat
hand of 2 does almost as well (27%, 29%). So the hand is one of the things
that works; whether abbeys should be what grows it is a separate question.

## Why the gates work

Five reasons, and each one is a principle that can be used elsewhere:

1. **They are on the board from turn one.** A fixed landmark is a goal you can
   plan towards before you have drawn anything.
2. **They are a long project.** A highway is built across many turns, so the
   day has a spine instead of 48 separate decisions.
3. **They escalate.** Tiles times gates is a product, so every extra gate
   multiplies what came before. The third gate is the moment you remember.
4. **They use the shape.** They exist because the square has an edge. They
   could not exist on an open table, which is what makes them Starà's own.
5. **They fight the other goals.** A highway across the square cuts districts
   apart and spoils abbeys' quiet. Choosing between them is the decision.

They are also the category with the most measured skill: on the 7×7, greedy
makes 31 points from highways to random's 17.

**Railroad Ink** (2018) is this one idea grown into a whole game: a 7×7 grid
with twelve exits round its edge, networks paid on an escalating table by how
many exits they join (2 exits 4 points, 3 exits 8, up to all 12 for 45), minus
1 for every route left dangling, and a point for each of the nine middle
squares used. It is the closest relative Starà has, and a good sign the gates
can carry more of the game than they do.

## What other confined games do

- **Carcassonne: The Castle** (Knizia, 2003) is Carcassonne inside a castle
  wall, the wall serving as the score track. Two things it does that Starà does
  not: features left unfinished pay **nothing**, and empty space is worth
  something (whoever holds the largest keep scores the largest block of empty
  squares). Knizia turned the gaps into a resource.
- **Kingdomino**: a 5×5 kingdom, scored as area times crowns, so arrangement is
  everything. +10 if your castle ends up in the middle, +5 if you placed every
  domino.
- **Patchwork**: a 9×9 quilt, −2 for every empty square at the end. Filling is
  the puzzle because holes cost.
- **Calico**: goal tiles sit in fixed squares of the board, each wanting a
  pattern among its neighbours. Goals placed in space, not counted.
- **Tetris**: the next-piece preview, the cheapest way known to turn luck into
  planning.

## Principles for a small square

1. **Score arrangement, not quantity.** Products, adjacency, connection,
   position. Per-tile points are conserved on a full square.
2. **Put the goals on the frame**, visible from turn one. Landmarks give a
   square day a plan.
3. **Make space cost something.** A finite deal, a price on holes. Scarcity is
   the one thing a confined board has that an open one does not; spend it.
4. **Open ends are debts.** Without followers, this is the only way left to
   bring back "will it close?".
5. **Escalate.** One big project that compounds beats many small ones that add.
6. **Few ledgers, paid where you can see them.** If a planned payoff lands only
   on the end card, the peak of the day happens after the day.
7. **Give information to plan with.** A preview converts luck into skill
   without changing a rule.
8. **End on a decision.** People remember an experience by its peak and its
   end. A day that ends because the pile ran out ends on nothing.

## The variants, measured

100 deals each, the same deals for every row. "3+ gates" is how many greedy
days had a highway through at least three gates (the keep counts as one).

**7×7**

| variant | greedy | random | floor | skill gap | highways g / r | 3+ gates | trivial turns | squares filled | set aside |
|---|---|---|---|---|---|---|---|---|---|
| as shipped | 220 | 168 | 77% | 2.40 | 31 / 17 | 10% | 23% | 46.7 | 26.3 |
| A: unfinished pays 0 | 193 | 152 | 79% | 1.47 | 24 / 17 | 3% | 23% | 46.8 | 26.2 |
| **B: finite deal (squares + 6), −2 a hole** | 200 | 144 | **72%** | **2.62** | 29 / 13 | 10% | 23% | 45.2 | 9.8 |
| C: roads leave only by a gate | 225 | 170 | 75% | 2.23 | 38 / 24 | 17% | 23% | 45.9 | 27.1 |
| D: no quarters, no charter | 164 | 137 | 83% | 1.54 | 31 / 17 | 4% | 29% | 46.8 | 26.2 |
| E: hand of 1, no abbey growth | 208 | 168 | 81% | 1.97 | 29 / 17 | 5% | 48% | 47.0 | 26.0 |
| F: hand of 2, no abbey growth | 211 | 172 | 81% | 1.83 | 30 / 20 | 8% | 27% | 46.8 | 26.2 |
| H: districts pay n(n+1)/2 closed, unfinished 0 | 188 | 160 | 85% | 0.78 | 24 / 17 | 2% | 23% | 46.8 | 26.2 |
| **I: two gates a side (eight)** | 229 | 175 | 76% | **2.50** | **43 / 24** | **34%** | 22% | 46.7 | 26.3 |
| J: I, and roads leave only by a gate | 233 | 181 | 78% | 1.83 | 48 / 32 | 35% | 22% | 45.7 | 27.3 |
| L: I, no quarters, no charter | 175 | 144 | 82% | 1.71 | 43 / 24 | 23% | 28% | 46.9 | 26.1 |
| M: L, unfinished 0, −2 a hole, finite deal | 129 | 97 | 76% | 1.20 | 33 / 19 | 18% | 27% | 45.2 | 9.8 |

**5×5**

| variant | greedy | random | floor | skill gap | highways g / r | 3+ gates | trivial turns | squares filled | set aside |
|---|---|---|---|---|---|---|---|---|---|
| as shipped | 120 | 99 | 82% | 1.44 | 20 / 14 | 14% | 33% | 24.5 | 48.5 |
| A: unfinished pays 0 | 112 | 96 | 86% | 0.94 | 16 / 14 | 6% | 30% | 24.5 | 48.5 |
| **B: finite deal (squares + 6), −2 a hole** | 106 | 80 | **75%** | **1.63** | 18 / 10 | 12% | 33% | 23.3 | 7.7 |
| C: roads leave only by a gate | 120 | 99 | 83% | 1.27 | 22 / 17 | 18% | 36% | 23.9 | 49.1 |
| D: no quarters, no charter | 88 | 80 | 90% | 0.67 | 20 / 14 | 13% | 41% | 24.5 | 48.5 |
| E: hand of 1, no abbey growth | 113 | 98 | 86% | 1.00 | 18 / 13 | 7% | 54% | 24.6 | 48.5 |
| F: hand of 2, no abbey growth | 117 | 96 | 82% | 1.48 | 20 / 13 | 20% | 29% | 24.4 | 48.6 |
| H: districts pay n(n+1)/2 closed, unfinished 0 | 106 | 98 | 92% | 0.43 | 16 / 14 | 6% | 31% | 24.5 | 48.5 |
| I: two gates a side (eight) | 127 | 106 | 84% | 1.15 | 27 / 21 | 35% | 33% | 24.6 | 48.4 |
| J: I, and roads leave only by a gate | 126 | 110 | 87% | 0.91 | 29 / 26 | 41% | 36% | 23.9 | 49.1 |
| L: I, no quarters, no charter | 96 | 87 | 91% | 0.56 | 28 / 21 | 39% | 40% | 24.4 | 48.6 |
| M: L, unfinished 0, −2 a hole, finite deal | 73 | 58 | 79% | 0.83 | 21 / 14 | 30% | 34% | 23.4 | 7.6 |

What the tables say:

- **Making space cost something (B) is the best single change on both sizes.**
  It lowers the floor (77% to 72%, 82% to 75%) and raises the skill gap, even
  for a player that cannot plan. Two thirds of the set-asides disappear, so
  each tile in the pile is one you will actually have to place.
- **More gates (I) is the best change on the 7×7, and not on the 5×5.** On the
  7×7 highways through three or more gates go from 10% of days to 34%, and the
  highways become the biggest skill-bearing column. On the 5×5, where 16 of
  the 25 squares touch the wall, roads hit gates by accident, so random gains
  nearly as much as greedy. Four gates is right for the 5×5.
- **The quarters and the charter are doing real work** (D). They are
  arrangement points, so they carry skill: taking them out drops the gap from
  2.40 to 1.54 on the 7×7, and from 1.44 to 0.67 on the 5×5. If they are cut
  because of how they feel, something else has to take over their decisions.
- **Roads leaving only by a gate (C, J) makes random play better too.** Fewer
  places a road may go means fewer ways to waste one. Not worth it.
- **Two rules the greedy player cannot judge.** Unfinished paying nothing (A)
  and districts paying more the bigger they are (H) both reward planning, so
  greedy does worse with them. H shows something real, though: under it random
  play makes *more* district points than greedy (65 to 53), because greedy
  banks small districts against the wall the moment it can, and random builds
  big ones by accident. That is the tension Carcassonne's cities have, "close
  it now or let it grow", coming back. It needs people, not this bot, to say
  whether it is fun or just swingy.

## Proposals

In order of confidence. Each says whether it is measured.

1. **Space costs: a finite deal and a price on holes.** *Measured, the
   strongest.* Deal the square's worth of tiles and a few spare (B used six),
   charge for every empty square at the end, and consider Kingdomino's reward
   for a full one. The day then ends on the squeeze, and the pile counter
   becomes a clock. The 7×7 at −2 a hole costs greedy about 8 points a day
   (4 holes); a wildcard tile or two (the keep already fits anything) is the
   natural tool to give a player for that squeeze.
2. **More gates on the 7×7, moved by the day.** *Measured (the count), not
   measured (the moving).* Two a side on the 7×7, four on the 5×5. And deal
   their positions from the day's seed: today a day differs only by the order
   of the pile and which trade sits where; moving the gates makes each day's
   square a different shape of problem, built on the rule Timothy likes most.
3. **Pay a highway on the board when it reaches a gate.** *Not measured, a
   feel change.* The scoring can stay the same; the points just arrive when the
   road touches the gate, and again when the highway grows or reaches another.
   The peak of the day then happens during the day.
4. **A preview of the next two tiles.** *Not measured (greedy cannot use it).*
   Everyone gets the same deal, and Play again already lets you learn it, so a
   preview only makes the first play as informed as the second. It turns
   "hope" into "plan" without a new rule.
5. **Par for the day.** *No rule change.* The bot can play each day's deal in
   advance; the end card says "par 205, you 221". A daily feels good when the
   score means something on its own, and today 180 means nothing until you
   have played a week.
6. **Open ends are debts.** *Not measurable by this player.* Unfinished roads
   and districts pay nothing (Knizia's rule in The Castle) or cost 1 for each
   open end (Railroad Ink's). It brings back "will it close?" for roads, which
   today pay the same either way. Worth a human test together with 1, since
   both make the end of the day tighter.
7. **The quarters: keep them, or replace them with something better, but do not
   just cut them.** *Measured.* They carry real skill. If they read as
   bookkeeping, the Calico way is to make them landmarks in fixed squares that
   want certain neighbours, so the goal is drawn on the board where it is
   decided rather than counted on a tag.

**The package I would test first**: 1, 2, 3 and 5 together. They build on the
gates, make the square itself matter, move the best moments onto the board,
and give the score a meaning, and none of them adds a ledger.

## To reproduce

    node tools/stara-sim.mjs            # the 7×7 table, about two minutes
    SIDE=5 node tools/stara-sim.mjs     # the 5×5 table

The conservation numbers come from `play()`'s `cityMass` and `roadMass` (what
every drawn city and road tile would pay if all of it closed), set against the
`districts` and `roads` it reports.
