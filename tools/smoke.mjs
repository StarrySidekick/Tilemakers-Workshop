// ---------------------------------------------------------------------------
// Browser smoke test.
//
//   node tools/smoke.mjs [--shots]
//
// The harness plays the rules headlessly; this checks the half that only
// exists in a browser — that every mode boots, renders a frame, builds its
// panel and its buttons, and survives a few clicks without throwing. Most of
// the bugs a mode ships with are in that seam, not in the rules.
//
// With --shots it also writes a PNG per mode to tools/shots/.
// ---------------------------------------------------------------------------

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const PORT = 5199;
const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
};

const server = createServer(async (req, res) => {
  try {
    const path = normalize(decodeURIComponent(req.url.split('?')[0]));
    const file = join(ROOT, path === '/' ? 'index.html' : path);
    const body = await readFile(file);          // read first: a 404 after
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(body);                              // writeHead(200) can't be sent
  } catch {
    res.writeHead(404).end('nope');
  }
});
await new Promise((r) => server.listen(PORT, r));

const shots = process.argv.includes('--shots');
if (shots) mkdirSync(join(ROOT, 'tools/shots'), { recursive: true });

// This environment ships a Chromium that may not match the pinned Playwright
// build, so point at it explicitly rather than downloading another one.
const browser = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
// The harness is a fresh browser, which would otherwise be greeted by the
// first-visit welcome card sitting over the board it is about to click on.
// It has read the instructions; mark it as a returning player.
await page.addInitScript(() => {
  try { localStorage.setItem('tilemakers-workshop/welcomed', '1'); } catch { /* fine */ }
});

const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(`http://localhost:${PORT}/index.html`);
await page.waitForFunction(() => window.LAB && window.LAB.game);

const modes = await page.evaluate(() => window.LAB.MODES.map((m) => ({ id: m.id, name: m.name })));
let failures = 0;

// The settings and the rules are folded away while you play (2026-10-27), so
// the first thing is to open them, as a player would, by their summary.
{
  const folded = await page.evaluate(() => ['settings', 'logFold', 'tileList'].every((id) => !document.getElementById(id).open)
    && !!document.getElementById('newGame').offsetParent);
  await page.click('#settings > summary');
  const open = await page.evaluate(() => document.getElementById('settings').open && !!document.getElementById('mode').offsetParent);
  if (!folded || !open) { failures++; console.log(`  ✗ the folds: ${!folded ? 'not folded away at first, or no New game outside them' : 'the summary did not open the settings'}`); }
  else console.log('  ✓ settings and rules folded away, New game outside, one click opens them');
}

// Everything below drives the game by hand, so the computer players have to be
// off or they'd be taking turns underneath the script.
await page.selectOption('#botCount', '0');

for (const mode of modes) {
  errors.length = 0;
  // Starà folds the workshop's panel away while it runs; its menu brings it back.
  if (await page.evaluate(() => document.body.classList.contains('stara') && !document.body.classList.contains('staraPanel'))) await page.click('#staraMenu');
  await page.selectOption('#mode', mode.id);
  await page.click('#newGame');
  await page.waitForTimeout(120);

  // Poke at it: a handful of legal moves driven through the same entry points
  // the mouse uses, so anything the UI layer touches gets touched.
  const state = await page.evaluate(async () => {
    const g = window.LAB.game;
    const rnd = (n) => Math.floor(Math.random() * n);
    for (let i = 0; i < 25 && g.phase !== 'over'; i++) {
      if (g.phase === 'market') { g.takeFromMarket(rnd(g.market.length)); continue; }
      if (g.phase === 'place') {
        // Through canPlaceAt, not board.legalPlacements: the river only accepts
        // one square and one rotation, and a mode may veto anything it likes.
        const spots = [];
        if (g.m.piece) spots.push(...g.board.legalPiecePlacements(g.m.piece));
        else {
          const saved = g.rot;
          for (const { x, y } of g.board.candidates(g.placeOpts())) {
            for (let r = 0; r < 4; r++) { g.rot = r; if (g.canPlaceAt(x, y)) spots.push({ x, y, rot: r }); }
          }
          g.rot = saved;
        }
        if (!spots.length) break;
        const s = spots[rnd(spots.length)];
        if (s.rot != null) for (let r = 0; r < s.rot; r++) g.rotate(1);
        g.cellClick(s.x, s.y);
        continue;
      }
      if (g.phase === 'meeple') { g.skipMeeple(); continue; }
      if (g.phase === 'story') { g.m.choose(rnd(3)); continue; }
      if (g.phase === 'boon') { g.m.chooseBoon(rnd(3)); continue; }
      if (g.phase === 'move') {
        const w = g.walker;
        const p = w.visiblePawns[0];
        if (p && w.select(p)) {
          const d = [...w.reachable(p).values()];
          if (d.length) { g.movePawn(d[0].x, d[0].y); continue; }
        }
        g.holdPosition();
        continue;
      }
      if (g.phase === 'lift') { const l = g.m.allLiftable(); if (l.length) g.m.onCellClick(l[0].x, l[0].y); else g.m.cancelLift(); continue; }
      if (g.phase === 'interior-place') {
        const inv = g.interior;
        const s = inv.board.legalPlacements(inv.tile)[0];
        if (s) { for (let r = 0; r < s.rot; r++) inv.rotate(1); g.interiorPlaceAt(s.x, s.y); } else g.interiorHold();
        continue;
      }
      if (g.phase === 'interior-move') { g.interiorHold(); continue; }
      break;
    }
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return {
      phase: g.phase,
      tiles: g.board.size,
      panel: document.getElementById('scores').innerHTML.length,
      buttons: document.querySelectorAll('#actions button').length,
      hint: document.getElementById('modeHint').textContent.length,
    };
  });

  if (shots) await page.screenshot({ path: join(ROOT, `tools/shots/${mode.id}.png`) });

  const problems = [];
  if (errors.length) problems.push(errors[0].split('\n')[0]);
  if (state.tiles < 2) problems.push(`only ${state.tiles} tiles placed`);
  if (state.panel < 20) problems.push('panel is empty');
  if (!state.hint) problems.push('no mode hint');

  if (problems.length) {
    failures++;
    console.log(`  ✗ ${mode.id.padEnd(12)} ${problems.join(' · ')}`);
  } else {
    console.log(`  ✓ ${mode.id.padEnd(12)} ${String(state.tiles).padStart(3)} tiles · ${state.buttons} buttons · phase "${state.phase}"`);
  }
}

// The build stamp, which exists to answer "is this the version I just pushed"
// — so the thing worth checking is that it says something, and that it agrees
// with the copy the server hands out uncached.
{
  errors.length = 0;
  const v = await page.evaluate(async () => {
    const live = await (await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' })).json();
    return {
      badge: document.getElementById('version').textContent.trim(),
      stale: document.getElementById('version').classList.contains('stale'),
      built: window.LAB.VERSION,
      live,
    };
  });
  const problems = [];
  if (errors.length) problems.push(errors[0].split('\n')[0]);
  if (!/^v\d+\.\d+\.\d+ · b\d+$/.test(v.badge)) problems.push(`badge reads "${v.badge}"`);
  if (v.stale) problems.push('the page thinks it is stale against its own server');
  if (v.built.build !== v.live.build || v.built.version !== v.live.version) {
    problems.push(`src/version.js (b${v.built.build}) and version.json (b${v.live.build}) disagree — re-run tools/stamp.mjs`);
  }
  if (problems.length) { failures++; console.log(`  ✗ build stamp: ${problems.join(' · ')}`); }
  else console.log(`  ✓ build stamp       ${v.badge}`);
}

// Safari treats a second tap inside ~300ms as zoom-in, which made turning a
// tile twice in a hurry scale the whole app. `touch-action: manipulation` is
// the fix, and it has to stay off the elements that run their own gestures.
{
  const touch = await page.evaluate(() => {
    const of = (sel) => getComputedStyle(document.querySelector(sel)).touchAction;
    const btn = [...document.querySelectorAll('#actions button, #panel button')][0];
    return {
      button: btn ? getComputedStyle(btn).touchAction : null,
      body: of('body'),
      board: of('#board'),
      hudTile: of('#hudTile'),
      claimTile: of('#claimTile'),
    };
  });
  const problems = [];
  if (touch.button !== 'manipulation') problems.push(`buttons are "${touch.button}"`);
  if (touch.body !== 'manipulation') problems.push(`body is "${touch.body}"`);
  for (const own of ['board', 'hudTile', 'claimTile']) {
    if (touch[own] !== 'none') problems.push(`${own} lost its own gestures ("${touch[own]}")`);
  }
  if (problems.length) { failures++; console.log(`  ✗ double-tap zoom: ${problems.join(' · ')}`); }
  else console.log('  ✓ double-tap zoom    buttons "manipulation" · board keeps "none"');
}

// The input layer itself, through real pointer events rather than by calling
// the game — everything else in this file drives the rules directly, so a tap
// that stopped placing tiles would sail straight past it. Two passes: once with
// the confirm step off, where a tap plays at once and the interesting
// assertions are the negative ones (a drag and a pinch must NOT leave a tile
// behind), and once with it on, where it takes two taps — stage, then commit.
{
  errors.length = 0;
  await page.selectOption('#mode', 'classic');
  await page.selectOption('#botCount', '0');
  await page.click('#newGame');
  const t = await page.evaluate(() => {
    const cv = document.getElementById('board');
    const r = cv.getBoundingClientRect();
    const ev = (type, id, x, y) => cv.dispatchEvent(new PointerEvent(type, {
      pointerId: id, clientX: r.left + x, clientY: r.top + y, pointerType: 'touch', isPrimary: id === 1,
    }));
    const { renderer, game } = window.LAB;
    const out = {};
    document.getElementById('confirmPlace').checked = false;

    // A drag: the camera moves, nothing is played.
    const laid = game.board.size;
    const cam = renderer.cam.x;
    ev('pointerdown', 1, 300, 300);
    for (let i = 1; i <= 6; i++) ev('pointermove', 1, 300 - i * 12, 300);
    ev('pointerup', 1, 228, 300);
    out.panned = Math.abs(renderer.cam.x - cam) > 0.2;
    out.dragLaid = game.board.size - laid;

    // Two fingers: spread, then pinch.
    const gesture = (from, to) => {
      ev('pointerdown', 1, 400, 400);
      ev('pointerdown', 2, 400 + from, 400);
      for (let i = 1; i <= 10; i++) ev('pointermove', 2, 400 + from + (to - from) * i / 10, 400);
      ev('pointerup', 2, 400 + to, 400);
      ev('pointerup', 1, 400, 400);
      return renderer.cam.zoom;
    };
    out.start = renderer.cam.zoom;
    out.spread = gesture(100, 200);
    out.pinched = gesture(400, 100);
    out.pinchLaid = game.board.size - laid;

    // A tap on a legal square, confirm step off: it plays there and then.
    const spot = game.board.legalPlacements(game.tile, game.placeOpts())[0];
    const [tx, ty] = renderer.toScreen(spot.x + 0.5, spot.y + 0.5);
    const before = game.board.size;
    game.rot = spot.rot;
    ev('pointerdown', 1, tx, ty);
    ev('pointerup', 1, tx, ty);
    out.tapped = game.board.size - before;
    return out;
  });

  // The same tap with the confirm step on. The first tap STAGES; every tap
  // after that only TURNS the staged tile, however many times you do it; and
  // the tile reaches the board when the checkmark in the confirm panel is
  // pressed and not before. The old behaviour — a second tap commits — meant
  // the gesture for "let me see it the other way round" was also the gesture
  // that ended the decision.
  await page.click('#newGame');
  const c = await page.evaluate(() => {
    const cv = document.getElementById('board');
    const r = cv.getBoundingClientRect();
    const ev = (type, x, y) => cv.dispatchEvent(new PointerEvent(type, {
      pointerId: 1, clientX: r.left + x, clientY: r.top + y, pointerType: 'touch', isPrimary: true,
    }));
    const { renderer, game } = window.LAB;
    const out = {};
    document.getElementById('confirmPlace').checked = true;
    // A tile with more than one legal rotation, so "tap turns it" has
    // something to show; otherwise the turn is a no-op and proves nothing.
    let spot = null;
    for (let n = 0; n < 40 && !spot; n++) {
      const places = game.board.legalPlacements(game.tile, game.placeOpts());
      const first = places[0];
      const ways = first
        ? places.filter((p) => p.x === first.x && p.y === first.y).length : 0;
      if (ways > 1) spot = first;
      else { game.deck.push(game.deck.shift()); game.drawTile(); }
    }
    if (!spot) return { skip: true };
    const [tx, ty] = renderer.toScreen(spot.x + 0.5, spot.y + 0.5);
    const before = game.board.size;
    ev('pointerdown', tx, ty); ev('pointerup', tx, ty);
    out.staged = !!renderer.pending;
    out.rots = renderer.pending ? renderer.pending.rots.length : 0;
    out.stagedLaid = game.board.size - before;

    // The confirm panel is up, in the claim box's place, with a checkmark.
    out.panelUp = !document.getElementById('claim').hidden;
    out.hasCheck = !!document.querySelector('#claimActions button.check');

    // A second and third tap only turn it.
    const wasRot = renderer.pending.rot;
    ev('pointerdown', tx, ty); ev('pointerup', tx, ty);
    out.turned = renderer.pending && renderer.pending.rot !== wasRot;
    out.stillStaged = !!renderer.pending;
    out.tapLaid = game.board.size - before;

    // …and the checkmark is what puts it down.
    document.querySelector('#claimActions button.check').click();
    out.committed = game.board.size - before;
    out.cleared = !renderer.pending;
    return out;
  });

  const problems = [];
  if (errors.length) problems.push(errors[0].split('\n')[0]);
  if (t.tapped !== 1) problems.push('a tap did not place a tile');
  if (!t.panned) problems.push('a drag did not pan');
  if (t.dragLaid) problems.push('a drag placed a tile');
  if (!(t.spread > t.start * 1.5)) problems.push(`spreading gave ${t.spread.toFixed(0)} from ${t.start.toFixed(0)}`);
  if (!(t.pinched < t.spread * 0.6)) problems.push(`pinching gave ${t.pinched.toFixed(0)} from ${t.spread.toFixed(0)}`);
  if (t.pinchLaid) problems.push('a pinch placed a tile');
  if (c.skip) problems.push('no tile with two legal rotations to test with');
  if (!c.staged) problems.push('a tap did not stage a tile for confirming');
  if (c.stagedLaid) problems.push('staging a tile put it straight on the board');
  if (!c.rots) problems.push('a staged tile offered no rotations');
  if (!c.panelUp) problems.push('the confirm panel did not come up');
  if (!c.hasCheck) problems.push('the confirm panel had no checkmark');
  if (!c.turned) problems.push('a second tap did not turn the staged tile');
  if (!c.stillStaged) problems.push('a second tap unstaged the tile');
  if (c.tapLaid) problems.push('a second tap put the tile on the board');
  if (c.committed !== 1) problems.push('the checkmark did not place the staged tile');
  if (!c.cleared) problems.push('committing left the tile staged');
  if (problems.length) { failures++; console.log(`  ✗ touch input: ${problems.join(' · ')}`); }
  else console.log(`  ✓ touch input       tap places · drag pans · pinch ${t.start.toFixed(0)} → ${t.spread.toFixed(0)} → ${t.pinched.toFixed(0)} · tap turns, ✓ commits`);
}

// Score effects: a closure has to put a number on the board and a flash on the
// tiles that paid, and the panel has to bump the row that changed.
{
  errors.length = 0;
  await page.click('#newGame');
  const fx = await page.evaluate(async () => {
    const g = window.LAB.game;
    for (let i = 0; i < 60 && g.phase !== 'over'; i++) {
      if (g.phase === 'place') {
        const s = g.board.legalPlacements(g.tile, g.placeOpts())[0];
        if (!s) break;
        g.rot = s.rot;
        g.cellClick(s.x, s.y);
      } else if (g.phase === 'meeple') {
        const o = g.meepleOptions();
        if (o.length) g.placeMeeple(o[0].i, o[0]); else g.skipMeeple();
      } else break;
      if (window.LAB.fx.items.some((e) => e.kind === 'float')) break;
    }
    // The panel repaints on the render loop, so the bump only exists after a
    // frame has gone by.
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return {
      kinds: [...new Set(window.LAB.fx.items.map((e) => e.kind))],
      bumped: document.querySelectorAll('#scores .pscore.bump').length,
      scored: g.players.some((p) => p.score > 0),
    };
  });
  const problems = [];
  if (errors.length) problems.push(errors[0].split('\n')[0]);
  if (!fx.scored) problems.push('nothing scored in 60 moves');
  else {
    if (!fx.kinds.includes('float')) problems.push(`no floating score (${fx.kinds.join(', ') || 'nothing'})`);
    if (!fx.kinds.includes('flash')) problems.push('no feature flash');
    if (!fx.bumped) problems.push('no panel bump');
  }
  if (!fx.kinds.includes('tile')) problems.push('no tile flying in');
  if (!fx.kinds.includes('figure')) problems.push('no follower in flight');
  if (problems.length) { failures++; console.log(`  ✗ score effects: ${problems.join(' · ')}`); }
  else console.log(`  ✓ score effects     ${fx.kinds.join(', ')} · ${fx.bumped} row bumped`);
}

/**
 * Tick a rule in the workshop. Every layer is folded away by default and the
 * search box is the fastest way to a specific row, so this types the rule's
 * name in rather than hunting through <details> for it.
 *
 * A rule whose prerequisites aren't met is deliberately disabled by the panel —
 * you can't have a garden with no abbot — so switching one on means switching
 * on what it stands upon first. Turning off unwinds in the same order.
 */
async function setMech(page, id, on) {
  const needs = await page.evaluate(
    (m) => (window.LAB.MECHANICS.find((x) => x.id === m)?.needs || []).filter(
      (n) => !window.LAB.MECHANICS.find((x) => x.id === n)?.on,
    ),
    id,
  );
  if (on) for (const n of needs) await setMech(page, n, true);

  await page.fill('#mechSearch', id);
  await page.waitForTimeout(30);
  const box = `#mechanics input[data-mech="${id}"]`;
  await page.waitForSelector(box, { state: 'attached' });
  if (on) await page.check(box); else await page.uncheck(box);
  await page.fill('#mechSearch', '');
  await page.waitForTimeout(30);

  // Switching a prerequisite off already cascades its dependants off in the
  // panel, so unwinding only has to deal with what's left.
  if (!on) for (const n of needs) await setMech(page, n, false);
}

// The rest of the motion, one mode each, because each one is the only place
// its effect can happen: tiles blowing off the cloud, tiles going under the
// water, a region lighting up as it's counted, and the endgame paying out one
// feature at a time instead of all at once.
for (const [what, mode, mech, kind] of [
  ['drown', 'classic', 'tide', 'fall'],
  ['levy sweep', 'marches', null, 'sweep'],
]) {
  errors.length = 0;
  await page.selectOption('#mode', mode);
  if (mech) await setMech(page, mech, true);
  await page.click('#newGame');
  const got = await page.evaluate(async ([kind]) => {
    const g = window.LAB.game;
    const legal = () => {
      const out = [];
      const saved = g.rot;
      for (const { x, y } of g.board.candidates(g.placeOpts())) {
        for (let r = 0; r < 4; r++) { g.rot = r; if (g.canPlaceAt(x, y)) out.push({ x, y, rot: r }); }
      }
      g.rot = saved;
      return out;
    };
    for (let i = 0; i < 120 && g.phase !== 'over'; i++) {
      if (g.phase === 'market') g.takeFromMarket(0);
      else if (g.phase === 'place') {
        const s = legal()[0];
        if (!s) break;
        g.rot = s.rot;
        g.cellClick(s.x, s.y);
      } else if (g.phase === 'meeple') g.skipMeeple();
      else if (g.phase === 'move') {
        const w = g.walker;
        const p = w.visiblePawns.find((q) => w.select(q));
        const d = p ? [...w.reachable(p).values()] : [];
        if (p && d.length) { g.selectPawn(p); g.movePawn(d[0].x, d[0].y); } else g.holdPosition();
      } else break;
      if (window.LAB.fx.items.some((e) => e.kind === kind)) return true;
      await new Promise((r) => requestAnimationFrame(r));
    }
    return false;
  }, [kind]);
  if (mech) await setMech(page, mech, false);
  if (errors.length || !got) {
    failures++;
    console.log(`  ✗ ${what}: ${errors[0]?.split('\n')[0] || `no "${kind}" effect in ${mode}`}`);
  } else console.log(`  ✓ ${what.padEnd(17)} ${mode}`);
}

// Soffiando's wind, which is the one effect driven by the rules rather than by
// a score: a blow has to actually shove the board, and the tiles it shoved
// have to be drawn sliding rather than teleporting.
{
  errors.length = 0;
  await page.selectOption('#mode', 'soffiando');
  await page.click('#newGame');
  const wind = await page.evaluate(async () => {
    const g = window.LAB.game;
    // A gust that FIRES a tile out of the world did something, and did it
    // visibly — the tumble is drawn the same way the slide is. Counting only
    // `moves` made this a test of whether the wind happened to have somewhere
    // to push, which is luck rather than a rule.
    let gusts = 0, moved = 0;
    g.on((kind, data) => {
      if (kind !== 'gust') return;
      gusts++;
      moved += data.moves.length + (data.fell?.length || 0);
    });
    const legal = () => {
      const out = [];
      const saved = g.rot;
      for (const { x, y } of g.board.candidates(g.placeOpts())) {
        for (let r = 0; r < 4; r++) { g.rot = r; if (g.canPlaceAt(x, y)) out.push({ x, y, rot: r }); }
      }
      g.rot = saved;
      return out;
    };
    const seen = {};
    let steps = 0;
    for (; steps < 400 && g.phase !== 'over'; steps++) {
      seen[g.phase] = (seen[g.phase] || 0) + 1;
      if (g.phase === 'market') {
        // Take a zephyr the moment one is in hand, so this doesn't rely on luck.
        const z = g.market.findIndex((id) => id.startsWith('Kz'));
        g.takeFromMarket(z >= 0 ? z : 0);
      } else if (g.phase === 'place') {
        const s = legal()[0];
        if (!s) break;
        g.rot = s.rot;
        g.cellClick(s.x, s.y);
      } else if (g.phase === 'meeple') {
        const o = g.meepleOptions();
        if (o.length) g.placeMeeple(o[0].i, o[0]); else g.skipMeeple();
      } else if (g.phase === 'lift') {
        g.m.cancelLift();
      } else if (g.phase === 'blow') {
        // Every turn ends with a blow: against a tile it can move, if any.
        // Only from open sky (no cutting): each way has its own targets.
        let at = null;
        for (let d = 0; d < 4 && !at; d++) {
          const t = g.m.blowTargets(d).find((q) => g.m.trainAt(q.x, q.y, d) && !g.m.trainAt(q.x, q.y, d).heavy);
          if (t) at = { ...t, d };
        }
        for (let d = 0; d < 4 && !at; d++) if (g.m.blowTargets(d).length) at = { ...g.m.blowTargets(d)[0], d };
        g.m.blowDir = at.d;
        g.cellClick(at.x, at.y);
      } else if (g.phase === 'astray') {
        const t = g.m.astrayAt.targets[0];
        g.cellClick(t.x, t.y);
      } else break;
      if (gusts && moved) break;
      // Let the render loop breathe now and then — the effects are made
      // synchronously, so this is for the picture, not for the test.
      if (steps % 16 === 15) await new Promise((r) => requestAnimationFrame(r));
    }
    return { mode: g.mode, gusts, moved, steps, seen, phase: g.phase };
  });
  const problems = [];
  if (errors.length) problems.push(errors[0].split('\n')[0]);
  if (wind.mode !== 'soffiando') problems.push(`the mode was ${wind.mode}`);
  else if (!wind.gusts) {
    problems.push(`no zephyr in ${wind.steps} steps (${JSON.stringify(wind.seen)}, ended in "${wind.phase}")`);
  } else if (!wind.moved) problems.push('the wind did nothing at all');
  if (problems.length) { failures++; console.log(`  ✗ soffiando wind: ${problems.join(' · ')}`); }
  else console.log(`  ✓ soffiando wind      ${wind.gusts} gust(s), ${wind.moved} tiles moved or lost`);
}

// Soffiando's blow, by hand (2026-10-27): every turn ends with it. Skip the
// claim, and the turn waits for the blow; R turns the zephyr; a click on a
// tile blows, what moves on is settled, and the turn passes.
{
  errors.length = 0;
  await page.selectOption('#mode', 'soffiando');
  await page.click('#newGame');
  await page.evaluate(() => {
    const g = window.LAB.game;
    for (const { x, y } of g.board.candidates(g.placeOpts())) {
      for (let r = 0; r < 4; r++) { g.rot = r; if (g.canPlaceAt(x, y)) { g.cellClick(x, y); return; } }
    }
  });
  const problems = [];
  await page.waitForTimeout(200);
  if (await page.evaluate(() => window.LAB.game.phase === 'meeple')) await page.keyboard.press('Space');
  const was = await page.evaluate(() => ({ phase: window.LAB.game.phase, dir: window.LAB.game.m.blowDir, current: window.LAB.game.current }));
  if (was.phase !== 'blow') problems.push(`after the claim, the phase was "${was.phase}", not the blow`);
  else {
    await page.keyboard.press('r');
    const turned = await page.evaluate(() => window.LAB.game.m.blowDir);
    if (turned === was.dir) problems.push('R did not turn the zephyr');
    // A tile it can move this way, clicked on the canvas.
    const t = await page.evaluate(() => {
      const g = window.LAB.game, r = window.LAB.renderer;
      let q = null;
      for (let i = 0; i < 4 && !q; i++) {
        q = g.m.blowTargets().find((t) => g.m.trainAt(t.x, t.y) && !g.m.trainAt(t.x, t.y).heavy) || null;
        if (!q) g.rotate(1);
      }
      q = q || g.m.blowTargets()[0];
      const [sx, sy] = r.toScreen(q.x + 0.5, q.y + 0.5);
      const rect = r.canvas.getBoundingClientRect();
      return { q, x: rect.left + sx, y: rect.top + sy, blows: g.m.blows };
    });
    await page.mouse.click(t.x, t.y);
    for (let i = 0; i < 6; i++) {
      const loose = await page.evaluate(() => {
        const g = window.LAB.game, r = window.LAB.renderer;
        if (g.phase !== 'astray') return null;
        const q = g.m.astrayAt.targets[0];
        const [sx, sy] = r.toScreen(q.x + 0.5, q.y + 0.5);
        const rect = r.canvas.getBoundingClientRect();
        return { x: rect.left + sx, y: rect.top + sy };
      });
      if (!loose) break;
      await page.mouse.click(loose.x, loose.y);
    }
    const after = await page.evaluate(() => ({ blows: window.LAB.game.m.blows, current: window.LAB.game.current, phase: window.LAB.game.phase }));
    if (after.blows !== t.blows + 1) problems.push('the click did not blow');
    if (after.current === was.current) problems.push(`the turn did not pass (phase "${after.phase}")`);
    // The tile list counts what is still to come.
    await page.click('#tileList > summary');
    await page.waitForTimeout(150);
    const list = await page.evaluate(() => {
      const g = window.LAB.game;
      const cells = [...document.querySelectorAll('#tileGrid .t')];
      const shown = cells.reduce((n, c) => n + Number(c.querySelector('b').textContent), 0);
      return { cells: cells.length, shown, deck: g.deck.length };
    });
    if (!list.cells || list.shown !== list.deck) problems.push(`the tile list shows ${list.shown} to come, the deck has ${list.deck}`);
    await page.click('#tileList > summary');
  }
  if (errors.length) problems.push(errors[0].split('\n')[0]);
  if (problems.length) { failures++; console.log(`  ✗ soffiando blow: ${problems.join(' · ')}`); }
  else console.log('  ✓ soffiando blow      held for, turned, blown, what moved on settled, the tile list counting');
}

// Soffiando's two faces (2026-10-27): every tile has a back, shown small
// under the hand; a tap on it, or F, turns the tile over, and the tile list
// draws both faces of each.
{
  errors.length = 0;
  await page.selectOption('#mode', 'soffiando');
  await page.click('#newGame');
  await page.waitForTimeout(150);
  // A tile both faces of which fit beside the Plaza: a straight road, and
  // the same road with a zephyr across it.
  await page.evaluate(() => { const g = window.LAB.game; g.deck.push(g.tileKey); g.deck.push('U|Kzr'); g.tile = null; g.drawTile(); });
  await page.waitForTimeout(150);
  const problems = [];
  const hand = () => page.evaluate(() => ({ id: window.LAB.game.tile?.id, key: window.LAB.game.tileKey, back: !document.getElementById('previewBack').hidden, name: document.getElementById('tileName').textContent }));
  const before = await hand();
  if (!before.key?.includes('|')) problems.push(`the tile in hand is not two-faced (${before.key})`);
  if (!before.back) problems.push('the back face is not shown');
  if (!/on the back/.test(before.name)) problems.push(`the hand does not name its back (${before.name})`);
  if (before.back) {
    await page.click('#previewBack');
    const flipped = await hand();
    if (flipped.id === before.id || flipped.key !== before.key) problems.push(`a tap on the back did not turn it over (${before.id} -> ${flipped.id})`);
    await page.keyboard.press('f');
    const again = await hand();
    if (again.id !== before.id) problems.push(`F did not turn it back (${again.id})`);
  }
  const laid = await page.evaluate(() => {
    const g = window.LAB.game;
    const key = g.tileKey;
    for (const { x, y } of g.board.candidates(g.placeOpts())) {
      for (let r = 0; r < 4; r++) { g.rot = r; if (g.canPlaceAt(x, y)) { g.cellClick(x, y); return { key, cell: g.board.get(x, y)?.key }; } }
    }
    return { key, cell: null };
  });
  if (laid.cell !== laid.key) problems.push(`the tile laid does not keep its two faces (${laid.cell} for ${laid.key})`);
  await page.click('#tileList > summary');
  await page.waitForTimeout(150);
  const pairs = await page.evaluate(() => [...document.querySelectorAll('#tileGrid .t')].map((c) => c.querySelectorAll('canvas').length));
  if (!pairs.length || pairs.some((n) => n !== 2)) problems.push(`the tile list does not draw both faces (${pairs.join(',')})`);
  await page.click('#tileList > summary');
  if (errors.length) problems.push(errors[0].split('\n')[0]);
  if (problems.length) { failures++; console.log(`  ✗ soffiando faces: ${problems.join(' · ')}`); }
  else console.log('  ✓ soffiando faces     the back shown, turned over by a tap and by F, laid two-faced, listed both ways');
}

// A flying machine's flight onto an empty Abbazia (2026-10-28), clicked on
// the board while the claim panel aims at the machine's own tile: the board
// has to keep showing the targets anywhere else (it hid them all until then).
{
  errors.length = 0;
  await page.selectOption('#mode', 'soffiando');
  await page.click('#newGame');
  await page.waitForTimeout(200);
  await page.evaluate(async () => {
    const g = window.LAB.game;
    const { TILES } = await import('/src/tiles.js');
    for (const c of [...g.board.cells.values()]) g.board.remove(c.x, c.y);
    for (const x of [-1, -2, -3]) g.board.place(x, 0, TILES.B, 0);
    const fl = g.board.place(0, 0, TILES.Kfl, 0);
    g.board.place(0, -1, TILES.U, 0); g.board.place(0, -2, TILES.Kab, 0);
    g.board.rebuild();
    g.current = 0; g.tile = null;
    g.m.flight = g.m.flightPath(fl);
    g.lastPlaced = fl; g.phase = 'meeple';
    window.LAB.renderer.glideTo?.(0, -1);
  });
  await page.waitForTimeout(800);
  const problems = [];
  const t = await page.evaluate(() => {
    const r = window.LAB.renderer;
    const s = r.meepleSpots.find((q) => q.x === 0 && q.y === -2);
    if (!s) return null;
    const rect = r.canvas.getBoundingClientRect();
    return { x: rect.left + s.sx, y: rect.top + s.sy };
  });
  if (!t) problems.push('no target on the Abbazia along the flight');
  else {
    await page.mouse.click(t.x, t.y);
    await page.waitForTimeout(200);
    const held = await page.evaluate(() => window.LAB.game.board.get(0, -2)?.meeple?.player);
    if (held !== 0) problems.push('the click did not put a follower on the Abbazia');
  }
  if (errors.length) problems.push(errors[0].split('\n')[0]);
  if (problems.length) { failures++; console.log(`  ✗ soffiando abbazia: ${problems.join(' · ')}`); }
  else console.log('  ✓ soffiando abbazia   a flight lands a follower on an empty Abbazia, by a click on the board');
}

// Moving a follower instead of claiming (2026-10-28), played as a person
// does: the button, a click on the follower, a click on where it goes.
{
  errors.length = 0;
  await page.selectOption('#mode', 'soffiando');
  await page.click('#newGame');
  await page.waitForTimeout(200);
  await page.evaluate(async () => {
    const g = window.LAB.game;
    const { TILES } = await import('/src/tiles.js');
    for (const c of [...g.board.cells.values()]) g.board.remove(c.x, c.y);
    g.board.place(0, 0, TILES.DEg, 2); g.board.place(0, 1, TILES.DEr, 0);   // a closed city
    g.board.place(-1, 0, TILES.Kt, 0);                                    // a temple beside it, past a wall
    g.board.place(0, -1, TILES.U, 0);                                     // a road into its north wall: a gate
    const laid = g.board.place(3, 3, TILES.B, 0);
    g.board.rebuild();
    g.current = 0; g.tile = null;
    g.board.addMeeple(0, 0, 0, 0); g.players[0].meeples--;
    g.lastPlaced = laid; g.phase = 'meeple';
    window.LAB.renderer.glideTo?.(0, 0);
  });
  await page.waitForTimeout(800);
  const problems = [];
  const btn = page.locator('#actions button', { hasText: 'Move a follower' });
  if (!(await btn.count())) problems.push('no Move a follower button in the follower step');
  else {
    await btn.first().click();
    await page.waitForTimeout(150);
    const cell = await page.evaluate(() => {
      const r = window.LAB.renderer;
      const [sx, sy] = r.toScreen(0.5, 0.5);
      const rect = r.canvas.getBoundingClientRect();
      return { phase: window.LAB.game.phase, x: rect.left + sx, y: rect.top + sy };
    });
    if (cell.phase !== 'stride') problems.push(`the button did not start a move (phase "${cell.phase}")`);
    await page.mouse.click(cell.x, cell.y);
    await page.waitForTimeout(300);
    const t = await page.evaluate(() => {
      const r = window.LAB.renderer;
      if (r.meepleSpots.some((q) => q.x === -1 && q.y === 0)) return 'wall';
      const s = r.meepleSpots.find((q) => q.x === 0 && q.y === -1 && q.type === 'road');
      if (!s) return null;
      const rect = r.canvas.getBoundingClientRect();
      return { x: rect.left + s.sx, y: rect.top + s.sy };
    });
    if (t === 'wall') problems.push('a target through a wall no road meets');
    else if (!t) problems.push('no target on the road through the gate');
    else {
      await page.mouse.click(t.x, t.y);
      await page.waitForTimeout(200);
      const after = await page.evaluate(() => {
        const g = window.LAB.game;
        return { there: g.board.get(0, -1)?.meeple?.player, left: !g.board.get(0, 0)?.meeple, phase: g.phase, supply: g.players[0].meeples };
      });
      if (after.there !== 0 || !after.left) problems.push('the follower did not move');
      if (after.supply !== 7) problems.push(`the move spent a follower (${after.supply} in hand)`);
      if (after.phase !== 'blow') problems.push(`no blow after the move (phase "${after.phase}")`);
    }
  }
  if (errors.length) problems.push(errors[0].split('\n')[0]);
  if (problems.length) { failures++; console.log(`  ✗ soffiando move: ${problems.join(' · ')}`); }
  else console.log('  ✓ soffiando move      a follower walked out of a closed city through its gate, by the button and two clicks, then the blow');
}

// A keep built up and the Calcolo set down (2026-10-28), by the buttons and
// clicks on the board, the stone on a square of open sky.
{
  errors.length = 0;
  await page.selectOption('#mode', 'soffiando');
  await page.click('#newGame');
  await page.waitForTimeout(200);
  await page.evaluate(async () => {
    const g = window.LAB.game;
    const { TILES } = await import('/src/tiles.js');
    for (const c of [...g.board.cells.values()]) g.board.remove(c.x, c.y);
    g.board.place(0, 0, TILES.DEk, 2); g.board.place(0, 1, TILES.DEr, 0);   // a keep in a closed city
    const laid = g.board.place(3, 3, TILES.B, 0);
    g.board.rebuild();
    g.current = 0; g.tile = null;
    g.lastPlaced = laid; g.phase = 'meeple';
    window.LAB.renderer.glideTo?.(1, 1);
  });
  await page.waitForTimeout(800);
  const problems = [];
  const at = (x, y) => page.evaluate(([x, y]) => {
    const r = window.LAB.renderer;
    const [sx, sy] = r.toScreen(x + 0.5, y + 0.5);
    const rect = r.canvas.getBoundingClientRect();
    return { x: rect.left + sx, y: rect.top + sy };
  }, [x, y]);
  const keepBtn = page.locator('#actions button', { hasText: 'keep' });
  if (!(await keepBtn.count())) problems.push('no keep button in the follower step');
  else {
    await keepBtn.first().click();
    const k = await at(0, 0);
    await page.mouse.click(k.x, k.y);
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => ({ keep: window.LAB.game.board.get(0, 0).keep, phase: window.LAB.game.phase, left: window.LAB.game.players[0].keeps }));
    if (after.keep !== 1 || after.left !== 3) problems.push(`the click did not build the keep (${JSON.stringify(after)})`);
    if (after.phase !== 'blow') problems.push(`no blow after the keep (phase "${after.phase}")`);
    const stoneBtn = page.locator('#actions button', { hasText: 'Calcolo' });
    if (!(await stoneBtn.count())) problems.push('no Calcolo button at the blow');
    else {
      await stoneBtn.first().click();
      const c = await at(-2, 3);
      await page.mouse.click(c.x, c.y);
      await page.waitForTimeout(200);
      const st = await page.evaluate(() => ({ stone: window.LAB.game.m.calcolo, current: window.LAB.game.current }));
      if (st.stone?.x !== -2 || st.stone?.y !== 3) problems.push(`the click did not set the Calcolo down (${JSON.stringify(st.stone)})`);
      if (st.current !== 1) problems.push('the turn did not pass');
    }
  }
  if (errors.length) problems.push(errors[0].split('\n')[0]);
  if (problems.length) { failures++; console.log(`  ✗ soffiando keep, Calcolo: ${problems.join(' · ')}`); }
  else console.log('  ✓ soffiando keep, Calcolo   a keep built up and the stone set down on open sky, by buttons and clicks');
}

// The endgame tally: many features settle in one frame, and they have to be
// shown one at a time or the result is a number changing.
{
  errors.length = 0;
  await page.selectOption('#mode', 'classic');
  await page.click('#newGame');
  const tally = await page.evaluate(() => {
    const g = window.LAB.game;
    for (let i = 0; i < 900 && g.phase !== 'over'; i++) {
      if (g.phase === 'place') {
        const s = g.board.legalPlacements(g.tile, g.placeOpts())[0];
        if (!s) { g.finish(); break; }
        g.rot = s.rot;
        g.cellClick(s.x, s.y);
      } else if (g.phase === 'meeple') {
        const o = g.meepleOptions();
        if (o.length) g.placeMeeple(o[0].i, o[0]); else g.skipMeeple();
      } else break;
    }
    const born = window.LAB.fx.items.filter((e) => e.kind === 'float').map((e) => e.born);
    return { over: g.phase === 'over', n: born.length, spread: born.length ? Math.max(...born) - Math.min(...born) : 0 };
  });
  const problems = [];
  if (errors.length) problems.push(errors[0].split('\n')[0]);
  if (!tally.over) problems.push('the game never ended');
  else if (tally.n < 2) problems.push(`only ${tally.n} endgame scores`);
  else if (tally.spread < 200) problems.push(`${tally.n} scores landed within ${Math.round(tally.spread)}ms of each other`);
  if (problems.length) { failures++; console.log(`  ✗ endgame tally: ${problems.join(' · ')}`); }
  else console.log(`  ✓ endgame tally     ${tally.n} features over ${(tally.spread / 1000).toFixed(1)}s`);
}

// The computer player, which in the browser is a different claim from the one
// the harness makes: not "it picks legal moves" but "it takes its turns off the
// render loop, on its own, without being poked".
{
  errors.length = 0;
  await page.selectOption('#mode', 'classic');
  await page.selectOption('#botSpeed', '0');
  await page.selectOption('#botCount', '2');        // both seats — it plays itself
  await page.click('#newGame');
  await page.waitForTimeout(2000);
  const st = await page.evaluate(() => ({
    tiles: window.LAB.game.board.size,
    bots: window.LAB.bots.size,
    locked: document.querySelectorAll('#actions button').length,
  }));
  const problems = [];
  if (errors.length) problems.push(errors[0].split('\n')[0]);
  if (st.bots !== 2) problems.push(`${st.bots} bots built`);
  if (st.tiles < 6) problems.push(`only ${st.tiles} tiles laid in 2s`);
  if (st.locked) problems.push(`${st.locked} action buttons left live on a bot turn`);
  if (problems.length) { failures++; console.log(`  ✗ computer players: ${problems.join(' · ')}`); }
  else console.log(`  ✓ computer players  ${st.tiles} tiles laid unattended`);
  await page.selectOption('#botCount', '0');
  await page.selectOption('#botSpeed', '380');
}

// Every mechanic touches the UI too — the market row and the extra action
// buttons especially, and those only exist in a browser.
// The catalogue lists rules that aren't built yet; those rows are disabled
// on purpose, so the sweep is over what the engine actually implements.
const mechanics = await page.evaluate(
  () => window.LAB.LIVE_MECHANICS.filter((m) => !m.on).map((m) => m.id),
);
for (const mech of mechanics) {
  errors.length = 0;
  await page.selectOption('#mode', 'classic');
  await setMech(page, mech, true);
  await page.click('#newGame');
  await page.waitForTimeout(100);
  await page.evaluate(() => {
    const g = window.LAB.game;
    const legal = () => {
      const out = [];
      const saved = g.rot;
      for (const { x, y } of g.board.candidates(g.placeOpts())) {
        for (let rot = 0; rot < 4; rot++) { g.rot = rot; if (g.canPlaceAt(x, y)) out.push({ x, y, rot }); }
      }
      g.rot = saved;
      return out;
    };
    for (let i = 0; i < 20 && g.phase !== 'over'; i++) {
      if (g.phase === 'market') { g.takeFromMarket(0); continue; }
      if (g.phase === 'place') {
        const s = legal()[0];
        if (!s) break;
        g.rot = s.rot;
        g.cellClick(s.x, s.y);
        continue;
      }
      if (g.phase === 'meeple') { g.skipMeeple(); continue; }
      if (g.phase === 'walk') { g.declineWalk(); continue; }
      break;
    }
  });
  await setMech(page, mech, false);
  if (errors.length) { failures++; console.log(`  ✗ +${mech}: ${errors[0].split('\n')[0]}`); }
  else console.log(`  ✓ +${mech}`);
}

// And the tiles-per-turn setting, which changes the turn loop itself.
for (const n of ['1', '3', '5']) {
  errors.length = 0;
  await page.selectOption('#tilesPerTurn', n);
  await page.click('#newGame');
  await page.waitForTimeout(80);
  const left = await page.evaluate(() => window.LAB.game.tilesLeft);
  if (errors.length || left !== Number(n)) {
    failures++;
    console.log(`  ✗ ${n} tiles/turn: ${errors[0] || `tilesLeft was ${left}`}`);
  } else console.log(`  ✓ ${n} tiles/turn`);
}
await page.selectOption('#tilesPerTurn', '1');

// --- the play surface -------------------------------------------------------
//
// Dragging a tile out of the hand, staging it, turning it only the ways it
// fits, committing, then claiming on a zoomed copy of it — the whole turn as
// a person actually performs it, which none of the checks above touch because
// they all drive the engine directly.
{
  errors.length = 0;
  await page.selectOption('#mode', 'classic');
  await page.fill('#seed', 'ui-probe');
  await page.click('#newGame');
  await page.waitForTimeout(250);

  const box = await page.locator('#board').boundingBox();
  const target = await page.evaluate(() => {
    const [sx, sy] = window.LAB.renderer.toScreen(1.5, 0.5);
    return { sx, sy };
  });
  const pv = await page.locator('#preview').boundingBox();
  await page.mouse.move(pv.x + pv.width / 2, pv.y + pv.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + target.sx, box.y + target.sy, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(200);

  const staged = await page.evaluate(() => window.LAB.renderer.pending);
  const laid = await page.evaluate(() => window.LAB.game.board.size);
  if (!staged || staged.x !== 1 || staged.y !== 0) {
    failures++;
    console.log(`  ✗ drag to stage: ${errors[0] || JSON.stringify(staged)}`);
  } else if (laid !== 1) {
    failures++;
    console.log(`  ✗ drag to stage: it committed instead of staging (${laid} tiles)`);
  } else if (!staged.rots.length || staged.rots.some((r) => r < 0 || r > 3)) {
    failures++;
    console.log(`  ✗ drag to stage: bad rotations ${JSON.stringify(staged.rots)}`);
  } else console.log(`  ✓ drag to stage        ${staged.rots.length} rotation(s) fit`);

  // Only the legal rotations are reachable from the confirm step.
  const legal = await page.evaluate(() => {
    const g = window.LAB.game;
    const p = window.LAB.renderer.pending;
    const saved = g.rot;
    const ok = p.rots.every((r) => { g.rot = r; return g.canPlaceAt(p.x, p.y); });
    g.rot = saved;
    return ok;
  });
  if (!legal) { failures++; console.log('  ✗ staged rotations are all legal'); }
  else console.log('  ✓ staged rotations legal');

  await page.evaluate(() => {
    const b = [...document.querySelectorAll('#actions button')].find((x) => /Place it here/.test(x.textContent));
    b?.click();
  });
  await page.waitForTimeout(250);
  const after = await page.evaluate(() => ({
    size: window.LAB.game.board.size,
    phase: window.LAB.game.phase,
    pending: window.LAB.renderer.pending,
    claim: !document.querySelector('#claim').hidden,
  }));
  if (errors.length || after.size !== 2 || after.pending) {
    failures++;
    console.log(`  ✗ confirm places: ${errors[0] || JSON.stringify(after)}`);
  } else console.log(`  ✓ confirm places       phase "${after.phase}"`);

  if (after.phase === 'meeple') {
    if (!after.claim) { failures++; console.log('  ✗ the claim panel opens on the meeple step'); }
    else {
      const took = await page.evaluate(() => {
        const c = document.querySelector('#claimTile');
        const r = c.getBoundingClientRect();
        const g = window.LAB.game;
        // Claiming ends the turn, so game.player is somebody else by the time
        // we look — count the supply of whoever is claiming, by index.
        const who = g.current;
        const before = g.players[who].meeples;
        // Aim at the first spot through the real pointer path.
        const spots = window.LAB.claimSpots();
        if (!spots.length) return null;
        const sc = r.width / c.width;
        c.dispatchEvent(new PointerEvent('pointerdown', {
          clientX: r.left + spots[0].sx * sc,
          clientY: r.top + spots[0].sy * sc,
          bubbles: true,
        }));
        const cell = g.board.get(spots[0].x, spots[0].y);
        return { before, after: g.players[who].meeples, onTile: !!cell?.meeple };
      });
      if (!took || took.after !== took.before - 1 || !took.onTile) {
        failures++;
        console.log(`  ✗ claiming from the panel: ${JSON.stringify(took)}`);
      } else console.log('  ✓ claim from the panel');
    }
  }

  // Folding the panel away gives the board the whole window.
  const wide = await page.evaluate(() => document.querySelector('#board').clientWidth);
  await page.keyboard.press('Tab');
  await page.waitForTimeout(200);
  const lean = await page.evaluate(() => ({
    lean: document.body.classList.contains('lean'),
    hud: !document.querySelector('#hud').hidden,
    w: document.querySelector('#board').clientWidth,
  }));
  if (!lean.lean || !lean.hud || lean.w <= wide) {
    failures++;
    console.log(`  ✗ lean mode: ${JSON.stringify(lean)}`);
  } else console.log(`  ✓ lean mode            board ${wide} → ${lean.w}px`);
  await page.keyboard.press('Tab');
  await page.waitForTimeout(150);
}

// Starà, on a phone: its own screen, one piece at a time, on an open table
// (2026-11-18; the border gone and the pieces dragged since the seventh pass,
// 2026-11-27). Played through the real controls: the cards, the two turn
// buttons, a lit square, a drag, the seal, a lift, the size switch, the end
// card, the plan and its replay.
{
  errors.length = 0;
  await page.setViewportSize({ width: 390, height: 844 });
  if (await page.evaluate(() => document.body.classList.contains('stara') && !document.body.classList.contains('staraPanel'))) await page.click('#staraMenu');
  await page.selectOption('#mode', 'stara');
  await page.click('#newGame');
  await page.waitForTimeout(250);
  const problems = [];
  const inView = () => page.evaluate(() => {
    const g = window.LAB.game, r = window.LAB.renderer, e = g.m.extent();
    const cv = r.canvas.getBoundingClientRect();
    const top = document.getElementById('staraTop').getBoundingClientRect().bottom;
    const tray = document.getElementById('staraTray').getBoundingClientRect().top;
    const [x0, y0] = r.toScreen(e.minX, e.minY), [x1, y1] = r.toScreen(e.maxX + 1, e.maxY + 1);
    return x0 >= -1 && x1 <= cv.width + 1 && y0 + cv.top >= top - 1 && y1 + cv.top <= tray + 1;
  });
  const screen = await page.evaluate(() => {
    const g = window.LAB.game, r = window.LAB.renderer;
    return {
      on: document.body.classList.contains('stara') && !document.getElementById('stara').hidden,
      panel: getComputedStyle(document.getElementById('panel')).display,
      bounds: g.board.bounds, walled: g.board.walled,
      tags: !!document.getElementById('staraQuarters'),
      tile: Math.round(r.cam.zoom),
    };
  });
  const look = await page.evaluate(async () => {
    await document.fonts.ready;
    const r = window.LAB.renderer;
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
    return {
      // The inked table's wall layer, or the model's wall (lowpoly.js), whichever view is up.
      wall: r.model3d ? (r.low.model?.wall?.length || 0) > 0 : !!r.cityWall && r.cityWall.canvas.width > 0,
      fonts: ['34px Fraktur', '16px Fell', '16px Cinzel'].filter((f) => !document.fonts.check(f)),
    };
  });
  if (!screen.on) problems.push('the Starà screen did not come up');
  if (screen.panel !== 'none') problems.push('the workshop panel is still showing');
  if (screen.bounds || screen.walled) problems.push('the table still has a border');
  if (screen.tags) problems.push('the day\'s cast tags are still on the page');
  if (!look.wall) problems.push('no wall drawn round the Comune');
  if (look.fonts.length) problems.push(`fonts did not load: ${look.fonts.join(', ')}`);
  if (!(await inView())) problems.push('the city and its spring are not in view between the top bar and the tray');

  // Three pieces in hand from the first turn (2026-11-27).
  const hand0 = await page.evaluate(() => ({ cards: document.querySelectorAll('.staraCard').length, hand: window.LAB.game.m.hand.length }));
  if (hand0.cards !== 3 || hand0.hand !== 3) problems.push(`the first turn holds ${hand0.hand} pieces on ${hand0.cards} cards, not three`);

  // Touching the card turns the piece in hand; so does the turn button in the tray.
  const rot0 = await page.evaluate(() => window.LAB.game.rot);
  const card = await page.locator('.staraCard.held canvas').boundingBox();
  await page.mouse.click(card.x + card.width / 2, card.y + card.height / 2);
  const rot1 = await page.evaluate(() => window.LAB.game.rot);
  if (rot1 === rot0) problems.push('touching the card did not turn the piece');
  await page.click('#staraRotate');
  if (await page.evaluate((r) => window.LAB.game.rot === r, rot1)) problems.push('the turn button in the tray did not turn the piece in hand');

  // A lit square stages it, whole.
  const at = (k) => page.evaluate((key) => {
    const r = window.LAB.renderer;
    const [x, y] = key.split(',').map(Number);
    const [sx, sy] = r.toScreen(x + 0.5, y + 0.5);
    const cv = r.canvas.getBoundingClientRect();
    return { x: sx + cv.left, y: sy + cv.top };
  }, k);
  const litKey = await page.evaluate(() => [...window.LAB.game.m.litSquares()][0]);
  const lit = await at(litKey);
  await page.mouse.click(lit.x, lit.y);
  await page.waitForTimeout(120);
  const staged = await page.evaluate(() => {
    const g = window.LAB.game, r = window.LAB.renderer, p = r.pending;
    const pv = p && g.m.preview(p.ax, p.ay, p.rot);
    const held = document.querySelector('.staraCard.held');
    return {
      on: !!pv, fits: p?.fits, squares: pv ? pv.cells.length : 0, want: g.m.held.cells.length,
      inTray: !!held && getComputedStyle(held).display !== 'none',
      button: !!document.getElementById('staraGo'), turn: !document.getElementById('staraTurn').hidden,
    };
  });
  if (!staged.on || !staged.fits) problems.push(`a lit square did not stage the piece where it fits: ${JSON.stringify(staged)}`);
  else if (staged.squares !== staged.want) problems.push(`a piece of ${staged.want} squares staged on ${staged.squares}`);
  if (staged.inTray) problems.push('the staged piece is still in the tray');
  if (staged.button) problems.push('the seal button is still on the page: a hold seals now');
  if (!staged.turn) problems.push('no turn button beside the staged piece');
  // The card of the place held up under the hand in the colours of the ways,
  // the plan under the title, and what the staged piece would pay.
  const city = await page.evaluate(() => {
    const g = window.LAB.game, r = window.LAB.renderer;
    const cardText = document.getElementById('staraCaption').textContent;
    const chips = [...document.querySelectorAll('#staraCaption .way')].map((e) => [e.className, getComputedStyle(e).backgroundColor]);
    const p = r.pending;
    const pv = p && g.m.preview(p.ax, p.ay, p.rot);
    const ways = pv ? Object.values(pv.ways).reduce((a, b) => a + b, 0) : null;
    return {
      cardText, chips, name: g.m.card(g.tileKey).name, gain: pv ? pv.gain : null, total: pv ? pv.total : null, ways,
      score: g.players[0].score, day: document.getElementById('staraDay').textContent, par: g.m.par,
    };
  });
  if (!city.cardText.includes(city.name)) problems.push(`the card under the hand does not name the ${city.name}`);
  if (!city.chips.length || new Set(city.chips.map(([c]) => c)).size !== new Set(city.chips.map(([, b]) => b)).size) problems.push(`the card's chips are not coloured by way: ${JSON.stringify(city.chips)}`);
  if (!city.day.includes(String(city.par))) problems.push(`the plan's worth is not under the title: "${city.day}"`);
  if (city.gain == null || city.total !== city.score + city.gain || city.ways !== city.gain) problems.push(`the staged piece's gain does not add up: ${JSON.stringify(city)}`);

  // The turn button beside it turns it in place, about the square it is held by.
  const pinned = await page.evaluate(() => {
    const p = window.LAB.renderer.pending;
    const cells = window.LAB.stara.pendingCells();
    return { rot: p.rot, x: p.ax, y: p.ay, cells: cells.map((c) => `${c.x},${c.y}`) };
  });
  await page.click('#staraTurn');
  await page.waitForTimeout(80);
  const turnedOn = await page.evaluate(() => {
    const p = window.LAB.renderer.pending;
    return { rot: p.rot, cells: window.LAB.stara.pendingCells().map((c) => `${c.x},${c.y}`), size: window.LAB.game.board.size };
  });
  if (turnedOn.rot === pinned.rot) problems.push('the turn button beside the piece did not turn it');
  if (staged.want > 1 && !turnedOn.cells.some((k) => pinned.cells.includes(k))) problems.push('the piece did not turn about a square of its own');

  // Dragged across the table it goes where it is put, fitting or not, and
  // nothing is laid; let go, it stays on the table.
  const grab = await at(turnedOn.cells[0]);
  const z = await page.evaluate(() => window.LAB.renderer.cam.zoom);
  await page.mouse.move(grab.x, grab.y);
  await page.mouse.down();
  for (let k = 1; k <= 6; k++) { await page.mouse.move(grab.x + (z * 2 * k) / 6, grab.y + (z * k) / 6); await page.waitForTimeout(20); }
  const mid = await page.evaluate(() => ({ turn: !document.getElementById('staraTurn').hidden, sealing: !!window.LAB.renderer.sealing }));
  await page.mouse.up();
  await page.waitForTimeout(100);
  const dragged = await page.evaluate(() => {
    const p = window.LAB.renderer.pending;
    return { on: !!p, cells: p ? window.LAB.stara.pendingCells().map((c) => `${c.x},${c.y}`) : [], size: window.LAB.game.board.size, laid: window.LAB.game.m.laid.size };
  });
  if (!dragged.on) problems.push('a drag on the staged piece put it back in the hand');
  else if (dragged.cells.join(';') === turnedOn.cells.join(';')) problems.push('a drag did not move the staged piece');
  if (dragged.laid) problems.push('a drag laid the piece');
  if (mid.turn || mid.sealing) problems.push(`while dragging, the turn button showed or a seal began: ${JSON.stringify(mid)}`);

  // Back on a lit square: a hold let go of early lays nothing, a tap turns.
  const lit2Key = await page.evaluate(() => [...window.LAB.game.m.litSquares()][0]);
  const lit2 = await at(lit2Key);
  await page.mouse.click(lit2.x, lit2.y);
  await page.waitForTimeout(120);
  const ready = await page.evaluate(() => ({ fits: window.LAB.renderer.pending?.fits, laid: window.LAB.game.m.laid.size }));
  if (!ready.fits) problems.push('a tap on a lit square did not stage it where it fits');
  await page.mouse.move(lit2.x, lit2.y);
  await page.mouse.down();
  await page.waitForTimeout(260);
  const midway = await page.evaluate(() => !!window.LAB.renderer.sealing);
  await page.mouse.up();
  await page.waitForTimeout(100);
  const early = await page.evaluate(() => ({ laid: window.LAB.game.m.laid.size, pending: !!window.LAB.renderer.pending }));
  if (!midway) problems.push('holding the staged piece did not start the seal');
  if (early.laid !== ready.laid || !early.pending) problems.push(`a hold let go of early did something: ${JSON.stringify(early)}`);

  // Held still, it is sealed to the table in about 0.6 s; the hand is three again.
  const want = staged.want;
  await page.mouse.down();
  await page.waitForTimeout(760);
  await page.mouse.up();
  await page.waitForTimeout(150);
  const laid = await page.evaluate(() => ({ laid: window.LAB.game.m.laid.size, size: window.LAB.game.board.size, phase: window.LAB.game.phase, hand: window.LAB.game.m.hand.length, cards: document.querySelectorAll('.staraCard').length }));
  if (laid.laid !== ready.laid + 1) problems.push(`a hold of 0.76 s did not lay the piece: ${JSON.stringify(laid)}`);
  if (laid.phase !== 'place') problems.push(`after the seal the phase is "${laid.phase}", not the next piece`);
  if (laid.hand !== 3 || laid.cards !== 3) problems.push(`after the seal ${laid.hand} pieces on ${laid.cards} cards, not three`);

  // A card dragged onto the table puts its piece there; dragged on to the
  // tray, it is back in the hand.
  {
    const c2 = await page.locator('.staraCard.held canvas').boundingBox();
    const to = await at(await page.evaluate(() => [...window.LAB.game.m.litSquares()][0] || '0,0'));
    await page.mouse.move(c2.x + c2.width / 2, c2.y + c2.height / 2);
    await page.mouse.down();
    for (let k = 1; k <= 8; k++) { await page.mouse.move(c2.x + c2.width / 2 + ((to.x - c2.x - c2.width / 2) * k) / 8, c2.y + c2.height / 2 + ((to.y - c2.y - c2.height / 2) * k) / 8); await page.waitForTimeout(20); }
    const over = await page.evaluate(() => !!window.LAB.renderer.pending);
    for (let k = 1; k <= 6; k++) { await page.mouse.move(to.x, to.y + ((c2.y + c2.height / 2 - to.y) * k) / 6); await page.waitForTimeout(20); }
    await page.mouse.up();
    await page.waitForTimeout(120);
    const back = await page.evaluate(() => ({ pending: !!window.LAB.renderer.pending, hand: window.LAB.game.m.hand.length, laid: window.LAB.game.m.laid.size }));
    if (!over) problems.push('a card dragged over the table did not put its piece there');
    if (back.pending || back.hand !== 3 || back.laid !== laid.laid) problems.push(`a card dragged back to the tray did not go back in the hand: ${JSON.stringify(back)}`);
  }

  // Touching another card holds it up.
  {
    const two = await page.evaluate(() => window.LAB.game.m.hand.slice());
    const other = await page.locator('.staraCard[data-i="1"] canvas').boundingBox();
    await page.mouse.click(other.x + other.width / 2, other.y + other.height / 2);
    await page.waitForTimeout(120);
    const held = await page.evaluate(() => ({ sel: window.LAB.game.m.sel, tile: window.LAB.game.tileKey, ring: document.querySelector('.staraCard.held')?.dataset.i }));
    if (held.sel !== 1 || held.tile !== two[1] || held.ring !== '1') problems.push(`touching the second card held up ${JSON.stringify(held)}`);
  }

  // Held on a piece already down, it lifts back into the hand for a point.
  {
    const id = await page.evaluate(() => [...window.LAB.game.m.laid.keys()][0]);
    const sq = await page.evaluate((pid) => window.LAB.game.m.squaresOf(pid)[0], id);
    const p0 = await at(`${sq.x},${sq.y}`);
    const was = await page.evaluate(() => ({ score: window.LAB.game.players[0].score, worth: window.LAB.game.m.city.total }));
    await page.mouse.move(p0.x, p0.y);
    await page.mouse.down();
    await page.waitForTimeout(800);
    await page.mouse.up();
    await page.waitForTimeout(150);
    const lifted = await page.evaluate((pid) => {
      const g = window.LAB.game;
      return { inHand: g.m.hand.includes(pid), held: g.tileKey === pid, lifts: g.m.lifts, score: g.players[0].score, worth: g.m.city.total };
    }, id);
    if (!lifted.inHand || !lifted.held || lifted.lifts !== 1) problems.push(`a hold on a laid piece did not lift it: ${JSON.stringify(lifted)}`);
    else if (lifted.score !== lifted.worth - 1) problems.push(`a lift did not cost a point: ${JSON.stringify({ was, lifted })}`);
  }

  // The size switch: the 5 x 5 comes up, and going back finds the 7 x 7 as it was left.
  const kept = await page.evaluate(() => window.LAB.game.m.laid.size);
  await page.click('#staraSizes button[data-mode="stara5"]');
  await page.waitForTimeout(150);
  const five = await page.evaluate(() => ({ mode: window.LAB.game.mode, side: window.LAB.game.m.side }));
  if (five.mode !== 'stara5' || five.side !== 5) problems.push(`the 5x5 switch gave ${JSON.stringify(five)}`);
  await page.click('#staraSizes button[data-mode="stara"]');
  await page.waitForTimeout(150);
  const seven = await page.evaluate(() => ({ mode: window.LAB.game.mode, laid: window.LAB.game.m.laid.size }));
  if (seven.mode !== 'stara' || seven.laid !== kept) problems.push(`going back did not find the 7x7 as it was: ${JSON.stringify(seven)}`);

  // Play the rest out; the city stays in view as it grows, the end card
  // adds up, and today's best is kept.
  const end = await page.evaluate(async () => {
    const g = window.LAB.game;
    let guard = 0;
    while (g.phase === 'place' && guard++ < 100) g.m.botAction();
    window.LAB.stara.sync();
    await new Promise((r) => setTimeout(r, 600));
    return {
      over: g.phase === 'over',
      shown: !document.getElementById('staraEnd').hidden,
      card: Number(document.getElementById('staraEndScore').textContent),
      score: g.players[0].score,
      sum: Object.values(g.m.tally).reduce((a, b) => a + b, 0),
      best: Number(localStorage.getItem(`tilemakers-workshop/stara/best/${g.m.day.iso}`)),
    };
  });
  if (!(await inView())) problems.push('the finished city is not all in view');
  if (!end.over || !end.shown) problems.push('no end card at the end of the day');
  else if (end.card !== end.score || end.sum !== end.score) problems.push(`the end card does not add up: ${JSON.stringify(end)}`);
  else if (end.best !== end.score) problems.push('today\'s best was not kept');

  // The architect's plan, on the table once the day is over, and back.
  await page.click('#staraPlan');
  await page.waitForTimeout(200);
  const plan = await page.evaluate(() => ({ on: window.LAB.game.m.showingPlan, bar: !document.getElementById('staraPlanBar').hidden, full: window.LAB.game.board.size === window.LAB.game.m.squares, card: document.getElementById('staraEnd').hidden }));
  if (!plan.on || !plan.bar || !plan.full || !plan.card) problems.push(`the plan did not come up whole: ${JSON.stringify(plan)}`);
  await page.click('#staraBack');
  await page.waitForTimeout(150);
  const back = await page.evaluate(() => ({ on: window.LAB.game.m.showingPlan, end: !document.getElementById('staraEnd').hidden }));
  if (back.on || !back.end) problems.push(`back from the plan: ${JSON.stringify(back)}`);

  await page.click('#staraAgain');
  await page.waitForTimeout(150);
  const again = await page.evaluate(() => ({ phase: window.LAB.game.phase, end: document.getElementById('staraEnd').hidden }));
  if (again.phase !== 'place' || !again.end) problems.push('Play again did not deal the day again');

  // The menu brings the workshop back, and leaving Starà gives it back for good.
  await page.click('#staraMenu');
  await page.selectOption('#mode', 'classic');
  await page.click('#newGame');
  await page.waitForTimeout(150);
  const left = await page.evaluate(() => !document.body.classList.contains('stara') && document.getElementById('stara').hidden);
  if (!left) problems.push('leaving Starà left its screen up');

  if (errors.length) problems.push(errors[0].split('\n')[0]);
  if (problems.length) { failures++; console.log(`  ✗ starà on a phone: ${problems.join(' · ')}`); }
  else console.log(`  ✓ starà on a phone     open table at ${screen.tile}px a square; three in hand, both turn buttons, staged whole, dragged, early let-go lays nothing, 0.6 s seal, card drag and back, lift for a point, ways, plan, sizes, charter, replay`);
  await page.setViewportSize({ width: 1280, height: 820 });
}

// Starà and Giardino BY TOUCH (2026-11-27: "tapping and holding highlights
// stuff in Safari ... we currently can't put down the seal without doing
// that as well"; and the seventh pass, the same day: dragged, two turn
// buttons, a faster seal). A phone of its own, with touch, driven by real
// touch events: a tap stages, a tap turns, the tray's button turns it back,
// a finger drags it about, and a finger held still seals it while it is
// still down, with no selection made and the pointer never cancelled (a
// long press that starts a selection cancels it, which ended the hold).
for (const mode of ['stara5', 'giardino']) {
  const problems = [];
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const tp = await phone.newPage();
  const errs = [];
  tp.on('pageerror', (e) => errs.push(e.message));
  await tp.goto(`http://localhost:${PORT}/index.html?mode=${mode}`);
  await tp.waitForTimeout(1200);
  await tp.evaluate(() => { window.__cancels = 0; window.LAB.renderer.canvas.addEventListener('pointercancel', () => window.__cancels++); });
  const cdp = await phone.newCDPSession(tp);
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  const spot = await tp.evaluate(() => {
    const g = window.LAB.game, r = window.LAB.renderer;
    const keys = g.m.litSquares ? [...g.m.litSquares()] : g.board.legalPlacements(g.tile, g.placeOpts()).map((s) => `${s.x},${s.y}`);
    const [x, y] = keys[0].split(',').map(Number);
    const [sx, sy] = r.toScreen(x + 0.5, y + 0.5);
    const cv = r.canvas.getBoundingClientRect();
    return { x: sx + cv.left, y: sy + cv.top, z: r.cam.zoom };
  });
  const state = () => tp.evaluate(() => ({
    laid: window.LAB.game.m.laid?.size ?? window.LAB.game.board.size, pending: !!window.LAB.renderer.pending, rot: window.LAB.renderer.pending?.rot,
    fits: window.LAB.renderer.pending?.fits, at: window.LAB.renderer.pending ? `${window.LAB.renderer.pending.x},${window.LAB.renderer.pending.y}` : '',
    selected: String(window.getSelection()).length, cancels: window.__cancels,
  }));
  const tap = async (x = spot.x, y = spot.y) => { await touch('touchStart', x, y); await tp.waitForTimeout(60); await touch('touchEnd'); await tp.waitForTimeout(150); };
  const before = await state();
  await tap();
  const staged = await state();
  await tap();
  const turned = await state();
  // The tray's turn button, three times, brings it round to where it fitted.
  const btn = await tp.locator('#staraRotate').boundingBox();
  for (let k = 0; k < 3; k++) await tap(btn.x + btn.width / 2, btn.y + btn.height / 2);
  const round = await state();
  // A finger drags it two squares along, and lets it go there.
  await touch('touchStart', spot.x, spot.y);
  for (let k = 1; k <= 6; k++) { await touch('touchMove', spot.x + (spot.z * 2 * k) / 6, spot.y); await tp.waitForTimeout(25); }
  await touch('touchEnd');
  await tp.waitForTimeout(150);
  const dragged = await state();
  // A tap back on the lit square, and a finger held still seals it.
  await tap();
  await touch('touchStart', spot.x, spot.y);
  await tp.waitForTimeout(260);
  const midway = await tp.evaluate(() => !!window.LAB.renderer.sealing);
  await tp.waitForTimeout(500);
  const held = await state();
  await touch('touchEnd');
  await tp.waitForTimeout(150);
  if (!staged.pending || !staged.fits) problems.push('a tap did not stage it where it fits');
  if (turned.rot === staged.rot) problems.push('a second tap did not turn it');
  if (round.rot !== staged.rot || !round.fits) problems.push(`the tray's turn button did not bring it round: ${JSON.stringify({ staged, round })}`);
  if (!dragged.pending || dragged.at === round.at || dragged.laid !== before.laid) problems.push(`a finger did not drag it: ${JSON.stringify({ round, dragged })}`);
  if (!midway) problems.push('holding did not start the seal');
  if (held.laid <= before.laid) problems.push(`a finger held down 0.76 s did not seal it: ${JSON.stringify(held)}`);
  if (held.selected || held.cancels) problems.push(`the hold selected text or was cancelled: ${JSON.stringify(held)}`);
  const look = await tp.evaluate(() => {
    const cs = getComputedStyle(window.LAB.renderer.canvas);
    return (cs.webkitUserSelect || cs.userSelect) + ' ' + (cs.webkitTouchCallout ?? 'none');
  });
  if (!/^none/.test(look)) problems.push(`the board can still be selected: ${look}`);
  if (errs.length) problems.push(errs[0].split('\n')[0]);
  await phone.close();
  if (problems.length) { failures++; console.log(`  ✗ ${mode} by touch: ${problems.join(' · ')}`); }
  else console.log(`  ✓ ${(mode + ' by touch').padEnd(21)} a tap stages, a tap turns, the tray turns it back, a finger drags it, a finger held still seals with nothing selected or cancelled`);
}

// Starà AS A MODEL (src/lowpoly.js, 2026-11-27: "pseudo pixel 3D ... like a
// Nintendo 64 ... and then have an isometric view and a regular top-down
// view like we have now"). A new player's phone: the model in isometric, in
// big pixels; a tap on a lit square stages the piece there, through the
// ground's projection; a tap on a roof is that house's, not the square
// behind it; the three views switch and are remembered, and Iso again turns
// the view; the cards are the model too.
{
  const problems = [];
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const tp = await phone.newPage();
  const errs = [];
  tp.on('pageerror', (e) => errs.push(e.message));
  await tp.goto(`http://localhost:${PORT}/index.html?mode=stara`);
  await tp.waitForTimeout(1200);
  const first = await tp.evaluate(() => {
    const r = window.LAB.renderer, gl = document.getElementById('board3d');
    const c = document.createElement('canvas');
    c.width = gl.width; c.height = gl.height;
    const k = c.getContext('2d');
    k.drawImage(gl, 0, 0);
    const d = k.getImageData(0, 0, c.width, c.height).data;
    const colours = new Set();
    for (let i = 0; i < d.length; i += 4 * 53) colours.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
    return {
      kind: r.viewKind, model: r.model3d, shown: !!gl && !gl.hidden, colours: colours.size,
      px: gl.width / (gl.getBoundingClientRect().width * devicePixelRatio),
      buttons: [...document.querySelectorAll('#staraViews button')].filter((b) => !b.hidden).map((b) => b.textContent.trim().slice(0, 3)),
    };
  });
  if (first.kind !== 'iso' || !first.model || !first.shown) problems.push(`a new player does not see the model in isometric: ${JSON.stringify(first)}`);
  if (!(first.px < 0.5)) problems.push(`the model is not drawn in big pixels (${first.px.toFixed(2)} of the screen's)`);
  if (first.colours < 12) problems.push(`the model's canvas is nearly blank (${first.colours} colours)`);
  if (first.buttons.join(',') !== 'Ink,Top,Iso') problems.push(`the views offered are ${first.buttons.join(', ')}`);
  // A tap on a lit square, through the isometric projection, stages the piece over it.
  const lit = await tp.evaluate(() => {
    const g = window.LAB.game, r = window.LAB.renderer;
    const key = [...g.m.litSquares()][0];
    const [x, y] = key.split(',').map(Number);
    const [sx, sy] = r.toScreen(x + 0.5, y + 0.5);
    const cv = r.canvas.getBoundingClientRect();
    return { key, x: sx + cv.left, y: sy + cv.top };
  });
  await tp.mouse.click(lit.x, lit.y);
  await tp.waitForTimeout(150);
  const staged = await tp.evaluate(() => ({ on: !!window.LAB.renderer.pending, cells: window.LAB.stara.pendingCells().map((c) => `${c.x},${c.y}`), turn: !document.getElementById('staraTurn').hidden }));
  if (!staged.on || !staged.cells.includes(lit.key)) problems.push(`a tap on lit square ${lit.key} in isometric staged ${JSON.stringify(staged)}`);
  if (!staged.turn) problems.push('no turn button beside the staged piece in isometric');
  // A tap on a roof: lay a few pieces, then aim at the front house's roof.
  const roof = await tp.evaluate(async () => {
    const { project } = await import('./src/lowpoly.js');
    const g = window.LAB.game, r = window.LAB.renderer;
    window.LAB.stara.h?.clear?.();
    r.pending = null;
    for (let i = 0; i < 6 && g.phase === 'place'; i++) g.m.botAction();
    window.LAB.stara.sync();
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
    // A house with nothing in front of it (toward the viewer, in this view's
    // quarter), aimed at the back corner of its roof: the ground under that
    // point is the square behind it.
    const open = (x, y) => !g.board.get(x, y) && !g.m.water.spans.has(`${x},${y}`);
    const houses = [...g.board.cells.values()].filter((c) => c.type.place === 'house' && open(c.x + 1, c.y) && open(c.x, c.y + 1) && open(c.x + 1, c.y + 1));
    const front = houses.sort((a, b) => r.low.topAt(b.x, b.y, () => 0) - r.low.topAt(a.x, a.y, () => 0))[0];
    const top = r.low.topAt(front.x, front.y, () => 0);
    const [sx, sy] = project(r.view, r.cam, r.w, r.h, front.x + 0.12, front.y + 0.12, top - 0.04);
    const ground = r.toWorld(sx, sy).map(Math.floor);
    return { want: `${front.x},${front.y}`, got: (({ x, y }) => `${x},${y}`)(r.cellAt(sx, sy)), ground: ground.join(','), top };
  });
  if (roof.got !== roof.want) problems.push(`a tap on the roof of ${roof.want} picked ${roof.got}`);
  if (roof.ground === roof.want) problems.push('the roof test did not test anything: the ground under the roof is the same square');
  // The views: Top, Ink, Iso, and Iso again turns it; remembered.
  const views = [];
  for (const v of ['top', 'ink', 'iso', 'iso']) {
    await tp.click(`#staraViews button[data-view="${v}"]`);
    await tp.waitForTimeout(120);
    views.push(await tp.evaluate(() => {
      const r = window.LAB.renderer;
      return `${r.viewKind}${r.viewQuarter}:${r.model3d ? 'm' : 'i'}:${document.getElementById('board3d').hidden ? 'h' : 's'}`;
    }));
  }
  if (views.join(' ') !== 'top0:m:s ink0:i:h iso0:m:s iso1:m:s') problems.push(`the view switch went ${views.join(' ')}`);
  const kept = await tp.evaluate(() => localStorage.getItem('tilemakers-workshop/stara/view'));
  if (kept !== 'iso:1') problems.push(`the view was kept as ${kept}`);
  // The sliders (2026-11-27: "sliders for me to adjust how tilted in both
  // directions isometric and top are"): Top tilted to 60° and turned 30°,
  // a tap on a lit square still stages the piece over it, kept; Reset puts
  // it back straight down.
  await tp.click('#staraViews button[data-view="top"]');
  await tp.click('#staraTiltBtn');
  const slide = (id, v) => tp.$eval(id, (el, x) => { el.value = x; el.dispatchEvent(new Event('input', { bubbles: true })); }, String(v));
  await slide('#staraTiltRange', 60);
  await slide('#staraTurnRange', 30);
  await tp.waitForTimeout(150);
  // Done closes the sliders (they lie over the top of the board); the angles stay.
  await tp.click('#staraTuneClose');
  await tp.waitForTimeout(100);
  const tilted = await tp.evaluate(() => {
    const g = window.LAB.game, r = window.LAB.renderer;
    const key = [...g.m.litSquares()][0];
    const [x, y] = key.split(',').map(Number);
    const [sx, sy] = r.toScreen(x + 0.5, y + 0.5);
    const cv = r.canvas.getBoundingClientRect();
    return { closed: document.getElementById('staraTune').hidden, tilt: r.view.tilt, turn: r.view.turn, angled: r.angled, key, x: sx + cv.left, y: sy + cv.top,
      kept: JSON.parse(localStorage.getItem('tilemakers-workshop/stara/angles') || '{}').top };
  });
  if (!tilted.closed || tilted.tilt !== 60 || tilted.turn !== 30 || !tilted.angled) problems.push(`the sliders did not tilt and turn the top view: ${JSON.stringify(tilted)}`);
  if (tilted.kept?.tilt !== 60 || tilted.kept?.turn !== 30) problems.push(`the tilt was not kept: ${JSON.stringify(tilted.kept)}`);
  await tp.mouse.click(tilted.x, tilted.y);
  await tp.waitForTimeout(150);
  const onTilt = await tp.evaluate(() => window.LAB.stara.pendingCells().map((c) => `${c.x},${c.y}`));
  if (!onTilt.includes(tilted.key)) problems.push(`a tap on lit square ${tilted.key} in the tilted top view staged ${onTilt.join(' ')}`);
  await tp.click('#staraTiltBtn');
  await tp.click('#staraTuneReset');
  await tp.waitForTimeout(100);
  const reset = await tp.evaluate(() => ({ flat: window.LAB.renderer.view.flat, slider: document.getElementById('staraTiltRange').value }));
  if (!reset.flat || reset.slider !== '90') problems.push(`Reset did not put the top view back straight down: ${JSON.stringify(reset)}`);
  await tp.click('#staraTuneClose');
  // The cards are the model in a model view.
  const card = await tp.evaluate(() => {
    const cv = document.querySelector('.staraCard canvas');
    const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
    let solid = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 200) solid++;
    return { thumbs: !!window.LAB.renderer.thumbs?.ok, solid: solid / (d.length / 4) };
  });
  if (!card.thumbs || card.solid < 0.05) problems.push(`the cards are not drawn as the model: ${JSON.stringify(card)}`);
  if (errs.length) problems.push(errs[0].split('\n')[0]);
  await phone.close();
  if (problems.length) { failures++; console.log(`  ✗ starà as a model: ${problems.join(' · ')}`); }
  else console.log(`  ✓ starà as a model     isometric by default at ${(1 / first.px).toFixed(1)} screen px a pixel; a tap stages through the projection, a roof picks its own house, Ink/Top/Iso switch and turn and are kept, tilt and turn sliders, model cards`);
}

// CONTADO, Starà's long form (2026-11-27): one city on a land of levels,
// year after year, kept between visits. A phone: its title, the year and
// the commission under it, only the model's views; two pieces down and the
// page reloaded, the run is picked up where it was; the first year played
// out, its commission is measured and paid (or the run ends there); and
// once the run is over, A new run starts a new land.
{
  const problems = [];
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const tp = await phone.newPage();
  const errs = [];
  tp.on('pageerror', (e) => errs.push(e.message));
  await tp.goto(`http://localhost:${PORT}/index.html?mode=contado`);
  await tp.waitForTimeout(1200);
  const open = await tp.evaluate(() => {
    const g = window.LAB.game;
    const run = JSON.parse(localStorage.getItem('tilemakers-workshop/contado/run') || 'null');
    const levels = new Set();
    for (let x = -4; x <= 4; x++) for (let y = -4; y <= 4; y++) levels.add(g.m.levelAt(x, y));
    return {
      title: document.querySelector('#stara .staraName').textContent, day: document.getElementById('staraDay').textContent,
      views: [...document.querySelectorAll('#staraViews button')].filter((b) => !b.hidden).map((b) => b.dataset.view).join(','),
      sizes: getComputedStyle(document.getElementById('staraSizes')).display, seed: g.seed >>> 0, kept: run?.seed, year: g.m.year,
      model: window.LAB.renderer.model3d, levels: levels.size, hand: g.m.hand.length,
    };
  });
  if (open.title !== 'Contado' || !open.day.startsWith('Year 1')) problems.push(`the screen does not say Contado, year 1: ${open.title} / ${open.day}`);
  if (open.views !== 'top,iso' || open.sizes !== 'none') problems.push(`views ${open.views}, sizes ${open.sizes}`);
  if (!open.model) problems.push('Contado is not drawn as the model');
  if (open.levels < 3) problems.push(`the land is nearly flat (${open.levels} levels round the Comune)`);
  if (open.kept !== open.seed) problems.push('the run was not kept in the browser');
  if (open.hand !== 3) problems.push(`${open.hand} pieces in hand, not three`);
  const before = await tp.evaluate(() => {
    const g = window.LAB.game;
    for (let i = 0; i < 2; i++) g.m.botAction();
    window.LAB.stara.sync();
    return { laid: g.m.laid.size, score: g.players[0].score, seed: g.seed >>> 0 };
  });
  await tp.reload();
  await tp.waitForTimeout(1200);
  const after = await tp.evaluate(() => { const g = window.LAB.game; return { laid: g.m.laid.size, score: g.players[0].score, seed: g.seed >>> 0 }; });
  if (JSON.stringify(after) !== JSON.stringify(before)) problems.push(`the run was not picked up where it was left: ${JSON.stringify({ before, after })}`);
  const year = await tp.evaluate(() => {
    const g = window.LAB.game;
    for (let i = 0; i < 60 && g.m.year === 1 && g.phase !== 'over'; i++) g.m.botAction();
    window.LAB.stara.sync();
    return { year: g.m.year, over: g.phase === 'over', paid: g.m.tally.commissions, met: g.m.met[0], day: document.getElementById('staraDay').textContent };
  });
  if (!year.met) problems.push('the first year was never measured');
  else if (year.met.met && (year.year !== 2 || year.paid !== 5 || !year.day.startsWith('Year 2'))) problems.push(`a met commission did not pay and deal year 2: ${JSON.stringify(year)}`);
  else if (!year.met.met && !year.over) problems.push('a missed commission did not end the run');
  // End the run (each year closed early until one is missed), and start a new one.
  const ended = await tp.evaluate(() => {
    const g = window.LAB.game;
    for (let i = 0; i < 40 && g.phase !== 'over'; i++) g.m.endDay();
    window.LAB.stara.sync();
    const run = JSON.parse(localStorage.getItem('tilemakers-workshop/contado/run') || 'null');
    return { over: g.phase === 'over', card: !document.getElementById('staraEnd').hidden, again: document.getElementById('staraAgain').textContent, why: document.getElementById('staraEndPar').textContent, kept: run?.over, seed: g.seed >>> 0 };
  });
  if (!ended.over || !ended.card || ended.again !== 'A new run' || !/Signoria asked/.test(ended.why) || !ended.kept) problems.push(`the run did not end with its card: ${JSON.stringify(ended)}`);
  await tp.click('#staraAgain');
  await tp.waitForTimeout(300);
  const fresh = await tp.evaluate(() => ({ year: window.LAB.game.m.year, phase: window.LAB.game.phase, seed: window.LAB.game.seed >>> 0 }));
  if (fresh.year !== 1 || fresh.phase !== 'place' || fresh.seed === ended.seed) problems.push(`A new run did not start a new land: ${JSON.stringify(fresh)}`);
  if (errs.length) problems.push(errs[0].split('\n')[0]);
  await phone.close();
  if (problems.length) { failures++; console.log(`  ✗ contado on a phone: ${problems.join(' · ')}`); }
  else console.log(`  ✓ contado on a phone   ${open.levels} levels of land; year and commission shown, model only, kept and picked up after a reload, year 1 ${year.met.met ? 'met and paid' : 'missed and ended'}, ended and begun anew`);
}

// Giardino, the daily garden, on a phone (2026-11-22): Starà's screen with a
// garden wall, no sizes or quarters, the week under the title and the seed
// packet under the hand. Played through the real controls to the frost.
{
  errors.length = 0;
  await page.setViewportSize({ width: 390, height: 844 });
  if (await page.evaluate(() => document.body.classList.contains('stara') && !document.body.classList.contains('staraPanel'))) await page.click('#staraMenu');
  await page.selectOption('#mode', 'giardino');
  await page.click('#newGame');
  await page.waitForTimeout(300);
  const problems = [];
  const screen = await page.evaluate(() => {
    const g = window.LAB.game, r = window.LAB.renderer;
    const cv = r.canvas.getBoundingClientRect();
    const top = document.getElementById('staraTop').getBoundingClientRect().bottom;
    const tray = document.getElementById('staraTray').getBoundingClientRect().top;
    const [x0, y0] = r.toScreen(-3, -3), [x1, y1] = r.toScreen(4, 4);
    return {
      on: document.body.classList.contains('stara') && document.body.classList.contains('garden'),
      title: document.querySelector('#stara .staraName').textContent,
      day: document.getElementById('staraDay').textContent,
      sizes: getComputedStyle(document.getElementById('staraSizes')).display,
      tags: document.querySelectorAll('.staraQuarter').length,
      wall: String(r.castleKey || '').startsWith('garden'),
      fits: x0 >= 0 && x1 <= cv.width && y0 + cv.top >= top && y1 + cv.top <= tray,
      packet: document.getElementById('staraCaption').textContent,
      name: window.LAB.game.m.packet(window.LAB.game.tileKey)?.name,
      cards: document.querySelectorAll('.staraCard').length,
      tile: Math.round(r.cam.zoom),
    };
  });
  if (!screen.on) problems.push('the garden screen did not come up');
  if (screen.title !== 'Giardino' || !/week 0/.test(screen.day)) problems.push(`the title reads "${screen.title} ${screen.day}"`);
  if (screen.sizes !== 'none' || screen.tags) problems.push('Starà\'s sizes or quarter tags are showing');
  if (!screen.wall) problems.push('no garden wall round the square');
  if (!screen.fits) problems.push('the 7x7 garden does not fit between the top bar and the tray');
  if (!screen.name || !screen.packet.includes(screen.name)) problems.push(`the seed packet does not name the plant held up: "${screen.packet}"`);
  if (screen.cards !== 2) problems.push(`a hand of ${screen.cards}, not two`);

  // A lit square stages it, with its company marked; the seal sows it, and a week passes.
  const lit = await page.evaluate(() => {
    const g = window.LAB.game, r = window.LAB.renderer;
    const s = g.board.legalPlacements(g.tile, g.placeOpts())[0];
    const [sx, sy] = r.toScreen(s.x + 0.5, s.y + 0.5);
    const cv = r.canvas.getBoundingClientRect();
    return { x: sx + cv.left, y: sy + cv.top };
  });
  await page.mouse.click(lit.x, lit.y);
  await page.waitForTimeout(150);
  if (!(await page.evaluate(() => !!window.LAB.renderer.pending))) problems.push('a lit square did not stage the plant');
  // Held down on the staged plant for a second, it is sealed into its bed (2026-11-27).
  await page.mouse.move(lit.x, lit.y);
  await page.mouse.down();
  await page.waitForTimeout(1200);
  await page.mouse.up();
  await page.waitForTimeout(150);
  const sown = await page.evaluate(() => ({ week: window.LAB.game.m.week, beds: window.LAB.game.m.beds.size, day: document.getElementById('staraDay').textContent, phase: window.LAB.game.phase }));
  if (sown.week !== 1 || sown.beds !== 1 || !/week 1/.test(sown.day) || sown.phase !== 'place') problems.push(`sowing gave ${JSON.stringify(sown)}`);

  // To the frost: the end card adds up, and today's best is kept.
  const end = await page.evaluate(async () => {
    const g = window.LAB.game;
    let guard = 0;
    while (g.phase !== 'over' && guard++ < 400) {
      if (g.phase !== 'place') break;
      const s = g.board.legalPlacements(g.tile, g.placeOpts())[0];
      g.rot = s.rot; g.placeAt(s.x, s.y);
    }
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return {
      over: g.phase === 'over',
      shown: !document.getElementById('staraEnd').hidden,
      title: document.getElementById('staraEndDay').textContent,
      card: Number(document.getElementById('staraEndScore').textContent),
      score: g.players[0].score,
      sum: Object.values(g.m.tally).reduce((a, b) => a + b, 0),
      best: Number(localStorage.getItem(`tilemakers-workshop/giardino/best/${g.m.day.iso}`)),
      fill: document.getElementById('staraEndFill').textContent,
    };
  });
  if (!end.over || !end.shown) problems.push('no end card at the frost');
  else if (!end.title.startsWith('Giardino') || end.card !== end.score || end.sum !== end.score) problems.push(`the end card does not add up: ${JSON.stringify(end)}`);
  else if (end.best !== end.score) problems.push('today\'s best was not kept');
  await page.click('#staraAgain');
  await page.waitForTimeout(150);
  const again = await page.evaluate(() => ({ phase: window.LAB.game.phase, week: window.LAB.game.m.week, end: document.getElementById('staraEnd').hidden }));
  if (again.phase !== 'place' || again.week !== 0 || !again.end) problems.push('Play again did not sow the day again');
  await page.click('#staraMenu');
  await page.selectOption('#mode', 'classic');
  await page.click('#newGame');
  await page.waitForTimeout(150);
  if (!(await page.evaluate(() => !document.body.classList.contains('garden') && document.getElementById('stara').hidden))) problems.push('leaving Giardino left its screen up');

  if (errors.length) problems.push(errors[0].split('\n')[0]);
  if (problems.length) { failures++; console.log(`  ✗ giardino on a phone: ${problems.join(' · ')}`); }
  else console.log(`  ✓ giardino on a phone  walled garden at ${screen.tile}px a bed; packet, company, seal, weeks, frost (${end.score}, ${end.fill}), replay`);
  await page.setViewportSize({ width: 1280, height: 820 });
}

await browser.close();
server.close();
console.log(failures ? `\n${failures} failure(s)` : '\nbrowser: all good');
process.exit(failures ? 1 : 0);
