# Which modes to keep

Timothy is going to cut some modes and is unsure about a lot of them. This is a
proposal to argue with, not a decision, and **nothing here deletes anything**.

Written 2026-09-06 from the code and from `MODES.md`.

**What this is evidence of, and what it is not.** Everything below is structural:
what each mode cost, what question it was built to answer, what its own shipped
note says happened, and whether that question is now settled. **It is not an
opinion about which is fun.** Nobody playing them wrote this, and the one thing
that should override all of it is Timothy having played a mode and liked it.

---

## The reframe that makes cutting easier

`MODES.md` says it up front: *"A prototype that doesn't answer a question isn't
worth building."* The corollary is the useful part and it does not seem to have
been said yet:

> **A prototype that HAS answered its question has already paid for itself, and
> deleting it does not un-answer the question.**

The answers are written down. Sprawl established that holes matter and that
uniform shape choice beats biggest-first. Strata established that a Z axis buys
elevation rather than replacement. Cirrus established that a board you keep
editing beats one you only grow — and then that the editing should not be
entirely yours, which is why Soffiando exists.

None of that is lost by retiring the mode. It is lost by deleting the section in
`MODES.md`, which should never happen.

So the question for each mode is not "was it worth building" — they all were —
but **"is it still earning its place in the dropdown?"** A workshop with twelve
modes is harder to show someone than a workshop with six, and Timothy wants to
be able to show this to people.

---

## The shape of what is there

Twelve modes ship, in `src/modes/index.js`. 4,873 lines of mode code, and it is
not evenly spread:

| Mode | Lines | Question it was built to answer | Answered? |
|---|---:|---|---|
| **Soffiando** | 1,966 | is a board that edits *itself* better than one you edit? | still asking |
| **Marches** | 481 | is the board better as a contested surface than a scoring one? | partly |
| **Expedition** | 375 | *undocumented* | — |
| **Adventure** | 369 | *undocumented* | — |
| **Descent** | 363 | does exploration hold up with a real fail state? | yes |
| **Chronicle** | 244 | are the tiles good *prompts*? | yes |
| **Sprawl** | 207 | does the board get more interesting when the *holes* matter? | yes |
| **Strata** | 169 | what does a Z axis buy — replacement, or elevation? | yes, elevation |
| **World** | 148 | what does the countryside still not have? | yes |
| **Tesserae** | 86 | is there a version someone opens every morning? | untested |
| **Duel** | 73 | is placing a tile fun with *nothing else* attached? | yes |
| **Classic** | 35 | *undocumented* — it is the control | n/a |

**Soffiando is 40% of all mode code**, and more than four times the next
largest. That is the clearest signal in the repo about where the interest
actually is.

---

## The proposal

### Keep, and do not think about it again

- **Duel** — 73 lines, and it asks the load-bearing question the whole workshop
  rests on: is placing a tile fun with nothing on top of it. It is the control
  group. Cutting the cheapest mode that validates every other one would be the
  single worst call available here.
- **Classic** — 35 lines. Same argument. It is the baseline every other mode is
  a deviation from.
- **Soffiando** — where the investment went, and its question is the only one on
  the list still genuinely open. **This is the candidate for its own repo** if
  any of them is.
- **Tesserae** — 86 lines, and its question ("does someone open this every
  morning?") is the only one that cannot be answered by playing. It needs people
  and time, not code. Cheap to keep, unanswerable if cut.

### Banked — answered clearly, safe to retire whenever the dropdown needs shortening

These four did their job. The finding is in `MODES.md` and survives the mode.

- **Sprawl** — answered, and the finding (uniform shape choice, not
  biggest-first) is the reusable part.
- **Strata** — answered: elevation, not replacement. 169 lines and the answer is
  a sentence.
- **Chronicle** — answered: yes, the tiles are good prompts. But it is a
  *different genre* from everything else here — an ad-lib story tool that
  happens to sit on a tile board — and if the workshop is being narrowed to a
  question about tile-laying, this is the least like the others.
- **Descent** — answered: yes, exploration holds up with a fail state. It also
  carries the only `localStorage` meta-progression in the repo, which is state
  nothing else has.

**Retiring one should mean marking its section in `MODES.md` as retired with its
answer intact, and taking it out of the registry.** Not deleting the file, and
never deleting the section.

### Decide what these three even are

**Expedition (375 lines), Adventure (369) and Classic (35) ship, and none of them
has a design section in `MODES.md`.**

That document opens by saying it is "the reasoning behind each one" and lists
thirteen. Three shipped modes are not among them, which means 780 lines of mode
code exist with no written record of what question they were asking. Expedition
turns up in `MODES.md` exactly once, in the computer-player section, where the
bot found that its caves are free turns and ran a two-player game from 96 turns
to 670 — which reads like an unresolved balance problem in a mode nobody wrote
down.

**This is the first thing to fix, before any cutting.** A mode you cannot say
the purpose of is one you cannot fairly judge, and two of these are larger than
most of the modes above.

### Not modes, and not cuttable

Four of the original thirteen resolved themselves into **mechanics that work
everywhere**, which `MODES.md` already records as the better outcome: *Rising
tide*, *Drafting market*, *Hidden agendas* + *Fog of war*, and *Two-faced tiles*.
**World** is effectively in this group too — its four families are tile groups
switchable inside any other mode, so it is a mechanic wearing a mode's row in
the dropdown.

None of these is on the table. They cost one entry in a modifier list each and
apply to everything.

---

## If the goal is a workshop you can show someone

Six rows rather than twelve: **Classic, Duel, Sprawl, Strata, Soffiando,
Tesserae** — a baseline, the control, two placement experiments with clean
answers, the one that is still open, and the daily. Modifiers stay as they are.

That leaves out Marches, Descent, Chronicle, Expedition and Adventure, which is
the aggressive version and is offered as one end of the range rather than as a
recommendation. **Marches is explicitly off the table** at Timothy's request and
is listed here only for completeness.

---

## What would make the next version of this document better

The honest limit of this one is that it is written from the code. The two things
that would beat every argument in it:

- **Play each mode once and write a sentence.** A mode that is boring on its own
  terms should go however cleanly it answered its question.
- **Say what the workshop is narrowing toward.** "Which mechanic is worth a whole
  game" and "which modes are fun to show a visitor" pull in different directions,
  and several of the calls above would flip depending on which is meant.
