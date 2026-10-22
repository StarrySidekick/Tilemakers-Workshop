# Soffiando: the island game

Written 2026-10-22, from Timothy's brief and about 1,500 measured bot games.
Everything here is either a measurement or a proposal, and each says which it is.

## The brief

What Timothy said is fun, in his words as near as possible:

1. **Making islands by blowing the board apart.**
2. **Getting followers out to those islands "using various techniques."**
3. **Scoring on the islands.**
4. Everything can change, in interesting ways, because of the wind.

And the constraints: it should be **fair, balanced and intuitive**, it will
probably become a **physical game**, the mainland is "the landmass with the most
tiles", you **may not put a follower on an island unless you already have one
there**, and maybe **anyone should be able to lay tiles on an island**.

## How this was measured

A measurement script written for this analysis (not yet in the repo) plays
full games between two `sharp` computer players and records, turn by turn, every way
a follower arrives on an island or leaves one. Each rule variant got 60
two-player games on the same seeds, so the variants differ by the rule and not
by the shuffle. Three- and four-player runs are noted where they matter.

Terms used below:

- **Stranded**: the follower was standing on the mainland and the wind broke
  that piece off. It did not move; the country moved.
- **Built out**: a follower placed on an island where you already had one.
- **Walked / flown / blown**: the three routes that move a follower onto an
  island on purpose (the walk along a road, the flying machine, the wind).
- **Bridged**: someone laid a tile across a gap that joined an island back onto
  the mainland, so everyone standing on it is suddenly on the mainland.
- **Mainland flip**: the "biggest landmass" changes from one piece to another,
  so every follower on both pieces swaps between mainland and island at once.

**What the bots can and cannot tell you.** The computer player looks one move
ahead and has no plan for islands: it does not aim a gust at its own follower or
walk toward an island it wants. So the numbers describe what the rules make
*common*, not what a good human would manage. That is still the right question
for a rule set. A route that only appears when a strong player plans for it is
a route most players at the table will never see.

---

## Findings

### 1. Islands already carry the score

| 2 players, per game | |
|---|---:|
| Islands at the end | 8.4 |
| Tiles out on islands (of ~84) | 34 |
| Biggest island / mainland | 15 / 50 |
| Islands at any given moment / with someone on them | 4.0 / 1.3 |
| **Share of all points earned on islands** | **45%** |
| Games won by whoever earned more island points | 81% |

The scoring side of the brief is mostly in place already. Because everything
on an island pays double, islands are close to half of all points, and the
player who does better out there usually wins. At three and four players the
island share rises to 47% and 54%.

### 2. Getting there is almost never on purpose

How followers arrive on islands, per two-player game:

| Route | Before this session | After the fixes below |
|---|---:|---:|
| Stranded (you were standing there when it broke off) | 11.6 | 12.3 |
| Built out from a foothold you already had | 10.0 | 11.2 |
| **Walked** along a road | **0.0** | **2.2** |
| Flown (flying machine) | 0.15 | 0.05 |
| Blown by the wind | 0.33 | 0.23 |
| Piggybacked on a rival's foothold (a bug) | 2.5 | 0 |

The part of the brief Timothy likes most, finding a way to get a follower out
there, is the part that happens least. About 90% of island presence is either
luck of position (stranded) or a consequence of it (built out). The deliberate
routes add up to about two a game, and before this session they added up to
half of one.

Why each route is rare:

- **The walk was dead code** (finding 4). It is now the most-used route.
- **The flying machine** comes up 2.6 times a game, and only 0.7 of those
  flights pass over an island at all, because the lane is wherever the tile
  happens to point. It is a lottery ticket rather than a plan.
- **The wind** carries a follower `power` squares, usually one or two. A
  follower blown off the edge of the mainland lands in the gap, and a follower
  that lands in a gap goes home. So the wind mostly *removes* people rather
  than delivering them: 4.8 followers a game are carried, 0.2 land on an island.

### 3. The island rule leaked (fixed)

The rule was meant to be "you may build on, and claim on, an island only if
**you** have a follower there". The code checked for **any** follower. So once a
rival was stranded on a rock, everyone at the table could build there and put
followers there. At two players that was 2.5 followers and 3 tiles a game; at
three players, 5.8 followers and 7 tiles, a third of all follower placements on
islands. Fixed in `Soffiando.reachable()`, with a test.

### 4. The walk could never happen (fixed)

When a sphere pays one of your followers on your own turn, the mode offers it a
walk along a road instead of the trip home. The offer opened inside the
mode's `afterPlace`, which then told the host "next phase: follower step", and
the host obeyed, overwriting the walk before anyone saw it. Twenty-five walks
offered across twelve games, zero reachable, by bots or by people. Separately
the bot always pressed the first button in a walk ("send it home instead"), so
every number in `MODES.md` was measured without walks. Both fixed, and fixing
them exposed a third bug: the game log keeps 80 lines, and the bot detected
"did anything happen" by the log's length, which stops changing once the log is
full. A bot declining one walk to be offered the next looked stuck and ended the
game early. There is now a running message count (`game.said`) used by the bot
and by the UI's redraw check.

### 5. "Biggest landmass" flips

When two landmasses are close in size, one tile changes which is the mainland,
and every follower on both swaps status at once: rates double or halve,
building rights appear or vanish.

| | flips a game | follower statuses swapped | games with a flip |
|---|---:|---:|---:|
| Before the fixes | 4.8 | 48 | 50% |
| After the access fix | 1.7 | 15 | 45% |
| **Palazzo's landmass is the mainland, Palazzo cannot be blown** | **1.0** | **5** | (*) |

(*) What remains under the Palazzo rule is not flipping; it is the Palazzo's
own landmass being cut in two, which is ordinary stranding on a large scale.

This matters more on a table than on a screen. With "biggest", a player has to
count two landmasses of fifteen-odd tiles every time they are close, and get it
right, before anyone knows what anything is worth.

### 6. Open tiles on islands: right idea, wrong scoring for it

Letting anyone lay a tile on any island (Timothy's idea), measured two ways:

| | flips a game | biggest island vs mainland | average winning margin | top score |
|---|---:|---:|---:|---:|
| Fixed shipped rules | 1.7 | 15 vs 50 | 44 | 232 |
| Open tiles, mainland = biggest | 10.3 | 24 vs 40 | 33 | 210 |
| Open tiles, mainland = Palazzo's | 0.6 | **38 vs 34** | **76** | **407** |

With "biggest", open tiles make islands grow as fast as the mainland, and the
mainland flips ten times a game in 90% of games. With the Palazzo rule the flips
stop, but the biggest island outgrows the mainland and the margin nearly
doubles. The cause is structural: tiles laid on an island can only be claimed
by whoever is already standing there, and everything there pays double, so
every tile a rival lays on your island is a gift that keeps compounding. (Bots
lay 46 tiles a game on islands they cannot claim on; humans would do it less,
but the shape of the problem is the same.)

So open tiles work only together with two other changes: a stable mainland
(finding 5) and island scoring that does not make island *size* a multiplier on
everything else (see "Scoring" below).

### 7. The board sprawls past any table

Median extent at the end of a two-player game: **19 by 30 squares**. One game in
ten covers more than **1,500 squares**, and the widest reached **169 by 234**.
Fragments that drift away are blown further every time a gust crosses their
lane, and nothing ever brings them back. A physical game needs a fixed mat, so
mats were simulated, with anything blown past the edge falling off:

| Mat (Palazzo mainland) | Size at 45 mm a tile | Islands at end | Tiles on islands | Island share of points | Tiles lost off the edge |
|---|---|---:|---:|---:|---:|
| unbounded | n/a | 9.2 | 37 | 45% | 10 |
| 21 × 21 | 95 cm square | 6.5 | 23 | 33% | 12 |
| **19 × 19** | **86 cm square** | **5.5** | **20** | **28%** | **14** |
| 17 × 17 | 77 cm square | 5.3 | 14 | 20% | 14 |
| 13 × 13 | 59 cm square | 3.6 | 7 | 10% | 16 |

A 13 × 13 mat kills the archipelago: there is no open water for fragments to
survive in. **19 × 19 keeps about 60% of the islands** and fits a dining
table. The deck size and the mat size are one dial: a smaller deck on a smaller
mat should behave like this deck on a bigger one.

### 8. Fairness

- **Seat order is fair at two players**: the first seat won 50.6% of 720
  two-player games (one standard error is 1.9 points, so this is as close to
  50% as the sample can resolve).
- **At three and four players there is a lean, not yet a finding.**

  | | seat 1 | seat 2 | seat 3 | seat 4 | fair share | one standard error |
  |---|---:|---:|---:|---:|---:|---:|
  | 3 players, 100 games | 39% | 28% | 33% | | 33% | 4.7 |
  | 4 players, 90 games | 31% | 17% | 28% | 21% | 25% | 4.6 |

  Both counts lean the same way (first seat up, second seat down) by one to two
  standard errors each. A few hundred more games would settle it; if it holds,
  the usual remedies are a compensating start (later seats begin with a
  follower already on the board, or one extra follower) rather than a rule
  change.
- **Games are lopsided.** Average winning margin is 44 points on an average
  score of 122, or 36% of a typical score. The same bots playing classic
  Carcassonne: 17 on 65, or 27%. Not alarming, but the variance is real and it
  rises sharply under any rule that lets one island run away (finding 6).

### 9. The income report was wrong by a factor of 5.7 (fixed)

`tools/train-worker.mjs` counted every payment made while the bot was
*imagining* closing a sphere, as well as the real ones. Its per-colour
breakdown was 5.7 times the true income. That is how the eleventh pass read
"317 points a game from green" off games whose mean score was 196. The weights
the trainer chose are unaffected (it selects on wins, not on the breakdown), but
the per-colour income numbers in passes eleven and twelve should not be
trusted. The real split, after this session's fixes, both players per game:

| green farms | yellow roads | blue cities | red temples | turbines | archipelago | windmills | reopened |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 113 | 47 | 32 | 23 | 14 | 12 | 6 | -2 |

Farms are 46% of everything, and farms have nothing to do with islands except
that island farms pay double.

---

## Recommendations

### Do now: the Palazzo is the mainland, and it never moves

Replace "biggest landmass" with: **the landmass the Palazzo is on is the
mainland; everything else is an island; the Palazzo cannot be blown.**

- It is stable: flips drop from 1.7 to about 1 a game, and status swaps from 15
  to 5, and the remainder are real breaks rather than counting accidents.
- It is visible: on a table you look for one piece instead of counting two.
- It costs one rule (the Palazzo towing every island when it moves), which is
  the most expensive rule in the mode to resolve by hand anyway.
- It is the precondition for open tiles.

This was tested on a copy of the engine, not shipped, because it reverses the
sixteenth pass's call and that is Timothy's to make.

### Make the routes real

The brief says "various techniques", and right now there is one technique
(be in the right place by accident) plus a walk that just came back to life.
Each route should be a verb you can *choose* on a turn you plan:

1. **Stranded** (keep as is). Standing on the loose end of the country before
   the wind takes it is anticipation, and it is skill.
2. **Walk** (keep, and widen). Today it is offered only right after a sphere
   pays you. Make it a standing alternative to placing a follower: walk one of
   your followers along its road, across any gap where two road ends face each
   other, to the first unclaimed feature. Even in its narrow form it is already
   the most-used deliberate route.
3. **Ride the wind** (change). Measured: if a follower blown into a gap keeps
   travelling downwind until it lands on a tile, instead of going home, wind
   arrivals on islands go from 0.3 to 1.4 a game. On a table it is one motion:
   slide the figure downwind until it hits land. It turns a zephyr into
   something you aim through your own follower, which is the most "Soffiando"
   route there could be.
4. **Fly** (simplify). The flying machine as a drawn tile pointing wherever it
   lands is a lottery. Give each player one or two **balloon** tokens instead:
   once each, move one of your followers in a straight line over open sky to
   the first tile in that line. Same geometry as the cannon, so nothing new to
   learn, and it is a resource you plan with rather than a tile you hope for.
5. **Build out** (keep). One follower on an island lets you lay tiles and put
   followers there.

And name the counter-move, because it is already the main way islands die:
**annexing**. A tile laid across a one-square gap joins an island back to the
mainland and opens it to everyone (12.6 follower statuses a game end this
way). That is good: it is how you invade an island you could not reach.

### Scoring: three options

| | What it is | For | Against |
|---|---|---|---|
| **A. Keep the sferas** | Four colours, each a scoring pass over the whole board; islands pay double | Already makes islands 45% of points; nothing to rebuild | 4 to 8 full-board scorings a game is the heaviest bookkeeping in the mode; farms (46%) are the real economy; double rates make open tiles a runaway |
| **B. The census** (recommended to try) | Sfera halves lose their colours. Two halves meeting **counts the islands**: on each island, whoever has the most followers there scores 1 a tile; tied players all score. Then that player's followers on that island go home. The mainland never scores in a census. | Islands *are* the scoring event; navigation is the skill it rewards; a census only looks at islands, which are small and few (about 4 at a time), so it is quick by hand | Needs a mainland economy beside it (below); untested |
| **C. Carcassonne plus double** | Ordinary completion scoring; islands pay double; archipelago bonus at the end | Every Carcassonne player already knows it | Wind un-finishes things, which forces clawbacks; passes eight and nine show how messy that ledger got |

**Recommended shape: B for the islands, Carcassonne for the mainland.**
Mainland features score once when completed, the Carcassonne way, and the
follower comes home; if the wind later breaks the feature, the points stay
(there is no follower left to take them from, so there is no ledger). Islands
score only in the census. The familiar game is the economy you know; the islands
are the prize, and reaching them is the skill.

What the mode's own history says about census-style scoring, because it has
been tried in pieces:

- **Counting the mainland in a census** made it 74% of all points and dropped a
  sharp bot's record against random play from 37–3 to 23–17 (fifth pass). The
  census must exclude the mainland.
- **Paying a standing annuity** (islands scored every round) produced 0 to 492
  island points a game (third pass). The census must be an event, not a rate.
- **A flat 3 per island** restored the skill gap to 31–9 (seventh pass). Flat
  rewards spreading out; per tile rewards growing one. "1 a tile" is offered
  above because open tiles make growing an island a real choice, but a flat
  rate is the fallback if big islands run away again.
- **Sending the scorer home** is the brake the thirteenth pass found for farms,
  and it is what makes second place on an island valuable: they are first next
  time.

### For the physical game: what to keep

Every rule in the mode, sorted by whether it serves the brief and what it costs
at a table:

| Rule | Serves | Cost by hand | Proposal |
|---|---|---|---|
| Zephyr: the loose end blows off | islands | low | keep |
| Every run in the lane loses its loose end | islands | low | keep |
| Same-way zephyrs add power | islands | low | keep |
| Woken zephyrs add +1 power per corner | islands | high (power tracking through a chain) | wake, but no extra power |
| Islands sail whole and stop alongside | islands | medium | keep |
| Gust cannon (6 tiles) | islands (seeds far colonies) | low: slide until it hits | keep |
| Double zephyrs (2) | islands | low | keep |
| Multi-way zephyrs (4) | islands | medium | keep the compass rose, cut three |
| A moved tile that fits nothing falls | tidiness | medium | keep |
| Palazzo tows every island | islands | very high | cut (Palazzo pinned) |
| Followers carried downwind | routes | low | keep, landing on the next tile |
| Followers ride zephyr chains | routes | high | cut |
| Walk | routes | low | keep, widen |
| Flying machine, three verbs | routes | medium | replace with balloon tokens |
| Catch-and-throw | nothing in the brief | low | cut |
| Four sfera colours, board-wide passes | scoring | very high | replace with the census |
| Farms (green) | not islands | high | cut, or end of game only |
| Temples and parishes (red) | not islands | medium | become ordinary monasteries |
| Windmills and turbines | nothing in the brief | medium | cut |
| Lying flat | nothing in the brief | low | cut |
| Reopen penalty | nothing in the brief | medium | cut (no ledger under Carcassonne scoring) |
| Windvane re-cut | nothing in the brief | medium | cut |
| Abbazia | caps features | low | optional |
| Balena | a brake | low | optional; strongest as island defence |
| Archipelago bonus (10) | island scoring | low | fold into the census |
| Fixed mat, edge is a cliff | physical | n/a | add: 19 × 19 |

Roughly thirty rules become about twelve, and every one of the twelve is about
islands, getting to them, or scoring them.

### A one-page draft of the core

> **Soffiando: the archipelago.** 2 to 4 players.
>
> **Setup.** A 19 × 19 sky mat. The Palazzo goes in the centre. It never moves.
> The landmass touching the Palazzo is the **mainland**; every other landmass,
> down to a single tile, is an **island**.
>
> **Your turn.**
> 1. Draw a tile and lay it, edges matching. It must touch the mainland, or an
>    island where you have a follower. *(Variant: anywhere at all.)*
> 2. Do one of: place a follower on that tile; **walk** a follower along its
>    road; launch a **balloon**. You may never place a follower on an island
>    where you have none.
> 3. If the tile has a zephyr, the wind blows (below).
> 4. Score anything completed on the mainland, Carcassonne style. If two sfera
>    halves now touch, take a **census**.
>
> **The wind.** Look down the zephyr's lane. Every separate run of tiles in it
> loses its **loose end**: the last tile before the gap. Power starts at 1 and
> rises by 1 for each zephyr in the lane facing the same way; at power N the
> last N tiles move N squares. A whole island in the lane moves as one piece, up
> to N squares, stopping alongside whatever it meets. A zephyr facing another
> way fires next (each zephyr once per turn). Followers in the lane slide
> downwind until they reach a tile. Anything pushed off the mat falls off. A
> moved tile touching others whose edges it cannot match falls off.
>
> **The census.** Each island scores 1 per tile to whoever has the most
> followers on it (ties all score), and those followers come home.
>
> **End.** When the deck runs out: a final census, then unfinished mainland
> features score 1 per tile.

---

## What only Timothy can decide

1. **Pin the Palazzo and make its landmass the mainland?** Recommended: yes.
2. **Open tiles on islands?** Recommended: yes, but only together with 1 and
   with census scoring. Under the current double rates it produces runaway
   islands.
3. **Census scoring?** This is the big one. It would be built as a separate row
   in the mode list so the two can be played side by side.
4. **Followers slide until they land?** Measured at more than four times as
   many wind arrivals; it is the cheapest change on this list.
5. **Mat size:** 19 × 19 with this deck, or a smaller deck on 17 × 17.

## What changed in the code this session

- `Soffiando.reachable()`: island access counts **your** followers only.
- `Soffiando.afterPlace()`: hands the host `'stroll'` when a walk has opened, so
  the walk is reachable.
- `Soffiando.botStroll()`: the computer player takes a walk when the
  destination is worth more than the supply (`SOFFIANDO_WEIGHTS.walk`).
- `Soffiando.skipStroll()`: declining a walk says so in the log.
- `Game.said` counts every log line ever written; the bot's move detector and
  the UI's redraw signature use it instead of the capped log's length.
- `tools/train-worker.mjs`: the income breakdown ignores the bot's imagined
  spheres.
- `tools/harness.mjs`: tests for the access rule and for the walk surviving the
  host, both checked to fail on the old code; the stuck detector counts pending
  walkers.

Nothing in the rule proposals above is built. The Palazzo mainland, the mats,
open tiles and sliding followers were all tested on a scratch copy of the
engine and are described here, not shipped.
