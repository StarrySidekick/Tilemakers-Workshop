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
  const { pixelTile, pixelSky, paintCoasts, PX, drawPixelMeeple, pixelWhale, pixelWhaleShadow } = await import('/src/pixel.js');
  const { PLAYER_COLORS: PLAYERS } = await import('/src/theme.js');
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
    [6, 4, 'Kzq', 0], [5, 0, 'V', 0],
  ];
  const W = 9, H = 6, S = 2;                       // squares, and 2x pixels
  const board = document.createElement('canvas');
  board.width = W * PX * S; board.height = H * PX * S;
  const b = board.getContext('2d');
  b.imageSmoothingEnabled = false;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) b.drawImage(pixelSky(x, y), x * PX * S, y * PX * S, PX * S, PX * S);
  const at = new Map(plan.map(([x, y, id, r]) => [`${x},${y}`, { x, y, id, r }]));
  const island = (x, y) => x >= 6;                 // the right-hand group stands in for an island
  paintCoasts(b, [...at.values()], {
    rect: ({ x, y }) => [x * PX * S, y * PX * S, PX * S],
    has: (x, y) => at.has(`${x},${y}`),
    warm: ({ x, y }) => island(x, y),
  });
  for (const { x, y, id, r } of at.values()) b.drawImage(pixelTile(TILES[id], r), x * PX * S, y * PX * S, PX * S, PX * S);
  // The figures on top: followers of every colour standing, a farmer lying in
  // a field, one adrift in its broken ring, and the whale over its square.
  const T = PX * S;
  const people = [
    [1.5, 1.3, 0], [2.5, 0.55, 1], [0.35, 1.75, 2, { farmer: true }], [3.5, 1.8, 3],
    [6.5, 2.6, 4, { adrift: true }], [1.3, 3.55, 1, { farmer: true }],
  ];
  for (const [x, y, who, opts] of people) drawPixelMeeple(b, x * T, y * T, 0.42 * T, PLAYERS[who], opts || {});
  const whale = pixelWhale(0);
  b.globalAlpha = 0.22;
  const sh = pixelWhaleShadow();
  b.drawImage(sh, 2.5 * T - (sh.width / 2) * S, 2.5 * T + 10 * S, sh.width * S, sh.height * S);
  b.globalAlpha = 1;
  b.drawImage(whale, 2.5 * T - 32 * S, 2.5 * T - 28 * S, whale.width * S, whale.height * S);
  return { sheet: sheet.toDataURL(), board: board.toDataURL(), coverage };
}, only);

await writeFile(join(ROOT, 'tools/shots/pixel-sheet.png'), Buffer.from(out.sheet.split(',')[1], 'base64'));
await writeFile(join(ROOT, 'tools/shots/pixel-board.png'), Buffer.from(out.board.split(',')[1], 'base64'));
const cov = Object.entries(out.coverage);
console.log('ink coverage (style card median 17%):');
console.log(cov.map(([id, v]) => `${id} ${v}%`).join('  '));
await browser.close();
server.close();
