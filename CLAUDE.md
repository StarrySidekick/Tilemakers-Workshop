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
- After a change to the rulebook, rebuild the page
  (`node tools/rulebook-page.mjs <file>`) and publish it to the same link.
- When the rulebook and the docs (README, the mode's header, its in-game
  hint) disagree, the rulebook is the one that is tested: fix the docs.

## Before every merge

- `node tools/harness.mjs` must pass. It runs the rulebook check too.
- `node tools/smoke.mjs` must pass: every mode in a real browser.
