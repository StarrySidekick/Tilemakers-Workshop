// ---------------------------------------------------------------------------
// The pixel tiles, laid out to be looked at.
//
//   node tools/pixel.mjs              tools/shots/pixel-sheet.png and
//                                     tools/shots/pixel-board.png
//   node tools/pixel.mjs Kz           only the tiles whose id starts with Kz
//
// The loop is the one Composer's Key uses for its art (draw, look, measure,
// critique, fix): the sheet shows every Soffiando tile at 6x with all four
// turns at 1x underneath, and the same tile at PLAY SIZE, scaled with
// nearest neighbour the way the board scales it, because art that only reads
// at 6x ships as mush. The board shows them assembled on the sky with their
// coasts, because a tile that joins its neighbours has to be judged joined.
//
// Rendered in a real browser (same as tools/smoke.mjs), so it is exactly the
// art the game draws. Prints ink coverage per tile beside the style card's
// median (Timothy's line covers about a sixth of a tile).
// ---------------------------------------------------------------------------

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const only = process.argv[2] || '';

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = createServer(async (req, res) => {
  try {
    const path = normalize(decodeURIComponent(req.url.split('?')[0]));
    const body = await readFile(join(ROOT, path === '/' ? 'index.html' : path));
    res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404).end('nope'); }
});
const PORT = 5240;
await new Promise((r) => server.listen(PORT, r));
mkdirSync(join(ROOT, 'tools/shots'), { recursive: true });

const browser = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
await page.goto(`http://localhost:${PORT}/tools/seams.html`).catch(() => {});

const out = await page.evaluate(async (only) => {
  const { pixelTile, pixelSky, pixelCoast, COAST, PX } = await import('/src/pixel.js');
  const { TILES } = await import('/src/tiles.js');

  // Every tile Soffiando deals: the cloud set, and the base set after its swaps.
  const base = ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'X'];
  const cloud = Object.values(TILES).filter((t) => t.group === 'cloud').map((t) => t.id);
  const ids = [...cloud, ...base].filter((id) => TILES[id] && id.startsWith(only));

  // --- the sheet ---
  const Z = 6, PLAY = 64, COLS = 6;
  const cellW = PX * Z + 24, cellH = PX * Z + PX + 40;
  const sheet = document.createElement('canvas');
  sheet.width = COLS * cellW + 16;
  sheet.height = Math.ceil(ids.length / COLS) * cellH + 16;
  const c = sheet.getContext('2d');
  c.fillStyle = '#20202a'; c.fillRect(0, 0, sheet.width, sheet.height);
  c.imageSmoothingEnabled = false;
  const coverage = {};
  ids.forEach((id, i) => {
    const x = 16 + (i % COLS) * cellW, y = 16 + Math.floor(i / COLS) * cellH;
    const t = pixelTile(TILES[id], 0);
    c.drawImage(t, x, y, PX * Z, PX * Z);
    for (let r = 0; r < 4; r++) c.drawImage(pixelTile(TILES[id], r), x + r * (PX + 4), y + PX * Z + 6, PX, PX);
    c.drawImage(t, x + PX * Z - PLAY, y + PX * Z + 6, PLAY, PLAY);
    c.fillStyle = '#c8c8d8'; c.font = '13px monospace';
    c.fillText(`${id}  ${TILES[id].name}`, x, y + PX * Z + PX + 26);
    // Ink: every pixel that is not plain meadow, road bed or plaster.
    const d = t.getContext('2d').getImageData(0, 0, PX, PX).data;
    const plain = new Set(['196,231,176', '255,241,201', '246,218,234', '236,228,246']);
    let ink = 0;
    for (let k = 0; k < d.length; k += 4) if (!plain.has(`${d[k]},${d[k + 1]},${d[k + 2]}`)) ink++;
    coverage[id] = Math.round((100 * ink) / (PX * PX));
  });

  // --- a board: tiles on the sky, coasts on every edge that faces it ---
  const plan = [
    [0, 0, 'Kso', 2], [1, 0, 'E', 2], [2, 0, 'Kt', 0],
    [0, 1, 'Ksr', 0], [1, 1, 'Kpz', 0], [2, 1, 'Kzr', 0], [3, 1, 'U', 1], [4, 1, 'Kfl', 1],
    [1, 2, 'Kw', 0], [2, 2, 'Ktr', 0], [3, 2, 'Kg', 1],
    [1, 3, 'J', 2], [2, 3, 'R', 2],
    [6, 1, 'Kab', 0], [6, 2, 'Kzb', 0], [7, 2, 'Kgg', 3],
    [6, 4, 'Kzq', 0],
  ];
  const W = 9, H = 6, S = 2;                       // squares, and 2x pixels
  const board = document.createElement('canvas');
  board.width = W * PX * S; board.height = H * PX * S;
  const b = board.getContext('2d');
  b.imageSmoothingEnabled = false;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) b.drawImage(pixelSky(x, y), x * PX * S, y * PX * S, PX * S, PX * S);
  const at = new Map(plan.map(([x, y, id, r]) => [`${x},${y}`, { x, y, id, r }]));
  const island = (x, y) => x >= 6;                 // the right-hand group stands in for an island
  for (const { x, y } of at.values()) {
    const warm = island(x, y);
    const sx = x * PX * S, sy = y * PX * S, k = S;
    if (!at.has(`${x},${y - 1}`)) b.drawImage(pixelCoast({ warm }), sx, sy - COAST * k, PX * k, COAST * k);
    if (!at.has(`${x},${y + 1}`)) b.drawImage(pixelCoast({ below: true, warm }), sx, sy + PX * k, PX * k, COAST * k);
    for (const [dx, q] of [[1, 1], [-1, 3]]) {
      if (at.has(`${x + dx},${y}`)) continue;
      b.save();
      b.translate(sx + PX * k / 2, sy + PX * k / 2);
      b.rotate(q * Math.PI / 2);
      b.drawImage(pixelCoast({ warm }), -PX * k / 2, -PX * k / 2 - COAST * k, PX * k, COAST * k);
      b.restore();
    }
  }
  for (const { x, y, id, r } of at.values()) b.drawImage(pixelTile(TILES[id], r), x * PX * S, y * PX * S, PX * S, PX * S);
  return { sheet: sheet.toDataURL(), board: board.toDataURL(), coverage };
}, only);

await writeFile(join(ROOT, 'tools/shots/pixel-sheet.png'), Buffer.from(out.sheet.split(',')[1], 'base64'));
await writeFile(join(ROOT, 'tools/shots/pixel-board.png'), Buffer.from(out.board.split(',')[1], 'base64'));
const cov = Object.entries(out.coverage);
console.log('ink coverage (style card median 17%):');
console.log(cov.map(([id, v]) => `${id} ${v}%`).join('  '));
await browser.close();
server.close();
