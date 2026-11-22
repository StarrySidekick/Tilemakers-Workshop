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
//   bottom  the draw pile and your hand; the wax seal goes on the board
//
// The turn is the same turn the rest of the workshop plays, through the same
// staging main.js already has: the tile pops up from the pile; touch it to
// turn it; touch a lit square (or drag the tile onto one) and it sits there;
// the seal lays it. There are no followers (the third pass: "it's a
// solitary game, so you just claim stuff simply automatically"), so that is
// the whole turn. From the fourth pass you hold a HAND (one tile, and one
// more for every abbey laid): touch a card to hold it up. A tile put on a
// square leaves the tray ("once the tile is placed, don't show it in the
// bottone anymore"), and the seal comes to sit beside it on the board ("move
// the little seal checkmark near where the tile is"); touch the tile itself
// to turn it there. A tag at each corner of the square names that quarter's
// trade and what it is worth as the town stands. A switch under the title goes between the 5 x 5 and the
// 7 x 7, keeping a game of each. When the square is full, a charter with the
// score, where it came from, and today's best.
//
// Giardino (2026-11-22) plays on the same screen: a garden wall for the
// castle (garden.js), no quarters and no sizes, the week under the title,
// and a SEED PACKET under the hand saying what the plant held up needs and
// who it likes and dislikes. The marks on the board round a staged plant are
// the renderer's (drawCompany).
//
// Nothing in here is a rule. It reads the game and calls the same functions
// a click in the workshop would.
// ---------------------------------------------------------------------------

import { STARA_KINDS, STARA_SIZES, QUARTERS, TRADE_BY_ID, quarterWorth } from './modes/stara.js';
import { GIARDINO_KINDS, PLANTS } from './modes/giardino.js';
import { CASTLE } from './castle.js';
import { usePalette } from './theme.js';
import { TILES } from './tiles.js';

const TILES_OF = (id) => TILES[id];

const $ = (id) => document.getElementById(id);
// Today's best, per size: the 7 x 7 keeps the key it has had since day 1.
const BEST = (mode, iso) => `tilemakers-workshop/${mode}/best/${iso}`;
const TAUGHT = 'tilemakers-workshop/stara/taught';

/** A small emblem for each trade, drawn in ink on its tag (20 x 20). */
const EMBLEMS = {
  housing: '<path d="M3 10 L10 4 L17 10 V17 H3 Z M8 17 V12 H12 V17"/>',
  trade: '<path d="M10 3 V17 M5 17 H15 M3 7 H17 M3 7 L1 12 H5 Z M17 7 L15 12 H19 Z"/>',
  church: '<path d="M10 2 V18 M5 7 H15"/>',
  garrison: '<path d="M4 17 V6 H6 V4 H8 V6 H12 V4 H14 V6 H16 V17 Z M9 17 V13 H11 V17"/>',
};
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
    this.shown = null;         // what the hand looked like when last drawn
    this.lastScore = null;
    this.recorded = null;      // the game whose result has been saved
    this.layoutKey = '';
    this.press = null;         // a finger on a card: tap, or the start of a drag
    this.wire();
  }

  get game() { return this.h.game(); }
  get on() { return !!this.game?.spec?.table; }

  wire() {
    $('staraCards').addEventListener('pointerdown', (e) => this.down(e));
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
    if (!on) document.body.classList.remove('staraPanel', 'garden');
    $('stara').hidden = !on;
    // Coming or going, the panel has moved and the board's canvas with it.
    if (was !== on) { this.h.renderer.resize(); this.refit(); }
    if (!on) return;
    this.fit();

    const g = this.game, p = g.players[0];
    const garden = !!g.spec.garden;
    document.body.classList.toggle('garden', garden);
    document.querySelector('#stara .staraName').textContent = g.spec.title || 'Starà';
    $('staraDay').textContent = garden ? `No. ${g.m.day.n} · week ${g.m.week}` : `No. ${g.m.day.n}`;
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
    $('staraPileWrap').title = `${g.deck.length} tiles left in the pile`;
    this.drawHand();
    this.placeSeal();
    this.drawQuarters();
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
    // is kept above and below for the quarters' tags.
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

  /**
   * The hand, as cards in the tray: the one held up raised and ringed, the
   * rest beside it, all the same size, smaller the more you hold (two rows
   * past four). The tile held up leaves the tray while it sits on a square.
   */
  drawHand() {
    const g = this.game;
    const host = $('staraCards');
    const hand = g.phase === 'place' ? g.m.hand : [];
    const pending = this.h.pending();
    const sel = g.m.sel;
    const n = hand.length;
    // Giardino's packet needs the room under the hand, so its cards are smaller.
    const size = g.spec.garden ? (n <= 1 ? 120 : 100) : n <= 1 ? 150 : n === 2 ? 118 : n === 3 ? 88 : 62;
    host.style.setProperty('--card', `${size}px`);
    // One row up to four, two rows past that, the row as wide as the cards
    // still in the tray (not the one sitting on a square).
    const shown = Math.max(1, n - (pending ? 1 : 0));
    const perRow = shown <= 4 ? shown : Math.ceil(shown / 2);
    host.style.width = `${perRow * size + (perRow - 1) * 10}px`;
    // Starà's tiles are inked, and the board may not have drawn a frame yet
    // to say so, so the hand says so itself.
    usePalette('town');

    // Rebuild the cards when the hand itself changes; otherwise only redraw.
    const key = `${g.turn}|${hand.join('.')}`;
    if (host.dataset.key !== key) {
      const fresh = !this.shown || this.shown.turn !== g.turn;
      host.dataset.key = key;
      host.innerHTML = hand.map((id, i) => `<div class="staraCard${fresh && i === sel ? ' pop' : ''}" data-i="${i}">`
        + `<canvas width="${size * 2}" height="${size * 2}" aria-label="Tile ${i + 1} in your hand"></canvas></div>`).join('');
      this.shown = { turn: g.turn, rots: [] };
    }
    const cards = [...host.children];
    cards.forEach((card, i) => {
      const held = i === sel;
      card.classList.toggle('held', held);
      card.classList.toggle('placed', held && !!pending);
      const rot = held ? (pending ? pending.rot : g.rot) : 0;
      const canvas = card.firstChild;
      const was = this.shown.rots[i];
      if (was === rot && card.dataset.drawn === key) return;
      if (held && was != null && was !== rot) this.spin(canvas, rot - was);
      this.shown.rots[i] = rot;
      card.dataset.drawn = key;
      const ctx = canvas.getContext('2d');
      const px = canvas.width;
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
   * The seal, on the board beside the staged tile but clear of it ("move the
   * seal checkmark more out from the tile itself so that i don't accidentally
   * press it"): off its lower right corner, with a gap, so a touch on the
   * tile to turn it can never land on the seal. Flipped to the left, or above,
   * where the right or the bottom would put it off the screen or into the tray.
   */
  placeSeal() {
    const seal = $('staraGo');
    const p = this.h.pending();
    seal.classList.toggle('shown', !!p);
    if (!p) return;
    const r = this.h.renderer;
    const z = r.cam.zoom;
    const stage = $('stage').getBoundingClientRect();
    const cv = r.canvas.getBoundingClientRect();
    const tray = $('staraTray').getBoundingClientRect().top - stage.top;
    const [sx, sy] = r.toScreen(p.x, p.y);
    const half = seal.offsetWidth / 2 || 24;
    const gap = 12;
    const left = cv.left - stage.left + sx, top = cv.top - stage.top + sy;
    let cx = left + z + gap + half, cy = top + z + gap + half;
    if (cx + half > stage.width - 2) cx = left - gap - half;
    if (cy + half > tray - 2) cy = top - gap - half;
    seal.style.left = `${cx - half}px`;
    seal.style.top = `${cy - half}px`;
  }

  /**
   * One quiet line under the hand for your first few tiles in Starà, ever,
   * and then nothing: by then the tiles and the lit squares say it.
   */
  caption(heldId, pending, n) {
    const el = $('staraCaption');
    if (this.game.spec.garden) return this.packet(el, heldId);
    const taught = Number(store.get(TAUGHT) || 0);
    let text = '';
    if (taught < 8 && heldId) {
      text = pending ? 'Touch the tile on the board to turn it. The seal lays it.'
        : n > 1 ? 'Touch a tile to hold it up, again to turn it. Touch a lit square.'
          : 'Touch the tile to turn it. Touch a lit square to put it there.';
    }
    el.textContent = text;
    const key = `${this.game.turn}`;
    if (heldId && this.taughtFor !== key) {
      this.taughtFor = key;
      store.set(TAUGHT, String(taught + 1));
    }
  }

  /**
   * GIARDINO'S SEED PACKET, for the plant held up: its name, what water it
   * wants, how many weeks it takes, what it yields, and its friends and foes.
   * Always shown (it is the plant's rules, not a lesson), in one short line
   * and a second for its company.
   */
  packet(el, heldId) {
    const info = heldId ? this.game.m.packet(heldId) : null;
    if (!info) { el.innerHTML = ''; return; }
    const names = (ids) => ids.map((k) => PLANTS[k].name.toLowerCase()).join(', ');
    const repeat = info.again ? `, then every ${info.again}` : '';
    const drop = info.water === 'thirsty' ? '<i class="drop wet"></i>' : info.water === 'dry' ? '<i class="drop dry"></i>' : '<i class="drop"></i>';
    const friends = info.friends.length > 6 ? 'every vegetable' : names(info.friends);
    const foes = info.foes.length > 6 ? 'every vegetable' : names(info.foes);
    el.innerHTML = `<div class="packetTop"><b>${info.name}</b> ${drop}<span>${info.need}</span>`
      + `<span>${info.weeks} weeks${repeat}</span><span>yields ${info.yield}</span></div>`
      + `<div class="packetCo">${friends ? `<span class="fr">+ ${friends}</span>` : ''}${foes ? `<span class="fo">− ${foes}</span>` : ''}`
      + `${!friends && !foes ? '<span>no friends or foes</span>' : ''}</div>`;
  }

  // --- the four quarters --------------------------------------------------------

  /**
   * A tag at each corner of the square, above it for the north quarters and
   * below it for the south: the trade's emblem and name, and what it is worth
   * now. Placed when the layout changes; their worth refreshed every sync.
   */
  drawQuarters() {
    const g = this.game, b = g.board.bounds, r = this.h.renderer;
    const host = $('staraQuarters');
    if (!g.m.trades) { host.innerHTML = ''; this.quarterKey = ''; return; }
    const layout = `${this.layoutKey}|${g.mode}|${JSON.stringify(g.m.trades)}`;
    if (this.quarterKey !== layout) {
      this.quarterKey = layout;
      const stage = $('stage').getBoundingClientRect();
      const cv = r.canvas.getBoundingClientRect();
      const ox = cv.left - stage.left, oy = cv.top - stage.top;
      const z = r.cam.zoom;
      const [x0, y0] = r.toScreen(b.minX, b.minY), [x1, y1] = r.toScreen(b.maxX + 1, b.maxY + 1);
      const reach = CASTLE.reach * z;
      const at = { NW: [x0, y0 - reach, 'n'], NE: [x1, y0 - reach, 'n'], SE: [x1, y1 + reach, 's'], SW: [x0, y1 + reach, 's'] };
      host.innerHTML = QUARTERS.map((q) => {
        const t = TRADE_BY_ID[g.m.trades[q]];
        const [x, y, side] = at[q];
        const west = q.endsWith('W');
        const style = `${west ? 'left' : 'right'}:${west ? ox + x + 4 : stage.width - (ox + x) + 4}px;`
          + `${side === 'n' ? 'bottom' : 'top'}:${side === 'n' ? stage.height - (oy + y) + 2 : oy + y + 2}px`;
        return `<div class="staraQuarter" data-q="${q}" style="${style};--q:${t.color}" title="The ${t.name.toLowerCase()} quarter wants ${t.wants}: ${t.per} each">`
          + `<svg viewBox="0 0 20 20" aria-hidden="true">${EMBLEMS[t.id]}</svg>`
          + `<span class="name">${t.name}</span><b></b></div>`;
      }).join('');
    }
    for (const el of host.children) {
      const q = el.dataset.q;
      el.querySelector('b').textContent = `+${quarterWorth(g.board, q, g.m.trades[q]).pts}`;
    }
  }

  // --- touching the cards -----------------------------------------------------

  down(e) {
    const g = this.game;
    const card = e.target.closest('.staraCard');
    if (!this.on || !card || g.phase !== 'place') return;
    e.preventDefault();
    const i = Number(card.dataset.i);
    // Touching another card holds it up instead, and takes back whatever was
    // sitting on a square: that was the other tile.
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
    // Picked up, the tile shrinks to the size it will be on the board and
    // follows the finger; over the square it hands over to the board's own
    // ghost, which snaps to the square it would land on.
    const r = this.h.renderer;
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
    const r = this.h.renderer;
    if (!p.dragging) {
      this.press = null;
      // A touch on the card already held up turns it; on another, it was
      // held up by the touch, and that is all.
      if (!p.picked) this.game.rotate(1);
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

  /** Where a laid tile flies in from: the seal it was sealed with, beside it. */
  entry() {
    const c = ($('staraGo').classList.contains('shown') ? $('staraGo') : $('staraCards')).getBoundingClientRect();
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
    const garden = !!g.spec.garden;
    $('staraEndDay').innerHTML = `${g.spec.title || 'Starà'}<small>No. ${g.m.day.n} · ${g.m.side}×${g.m.side}</small>`;
    $('staraEndScore').textContent = score;
    $('staraEndRows').innerHTML = (garden ? GIARDINO_KINDS : STARA_KINDS)
      .map(([k, name]) => `<div><span>${name}</span><i></i><b>${t[k]}</b></div>`).join('');
    $('staraEndFill').textContent = garden
      ? `${g.m.picked} pickings in ${g.m.week} weeks; ${g.m.lost.length} still green at the frost`
      : `${g.board.size} of ${g.m.squares} squares filled`;
    $('staraEndBest').textContent = prior == null ? (garden ? 'Your first garden today.' : 'Your first town today.')
      : score > prior ? `A new best for today (was ${prior}).`
        : score === prior ? 'Level with your best today.'
          : `Your best today: ${prior}.`;
    end.hidden = false;
  }

  async share() {
    const g = this.game;
    const text = g.spec.garden
      ? `Giardino No. ${g.m.day.n}: ${g.players[0].score} points, ${g.m.picked} pickings, ${g.m.lost.length} lost to the frost.`
      : `Starà No. ${g.m.day.n} (${g.m.side}×${g.m.side}): ${g.players[0].score} points, ${g.board.size}/${g.m.squares} squares.`;
    const btn = $('staraShare');
    try {
      if (navigator.share) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); btn.textContent = 'Copied'; }
    } catch { btn.textContent = 'Could not share'; }
    setTimeout(() => { btn.textContent = 'Share'; }, 1600);
  }
}
