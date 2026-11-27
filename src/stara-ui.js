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
// seal button is gone. A HOLD on the staged piece pours a drop of red wax on
// it, the die comes down into it, and at the end of the hold the piece is
// sealed to the table (render.js, drawWaxSeal); let go early and the wax
// lifts away and nothing is laid. A tap is still a turn. Giardino, which
// plays on this screen, seals the same way. In the city:
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
// Giardino (2026-11-22) plays on the same screen: a garden wall for the
// castle (garden.js), no sizes, the week under the title, and a SEED PACKET
// under the hand saying what the plant held up needs and who it likes and
// dislikes.
//
// Nothing in here is a rule. It reads the game and calls the same functions
// a click in the workshop would.
// ---------------------------------------------------------------------------

import { STARA_KINDS, STARA_SIZES, CAST, PLACES, WAYS, WAY, turnPiece, lookString } from './modes/stara.js';
import { GIARDINO_KINDS, PLANTS } from './modes/giardino.js';
import { CASTLE, keepSprite } from './castle.js';
import { citySprite } from './city.js';
import { usePalette } from './theme.js';
import { TILES } from './tiles.js';

const TILES_OF = (id) => TILES[id];

const $ = (id) => document.getElementById(id);
// Today's best, per size: the 7 x 7 keeps the key it has had since day 1.
const BEST = (mode, iso) => `tilemakers-workshop/${mode}/best/${iso}`;
const TAUGHT = 'tilemakers-workshop/stara/taught';

/** A small emblem for each kind of the day's cast, drawn in ink on its tag (20 x 20). */
const EMBLEMS = {
  faith: '<path d="M10 2 V18 M5 7 H15"/>',
  defence: '<path d="M4 17 V6 H6 V4 H8 V6 H12 V4 H14 V6 H16 V17 Z M9 17 V13 H11 V17"/>',
  industry: '<circle cx="10" cy="10" r="6"/><path d="M10 2 V18 M2 10 H18 M4.5 4.5 L15.5 15.5 M15.5 4.5 L4.5 15.5"/>',
  wonder: '<path d="M10 2 L12 8 L18 8 L13 12 L15 18 L10 14 L5 18 L7 12 L2 8 L8 8 Z"/>',
};
/** Each kind's tincture, for its tag's underline. */
const TINCTURES = { faith: '#3e66b0', defence: '#b23a2c', industry: '#d9a338', wonder: '#7b4f93' };
const DRAG_PX = 10;

/**
 * THE HOLD. Shorter than TAP is a tap (a turn). The wax starts to show after
 * WAIT, so a tap never flashes it, and the piece is sealed SEAL after that:
 * about a second in all. Lifting a piece takes a little less.
 */
const TAP = 220, WAIT = 140, SEAL = 900, LIFT = 760;

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
    this.swallowNext = false;  // the release that ended a hold is not a tap
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
    this.fit();

    const g = this.game, p = g.players[0];
    const garden = !!g.spec.garden;
    document.body.classList.toggle('garden', garden);
    document.body.classList.toggle('city', this.city);
    document.querySelector('#stara .staraName').textContent = g.spec.title || 'Starà';
    $('staraDay').textContent = garden ? `No. ${g.m.day.n} · week ${g.m.week}`
      : this.city ? `No. ${g.m.day.n} · the plan ${g.m.par}` : `No. ${g.m.day.n}`;
    $('staraSizes').style.display = garden ? 'none' : '';
    for (const b of $('staraSizes').children) b.classList.toggle('on', b.dataset.mode === g.mode);
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
    this.drawCast();
    this.drawAhead();
    this.drawStuck();
    this.showEnd();
  }

  /**
   * The square fills the band between the top bar and the tray, as big as
   * fits, and stays exactly there: no panning, no zoom. Starà is a phone
   * screen's worth of table, and you should never have to look for it.
   */
  fit(force = false) {
    const stage = $('stage').getBoundingClientRect();
    const top = $('staraTop').getBoundingClientRect().height;
    const tray = $('staraTray').getBoundingClientRect().height;
    const b = this.game.board.bounds;
    const key = [stage.width, stage.height, top, tray, b.maxX - b.minX].join('|');
    if (!force && key === this.layoutKey) return;
    this.layoutKey = key;
    const r = this.h.renderer;
    const across = b.maxX - b.minX + 1, down = b.maxY - b.minY + 1;
    // Edge to edge (2026-11-18: "push the square to the edge of the left and
    // right"): the castle's corner towers touch the sides of the screen. Room
    // is kept above and below for the cast's tags.
    const gutter = 30;
    const reach = CASTLE.reach * 2;
    const availW = stage.width;
    const availH = stage.height - top - tray - gutter * 2;
    const zoom = Math.floor(Math.min(availW / (across + reach), availH / (down + reach)));
    r.cam.zoom = Math.max(24, Math.min(150, zoom));
    const midY = top + gutter + availH / 2;
    r.cam.x = (b.minX + b.maxX + 1) / 2;
    r.cam.y = (b.minY + b.maxY + 1) / 2 - (midY - stage.height / 2) / r.cam.zoom;
    r.glide = null;
    this.quarterKey = '';
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
    cards.forEach((card, i) => {
      const held = i === sel;
      card.classList.toggle('held', held);
      card.classList.toggle('placed', held && !!pending);
      const rot = this.rotOf(i);
      const canvas = card.firstChild;
      const was = this.shown.rots[i];
      if (was === rot && card.dataset.drawn === key) return;
      if (held && was != null && was !== rot) this.spin(canvas, rot - was);
      this.shown.rots[i] = rot;
      card.dataset.drawn = key;
      const ctx = canvas.getContext('2d');
      const px = canvas.width;
      if (this.city) {
        const fits = drawPiece(ctx, g.m.pieces[hand[i]], rot, px);
        card.dataset.span = String(Math.max(fits.w, fits.h));
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
    return pending ? `Tap the ${it} to turn it. Hold it down to seal it.`
      : `Touch a lit square to put the ${it} there. Tap a card to turn it.`;
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
    $('staraTray').classList.toggle('stuck', stuck);
  }

  // --- the day's cast -----------------------------------------------------------

  /**
   * A tag at each corner of the square, above it for the first two and below
   * it for the last two: the kind's emblem and the place the day dealt for
   * it. Placed when the layout changes.
   */
  drawCast() {
    const g = this.game, b = g.board.bounds, r = this.h.renderer;
    const host = $('staraQuarters');
    if (!g.m.cast || !this.city) { host.innerHTML = ''; this.castKey = ''; return; }
    const layout = `${this.layoutKey}|${g.mode}|${JSON.stringify(g.m.cast)}`;
    if (this.castKey === layout) return;
    this.castKey = layout;
    const stage = $('stage').getBoundingClientRect();
    const cv = r.canvas.getBoundingClientRect();
    const ox = cv.left - stage.left, oy = cv.top - stage.top;
    const z = r.cam.zoom;
    const [x0, y0] = r.toScreen(b.minX, b.minY), [x1, y1] = r.toScreen(b.maxX + 1, b.maxY + 1);
    const reach = CASTLE.reach * z;
    const at = [[x0, y0 - reach, 'n', true], [x1, y0 - reach, 'n', false], [x0, y1 + reach, 's', true], [x1, y1 + reach, 's', false]];
    host.innerHTML = CAST.map((c, i) => {
      const place = PLACES[g.m.cast[c.id]];
      const [x, y, side, west] = at[i];
      const style = `${west ? 'left' : 'right'}:${west ? ox + x + 4 : stage.width - (ox + x) + 4}px;`
        + `${side === 'n' ? 'bottom' : 'top'}:${side === 'n' ? stage.height - (oy + y) + 2 : oy + y + 2}px`;
      return `<div class="staraQuarter" data-kind="${c.id}" style="${style};--q:${TINCTURES[c.id]}" title="Today's ${c.name.toLowerCase()}: ${place.name.toLowerCase()}. ${place.about}">`
        + `<svg viewBox="0 0 20 20" aria-hidden="true">${EMBLEMS[c.id]}</svg>`
        + `<span class="name">${place.name}</span></div>`;
    }).join('');
  }

  /**
   * THE WIZARD'S SIGHT: while a wizard's tower stands, the next pieces in the
   * pile face up beside it, smallest last, so luck becomes something to plan.
   */
  drawAhead() {
    const g = this.game, host = $('staraAhead');
    const ahead = this.city && g.phase === 'place' ? g.m.ahead() : [];
    const key = ahead.join('.');
    if (host.dataset.key === key) return;
    host.dataset.key = key;
    host.hidden = !ahead.length;
    host.innerHTML = ahead.map((id, i) => `<canvas width="${i ? 64 : 84}" height="${i ? 64 : 84}" title="${i ? 'After that' : 'Next'}: ${g.m.nameOf(id)}"></canvas>`).join('');
    [...host.children].forEach((cv, i) => drawPiece(cv.getContext('2d'), g.m.pieces[ahead[i]], 0, cv.width));
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
    }
    if (!p.dragging) return;
    // Picked up, the card shrinks to the size its piece will be on the board
    // and follows the finger; over the square it hands over to the board's
    // own ghost, which snaps to the square it would land on.
    const r = this.h.renderer;
    const span = Number(wrap.dataset.span || 1);
    wrap.style.translate = `${dx}px ${dy}px`;
    wrap.style.scale = String(Math.min(1, (r.cam.zoom * span) / wrap.offsetWidth));
    const cv = r.canvas.getBoundingClientRect();
    const inside = e.clientX >= cv.left && e.clientX <= cv.right && e.clientY >= cv.top && e.clientY <= cv.bottom;
    const cell = inside ? r.cellAt(e.clientX - cv.left, e.clientY - cv.top) : null;
    const onSquare = cell && this.game.board.inBounds(cell.x, cell.y);
    // Over a square it fits but not the way it is held, it turns to fit,
    // which is what dropping it there would do anyway (see stagePending).
    if (onSquare) {
      const rots = this.h.legal(cell.x, cell.y);
      if (rots.length && !rots.includes(this.game.rot)) this.game.rot = rots[0];
    }
    r.hover = onSquare ? cell : null;
    wrap.classList.toggle('snapped', !!onSquare);
  }

  up(e) {
    const p = this.press;
    if (!p || p.id !== e.pointerId) return;
    const r = this.h.renderer;
    if (!p.dragging) {
      this.press = null;
      // A touch on the card already held up turns it; on another, it was
      // held up by the touch, and that is all.
      if (!p.picked) this.game.rotate(1);
      this.h.sync();
      return;
    }
    const drop = r.hover;
    this.cancelDrag();
    if (drop && this.h.stage(drop.x, drop.y)) return;
    this.h.deny(drop);
  }

  cancelDrag() {
    const card = this.press ? this.cardAt(this.press.i) : null;
    if (card) {
      card.classList.remove('lifted', 'snapped');
      card.style.translate = '';
      card.style.scale = '';
    }
    if (this.press?.dragging) this.h.renderer.hover = null;
    this.press = null;
  }

  // --- holding on the board -----------------------------------------------------

  /** The squares the staged piece stands on, or the staged tile's one. */
  pendingCells() {
    const p = this.h.pending();
    if (!p) return [];
    if (!this.city) return [{ x: p.x, y: p.y }];
    return this.game.m.preview(p.x, p.y, p.rot)?.cells || [{ x: p.x, y: p.y }];
  }

  /** Is (x, y) under the staged piece? A tap there turns it, wherever on it. */
  inPending(c) { return !!c && this.pendingCells().some((s) => s.x === c.x && s.y === c.y); }

  cellUnder(e) {
    const r = this.h.renderer, cv = r.canvas.getBoundingClientRect();
    return r.cellAt(e.clientX - cv.left, e.clientY - cv.top);
  }

  /**
   * A finger down on the board. On the staged piece it may be the start of a
   * seal; on a piece already down (in the city), the start of a lift. Which
   * it is depends on how long it stays: see boardUp.
   */
  boardDown(e) {
    const g = this.game;
    this.swallowNext = false;
    if (!this.on || g.phase !== 'place' || this.held) return;
    const c = this.cellUnder(e);
    const now = performance.now();
    const r = this.h.renderer;
    if (this.inPending(c)) {
      this.held = { id: e.pointerId, kind: 'seal', x: e.clientX, y: e.clientY, t0: now, at: c };
      r.sealing = { kind: 'seal', t0: now + WAIT, dur: SEAL, at: c };
      this.holdTimer = setTimeout(() => this.finishHold(), WAIT + SEAL);
      return;
    }
    const id = this.city && !this.h.pending() ? g.m.pieceAt(c.x, c.y) : null;
    if (id != null) {
      this.held = { id: e.pointerId, kind: 'lift', piece: id, x: e.clientX, y: e.clientY, t0: now, at: c };
      r.sealing = { kind: 'lift', t0: now + WAIT, dur: LIFT, at: c, cells: g.m.squaresOf(id) };
      this.holdTimer = setTimeout(() => this.finishHold(), WAIT + LIFT);
    }
  }

  boardMove(e) {
    const h = this.held;
    if (!h || h.id !== e.pointerId || h.done) return;
    if (Math.hypot(e.clientX - h.x, e.clientY - h.y) > DRAG_PX) this.cancelHold();
  }

  /**
   * The finger comes up. Quick, it was a tap, and main.js turns the piece.
   * Held, it was a seal or a lift, finished or let go of early; either way
   * the release is not a tap, and main.js is told to leave it alone.
   */
  boardUp(e) {
    const h = this.held;
    if (!h || h.id !== e.pointerId) return;
    const quick = performance.now() - h.t0 < TAP;
    if (!h.done) this.cancelHold();
    this.held = null;
    this.swallowNext = !quick || h.done;
  }

  /** Did a hold just end? Then the release is not a tap (main.js asks). */
  swallow() {
    const s = this.swallowNext;
    this.swallowNext = false;
    return s;
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
    if (h.kind === 'seal') {
      const [sx, sy] = r.toScreen(h.at.x + 0.5, h.at.y + 0.5);
      const cv = r.canvas.getBoundingClientRect();
      this.sealedAt = { x: cv.left + sx, y: cv.top + sy, t: performance.now() };
      r.sealed = { t0: performance.now(), at: h.at, seed: (h.at.x * 7 + h.at.y * 13) | 0 };
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
    $('staraEndDay').innerHTML = `${g.spec.title || 'Starà'}<small>No. ${g.m.day.n} · ${g.m.side}×${g.m.side}</small>`;
    $('staraEndScore').textContent = score;
    if (garden) {
      $('staraEndRows').innerHTML = GIARDINO_KINDS
        .map(([k, name]) => `<div><span>${name}</span><i></i><b>${t[k]}</b></div>`).join('');
    } else {
      const num = (n) => (n < 0 ? `−${-n}` : `${n}`);
      const rows = WAYS.map((w) => `<div class="w-${w.id}"><span><em class="dot" style="background:${w.colour}"></em>${w.name}</span><i></i><b>${num(t[w.id])}</b></div>`);
      if (t.lifts) rows.push(`<div class="w-lift"><span><em class="dot lift"></em>Lifted</span><i></i><b>${num(t.lifts)}</b></div>`);
      $('staraEndRows').innerHTML = rows.join('');
    }
    $('staraEndFill').textContent = garden
      ? `${g.m.picked} pickings in ${g.m.week} weeks; ${g.m.lost.length} still green at the frost`
      : `${g.board.size} of ${g.m.squares} squares built`;
    $('staraEndPar').hidden = garden;
    $('staraPlan').hidden = garden;
    if (!garden) {
      const par = g.m.par;
      $('staraEndPar').textContent = score > par ? `The architect's plan was worth ${par}: you built better than the plan.`
        : score === par ? `The architect's plan was worth ${par}: you matched it.`
          : `The architect's plan was worth ${par}: ${par - score} more to find.`;
    }
    $('staraEndBest').textContent = prior == null ? (garden ? 'Your first garden today.' : 'Your first city today.')
      : score > prior ? `A new best for today (was ${prior}).`
        : score === prior ? 'Level with your best today.'
          : `Your best today: ${prior}.`;
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
      : `Starà No. ${g.m.day.n} (${g.m.side}×${g.m.side}): a city worth ${g.players[0].score}, the plan ${g.m.par}, ${g.board.size}/${g.m.squares} squares.`;
    const btn = $('staraShare');
    try {
      if (navigator.share) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); btn.textContent = 'Copied'; }
    } catch { btn.textContent = 'Could not share'; }
    setTimeout(() => { btn.textContent = 'Share'; }, 1600);
  }
}

export { WAY, STARA_KINDS };
