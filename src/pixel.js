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
// its edge on columns 21 to 29 (a 5 px bed between 2 px kerbs), a district
// covers its whole square, a wall lies flat along the edge 7 px deep, and a
// half-sphere is centred on the middle of its edge. Anything that meets a
// neighbour meets it on the same pixels every time, so a run of tiles reads
// as one piece of country.
// ---------------------------------------------------------------------------

import { wallSides } from './tiles.js';

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
  hedge: '#3f8a63', leaf: '#79c49b', slate: '#6a6390',
  sky: '#a9d5f5', skyDot: '#8fc1ea', skyCloud: '#c3e3fa', skySwirl: '#d9eefd',
  aether: '#2b2752', aetherDot: '#6f68b0', aetherSwirl: '#3d3770',
};

/** Each tower colour as [body, rim and ring, highlight]: the round interior. */
const HUE = {
  green: ['#66c46b', '#2f7f48', '#bdeeb4'],
  blue: ['#5d98ea', '#2d58a8', '#c3dcfb'],
  red: ['#e8626c', '#9e2f47', '#f9c3c6'],
  yellow: ['#f4cf4f', '#a87b14', '#fff0b8'],
  sun: ['#f9b83a', '#d0661f', '#fff2ae'],
  hole: ['#231a3f', '#8a6fe0', '#c9b8ff'],
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
    this.reserve(at[0], at[1], r);
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

  /** Keep a disc clear for something drawn later, without drawing anything. */
  reserve(x, y, r) {
    for (let j = Math.max(0, Math.floor(y - r)); j <= Math.min(this.h - 1, Math.ceil(y + r)); j++) {
      for (let i = Math.max(0, Math.floor(x - r)); i <= Math.min(this.w - 1, Math.ceil(x + r)); i++) {
        if (Math.hypot(i + 0.5 - x, j + 0.5 - y) <= r) this.busy[j * this.w + i] = 1;
      }
    }
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
  h: 'hedge', l: 'leaf', t: 'timber', b: 'bronze', s: 'stone', c: 'cloud', n: 'cloudLine',
  y: 'goldDeep', a: 'water', f: 'slate',
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

const TALL = [
  '...o...',
  '..oRo..',
  '.oRRRo.',
  'oRRRRRo',
  'orrrrro',
  '.oWWWo.',
  '.oWaWo.',
  '.oWWWo.',
  '.oWDWo.',
  '.ooooo.',
];

const SHRINE = [
  '....o....',
  '...oGo...',
  '..oGGGo..',
  '.oGGGGGo.',
  'ooooooooo',
  '.oWoWoWo.',
  '.oWoWoWo.',
  '.oWoWoWo.',
  'ooooooooo',
];

const OBELISK = [
  '..G..',
  '.oWo.',
  '.oWo.',
  '.oWo.',
  '.oWo.',
  'ooooo',
];

// The works: a sawtooth roof with its glass facing one way, and a chimney.
const FACTORY = [
  '..........oo.',
  '..........rr.',
  '....a....arr.',
  '...fa...farr.',
  '..ffa..ffarr.',
  '.fffa.fffarr.',
  'ooooooooooooo',
  'ossssssssssso',
  'osasasasasaso',
  'osssssssDDsso',
  'ooooooooooooo',
];

const STALL = [
  '.ooooooo.',
  'oRcRcRcRo',
  'oRcRcRcRo',
  '.R.R.R.R.',
  '.k.....k.',
  '.kGyGyGk.',
  '.ktttttk.',
  '.k.....k.',
];

const CRATES = [
  '..ttt..',
  '..tbt..',
  'ttttttt',
  'tbt.tbt',
  'ttt.ttt',
];

const TREE = [
  '..hhh..',
  '.hllhh.',
  'hllhhhh',
  'hlhhhhh',
  'hhhhhhh',
  '.hhhhh.',
  '..hhh..',
  '...t...',
  '...t...',
];

const BUSH = [
  '.hhh.',
  'hlhhh',
  'hhhhh',
  '.hhh.',
  '..t..',
  '.ttt.',
];

const BLOOMS = [
  '.R...c.',
  'RyR.cyc',
  '.R.h.c.',
  '..hhh..',
];

const HAY = [
  '..yyy..',
  '.yGGGy.',
  'yGGyGGy',
  'yGGGGGy',
  'yyyyyyy',
];

const WELL = [
  '...o...',
  '..oRo..',
  '.oRRRo.',
  'ooooooo',
  '.t.k.t.',
  '.t.b.t.',
  'ooooooo',
  'osasaso',
  'ooooooo',
];

const STATUE = [
  '..G..',
  '.GGG.',
  '..G..',
  '.GGG.',
  '.G.G.',
  'ooooo',
  'osyso',
  'ooooo',
];

const MAYPOLE = [
  '....G....',
  '...RkB...',
  '..R.k.B..',
  '.R..k..B.',
  'R...k...B',
  '....k....',
  '....k....',
  '....k....',
  '...ooo...',
];

const LAMP = [
  '.o.',
  'oGo',
  '.o.',
  '.k.',
  '.k.',
  '.k.',
  '.k.',
  'kkk',
];

const MANOR = [
  '......o......',
  '.....oRo.....',
  '....oRRRo....',
  '...oRRRRRo...',
  '..oRRRRRRRo..',
  '.oRRRRRRRRRo.',
  'orrrrrrrrrrro',
  '.oWWWWWWWWWo.',
  '.oWaaWWWaaWo.',
  '.oWWWWDWWWWo.',
  '.oWWWWDWWWWo.',
  '.ooooooooooo.',
];

const TEMPLE = [
  '.......o.......',
  '.....ooGoo.....',
  '...ooGGGGGoo...',
  '.ooGGGGGGGGGoo.',
  'ooooooooooooooo',
  '.WkWkWkWkWkWkW.',
  '.WkWkWkWkWkWkW.',
  '.WkWkWkWkWkWkW.',
  '.WkWkWkWkWkWkW.',
  'ooooooooooooooo',
  'oyyyyyyyyyyyyyo',
  'ooooooooooooooo',
];

const SHED = [
  '..fffffff..',
  '.fffffffff.',
  'fffffffffff',
  'ooooooooooo',
  'ossssssssso',
  'osstttttsso',
  'osstttttsso',
  'ooooooooooo',
];

const STACK = [
  'oooooo',
  '.orro.',
  '.orro.',
  '.orro.',
  '.oooo.',
  '.orro.',
  '.orro.',
  '.orro.',
  '.oooo.',
  '.orro.',
  '.orro.',
  'orrrro',
  'oooooo',
];

const BARRELS = [
  '.ttt..ttt.',
  'tbbbttbbbt',
  'tttttttttt',
  'tbbbttbbbt',
  '.ttt..ttt.',
];

const OAK = [
  '...hhhhh...',
  '..hlllhhh..',
  '.hllhhhhhh.',
  'hllhhhhhhhh',
  'hlhhhhhhhhh',
  'hhhhhhhhhhh',
  'hhhhhhhhhhh',
  '.hhhhhhhhh.',
  '..hhhhhhh..',
  '....ttt....',
  '.....t.....',
  '.....t.....',
  '....ttt....',
];

const BIG_STATUE = [
  '...G...',
  '..GGG..',
  '...G...',
  '.GGGGG.',
  '..GGG..',
  '..G.G..',
  '..G.G..',
  'ooooooo',
  '.osyso.',
  '.osyso.',
  'ooooooo',
];

const BIG_MAYPOLE = [
  '.....G.....',
  '....RkB....',
  '...R.k.B...',
  '..R..k..B..',
  '.R...k...B.',
  'R....k....B',
  '.....k.....',
  '.....k.....',
  '.....k.....',
  '.....k.....',
  '....ooo....',
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


// --- districts and their walls ------------------------------------------------
//
// A city is made of DISTRICTS (Timothy, 2026-10-24), each a whole square of
// one kind, told apart the way a map legend tells things apart: by colour
// first, then by texture, then by what stands on it. Gardens are green and
// planted, the temple quarter is paved in gold flagstones, homes are the old
// pink plaster, the works are brick, and the market is cobbles and awnings.
//
// A WALL IS FLAT: a crenellated band lying along the tile's edge, where a cap
// used to be a curve. A district's own walls stand on its closed sides with
// their teeth facing out; a cap is the same wall on the tile across the seam,
// teeth facing away from the city it closes. Where two walls meet in a corner
// a round tower stands on it, and a wall that runs on into the next tile ends
// in half a pier, so two halves make one across the seam.

const DISTRICT_INK = {
  garden: { ground: '#a6dcb8', deep: '#79c49b' },
  temple: { ground: '#f6e6b0', deep: '#e3c982' },
  residential: { ground: INK.plaster, deep: '#efc6dc' },
  industrial: { ground: '#cdc6e0', deep: '#b3abcf' },
  trade: { ground: '#fbd3a8', deep: '#eab585' },
};

/** The kind of district a tile is, or null. */
const districtKind = (type) => type.feats.find((f) => f.district)?.district || null;

/** A rect given for side N, turned to side `side`: quarter turns send pixel edges to pixel edges. */
function onSide(side, [x, y, w, h]) {
  const [ax, ay] = turn([x, y], side), [bx, by] = turn([x + w, y + h], side);
  return [Math.min(ax, bx), Math.min(ay, by), Math.abs(bx - ax), Math.abs(by - ay)];
}

const TEETH = [3, 9, 15, 21, 27, 33, 39, 45];   // 3 wide, a crenel of 3 between, piers at both ends

/**
 * The wall on one side, as rects for side N: `dark` is the masonry, `light`
 * the walk along its top. `out` puts the teeth on the edge (a district's own
 * wall, facing the country) rather than on the inside (a cap, facing away
 * from the city across the seam).
 */
function wallRects(out) {
  const walk = out ? 3 : 0, teeth = out ? 0 : 4;
  return {
    dark: [[0, walk, PX, 4], ...TEETH.map((t) => [t, teeth, 3, 3]), [0, 0, 3, 7], [PX - 3, 0, 3, 7]],
    light: [[3, walk + 1, PX - 6, 2]],
  };
}

/** The wall pixels of a tile, and its corner towers. Returns the mask of what it covered. */
function paintWalls(p, type) {
  const walls = wallSides(type);
  if (!walls.size) return null;
  return drawWalls(p, walls, !!districtKind(type));
}

/** Walls on the given sides, teeth out (`out`) or in, and a tower in every walled corner. */
function drawWalls(p, walls, out) {
  const { dark, light } = wallRects(out);
  const mask = p.layer(INK.wall, (pen) => {
    for (const s of walls) for (const r of dark) pen.rect(...onSide(s, r));
  }, { cut: 128 });
  p.layer(INK.stone, (pen) => {
    for (const s of walls) for (const r of light) pen.rect(...onSide(s, r));
  }, { cut: 128 });
  // A round tower wherever two walls meet: the corner between side s and the next one round.
  const corners = [0, 1, 2, 3].filter((s) => walls.has(s) && walls.has((s + 1) & 3));
  const at = (s) => turn([PX - 5.5, 5.5], s);
  if (corners.length) {
    p.layer(INK.wall, (pen) => corners.forEach((s) => pen.disc(...at(s), 6.5)), { cut: 128 });
    p.layer(INK.roof, (pen) => corners.forEach((s) => pen.disc(...at(s), 4.6)), { cut: 128 });
    p.layer(INK.roofDeep, (pen) => corners.forEach((s) => { const [x, y] = at(s); pen.hook(x, y, 2.6, { dir: 1, start: s * Math.PI / 2 }); }), { cut: 110 });
  }
  for (let i = 0; i < mask.length; i++) if (p.last[i]) mask[i] = 1;
  return mask;
}

/** A district's ground and its texture, laid edge to edge so a city runs on across seams. */
function districtGround(p, kind) {
  const { ground, deep } = DISTRICT_INK[kind];
  p.layer(ground, (pen) => pen.rect(0, 0, PX, PX), { cut: 128, busy: false });
  if (kind === 'temple') {
    // Flagstones on a grid symmetric about the middle, so every turn lays the same.
    p.layer(deep, (pen) => { for (const v of [1, 9, 17, 25, 33, 41, 49]) { pen.rect(v, 0, 1, PX); pen.rect(0, v, PX, 1); } }, { cut: 128, busy: false });
  } else if (kind === 'industrial') {
    // Brick: courses five high, the joints stepping half a brick each course.
    p.layer(deep, (pen) => {
      for (let k = 0, y = 0; y < PX; k++, y += 5) {
        pen.rect(0, y + 4, PX, 1);
        for (let x = k % 2 ? 1 : 6; x < PX; x += 10) pen.rect(x, y, 1, 4);
      }
    }, { cut: 128, busy: false });
  } else if (kind === 'trade') {
    // Cobbles, staggered.
    p.layer(deep, (pen) => {
      for (let k = 0, y = 2; y < PX; k++, y += 5) for (let x = k % 2 ? 0 : 3; x < PX; x += 6) pen.rect(x, y, 3, 2);
    }, { cut: 128, busy: false });
  } else if (kind === 'residential') {
    // Garden paths between the houses: a pale dot here and there.
    p.layer(deep, (pen) => {
      for (let k = 0, y = 3; y < PX; k++, y += 8) for (let x = k % 2 ? 1 : 5; x < PX; x += 8) pen.rect(x, y, 2, 1);
    }, { cut: 128, busy: false });
  }
}

/**
 * A hand-placed sprite as a thing to stand somewhere: `r` is about how far it
 * reaches from its middle, which is where it is placed, so the picture's foot
 * is half its height below that.
 */
function thing(rows, recolor = {}, after = null) {
  const h = rows.length, w = Math.max(...rows.map((row) => row.length));
  return {
    r: Math.ceil(Math.max(w, h) / 2),
    draw: (q, x, y) => {
      const foot = y + Math.floor(h / 2);
      stamp(q, rows, x, foot, recolor);
      after?.(q, Math.round(x - (w - 1) / 2), foot - h + 1);
    },
  };
}

/** A swirl in a tree's crown: the sky's curl, grown in leaves. */
const crown = (dx, dy, r) => (q, x0, y0) => q.layer(INK.leaf, (pen) => pen.hook(x0 + dx, y0 + dy, r, { dir: 1, start: 3, width: 1.5 }), { cut: 120 });

/** Smoke off a chimney whose top middle is (dx, dy) in the sprite: a little cloud and its curl. */
const smoke = (dx, dy) => (q, x0, y0) => {
  const cx = x0 + dx, cy = y0 + dy - 3;
  q.layer(INK.cloudLine, (pen) => { pen.disc(cx, cy, 3); pen.disc(cx + 3, cy - 2.5, 2.6); }, { cut: 128 });
  q.layer(INK.cloud, (pen) => { pen.disc(cx, cy, 2); pen.disc(cx + 3, cy - 2.5, 1.6); }, { cut: 128 });
};

const T = {
  manor: thing(MANOR), manorDeep: thing(MANOR, { R: 'roofDeep', r: 'roof' }),
  house: thing(HOUSE), houseDeep: thing(HOUSE, { R: 'roofDeep', r: 'roof' }),
  tall: thing(TALL), cottage: thing(COTTAGE), cottageDeep: thing(COTTAGE, { R: 'roofDeep', r: 'roof' }),
  temple: thing(TEMPLE), shrine: thing(SHRINE), obelisk: thing(OBELISK), statue: thing(BIG_STATUE),
  factory: thing(FACTORY, {}, smoke(11, 0)), shed: thing(SHED), stack: thing(STACK, {}, smoke(3, 0)),
  crates: thing(CRATES), barrels: thing(BARRELS),
  stall: thing(STALL), stallBlue: thing(STALL, { R: 'wind' }), stallGold: thing(STALL, { R: 'gold' }),
  oak: thing(OAK, {}, crown(5, 4, 2.6)), tree: thing(TREE, {}, crown(3, 3, 1.8)), bush: thing(BUSH),
  hay: thing(HAY), well: thing(WELL), lamp: thing(LAMP), maypole: thing(BIG_MAYPOLE), blooms: thing(BLOOMS),
};

/** What stands on each kind of district, biggest first, as many as fit. */
const FURNISH = {
  garden: [T.oak, T.tree, T.oak, T.tree, T.bush, T.tree, T.bush],
  temple: [T.temple, T.statue, T.obelisk, T.shrine, T.obelisk, T.bush],
  residential: [T.manor, T.house, T.tall, T.houseDeep, T.manorDeep, T.cottageDeep, T.tall, T.cottage, T.house],
  industrial: [T.factory, T.stack, T.shed, T.crates, T.barrels, T.shed, T.crates],
  trade: [T.stall, T.stallBlue, T.stallGold, T.stall, T.crates, T.stallBlue, T.barrels, T.crates],
};

/**
 * Stand things on the free ground of a plate, in the order given, each where
 * it is farthest from what already stands (with a little chance in it), so a
 * tile fills evenly rather than in a clump. A thing needs a free disc of most
 * of its reach: neighbours may overlap a little, and are drawn back to front,
 * so a house in front hides the foot of the one behind. What will not fit is
 * left out.
 */
function standAll(p, items, r = p.r) {
  const placed = [];
  for (const it of items) {
    let best = null, top = -Infinity;
    for (let y = 2.5; y < PX - 2; y++) {
      for (let x = 2.5; x < PX - 2; x++) {
        if (!p.free(x, y, it.r * 0.8, 1)) continue;
        const room = placed.length
          ? Math.min(...placed.map(([px, py]) => Math.hypot(px - x, py - y)))
          : 20 - Math.hypot(x - MID, y - MID) * 0.4;
        const score = room + r() * 5;
        if (score > top) { top = score; best = [x, y]; }
      }
    }
    if (!best) continue;
    placed.push(best);
    p.stand(best, it.r, it.draw);
  }
  return placed.length;
}

/**
 * A district's furniture: the buildings of its kind standing upright, and for
 * a garden, flower beds and a hedge curl on what is left.
 */
function furnishDistrict(p, kind) {
  standAll(p, FURNISH[kind]);
  if (kind !== 'garden') return;
  let curls = 0;
  for (let tries = 0; tries < 60 && curls < 2; tries++) {
    const x = 10 + p.r() * (PX - 26), y = 12 + p.r() * (PX - 24);
    if (!p.free(x + 6, y - 2, 7, 6)) continue;
    const dir = p.r() < 0.5 ? 1 : -1;
    p.layer(INK.hedge, (pen) => pen.stalk(x, y, -0.15 * dir, 8, 3.8, { dir: -dir, bend: 0.2 }), { cut: 128 });
    curls++;
  }
  let beds = 0;
  for (let tries = 0; tries < 120 && beds < 5; tries++) {
    const x = 7 + p.r() * (PX - 14), y = 7 + p.r() * (PX - 14);
    if (!p.free(x, y, 4, 4)) continue;
    stamp(p, BLOOMS, x, y + 2);
    beds++;
  }
}

/** Half of a sphere on side `side`. Its rings close into full rings across the seam. */
/**
 * Half a TOWER (2026-10-27; a sfera until then, "and look different but they
 * still have the colors and the round interior"): a round stone tower seen
 * from above, cut in half by the tile's edge, battlements on its rim and its
 * colour inside. Two halves meeting draw one whole tower.
 */
function paintSfera(p, side, hue) {
  const [body, rim, light] = HUE[hue] || HUE.green;
  const [cx, cy] = SIDE_MID[side];
  p.layer(INK.ink, (pen) => pen.disc(cx, cy, 15.5), { cut: 128 });
  p.layer(INK.stone, (pen) => pen.disc(cx, cy, 13.5), { cut: 128 });
  // Battlements: notches cut into the rim, every eighth of a turn.
  p.layer(INK.ink, (pen) => {
    for (let i = 0; i < 16; i += 2) {
      const a = (i + 0.5) * Math.PI / 8;
      pen.rect(Math.round(cx + Math.cos(a) * 12.5 - 1), Math.round(cy + Math.sin(a) * 12.5 - 1), 2, 2);
    }
  }, { cut: 128 });
  p.layer(INK.ink, (pen) => pen.disc(cx, cy, 9.5), { cut: 128 });
  p.layer(body, (pen) => pen.disc(cx, cy, 8), { cut: 128 });
  p.layer(rim, (pen) => pen.arc(cx, cy, 5, 0, Math.PI * 2, { width: 2, wobble: 0 }), { cut: 120 });
  // A lit crescent, turned with the side so every half catches the same light.
  const a = SIDE_ANGLE[side] + Math.PI;
  p.layer(light, (pen) => pen.arc(cx, cy, 6.5, a - 0.9, a - 0.25, { width: 2, wobble: 0 }), { cut: 120 });
}

/**
 * A quarter of a BIG tower, the sun's or the black hole's: the same round
 * stone tower at four times the size, its centre on the tile's corner between
 * side `c` and the side after it, so four tiles make one 2x2 tower.
 */
function paintQuarter(p, c, hue) {
  const [body, rim, light] = HUE[hue] || HUE.sun;
  const corner = [[PX, 0], [PX, PX], [0, PX], [0, 0]][c];
  const [cx, cy] = corner;
  p.layer(INK.ink, (pen) => pen.disc(cx, cy, 44.5), { cut: 128 });
  p.layer(INK.stone, (pen) => pen.disc(cx, cy, 42.5), { cut: 128 });
  p.layer(INK.ink, (pen) => {
    for (let i = 0; i < 48; i += 2) {
      const a = (i + 0.5) * Math.PI / 24;
      pen.rect(Math.round(cx + Math.cos(a) * 41.5 - 1), Math.round(cy + Math.sin(a) * 41.5 - 1), 2, 2);
    }
  }, { cut: 128 });
  p.layer(INK.ink, (pen) => pen.disc(cx, cy, 36.5), { cut: 128 });
  p.layer(body, (pen) => pen.disc(cx, cy, 35), { cut: 128 });
  if (hue === 'hole') {
    // The black hole: a dark heart, a bright ring of what it is pulling in,
    // and stars caught in its swirl.
    p.layer(rim, (pen) => pen.arc(cx, cy, 24, 0, Math.PI * 2, { width: 3, wobble: 0 }), { cut: 120 });
    p.layer(light, (pen) => pen.arc(cx, cy, 30, 0, Math.PI * 2, { width: 1, wobble: 0 }), { cut: 120 });
    p.layer('#0f0a20', (pen) => pen.disc(cx, cy, 15), { cut: 128 });
    p.layer(light, (pen) => {
      for (const [r, a] of [[19, 0.3], [28, 1.0], [33, 0.6], [21, 1.3], [31, 0.15]]) {
        for (let q = 0; q < 4; q++) pen.rect(Math.round(cx + Math.cos(a + q * Math.PI / 2) * r), Math.round(cy + Math.sin(a + q * Math.PI / 2) * r), 1, 1);
      }
    }, { cut: 100 });
  } else {
    // The sun: rays out of a bright face.
    p.layer(rim, (pen) => {
      for (let i = 0; i < 24; i++) {
        const a = i * Math.PI / 12;
        pen.line(cx + Math.cos(a) * 18, cy + Math.sin(a) * 18, cx + Math.cos(a) * 31, cy + Math.sin(a) * 31, { width: 2, wobble: 0 });
      }
    }, { cut: 120 });
    p.layer(light, (pen) => pen.disc(cx, cy, 16), { cut: 128 });
    p.layer(body, (pen) => pen.arc(cx, cy, 12, 0, Math.PI * 2, { width: 2, wobble: 0 }), { cut: 120 });
  }
}

/**
 * THE PLAZA (2026-10-27; the Palazzo until then): the tile the game starts
 * on, a broad paved square where the four roads end, a fountain in the middle
 * and a lamp on each corner of it. No houses: it is the open space a town
 * gathers round.
 */
function paintPlaza(p) {
  p.layer(INK.kerb, (pen) => pen.rect(MID - 16.5, MID - 16.5, 33, 33), { cut: 128 });
  p.layer(INK.road, (pen) => pen.rect(MID - 14.5, MID - 14.5, 29, 29), { cut: 128 });
  // Flagstones: a ring of lighter stones round the fountain, and the grid.
  p.layer('#f3dfae', (pen) => {
    for (let x = -12; x <= 12; x += 4) for (let y = -12; y <= 12; y += 4) {
      if (Math.abs(x) < 9 && Math.abs(y) < 9) continue;
      pen.rect(MID - 0.5 + x, MID - 0.5 + y, 1, 1);
    }
  }, { cut: 128 });
  p.layer(INK.kerb, (pen) => pen.arc(MID, MID, 10, 0, Math.PI * 2, { width: 1, wobble: 0 }), { cut: 120 });
  paintFountain(p);
  for (const [dx, dy] of [[-12, -12], [12, -12], [-12, 12], [12, 12]]) {
    p.stand([MID + dx, MID + dy], 3, (q, x, y) => T.lamp.draw(q, x, y));
  }
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

/** A crossroads fountain, seen from above. */
function paintFountain(p) {
  p.layer(INK.ink, (pen) => pen.disc(MID, MID, 7.5), { cut: 128 });
  p.layer(INK.marble, (pen) => pen.disc(MID, MID, 5.6), { cut: 128 });
  p.layer(INK.water, (pen) => pen.disc(MID, MID, 3.6), { cut: 128 });
  p.layer(INK.marble, (pen) => pen.disc(MID, MID, 1.2), { cut: 100 });
}

// --- towns ----------------------------------------------------------------------
//
// Where three or four roads meet there is a town (Timothy, 2026-10-24: "cute
// little towns that have different little visual features"): a round square
// where the roads cross with something in the middle of it, and houses and
// odds and ends in the corners between the roads. Each laid tile picks its
// own (`look`, from its place in the order of play), so no two crossroads on
// a board need be the same town.

export const TOWN_LOOKS = 8;

/** Is this tile a town: three or more roads ending in its middle, with nothing else there? */
export const isTown = (type) => !type.swing
  && type.feats.filter((f) => f.type === 'road' && f.sides.length === 1).length >= 3;

/** What can stand in the middle of the square. */
const CENTRES = [
  (p) => paintFountain(p),
  (p) => p.stand([MID, MID - 1], T.well.r, T.well.draw),
  (p) => p.stand([MID, MID - 2], T.statue.r, T.statue.draw),
  (p) => p.stand([MID, MID - 2], T.maypole.r, T.maypole.draw),
  (p) => p.stand([MID, MID - 3], T.oak.r, T.oak.draw),
  (p) => p.stand([MID, MID - 1], 6, (q, x, y) => { T.lamp.draw(q, x - 4, y); T.lamp.draw(q, x + 4, y); T.blooms.draw(q, x, y + 3); }),
];

/** Somewhere to live. */
const DWELLINGS = [T.manor, T.manorDeep, T.house, T.houseDeep, T.tall, T.cottage, T.cottageDeep];

/** Everything else a town keeps by its houses. */
const ODDMENTS = [T.tree, T.oak, T.hay, T.stall, T.stallBlue, T.stallGold, T.crates, T.barrels, T.well, T.bush, T.blooms, T.lamp];

function paintTown(p, type, look) {
  const r = rng(`town:${type.id}:${look}`);
  const pick = (list) => list[Math.floor(r() * list.length)];
  // The square: kerb, then cobbles, over the ends of the roads.
  p.layer(INK.kerb, (pen) => pen.disc(MID, MID, 10.5), { cut: 128 });
  p.layer(INK.road, (pen) => pen.disc(MID, MID, 8.5), { cut: 128 });
  p.layer('#f3dfae', (pen) => { for (let a = 0; a < 8; a++) pen.rect(MID - 0.5 + Math.round(Math.cos(a * 0.785) * 6.5), MID - 0.5 + Math.round(Math.sin(a * 0.785) * 6.5), 1, 1); }, { cut: 128 });
  pick(CENTRES)(p);
  // Then the town round it: houses first, so there are always some, then
  // whatever else fits in the corners between the roads.
  const items = [pick(DWELLINGS), pick(DWELLINGS), pick(DWELLINGS)];
  for (let i = 0; i < 6; i++) items.push(r() < 0.4 ? pick(DWELLINGS) : pick(ODDMENTS));
  standAll(p, items, r);
}

/**
 * The Abbazia: walled on all four edges with the same flat castle walls a
 * district has (Timothy, 2026-10-24), a tower in each corner, stone inside,
 * and a bell tower in the middle. It caps everything it touches, and now it
 * looks it. The walls are only drawn: it is not a city, and they do not pin it.
 */
function paintAbbazia(p) {
  p.layer(INK.stone, (pen) => pen.rect(0, 0, PX, PX), { cut: 128, busy: false });
  drawWalls(p, new Set([0, 1, 2, 3]), true);
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

/** Paint a tile type, unrotated. A town paints the `look` it was given. */
function paintCanonical(type, look = 0) {
  const p = new Plate(PX, PX, `soffiando:${type.id}`);
  const marks = type.marks;
  if (type.wild || has(type, 'abbazia')) {
    paintAbbazia(p);
    return p;
  }
  const kind = districtKind(type);
  if (kind) districtGround(p, kind);
  else p.layer(INK.meadow, (pen) => pen.rect(0, 0, PX, PX), { cut: 128, busy: false });
  const cityMask = paintWalls(p, type);
  // A quarter of a big tower is walled on its two outer sides, like an
  // Abbazia, and like an Abbazia's those edges take anything (Timothy,
  // 2026-10-27: "the sun and black hole tiles should have castle walls on
  // the field sides so they can be placed sort of no matter what").
  if (type.capOut) {
    const inner = new Set(type.feats.flatMap((f) => (f.quarter ? f.sides : [])));
    drawWalls(p, new Set([0, 1, 2, 3].filter((s) => !inner.has(s))), true);
  }
  const roads = paintRoads(p, type, cityMask);
  for (const f of type.feats) {
    if (f.type !== 'sfera') continue;
    if (f.quarter) paintQuarter(p, f.sides[0], f.hue); else paintSfera(p, f.sides[0], f.hue);
  }
  // Room for the tile's landmark, kept clear of houses and trees.
  if ((centred(type) && !isTown(type)) || type.feats.some((f) => f.type === 'temple')) p.reserve(MID, MID, 14);
  marks.forEach((m, i) => {
    const [x, y] = type.markSpots[i];
    if (m.kind === 'turbine') p.reserve(x * PX, y * PX - 4, 10);
  });
  if (type.feats.some((f) => f.type === 'temple')) p.stand([MID, MID], 14, paintTemple);
  if (type.swing) paintVane(p);
  if (kind) furnishDistrict(p, kind);
  if (has(type, 'plaza')) paintPlaza(p);
  else if (isTown(type)) paintTown(p, type, look);
  const mill = marks.findIndex((m) => m.kind === 'turbine');
  if (mill >= 0) {
    const [x, y] = type.markSpots[mill];
    p.stand([x * PX, y * PX], 9, paintTurbine);
  }
  for (const m of marks) {
    if (m.kind === 'flier') paintFlier(p, m);
    if (m.kind === 'zephyr') { if (m.blast) paintCannon(p, m); else paintZephyr(p, m); }
  }
  if (!kind) paintMeadow(p, type, roads);
  return p;
}

/** A quarter turn clockwise, pixel for pixel, of any square: (x, y) comes from (y, n - 1 - x). */
function quarter(src, q) {
  const n = src.width;
  const out = surface(n);
  const a = src.getContext('2d').getImageData(0, 0, n, n).data;
  const o = out.getContext('2d');
  const img = o.createImageData(n, n);
  const b = img.data;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      let sx = x, sy = y;
      for (let i = 0; i < (q & 3); i++) [sx, sy] = [sy, n - 1 - sx];
      const s = (sy * n + sx) * 4, d = (y * n + x) * 4;
      b[d] = a[s]; b[d + 1] = a[s + 1]; b[d + 2] = a[s + 2]; b[d + 3] = a[s + 3];
    }
  }
  o.putImageData(img, 0, 0);
  return out;
}

const tiles = new Map();
const canon = new Map();

/**
 * The 51 x 51 picture of a tile at a rotation. Built once, then shared. A
 * town is drawn one of TOWN_LOOKS ways, chosen by `look` (any number: a
 * cell's `seq` will do), and every other tile ignores it.
 */
export function pixelTile(type, rot = 0, look = 0) {
  const v = isTown(type) ? hash(`look:${look | 0}`) % TOWN_LOOKS : 0;
  const key = `${type.id}|${rot & 3}|${v}`;
  let hit = tiles.get(key);
  if (hit) return hit;
  let base = canon.get(`${type.id}|${v}`);
  if (!base) { base = paintCanonical(type, v); canon.set(`${type.id}|${v}`, base); }
  // Turn the ground, then stand the buildings up on it where they now are.
  hit = quarter(base.cv, rot);
  const up = new Plate(PX, PX, `soffiando:${type.id}:upright`, hit);
  // Back to front, so whatever stands lower down the picture is in front.
  base.upright.map(({ at, draw }) => ({ at: turn(at, rot), draw }))
    .sort((a, b) => a.at[1] - b.at[1])
    .forEach(({ at, draw }) => draw(up, ...at));
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

const gates = new Map();

/**
 * A GATE in a district's wall, on side `side`, where a road on the next tile
 * runs into it (2026-10-25): the road comes through the wall in the middle,
 * kerb and all, between two small towers, and stops at the threshold. Drawn
 * over the district by the renderer, because only the board knows a road is
 * there.
 */
export function pixelGate(side = 0) {
  let hit = gates.get(side & 3);
  if (hit) return hit;
  const p = new Plate(PX, PX, `gate:${side & 3}`);
  p.layer(INK.kerb, (pen) => { pen.rect(...onSide(side, [21, 0, 9, 9])); }, { cut: 128 });
  p.layer(INK.road, (pen) => { pen.rect(...onSide(side, [23, 0, 5, 8])); }, { cut: 128 });
  const towers = [[17.5, 4.5], [33.5, 4.5]].map((at) => turn(at, side));
  p.layer(INK.wall, (pen) => towers.forEach(([x, y]) => pen.disc(x, y, 4.6)), { cut: 128 });
  p.layer(INK.roof, (pen) => towers.forEach(([x, y]) => pen.disc(x, y, 2.9)), { cut: 128 });
  gates.set(side & 3, p.cv);
  return p.cv;
}

const aethers = new Map();

/**
 * One square of the AETHER: what lies past the edge of the map, where a tile
 * the wind carries over the edge is gone for good. Deep and starry, so it
 * reads as nowhere at all beside the day sky. `edges` is a bit per side
 * (1 N, 2 E, 4 S, 8 W) facing the map, and on those sides the square carries
 * the map's border: a pale rule with a row of cloud curls hanging off it.
 */
export function pixelAether(x, y, edges = 0) {
  const v = hash(`aether:${x},${y}`) % 6;
  const k = `${v}|${edges}`;
  let hit = aethers.get(k);
  if (hit) return hit;
  const p = new Plate(PX, PX, `aether:${v}`);
  p.layer(INK.aether, (pen) => pen.rect(0, 0, PX, PX), { cut: 128, busy: false });
  p.layer(INK.aetherDot, (pen) => {
    for (let i = 0; i < 7; i++) pen.rect(Math.floor(p.r() * PX), Math.floor(p.r() * PX), 1, 1);
  }, { cut: 128 });
  p.layer(INK.cloud, (pen) => {
    for (let i = 0; i < 2; i++) {
      const sx = 4 + Math.floor(p.r() * (PX - 8)), sy = 4 + Math.floor(p.r() * (PX - 8));
      pen.rect(sx, sy, 1, 1);
      if (v % 2 === 0) { pen.rect(sx - 1, sy, 3, 1); pen.rect(sx, sy - 1, 1, 3); }
    }
  }, { cut: 128 });
  if (v === 0) {
    const x0 = 12 + p.r() * 20, y0 = 14 + p.r() * 20;
    p.layer(INK.aetherSwirl, (pen) => pen.stalk(x0, y0, -0.2, 11, 4, { dir: 1, bend: 0.2 }), { cut: 110 });
  }
  // The border: on each side facing the map, a pale rule a few pixels in and
  // a curl every third of the way along it, the way the chart's frame is drawn.
  for (let s = 0; s < 4; s++) {
    if (!(edges & (1 << s))) continue;
    p.layer(INK.cloudLine, (pen) => pen.rect(...onSide(s, [0, 0, PX, 4])), { cut: 128 });
    p.layer(INK.cloud, (pen) => pen.rect(...onSide(s, [0, 1, PX, 2])), { cut: 128 });
    p.layer(INK.cloudLine, (pen) => {
      for (const t of [12.5, 38.5]) {
        const [cx, cy] = turn([t, 9.5], s);
        pen.hook(cx, cy, 3.6, { dir: 1, start: s * Math.PI / 2 - Math.PI / 2, width: 2 });
      }
    }, { cut: 120 });
  }
  aethers.set(k, p.cv);
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

// --- the figures: followers and the whale ---------------------------------
//
// The figures stand ON the board, so they are drawn on its grid too: a
// follower is a sprite at the same pixel size as the tiles under it, and the
// whale is one a little wider than a tile, because it overhangs its square.
// Whether they are drawn this way is a switch the renderer sets each frame
// from the mode, which lets art.js send every follower in the game (on the
// board, in the claim panel, mid-hop across the board) through one door.

let figuresOn = false;
export function setPixelFigures(on) { figuresOn = !!on; }
export function pixelFigures() { return figuresOn; }

const figures = new Map();

/** Blend a colour toward white (f > 0) or black (f < 0). */
function shade(hex, f) {
  const c = rgb(hex).map((v) => Math.round(f > 0 ? v + (255 - v) * f : v * (1 + f)));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Light the edges of one colour on a finished sprite, pixel art's way: the
 * pixels of `color` with no `color` above or to the left of them go a step
 * lighter, those with none below or to the right a step darker. A bevel made
 * of whole pixels, so the sprite keeps its hard edge.
 */
function bevel(cv, color, { light = 0.38, dark = -0.22 } = {}) {
  const c = cv.getContext('2d');
  const { width: w, height: h } = cv;
  const img = c.getImageData(0, 0, w, h);
  const d = img.data;
  const [r, g, b] = rgb(color);
  const is = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return false;
    const i = (y * w + x) * 4;
    return d[i + 3] && d[i] === r && d[i + 1] === g && d[i + 2] === b;
  };
  const lit = [], dim = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!is(x, y)) continue;
      if (!is(x, y - 1) || !is(x - 1, y)) lit.push((y * w + x) * 4);
      else if (!is(x, y + 1) || !is(x + 1, y)) dim.push((y * w + x) * 4);
    }
  }
  const L = rgb(shade(color, light)), D = rgb(shade(color, dark));
  for (const i of lit) [d[i], d[i + 1], d[i + 2]] = L;
  for (const i of dim) [d[i], d[i + 1], d[i + 2]] = D;
  c.putImageData(img, 0, 0);
}

/**
 * A FOLLOWER: the star person, on a 25 px square at the tiles' own density.
 * Head at the top point, arms out, legs down, in its player's colour inside
 * an ink line, lit at the edges, with a face. One lying down (a farmer) is
 * the same sprite turned a quarter, which on a pixel grid is exact.
 */
export const MEEPLE_PX = 25;
export function pixelMeeple(color, { lying = false } = {}) {
  const key = `meeple|${color}|${lying}`;
  let hit = figures.get(key);
  if (hit) return hit;
  if (lying) {
    hit = quarter(pixelMeeple(color), 3);
    figures.set(key, hit);
    return hit;
  }
  const n = MEEPLE_PX;
  const p = new Plate(n, n, key);
  const c = n / 2, cy = c + 1;
  // The proportions of the vector star (head 0.68, arms 0.56, waist 0.235 of
  // a follower's size), at the size a board follower is drawn.
  const star = (ctx) => {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * (Math.PI * 2 / 5);
      const r = i === 0 ? 11.6 : 10.4;
      ctx.lineTo(c + Math.cos(a) * r, cy + Math.sin(a) * r);
      const b = a + Math.PI / 5;
      ctx.lineTo(c + Math.cos(b) * 4.6, cy + Math.sin(b) * 4.6);
    }
    ctx.closePath();
  };
  p.layer(INK.ink, (pen, ctx) => { star(ctx); ctx.fill(); ctx.lineWidth = 2.8; ctx.stroke(); }, { cut: 128 });
  p.layer(color, (pen, ctx) => { star(ctx); ctx.fill(); }, { cut: 128 });
  bevel(p.cv, color);
  p.layer(INK.ink, (pen) => { pen.rect(c - 3.5, cy - 2, 1, 2); pen.rect(c + 2.5, cy - 2, 1, 2); }, { cut: 128 });
  p.layer(shade(color, -0.35), (pen) => pen.rect(c - 1.5, cy + 1, 3, 1), { cut: 128 });
  figures.set(key, p.cv);
  return p.cv;
}

/** A follower's shadow on the ground, and the broken ring of one holding nothing. */
function meepleShadow() {
  let hit = figures.get('meeple-shadow');
  if (hit) return hit;
  const p = new Plate(MEEPLE_PX, 7, 'meeple-shadow');
  p.layer(INK.ink, (pen, ctx) => { ctx.beginPath(); ctx.ellipse(MEEPLE_PX / 2, 3.5, 8.5, 2.6, 0, 0, Math.PI * 2); ctx.fill(); }, { cut: 128 });
  figures.set('meeple-shadow', p.cv);
  return p.cv;
}

function meepleRing(color) {
  const key = `meeple-ring|${color}`;
  let hit = figures.get(key);
  if (hit) return hit;
  const n = 37;
  const p = new Plate(n, n, key);
  p.layer(color, (pen) => {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      pen.arc(n / 2, n / 2, 16, a, a + 0.36, { width: 2, wobble: 0 });
    }
  }, { cut: 120 });
  figures.set(key, hit = p.cv);
  return hit;
}

/**
 * Draw a follower at (x, y), where `size` is what the vector follower would
 * have been drawn at. A board follower is drawn at 0.42 of a tile, so that
 * is the size at which one sprite pixel is one tile pixel; everything else
 * (a claim spot, a hop across the board) scales from there.
 */
export function drawPixelMeeple(ctx, x, y, size, color, opts = {}) {
  const k = size / (0.42 * PX) * (opts.big ? 1.25 : 1);
  const smooth = k * (globalThis.devicePixelRatio || 1) < 1;
  const sprite = pixelMeeple(color, { lying: !!opts.farmer });
  const s = Math.max(1, Math.round(MEEPLE_PX * k));
  ctx.save();
  ctx.imageSmoothingEnabled = smooth;
  if (opts.adrift) {
    const r = Math.round(37 * k);
    ctx.globalAlpha *= 0.85;
    ctx.drawImage(meepleRing(color), Math.round(x - r / 2), Math.round(y - r / 2), r, r);
    ctx.globalAlpha /= 0.85;
  }
  const sh = meepleShadow();
  ctx.globalAlpha *= 0.28;
  ctx.drawImage(sh, Math.round(x - s / 2), Math.round(y + s * (opts.farmer ? 0.22 : 0.36)), s, Math.max(1, Math.round(7 * k)));
  ctx.globalAlpha /= 0.28;
  ctx.drawImage(sprite, Math.round(x - s / 2), Math.round(y - s / 2), s, s);
  ctx.restore();
}

/**
 * THE BALENA, a sky whale the colour of evening: an ink line, a pale belly
 * with its grooves, a flipper, a smile, and a little curl of cloud breathed
 * out of its blowhole, because in this kingdom even the whale is weather.
 * Nose east, two frames of tail (up, down), and a bit wider than a tile.
 */
/**
 * A PLAYER'S CLOUD: a whole cloud the size of a tile with a face on it,
 * cheeks puffed, blowing a stream of wind curls the way it faces, like the
 * wind-heads in the corners of an old chart. Its outline and its cheeks are
 * its player's colour. The body sits back from the way it blows and the face
 * stays upright whichever way that is, looking where it blows.
 */
const spiritPics = new Map();
export function pixelCloudSpirit(color, dir = 0) {
  const k = `${color}|${dir}`;
  let hit = spiritPics.get(k);
  if (hit) return hit;
  const p = new Plate(PX, PX, `spirit:${dir}`);
  const [cx, cy] = turn([MID, 31.5], dir).map((v) => Math.round(v - 0.5) + 0.5);
  const S = 1.5;
  const blobs = [[0, 1.5, 7], [-6.5, 3, 4.5], [6.5, 3, 4.5], [-3.5, -3.5, 5], [3.5, -3.5, 4.5]]
    .map(([dx, dy, r]) => [cx + dx * S, cy + dy * S, r * S]);
  const line = shade(color, -0.25);
  p.layer(line, (pen) => blobs.forEach(([x, y, r]) => pen.disc(x, y, r + 2)), { cut: 128 });
  p.layer(INK.cloud, (pen) => blobs.forEach(([x, y, r]) => pen.disc(x, y, r)), { cut: 128 });
  p.layer(INK.cloudShade, (pen) => {
    pen.c.save();
    pen.c.beginPath(); blobs.forEach(([x, y, r]) => { pen.c.moveTo(x + r, y); pen.c.arc(x, y, r, 0, Math.PI * 2); });
    pen.c.clip();
    blobs.forEach(([x, y, r]) => pen.disc(x, y + r * 0.75, r * 0.7));
    pen.c.restore();
  }, { cut: 128 });
  // The breath, out over the cloud's edge to the side of the tile it blows
  // at: the one thing on it that has to read at a glance.
  const out = SIDE_ANGLE[dir];
  const reach = dir % 2 ? 15 : 12;
  p.layer(INK.wind, (pen) => {
    [-0.45, 0, 0.45].forEach((da) => {
      const a = out + da;
      const x = cx + Math.cos(a) * reach, y = cy + Math.sin(a) * reach;
      pen.stalk(x, y, a, da ? 6 : 8, 3.6, { dir: da < 0 ? -1 : 1, bend: 0.12 });
    });
  }, { cut: 128 });
  // The face, upright, its eyes and mouth leaning the way it blows.
  const [lx, ly] = [[0, -1], [1, 0], [0, 1], [-1, 0]][dir];
  const fx = cx + lx * 3, fy = cy - 1 + ly * 2;
  p.layer(shade(color, 0.25), (pen) => { pen.disc(fx - 7.5, fy + 3, 3.3); pen.disc(fx + 7.5, fy + 3, 3.3); }, { cut: 128 });
  p.layer(INK.ink, (pen) => {
    pen.rect(Math.round(fx - 6 + lx), Math.round(fy - 4), 2, 3);
    pen.rect(Math.round(fx + 4 + lx), Math.round(fy - 4), 2, 3);
  }, { cut: 128 });
  p.layer(INK.ink, (pen) => {
    const mx = fx + lx * 5, my = fy + 4 + ly * 2;
    pen.arc(mx, my, 2.2, 0, Math.PI * 2, { width: 1.5, wobble: 0 });
  }, { cut: 110 });
  spiritPics.set(k, p.cv);
  return p.cv;
}

export const WHALE_W = 61, WHALE_H = 43;
const WHALE = { body: '#6a78b8', deep: '#4f5a96', belly: '#e8ecfb' };

export function pixelWhale(frame = 0) {
  const key = `whale|${frame & 1}`;
  let hit = figures.get(key);
  if (hit) return hit;
  const p = new Plate(WHALE_W, WHALE_H, 'whale');
  const cx = 32, cy = 25;
  const body = (ctx) => {
    ctx.beginPath();
    ctx.moveTo(cx + 23, cy + 1);
    ctx.bezierCurveTo(cx + 14, cy - 13, cx - 6, cy - 14, cx - 15, cy - 6);
    ctx.bezierCurveTo(cx - 19, cy - 3, cx - 21, cy - 2, cx - 22, cy);
    ctx.bezierCurveTo(cx - 21, cy + 3, cx - 19, cy + 4, cx - 15, cy + 6);
    ctx.bezierCurveTo(cx - 6, cy + 13, cx + 14, cy + 12, cx + 23, cy + 1);
    ctx.closePath();
  };
  const up = (frame & 1) === 0;
  const fluke = (ctx) => {
    const t = up ? -1 : 1;
    ctx.beginPath();
    ctx.moveTo(cx - 19, cy - 1);
    ctx.lineTo(cx - 27, cy + t * 9);
    ctx.lineTo(cx - 25, cy + t * 2);
    ctx.lineTo(cx - 29, cy - t * 3);
    ctx.lineTo(cx - 19, cy + 2);
    ctx.closePath();
  };
  p.layer(INK.ink, (pen, ctx) => {
    for (const shape of [body, fluke]) { shape(ctx); ctx.fill(); ctx.lineWidth = 3; ctx.stroke(); }
  }, { cut: 128 });
  p.layer(WHALE.body, (pen, ctx) => { body(ctx); ctx.fill(); fluke(ctx); ctx.fill(); }, { cut: 128 });
  bevel(p.cv, WHALE.body, { light: 0.25, dark: -0.12 });
  p.layer(WHALE.belly, (pen, ctx) => {
    ctx.save(); body(ctx); ctx.clip();
    ctx.beginPath(); ctx.ellipse(cx + 3, cy + 10, 21, 7, -0.05, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }, { cut: 128 });
  p.layer(WHALE.deep, (pen) => {
    for (let i = 0; i < 4; i++) pen.line(cx - 7 + i * 6, cy + 6, cx - 9 + i * 6, cy + 10, { width: 1.4, wobble: 0 });
    pen.fill([[cx + 3, cy + 3], [cx - 6, cy + 11], [cx + 5, cy + 9]]);
  }, { cut: 110 });
  p.layer(INK.ink, (pen) => {
    pen.rect(cx + 12, cy - 3, 2, 2);
    pen.line(cx + 21, cy + 3, cx + 12, cy + 4, { width: 1, wobble: 0 });
  }, { cut: 110 });
  p.layer(INK.cloud, (pen) => pen.rect(cx + 12, cy - 3, 1, 1), { cut: 128 });
  p.layer(INK.cloudLine, (pen) => {
    pen.stalk(cx + 6, cy - 11, -Math.PI / 2 - 0.5, 6, 3.6, { dir: -1, bend: 0.2 });
    pen.stalk(cx + 7, cy - 11, -Math.PI / 2 + 0.45, 7, 3.6, { dir: 1, bend: 0.2 });
  }, { cut: 128 });
  figures.set(key, p.cv);
  return p.cv;
}

/** The whale's shadow on the country under it. */
export function pixelWhaleShadow() {
  let hit = figures.get('whale-shadow');
  if (hit) return hit;
  const p = new Plate(WHALE_W, 11, 'whale-shadow');
  p.layer(INK.ink, (pen, ctx) => { ctx.beginPath(); ctx.ellipse(WHALE_W / 2, 5.5, 22, 4.5, 0, 0, Math.PI * 2); ctx.fill(); }, { cut: 128 });
  figures.set('whale-shadow', p.cv);
  return p.cv;
}

/** Throw every cached picture away (after an edit to this file, say). */
export function clearPixels() {
  tiles.clear(); canon.clear(); skies.clear(); coasts.clear(); sails.clear(); figures.clear();
}
