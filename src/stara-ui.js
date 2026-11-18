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
//   bottom  the draw pile, the tile in your hand, and a wax seal
//
// The turn is the same turn the rest of the workshop plays, through the same
// staging main.js already has: the tile pops up from the pile; touch it to
// turn it; touch a lit square (or drag the tile onto one) and it sits there;
// the seal lays it. There are no followers (the third pass: "it's a
// solitary game, so you just claim stuff simply automatically"), so that is
// the whole turn. A switch under the title goes between the 5 x 5 and the
// 7 x 7, keeping a game of each. When the square is full, a charter with the
// score, where it came from, and today's best.
//
// Nothing in here is a rule. It reads the game and calls the same functions
// a click in the workshop would.
// ---------------------------------------------------------------------------

import { STARA_KINDS, STARA_SIZES } from './modes/stara.js';
import { CASTLE } from './castle.js';

const $ = (id) => document.getElementById(id);
// Today's best, per size: the 7 x 7 keeps the key it has had since day 1.
const BEST = (mode, iso) => `tilemakers-workshop/${mode}/best/${iso}`;
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
   * placement and the things that can be done to it, a new game, switching
   * to a game of another size, the renderer, and how to draw a tile.
   */
  constructor(host) {
    this.h = host;
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
    $('staraMenu').onclick = () => this.togglePanel();
    $('staraAgain').onclick = () => this.h.newGame(this.game.mode);
    $('staraShare').onclick = () => this.share();
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
    if (!on) document.body.classList.remove('staraPanel');
    $('stara').hidden = !on;
    // Coming or going, the panel has moved and the board's canvas with it.
    if (was !== on) { this.h.renderer.resize(); this.refit(); }
    if (!on) return;
    this.fit();

    const g = this.game, p = g.players[0];
    $('staraDay').textContent = `No. ${g.m.day.n}`;
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
    $('staraPileWrap').title = `${g.deck.length} tiles left in the pile`;
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
    const b = this.game.board.bounds;
    const key = [stage.width, stage.height, top, tray, b.maxX - b.minX].join('|');
    if (!force && key === this.layoutKey) return;
    this.layoutKey = key;
    const r = this.h.renderer;
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

  /** The tile in your hand, as the card shows it, or nothing between tiles. */
  held() {
    const g = this.game;
    if (g.phase !== 'place' || !g.tile) return null;
    const p = this.h.pending();
    return { type: g.tile, rot: p ? p.rot : g.rot, key: `hand:${g.turn}:${g.tileKey}` };
  }

  drawCard() {
    const canvas = $('staraTile');
    const wrap = $('staraCard');
    const held = this.held();
    const pending = this.h.pending();
    wrap.classList.toggle('empty', !held);
    $('staraGo').classList.toggle('shown', !!pending);
    this.caption(held, pending);
    if (!held) { this.shown = null; return; }

    // A new tile pops up off the pile; the same tile turned, turns.
    const fresh = this.shown?.key !== held.key;
    if (fresh) this.pop(wrap);
    else if (this.shown.rot !== held.rot) this.spin(canvas, held.rot - this.shown.rot);
    this.shown = { key: held.key, rot: held.rot };

    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate(held.rot * Math.PI / 2);
    ctx.translate(-size / 2, -size / 2);
    ctx.scale(size, size);
    this.h.drawTile(ctx, held.type, { terrain: 'surface', rot: held.rot });
    ctx.restore();
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
  caption(held, pending) {
    const el = $('staraCaption');
    const taught = Number(store.get(TAUGHT) || 0);
    let text = '';
    if (taught < 6 && held) {
      text = pending ? 'Touch it again to turn it. The seal lays it.'
        : 'Touch the tile to turn it. Touch a lit square to put it there.';
    }
    el.textContent = text;
    if (held && this.taughtFor !== held.key) {
      this.taughtFor = held.key;
      store.set(TAUGHT, String(taught + 1));
    }
  }

  // --- touching the card ------------------------------------------------------

  down(e) {
    const g = this.game;
    if (!this.on || g.phase !== 'place' || !g.tile) return;
    e.preventDefault();
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
    const key = BEST(g.mode, g.m.day.iso);
    const before = Number(store.get(key) || NaN);
    if (this.recorded !== g) {
      this.recorded = g;
      this.priorBest = Number.isFinite(before) ? before : null;
      if (!Number.isFinite(before) || score > before) store.set(key, String(score));
    }
    const prior = this.priorBest;
    const t = g.m.tally;
    $('staraEndDay').innerHTML = `Starà<small>No. ${g.m.day.n} · ${g.m.side}×${g.m.side}</small>`;
    $('staraEndScore').textContent = score;
    $('staraEndRows').innerHTML = STARA_KINDS
      .map(([k, name]) => `<div><span>${name}</span><i></i><b>${t[k]}</b></div>`).join('');
    $('staraEndFill').textContent = `${g.board.size} of ${g.m.squares} squares filled`;
    $('staraEndBest').textContent = prior == null ? 'Your first town today.'
      : score > prior ? `A new best for today (was ${prior}).`
        : score === prior ? 'Level with your best today.'
          : `Your best today: ${prior}.`;
    end.hidden = false;
  }

  async share() {
    const g = this.game;
    const text = `Starà No. ${g.m.day.n} (${g.m.side}×${g.m.side}): ${g.players[0].score} points, ${g.board.size}/${g.m.squares} squares.`;
    const btn = $('staraShare');
    try {
      if (navigator.share) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); btn.textContent = 'Copied'; }
    } catch { btn.textContent = 'Could not share'; }
    setTimeout(() => { btn.textContent = 'Share'; }, 1600);
  }
}
