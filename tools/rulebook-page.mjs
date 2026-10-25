// ---------------------------------------------------------------------------
// Soffiando's rulebook as a page to read, comment on and change, on a phone.
//
//   node tools/rulebook-page.mjs [out.html]     default tools/shots/soffiando-rules.html
//
// Built from src/modes/soffiando-rulebook.js and src/modes/soffiando-deck.js
// and nothing else, so the page says exactly what the rulebook says, the
// rulebook says exactly what tools/soffiando-rulebook.mjs proves on the
// engine, and the deck is the deck the game deals. Each tile's picture is the
// game's own pixel art, drawn in a headless browser (Playwright, as the smoke
// test uses; set CHROME_PATH if its browser is elsewhere).
//
// The page is published as Timothy's Artifact (CLAUDE.md, "Rules") with the
// `db` capability: what he comments, rewords, takes out, adds, and turns on or
// off in the deck is kept in its database at book/changes, which Claude reads
// when he says "apply the Soffiando Rulebook". Rebuild and republish to the
// same link whenever a rule or the deck changes. The page itself is
// tools/rulebook-template.html; this fills in its data.
// ---------------------------------------------------------------------------

import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, join, extname, normalize } from 'node:path';
import { chromium } from 'playwright';
import { RULEBOOK } from '../src/modes/soffiando-rulebook.js';
import { DECK_GROUPS, DECK_SIZE } from '../src/modes/soffiando-deck.js';
import { TILES } from '../src/tiles.js';

const ROOT = new URL('..', import.meta.url).pathname;
const out = process.argv[2] || join(ROOT, 'tools/shots/soffiando-rules.html');
const book = RULEBOOK.soffiando;

/** Every tile's picture as a PNG data URL, drawn by the game's own pixel.js. */
async function pictures(ids) {
  const TYPES = { '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png' };
  const server = createServer(async (req, res) => {
    const path = normalize(decodeURIComponent(req.url.split('?')[0]));
    if (path === '/') { res.writeHead(200, { 'content-type': 'text/html' }).end('<!doctype html><title>tiles</title>'); return; }
    try {
      const body = await readFile(join(ROOT, path));
      res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream' }).end(body);
    } catch { res.writeHead(404).end(); }
  });
  await new Promise((r) => server.listen(0, r));
  const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  try {
    const page = await browser.newPage();
    await page.goto(`http://localhost:${server.address().port}/`);
    return await page.evaluate(async (list) => {
      const { pixelTile } = await import('/src/pixel.js');
      const { TILES: T } = await import('/src/tiles.js');
      const pics = {};
      for (const id of list) {
        const cv = pixelTile(T[id], 0, 0);
        const c = document.createElement('canvas');
        c.width = cv.width; c.height = cv.height;
        c.getContext('2d').drawImage(cv, 0, 0);
        pics[id] = c.toDataURL('image/png');
      }
      return pics;
    }, ids);
  } finally {
    await browser.close();
    server.close();
  }
}

const ids = DECK_GROUPS.flatMap((g) => g.tiles.map(([id]) => id));
const pics = await pictures(ids);
const DATA = {
  today: new Date().toISOString().slice(0, 10),
  size: DECK_SIZE,
  book: { groups: book.groups, rules: book.rules, retired: book.retired },
  deck: DECK_GROUPS.map((g) => ({
    name: g.name, note: g.note,
    tiles: g.tiles.map(([id, n]) => ({ id, n, name: TILES[id].name, pic: pics[id] })),
  })),
};
const template = await readFile(join(ROOT, 'tools/rulebook-template.html'), 'utf8');
const html = template.replace('/*DATA*/', () => JSON.stringify(DATA).replace(/</g, '\\u003c'));
await mkdir(dirname(out), { recursive: true });
await writeFile(out, html);
console.log(`wrote ${out}: ${book.rules.length} rules, ${ids.length} kinds of tile, ${(html.length / 1024).toFixed(0)} KB`);
