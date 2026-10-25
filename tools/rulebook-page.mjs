// ---------------------------------------------------------------------------
// Soffiando's rulebook as a page to read on a phone.
//
//   node tools/rulebook-page.mjs [out.html]     default tools/shots/soffiando-rules.html
//
// Built from src/modes/soffiando-rulebook.js and nothing else, so the page
// says exactly what the rulebook says, and the rulebook says exactly what
// tools/soffiando-rulebook.mjs proves on the engine. The page is published as
// Timothy's Artifact (CLAUDE.md, "Rules"); rebuild and republish it to the
// same link whenever a rule changes.
// ---------------------------------------------------------------------------

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { RULEBOOK } from '../src/modes/soffiando-rulebook.js';

const ROOT = new URL('..', import.meta.url).pathname;
const out = process.argv[2] || join(ROOT, 'tools/shots/soffiando-rules.html');
const book = RULEBOOK.soffiando;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
/** "(rule 40)" and "(rules 25 to 27)" become links to those rules. */
const linked = (text) => esc(text).replace(/\brules? (\d+)(?: (to|and) (\d+))?/g, (m, a, w, b) => (b
  ? `rules <a href="#r${a}">${a}</a> ${w} <a href="#r${b}">${b}</a>`
  : `${m.startsWith('rules') ? 'rules' : 'rule'} <a href="#r${a}">${a}</a>`));

const OPTION = { capWalls: 'lone walls dealt (capWalls)', clouds: 'clouds (clouds)', balena: 'the Balena (balena)' };

function source(f) {
  if (f.by === 'timothy') {
    return `<div class="from timothy"><span class="who">Timothy, ${esc(f.on)}</span>`
      + `<q>${esc(f.said)}</q>${f.call ? `<span class="call">Read as: ${esc(f.call)}</span>` : ''}</div>`;
  }
  if (f.by === 'history') {
    return `<div class="from history"><span class="who">Design history${f.pass ? `, ${esc(f.pass)} pass` : ''}</span>`
      + `${f.why ? `<span class="call">${esc(f.why)}</span>` : ''}</div>`;
  }
  if (f.by === 'carcassonne') {
    return `<div class="from carc"><span class="who">From Carcassonne</span>${f.why ? `<span class="call">${esc(f.why)}</span>` : ''}</div>`;
  }
  return `<div class="from claude"><span class="who">Claude's call</span><span class="call">${esc(f.why)}</span></div>`;
}

const groups = book.groups.map((g) => {
  const rules = book.rules.filter((r) => r.group === g.id).sort((a, b) => a.n - b.n);
  if (!rules.length) return '';
  return `<section class="group" id="${g.id}">
  <h2>${esc(g.name)}</h2>
  <p class="ask">${esc(g.ask)}</p>
  <ol class="rules">
${rules.map((r) => `    <li class="rule" id="r${r.n}" data-text="${esc(`${r.n} ${r.text} ${r.from.said || ''} ${r.from.why || ''} ${r.from.call || ''}`.toLowerCase())}">
      <a class="n" href="#r${r.n}" aria-label="Rule ${r.n}">${r.n}</a>
      <div class="body">
        <p class="text">${linked(r.text)}</p>
        ${(r.settings || []).map((s) => `<span class="opt">Option: ${esc(OPTION[s] || s)}</span>`).join('')}
        ${r.changed ? `<p class="was">Changed ${esc(r.changed)}. Before: ${esc(r.was)}</p>` : ''}
        ${source(r.from)}
      </div>
    </li>`).join('\n')}
  </ol>
</section>`;
}).join('\n');

const count = book.rules.length;
const byTimothy = book.rules.filter((r) => r.from.by === 'timothy').length;
const html = `<title>Soffiando Rulebook</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@500;700&family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&display=swap">
<style>
  /* One column of numbered rules under a sky band; the pixel face only for
     the name and the numbers, a reading face for everything else. */
  :root {
    --sky: #a9d5f5; --sky-deep: #7fb4df; --ink: #3a3262; --paper: #f7f8fd;
    --card: #ffffff; --line: #d9dcef; --muted: #5d5a7f; --gold: #b9861f;
    --timothy: #2d58a8; --history: #6a6390; --carc: #8a5a3c; --claude: #2f7f48;
    --display: "Pixelify Sans", "Courier New", monospace;
    --body: "Atkinson Hyperlegible", system-ui, -apple-system, sans-serif;
  }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
    --sky: #2b2752; --sky-deep: #3d3770; --ink: #e8e6fb; --paper: #1d1a38;
    --card: #26224a; --line: #3b3666; --muted: #b3aedb; --gold: #f3c24f;
    --timothy: #9cc3ff; --history: #c7c0f0; --carc: #e3b08a; --claude: #8fd6a3; color-scheme: dark } }
  :root[data-theme="dark"] {
    --sky: #2b2752; --sky-deep: #3d3770; --ink: #e8e6fb; --paper: #1d1a38;
    --card: #26224a; --line: #3b3666; --muted: #b3aedb; --gold: #f3c24f;
    --timothy: #9cc3ff; --history: #c7c0f0; --carc: #e3b08a; --claude: #8fd6a3; color-scheme: dark }
  body { background: var(--paper); color: var(--ink); font: 16px/1.55 var(--body); margin: 0; }
  .band { background: var(--sky); border-bottom: 3px solid var(--sky-deep);
    padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); padding-block: 28px 22px; }
  .wrap { max-width: 44rem; margin: 0 auto; }
  main.wrap { padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); padding-block: 8px 48px; }
  h1 { font: 700 2.4rem/1.05 var(--display); margin: 0 0 8px; letter-spacing: 0.01em; text-wrap: balance; }
  .lede { margin: 0; max-width: 36rem; }
  .meta { margin: 10px 0 0; color: var(--muted); font-size: 0.9rem; }
  nav { display: flex; flex-wrap: wrap; gap: 6px; margin: 16px 0 0; }
  nav a { font: 500 0.85rem var(--display); color: var(--ink); text-decoration: none; padding: 3px 8px;
    border: 2px solid var(--sky-deep); background: var(--paper); }
  nav a:focus-visible, .n:focus-visible, input:focus-visible { outline: 3px solid var(--gold); outline-offset: 2px; }
  .find { margin: 20px 0 4px; }
  .find label { display: block; font-size: 0.85rem; color: var(--muted); margin-bottom: 4px; }
  .find input { width: 100%; box-sizing: border-box; font: 1rem var(--body); padding: 8px 10px; color: var(--ink);
    background: var(--card); border: 2px solid var(--line); border-radius: 0; }
  .group { margin-top: 30px; }
  h2 { font: 700 1.35rem/1.2 var(--display); margin: 0; text-wrap: balance; }
  .ask { margin: 2px 0 10px; color: var(--muted); }
  ol.rules { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
  .rule { display: grid; grid-template-columns: 2.6rem 1fr; gap: 10px; background: var(--card);
    border: 2px solid var(--line); padding: 12px 12px 12px 8px; scroll-margin-top: 12px; }
  .rule:target { border-color: var(--gold); }
  .n { font: 700 1.25rem/1.3 var(--display); color: var(--ink); text-decoration: none; text-align: right;
    font-variant-numeric: tabular-nums; }
  .body { min-width: 0; }
  .text { margin: 0; }
  .text a { color: inherit; text-decoration-color: var(--gold); text-decoration-thickness: 2px; }
  .opt { display: inline-block; margin-top: 8px; font-size: 0.8rem; padding: 1px 8px; border: 2px dashed var(--sky-deep); color: var(--muted); }
  .from { margin-top: 8px; font-size: 0.86rem; color: var(--muted); display: grid; gap: 2px;
    border-left: 3px solid var(--line); padding-left: 10px; }
  .from .who { font-weight: 700; letter-spacing: 0.02em; }
  .timothy { border-left-color: var(--timothy); } .timothy .who { color: var(--timothy); }
  .history { border-left-color: var(--history); } .history .who { color: var(--history); }
  .carc { border-left-color: var(--carc); } .carc .who { color: var(--carc); }
  .claude { border-left-color: var(--claude); } .claude .who { color: var(--claude); }
  q { font-style: italic; quotes: "\\201C" "\\201D"; }
  .was { margin: 8px 0 0; font-size: 0.86rem; color: var(--muted); }
  .none { color: var(--muted); }
  footer { margin-top: 36px; color: var(--muted); font-size: 0.85rem; }
  @media (prefers-reduced-motion: no-preference) { html { scroll-behavior: smooth; } }
</style>
<header class="band">
  <div class="wrap">
    <h1>Soffiando Rulebook</h1>
    <p class="lede">Every rule of the cloud kingdom, as the game plays it today. Each one has a test of its own that plays it on the game's engine, so if a rule here and the game ever disagree, the check fails.</p>
    <p class="meta">${count} rules in ${book.groups.length} parts · ${byTimothy} from Timothy's own words · built ${new Date().toISOString().slice(0, 10)}</p>
    <nav aria-label="Parts">${book.groups.map((g) => `<a href="#${g.id}">${esc(g.name)}</a>`).join('')}</nav>
  </div>
</header>
<main class="wrap">
  <div class="find">
    <label for="find">Find a rule</label>
    <input id="find" type="search" placeholder="cloud, island, wall…" autocomplete="off">
  </div>
  <p class="none" id="none" hidden>No rule says that.</p>
${groups}
  <footer>Rule numbers are for good: a rule taken out keeps its number, and no new rule reuses it.
  Sources: Timothy's own words where he said it; the design history (the passes in MODES.md) where nobody wrote down who decided; Carcassonne where it is Carcassonne's.
  Proven by <code>node tools/soffiando-rulebook.mjs</code> in the Tilemaker's Workshop repo.</footer>
</main>
<script>
  const box = document.getElementById('find');
  const rules = [...document.querySelectorAll('.rule')];
  const groups = [...document.querySelectorAll('.group')];
  box.addEventListener('input', () => {
    const q = box.value.trim().toLowerCase();
    let shown = 0;
    for (const r of rules) { const hit = !q || r.dataset.text.includes(q); r.hidden = !hit; if (hit) shown++; }
    for (const g of groups) g.hidden = !g.querySelector('.rule:not([hidden])');
    document.getElementById('none').hidden = shown > 0;
  });
</script>
`;

await mkdir(dirname(out), { recursive: true });
await writeFile(out, html);
console.log(`wrote ${out}: ${count} rules`);
