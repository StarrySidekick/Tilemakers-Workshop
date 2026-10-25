# Working in this repo

Read [`INTENT.md`](INTENT.md) first for what this project is for and what is
next. This file is only about how to work here.

## Rules

Soffiando keeps a rulebook, the way Grove Chess does in the Interpersonal
Games repo (Timothy, 2026-10-25: "a verified rules list ... mostly just
soffiando for now. it's been so long i don't even remember all the rules").
Every rule is in [`src/modes/soffiando-rulebook.js`](src/modes/soffiando-rulebook.js),
in plain words, and each has a test of the same id in
`tools/soffiando-rulebook.mjs` that plays it on the real engine. He reads it
as the [Soffiando Rulebook](https://claude.ai/artifact/BVoPcDWcuKSphtdZ2WJkXr).

- **Any change that adds, removes or changes how Soffiando plays updates its
  rulebook in the same commit**: the rule's words, its test, and `changed` /
  `was` (the date it changed and how it read before). Whether he asked for it
  or it was a side effect. A rule's number is permanent; a rule taken out has
  its number put in `RETIRED`.
- Say who a rule came from (`from`): his words, quoted, with the date; a call
  of Claude's, with why (named to him when it ships); the design history in
  `MODES.md`, by pass, where nobody wrote down who decided; or Carcassonne.
- **The deck is a list too**, [`src/modes/soffiando-deck.js`](src/modes/soffiando-deck.js):
  72 tiles (Timothy, 2026-10-25: "make sure we stick to 72 tiles"), every
  other tile an extra at 0. A change to it is a change to how the game plays
  and moves rule 3 with it.
- After a change to the rulebook or the deck, rebuild the page
  (`node tools/rulebook-page.mjs <file>`; it draws each tile's picture in
  Playwright's browser, so set `CHROME_PATH` if that is not found) and
  publish it to the same link, keeping its `db` capability.
- **"Apply the Soffiando Rulebook"** means: read the page's database
  (ArtifactData, collection `book`, doc `changes`): `rules` holds, by rule
  id, his comment (`note`), new words (`text`) or `out`, and rules of his own
  under ids starting `new-` (with their `group`); `tiles` holds the counts he
  wants, by tile id. Build each (rule words, test, `changed` / `was`, the
  deck), answer each comment that asks something, then clear what was built
  from that document, pinned to the version read, and republish the page.
- When the rulebook and the docs (README, the mode's header, its in-game
  hint) disagree, the rulebook is the one that is tested: fix the docs.

## Before every merge

- `node tools/harness.mjs` must pass. It runs the rulebook check too.
- `node tools/smoke.mjs` must pass: every mode in a real browser.
