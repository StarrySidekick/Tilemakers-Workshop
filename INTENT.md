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

**Fields.** Timothy believed fields already worked. `MODES.md` says half-edge
connectivity was never built and that Marches works around it with banners.
**Check the code before believing either document** — and if fields are genuinely
not implemented, implementing them is wanted.

**Workshop feel.** How it looks, how it reads, how quickly someone can
understand what they are looking at.

## Deliberately not next

- **Depth on any single mode.** Modes are going to be cut and Timothy is unsure
  about a lot of them. Do not invest in one.
- **Marches.** He has not touched that mode and does not want effort spent there.
- **Relief and the 3D tiles.** Experimental, and explicitly tabled for now.
  `docs/RELIEF.md` stays as the scoped spike it is.

## A useful thing that is not code

Modes are going to be cut, and he does not yet know which. **A clear-eyed
written assessment of which of the twelve actually answered its question** — the
one `MODES.md` states for each — would be genuinely useful. Offered as a
proposal for him to decide on. Never as a deletion.

## Where it is going

Some modes eventually become **physical board games** and some become **digital
games**. There may one day be a per-mode distinction, so that a digital-only
mode can do things a physical one never could, and vice versa. Worth keeping in
mind when judging whether a mechanic is good. Not a thing to build yet.
