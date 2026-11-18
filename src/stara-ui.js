// ---------------------------------------------------------------------------
// Starà's interface: one tile at a time, on a wooden table.
//
// Timothy, 2026-11-18: "when in this mode, make the placement interface much
// simpler and more intuitive, with just like the tile itself pop up and then
// you place it and stuff, very minimalist. the background should be real wood".
//
// So while a Starà game is running, the workshop's panel, HUD and claim box
// step aside and this takes the screen:
//
//   top     the menu (the workshop, folded away), the day, your score
//   middle  the 7 x 7 square, fitted to the screen and held still
//   bottom  the draw pile, the tile in your hand, and a checkmark
//
// The turn is the same turn the rest of the workshop plays, through the same
// staging main.js already has: the tile pops up from the pile; touch it to
// turn it; touch a lit square (or drag the tile onto one) and it sits there;
// the checkmark lays it. Then the same tile, big, with a dot on each thing
// you could put a follower on: touch one, or "No follower". When the square
// is full, a card with the score, where it came from, and today's best.
//
// Nothing in here is a rule. It reads the game and calls the same functions
// a click in the workshop would.
// ---------------------------------------------------------------------------

import { STARA_SQUARES } from './modes/stara.js';
import { drawMeeple, PLAYER_COLORS } from './art.js';
import { rotPoint } from './tiles.js';
import { sketchCircle, sketchLine, seedOf } from './sketch.js';
import { RULES } from './game.js';
import { CASTLE } from './castle.js';

const $ = (id) => document.getElementById(id);
const BEST = (iso) => `tilemakers-workshop/stara/best/${iso}`;
const TAUGHT = 'tilemakers-workshop/stara/taught';
const DRAG_PX = 10;

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

export class StaraUI {
  /**
   * `host` is main.js, as a handful of functions: the game, the staged
   * placement and the four things that can be done to it, a new game, the
   * renderer, and how to draw a tile.
   */
  constructor(host) {
    this.h = host;
    this.spots = [];
    this.shown = null;         // {key, rot} — what the card is showing
    this.lastScore = null;
    this.recorded = null;      // the game whose result has been saved
    this.layoutKey = '';
    this.press = null;         // a finger on the card: tap, or the start of a drag
    this.wire();
  }

  get game() { return this.h.game(); }
  get on() { return !!this.game?.spec?.table; }

  wire() {
    const card = $('staraTile');
    card.addEventListener('pointerdown', (e) => this.down(e));
    window.addEventListener('pointermove', (e) => this.move(e));
    window.addEventListener('pointerup', (e) => this.up(e));
    window.addEventListener('pointercancel', () => this.cancelDrag());
    $('staraGo').onclick = () => { if (this.h.pending()) this.h.commit(); };
    $('staraSkip').onclick = () => this.game.skipMeeple();
    $('staraMenu').onclick = () => this.togglePanel();
    $('staraAgain').onclick = () => this.h.newGame('stara');
    $('staraShare').onclick = () => this.share();
  }

  // --- the frame ------------------------------------------------------------

  /** Called whenever the workshop's panel would redraw. */
  sync() {
    const on = this.on;
    const was = document.body.classList.contains('stara');
    document.body.classList.toggle('stara', on);
    if (!on) document.body.classList.remove('staraPanel');
    $('stara').hidden = !on;
    // Coming or going, the panel has moved and the board's canvas with it.
    if (was !== on) { this.h.renderer.resize(); this.refit(); }
    if (!on) return;
    this.fit();

    const g = this.game, p = g.players[0];
    $('staraDay').textContent = `No. ${g.m.day.n}`;
    const score = $('staraScore');
    score.textContent = p.score;
    if (this.lastScore != null && p.score > this.lastScore) {
      score.classList.remove('bump');
      void score.offsetWidth;            // restart the animation
      score.classList.add('bump');
    }
    this.lastScore = p.score;
    $('staraPile').textContent = g.deck.length;
    $('staraPileWrap').title = `${g.deck.length} tiles left in the pile`;
    this.drawFollowers();
    this.drawCard();
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
    const key = [stage.width, stage.height, top, tray].join('|');
    if (!force && key === this.layoutKey) return;
    this.layoutKey = key;
    const r = this.h.renderer;
    const b = this.game.board.bounds;
    const across = b.maxX - b.minX + 1, down = b.maxY - b.minY + 1;
    // Edge to edge (2026-11-18: "push the square to the edge of the left and
    // right"): the castle's corner towers touch the sides of the screen.
    const gutter = 6;
    const reach = CASTLE.reach * 2;
    const availW = stage.width;
    const availH = stage.height - top - tray - gutter * 2;
    const zoom = Math.floor(Math.min(availW / (across + reach), availH / (down + reach)));
    r.cam.zoom = Math.max(24, Math.min(150, zoom));
    const midY = top + gutter + availH / 2;
    r.cam.x = (b.minX + b.maxX + 1) / 2;
    r.cam.y = (b.minY + b.maxY + 1) / 2 - (midY - stage.height / 2) / r.cam.zoom;
    r.glide = null;
  }

  /** Fit again on the next sync: a new game, or the window changed. */
  refit() { this.layoutKey = ''; }

  togglePanel(open = !document.body.classList.contains('staraPanel')) {
    document.body.classList.toggle('staraPanel', open);
    this.h.renderer.resize();
    this.fit(true);
  }

  // --- the card -------------------------------------------------------------

  /** What the card holds right now: the tile in hand, the tile just laid, or nothing. */
  held() {
    const g = this.game;
    if (g.phase === 'place' && g.tile) {
      const p = this.h.pending();
      return { type: g.tile, rot: p ? p.rot : g.rot, key: `hand:${g.turn}:${g.tileKey}`, hand: true };
    }
    if (g.phase === 'meeple' && g.lastPlaced) {
      const c = g.board.get(g.lastPlaced.x, g.lastPlaced.y);
      if (c) return { type: c.type, rot: c.rot, key: `laid:${g.turn}`, cell: c };
    }
    return null;
  }

  drawCard() {
    const g = this.game;
    const canvas = $('staraTile');
    const wrap = $('staraCard');
    const held = this.held();
    const pending = this.h.pending();
    wrap.classList.toggle('empty', !held);
    wrap.classList.toggle('claiming', !!held?.cell);
    $('staraGo').classList.toggle('shown', !!pending);
    const claims = held?.cell ? this.claimOptions() : [];
    $('staraSkip').classList.toggle('shown', g.phase === 'meeple');
    this.h.renderer.hideMeepleTargets = g.phase === 'meeple';
    this.caption(held, pending, claims);
    if (!held) { this.shown = null; this.spots = []; return; }

    // A new tile pops up off the pile; the same tile turned, turns.
    const fresh = this.shown?.key !== held.key;
    if (fresh && held.hand) this.pop(wrap);
    else if (!fresh && this.shown.rot !== held.rot) this.spin(canvas, held.rot - this.shown.rot);
    this.shown = { key: held.key, rot: held.rot };

    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate(held.rot * Math.PI / 2);
    ctx.translate(-size / 2, -size / 2);
    ctx.scale(size, size);
    this.h.drawTile(ctx, held.type, { terrain: 'surface', rot: held.rot, look: held.cell?.seq });
    ctx.restore();

    this.spots = [];
    if (held.cell) this.drawSpots(ctx, held.cell, claims, size);
  }

  /** The follower options on the tile just laid (the only ones Starà has). */
  claimOptions() {
    const g = this.game;
    if (g.phase !== 'meeple' || !g.lastPlaced) return [];
    const { x, y } = g.lastPlaced;
    return g.meepleOptions().filter((o) => o.x === x && o.y === y);
  }

  drawSpots(ctx, cell, opts, size) {
    const r = size * 0.12;
    this.spots = spreadSpots(opts.map((o) => {
      const [px, py] = rotPoint(cell.type.spots[o.i] || [0.5, 0.5], cell.rot);
      return { ...o, ax: px * size, ay: py * size, sx: px * size, sy: py * size, r };
    }), r, size);
    // Parchment roundels, ringed by hand in ink, a follower on each, and a
    // pen line back to the spot it really means when it had to move aside.
    const colour = PLAYER_COLORS[0];
    ctx.lineCap = 'round';
    for (const s of this.spots) {
      if (Math.hypot(s.sx - s.ax, s.sy - s.ay) < 3) continue;
      ctx.beginPath();
      sketchLine(ctx, s.ax, s.ay, s.sx, s.sy, { seed: seedOf(s.ax, s.ay), rough: 1.2 });
      ctx.strokeStyle = 'rgba(43,26,13,0.8)';
      ctx.lineWidth = 2.2;
      ctx.stroke();
    }
    for (const s of this.spots) {
      ctx.beginPath();
      ctx.arc(s.sx, s.sy, s.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(244,230,198,0.92)';
      ctx.fill();
      ctx.beginPath();
      sketchCircle(ctx, s.sx, s.sy, s.r, { seed: seedOf(s.sx, s.sy, s.i), rough: 1.4 });
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#2b1a0d';
      ctx.stroke();
      drawMeeple(ctx, s.sx, s.sy, s.r * 1.45, colour, { farmer: s.f?.type === 'field' });
    }
  }

  /** The tile comes up off the pile: a short rise with a little overshoot. */
  pop(wrap) {
    wrap.classList.remove('pop');
    void wrap.offsetWidth;
    wrap.classList.add('pop');
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
   * One quiet line under the card for your first few tiles in Starà, ever,
   * and then nothing: by then the tile and the lit squares say it.
   */
  caption(held, pending, claims) {
    const el = $('staraCaption');
    const taught = Number(store.get(TAUGHT) || 0);
    let text = '';
    if (taught < 6 && held) {
      if (held.hand && !pending) text = 'Touch the tile to turn it. Touch a lit square to put it there.';
      else if (held.hand) text = 'Touch it again to turn it. The seal lays it.';
      else if (claims.length) text = 'Put a follower on something, or not.';
    }
    el.textContent = text;
    if (held?.cell && this.taughtFor !== held.key) {
      this.taughtFor = held.key;
      store.set(TAUGHT, String(taught + 1));
    }
  }

  // --- followers --------------------------------------------------------------

  drawFollowers() {
    const g = this.game, p = g.players[0];
    const canvas = $('staraFollowers');
    const max = p.meepleMax || RULES.meeplesPerPlayer;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const step = w / max;
    for (let i = 0; i < max; i++) {
      ctx.globalAlpha = i < p.meeples ? 1 : 0.22;
      drawMeeple(ctx, step * (i + 0.5), h / 2, h * 0.86, PLAYER_COLORS[0]);
    }
    ctx.globalAlpha = 1;
    $('staraFollowersWrap').title = `${p.meeples} of ${max} followers in hand`;
  }

  // --- touching the card ------------------------------------------------------

  down(e) {
    const g = this.game;
    if (!this.on) return;
    e.preventDefault();
    if (g.phase === 'meeple') {
      const hit = this.hitSpot(e);
      if (hit) g.placeMeeple(hit.i, hit);
      return;
    }
    if (g.phase !== 'place' || !g.tile) return;
    this.press = { id: e.pointerId, x: e.clientX, y: e.clientY, dragging: false };
  }

  move(e) {
    const p = this.press;
    if (!p || p.id !== e.pointerId) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    if (!p.dragging && Math.hypot(dx, dy) > DRAG_PX) {
      p.dragging = true;
      $('staraCard').classList.add('lifted');
    }
    if (!p.dragging) return;
    // Picked up, the tile shrinks to the size it will be on the board and
    // follows the finger; over the square it hands over to the board's own
    // ghost, which snaps to the square it would land on.
    const r = this.h.renderer;
    const wrap = $('staraCard');
    wrap.style.translate = `${dx}px ${dy}px`;
    wrap.style.scale = String(Math.min(1, r.cam.zoom / wrap.offsetWidth));
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
    this.press = null;
    const r = this.h.renderer;
    if (!p.dragging) {
      // A touch, not a drag: turn the tile, through only the ways it fits if
      // it is already sitting on a square.
      if (this.h.pending()) this.h.turn(1); else this.game.rotate(1);
      return;
    }
    const drop = r.hover;
    this.cancelDrag();
    if (drop && this.h.stage(drop.x, drop.y)) return;
    this.h.deny(drop);
  }

  cancelDrag() {
    const card = $('staraCard');
    card.classList.remove('lifted', 'snapped');
    card.style.translate = '';
    card.style.scale = '';
    if (this.press?.dragging) this.h.renderer.hover = null;
    this.press = null;
  }

  hitSpot(e) {
    const c = $('staraTile');
    const r = c.getBoundingClientRect();
    const k = c.width / r.width;
    const px = (e.clientX - r.left) * k, py = (e.clientY - r.top) * k;
    return this.spots.find((s) => Math.hypot(px - s.sx, py - s.sy) <= s.r * 1.4);
  }

  /** Where a laid tile flies in from: the card, so it is seen leaving your hand. */
  entry() {
    const c = $('staraTile').getBoundingClientRect();
    return { x: c.left + c.width / 2, y: c.top + c.height / 2 };
  }

  // --- the end ----------------------------------------------------------------

  showEnd() {
    const g = this.game;
    const end = $('staraEnd');
    if (g.phase !== 'over') { end.hidden = true; return; }
    const score = g.players[0].score;
    const iso = g.m.day.iso;
    const before = Number(store.get(BEST(iso)) || NaN);
    if (this.recorded !== g) {
      this.recorded = g;
      this.priorBest = Number.isFinite(before) ? before : null;
      if (!Number.isFinite(before) || score > before) store.set(BEST(iso), String(score));
    }
    const prior = this.priorBest;
    const t = g.m.tally;
    const rows = [['Cities', t.cities], ['Roads', t.roads], ['Cloisters', t.cloisters],
      ['Farms', t.farms], ['Unfinished', t.unfinished]];
    $('staraEndDay').innerHTML = `Starà<small>No. ${g.m.day.n}</small>`;
    $('staraEndScore').textContent = score;
    $('staraEndRows').innerHTML = rows.map(([k, v]) => `<div><span>${k}</span><i></i><b>${v}</b></div>`).join('');
    $('staraEndFill').textContent = `${g.board.size} of ${STARA_SQUARES} squares filled`;
    $('staraEndBest').textContent = prior == null ? 'Your first square today.'
      : score > prior ? `A new best for today (was ${prior}).`
        : score === prior ? 'Level with your best today.'
          : `Your best today: ${prior}.`;
    end.hidden = false;
  }

  async share() {
    const g = this.game;
    const text = `Starà No. ${g.m.day.n}: ${g.players[0].score} points, ${g.board.size}/${STARA_SQUARES} squares.`;
    const btn = $('staraShare');
    try {
      if (navigator.share) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); btn.textContent = 'Copied'; }
    } catch { btn.textContent = 'Could not share'; }
    setTimeout(() => { btn.textContent = 'Share'; }, 1600);
  }
}
