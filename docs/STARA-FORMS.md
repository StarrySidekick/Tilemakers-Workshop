# Starà's two forms: the daily and the long game

Written 2026-11-27, when Timothy asked for it: *"I also want to kind of start
creating the idea that there's a long form version of this mode and a short
form, and that we can kind of want to design them to be related to each other,
but also like not necessarily the same. Like one is the daily mode and one is
a longer form mode that might become like an actual video game."*

This is the frame for both, and the first answer to what makes them related
and what keeps them apart. The short form is **Starà** (`stara`, `stara5`,
`src/modes/stara.js`). The long form is **Contado** (`contado`,
`src/modes/contado.js`). MODES.md has the rules and measurements of each in
sections 14 and 16.

## What each is for

| | The daily (Starà) | The long form (Contado) |
|---|---|---|
| A session | One sitting, a few minutes | Many sittings, picked up where you left it |
| The deal | The same for everyone today | A new land and seed every run |
| What you chase | The architect's plan: a target someone else can also hit | How long the city lasts, and what it is worth when it falls |
| How it ends | The pieces run out | A commission is missed |
| The feeling it should leave | "I could have done that better" (and tomorrow is new) | "I built that" (and it is still there) |
| Where the skill is | Order and placement against a known target | Planning a year ahead, against asks you can see coming |

A daily is a **puzzle**: fair, comparable, short, forgiving of a bad day
because there is another one tomorrow. A long game is a **project**: what you
did ten minutes ago matters now, and so does what you did last week. Most
choices below follow from that one difference.

## What they share, and why it must stay shared

The rules of the CITY are one code path for both: `src/modes/stara-city.js`
scores every city in the workshop, the daily's, the daily's plan, and
Contado's. That is the relation he asked for, made literal:

- the places (houses, plazas, the Comune, the cathedral, the aqueduct) and the
  pieces of one to four squares they come in;
- how a city is paid: houses only, 1 a square, +1 each for a plaza, water and
  the cathedral beside them;
- streets must meet streets; the wall hugs the city at a point a stretch and a
  gate two; the best street out on two or more sides is the high road;
- the aqueduct as a layer over everything, water from a spring;
- three in hand, drag, turn, hold to seal, hold to lift for a point;
- the screen, and the look (the inked table, and the low-poly model in
  `src/lowpoly.js`, from above or in isometric).

So a player who learns one has learned the other. A change to the core
(a new place, a new way to be paid) lands in both, unless it is meant not to.

## What the long form adds, and how it is kept out of the daily

The long form's own rules enter the shared scorer as an **optional input**,
never as a fork: `cityOf(cells, spans, spring, land)`. The daily passes no
`land`, so its table is flat and its scoring is exactly what it was; the
harness's Starà checks are unchanged and still pass. Contado passes its
land, and two rules switch on:

1. **The slope is a wall.** A stretch of wall facing lower ground costs
   nothing (a gate there still costs its 1). Hill towns were half walled by
   their hill.
2. **Water does not climb.** The aqueduct's channel holds the spring's level;
   it cannot carry water over ground higher than the spring.

Together they make the land a decision: the hilltop is cheap to wall and dry,
the slope below the spring is wet and costs more wall. That is how Siena,
Orvieto and San Gimignano actually lived.

On top of the city, the long form adds a **structure of play** the daily does
not need: years, and the Signoria's commissions (the half of the old
Carcassonne app's Solitaire that the daily never took). Each year deals a
handful of pieces and asks for something the shared scorer can measure; meet
it and it pays 5 and the next year comes asking more; miss it and the run is
over.

## A rule of thumb for later

- **A change to how a city is paid** belongs to both, through
  `stara-city.js`. Try it in the daily first: the daily is measured (the plan,
  greedy, random), the same for everyone, and short, so a bad rule shows fast.
- **A system that needs time to matter** (the land, commissions, places that
  unlock over a run, events, a second city, trade between them) belongs to
  the long form. It has room for variance a daily cannot afford.
- **A long-form idea that turns out to make a good one-sitting puzzle** can
  graduate to the daily, as an optional input to the scorer, the way `land`
  went in.

## Open, and his to decide

These were calls of Claude's to get a first long form playable; each is
named so it can be changed.

- **The name.** Contado (the land a city-state ruled) is a working title.
- **How a run ends.** One missed commission ends it now. A gentler long game
  would have the Signoria's patience: two or three misses, or a missed
  commission that costs instead of ends.
- **The deal.** Contado's pieces are random (weighted, and leaning toward the
  year's ask). The daily's come from a plan, which guarantees they fit
  together. A long form could deal each year from a plan of its own.
- **More places over the years.** city.js still has the pictures of the
  convent, barracks, keep, market, tannery, wizard's tower and the rest from
  the fifth pass. A long form is the natural place to bring them back, one a
  few years, each a new way to be paid.
- **The land in the daily.** A daily on a hill some days would be a different
  puzzle; it would need the plan maker to know about the land.
- **Physical or digital.** INTENT.md says some modes become board games and
  some digital games. The long form, with its saved runs, years and a 3D
  land, reads as a digital game; the daily could go either way.

## Measured

Greedy play (every piece in hand at every place it fits, the best city now)
over 30 runs (`node tools/contado-sim.mjs`; `GROWTH=1` for what a greedy
city has at the end of each year, which the targets were set from):

- a run lasts **2 to 15+ years, median 6**, about 6 to 9 pieces a year;
- what ends it: the plaza ask 16 times, worth 5, water 4, the cathedral's
  parish 2 (3 runs passed year 14);
- no run ends in year 1 (the first year deals enough houses for its ask).

A player who reads the year's ask before laying its first piece should do
better than greedy, which never looks ahead.
