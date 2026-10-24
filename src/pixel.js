// ---------------------------------------------------------------------------
// Pixel tiles: the cloud kingdom drawn in the Composer's Key hand.
//
// Timothy's other game draws everything on a 51 x 51 grid in one hand: line
// work at 3 px for structure and 2 px for ornament, a slow wobble on every
// stroke, open spirals that grow out of the end of a stalk, and hard pixels,
// every one fully on or fully off. Those rules were measured off his own
// drawings and live in that repository's art skill
// (.claude/skills/composers-key-art/references/style-card.md). This file keeps
// them and adds colour, for Soffiando only.
//
// COLOUR IS LAYERED, ONE INK AT A TIME. Each colour is drawn white onto a
// scratch plate, thresholded to hard pixels, tinted, and laid on the tile.
// That is how Unity tints a white sprite, and it is what keeps every edge
// crisp: an antialiased blend of two colours never gets a pixel of its own.
//
// TILES ARE DRAWN ONCE, UNROTATED, and turned by moving pixels rather than by
// resampling them: on an odd square grid a quarter turn sends every pixel to
// exactly one other pixel. The renderer scales the result up with smoothing
// off, so a tile on screen is the same picture at every zoom.
//
// THE CONNECTORS ARE FIXED, as the tubes are in Composer's Key. A road crosses
// its edge on columns 21 to 29 (a 5 px bed between 2 px kerbs), a city covers
// its side corner to corner (shape.js), and a half-sphere is centred on the
// middle of its edge. Anything that meets a neighbour meets it on the same
// pixels every time, so a run of tiles reads as one piece of country.
// ---------------------------------------------------------------------------

import { featureShape } from './shape.js';

export const PX = 51;
const MID = PX / 2;                 // 25.5: the middle of pixel 25

/**
 * The cloud kingdom's inks. Kept short on purpose: a palette you can count
 * is what makes pixel art read as one drawing rather than as clip art.
 */
export const INK = {
  ink: '#3a3262',          // the line everything built is drawn in
  meadow: '#c4e7b0', meadowDeep: '#a9d99b', grass: '#5f9f6c',
  road: '#fff1c9', kerb: '#c3954d',
  plaster: '#f6daea', wall: '#7c4b88', roof: '#ec7d90', roofDeep: '#b9506d',
  cloud: '#fffaff', cloudLine: '#9a8fd0', cloudShade: '#ddd5f4',
  warm: '#fff0e2', warmLine: '#e09a78', warmShade: '#fbd6c0',
  wind: '#5c8fe0',
  bronze: '#c98a3e', blast: '#f07a45', timber: '#8a5a3c',
  gold: '#f3c24f', goldDeep: '#b9861f',
  marble: '#fdf8ef', stone: '#ece4f6',
  water: '#7fc3f0',
  sky: '#a9d5f5', skyDot: '#8fc1ea', skyCloud: '#c3e3fa', skySwirl: '#d9eefd',
};

/** Each sfera colour as [body, rim and ring, highlight]. */
const HUE = {
  green: ['#66c46b', '#2f7f48', '#bdeeb4'],
  blue: ['#5d98ea', '#2d58a8', '#c3dcfb'],
  red: ['#e8626c', '#9e2f47', '#f9c3c6'],
  yellow: ['#f4cf4f', '#a87b14', '#fff0b8'],
};

// --- seeded randomness: the same tile is the same drawing, forever ----------

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function rng(seed) {
  let a = typeof seed === 'string' ? hash(seed) : seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

function surface(w, h = w) {
  if (typeof OffscreenCanvas === 'function') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

// --- the pen ------------------------------------------------------------------
//
// Ported from Composer's Key (src/art/pen.js), drawing in white on a scratch
// plate. The wobble is a slow two-sine bend tapered to nothing at both ends,
// so strokes wander like a hand in the middle and land exactly at a seam.

class Pen {
  constructor(c, r) { this.c = c; this.r = r; }

  _noise() {
    const p1 = this.r() * 6.283, p2 = this.r() * 6.283;
    const f1 = 1 + this.r() * 1.5, f2 = 2.5 + this.r() * 2;
    return (t) => Math.sin(t * f1 * Math.PI + p1) * 0.65 + Math.sin(t * f2 * Math.PI + p2) * 0.35;
  }

  /**
   * A path with the wobble baked in, so two strokes can follow the SAME
   * wandering line. A road is a kerb stroke and a bed stroke on top of it,
   * and if each wobbled on its own the kerbs would come out uneven.
   */
  bend(fn, amp = 0.5) {
    const nz = this._noise();
    return (t) => {
      const [x, y] = fn(t);
      const [x2, y2] = fn(Math.min(1, t + 0.01));
      const [x1, y1] = fn(Math.max(0, t - 0.01));
      let nx = -(y2 - y1), ny = x2 - x1;
      const len = Math.hypot(nx, ny) || 1;
      const d = nz(t) * amp * Math.sin(t * Math.PI);
      return [x + (nx / len) * d, y + (ny / len) * d];
    };
  }

  path(fn, { width = 3, wobble = 0.5, steps = 0 } = {}) {
    const c = this.c;
    let len = 0;
    for (let i = 1, [px, py] = fn(0); i <= 16; i++) {
      const [x, y] = fn(i / 16); len += Math.hypot(x - px, y - py); px = x; py = y;
    }
    const n = steps || Math.max(6, Math.ceil(len / 2));
    const f = wobble ? this.bend(fn, wobble) : fn;
    c.lineWidth = width;
    c.beginPath();
    for (let i = 0; i <= n; i++) {
      const [x, y] = f(i / n);
      if (i) c.lineTo(x, y); else c.moveTo(x, y);
    }
    c.stroke();
    return this;
  }

  /** Straight strokes snap to the pixel grid for their width (see pen.js). */
  line(x0, y0, x1, y1, o = {}) {
    const w = Math.round(o.width ?? 3);
    const snap = (v) => (w % 2 ? Math.floor(v) + 0.5 : Math.round(v));
    if (Math.abs(y1 - y0) < 1e-6) { y0 = y1 = snap(y0); }
    else if (Math.abs(x1 - x0) < 1e-6) { x0 = x1 = snap(x0); }
    return this.path((t) => [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t], o);
  }

  poly(pts, o) {
    for (let i = 1; i < pts.length; i++) this.line(...pts[i - 1], ...pts[i], o);
    return this;
  }

  arc(cx, cy, r, a0, a1, o) {
    return this.path((t) => {
      const a = a0 + (a1 - a0) * t;
      return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    }, o);
  }

  /**
   * His spiral: open, finer than the structure, the gap between turns never
   * closing. Small ones wind less, because at 51 px a wound-up small spiral
   * fills in to a blob.
   */
  spiral(cx, cy, r, { turns, shrink, dir = 1, start = 0, width = 2, ...o } = {}) {
    turns ??= r < 4.5 ? 0.85 : r < 6.5 ? 1.3 : 1.75;
    shrink ??= turns < 1 ? 0.45 : 0.75;
    return this.path((t) => {
      const a = start + dir * t * turns * 6.283;
      const rr = r * (1 - t * shrink);
      return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
    }, { width, wobble: 0.1, ...o });
  }

  /** A spiral that grows out of the end of a stroke heading `ang`. */
  curlAt(x, y, ang, r, { dir = 1, ...o } = {}) {
    const a = dir > 0 ? ang - Math.PI / 2 : ang + Math.PI / 2;
    return this.spiral(x - Math.cos(a) * r, y - Math.sin(a) * r, r, { dir, start: a, ...o });
  }

  /**
   * A curl small enough to sit on a 51 px tile without filling in: one turn,
   * ending at half its radius, which is an open hook rather than a coil. The
   * first pass wound these the way the style card's big spirals wind, and at
   * r 4 in 2 px every one of them came out a solid teardrop.
   */
  hook(cx, cy, r, o = {}) {
    return this.spiral(cx, cy, r, { turns: 1, shrink: 0.5, ...o });
  }

  /** A stalk that bends a little and ends in a spiral: his curl tree's unit. */
  stalk(x, y, ang, len, r, { dir = 1, bend = 0.25, width = 2, ...o } = {}) {
    const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
    const mx = (x + ex) / 2 - Math.sin(ang) * len * bend * dir;
    const my = (y + ey) / 2 + Math.cos(ang) * len * bend * dir;
    this.path((t) => [(1 - t) ** 2 * x + 2 * (1 - t) * t * mx + t * t * ex,
      (1 - t) ** 2 * y + 2 * (1 - t) * t * my + t * t * ey], { width, wobble: 0.2, ...o });
    return this.curlAt(ex, ey, Math.atan2(ey - my, ex - mx), r, { dir, width, turns: 1, shrink: 0.5, ...o });
  }

  disc(x, y, r) {
    const c = this.c;
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    return this;
  }

  fill(pts) {
    const c = this.c;
    c.beginPath();
    pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.closePath(); c.fill();
    return this;
  }

  rect(x, y, w, h) { this.c.fillRect(x, y, w, h); return this; }
}

// --- the plate: one tile, built up a colour at a time ------------------------

class Plate {
  constructor(w, h, seed, onto = null) {
    this.w = w; this.h = h;
    this.cv = onto || surface(w, h);
    this.ctx = this.cv.getContext('2d');
    this.scratch = surface(w, h);
    this.sx = this.scratch.getContext('2d', { willReadFrequently: true });
    this.r = rng(seed);
    this.busy = new Uint8Array(w * h);   // anything drawn that is not ground
    this.last = new Uint8Array(w * h);   // the pixels the last layer set
    this.upright = [];                   // buildings, drawn after the turn
  }

  /**
   * A building, drawn FRONT ON, so it has to stand upright whichever way its
   * tile is turned. The ground turns (walls, roads, the wind all have to
   * point where the rules say they point); a house lying on its side reads
   * as an arrow. So a building is remembered here by where it stands, and
   * drawn upright at that spot once the ground has been turned. `r` is
   * roughly how much room it takes, kept clear of meadow ornament.
   */
  stand(at, r, draw) {
    this.upright.push({ at, draw });
    const [x, y] = at;
    for (let j = Math.max(0, Math.floor(y - r)); j <= Math.min(this.h - 1, Math.ceil(y + r)); j++) {
      for (let i = Math.max(0, Math.floor(x - r)); i <= Math.min(this.w - 1, Math.ceil(x + r)); i++) {
        if (Math.hypot(i + 0.5 - x, j + 0.5 - y) <= r) this.busy[j * this.w + i] = 1;
      }
    }
  }

  /**
   * Draw `fn` in one colour, hard-edged, onto the plate. `cut` is the
   * coverage a pixel needs to be ink: 128 for fills (an edge pixel goes to
   * whichever side owns more of it), lower for strokes so a 2 px line stays
   * 2 px after thresholding.
   */
  layer(color, fn, { cut = 110, busy = true } = {}) {
    const { w, h, sx } = this;
    sx.setTransform(1, 0, 0, 1, 0, 0);
    sx.clearRect(0, 0, w, h);
    sx.save();
    sx.fillStyle = sx.strokeStyle = '#fff';
    sx.lineCap = 'round'; sx.lineJoin = 'round';
    fn(new Pen(sx, this.r), sx);
    sx.restore();
    const img = sx.getImageData(0, 0, w, h);
    const d = img.data;
    const [r, g, b] = rgb(color);
    this.last.fill(0);
    for (let i = 0, p = 0; i < d.length; i += 4, p++) {
      if (d[i + 3] >= cut) {
        d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
        this.last[p] = 1;
        if (busy) this.busy[p] = 1;
      } else d[i + 3] = 0;
    }
    sx.putImageData(img, 0, 0);
    this.ctx.drawImage(this.scratch, 0, 0);
    return this.last.slice();
  }

  /** Is a disc of radius `r` round (x, y) clear of everything but ground? */
  free(x, y, r, margin = 3) {
    if (x - r < margin || y - r < margin || x + r > this.w - margin || y + r > this.h - margin) return false;
    for (let j = Math.floor(y - r); j <= Math.ceil(y + r); j++) {
      for (let i = Math.floor(x - r); i <= Math.ceil(x + r); i++) {
        if (Math.hypot(i + 0.5 - x, j + 0.5 - y) > r) continue;
        if (this.busy[j * this.w + i]) return false;
      }
    }
    return true;
  }
}

// --- geometry -------------------------------------------------------------

const SIDE_MID = [[MID, 0], [PX, MID], [MID, PX], [0, MID]];
const CORNER = [[0, 0], [PX, 0], [PX, PX], [0, PX]];
const SIDE_ANGLE = [-Math.PI / 2, 0, Math.PI / 2, Math.PI];   // pointing out of side s

/** Turn a point a number of quarter turns clockwise round the tile's middle. */
function turn([x, y], q) {
  let px = x - MID, py = y - MID;
  for (let i = 0; i < (q & 3); i++) [px, py] = [-py, px];
  return [px + MID, py + MID];
}

/**
 * Record what shape.js draws (moveTo / lineTo / bezierCurveTo) as polylines,
 * so a city's outline can be stroked by the wobbling pen rather than by a
 * ruler.
 */
function trace(draw) {
  const polys = [];
  let cur = null;
  let at = [0, 0];
  const rec = {
    moveTo(x, y) { cur = [[x, y]]; polys.push(cur); at = [x, y]; },
    lineTo(x, y) { if (!cur) { cur = [at.slice()]; polys.push(cur); } cur.push([x, y]); at = [x, y]; },
    bezierCurveTo(ax, ay, bx, by, x, y) {
      if (!cur) { cur = [at.slice()]; polys.push(cur); }
      const [x0, y0] = at;
      for (let i = 1; i <= 20; i++) {
        const t = i / 20, u = 1 - t;
        cur.push([u * u * u * x0 + 3 * u * u * t * ax + 3 * u * t * t * bx + t * t * t * x,
          u * u * u * y0 + 3 * u * u * t * ay + 3 * u * t * t * by + t * t * t * y]);
      }
      at = [x, y];
    },
    closePath() { if (cur) cur.push(cur[0].slice()); },
  };
  draw(rec);
  return polys.map((pts) => pts.map(([x, y]) => [x * PX, y * PX]));
}

/** A polyline as a function of t in [0, 1], by distance along it. */
function along(pts) {
  const acc = [0];
  for (let i = 1; i < pts.length; i++) {
    acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  }
  const total = acc[acc.length - 1] || 1;
  return (t) => {
    const d = t * total;
    let i = 1;
    while (i < acc.length - 1 && acc[i] < d) i++;
    const seg = acc[i] - acc[i - 1] || 1;
    const k = (d - acc[i - 1]) / seg;
    return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k];
  };
}

/**
 * Where a road runs. Two opposite sides: straight through. Two adjacent sides:
 * a quarter circle round the corner they share. One side: from the edge to
 * the middle, where something always stands to meet it.
 */
function roadLines(f) {
  const s = f.sides;
  if (s.length === 2) {
    const [a, b] = s;
    if (((a - b + 4) & 3) === 2) {
      const [x0, y0] = SIDE_MID[a], [x1, y1] = SIDE_MID[b];
      return [(t) => [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]];
    }
    const first = ((b - a + 4) & 3) === 1 ? a : b;    // the side the corner follows
    const [cx, cy] = CORNER[(first + 1) & 3];
    const [ax, ay] = SIDE_MID[a], [bx, by] = SIDE_MID[b];
    const a0 = Math.atan2(ay - cy, ax - cx);
    let a1 = Math.atan2(by - cy, bx - cx);
    if (a1 - a0 > Math.PI) a1 -= 2 * Math.PI;
    if (a0 - a1 > Math.PI) a1 += 2 * Math.PI;
    return [(t) => [cx + Math.cos(a0 + (a1 - a0) * t) * MID, cy + Math.sin(a0 + (a1 - a0) * t) * MID]];
  }
  return s.map((side) => {
    const [x0, y0] = SIDE_MID[side];
    return (t) => [x0 + (MID - x0) * t, y0 + (MID - y0) * t];
  });
}

// --- the painters ---------------------------------------------------------

const has = (type, kind) => type.marks.some((m) => m.kind === kind);

/** Does something stand in the middle of this tile for a road stub to meet? */
function centred(type) {
  return type.feats.some((f) => f.type === 'temple')
    || type.marks.some((m) => ['village', 'flier', 'zephyr'].includes(m.kind) || (m.kind === 'turbine' && m.on != null && type.feats[m.on]?.type === 'road'))
    || !!type.swing;
}

/** Every road on the tile: kerbs first, then the bed over all of them. */
function paintRoads(p, type, cityMask) {
  const lines = [];
  const gates = [];
  for (const f of type.feats) {
    if (f.type !== 'road') continue;
    for (let fn of roadLines(f)) {
      // A lone stub with nothing in the middle runs into the city it serves
      // and stops at the wall, where a gate is drawn.
      if (f.sides.length === 1 && !centred(type) && cityMask) {
        let stop = 1;
        for (let k = 0; k <= 40; k++) {
          const [x, y] = fn(k / 40);
          if (cityMask[Math.floor(y) * PX + Math.floor(x)]) { stop = k / 40; break; }
        }
        const base = fn;
        fn = (t) => base(t * stop);
        gates.push(base(stop));
      }
      lines.push(p.r ? new Pen(null, p.r).bend(fn, 0.45) : fn);
    }
  }
  if (!lines.length) return lines;
  p.layer(INK.kerb, (pen) => lines.forEach((fn) => pen.path(fn, { width: 9, wobble: 0 })));
  p.layer(INK.road, (pen) => lines.forEach((fn) => pen.path(fn, { width: 5, wobble: 0 })));
  for (const [gx, gy] of gates) {
    // A tower standing at the gate already is the gatehouse.
    if (p.upright.some(({ at }) => Math.hypot(at[0] - gx, at[1] - gy) < 9)) continue;
    p.layer(INK.wall, (pen) => pen.disc(gx, gy, 5.5));
    p.layer(INK.ink, (pen) => pen.disc(gx, gy, 2.6));
  }
  return lines;
}

// --- sprites placed by hand ---------------------------------------------------
//
// Below about ten pixels a drawing stops being a drawing and becomes a choice
// of which pixels are on. Paths thresholded at that size came out as hearts
// and mushrooms, so the smallest buildings are drawn the way pixel art is
// actually drawn: a pixel at a time, one letter per pixel.

const SPRITE_INK = {
  o: 'wall', R: 'roof', r: 'roofDeep', W: 'marble', D: 'roofDeep', k: 'ink', G: 'gold', w: 'plaster',
};

const HOUSE = [
  '....o....',
  '...oRo...',
  '..oRRRo..',
  '.oRRRRRo.',
  'orrrrrrro',
  '.oWWWWWo.',
  '.oWWDWWo.',
  '.ooooooo.',
];

const COTTAGE = [
  '...o...',
  '..oRo..',
  '.oRRRo.',
  'orrrrro',
  '.oWDWo.',
  '.ooooo.',
];

const TOWER = [
  '...o...',
  '..oRo..',
  '..oRo..',
  '.oRRRo.',
  'oRRRRRo',
  'ooooooo',
  '.oWWWo.',
  '.oWkWo.',
  '.oWWWo.',
  '.oWWWo.',
  '.ooooo.',
];

const PENNANT = [
  '.kGG',
  '.kGGG',
  '.k',
];

/** Lay a hand-drawn sprite with its bottom middle at (x, y). */
function stamp(p, rows, x, y, recolor = {}) {
  const h = rows.length, w = Math.max(...rows.map((r) => r.length));
  const x0 = Math.round(x - (w - 1) / 2), y0 = Math.round(y) - h + 1;
  const c = p.ctx;
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === '.' || ch === ' ') continue;
      const px = x0 + i, py = y0 + j;
      if (px < 0 || py < 0 || px >= p.w || py >= p.h) continue;
      c.fillStyle = INK[recolor[ch] || SPRITE_INK[ch]];
      c.fillRect(px, py, 1, 1);
      p.busy[py * p.w + px] = 1;
    }
  });
}

/** A house, front on. Bottom middle at (x, y). */
function house(p, x, y, { small = false, deep = false } = {}) {
  stamp(p, small ? COTTAGE : HOUSE, x, y, deep ? { R: 'roofDeep', r: 'roof' } : {});
}

/** A tower standing on the wall, its foot on (x, y), maybe flying a pennant. */
function tower(p, x, y, { pennant = false } = {}) {
  stamp(p, TOWER, x, y + 4);
  if (pennant) stamp(p, PENNANT, x + 1, y + 4 - TOWER.length);
}

/**
 * A city: plaster, a wall where it meets the country, towers where the wall
 * bulges, and a few houses inside. A city that reaches a side covers that
 * side corner to corner, so the plaster runs straight on into the next tile.
 */
function paintCities(p, type, keep = []) {
  const mask = new Uint8Array(PX * PX);
  let pennants = type.shields || 0;
  const cities = type.feats.filter((f) => f.type === 'city');
  const shapes = cities.map((f) => featureShape(f.sides)).filter(Boolean);
  if (!shapes.length) return null;
  // Plaster first, all of it, so walls and houses can be laid over it.
  for (const shape of shapes) {
    const fill = trace((r) => shape.path(r));
    const got = p.layer(INK.plaster, (pen, c) => {
      c.beginPath();
      for (const pts of fill) pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.fill();
    }, { cut: 128 });
    for (let i = 0; i < got.length; i++) if (got[i]) mask[i] = 1;
  }
  // Where the towers will stand, so no house is built under one.
  const towers = shapes.flatMap((s) => s.towers.map(([x, y]) => [x * PX, y * PX]));
  // Houses where a whole house fits inside the plaster, well clear of the wall.
  const spots = [];
  for (let y = 7; y < PX - 7; y += 2) {
    for (let x = 7; x < PX - 7; x += 2) {
      let inside = true;
      for (const [dx, dy] of [[-7, -6], [7, -6], [-7, 6], [7, 6], [0, -8], [0, 7], [-8, 0], [8, 0]]) {
        if (!mask[(y + dy) * PX + (x + dx)]) { inside = false; break; }
      }
      if (inside && towers.every(([tx, ty]) => Math.hypot(tx - x, ty - y) >= 11)
        && keep.every(([kx, ky, kr]) => Math.hypot(kx - x, ky - y) >= kr + 6)) spots.push([x, y]);
    }
  }
  const area = mask.reduce((n, v) => n + v, 0);
  const want = Math.max(1, Math.min(4, Math.round(area / 300)));
  const chosen = [];
  for (let i = spots.length - 1; i > 0; i--) {
    const j = Math.floor(p.r() * (i + 1));
    [spots[i], spots[j]] = [spots[j], spots[i]];
  }
  for (const s of spots) {
    if (chosen.length >= want) break;
    if (chosen.every((c) => Math.hypot(c[0] - s[0], c[1] - s[1]) >= 12)) chosen.push(s);
  }
  chosen.forEach(([x, y], i) => p.stand([x, y], 6, (q, X, Y) => house(q, X, Y + 4, { deep: i % 2 === 1, small: i === 3 })));
  // The wall, wobbling, then a tower on each stretch of it.
  for (const shape of shapes) {
    const rims = trace((r) => shape.rim(r));
    p.layer(INK.wall, (pen) => rims.forEach((pts) => pen.path(along(pts), { width: 3, wobble: 0.6 })));
    for (const [tx, ty] of shape.towers) {
      // A tower would stand in the way of the tile's landmark: leave it out.
      if (keep.some(([kx, ky, kr]) => Math.hypot(kx - tx * PX, ky - ty * PX) < kr + 4)) continue;
      const pennant = pennants > 0;
      p.stand([tx * PX, ty * PX], 6, (q, X, Y) => tower(q, X, Y, { pennant }));
      if (pennants > 0) pennants--;
    }
  }
  return mask;
}

/** Half of a sphere on side `side`. Its rings close into full rings across the seam. */
function paintSfera(p, side, hue) {
  const [body, rim, light] = HUE[hue] || HUE.green;
  const [cx, cy] = SIDE_MID[side];
  p.layer(INK.ink, (pen) => pen.disc(cx, cy, 13.5), { cut: 128 });
  p.layer(body, (pen) => pen.disc(cx, cy, 11.5), { cut: 128 });
  p.layer(rim, (pen) => pen.arc(cx, cy, 7, 0, Math.PI * 2, { width: 2, wobble: 0 }), { cut: 120 });
  // A lit crescent, turned with the side so every half catches the same light.
  const a = SIDE_ANGLE[side] + Math.PI;
  p.layer(light, (pen) => pen.arc(cx, cy, 9.5, a - 0.9, a - 0.25, { width: 2, wobble: 0 }), { cut: 120 });
}

/** A temple: steps, a colonnade, a gold pediment with a pennant on it. */
function paintTemple(p, cx = MID, cy = MID) {
  cx = Math.round(cx - 0.5) + 0.5; cy = Math.round(cy - 0.5) + 0.5;
  p.layer(INK.ink, (pen) => {
    pen.rect(cx - 12.5, cy + 6, 25, 6);           // steps
    pen.rect(cx - 10.5, cy - 4, 21, 11);          // colonnade
    pen.fill([[cx - 13, cy - 3.5], [cx, cy - 13], [cx + 13, cy - 3.5]]);
    pen.line(cx, cy - 13, cx, cy - 18, { width: 1, wobble: 0 });
  }, { cut: 128 });
  p.layer(INK.marble, (pen) => {
    pen.rect(cx - 11.5, cy + 7, 23, 2);
    pen.rect(cx - 10.5, cy + 10, 21, 1);
    for (const dx of [-8.5, -3.5, 1.5, 6.5]) pen.rect(cx + dx, cy - 2, 2, 8);
  }, { cut: 128 });
  p.layer(INK.gold, (pen) => pen.fill([[cx - 10.5, cy - 4.5], [cx, cy - 11], [cx + 10.5, cy - 4.5]]), { cut: 110 });
  p.layer(INK.roof, (pen) => pen.fill([[cx + 0.5, cy - 18.5], [cx + 6, cy - 16.5], [cx + 0.5, cy - 14.5]]), { cut: 100 });
}

/**
 * A cloud with a curl in it: the zephyr's body. Its outline is a second,
 * fatter cloud behind it, which is the cheapest way to outline a union of
 * circles with hard pixels.
 */
function puff(p, cx, cy, s = 1, { warm = false } = {}) {
  const blobs = [[0, 1.5, 7], [-6.5, 3, 4.5], [6.5, 3, 4.5], [-3.5, -3.5, 5], [3.5, -3.5, 4.5]]
    .map(([dx, dy, r]) => [cx + dx * s, cy + dy * s, r * s]);
  p.layer(warm ? INK.warmLine : INK.cloudLine, (pen) => blobs.forEach(([x, y, r]) => pen.disc(x, y, r + 2)), { cut: 128 });
  p.layer(warm ? INK.warm : INK.cloud, (pen) => blobs.forEach(([x, y, r]) => pen.disc(x, y, r)), { cut: 128 });
  p.layer(warm ? INK.warmLine : INK.cloudLine, (pen) => pen.hook(cx + 0.5 * s, cy + 0.5 * s, 4.8 * s, { dir: 1, start: 2.4 }), { cut: 128 });
}

/**
 * A ZEPHYR: a cloud blowing a curl tree. The stalks leave the cloud and fan
 * out the way it blows, each ending in an open spiral, which is the shape
 * of the curl trees on Timothy's own site turned into weather. One blowing
 * at double strength blows two streams.
 */
function paintZephyr(p, mark) {
  const dirs = mark.dirs || [mark.dir ?? 0];
  const single = dirs.length === 1;
  const strong = (mark.push || 1) > 1;
  const body = single ? turn([MID, 30], dirs[0]) : [MID, MID];
  const reach = single ? 8 : 9;
  p.layer(INK.wind, (pen) => {
    for (const d of dirs) {
      const out = SIDE_ANGLE[d];
      // Each curl turns AWAY from the middle of its fan. Turned inward, a
      // curl winds back over its own stalk and fills in.
      // A wind that blows several ways has two stalks a side, not three:
      // with three, the outer curls of neighbouring sides run into each other.
      (single ? [-0.42, 0, 0.42] : [-0.26, 0.26]).forEach((da) => {
        const a = out + da;
        const x = body[0] + Math.cos(a) * reach, y = body[1] + Math.sin(a) * reach;
        const len = single ? (da ? 9 : 11) : 7;
        pen.stalk(x, y, a, len, single ? 4.6 : 3.8, { dir: da < 0 ? -1 : 1, bend: 0.12 });
      });
    }
  }, { cut: 128 });
  // Double strength is two clouds, one behind the other: count the clouds
  // and you have the power, which no amount of extra wind lines could say.
  if (strong) {
    const back = single ? turn([MID - 7, 36], dirs[0]) : [MID - 6, MID + 6];
    puff(p, back[0], back[1], 0.75);
  }
  puff(p, body[0], body[1], single ? 1 : 0.85);
}

/**
 * A GUST CANNON, seen from above: a bronze barrel on two wheels, pointing
 * the way it fires, and a short orange blast out of the muzzle. A double
 * cannon has two barrels.
 */
function paintCannon(p, mark) {
  const d = mark.dirs?.[0] ?? mark.dir ?? 0;
  const twin = (mark.push || 1) > 1;
  const xs = twin ? [MID - 6, MID + 6] : [MID];
  const T = (pts) => pts.map((q) => turn(q, d));
  for (const bx of xs) {
    const w = twin ? 2.6 : 3.4;
    p.layer(INK.ink, (pen) => {
      pen.fill(T([[bx - w - 2, 36], [bx - w - 0.5, 14], [bx + w + 0.5, 14], [bx + w + 2, 36]]));
      pen.fill(T([[bx - w - 2.5, 12], [bx + w + 2.5, 12], [bx + w + 2.5, 17], [bx - w - 2.5, 17]]));
      const [kx, ky] = turn([bx, 37], d); pen.disc(kx, ky, 2.8);
    }, { cut: 128 });
    p.layer(INK.bronze, (pen) => {
      pen.fill(T([[bx - w, 35], [bx - w + 1, 16], [bx + w - 1, 16], [bx + w, 35]]));
      pen.fill(T([[bx - w - 1, 13], [bx + w + 1, 13], [bx + w + 1, 15.5], [bx - w - 1, 15.5]]));
    }, { cut: 128 });
    p.layer(INK.goldDeep, (pen) => {
      for (const y of [22, 29]) { const [a0, a1] = [turn([bx - w + 0.5, y], d), turn([bx + w - 0.5, y], d)]; pen.line(a0[0], a0[1], a1[0], a1[1], { width: 1.5, wobble: 0 }); }
    }, { cut: 110 });
  }
  if (!twin) {
    p.layer(INK.ink, (pen) => { for (const sx of [MID - 9, MID + 9]) { const [x, y] = turn([sx, 31], d); pen.disc(x, y, 5); } }, { cut: 128 });
    p.layer(INK.timber, (pen) => { for (const sx of [MID - 9, MID + 9]) { const [x, y] = turn([sx, 31], d); pen.disc(x, y, 3.4); } }, { cut: 128 });
    p.layer(INK.gold, (pen) => { for (const sx of [MID - 9, MID + 9]) { const [x, y] = turn([sx, 31], d); pen.disc(x, y, 1.2); } }, { cut: 100 });
  }
  const out = SIDE_ANGLE[d];
  p.layer(INK.blast, (pen) => {
    for (const bx of xs) {
      [-0.5, 0.5].forEach((da) => {
        const [x, y] = turn([bx, 11], d);
        pen.stalk(x, y, out + da, 5, 4, { dir: da < 0 ? -1 : 1, bend: 0.15, width: 2 });
      });
    }
  }, { cut: 128 });
}

/**
 * The Palazzo: a gold dome between two towers, sitting in its city. The one
 * tile that is allowed to be grand, with a pair of scrolls at its feet like
 * every crafted thing in Composer's Key.
 */
function paintPalazzo(p, cx, base) {
  cx = Math.round(cx - 0.5) + 0.5; base = Math.round(base - 0.5) + 0.5;
  p.layer(INK.ink, (pen) => {
    pen.rect(cx - 9.5, base - 9, 19, 10);
    pen.disc(cx, base - 9, 7.5);
    pen.rect(cx - 15.5, base - 13, 7, 14);
    pen.rect(cx + 8.5, base - 13, 7, 14);
    pen.fill([[cx - 16.5, base - 12], [cx - 12, base - 19], [cx - 7.5, base - 12]]);
    pen.fill([[cx + 7.5, base - 12], [cx + 12, base - 19], [cx + 16.5, base - 12]]);
    pen.line(cx, base - 16, cx, base - 20, { width: 1, wobble: 0 });
  }, { cut: 128 });
  p.layer(INK.marble, (pen) => {
    pen.rect(cx - 8.5, base - 8, 17, 8);
    pen.rect(cx - 14.5, base - 11, 5, 11);
    pen.rect(cx + 9.5, base - 11, 5, 11);
  }, { cut: 128 });
  p.layer(INK.gold, (pen) => pen.disc(cx, base - 9.5, 5.6), { cut: 128 });
  p.layer(INK.marble, (pen) => pen.rect(cx - 8.5, base - 8.5, 17, 1), { cut: 128 });
  p.layer(INK.roof, (pen) => {
    pen.fill([[cx - 15, base - 12], [cx - 12, base - 17], [cx - 9, base - 12]]);
    pen.fill([[cx + 9, base - 12], [cx + 12, base - 17], [cx + 15, base - 12]]);
  }, { cut: 110 });
  p.layer(INK.ink, (pen) => {
    pen.arc(cx, base - 0.5, 2.5, Math.PI, 2 * Math.PI, { width: 1.5, wobble: 0 });
    pen.rect(cx - 2.5, base - 1, 1, 1.5); pen.rect(cx + 1.5, base - 1, 1, 1.5);
  }, { cut: 110 });
  p.layer(INK.goldDeep, (pen) => {
    pen.curlAt(cx - 16, base + 0.5, Math.PI, 3.6, { dir: -1 });
    pen.curlAt(cx + 16, base + 0.5, 0, 3.6, { dir: 1 });
  }, { cut: 110 });
  p.layer(INK.gold, (pen) => pen.fill([[cx + 0.5, base - 20.5], [cx + 5.5, base - 18.5], [cx + 0.5, base - 16.5]]), { cut: 100 });
}

/**
 * The tower a turbine stands on. The sails are not drawn here: they turn, so
 * the renderer lays them over the hub every frame (see `pixelSails`).
 */
const hubOver = ([x, y]) => [Math.round(x - 0.5) + 0.5, Math.round(y - 9) + 0.5];

/**
 * Where a turbine's sails turn, in the tile's 51 px space at a rotation. The
 * tower stands upright on its spot whichever way the tile is turned, so the
 * hub is always straight above it.
 */
export function turbineHub(type, rot = 0) {
  const i = type.marks.findIndex((m) => m.kind === 'turbine');
  if (i < 0) return null;
  const [x, y] = type.markSpots[i];
  return hubOver(turn([x * PX, y * PX], rot));
}

function paintTurbine(p, x, y) {
  const [hx, hy] = hubOver([x, y]);
  p.layer(INK.ink, (pen) => {
    pen.fill([[hx - 4.5, hy + 1], [hx + 4.5, hy + 1], [hx + 6.5, hy + 16], [hx - 6.5, hy + 16]]);
    pen.fill([[hx - 6, hy + 2], [hx, hy - 4.5], [hx + 6, hy + 2]]);
  }, { cut: 128 });
  p.layer(INK.marble, (pen) => pen.fill([[hx - 3.2, hy + 2.5], [hx + 3.2, hy + 2.5], [hx + 5, hy + 14.6], [hx - 5, hy + 14.6]]), { cut: 128 });
  p.layer(INK.roof, (pen) => pen.fill([[hx - 4, hy + 1.5], [hx, hy - 2.6], [hx + 4, hy + 1.5]]), { cut: 110 });
  p.layer(INK.ink, (pen) => { pen.rect(hx - 1, hy + 8, 2, 4); pen.disc(hx, hy, 2.4); }, { cut: 128 });
}

/** A flying machine pointing north: a hull, bat wings ribbed like Leonardo's. */
function paintFlier(p, mark) {
  const d = mark.dir ?? 0;
  const T = (pts) => pts.map((q) => turn(q, d));
  const wing = (s) => [[MID + s * 3, 22], [MID + s * 21, 15], [MID + s * 19, 22], [MID + s * 14, 21], [MID + s * 11, 27], [MID + s * 3, 28]];
  p.layer(INK.wall, (pen) => { pen.fill(T(wing(-1))); pen.fill(T(wing(1))); }, { cut: 128 });
  p.layer(INK.cloudShade, (pen) => {
    for (const s of [-1, 1]) pen.fill(T([[MID + s * 4, 23], [MID + s * 18.5, 17.5], [MID + s * 17, 21.5], [MID + s * 13.5, 20.5], [MID + s * 10.5, 25.5], [MID + s * 4, 26.5]]));
  }, { cut: 128 });
  p.layer(INK.wall, (pen) => {
    for (const s of [-1, 1]) {
      const [a, b] = T([[MID + s * 4, 24], [MID + s * 19, 17]]);
      pen.line(a[0], a[1], b[0], b[1], { width: 1.5, wobble: 0 });
    }
  }, { cut: 110 });
  p.layer(INK.ink, (pen) => {
    const [c] = T([[MID, 24]]);
    pen.c.save(); pen.c.translate(c[0], c[1]); pen.c.rotate(d * Math.PI / 2);
    pen.c.beginPath(); pen.c.ellipse(0, 0, 5, 10.5, 0, 0, Math.PI * 2); pen.c.fill();
    pen.c.restore();
  }, { cut: 128 });
  p.layer(INK.bronze, (pen) => {
    const [c] = T([[MID, 24]]);
    pen.c.save(); pen.c.translate(c[0], c[1]); pen.c.rotate(d * Math.PI / 2);
    pen.c.beginPath(); pen.c.ellipse(0, 0, 3, 8.5, 0, 0, Math.PI * 2); pen.c.fill();
    pen.c.restore();
  }, { cut: 128 });
  p.layer(INK.wind, (pen) => {
    const [nose] = T([[MID, 13]]);
    pen.hook(nose[0], nose[1], 4.6, { dir: 1, start: SIDE_ANGLE[d] });
  }, { cut: 128 });
}

/** The windvane: a gold arrow on a post, lying along the two roads it joins. */
function paintVane(p) {
  const shaft = [[MID, 12], [MID, 39]];
  p.layer(INK.ink, (pen) => {
    pen.line(MID, 12, MID, 39, { width: 4, wobble: 0 });
    pen.fill([[MID - 5.5, 15], [MID, 6.5], [MID + 5.5, 15]]);
    pen.fill([[MID - 6, 41], [MID - 2, 33], [MID + 2, 33], [MID + 6, 41], [MID, 38]]);
    pen.disc(MID, MID, 4);
  }, { cut: 128 });
  p.layer(INK.gold, (pen) => {
    pen.line(shaft[0][0], shaft[0][1] + 2, shaft[1][0], shaft[1][1] - 2, { width: 2, wobble: 0 });
    pen.fill([[MID - 3.6, 14], [MID, 8.6], [MID + 3.6, 14]]);
    pen.fill([[MID - 4, 39.5], [MID - 1.5, 34.5], [MID + 1.5, 34.5], [MID + 4, 39.5], [MID, 37]]);
    pen.disc(MID, MID, 2.4);
  }, { cut: 110 });
}

/** A village: three houses huddled where the roads meet. */
function paintVillage(p) {
  p.stand([MID - 5.5, MID - 3], 6, (q, x, y) => house(q, x, y + 4));
  p.stand([MID + 5.5, MID - 3], 6, (q, x, y) => house(q, x, y + 4, { deep: true }));
  p.stand([MID, MID + 5], 5, (q, x, y) => house(q, x, y + 3, { small: true }));
}

/** A crossroads with nothing on it gets a fountain. */
function paintFountain(p) {
  p.layer(INK.ink, (pen) => pen.disc(MID, MID, 7.5), { cut: 128 });
  p.layer(INK.marble, (pen) => pen.disc(MID, MID, 5.6), { cut: 128 });
  p.layer(INK.water, (pen) => pen.disc(MID, MID, 3.6), { cut: 128 });
  p.layer(INK.marble, (pen) => pen.disc(MID, MID, 1.2), { cut: 100 });
}

/**
 * The Abbazia: walled edge to edge (it caps everything it touches), a curl
 * tucked into each corner the way Composer's Key finishes a wall, and a bell
 * tower in the middle.
 */
function paintAbbazia(p) {
  p.layer(INK.stone, (pen) => pen.rect(0, 0, PX, PX), { cut: 128, busy: false });
  p.layer(INK.wall, (pen) => {
    pen.line(3.5, 4.5, 47.5, 4.5, { wobble: 0.4 });
    pen.line(3.5, 46.5, 47.5, 46.5, { wobble: 0.4 });
    pen.line(4.5, 3.5, 4.5, 47.5, { wobble: 0.4 });
    pen.line(46.5, 3.5, 46.5, 47.5, { wobble: 0.4 });
  }, { cut: 110 });
  p.layer(INK.wall, (pen) => {
    pen.curlAt(10, 4.5, 0, 4, { dir: 1 });
    pen.curlAt(41, 46.5, Math.PI, 4, { dir: 1 });
    pen.curlAt(46.5, 10, Math.PI / 2, 4, { dir: 1 });
    pen.curlAt(4.5, 41, -Math.PI / 2, 4, { dir: 1 });
  }, { cut: 110 });
  p.stand([MID, MID], 13, abbey);
}

/** The Abbazia's church and bell tower, its base 11 below (cx, cy). */
function abbey(p, cx, cy) {
  cx = Math.round(cx - 0.5) + 0.5;
  const base = Math.round(cy + 11 - 0.5) + 0.5;
  p.layer(INK.ink, (pen) => {
    pen.rect(cx - 12.5, base - 11, 17, 12);
    pen.fill([[cx - 14, base - 10], [cx - 4, base - 19], [cx + 6, base - 10]]);
    pen.rect(cx + 2.5, base - 23, 9, 24);
    pen.fill([[cx + 1.5, base - 22], [cx + 7, base - 31], [cx + 12.5, base - 22]]);
  }, { cut: 128 });
  p.layer(INK.marble, (pen) => { pen.rect(cx - 11.5, base - 9, 14, 9); pen.rect(cx + 3.5, base - 21, 7, 21); }, { cut: 128 });
  p.layer(INK.roof, (pen) => {
    pen.fill([[cx - 11.5, base - 10.5], [cx - 4, base - 17], [cx + 2.5, base - 10.5]]);
    pen.fill([[cx + 3.5, base - 22.5], [cx + 7, base - 28.5], [cx + 10.5, base - 22.5]]);
  }, { cut: 110 });
  p.layer(INK.gold, (pen) => pen.disc(cx + 7, base - 17, 2), { cut: 110 });
  p.layer(INK.ink, (pen) => { pen.rect(cx - 6, base - 6, 3, 6); pen.rect(cx + 6, base - 9, 2, 3); }, { cut: 128 });
}

/**
 * Ornament for the open country, grown out of the forms the way Timothy
 * grows his: grass stalks curling off the kerb of a road and off the foot of
 * a city wall, and a soft swirl or two in the meadow where nothing else is.
 */
function paintMeadow(p, type, roads) {
  // Stalks off the kerbs.
  for (const fn of roads) {
    for (const t of [0.28, 0.72]) {
      if (p.r() < 0.35) continue;
      const [x, y] = fn(t);
      const [x2, y2] = fn(Math.min(1, t + 0.02));
      const ang = Math.atan2(y2 - y, x2 - x);
      const side = p.r() < 0.5 ? 1 : -1;
      const out = ang + side * Math.PI / 2;
      const sx = x + Math.cos(out) * 5.5, sy = y + Math.sin(out) * 5.5;
      const lean = out + side * 0.5;
      const tipx = sx + Math.cos(lean) * 8, tipy = sy + Math.sin(lean) * 8;
      if (!p.free(tipx, tipy, 4, 3)) continue;
      p.layer(INK.grass, (pen) => pen.stalk(sx, sy, lean, 5, 4.4, { dir: side, bend: 0.2 }), { cut: 128 });
    }
  }
  // A breeze or two over the open country: the sky's own curl, drawn in a
  // darker green. Free-standing spirals read as stray letters at this size;
  // a stalk that ends in a curl reads as wind going by.
  let made = 0;
  for (let tries = 0; tries < 40 && made < 2; tries++) {
    const x = 9 + p.r() * (PX - 26), y = 10 + p.r() * (PX - 20);
    if (!p.free(x + 7, y - 2, 8, 4)) continue;
    const dir = p.r() < 0.5 ? 1 : -1;
    p.layer(INK.meadowDeep, (pen) => pen.stalk(x, y, -0.15 * dir, 9, 4.2, { dir: -dir, bend: 0.2 }), { cut: 128 });
    made++;
  }
}

/** Paint a tile type, unrotated. */
function paintCanonical(type) {
  const p = new Plate(PX, PX, `soffiando:${type.id}`);
  const marks = type.marks;
  if (type.wild || has(type, 'abbazia')) {
    paintAbbazia(p);
    return p;
  }
  p.layer(INK.meadow, (pen) => pen.rect(0, 0, PX, PX), { cut: 128, busy: false });
  // Room for the tile's landmark, kept clear of the city's towers and houses.
  const keep = [];
  if (centred(type) || type.feats.some((f) => f.type === 'temple')) keep.push([MID, MID, 14]);
  marks.forEach((m, i) => {
    const [x, y] = type.markSpots[i];
    if (m.kind === 'turbine') keep.push([x * PX, y * PX - 4, 10]);
    if (m.kind === 'palazzo') keep.push([MID, Math.min(20, Math.round(y * PX) + 3) - 8, 16]);
  });
  const cityMask = paintCities(p, type, keep);
  const roads = paintRoads(p, type, cityMask);
  for (const f of type.feats) if (f.type === 'sfera') paintSfera(p, f.sides[0], f.hue);
  if (type.feats.some((f) => f.type === 'temple')) p.stand([MID, MID], 14, paintTemple);
  if (type.swing) paintVane(p);
  if (has(type, 'village')) paintVillage(p);
  const stubs = type.feats.filter((f) => f.type === 'road' && f.sides.length === 1).length;
  if (stubs >= 4 && !centred(type)) paintFountain(p);
  const mill = marks.findIndex((m) => m.kind === 'turbine');
  if (mill >= 0) {
    const [x, y] = type.markSpots[mill];
    p.stand([x * PX, y * PX], 9, paintTurbine);
  }
  const pal = marks.findIndex((m) => m.kind === 'palazzo');
  if (pal >= 0) {
    const base = Math.min(20, Math.round(type.markSpots[pal][1] * PX) + 3);
    p.stand([MID, base - 8], 13, (q, x, y) => paintPalazzo(q, x, y + 8));
  }
  for (const m of marks) {
    if (m.kind === 'flier') paintFlier(p, m);
    if (m.kind === 'zephyr') { if (m.blast) paintCannon(p, m); else paintZephyr(p, m); }
  }
  paintMeadow(p, type, roads);
  return p;
}

/** A quarter turn clockwise, pixel for pixel: (x, y) comes from (y, 50 - x). */
function quarter(src, q) {
  const out = surface(PX);
  const a = src.getContext('2d').getImageData(0, 0, PX, PX).data;
  const o = out.getContext('2d');
  const img = o.createImageData(PX, PX);
  const b = img.data;
  for (let y = 0; y < PX; y++) {
    for (let x = 0; x < PX; x++) {
      let sx = x, sy = y;
      for (let i = 0; i < (q & 3); i++) [sx, sy] = [sy, PX - 1 - sx];
      const s = (sy * PX + sx) * 4, d = (y * PX + x) * 4;
      b[d] = a[s]; b[d + 1] = a[s + 1]; b[d + 2] = a[s + 2]; b[d + 3] = a[s + 3];
    }
  }
  o.putImageData(img, 0, 0);
  return out;
}

const tiles = new Map();
const canon = new Map();

/** The 51 x 51 picture of a tile at a rotation. Built once, then shared. */
export function pixelTile(type, rot = 0) {
  const key = `${type.id}|${rot & 3}`;
  let hit = tiles.get(key);
  if (hit) return hit;
  let base = canon.get(type.id);
  if (!base) { base = paintCanonical(type); canon.set(type.id, base); }
  // Turn the ground, then stand the buildings up on it where they now are.
  hit = quarter(base.cv, rot);
  const up = new Plate(PX, PX, `soffiando:${type.id}:upright`, hit);
  for (const { at, draw } of base.upright) draw(up, ...turn(at, rot));
  tiles.set(key, hit);
  return hit;
}

// --- the sky, the coast, the sails --------------------------------------------

const skies = new Map();

/**
 * One square of open sky. Eight variants, picked by position, so the sky is
 * never wallpaper: most are a flat wash with a dot at the corner (the grid,
 * which is how you count a wind lane), some carry a small cloud with a curl.
 */
export function pixelSky(x, y) {
  const v = hash(`${x},${y}`) % 8;
  let hit = skies.get(v);
  if (hit) return hit;
  const p = new Plate(PX, PX, `sky:${v}`);
  p.layer(INK.sky, (pen) => pen.rect(0, 0, PX, PX), { cut: 128, busy: false });
  p.layer(INK.skyDot, (pen) => pen.rect(0, 0, 2, 2), { cut: 128 });
  if (v < 3) {
    const cx = 14 + p.r() * 22, cy = 16 + p.r() * 18;
    p.layer(INK.skyCloud, (pen) => {
      for (const [dx, dy, r] of [[0, 0, 6], [-7, 2, 4], [7, 2, 4.5], [3, -4, 4.5]]) pen.disc(cx + dx, cy + dy, r);
    }, { cut: 128 });
    p.layer(INK.skySwirl, (pen) => pen.spiral(cx + 0.5, cy + 0.5, 4.2, { dir: v % 2 ? 1 : -1, start: 2 }), { cut: 110 });
  } else if (v === 3) {
    const x0 = 10 + p.r() * 20, y0 = 14 + p.r() * 22;
    p.layer(INK.skySwirl, (pen) => pen.stalk(x0, y0, -0.2, 12, 4, { dir: 1, bend: 0.2 }), { cut: 110 });
  }
  skies.set(v, p.cv);
  return p.cv;
}

const coasts = new Map();

/**
 * The coast of a piece of country: a row of cloud billows standing off the
 * edge of a tile that faces open sky. Drawn for a NORTH edge, as a strip
 * 51 wide and 12 tall whose bottom row touches the tile; it is turned to the
 * other sides when it is laid. The UNDERSIDE (`below`) hangs heavier and
 * shaded, because that is the side a floating island is held up from.
 *
 * Billows sit at both ends of the strip, centred ON the tile's corners, so a
 * strip ends in half a billow and the next strip along finishes it. Where
 * there is no next strip (the outside corner of a piece of country) a whole
 * billow is laid on the corner instead; see `paintCoasts`.
 *
 * Each strip comes in three PARTS, because overlapping billows only read as
 * one cloud if every outline goes down before any fill. Drawn whole, strip
 * by strip, the second strip's outline lands on top of the first strip's
 * cloud, and the corner where they meet came out as a notched step.
 *
 * Islands get a warm cloud and the mainland a cool one: the one thing on the
 * board you most need to see is where you may not build.
 */
export const COAST = 12;
const BILLOWS = { x: [0, 10.2, 20.4, 30.6, 40.8, PX], top: [5, 6.5, 5.5, 7, 6, 5], below: [6, 8, 6.5, 8.5, 7, 6] };

function coastInk(warm) {
  return warm
    ? { fill: INK.warm, line: INK.warmLine, shade: INK.warmShade }
    : { fill: INK.cloud, line: INK.cloudLine, shade: INK.cloudShade };
}

export function pixelCoast({ below = false, warm = false, part = 'fill' } = {}) {
  const key = `${below}|${warm}|${part}`;
  let hit = coasts.get(key);
  if (hit) return hit;
  const p = new Plate(PX, COAST, `coast:${below}|${warm}`);
  const ink = coastInk(warm);
  const edge = below ? 0 : COAST;               // the row that touches the tile
  const out = below ? 1 : -1;
  const xs = BILLOWS.x;
  const rs = below ? BILLOWS.below : BILLOWS.top;
  if (part === 'line') p.layer(ink.line, (pen) => xs.forEach((x, i) => pen.disc(x, edge, rs[i] + 2)), { cut: 128 });
  if (part === 'fill') p.layer(ink.fill, (pen) => xs.forEach((x, i) => pen.disc(x, edge, rs[i])), { cut: 128 });
  if (part === 'detail') {
    if (below) {
      p.layer(ink.shade, (pen) => xs.forEach((x, i) => pen.arc(x, edge, rs[i] - 2, 0.35, Math.PI - 0.35, { width: 2, wobble: 0 })), { cut: 110 });
    }
    p.layer(ink.line, (pen) => {
      pen.spiral(20.4, edge + out * 2.5, 3.6, { dir: 1, start: below ? 4 : 1 });
      pen.spiral(40.8, edge + out * 3, 3.8, { dir: -1, start: below ? 2 : 5 });
    }, { cut: 110 });
  }
  coasts.set(key, p.cv);
  return p.cv;
}

/** The billow on an outside corner, centred on the corner, `CORNER` px square. */
export const CORNER_PX = 18;
export function pixelCoastCorner({ r = 5, warm = false, part = 'fill' } = {}) {
  const key = `corner|${r}|${warm}|${part}`;
  let hit = coasts.get(key);
  if (hit) return hit;
  const p = new Plate(CORNER_PX, CORNER_PX, key);
  const ink = coastInk(warm);
  const c = CORNER_PX / 2;
  if (part === 'line') p.layer(ink.line, (pen) => pen.disc(c, c, r + 2), { cut: 128 });
  if (part === 'fill') p.layer(ink.fill, (pen) => pen.disc(c, c, r), { cut: 128 });
  coasts.set(key, p.cv);
  return p.cv;
}

/**
 * Lay the coasts of a set of tiles. `rect(cell)` gives where a tile sits on
 * the canvas as [x, y, size], `has(x, y)` whether a square holds a tile,
 * `warm(cell)` whether it is out on an island, `alpha(cell)` how faded it is.
 *
 * Three passes over every tile (outlines, then cloud, then the curls and the
 * shading), so billows from different strips and different tiles merge into
 * one bank. A tile corner whose two sides both face the sky gets a whole
 * billow of its own, sized to the larger of the half-billows that end there.
 * Called before the tiles are drawn, so anything that spills over a tile is
 * covered by it.
 */
export function paintCoasts(ctx, cells, { rect, has, warm = () => false, alpha = () => 1 }) {
  const jobs = cells.map((cell) => {
    const [x0, y0, w] = rect(cell);
    const { x, y } = cell;
    return {
      x0, y0, w, k: w / PX, warm: !!warm(cell), a: alpha(cell),
      open: [!has(x, y - 1), !has(x + 1, y), !has(x, y + 1), !has(x - 1, y)],
    };
  });
  // Corners clockwise from the top left, and the two sides that meet at each.
  const corners = [[0, 0, 3, 0], [1, 0, 0, 1], [1, 1, 1, 2], [0, 1, 2, 3]];
  ctx.save();
  for (const part of ['line', 'fill', 'detail']) {
    for (const j of jobs) {
      ctx.globalAlpha = j.a;
      const depth = Math.round(COAST * j.k);
      for (let side = 0; side < 4; side++) {
        if (!j.open[side]) continue;
        const strip = pixelCoast({ below: side === 2, warm: j.warm, part });
        if (side === 0) { ctx.drawImage(strip, j.x0, j.y0 - depth, j.w, depth); continue; }
        if (side === 2) { ctx.drawImage(strip, j.x0, j.y0 + j.w, j.w, depth); continue; }
        ctx.save();
        ctx.translate(j.x0 + j.w / 2, j.y0 + j.w / 2);
        ctx.rotate(side * Math.PI / 2);
        ctx.drawImage(strip, -j.w / 2, -j.w / 2 - depth, j.w, depth);
        ctx.restore();
      }
      if (part === 'detail') continue;
      for (const [cx, cy, a, b] of corners) {
        if (!j.open[a] || !j.open[b]) continue;
        const r = a === 2 || b === 2 ? BILLOWS.below[0] : BILLOWS.top[0];
        const size = Math.round(CORNER_PX * j.k);
        ctx.drawImage(pixelCoastCorner({ r, warm: j.warm, part }),
          j.x0 + cx * j.w - size / 2, j.y0 + cy * j.w - size / 2, size, size);
      }
    }
  }
  ctx.restore();
}

const sails = new Map();
export const SAIL_FRAMES = 8;

/**
 * A turbine's four sails at one of eight angles across a quarter turn (they
 * have four-fold symmetry, so eight frames are a whole revolution). Drawn on
 * the tile's own 51 px grid round a hub at the middle of the square.
 */
export function pixelSails(frame) {
  const f = ((frame % SAIL_FRAMES) + SAIL_FRAMES) % SAIL_FRAMES;
  let hit = sails.get(f);
  if (hit) return hit;
  const p = new Plate(PX, PX, `sails:${f}`);
  const a0 = (f / SAIL_FRAMES) * (Math.PI / 2);
  const blades = [0, 1, 2, 3].map((i) => a0 + i * Math.PI / 2);
  p.layer(INK.ink, (pen) => blades.forEach((a) => {
    const c = Math.cos(a), s = Math.sin(a);
    pen.fill([[MID + c * 3 - s * 1, MID + s * 3 + c * 1], [MID + c * 14 - s * 1, MID + s * 14 + c * 1],
      [MID + c * 14 + s * 5.5, MID + s * 14 - c * 5.5], [MID + c * 4 + s * 4, MID + s * 4 - c * 4]]);
    pen.line(MID, MID, MID + c * 15, MID + s * 15, { width: 2, wobble: 0 });
  }), { cut: 128 });
  p.layer(INK.cloud, (pen) => blades.forEach((a) => {
    const c = Math.cos(a), s = Math.sin(a);
    pen.fill([[MID + c * 4.5 + s * 0.4, MID + s * 4.5 - c * 0.4], [MID + c * 13 + s * 0.4, MID + s * 13 - c * 0.4],
      [MID + c * 13 + s * 4, MID + s * 13 - c * 4], [MID + c * 5 + s * 3.2, MID + s * 5 - c * 3.2]]);
  }), { cut: 128 });
  p.layer(INK.gold, (pen) => pen.disc(MID, MID, 1.6), { cut: 100 });
  sails.set(f, p.cv);
  return p.cv;
}

/** Throw every cached picture away (after an edit to this file, say). */
export function clearPixels() {
  tiles.clear(); canon.clear(); skies.clear(); coasts.clear(); sails.clear();
}
