// ---------------------------------------------------------------------------
// Starà's interface: one piece at a time, on a wooden table.
//
// Timothy, 2026-11-18: "when in this mode, make the placement interface much
// simpler and more intuitive, with just like the tile itself pop up and then
// you place it and stuff, very minimalist. the background should be real wood".
//
// So while a Starà game is running, the workshop's panel, HUD and claim box
// step aside and this takes the screen:
//
//   top     the menu (the workshop, folded away), the day, your score
//   middle  the square, fitted to the screen and held still
//   bottom  the draw pile and your hand, and the card of what is held up
//
// The turn is the same turn the rest of the workshop plays, through the same
// staging main.js already has: touch a lit square (or drag a card onto one)
// and the piece sits there; touch it to turn it.
//
// The sixth pass (2026-11-27): "tap a tile to rotate it, tap and hold to seal
// the tile (place it). the animation start when you start holding, then over
// about a second or so it sort of seals to the table like a wax seal." The
// seal button is gone. A HOLD on the staged piece runs a gold line round its
// outline as the hold goes on, pours a drop of red wax on it, brings the die
// down into it, and at the end seals it to the table (render.js,
// progressOutline and drawWaxSeal); let go early and the wax lifts away and
// nothing is laid. A tap is still a turn. On iOS a long press would start a
// text selection and cancel the hold, so the board refuses it (wire()).
// Giardino, which plays on this screen, seals the same way. In the city:
//
//   - you hold THREE pieces from the start ("you start with the choice of
//     three tiles"), each a place of one to four squares, drawn whole on
//     its card;
//   - a HOLD on a piece already down breaks its seal and lifts it back into
//     your hand, for a point ("tiles can be picked up and placed again by
//     paying a point");
//   - when none of the three fits anywhere, a line in the tray says so and
//     offers to end the day;
//   - the card under the hand shows what the place wants as chips in the
//     colours of the WAYS ("things that score points in different way should
//     be clearly color coded"), the same colours the board and the charter
//     use;
//   - the day's plan is under the title from the first turn, and once the day
//     is over the charter can show it on the table.
//
// The seventh pass (2026-11-27, later): "You should be able to pick up and
// place and drag tiles as you see fit instead of having to tap somewhere else
// once they're already played to move them ... really freeform for the most
// part. And then ... tapping and holding still seals them ... because we now
// have Tetris pieces, I think we should probably have the rotate button ...
// an additional rotate button somewhere on the bottom". And "the tap and
// hold to place should be a bit faster". So:
//
//   - a piece is DRAGGED: from its card onto the table, or about the table
//     once it is there, held by the square your finger took it by; it goes
//     wherever it is put, drawn in red where it does not fit (and snapped,
//     when it is let go, to the nearest way it fits under the finger, if
//     there is one); dragged back onto the tray, it goes back in your hand;
//   - a TAP on the table puts it there; a tap on it still turns it;
//   - two TURN buttons: one floating beside the staged piece, one in the tray
//     beside the hand, which turns the piece whether it is in hand or down;
//   - the seal sets in about 0.6 s, not 1;
//   - the table is open (there is no border), and the screen keeps the whole
//     city in view as it grows, easing out to it after each piece;
//   - the day's cast is gone, and with it the tags at the square's corners.
//
// Giardino (2026-11-22) plays on the same screen: a garden wall for the
// castle (garden.js), no sizes, the week under the title, and a SEED PACKET
// under the hand saying what the plant held up needs and who it likes and
// dislikes.
//
// Nothing in here is a rule. It reads the game and calls the same functions
// a click in the workshop would.
// ---------------------------------------------------------------------------

import { STARA_KINDS, STARA_SIZES, WAYS, WAY, turnPiece, tagged, lookString } from './modes/stara.js';
import { GIARDINO_KINDS, PLANTS } from './modes/giardino.js';
import { COMMISSIONS } from './modes/contado.js';
import { CASTLE, keepSprite } from './castle.js';
import { citySprite, spanSprite, SPAN_PAD } from './city.js';
import { usePalette } from './theme.js';
import { TILES } from './tiles.js';
import { VIEWS, fitPoints, LEVEL } from './lowpoly.js';

const TILES_OF = (id) => TILES[id];

const $ = (id) => document.getElementById(id);
// Today's best, per size: the 7 x 7 keeps the key it has had since day 1.
const BEST = (mode, iso) => `tilemakers-workshop/${mode}/best/${iso}`;
// The seventh pass changed how a piece is handled, so everyone is taught again.
const TAUGHT = 'tilemakers-workshop/stara/taught7';
// How the city is looked at (lowpoly.js): the view and the isometric quarter, "iso:0".
const VIEW_KEY = 'tilemakers-workshop/stara/view';
/** A new player sees the model in isometric (2026-11-27: "let's redo ... to make a 3D aesthetic"). */
const DEFAULT_VIEW = 'iso';

const DRAG_PX = 10;

/**
 * THE HOLD. Shorter than TAP is a tap (a turn). The line round the piece
 * starts to run after WAIT, short enough that a hold shows itself at once
 * (2026-11-27: "so you can tell that like holding does something") and long
 * enough that a quick tap barely flickers it; the piece is sealed SEAL after
 * that. About 0.6 s in all since the seventh pass ("the tap and hold to
 * place should be a bit faster"; it was a second). Lifting takes as long.
 */
const TAP = 200, WAIT = 60, SEAL = 560, LIFT = 560;

/** Squares of open table kept in view round the city, for laying the next piece beyond it. */
const MARGIN = 1;

/** localStorage that never throws: a private window just forgets. */
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* forgotten */ } },
};

/**
 * Push follower spots apart until each is its own target, keeping them on the
 * tile. A busy tile puts several anchors within a few pixels of each other;
 * a spot that moved keeps `ax, ay`, where it really means.
 */
export function spreadSpots(spots, r, size) {
  for (let pass = 0; pass < 60; pass++) {
    let moved = false;
    for (let a = 0; a < spots.length; a++) {
      for (let b = a + 1; b < spots.length; b++) {
        const A = spots[a], B = spots[b];
        let dx = B.sx - A.sx, dy = B.sy - A.sy;
        let d = Math.hypot(dx, dy);
        if (d > r * 2.25) continue;
        if (d < 0.01) { dx = (a - b) || 1; dy = 1; d = Math.hypot(dx, dy); }
        const push = (r * 2.25 - d) / 2;
        const ux = dx / d * push, uy = dy / d * push;
        A.sx -= ux; A.sy -= uy; B.sx += ux; B.sy += uy;
        moved = true;
      }
    }
    for (const sp of spots) {
      sp.sx = Math.max(r * 1.1, Math.min(size - r * 1.1, sp.sx));
      sp.sy = Math.max(r * 1.1, Math.min(size - r * 1.1, sp.sy));
    }
    if (!moved) break;
  }
  return spots;
}

/**
 * A piece drawn whole into a square canvas of `px` pixels, turned `rot`,
 * each square as it will look on the board (joined to its piece-mates).
 */
export function drawPiece(ctx, piece, rot, px) {
  const cells = turnPiece(piece, rot);
  const w = Math.max(...cells.map((c) => c.dx)) + 1, h = Math.max(...cells.map((c) => c.dy)) + 1;
  const cs = px / Math.max(w, h);
  const ox = (px - w * cs) / 2, oy = (px - h * cs) / 2;
  const own = new Set(cells.map((c) => `${c.dx},${c.dy}`));
  const step = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  ctx.clearRect(0, 0, px, px);
  for (const c of cells) {
    const type = TILES[c.type];
    const x = ox + c.dx * cs, y = oy + c.dy * cs;
    if (type.keep) { ctx.drawImage(keepSprite(cs), x, y, cs + 0.5, cs + 0.5); continue; }
    if (type.above) {
      // An aqueduct, drawn on nothing, as it will stand over the city.
      const sides = (type.span || []).map((d) => (d + c.rot) % 4);
      const pad = SPAN_PAD * cs;
      ctx.drawImage(spanSprite(sides, false, cs), x - pad, y - pad, cs + pad * 2, cs + pad * 2);
      continue;
    }
    let joined = '';
    for (let s = 0; s < 4; s++) if (own.has(`${c.dx + step[s][0]},${c.dy + step[s][1]}`)) joined += s;
    ctx.drawImage(citySprite(type, c.rot, lookString(type.place, '', joined, piece.id), cs), x, y, cs + 0.5, cs + 0.5);
  }
  return { cs, w, h };
}

export class StaraUI {
  /**
   * `host` is main.js, as a handful of functions: the game, the staged
   * placement and the things that can be done to it, a new game, switching
   * to a game of another size, the renderer, and how to draw a tile.
   */
  constructor(host) {
    this.h = host;
    this.shown = null;         // what the hand looked like when last drawn
    this.lastScore = null;
    this.recorded = null;      // the game whose result has been saved
    this.layoutKey = '';
    this.press = null;         // a finger on a card: tap, or the start of a drag
    this.held = null;          // a finger held on the board: sealing, or lifting
    const [kind, q] = (store.get(VIEW_KEY) || `${DEFAULT_VIEW}:0`).split(':');
    host.renderer.setView(VIEWS.some((v) => v.id === kind) ? kind : DEFAULT_VIEW, Number(q) || 0);
    this.wire();
  }

  get game() { return this.h.game(); }
  get on() { return !!this.game?.spec?.table; }
  get city() { return !!this.game?.spec?.city; }

  wire() {
    $('staraCards').addEventListener('pointerdown', (e) => this.down(e));
    window.addEventListener('pointermove', (e) => this.move(e));
    window.addEventListener('pointerup', (e) => this.up(e));
    window.addEventListener('pointercancel', () => this.cancelDrag());
    // The board: a hold seals the staged piece, or lifts a laid one. These
    // are on the canvas before main.js's own, so they hear a press first.
    const cv = this.h.renderer.canvas;
    cv.addEventListener('pointerdown', (e) => this.boardDown(e));
    cv.addEventListener('pointermove', (e) => this.boardMove(e));
    cv.addEventListener('pointerup', (e) => this.boardUp(e));
    cv.addEventListener('pointercancel', () => this.cancelHold());
    // SAFARI'S LONG PRESS (2026-11-27: "tapping and holding highlights stuff
    // in Safari ... we currently can't put down the seal without doing that
    // as well"). On iOS a finger held still is the start of a text selection
    // (the blue highlight and the loupe) or of a callout menu, and when one
    // starts Safari cancels the pointer, which ended the hold before the seal
    // could set. The stylesheet takes selection and callouts away from the
    // whole stage; this refuses the touch's default action outright on the
    // board and the cards, which stops all of it, gestures and selection
    // alike. Pointer events, which is all Starà listens to, still arrive.
    const refuse = (e) => { if (this.on) e.preventDefault(); };
    for (const el of [cv, $('staraCards')]) {
      el.addEventListener('touchstart', refuse, { passive: false });
      el.addEventListener('contextmenu', refuse);
    }
    document.addEventListener('selectstart', (e) => {
      const el = e.target?.nodeType === 1 ? e.target : e.target?.parentElement;
      if (this.on && el?.closest?.('#stage')) e.preventDefault();
    });
    // The two turn buttons (the seventh pass): beside the staged piece, and in the tray.
    for (const id of ['staraTurn', 'staraRotate']) {
      $(id).addEventListener('pointerdown', (e) => e.stopPropagation());
      $(id).onclick = (e) => { e.preventDefault(); this.turn(1); };
    }
    $('staraMenu').onclick = () => this.togglePanel();
    $('staraAgain').onclick = () => this.h.newGame(this.game.mode);
    $('staraShare').onclick = () => this.share();
    $('staraFinish').onclick = () => { if (this.game.m.endDay?.()) this.h.sync(); };
    $('staraPlan').onclick = () => this.peek(true);
    $('staraBack').onclick = () => this.peek(false);
    // The two sizes: a game of each is kept while you go between them.
    const sizes = $('staraSizes');
    sizes.innerHTML = STARA_SIZES.map((s) => `<button data-mode="${s.id}">${s.side}×${s.side}</button>`).join('');
    sizes.onclick = (e) => {
      const id = e.target.closest('button')?.dataset.mode;
      if (id && id !== this.game.mode) this.h.switchTo(id);
    };
    // The ways to look: the inked table, the model from above, the model in
    // isometric. A touch on Iso while it is the view turns it a quarter.
    const views = $('staraViews');
    views.innerHTML = VIEWS.map((v) => `<button data-view="${v.id}" title="${v.about}">${v.name}</button>`).join('');
    views.onclick = (e) => {
      const id = e.target.closest('button')?.dataset.view;
      if (id) this.look(id);
    };
  }

  /** Look at the city another way, or turn the isometric view a quarter. */
  look(id) {
    const r = this.h.renderer;
    const q = id === 'iso' && r.viewKind === 'iso' ? (r.viewQuarter + 1) & 3 : r.viewQuarter;
    if (id === r.viewKind && id !== 'iso') return;
    r.setView(id, q);
    store.set(VIEW_KEY, `${id}:${q}`);
    this.h.sound?.('rotate');
    this.refit();
    this.h.sync();
  }

  // --- the frame ------------------------------------------------------------

  /** Called whenever the workshop's panel would redraw. */
  sync() {
    const on = this.on;
    const was = document.body.classList.contains('stara');
    document.body.classList.toggle('stara', on);
    if (!on) document.body.classList.remove('staraPanel', 'garden', 'city');
    $('stara').hidden = !on;
    // Coming or going, the panel has moved and the board's canvas with it.
    if (was !== on) { this.h.renderer.resize(); this.refit(); }
    if (!on) return;
    // The long form's land has heights the inked table cannot show, so it
    // has only the model (src/modes/contado.js): settled before the camera is.
    const r = this.h.renderer;
    if (this.city && this.game.spec.land && r.viewKind === 'ink') r.setView('iso', r.viewQuarter);
    this.fit();

    const g = this.game, p = g.players[0];
    const garden = !!g.spec.garden;
    document.body.classList.toggle('garden', garden);
    document.body.classList.toggle('city', this.city);
    document.querySelector('#stara .staraName').textContent = g.spec.title || 'Starà';
    $('staraDay').textContent = garden ? `No. ${g.m.day.n} · week ${g.m.week}`
      : g.m.headline ? g.m.headline()
        : this.city ? `No. ${g.m.day.n} · the plan ${g.m.par}` : `No. ${g.m.day.n}`;
    const sized = STARA_SIZES.some((s) => s.id === g.mode);
    $('staraSizes').style.display = sized ? '' : 'none';
    for (const b of $('staraSizes').children) b.classList.toggle('on', b.dataset.mode === g.mode);
    // The ways to look are the city's: a garden has only its ink, and the
    // long form only the model.
    $('staraViews').style.display = this.city ? '' : 'none';
    for (const b of $('staraViews').children) {
      const id = b.dataset.view;
      b.hidden = !!g.spec.land && id === 'ink';
      b.classList.toggle('on', id === r.viewKind);
      b.innerHTML = id === 'iso' && r.viewKind === 'iso' ? `${VIEWS[2].name}<span class="turnGlyph">↻</span>` : VIEWS.find((v) => v.id === id).name;
    }
    const score = $('staraScore');
    score.textContent = p.score;
    if (this.lastScore != null && p.score > this.lastScore) {
      score.classList.remove('bump');
      void score.offsetWidth;            // restart the animation
      score.classList.add('bump');
    }
    this.lastScore = p.score;
    $('staraPile').textContent = g.deck.length;
    $('staraPileWrap').title = `${g.deck.length} ${this.city ? 'pieces' : 'tiles'} left in the pile`;
    this.drawHand();
    this.drawStuck();
    this.placeTurn();
    this.showEnd();
  }

  /**
   * The board fills the band between the top bar and the tray, as big as
   * fits, and stays exactly there: no panning, no zoom by hand. Giardino's
   * square is fitted edge to edge. Starà's city has no border (the seventh
   * pass), so the screen keeps the whole of it in view, the spring and the
   * aqueduct with it and MARGIN squares of open table round it, never less
   * than its plan's size and two; when the city grows past that, the camera
   * eases out to it after the piece is sealed, never while you are placing.
   */
  fit(force = false) {
    const stage = $('stage').getBoundingClientRect();
    const top = $('staraTop').getBoundingClientRect().height;
    const tray = $('staraTray').getBoundingClientRect().height;
    const g = this.game;
    const r = this.h.renderer;
    const open = this.city && g.m.extent;
    const b = open ? g.m.extent() : g.board.bounds;
    r.applyView(g);
    const key = [stage.width, stage.height, top, tray, b.minX, b.maxX, b.minY, b.maxY, r.view.kind, r.view.quarter].join('|');
    if (!force && key === this.layoutKey) return;
    if (this.held?.dragging || this.press?.dragging) return;       // never while a piece is in the hand
    const first = !this.layoutKey || force;
    this.layoutKey = key;
    let across = b.maxX - b.minX + 1, down = b.maxY - b.minY + 1;
    let gutter, reach;
    if (open) {
      const least = g.m.side + 2;
      across = Math.max(least, across + MARGIN * 2);
      down = Math.max(least, down + MARGIN * 2);
      gutter = 8;
      reach = 0;
    } else {
      // Edge to edge (2026-11-18: "push the square to the edge of the left
      // and right"): the wall's corner towers touch the sides of the screen.
      gutter = 30;
      reach = CASTLE.reach * 2;
    }
    const availW = stage.width;
    const availH = stage.height - top - tray - gutter * 2;
    let zoom = Math.max(24, Math.min(150, Math.floor(Math.min(availW / (across + reach), availH / (down + reach)))));
    const midY = top + gutter + availH / 2;
    let x = (b.minX + b.maxX + 1) / 2;
    let y = (b.minY + b.maxY + 1) / 2 - (midY - stage.height / 2) / zoom;
    if (open && r.model3d && r.view.kind === 'iso') {
      // The isometric view: every square built (and the spring, and the
      // aqueduct's spans) with MARGIN squares of table round it, its towers
      // standing up out of it, and at least a box of the plan's size less
      // two round the Comune, fitted as a picture. Fitted to the city's own
      // shape rather than a box round it, since a box's diamond is wide and
      // a phone is not.
      const pts = [];
      const lvl = (i, j) => (g.m.levelAt ? g.m.levelAt(i, j) * LEVEL : 0);
      const add = (i, j) => {
        const l = lvl(i, j);
        for (const [a, c] of [[-MARGIN, -MARGIN], [1 + MARGIN, -MARGIN], [1 + MARGIN, 1 + MARGIN], [-MARGIN, 1 + MARGIN]]) {
          pts.push([i + a, j + c, l], [i + a, j + c, l + 0.9]);
        }
      };
      for (const c of g.board.cells.values()) add(c.x, c.y);
      for (const s of g.m.water.spans.values()) add(s.x, s.y);
      add(g.m.water.spring.x, g.m.water.spring.y);
      const least = Math.max(1, (g.m.side - 2) / 2);
      for (const [a, c] of [[-least, -least], [least, -least], [least, least], [-least, least]]) pts.push([0.5 + a, 0.5 + c, 0]);
      const f = fitPoints(r.view, pts, availW, availH, midY - stage.height / 2);
      zoom = Math.max(14, Math.min(150, Math.floor(f.zoom)));
      ({ x, y } = fitPoints(r.view, pts, availW, availH, midY - stage.height / 2, zoom));
    }
    if (first || !open) {
      r.cam.zoom = zoom; r.cam.x = x; r.cam.y = y; r.glide = null;
    } else {
      r.glide = { x0: r.cam.x, y0: r.cam.y, x1: x, y1: y, z0: r.cam.zoom, z1: zoom, t0: performance.now(), dur: 420 };
    }
  }

  /** Fit again on the next sync: a new game, or the window changed. */
  refit() { this.layoutKey = ''; }

  togglePanel(open = !document.body.classList.contains('staraPanel')) {
    document.body.classList.toggle('staraPanel', open);
    this.h.renderer.resize();
    this.fit(true);
  }

  // --- the hand ---------------------------------------------------------------

  /** The rotation a card in hand is drawn at: the held one as the game holds it. */
  rotOf(i) {
    const g = this.game, pending = this.h.pending();
    if (i === g.m.sel) return pending ? pending.rot : g.rot;
    return this.city ? (g.m.rots?.[g.m.hand[i]] ?? 0) : 0;
  }

  /**
   * The hand, as cards in the tray: the one held up raised and ringed, the
   * rest beside it, all the same size, smaller the more you hold (two rows
   * past four). The piece held up leaves the tray while it sits on the board.
   */
  drawHand() {
    const g = this.game;
    const host = $('staraCards');
    const hand = g.phase === 'place' ? g.m.hand : [];
    const pending = this.h.pending();
    const sel = g.m.sel;
    const n = hand.length;
    // Giardino's packet and the city's card need the room under the hand, so
    // their cards are smaller.
    const size = this.city ? (n <= 1 ? 100 : n === 2 ? 90 : n === 3 ? 78 : 60)
      : g.spec.garden ? (n <= 1 ? 116 : n === 2 ? 100 : n === 3 ? 84 : 62)
      : n <= 1 ? 150 : n === 2 ? 118 : n === 3 ? 88 : 62;
    host.style.setProperty('--card', `${size}px`);
    // One row up to four, two rows past that, the row as wide as the cards
    // still in the tray (not the one sitting on the board).
    const shown = Math.max(1, n - (pending ? 1 : 0));
    const perRow = shown <= 4 ? shown : Math.ceil(shown / 2);
    host.style.width = `${perRow * size + (perRow - 1) * 10}px`;
    // Starà's tiles are inked, and the board may not have drawn a frame yet
    // to say so, so the hand says so itself.
    usePalette('town');

    // Rebuild the cards when the hand itself changes; otherwise only redraw.
    const key = `${g.turn}|${hand.join('.')}|${size}`;
    if (host.dataset.key !== key) {
      const fresh = !this.shown || this.shown.turn !== g.turn;
      host.dataset.key = key;
      host.innerHTML = hand.map((id, i) => `<div class="staraCard${fresh && i === sel ? ' pop' : ''}${this.city ? ' piece' : ''}" data-i="${i}">`
        + `<canvas width="${size * 2}" height="${size * 2}" aria-label="${this.city ? g.m.nameOf(id) : `Tile ${i + 1}`} in your hand"></canvas></div>`).join('');
      this.shown = { turn: g.turn, rots: [] };
    }
    const cards = [...host.children];
    // In the model's views the cards are the model too (lowpoly.js), drawn again when the view changes.
    const r = this.h.renderer;
    const look = this.city && r.model3d ? `${r.view.kind}${r.view.quarter}` : 'ink';
    const drawn = `${key}|${look}`;
    cards.forEach((card, i) => {
      const held = i === sel;
      card.classList.toggle('held', held);
      card.classList.toggle('placed', held && !!pending);
      const rot = this.rotOf(i);
      const canvas = card.firstChild;
      const was = this.shown.rots[i];
      if (was === rot && card.dataset.drawn === drawn) return;
      // A turn is seen as a turn; an isometric picture turned flat on the
      // screen is not the piece turned, so there it is simply drawn again.
      if (held && was != null && was !== rot && look.slice(0, 3) !== 'iso') this.spin(canvas, rot - was);
      this.shown.rots[i] = rot;
      card.dataset.drawn = drawn;
      const ctx = canvas.getContext('2d');
      const px = canvas.width;
      if (this.city) {
        const piece = g.m.pieces[hand[i]];
        const cells = turnPiece(piece, rot);
        const w = Math.max(...cells.map((c) => c.dx)) + 1, h = Math.max(...cells.map((c) => c.dy)) + 1;
        if (look === 'ink' || !r.drawPieceModel(ctx, cells, px)) drawPiece(ctx, piece, rot, px);
        card.dataset.span = String(Math.max(w, h));
        return;
      }
      ctx.clearRect(0, 0, px, px);
      ctx.save();
      ctx.translate(px / 2, px / 2);
      ctx.rotate(rot * Math.PI / 2);
      ctx.translate(-px / 2, -px / 2);
      ctx.scale(px, px);
      this.h.drawTile(ctx, TILES_OF(hand[i]), { terrain: 'surface', rot });
      ctx.restore();
    });
    $('staraTray').classList.toggle('many', n > 4);
    this.caption(n ? hand[sel] : null, pending, n);
  }

  /**
   * The card has been drawn at its new rotation; start it at the old one and
   * let it settle, so the tile is seen to TURN rather than to be replaced.
   */
  spin(canvas, steps) {
    const d = ((steps % 4) + 4) % 4;
    const from = d === 1 ? -90 : d === 3 ? 90 : 180;
    canvas.style.transition = 'none';
    canvas.style.transform = `rotate(${from}deg)`;
    void canvas.offsetWidth;
    canvas.style.transition = '';
    canvas.style.transform = '';
  }

  /**
   * One quiet line under the hand for your first few tiles in Starà, ever,
   * and then nothing: by then the tiles and the lit squares say it.
   */
  caption(heldId, pending, n) {
    const el = $('staraCaption');
    if (this.game.spec.garden) return this.packet(el, heldId, pending);
    if (this.city) return this.card(el, heldId, pending);
    el.textContent = '';
  }

  /** How to play, for your first few turns ever: a line under the card. */
  lesson(pending) {
    const taught = Number(store.get(TAUGHT) || 0);
    const key = `${this.game.turn}`;
    if (this.taughtFor !== key) { this.taughtFor = key; store.set(TAUGHT, String(taught + 1)); }
    if (taught >= 10) return '';
    const it = this.city ? 'piece' : 'tile';
    return pending ? `Drag the ${it} where you like, turn it with the button, and hold it still to seal it.`
      : `Drag a card onto the table, or touch a lit square to put the ${it} there.`;
  }

  /**
   * GIARDINO'S SEED PACKET, for the plant held up: its name, what water it
   * wants, how many weeks it takes, what it yields, and its friends and foes.
   * Always shown (it is the plant's rules, not a lesson), in one short line
   * and a second for its company.
   */
  packet(el, heldId, pending) {
    const info = heldId ? this.game.m.packet(heldId) : null;
    if (!info) { el.innerHTML = ''; return; }
    const names = (ids) => ids.map((k) => PLANTS[k].name.toLowerCase()).join(', ');
    const repeat = info.again ? `, then every ${info.again}` : '';
    const drop = info.water === 'thirsty' ? '<i class="drop wet"></i>' : info.water === 'dry' ? '<i class="drop dry"></i>' : '<i class="drop"></i>';
    const friends = info.friends.length > 6 ? 'every vegetable' : names(info.friends);
    const foes = info.foes.length > 6 ? 'every vegetable' : names(info.foes);
    const how = this.lesson(pending);
    el.innerHTML = `<div class="packetTop"><b>${info.name}</b> ${drop}<span>${info.need}</span>`
      + `<span>${info.weeks} weeks${repeat}</span><span>yields ${info.yield}</span></div>`
      + `<div class="packetCo">${friends ? `<span class="fr">+ ${friends}</span>` : ''}${foes ? `<span class="fo">− ${foes}</span>` : ''}`
      + `${!friends && !foes ? '<span>no friends or foes</span>' : ''}</div>`
      + (how ? `<div class="packetHow">${how}</div>` : '');
  }

  /**
   * THE CITY'S CARD, for the piece held up: its place, how many squares,
   * a line of what it is, and what it wants, as chips in the colour of the
   * way each is paid (stara-city.js, WAYS). Made by stara.js from the table
   * that scores it, so it can never say other than what pays.
   */
  card(el, heldId, pending) {
    const info = heldId ? this.game.m.card(heldId) : null;
    if (!info) { el.innerHTML = ''; return; }
    const how = this.lesson(pending);
    const squares = info.squares > 1 ? `<span class="sq">${info.squares} squares</span>` : '';
    // What it is, when there is room for it; its chips come first.
    const about = info.chips.length + info.powers.length <= 3 ? `<span>${info.about}</span>` : '';
    el.title = info.about;
    el.innerHTML = `<div class="packetTop"><b>${info.name}</b>${squares}${about}</div>`
      + `<div class="packetCo">${info.chips.map((c) => `<span class="way ${c.loss ? 'loss' : c.way}">${c.text}</span>`).join('')}`
      + `${info.powers.map((t) => `<span class="power">${t}</span>`).join('')}</div>`
      + (how ? `<div class="packetHow">${how}</div>` : '');
  }

  /**
   * NOTHING FITS: none of the pieces in hand can go anywhere. Say so, and
   * offer the two ways on: lift a piece, or end the day as it stands.
   */
  drawStuck() {
    const g = this.game, el = $('staraStuck');
    let stuck = false;
    if (this.city && g.phase === 'place') {
      const key = g.m.signature();
      if (this.stuckKey !== key) { this.stuckKey = key; this.stuckValue = !g.m.anyFits(); }
      stuck = this.stuckValue;
    }
    el.hidden = !stuck;
    $('staraFinish').textContent = g.spec.long ? 'End the year' : 'End the day';
    $('staraTray').classList.toggle('stuck', stuck);
  }

  // --- turning ------------------------------------------------------------------

  /**
   * Turn the piece held up a quarter: on the table, about the square it is
   * held by (it shows in red if it no longer fits there); in hand, as it
   * will go down. The turn buttons, the tap on a staged piece, R and a right
   * click all come here.
   */
  turn(dir = 1) {
    const g = this.game;
    if (!this.on || g.phase !== 'place' || !g.tile) return false;
    const p = this.h.pending();
    if (!p) {
      g.rotate(dir);
      this.h.sound?.('rotate');
      this.h.sync();
      return true;
    }
    if (this.city) {
      const st = g.m.turnStaged(p, dir);
      if (!st) return false;
      g.rot = st.rot;
      this.h.setPending({ ...p, ...st });
    } else {
      const rot = (p.rot + dir + 4) % 4;
      g.rot = rot;
      this.h.setPending({ ...p, rot, fits: this.h.legal(p.x, p.y).includes(rot) });
    }
    this.h.sound?.('rotate');
    return true;
  }

  /**
   * The turn button beside the staged piece: just off its upper right
   * corner (its upper left, if that would leave the screen), and hidden
   * while nothing is staged or a piece is being dragged.
   */
  placeTurn() {
    const btn = $('staraTurn');
    const g = this.game, p = this.h.pending();
    const show = this.on && g.phase === 'place' && !!p && !this.held?.dragging && !this.press?.dragging;
    $('staraRotate').hidden = !(this.on && g.phase === 'place' && g.tile);
    if (!show) { btn.hidden = true; return; }
    const cells = this.pendingCells();
    const r = this.h.renderer;
    const stage = $('stage').getBoundingClientRect(), cv = r.canvas.getBoundingClientRect();
    // The piece's outline on the screen, whichever way the table is seen
    // (in the isometric view its squares are diamonds): the button goes
    // off its upper right, or its upper left if that would leave the screen.
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity;
    for (const c of cells) {
      for (const [a, b] of [[0, 0], [1, 0], [1, 1], [0, 1]]) {
        const [px, py] = r.toScreen(c.x + a, c.y + b);
        x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py);
      }
    }
    const ox = cv.left - stage.left, oy = cv.top - stage.top;
    const top = $('staraTop').getBoundingClientRect().height + 4;
    let sx = x1 + ox + 6, sy = y0 + oy - 22;
    if (sx + 48 > stage.width) {
      // In the isometric view the squares to the left of a piece are the
      // city behind it, so the button goes over the piece instead.
      const over = r.model3d && r.view.kind === 'iso' && y0 + oy - 56 >= top;
      if (over) { sx = (x0 + x1) / 2 + ox - 23; sy = y0 + oy - 56; } else sx = x0 + ox - 50;
    }
    btn.style.left = `${Math.round(sx)}px`;
    btn.style.top = `${Math.round(Math.max(sy, top))}px`;
    btn.hidden = false;
  }

  /** Is this pointer over the tray (where a piece goes back into the hand)? */
  overTray(e) { return e.clientY >= $('staraTray').getBoundingClientRect().top; }

  /**
   * Put the held piece on the table over (x, y), held by square `grip` of it,
   * turned `rot`: staged there whether it fits or not (freeform), and with
   * `magnet`, moved to the nearest way it fits under (x, y) if there is one.
   * In the garden a plant is one square, kept inside the wall, and a tap
   * turns it to a way it fits if the way it is held does not.
   */
  put(x, y, { grip = null, magnet = true, rot = this.game.rot } = {}) {
    const g = this.game;
    if (g.phase !== 'place' || !g.tile) return false;
    if (this.city) {
      const st = g.m.stageAt(x, y, rot, { grip, magnet });
      if (!st) return false;
      g.rot = st.rot;
      this.h.setPending({ x: st.x, y: st.y, rot: st.rot, rots: [0, 1, 2, 3], ax: st.ax, ay: st.ay, grip: st.grip, fits: st.fits });
      return true;
    }
    if (!g.board.inBounds(x, y) || g.board.get(x, y)) return false;
    const rots = this.h.legal(x, y);
    const turned = magnet && rots.length && !rots.includes(rot) ? rots[0] : rot;
    g.rot = turned;
    this.h.setPending({ x, y, rot: turned, rots: [0, 1, 2, 3], fits: rots.includes(turned) });
    return true;
  }

  // --- touching the cards -----------------------------------------------------

  down(e) {
    const g = this.game;
    const card = e.target.closest('.staraCard');
    if (!this.on || !card || g.phase !== 'place') return;
    e.preventDefault();
    const i = Number(card.dataset.i);
    // Touching another card holds it up instead, and takes back whatever was
    // sitting on the board: that was the other piece.
    let picked = false;
    if (i !== g.m.sel) {
      if (this.h.pending()) this.h.clear();
      picked = g.m.select(i);
    }
    this.press = { id: e.pointerId, i, x: e.clientX, y: e.clientY, dragging: false, picked };
  }

  /** The card a finger is on (by its place in the hand, which the redraw keeps). */
  cardAt(i) { return $('staraCards').querySelector(`.staraCard[data-i="${i}"]`); }

  /** The square of the table under a pointer, if it is over the table and not the tray. */
  tableCell(e) {
    const r = this.h.renderer, cv = r.canvas.getBoundingClientRect();
    const inside = e.clientX >= cv.left && e.clientX <= cv.right && e.clientY >= cv.top && e.clientY <= cv.bottom;
    if (!inside || this.overTray(e) || e.clientY <= $('staraTop').getBoundingClientRect().bottom) return null;
    const c = r.cellAt(e.clientX - cv.left, e.clientY - cv.top);
    if (!this.city && !this.game.board.inBounds(c.x, c.y)) return null;
    return c;
  }

  move(e) {
    const p = this.press;
    if (!p || p.id !== e.pointerId) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    const wrap = this.cardAt(p.i);
    if (!wrap) return;
    if (!p.dragging && Math.hypot(dx, dy) > DRAG_PX) {
      p.dragging = true;
      if (this.h.pending()) this.h.clear();
      wrap.classList.add('lifted');
      this.placeTurn();
    }
    if (!p.dragging) return;
    // Picked up, the card shrinks to the size its piece will be on the board
    // and follows the finger; over the table the piece itself is put down
    // under the finger, square by square, fitting or not, and the card
    // steps aside for it.
    const r = this.h.renderer;
    const span = Number(wrap.dataset.span || 1);
    wrap.style.translate = `${dx}px ${dy}px`;
    wrap.style.scale = String(Math.min(1, (r.cam.zoom * span) / wrap.offsetWidth));
    const cell = this.tableCell(e);
    if (cell && (cell.x !== p.last?.x || cell.y !== p.last?.y)) {
      p.last = cell;
      this.put(cell.x, cell.y, { magnet: false });
    } else if (!cell && p.last) {
      p.last = null;
      this.h.clear();
    }
    wrap.classList.toggle('snapped', !!cell);
  }

  up(e) {
    const p = this.press;
    if (!p || p.id !== e.pointerId) return;
    if (!p.dragging) {
      this.press = null;
      // A touch on the card already held up turns it; on another, it was
      // held up by the touch, and that is all.
      if (!p.picked) this.turn(1);
      this.h.sync();
      return;
    }
    const cell = this.tableCell(e);
    this.cancelDrag();
    // Let go over the table, it stays there, snapped to a way it fits under
    // the finger if it has one; anywhere else, it is back in your hand.
    if (cell) this.put(cell.x, cell.y, { grip: this.h.pending()?.grip ?? null, magnet: true });
    else if (this.h.pending()) this.h.clear();
    this.h.sync();
  }

  cancelDrag() {
    const card = this.press ? this.cardAt(this.press.i) : null;
    if (card) {
      card.classList.remove('lifted', 'snapped');
      card.style.translate = '';
      card.style.scale = '';
    }
    this.press = null;
  }

  // --- touching the table -------------------------------------------------------

  /** The squares the staged piece stands on, or the staged tile's one. */
  pendingCells() {
    const p = this.h.pending();
    if (!p) return [];
    if (!this.city) return [{ x: p.x, y: p.y }];
    return this.game.m.preview(p.ax, p.ay, p.rot)?.cells || [{ x: p.x, y: p.y }];
  }

  /** Is (x, y) under the staged piece? */
  inPending(c) { return !!c && this.pendingCells().some((s) => s.x === c.x && s.y === c.y); }

  /** Which of the held piece's own squares is on (x, y), staged as `p`. */
  gripAt(p, c) {
    if (!this.city) return null;
    const sq = tagged(this.game.m.held, p.rot).find((k) => p.ax + k.dx === c.x && p.ay + k.dy === c.y);
    return sq ? sq.i : p.grip;
  }

  cellUnder(e) {
    const r = this.h.renderer, cv = r.canvas.getBoundingClientRect();
    return r.cellAt(e.clientX - cv.left, e.clientY - cv.top);
  }

  /**
   * A finger down on the table. On the staged piece it is the start of a
   * seal if it stays still (where the piece fits), a drag if it moves, and
   * a turn if it comes straight up. On a piece already down (in the city,
   * with nothing staged) it is the start of a lift, or, quick, a tap. Anywhere
   * else, a tap puts the piece there. main.js leaves the table to this
   * while Starà or Giardino is on.
   */
  boardDown(e) {
    const g = this.game;
    if (!this.on) return;
    // Anything a long press elsewhere left selected goes.
    try { window.getSelection?.()?.removeAllRanges(); } catch { /* nothing selected */ }
    if (g.phase !== 'place' || this.held || !g.tile) return;
    const c = this.cellUnder(e);
    const now = performance.now();
    const r = this.h.renderer;
    const p = this.h.pending();
    const base = { id: e.pointerId, x: e.clientX, y: e.clientY, t0: now, at: c };
    if (p && this.inPending(c)) {
      this.held = { ...base, kind: 'staged', grip: this.gripAt(p, c) };
      if (p.fits !== false) {
        r.sealing = { kind: 'seal', t0: now + WAIT, dur: SEAL, at: c, cells: this.pendingCells() };
        this.holdTimer = setTimeout(() => this.finishHold(), WAIT + SEAL);
      } else {
        // Where it does not fit, holding cannot seal it: say so, once.
        this.holdTimer = setTimeout(() => { if (this.held && !this.held.dragging) { this.held.denied = true; this.h.deny(c); } }, WAIT + SEAL * 0.5);
      }
      return;
    }
    const id = this.city && !p ? g.m.pieceAt(c.x, c.y) : null;
    if (id != null) {
      this.held = { ...base, kind: 'lift', piece: id };
      r.sealing = { kind: 'lift', t0: now + WAIT, dur: LIFT, at: c, cells: g.m.squaresOf(id) };
      this.holdTimer = setTimeout(() => this.finishHold(), WAIT + LIFT);
      return;
    }
    this.held = { ...base, kind: 'tap' };
  }

  boardMove(e) {
    const h = this.held;
    if (!h || h.id !== e.pointerId || h.done) return;
    const moved = Math.hypot(e.clientX - h.x, e.clientY - h.y) > DRAG_PX;
    if (h.kind === 'staged' && (moved || h.dragging)) {
      if (!h.dragging) {
        h.dragging = true;
        clearTimeout(this.holdTimer);
        this.h.renderer.sealing = null;
        this.placeTurn();
      }
      const c = this.cellUnder(e);
      const p = this.h.pending();
      if (p && (c.x !== h.last?.x || c.y !== h.last?.y)) {
        h.last = c;
        this.put(c.x, c.y, { grip: h.grip, magnet: false, rot: p.rot });
      }
      return;
    }
    if (moved) this.cancelHold();
  }

  /**
   * The finger comes up. From a drag: over the tray the piece goes back in
   * your hand, over the table it stays, snapped to a way it fits under the
   * finger if it has one. Quick on the staged piece, it turns; quick
   * anywhere else, the piece is put there. A hold that sealed or lifted has
   * already done its work.
   */
  boardUp(e) {
    const h = this.held;
    if (!h || h.id !== e.pointerId) return;
    const quick = performance.now() - h.t0 < TAP;
    clearTimeout(this.holdTimer);
    this.held = null;
    const r = this.h.renderer;
    if (!h.done) r.sealing = null;
    if (e.pointerType && e.pointerType !== 'mouse') r.hover = null;
    if (h.done) return;
    if (h.kind === 'staged') {
      if (h.dragging) {
        if (this.overTray(e)) { this.h.clear(); return; }
        const c = this.cellUnder(e);
        const p = this.h.pending();
        this.put(c.x, c.y, { grip: h.grip, magnet: true, rot: p?.rot ?? this.game.rot });
        this.h.sync();
        return;
      }
      if (quick && !h.denied) this.turn(1);
      return;
    }
    if (quick) this.put(h.at.x, h.at.y);
  }

  cancelHold() {
    clearTimeout(this.holdTimer);
    const r = this.h.renderer;
    if (r.sealing) r.sealing = null;
    if (this.held && !this.held.done) this.held = null;
  }

  /** The hold has lasted: seal the staged piece, or lift the laid one. */
  finishHold() {
    const h = this.held, g = this.game, r = this.h.renderer;
    if (!h || h.done) return;
    h.done = true;
    r.sealing = null;
    if (h.kind === 'staged') {
      const [sx, sy] = r.toScreen(h.at.x + 0.5, h.at.y + 0.5);
      const cv = r.canvas.getBoundingClientRect();
      this.sealedAt = { x: cv.left + sx, y: cv.top + sy, t: performance.now() };
      r.sealed = { t0: performance.now(), at: h.at, cells: this.pendingCells() };
      // A tick in the hand where the phone can give one (Android; Safari
      // has no vibration).
      try { navigator.vibrate?.(18); } catch { /* none */ }
      this.h.commit();
      return;
    }
    if (h.kind === 'lift') {
      if (this.h.pending()) this.h.clear();
      if (g.m.lift(h.piece)) this.h.sync();
    }
  }

  /** Where a laid tile flies in from: where it was sealed, so it does not fly at all. */
  entry() {
    if (this.sealedAt && performance.now() - this.sealedAt.t < 500) return this.sealedAt;
    const c = $('staraCards').getBoundingClientRect();
    return { x: c.left + c.width / 2, y: c.top + c.height / 2 };
  }

  // --- the end ----------------------------------------------------------------

  showEnd() {
    const g = this.game;
    const end = $('staraEnd');
    const peeking = this.city && g.m.showingPlan;
    $('staraPlanBar').hidden = !peeking;
    if (g.phase !== 'over' || peeking) { end.hidden = true; return; }
    const score = g.players[0].score;
    const key = BEST(g.mode, g.m.day.iso);
    const before = Number(store.get(key) || NaN);
    if (this.recorded !== g) {
      this.recorded = g;
      this.priorBest = Number.isFinite(before) ? before : null;
      if (!Number.isFinite(before) || score > before) store.set(key, String(score));
    }
    const prior = this.priorBest;
    const t = g.m.tally;
    const garden = !!g.spec.garden;
    const long = !!g.spec.long;
    $('staraEndDay').innerHTML = long ? `${g.spec.title}<small>${g.m.year} year${g.m.year === 1 ? '' : 's'}</small>`
      : `${g.spec.title || 'Starà'}<small>No. ${g.m.day.n} · ${g.m.side}×${g.m.side}</small>`;
    $('staraEndScore').textContent = score;
    if (garden) {
      $('staraEndRows').innerHTML = GIARDINO_KINDS
        .map(([k, name]) => `<div><span>${name}</span><i></i><b>${t[k]}</b></div>`).join('');
    } else {
      const num = (n) => (n < 0 ? `−${-n}` : `${n}`);
      const rows = WAYS.map((w) => `<div class="w-${w.id}"><span><em class="dot" style="background:${w.colour}"></em>${w.name}</span><i></i><b>${num(t[w.id])}</b></div>`);
      if (t.lifts) rows.push(`<div class="w-lift"><span><em class="dot lift"></em>Lifted</span><i></i><b>${num(t.lifts)}</b></div>`);
      if (long) rows.push(`<div class="w-commission"><span><em class="dot" style="background:#e0a823"></em>Commissions met</span><i></i><b>${num(t.commissions || 0)}</b></div>`);
      $('staraEndRows').innerHTML = rows.join('');
    }
    const wall = this.city ? g.m.city.wall : [];
    const gates = wall.filter((w) => w.gate).length;
    $('staraEndFill').textContent = garden
      ? `${g.m.picked} pickings in ${g.m.week} weeks; ${g.m.lost.length} still green at the frost`
      : long ? `A wall ${wall.length} stretches long, ${wall.filter((w) => w.slope).length} of them on a slope; ${g.m.laid.size} pieces laid`
        : `A wall ${wall.length} stretches long, ${gates} of them gates; ${g.m.laid.size} of ${Object.keys(g.m.pieces).length} pieces laid`;
    $('staraEndPar').hidden = garden;
    $('staraPlan').hidden = garden || long;
    if (long) {
      const m = g.m.missed;
      $('staraEndPar').textContent = m ? `In year ${g.m.year} the Signoria asked for ${COMMISSIONS[m.ask].text(m.target)}, and the city had ${m.had}.` : 'The run was ended.';
    } else if (!garden) {
      const par = g.m.par;
      $('staraEndPar').textContent = score > par ? `The architect's plan was worth ${par}: you built better than the plan.`
        : score === par ? `The architect's plan was worth ${par}: you matched it.`
          : `The architect's plan was worth ${par}: ${par - score} more to find.`;
    }
    $('staraEndBest').textContent = long
      ? (prior == null ? 'Your first run.' : score > prior ? `A new best run (was ${prior}).` : score === prior ? 'Level with your best run.' : `Your best run: ${prior}.`)
      : prior == null ? (garden ? 'Your first garden today.' : 'Your first city today.')
        : score > prior ? `A new best for today (was ${prior}).`
          : score === prior ? 'Level with your best today.'
            : `Your best today: ${prior}.`;
    $('staraAgain').textContent = long ? 'A new run' : 'Play again';
    end.hidden = false;
  }

  /** Show the architect's plan on the table, or your city again. */
  peek(on) {
    const g = this.game;
    if (!this.city || !g.m.showPlan(on)) return;
    $('staraPlanText').textContent = `The architect's plan, worth ${g.m.par}. Yours: ${g.players[0].score}.`;
    this.h.sync();
  }

  async share() {
    const g = this.game;
    const text = g.spec.garden
      ? `Giardino No. ${g.m.day.n}: ${g.players[0].score} points, ${g.m.picked} pickings, ${g.m.lost.length} lost to the frost.`
      : g.spec.long ? `Contado: a city worth ${g.players[0].score} after ${g.m.year} years.`
      : `Starà No. ${g.m.day.n} (${g.m.side}×${g.m.side}): a city worth ${g.players[0].score}, the plan ${g.m.par}, a wall ${g.m.city.wall.length} long.`;
    const btn = $('staraShare');
    try {
      if (navigator.share) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); btn.textContent = 'Copied'; }
    } catch { btn.textContent = 'Could not share'; }
    setTimeout(() => { btn.textContent = 'Share'; }, 1600);
  }
}

export { WAY, STARA_KINDS };
