// ---------------------------------------------------------------------------
// Starà in low-poly 3D: the city as a model, seen from above or in isometric.
//
// Timothy, 2026-11-27: "I want to see what this game would look like if it
// was kind of pseudo pixel 3D in some way, and also kind of displayed
// isometrically, so you can kind of see some elevation change as you build
// ... like a Nintendo 64, I would say, is what we'd be targeting, and then
// have an isometric view and a regular top-down view like we have now."
//
// What makes a picture read as the N64, and what this file does for each:
//
//   FEW POLYGONS, FLAT FACES. Every house is a box and a gabled roof; a
//     tower an octagon and a cone. Built in JS from the game each time the
//     city changes, a few thousand triangles.
//   GOURAUD LIGHT. One sun and an ambient term, worked out per vertex. The
//     sun stays at the upper left of the SCREEN whichever way the view is
//     turned, so the faces toward you on the left are lit and the right are
//     in shade: the convention every isometric game uses to make a block
//     read as a block.
//   SMALL, SMEARED TEXTURES. A 256 px atlas of 32 px textures painted here
//     at start (roof tiles, windows, flagstones, brick, marble bands,
//     water), sampled with bilinear filtering, which is the N64's blur.
//     They are grey: the colour is the vertex's, so one texture of plaster
//     is every colour of plaster.
//   FOG. The country fades into haze a few squares past the city, as the
//     N64's fog wall hid its draw distance.
//   A LOW RESOLUTION, DITHERED. The canvas is drawn at about 250 pixels
//     across its short side and blown up with nearest-neighbour scaling, and
//     every colour is cut to 5 bits a channel through a 4 x 4 ordered
//     dither, the 16-bit framebuffer's look.
//
// ELEVATION, as asked: a HOUSE IS AS TALL AS IT IS WORTH. A square of houses
// scores 1, +1 beside a plaza, +1 watered, +1 beside the cathedral, so it
// stands one to four storeys, and grows (or sinks) as what is round it
// changes. A well-built city rises; a careless one stays low. San Gimignano
// built its 72 towers for the same reason: a family's height was its worth.
// Nothing in the rules changed for it.
//
// The long form (Contado, src/modes/contado.js) adds the LAND: every square
// has a level, drawn as terraces with cut earth between them, and the
// aqueduct's arches stand taller over the valleys, because its channel runs
// level from the spring.
//
// HOW IT FITS THE REST. The workshop's 2D renderer still draws everything
// that is not the model: the lit squares, the staged piece's outline, what
// it would pay, the wax seal, the floating scores. They are drawn in the
// same top-down coordinates as ever, and in the isometric view the 2D
// canvas is given the AFFINE MAP that takes the ground plane to the screen
// (an orthographic camera turns a plane into a parallelogram, which is
// exactly what a canvas transform can do), so every one of them lies on the
// ground under the model, at full resolution, with no code of theirs
// changed. `project` and `unproject` are that map, and are what a tap is
// worked back through, height first (pickCell).
// ---------------------------------------------------------------------------

import { TILES, SIDE_STEP } from './tiles.js';
import { maskOf, turnMask } from './modes/stara-city.js';

/** The three ways to look at the city: the inked table, and the model from above or in isometric. */
export const VIEWS = [
  { id: 'ink', name: 'Ink', about: 'The hand-drawn table, from above' },
  { id: 'top', name: 'Top', about: 'The model, from straight above' },
  { id: 'iso', name: 'Iso', about: 'The model in isometric; tap again to turn it' },
];

/**
 * Each model view's two angles, in degrees, as a new player has them:
 * TILT, how steeply the camera looks down (90 is straight down), and TURN,
 * the direction it looks from (0 looks from the south, north at the top of
 * the screen, as the inked table does). Isometric is the pixel artist's
 * 2:1, a tilt of 30 (a square's diamond twice as wide as it is tall), which
 * is what most people mean by isometric in a game, turned 45.
 */
export const VIEW_ANGLES = { iso: { tilt: 30, turn: 45 }, top: { tilt: 90, turn: 0 } };
/** How far the sliders go (2026-11-27: "sliders for me to adjust how tilted ... isometric and top are"). */
export const TILT_RANGE = [10, 90];

/**
 * The camera for a view. `angles` are its tilt and turn (VIEW_ANGLES, or as
 * the sliders left them); `quarter` turns the isometric view a further
 * quarter at a time. A view that looks straight down unturned is `flat`: its
 * camera is the inked table's own, and nothing drawn on top needs mapping.
 */
export function viewOf(kind = 'ink', quarter = 0, angles = null) {
  if (kind !== 'iso' && kind !== 'top') return { kind, quarter: 0, yaw: 0, c: 1, s: 0, cp: 0, sp: 1, flat: true, sig: kind };
  const a = { ...VIEW_ANGLES[kind], ...(angles || {}) };
  const tilt = Math.max(TILT_RANGE[0], Math.min(TILT_RANGE[1], a.tilt));
  const q = kind === 'iso' ? quarter & 3 : 0;
  const deg = (((a.turn + q * 90) % 360) + 360) % 360;
  const yaw = (deg * Math.PI) / 180, pitch = (tilt * Math.PI) / 180;
  // Exactly overhead and unturned, the numbers are exact, so the top view
  // stays pixel for pixel the inked table's camera.
  const down = tilt >= 90, square = deg === 0;
  return {
    kind, quarter: q, yaw, tilt, turn: deg,
    c: square ? 1 : Math.cos(yaw), s: square ? 0 : Math.sin(yaw),
    cp: down ? 0 : Math.cos(pitch), sp: down ? 1 : Math.sin(pitch),
    flat: down && square, sig: `${kind}${q}:${tilt}:${a.turn}`,
  };
}

/**
 * World to screen: square (wx, wz) of the table at height `h` (in squares),
 * for a camera `{x, y, zoom}` (its middle, on the table, and pixels to a
 * square) on a screen `w` by `h` pixels.
 */
export function project(view, cam, w, hgt, wx, wz, h = 0) {
  const u = (wx - cam.x) * cam.zoom, v = (wz - cam.y) * cam.zoom;
  const ru = u * view.c - v * view.s, rv = u * view.s + v * view.c;
  return [w / 2 + ru, hgt / 2 + rv * view.sp - h * cam.zoom * view.cp];
}

/** Screen to world: the point of the table at height `h` under screen point (sx, sy). */
export function unproject(view, cam, w, hgt, sx, sy, h = 0) {
  const ru = sx - w / 2, rv = (sy - hgt / 2 + h * cam.zoom * view.cp) / view.sp;
  const u = ru * view.c + rv * view.s, v = -ru * view.s + rv * view.c;
  return [u / cam.zoom + cam.x, v / cam.zoom + cam.y];
}

/**
 * The ground plane's map from top-down coordinates (where the 2D renderer
 * draws, `toScreen` as it always was) to the screen: as a canvas transform,
 * [a, b, c, d, e, f] with x' = a x + c y + e and y' = b x + d y + f.
 */
export function planAffine(view, w, h) {
  const a = view.c, c = -view.s, b = view.sp * view.s, d = view.sp * view.c;
  return [a, b, c, d, w / 2 - a * w / 2 - c * h / 2, h / 2 - b * w / 2 - d * h / 2];
}

/**
 * Where a point `h` squares up lands in top-down coordinates, as an offset:
 * the affine map of (dx, dy) is the projection of the point raised. So an
 * overlay drawn for a square on a hill is drawn on the hill.
 */
export function planLift(view, zoom, h) {
  if (!h || !view.cp) return [0, 0];
  const dy = -h * zoom * view.cp;
  return [(view.s * dy) / view.sp, (view.c * dy) / view.sp];
}

/**
 * Where to put the camera so a set of points of the table, `[x, z, h]` (in
 * squares, h up), fills `availW` by `availH` pixels, its middle `offY`
 * pixels below the screen's. Returns `{zoom, x, y}` (the zoom unclamped);
 * with `zoom` given, only where to put it at that zoom.
 */
export function fitPoints(view, pts, availW, availH, offY = 0, zoom = null) {
  let cx = 0, cz = 0;
  for (const p of pts) { cx += p[0]; cz += p[1]; }
  cx /= pts.length; cz /= pts.length;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, z, h = 0] of pts) {
    const u = x - cx, v = z - cz;
    const ru = u * view.c - v * view.s, rv = u * view.s + v * view.c;
    const sx = ru, sy = rv * view.sp - h * view.cp;
    minX = Math.min(minX, sx); maxX = Math.max(maxX, sx);
    minY = Math.min(minY, sy); maxY = Math.max(maxY, sy);
  }
  zoom ??= Math.min(availW / (maxX - minX), availH / (maxY - minY));
  // Move the camera so the picture of the points is centred where it is wanted.
  const ox = (minX + maxX) / 2, oy = (minY + maxY) / 2;
  const ru = ox, rv = (oy - offY / zoom) / view.sp;
  return { zoom, x: cx + ru * view.c + rv * view.s, y: cz - ru * view.s + rv * view.c };
}

/** The same for a box of the table, `{x0, x1, z0, z1}`, with things standing on it from `bottom` to `top`. */
export function fitBox(view, box, availW, availH, offY = 0, zoom = null) {
  const pts = [];
  for (const x of [box.x0, box.x1]) for (const z of [box.z0, box.z1]) for (const h of [box.bottom || 0, box.top || 0]) pts.push([x, z, h]);
  return fitPoints(view, pts, availW, availH, offY, zoom);
}

// --- the measures of the model, in squares ---------------------------------------

const STOREY = 0.15;          // a storey of a house
const ROOF = 0.1;             // a gable's height
const FLOOR = 0.03;           // the city's paving stands this far off the ground
export const LEVEL = 0.34;    // one level of the land (Contado)
const DECK = 1.0;             // the aqueduct's channel, over the ground at the spring
const WALL_H = 0.42, WALL_T = 0.12;
const SHADOW_Y = 0.045;       // where shadows fall: just over the paving
const G = 0.045, A = 0.35, B = 0.65;   // city.js's bands: the lane and the street

// --- colour --------------------------------------------------------------------

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const PAL = {
  grass: rgb('#79a84c'), meadow: rgb('#86b356'), wheat: rgb('#d8b75a'), vines: rgb('#7f9a45'), plough: rgb('#a8784c'),
  olive: rgb('#8fa06a'), cypress: rgb('#3f6b37'), pine: rgb('#4f7c3a'), trunk: rgb('#6b4a2e'),
  lane: rgb('#b59f7c'), street: rgb('#d9ccad'), brick: rgb('#c9825a'), stone: rgb('#ddd0ad'), stoneDark: rgb('#b3a27c'),
  wall: rgb('#d8c69c'), wallTop: rgb('#c4b189'), rock: rgb('#a39a88'), earth: rgb('#9c7650'), dirt: rgb('#c2a173'),
  water: rgb('#3f93d9'), dry: rgb('#b7a885'), marble: rgb('#f1ece0'), lead: rgb('#8e6a52'), dome: rgb('#c86a43'),
  palazzo: rgb('#c0714a'), tower: rgb('#d2a06e'), dark: rgb('#3b2a20'), gules: rgb('#b8372a'), or: rgb('#e0a823'),
  white: [1, 1, 1], black: [0, 0, 0],
};
const PLASTER = ['#efcf8e', '#e9ad72', '#f3e1b6', '#df9673', '#ecc192', '#e7c37a', '#f0d6a6'].map(rgb);
const TILE_ROOF = ['#c4573a', '#cf6a43', '#b54d34', '#d27a4c', '#bf5f3e'].map(rgb);
const FOG = rgb('#b9cbc4');

/** A small integer hash of a square and a salt, as a fraction 0 to 1. */
function hash(x, y, k = 0) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(k | 0, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const pick = (arr, f) => arr[Math.min(arr.length - 1, Math.floor(f * arr.length))];
const shade = (c, k) => [c[0] * k, c[1] * k, c[2] * k];

// --- the texture atlas -----------------------------------------------------------

/** Texture slots in the atlas, 8 to a row. Water's is scrolled by the shader. */
const T = {
  grass: 0, flag: 1, brick: 2, roof: 3, window: 4, plaster: 5, ashlar: 6, marble: 7,
  water: 8, dirt: 9, wood: 10, flat: 11, earth: 12, leaf: 13, wheat: 14, vines: 15,
};
const SLOT = 32, SLOTS = 8;

/** The atlas, painted in greys once: the vertex colour does the colouring. */
function paintAtlas() {
  const c = document.createElement('canvas');
  c.width = c.height = SLOT * SLOTS;
  const k = c.getContext('2d');
  const img = k.createImageData(c.width, c.height);
  let seed = 7;
  const rnd = () => { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; return seed / 4294967296; };
  const put = (slot, fn) => {
    const ox = (slot % SLOTS) * SLOT, oy = Math.floor(slot / SLOTS) * SLOT;
    for (let y = 0; y < SLOT; y++) {
      for (let x = 0; x < SLOT; x++) {
        const v = Math.max(0, Math.min(1, fn(x, y)));
        const i = ((oy + y) * c.width + ox + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.round(v * 255);
        img.data[i + 3] = 255;
      }
    }
  };
  const noise = (a) => 1 - a + rnd() * a;
  put(T.grass, (x, y) => (x === 0 || y === 0 ? 0.78 : 0.88) * noise(0.16) + (rnd() < 0.04 ? 0.1 : 0));
  // Flagstones: rows of slabs of different lengths, mortar between.
  const slabs = [];
  for (let r = 0; r < 4; r++) { let x = Math.floor(rnd() * 6); while (x < 64) { const w = 5 + Math.floor(rnd() * 7); slabs.push({ r, x, w, t: 0.84 + rnd() * 0.16 }); x += w; } }
  put(T.flag, (x, y) => {
    const r = Math.floor(y / 8);
    if (y % 8 === 7) return 0.6;
    const s = slabs.find((q) => q.r === r && ((x - q.x + 64) % 64) < q.w && (x - q.x + 64) % 64 >= 0) || slabs[0];
    return ((x - s.x + 64) % 64) === 0 ? 0.62 : s.t * noise(0.06);
  });
  put(T.brick, (x, y) => {
    const row = Math.floor(y / 4), off = (row % 2) * 4;
    if (y % 4 === 3 || (x + off) % 8 === 7) return 0.66;
    return 0.92 * noise(0.1);
  });
  put(T.roof, (x, y) => (y % 5 === 4 ? 0.58 : 0.76 + 0.24 * Math.abs(Math.sin(((x + (Math.floor(y / 5) % 2) * 2) * Math.PI) / 4))) * noise(0.05));
  put(T.window, (x, y) => {
    if (x >= 12 && x < 20 && y >= 8 && y < 22) return x === 15 || x === 16 ? 0.3 : 0.16;   // the window, its mullion
    if ((x === 10 || x === 11 || x === 20 || x === 21) && y >= 8 && y < 22) return 0.55;  // shutters
    if (y === 22 && x >= 10 && x < 22) return 0.7;                                      // the sill
    return 0.95 * noise(0.07);
  });
  put(T.plaster, () => 0.95 * noise(0.08));
  put(T.ashlar, (x, y) => {
    const row = Math.floor(y / 6), off = (row % 2) * 5;
    if (y % 6 === 5 || (x + off) % 10 === 9) return 0.64;
    return 0.9 * noise(0.1);
  });
  put(T.marble, (x, y) => (y % 8 < 3 ? 0.42 : 0.97) * noise(0.04));
  put(T.water, (x, y) => (((x + y * 3) % 13 === 0 || (x * 2 - y + 40) % 17 === 0) ? 1 : 0.78) * noise(0.06));
  put(T.dirt, () => 0.86 * noise(0.18) + (rnd() < 0.03 ? -0.2 : 0));
  put(T.wood, (x) => (x % 6 === 0 ? 0.2 : 0.42) * noise(0.15));
  put(T.flat, () => 1);
  put(T.earth, (x, y) => (0.72 + 0.14 * Math.sin(y * 0.9 + Math.sin(x * 0.4) * 1.5)) * noise(0.12));
  put(T.leaf, () => (rnd() < 0.3 ? 0.62 : 0.92) * noise(0.12));
  put(T.wheat, (x) => (x % 4 === 0 ? 0.72 : 0.96) * noise(0.1));
  put(T.vines, (x, y) => ((x % 6 < 2) ? (y % 4 < 3 ? 0.62 : 0.8) : 0.95) * noise(0.08));
  k.putImageData(img, 0, 0);
  return c;
}

// --- building meshes ---------------------------------------------------------------

/** Twelve floats a vertex: position, normal, colour, then the texture's (u, v) and slot. */
const STRIDE = 12;

class Mesh {
  constructor() { this.a = []; }

  vert(p, n, col, u, v, slot) {
    this.a.push(p[0], p[1], p[2], n[0], n[1], n[2], col[0], col[1], col[2], u, v, slot);
  }

  tri(p0, p1, p2, n, col, slot, uv = [[0, 0], [1, 0], [0, 1]]) {
    this.vert(p0, n, col, uv[0][0], uv[0][1], slot);
    this.vert(p1, n, col, uv[1][0], uv[1][1], slot);
    this.vert(p2, n, col, uv[2][0], uv[2][1], slot);
  }

  /** Four corners in order round the face, its normal, and the texture's (u, v) at each. */
  quad(p0, p1, p2, p3, n, col, slot, uv) {
    this.tri(p0, p1, p2, n, col, slot, [uv[0], uv[1], uv[2]]);
    this.tri(p0, p2, p3, n, col, slot, [uv[0], uv[2], uv[3]]);
  }

  /** A flat rectangle lying at height y, textured by where it is (so a texture runs on across squares). */
  flat(x0, z0, x1, z1, y, col, slot, scale = 1) {
    this.quad([x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], [0, 1, 0], col, slot,
      [[x0 * scale, z0 * scale], [x1 * scale, z0 * scale], [x1 * scale, z1 * scale], [x0 * scale, z1 * scale]]);
  }

  /**
   * A box. `sides` and `top` colours; `slot` and `topSlot` textures; a side's
   * texture runs `uScale` across a square and repeats every `vEvery` up it.
   */
  box(x0, y0, z0, x1, y1, z1, { side, top = side, slot = T.plaster, topSlot = slot, uScale = 4, vEvery = STOREY, noTop = false } = {}) {
    if (!noTop) this.flat(x0, z0, x1, z1, y1, top, topSlot, 4);
    const v0 = y0 / vEvery, v1 = y1 / vEvery;
    const face = (pa, pb, n, la, lb) => this.quad(
      [pa[0], y0, pa[1]], [pb[0], y0, pb[1]], [pb[0], y1, pb[1]], [pa[0], y1, pa[1]], n, side, slot,
      [[la * uScale, v0], [lb * uScale, v0], [lb * uScale, v1], [la * uScale, v1]]);
    face([x0, z0], [x1, z0], [0, 0, -1], x0, x1);
    face([x1, z1], [x0, z1], [0, 0, 1], x1, x0);
    face([x0, z1], [x0, z0], [-1, 0, 0], z1, z0);
    face([x1, z0], [x1, z1], [1, 0, 0], z0, z1);
  }

  /** A gabled roof over a box's top at height y, `h` high, its ridge along x (or z). */
  gable(x0, z0, x1, z1, y, h, alongX, col, wallCol, o = 0.02) {
    const r = 6;
    if (alongX) {
      const zm = (z0 + z1) / 2, d = Math.hypot(zm - z0, h);
      const nN = [0, (zm - z0) / d, -h / d], nS = [0, (zm - z0) / d, h / d];
      this.quad([x0 - o, y, z0 - o], [x1 + o, y, z0 - o], [x1 + o, y + h, zm], [x0 - o, y + h, zm], nN, col, T.roof,
        [[x0 * r, 0], [x1 * r, 0], [x1 * r, d * r], [x0 * r, d * r]]);
      this.quad([x0 - o, y, z1 + o], [x1 + o, y, z1 + o], [x1 + o, y + h, zm], [x0 - o, y + h, zm], nS, col, T.roof,
        [[x0 * r, 0], [x1 * r, 0], [x1 * r, d * r], [x0 * r, d * r]]);
      this.tri([x0, y, z0], [x0, y, z1], [x0, y + h, zm], [-1, 0, 0], wallCol, T.plaster);
      this.tri([x1, y, z0], [x1, y, z1], [x1, y + h, zm], [1, 0, 0], wallCol, T.plaster);
    } else {
      const xm = (x0 + x1) / 2, d = Math.hypot(xm - x0, h);
      const nW = [-h / d, (xm - x0) / d, 0], nE = [h / d, (xm - x0) / d, 0];
      this.quad([x0 - o, y, z0 - o], [x0 - o, y, z1 + o], [xm, y + h, z1 + o], [xm, y + h, z0 - o], nW, col, T.roof,
        [[z0 * r, 0], [z1 * r, 0], [z1 * r, d * r], [z0 * r, d * r]]);
      this.quad([x1 + o, y, z0 - o], [x1 + o, y, z1 + o], [xm, y + h, z1 + o], [xm, y + h, z0 - o], nE, col, T.roof,
        [[z0 * r, 0], [z1 * r, 0], [z1 * r, d * r], [z0 * r, d * r]]);
      this.tri([x0, y, z0], [x1, y, z0], [xm, y + h, z0], [0, 0, -1], wallCol, T.plaster);
      this.tri([x0, y, z1], [x1, y, z1], [xm, y + h, z1], [0, 0, 1], wallCol, T.plaster);
    }
  }

  /** A four-sided roof to a point. */
  pyramid(x0, z0, x1, z1, y, h, col, slot = T.roof) {
    const ap = [(x0 + x1) / 2, y + h, (z0 + z1) / 2];
    const corners = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
    for (let i = 0; i < 4; i++) {
      const a = corners[i], b = corners[(i + 1) % 4];
      const pa = [a[0], y, a[1]], pb = [b[0], y, b[1]];
      this.tri(pa, pb, ap, faceUp(pa, pb, ap), col, slot, [[0, 0], [2, 0], [1, 2]]);
    }
  }

  /** An n-sided prism standing from y0 to y1 (a round tower, a drum, a basin). */
  prism(cx, cz, r, y0, y1, { side, top = side, slot = T.plaster, topSlot = slot, n = 8, noTop = false } = {}) {
    const pts = [];
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + Math.PI / n; pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r, a]); }
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n];
      const am = (p[2] + q[2]) / 2 + (i === n - 1 ? Math.PI : 0);
      const nn = [Math.cos(am), 0, Math.sin(am)];
      this.quad([p[0], y0, p[1]], [q[0], y0, q[1]], [q[0], y1, q[1]], [p[0], y1, p[1]], nn, side, slot,
        [[i, y0 / STOREY], [i + 1, y0 / STOREY], [i + 1, y1 / STOREY], [i, y1 / STOREY]]);
      if (!noTop) this.tri([cx, y1, cz], [p[0], y1, p[1]], [q[0], y1, q[1]], [0, 1, 0], top, topSlot, [[0.5, 0.5], [p[0], p[1]], [q[0], q[1]]]);
    }
  }

  /** A cone (a tower's roof, a cypress). */
  cone(cx, cz, r, y, h, col, slot = T.roof, n = 8) {
    const ap = [cx, y + h, cz];
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2, am = (a0 + a1) / 2;
      const nn = norm([Math.cos(am) * h, r, Math.sin(am) * h]);
      this.tri([cx + Math.cos(a0) * r, y, cz + Math.sin(a0) * r], [cx + Math.cos(a1) * r, y, cz + Math.sin(a1) * r], ap, nn, col, slot,
        [[i, 0], [i + 1, 0], [i + 0.5, 2]]);
    }
  }

  /** A low dome of `rings` bands, flattened to `k` of a hemisphere. */
  dome(cx, cz, r, y, col, { n = 8, rings = 3, k = 1 } = {}) {
    for (let j = 0; j < rings; j++) {
      const b0 = (j / rings) * Math.PI / 2, b1 = ((j + 1) / rings) * Math.PI / 2;
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
        const P = (a, b) => [cx + Math.cos(a) * Math.cos(b) * r, y + Math.sin(b) * r * k, cz + Math.sin(a) * Math.cos(b) * r];
        const am = (a0 + a1) / 2, bm = (b0 + b1) / 2;
        const nn = norm([Math.cos(am) * Math.cos(bm), Math.sin(bm) / k, Math.sin(am) * Math.cos(bm)]);
        this.quad(P(a0, b0), P(a1, b0), P(a1, b1), P(a0, b1), nn, col, T.roof, [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]]);
      }
    }
  }

  /** A block of battlements: `count` merlons along an edge from (x0, z0) to (x1, z1) at height y. */
  merlons(x0, z0, x1, z1, y, depth, count, col, h = 0.07) {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const ux = (x1 - x0) / len, uz = (z1 - z0) / len;
    const w = len / (count * 2);
    for (let i = 0; i < count; i++) {
      const a = w * (i * 2 + 0.5), b = a + w;
      const ax = x0 + ux * a, az = z0 + uz * a, bx = x0 + ux * b, bz = z0 + uz * b;
      const px = -uz * depth, pz = ux * depth;
      this.box(Math.min(ax, bx, ax + px, bx + px), y, Math.min(az, bz, az + pz, bz + pz),
        Math.max(ax, bx, ax + px, bx + px), y + h, Math.max(az, bz, az + pz, bz + pz), { side: col, slot: T.ashlar });
    }
  }

  get floats() { return new Float32Array(this.a); }
  get count() { return this.a.length / STRIDE; }
}

function norm(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }

/** The normal of a triangle, turned to face up (a roof's, whichever way its corners were listed). */
function faceUp(a, b, c) {
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const n = norm([u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]);
  return n[1] < 0 ? [-n[0], -n[1], -n[2]] : n;
}

// --- reading the game ------------------------------------------------------------------

const keyOf = (x, y) => `${x},${y}`;

/** A square's streets, as a mask of world sides. */
function streetsOf(type, rot) {
  const road = type.feats?.find((f) => f.type === 'road');
  return road ? turnMask(maskOf(road.sides), rot) : 0;
}

/**
 * What the model is made from, read off the game: every square built (its
 * place, streets, the sides it joins its piece on, its worth now), the
 * aqueduct's spans, the spring, the wall and its high gates, and the land's
 * levels. Everything the picture needs and nothing it does not, so the mesh
 * is a function of this alone.
 */
export function modelOf(game) {
  const m = game.m, b = game.board;
  const level = m.levelAt ? (x, y) => m.levelAt(x, y) : () => 0;
  const cells = [];
  for (const c of b.cells.values()) {
    let joined = 0;
    if (c.piece != null) for (let s = 0; s < 4; s++) if (b.get(c.x + SIDE_STEP[s][0], c.y + SIDE_STEP[s][1])?.piece === c.piece) joined |= 1 << s;
    const per = m.city?.per.get(keyOf(c.x, c.y));
    cells.push({ x: c.x, y: c.y, kind: c.type.place, streets: streetsOf(c.type, c.rot), joined, worth: per?.pts ?? 0, wet: !!per?.wet, piece: c.piece });
  }
  const spans = (m.spansNow?.() || []).map((s) => ({ x: s.x, y: s.y, span: s.span, run: s.run }));
  const wall = m.city?.wall || [];
  const high = new Set((m.city?.roads?.[0]?.gates || []).map((g) => `${g.x},${g.y},${g.s}`));
  return { cells, spans, spring: m.water?.spring || null, wall, high, level, deck: m.deckAt ? (x, y) => m.deckAt(x, y) : null };
}

/** The same for a staged piece (the renderer's preview of it). */
export function ghostOf(pv) {
  if (!pv) return null;
  const own = new Set(pv.cells.map((c) => keyOf(c.x, c.y)));
  const ways = new Map();
  for (const f of pv.from || []) { if (!ways.has(f.for)) ways.set(f.for, new Set()); ways.get(f.for).add(f.way); }
  const cells = [], spans = [];
  for (const c of pv.cells) {
    if (pv.above) { spans.push({ x: c.x, y: c.y, span: c.span, run: c.run }); continue; }
    let joined = 0;
    for (let s = 0; s < 4; s++) if (own.has(keyOf(c.x + SIDE_STEP[s][0], c.y + SIDE_STEP[s][1]))) joined |= 1 << s;
    const kind = c.type.place;
    const worth = kind === 'house' ? 1 + (ways.get(keyOf(c.x, c.y))?.size || 0) : 0;
    cells.push({ x: c.x, y: c.y, kind, streets: streetsOf(c.type, c.rot), joined, worth, wet: false, piece: -1 });
  }
  return { cells, spans, fits: pv.fits };
}

// --- the places ------------------------------------------------------------------------

/** The three bands of a square, each axis, as city.js lays a tile out: the outer ones run to the edge on a joined side. */
function bandsOf(joined) {
  const j = (s) => !!(joined & (1 << s));
  return {
    xs: [[j(3) ? 0 : G, A - 0.02], [A, B], [B + 0.02, j(1) ? 1 : 1 - G]],
    zs: [[j(0) ? 0 : G, A - 0.02], [A, B], [B + 0.02, j(2) ? 1 : 1 - G]],
  };
}
const CUTS = [0, A, B, 1];

/** Which of the 3 x 3 sub-squares a street runs over. */
function streetGrid(streets) {
  const g = [[false, false, false], [false, false, false], [false, false, false]];   // g[i][j], i across, j down
  if (!streets) return g;
  g[1][1] = true;
  if (streets & 1) g[1][0] = true;
  if (streets & 2) g[2][1] = true;
  if (streets & 4) g[1][2] = true;
  if (streets & 8) g[0][1] = true;
  return g;
}

/**
 * One square of the city, at its place on the table, standing on ground
 * `g` (a height). Houses come up to their worth in storeys; the rest are
 * the place's own buildings drawn into what its streets leave.
 */
function buildCell(m, sh, c, g, shownWorth) {
  const X = c.x, Z = c.y;
  const grid = streetGrid(c.streets);
  const { xs, zs } = bandsOf(c.joined);
  const plaza = c.kind === 'plaza' || c.kind === 'comune';
  const f = g + FLOOR;
  // The floor: every sub-square, paving or street, with no two faces on top of each other.
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const st = grid[i][j];
      const col = st ? PAL.street : plaza ? PAL.brick : PAL.lane;
      m.flat(X + CUTS[i], Z + CUTS[j], X + CUTS[i + 1], Z + CUTS[j + 1], f, col, st ? T.flag : plaza ? T.brick : T.flag, st ? 3 : 5);
    }
  }
  // The floor's edge, where the city stands off the grass.
  m.box(X, g, Z, X + 1, f, Z + 1, { side: PAL.stoneDark, slot: T.ashlar, noTop: true });
  const free = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (!grid[i][j]) free.push([i, j]);
  const shadows = [];
  const block = (x0, z0, x1, z1, top) => shadows.push([x0, z0, x1, z1, top]);

  if (c.kind === 'house') {
    const worth = Math.max(1, shownWorth);
    for (const [i, j] of free) {
      // The middle of a square with no streets is a yard, not a house.
      if (i === 1 && j === 1) { m.flat(X + xs[i][0], Z + zs[j][0], X + xs[i][1], Z + zs[j][1], f + 0.002, PAL.meadow, T.grass, 3); continue; }
      const k = hash(X * 3 + i, Z * 3 + j, 11);
      const storeys = Math.max(1, worth - (k < 0.35 ? 1 : 0) + (k > 0.9 && worth >= 3 ? 1 : 0));
      const x0 = X + xs[i][0], x1 = X + xs[i][1], z0 = Z + zs[j][0], z1 = Z + zs[j][1];
      const top = f + storeys * STOREY;
      const wallCol = pick(PLASTER, hash(X * 3 + i, Z * 3 + j, 3));
      m.box(x0, f, z0, x1, top, z1, { side: wallCol, slot: T.window, uScale: 1 / 0.16, noTop: true });
      const along = (i + j + (k > 0.5 ? 1 : 0)) % 2 === 0;
      m.gable(x0, z0, x1, z1, top, ROOF, along, pick(TILE_ROOF, hash(X * 3 + i, Z * 3 + j, 5)), wallCol);
      block(x0, z0, x1, z1, top + ROOF * 0.5 - g);
    }
  } else if (plaza) {
    // A fountain in the middle of the square; the Comune's palazzo and its tower in a corner.
    const cx = X + 0.5, cz = Z + 0.5;
    if (c.kind === 'comune') {
      const x0 = X + xs[0][0], x1 = X + xs[0][1], z0 = Z + zs[0][0], z1 = Z + zs[0][1];
      m.box(x0, f, z0, x1, f + 0.42, z1, { side: PAL.palazzo, slot: T.window, uScale: 1 / 0.12 });
      m.merlons(x0, z1, x1, z1, f + 0.42, -0.04, 3, PAL.palazzo);
      m.merlons(x1, z0, x1, z1, f + 0.42, 0.04, 3, PAL.palazzo);
      // The tower: the tallest thing in the city, as the Torre del Mangia is Siena's.
      const t0 = x1 - 0.11, u0 = z0;
      m.box(t0, f, u0, x1, f + 1.38, u0 + 0.11, { side: PAL.tower, slot: T.ashlar });
      m.box(t0 - 0.015, f + 1.3, u0 - 0.015, x1 + 0.015, f + 1.42, u0 + 0.125, { side: PAL.stone, slot: T.ashlar });
      m.pyramid(t0, u0, x1, u0 + 0.11, f + 1.42, 0.1, PAL.lead);
      block(x0, z0, x1, z1, 0.45);
      block(t0, u0, x1, u0 + 0.11, 1.45);
      // The Fonte Gaia, in the far corner.
      const fx = X + (xs[2][0] + xs[2][1]) / 2, fz = Z + (zs[2][0] + zs[2][1]) / 2;
      m.prism(fx, fz, 0.1, f, f + 0.05, { side: PAL.stone, top: PAL.water, topSlot: T.water, slot: T.ashlar });
    } else {
      m.prism(cx, cz, 0.12, f, f + 0.05, { side: PAL.stone, top: PAL.water, topSlot: T.water, slot: T.ashlar });
      m.prism(cx, cz, 0.025, f + 0.05, f + 0.13, { side: PAL.stone, slot: T.ashlar });
      // Four bollards of stone where the streets come in, so it reads as a square, not a gap.
      for (const [i, j] of free) {
        if (i === 1 || j === 1) continue;
        const bx = X + (xs[i][0] + xs[i][1]) / 2, bz = Z + (zs[j][0] + zs[j][1]) / 2;
        m.cone(bx, bz, 0.05, f, 0.2, PAL.cypress, T.leaf, 6);
      }
    }
  } else if (c.kind === 'cathedral') {
    buildCathedral(m, c, X, Z, f, free, grid, xs, zs, block);
  }
  for (const s of shadows) sh.push(s, g);
}

/**
 * THE CATHEDRAL: a nave in banded marble along a side its streets leave
 * free, a dome over the crossing, and a campanile in a corner; with streets
 * on every side, a domed chapel and its bell tower in two corners.
 */
function buildCathedral(m, c, X, Z, f, free, grid, xs, zs, block) {
  const rowFree = (j) => !grid[0][j] && !grid[1][j] && !grid[2][j];
  const colFree = (i) => !grid[i][0] && !grid[i][1] && !grid[i][2];
  let nave = null;
  if (!c.streets) nave = { x0: X + 0.1, x1: X + 0.9, z0: Z + 0.34, z1: Z + 0.66, alongX: true };
  else if (rowFree(0)) nave = { x0: X + xs[0][0], x1: X + xs[2][1], z0: Z + zs[0][0], z1: Z + zs[0][1], alongX: true };
  else if (rowFree(2)) nave = { x0: X + xs[0][0], x1: X + xs[2][1], z0: Z + zs[2][0], z1: Z + zs[2][1], alongX: true };
  else if (colFree(0)) nave = { x0: X + xs[0][0], x1: X + xs[0][1], z0: Z + zs[0][0], z1: Z + zs[2][1], alongX: false };
  else if (colFree(2)) nave = { x0: X + xs[2][0], x1: X + xs[2][1], z0: Z + zs[0][0], z1: Z + zs[2][1], alongX: false };
  const H = 0.4;
  if (nave) {
    m.box(nave.x0, f, nave.z0, nave.x1, f + H, nave.z1, { side: PAL.marble, slot: T.marble, uScale: 6, vEvery: 0.12, noTop: true });
    m.gable(nave.x0, nave.z0, nave.x1, nave.z1, f + H, 0.14, nave.alongX, PAL.lead, PAL.marble);
    const mx = (nave.x0 + nave.x1) / 2, mz = (nave.z0 + nave.z1) / 2;
    const r = Math.min(nave.x1 - nave.x0, nave.z1 - nave.z0) * 0.42;
    m.prism(mx, mz, r, f + H, f + H + 0.16, { side: PAL.marble, slot: T.marble, noTop: true });
    m.dome(mx, mz, r, f + H + 0.16, PAL.dome, { k: 1.15 });
    m.prism(mx, mz, r * 0.22, f + H + 0.16 + r * 1.15, f + H + 0.28 + r * 1.15, { side: PAL.marble, slot: T.marble });
    block(nave.x0, nave.z0, nave.x1, nave.z1, H + 0.1);
    block(mx - r, mz - r, mx + r, mz + r, H + 0.16 + r);
  }
  // The campanile, in a free corner off the nave.
  const corners = [[0, 0], [2, 0], [2, 2], [0, 2]].filter(([i, j]) => !grid[i][j]);
  const inNave = ([i, j]) => nave && X + xs[i][0] >= nave.x0 - 1e-6 && X + xs[i][1] <= nave.x1 + 1e-6 && Z + zs[j][0] >= nave.z0 - 1e-6 && Z + zs[j][1] <= nave.z1 + 1e-6;
  const spots = corners.filter((q) => !inNave(q));
  const bell = spots[0] || corners[0];
  if (bell) {
    const [i, j] = bell;
    const cx = X + (xs[i][0] + xs[i][1]) / 2, cz = Z + (zs[j][0] + zs[j][1]) / 2, r = 0.075;
    m.box(cx - r, f, cz - r, cx + r, f + 1.08, cz + r, { side: PAL.marble, slot: T.marble, uScale: 6, vEvery: 0.12 });
    m.box(cx - r * 0.7, f + 0.9, cz - r - 0.002, cx + r * 0.7, f + 1.0, cz + r + 0.002, { side: PAL.dark, slot: T.flat, noTop: true });
    m.pyramid(cx - r, cz - r, cx + r, cz + r, f + 1.08, 0.14, PAL.lead);
    block(cx - r, cz - r, cx + r, cz + r, 1.15);
  }
  if (!nave && spots[1]) {
    const [i, j] = spots[1];
    const cx = X + (xs[i][0] + xs[i][1]) / 2, cz = Z + (zs[j][0] + zs[j][1]) / 2;
    m.prism(cx, cz, 0.12, f, f + 0.3, { side: PAL.marble, slot: T.marble, noTop: true });
    m.dome(cx, cz, 0.12, f + 0.3, PAL.dome, { k: 1.2 });
    block(cx - 0.12, cz - 0.12, cx + 0.12, cz + 0.12, 0.45);
  }
}

/**
 * One square of AQUEDUCT: piers down to the ground (or the roofs) and a
 * channel on arches from the middle to each side it opens on, with water in
 * it where it runs. `deck` is the channel's height, `ground` the land's.
 */
function buildSpan(m, sh, s, ground, deck) {
  const X = s.x, Z = s.y;
  const cx = X + 0.5, cz = Z + 0.5, w = 0.085;
  const pier = 0.055;
  const arch = deck - 0.16;
  for (let d = 0; d < 4; d++) {
    if (!(s.span & (1 << d))) continue;
    const [dx, dz] = SIDE_STEP[d];
    const ex = cx + dx * 0.5, ez = cz + dz * 0.5;
    const x0 = Math.min(cx, ex) - (dx ? 0 : w), x1 = Math.max(cx, ex) + (dx ? 0 : w);
    const z0 = Math.min(cz, ez) - (dz ? 0 : w), z1 = Math.max(cz, ez) + (dz ? 0 : w);
    // The arch: a deck slab, with haunches down each pier.
    m.box(x0, arch, z0, x1, deck, z1, { side: PAL.stone, top: PAL.stone, slot: T.ashlar, uScale: 6, vEvery: 0.2 });
    const hx = dx ? 0.07 : 0, hz = dz ? 0.07 : 0;
    m.box(Math.max(x0, ex - pier - hx), arch - 0.08, Math.max(z0, ez - pier - hz), Math.min(x1, ex + pier + hx), arch, Math.min(z1, ez + pier + hz), { side: PAL.stone, slot: T.ashlar, noTop: true });
    // The channel's two parapets, and the water between them.
    const rw = 0.022;
    if (dx) {
      m.box(x0, deck, z0, x1, deck + 0.07, z0 + rw, { side: PAL.stone, slot: T.ashlar });
      m.box(x0, deck, z1 - rw, x1, deck + 0.07, z1, { side: PAL.stone, slot: T.ashlar });
      m.flat(x0, z0 + rw, x1, z1 - rw, deck + 0.045, s.run ? PAL.water : PAL.dry, s.run ? T.water : T.dirt, 3);
    } else {
      m.box(x0, deck, z0, x0 + rw, deck + 0.07, z1, { side: PAL.stone, slot: T.ashlar });
      m.box(x1 - rw, deck, z0, x1, deck + 0.07, z1, { side: PAL.stone, slot: T.ashlar });
      m.flat(x0 + rw, z0, x1 - rw, z1, deck + 0.045, s.run ? PAL.water : PAL.dry, s.run ? T.water : T.dirt, 3);
    }
    // The pier at the end, shared with the next span's.
    m.box(ex - pier, ground, ez - pier, ex + pier, arch, ez + pier, { side: PAL.stone, slot: T.ashlar, vEvery: 0.2, noTop: true });
    sh.push([x0, z0, x1, z1, deck - ground + 0.05, true], ground);
  }
  m.box(cx - pier, ground, cz - pier, cx + pier, arch, cz + pier, { side: PAL.stone, slot: T.ashlar, vEvery: 0.2, noTop: true });
  // The middle, where the two halves of a bend meet.
  m.box(cx - w, arch, cz - w, cx + w, deck, cz + w, { side: PAL.stone, slot: T.ashlar });
  const open = [0, 1, 2, 3].filter((d) => s.span & (1 << d));
  for (let d = 0; d < 4; d++) {
    if (open.includes(d)) continue;
    const [dx, dz] = SIDE_STEP[d];
    // A parapet across the middle on a side it does not open on.
    const px = cx + dx * (w - 0.011), pz = cz + dz * (w - 0.011);
    m.box(px - (dx ? 0.011 : w), deck, pz - (dz ? 0.011 : w), px + (dx ? 0.011 : w), deck + 0.07, pz + (dz ? 0.011 : w), { side: PAL.stone, slot: T.ashlar });
  }
  m.flat(cx - w + 0.02, cz - w + 0.02, cx + w - 0.02, cz + w - 0.02, deck + 0.045, s.run ? PAL.water : PAL.dry, s.run ? T.water : T.dirt, 3);
}

/** THE SPRING: a pool in a ring of stone, under a knoll of rock. */
function buildSpring(m, sp, g) {
  const cx = sp.x + 0.5, cz = sp.y + 0.5;
  m.prism(cx, cz + 0.06, 0.3, g, g + 0.07, { side: PAL.stone, top: PAL.stone, slot: T.ashlar });
  m.flat(cx - 0.21, cz - 0.15, cx + 0.21, cz + 0.27, g + 0.075, PAL.water, T.water, 2);
  m.box(cx - 0.3, g, cz - 0.42, cx - 0.05, g + 0.26, cz - 0.2, { side: PAL.rock, slot: T.earth });
  m.box(cx - 0.08, g, cz - 0.46, cx + 0.22, g + 0.36, cz - 0.24, { side: PAL.rock, slot: T.earth });
  m.box(cx + 0.18, g, cz - 0.38, cx + 0.38, g + 0.2, cz - 0.16, { side: PAL.rock, slot: T.earth });
  // The spout, falling into the pool.
  m.box(cx - 0.02, g + 0.075, cz - 0.24, cx + 0.02, g + 0.25, cz - 0.2, { side: PAL.water, slot: T.water });
}

/**
 * THE WALL round the city: a curtain wall just outside every stretch, a
 * round tower at every outward corner, a gatehouse where a street runs out,
 * and banners on the high road's gates. Every piece stands on the lower of
 * the city's ground and the country's, so on a hillside it is a retaining
 * wall too.
 */
function buildWall(m, sh, model, built) {
  const lv = (x, y) => model.level(x, y) * LEVEL;
  for (const w of model.wall) {
    const [dx, dz] = SIDE_STEP[w.s];
    const g = lv(w.x, w.y), go = lv(w.x + dx, w.y + dz);
    const y0 = Math.min(g, go);
    // On the brow of a slope (the long form's land) the hill is the wall:
    // a low parapet, which is all it costs.
    const y1 = w.slope && !w.gate ? g + 0.12 : Math.max(g + WALL_H, go + 0.2);
    if (w.slope && !w.gate) {
      const r = w.s === 0 ? [w.x, w.y - WALL_T * 0.6, w.x + 1, w.y] : w.s === 2 ? [w.x, w.y + 1, w.x + 1, w.y + 1 + WALL_T * 0.6]
        : w.s === 3 ? [w.x - WALL_T * 0.6, w.y, w.x, w.y + 1] : [w.x + 1, w.y, w.x + 1 + WALL_T * 0.6, w.y + 1];
      m.box(r[0], y0, r[1], r[2], y1, r[3], { side: PAL.wall, top: PAL.wallTop, slot: T.ashlar, uScale: 6, vEvery: 0.2 });
      continue;
    }
    // The strip outside the edge, along it.
    const along = (a, b) => {
      if (w.s === 0) return [w.x + a, w.y - WALL_T, w.x + b, w.y];
      if (w.s === 2) return [w.x + a, w.y + 1, w.x + b, w.y + 1 + WALL_T];
      if (w.s === 3) return [w.x - WALL_T, w.y + a, w.x, w.y + b];
      return [w.x + 1, w.y + a, w.x + 1 + WALL_T, w.y + b];
    };
    const outer = (r) => (w.s === 0 ? [r[0], r[1], r[2], r[1]] : w.s === 2 ? [r[0], r[3], r[2], r[3]] : w.s === 3 ? [r[0], r[1], r[0], r[3]] : [r[2], r[1], r[2], r[3]]);
    const seg = (a, b, top) => {
      const r = along(a, b);
      m.box(r[0], y0, r[1], r[2], top, r[3], { side: PAL.wall, top: PAL.wallTop, slot: T.ashlar, uScale: 6, vEvery: 0.2 });
      const o = outer(r);
      // Along the outer edge, reaching inward: +z or +x on the north and
      // east (merlons' perpendicular is (-u.z, u.x)), the other way on the
      // south and west.
      m.merlons(o[0], o[1], o[2], o[3], top, (w.s < 2 ? 1 : -1) * WALL_T * 0.4, Math.max(1, Math.round((b - a) * 4)), PAL.wall);
      sh.push([r[0], r[1], r[2], r[3], top - y0], y0);
    };
    if (!w.gate) { seg(0, 1, y1); continue; }
    // A gatehouse: the wall to each side, two towers, and the arch over the street.
    seg(0, 0.14, y1);
    seg(0.86, 1, y1);
    const tower = (a, b) => {
      const r = along(a, b);
      const grow = 0.05;
      const q = [r[0] - (w.s % 2 ? grow : 0), r[1] - (w.s % 2 ? 0 : grow), r[2] + (w.s % 2 ? grow : 0), r[3] + (w.s % 2 ? 0 : grow)];
      m.box(q[0], y0, q[1], q[2], y1 + 0.16, q[3], { side: PAL.wall, top: PAL.wallTop, slot: T.ashlar, vEvery: 0.2 });
      m.pyramid(q[0], q[1], q[2], q[3], y1 + 0.16, 0.12, PAL.lead);
      sh.push([q[0], q[1], q[2], q[3], y1 + 0.2 - y0], y0);
      return q;
    };
    const t1 = tower(0.14, 0.35), t2 = tower(0.65, 0.86);
    const lintel = along(0.35, 0.65);
    m.box(lintel[0], y1 - 0.13, lintel[1], lintel[2], y1 + 0.04, lintel[3], { side: PAL.wall, top: PAL.wallTop, slot: T.ashlar });
    // The portcullis, up, in the dark of the arch.
    m.box(lintel[0] + (w.s % 2 ? 0.03 : 0), y1 - 0.2, lintel[1] + (w.s % 2 ? 0 : 0.03), lintel[2] - (w.s % 2 ? 0.03 : 0), y1 - 0.13, lintel[3] - (w.s % 2 ? 0 : 0.03), { side: PAL.dark, slot: T.wood });
    // The road out, into the country.
    const r0 = along(0.42, 0.58);
    const reach = 0.9;
    const road = w.s === 0 ? [r0[0], r0[1] - reach, r0[2], r0[1]] : w.s === 2 ? [r0[0], r0[3], r0[2], r0[3] + reach]
      : w.s === 3 ? [r0[0] - reach, r0[1], r0[0], r0[3]] : [r0[2], r0[1], r0[2] + reach, r0[3]];
    m.flat(road[0], road[1], road[2], road[3], go + 0.006, PAL.dirt, T.dirt, 4);
    m.flat(r0[0], r0[1], r0[2], r0[3], Math.max(g, go) + FLOOR, PAL.street, T.flag, 3);
    if (model.high.has(`${w.x},${w.y},${w.s}`)) {
      for (const q of [t1, t2]) {
        const px = (q[0] + q[2]) / 2, pz = (q[1] + q[3]) / 2, top = y1 + 0.28;
        m.box(px - 0.008, top - 0.02, pz - 0.008, px + 0.008, top + 0.26, pz + 0.008, { side: PAL.dark, slot: T.wood });
        const fx = w.s % 2 ? 0 : 0.12, fz = w.s % 2 ? 0.12 : 0;
        const n = w.s % 2 ? [1, 0, 0] : [0, 0, 1];
        m.quad([px, top + 0.26, pz], [px + fx, top + 0.23, pz + fz], [px + fx, top + 0.14, pz + fz], [px, top + 0.16, pz], n, PAL.gules, T.flat, [[0, 0], [1, 0], [1, 1], [0, 1]]);
        m.quad([px, top + 0.2, pz], [px + fx * 0.7, top + 0.19, pz + fz * 0.7], [px + fx * 0.7, top + 0.165, pz + fz * 0.7], [px, top + 0.175, pz], n, PAL.or, T.flat, [[0, 0], [1, 0], [1, 1], [0, 1]]);
      }
    }
  }
  // A round tower on every outward corner of the outline.
  const corners = new Set();
  for (const w of model.wall) {
    const pts = [[w.x, w.y], [w.x + 1, w.y], [w.x + 1, w.y + 1], [w.x, w.y + 1]];
    const ends = [[0, 1], [1, 2], [3, 2], [0, 3]][w.s];
    for (const e of ends) corners.add(keyOf(...pts[e]));
  }
  for (const k of corners) {
    const [px, pz] = k.split(',').map(Number);
    const around = [[px - 1, pz - 1], [px, pz - 1], [px - 1, pz], [px, pz]].filter(([x, y]) => built(x, y));
    if (around.length !== 1 && !(around.length === 2 && around[0][0] !== around[1][0] && around[0][1] !== around[1][1])) continue;
    for (const [bx, bz] of around) {
      const ox = bx < px ? 1 : -1, oz = bz < pz ? 1 : -1;
      const cx = px + ox * WALL_T * 0.5, cz = pz + oz * WALL_T * 0.5;
      const g = Math.min(lv(bx, bz), lv(px - (ox < 0 ? 1 : 0), pz - (oz < 0 ? 1 : 0)));
      const top = lv(bx, bz) + WALL_H + 0.18;
      m.prism(cx, cz, 0.11, g, top, { side: PAL.wall, top: PAL.wallTop, slot: T.ashlar, n: 8 });
      m.cone(cx, cz, 0.135, top, 0.2, pick(TILE_ROOF, hash(px, pz, 9)));
      sh.push([cx - 0.11, cz - 0.11, cx + 0.11, cz + 0.11, top + 0.1 - g], g);
    }
  }
}

/**
 * THE LAND: the country round the city as far as the fog, every square a
 * patch of meadow, wheat, vines or ploughland, with cypresses, umbrella
 * pines and olives standing where nothing is built or likely to be; on
 * ground with levels (Contado), each square a terrace and cut earth down to
 * the next.
 */
function buildLand(m, sh, model, box, built, reserve) {
  const lv = (x, y) => model.level(x, y) * LEVEL;
  for (let x = box.x0; x <= box.x1; x++) {
    for (let z = box.z0; z <= box.z1; z++) {
      const g = lv(x, z);
      const near = reserve(x, z);
      const k = hash(x, z, 1);
      let col = PAL.grass, slot = T.grass;
      if (!near && !built(x, z)) {
        const patch = hash(Math.floor((x + 1000) / 3), Math.floor((z + 1000) / 2), 2);
        if (patch < 0.18) { col = PAL.wheat; slot = T.wheat; } else if (patch < 0.3) { col = PAL.vines; slot = T.vines; } else if (patch < 0.36) { col = PAL.plough; slot = T.wheat; }
      } else if (near) col = PAL.meadow;
      // Higher ground a little lighter, as a map tints its heights: from
      // straight above, it is how one terrace is told from the next.
      const tint = (0.95 + k * 0.08) * (0.9 + model.level(x, z) * 0.05);
      m.flat(x, z, x + 1, z + 1, g, shade(col, tint), slot, 1);
      // Cut earth down to a lower neighbour, and the shadow the step throws onto it.
      for (let s = 0; s < 4; s++) {
        const [dx, dz] = SIDE_STEP[s];
        const go = lv(x + dx, z + dz);
        if (go >= g) continue;
        const e = [[x, z, x + 1, z], [x + 1, z, x + 1, z + 1], [x, z + 1, x + 1, z + 1], [x, z, x, z + 1]][s];
        m.quad([e[0], go, e[1]], [e[2], go, e[3]], [e[2], g, e[3]], [e[0], g, e[1]], [dx, 0, dz], PAL.earth, T.earth,
          [[0, go * 4], [2, go * 4], [2, g * 4], [0, g * 4]]);
        const t = 0.02;
        const strip = [[x, z, x + 1, z + t], [x + 1 - t, z, x + 1, z + 1], [x, z + 1 - t, x + 1, z + 1], [x, z, x + t, z + 1]][s];
        sh.push([...strip, g - go], go);
      }
      if (near || built(x, z) || (model.spring && x === model.spring.x && z === model.spring.y)) continue;
      // Trees, where the country is left alone.
      if (k > 0.78) {
        const n = 1 + Math.floor(hash(x, z, 4) * 3);
        for (let t = 0; t < n; t++) {
          const tx = x + 0.2 + hash(x, z, 10 + t) * 0.6, tz = z + 0.2 + hash(x, z, 20 + t) * 0.6;
          const kind = hash(x, z, 30 + t);
          if (kind < 0.5) {
            m.cone(tx, tz, 0.07, g, 0.55 + kind * 0.3, PAL.cypress, T.leaf, 6);
            sh.push([tx - 0.07, tz - 0.07, tx + 0.07, tz + 0.07, 0.5], g);
          } else if (kind < 0.8) {
            m.box(tx - 0.018, g, tz - 0.018, tx + 0.018, g + 0.32, tz + 0.018, { side: PAL.trunk, slot: T.wood });
            m.prism(tx, tz, 0.17, g + 0.3, g + 0.38, { side: PAL.pine, top: shade(PAL.pine, 1.15), slot: T.leaf, n: 7 });
            sh.push([tx - 0.17, tz - 0.17, tx + 0.17, tz + 0.17, 0.38], g);
          } else {
            m.box(tx - 0.02, g, tz - 0.02, tx + 0.02, g + 0.1, tz + 0.02, { side: PAL.trunk, slot: T.wood });
            m.dome(tx, tz, 0.12, g + 0.08, PAL.olive, { n: 6, rings: 2, k: 0.9 });
            sh.push([tx - 0.12, tz - 0.12, tx + 0.12, tz + 0.12, 0.2], g);
          }
        }
      }
    }
  }
}

/**
 * Shadows, as the N64 did them: flat and dark, no light worked out. Each
 * thing that stands casts its footprint, slid away from the sun by its
 * height, onto the ground it stands on. Drawn with the depth test on, all
 * at one height, so where two overlap the second is refused and the shadow
 * never doubles.
 */
function buildShadows(list, light) {
  const m = new Mesh();
  const kx = -light[0] / light[1], kz = -light[2] / light[1];
  for (let i = 0; i < list.length; i += 2) {
    const [x0, z0, x1, z1, h, aloft] = list[i], g = list[i + 1];
    const dx = kx * h, dz = kz * h, y = g + SHADOW_Y;
    m.flat(x0 + dx, z0 + dz, x1 + dx, z1 + dz, y, PAL.black, T.flat);
    // Something up on piers (the aqueduct's channel) throws only its own
    // shape; anything standing on the ground, its footprint swept from its
    // foot to its top's shadow: the hull, as three quads.
    if (aloft) continue;
    const xe = dx > 0 ? x1 : x0, ze = dz > 0 ? z1 : z0;
    m.quad([xe, y, z0], [xe + dx, y, z0 + dz], [xe + dx, y, z1 + dz], [xe, y, z1], [0, 1, 0], PAL.black, T.flat, [[0, 0], [1, 0], [1, 1], [0, 1]]);
    m.quad([x0, y, ze], [x0 + dx, y, ze + dz], [x1 + dx, y, ze + dz], [x1, y, ze], [0, 1, 0], PAL.black, T.flat, [[0, 0], [1, 0], [1, 1], [0, 1]]);
  }
  return m;
}

/** The sun for a view: up, and toward the upper left of the screen (a little toward you in isometric). */
export function lightFor(view) {
  // Looking down steeply, the sun is up and to the upper left; tilted
  // toward the side, it comes a little toward you, to light the faces seen.
  const [ru, rv] = view.tilt < 75 ? [-0.72, 0.38] : [-0.55, -0.5];
  const x = ru * view.c + rv * view.s, z = -ru * view.s + rv * view.c;
  return norm([x, 1.05, z]);
}

/**
 * Everything that stands, as meshes: the land, the city, the aqueduct and
 * the wall, and their shadows. `shown` is each house square's height in
 * storeys as drawn this frame (it eases toward its worth), `raised` the
 * squares a hold is lifting.
 */
export function buildScene(model, { view, box, reserve, shown = null, raised = null }) {
  const m = new Mesh(), sh = [];
  const built = new Set(model.cells.map((c) => keyOf(c.x, c.y)));
  const isBuilt = (x, y) => built.has(keyOf(x, y));
  buildLand(m, sh, model, box, isBuilt, reserve);
  const tops = new Map();
  for (const c of model.cells) {
    const g = model.level(c.x, c.y) * LEVEL + (raised?.get(keyOf(c.x, c.y)) || 0);
    const worth = shown?.get(keyOf(c.x, c.y)) ?? c.worth;
    const before = m.count;
    buildCell(m, sh, c, g, worth);
    let top = g;
    for (let i = before * STRIDE + 1; i < m.a.length; i += STRIDE) top = Math.max(top, m.a[i]);
    tops.set(keyOf(c.x, c.y), Math.min(top, g + 0.75));
  }
  if (model.spring) buildSpring(m, model.spring, model.level(model.spring.x, model.spring.y) * LEVEL);
  for (const s of model.spans) {
    const ground = model.level(s.x, s.y) * LEVEL;
    const deck = (model.deck ? model.deck(s.x, s.y) * LEVEL : 0) + DECK + (raised?.get(keyOf(s.x, s.y)) || 0);
    buildSpan(m, sh, s, ground, deck);
    tops.set(keyOf(s.x, s.y), Math.max(tops.get(keyOf(s.x, s.y)) || 0, deck));
  }
  buildWall(m, sh, model, isBuilt);
  return { mesh: m, shadows: buildShadows(sh, lightFor(view)), tops };
}

/** A staged piece's model: its squares or its spans, ready to float over the table. */
export function buildGhost(ghost, model) {
  const m = new Mesh(), sh = [];
  for (const c of ghost.cells) buildCell(m, sh, c, model.level(c.x, c.y) * LEVEL, c.worth);
  for (const s of ghost.spans) {
    const deck = (model.deck ? model.deck(s.x, s.y) * LEVEL : 0) + DECK;
    buildSpan(m, sh, s, model.level(s.x, s.y) * LEVEL, deck);
  }
  return m;
}

/**
 * A piece in hand as a model of its own, for its card: its squares, each
 * `{dx, dy, type, rot}` (turnPiece's), at worth 1 (a house of one storey),
 * joined to their piece-mates.
 */
export function pieceModel(cells) {
  const own = new Set(cells.map((c) => keyOf(c.dx, c.dy)));
  const out = { cells: [], spans: [], fits: true };
  for (const c of cells) {
    const type = TILES[c.type];
    if (type.above) { out.spans.push({ x: c.dx, y: c.dy, span: turnMask(maskOf(type.span), c.rot), run: false }); continue; }
    let joined = 0;
    for (let s = 0; s < 4; s++) if (own.has(keyOf(c.dx + SIDE_STEP[s][0], c.dy + SIDE_STEP[s][1]))) joined |= 1 << s;
    out.cells.push({ x: c.dx, y: c.dy, kind: type.place, streets: streetsOf(type, c.rot), joined, worth: 1, wet: false, piece: -1 });
  }
  return out;
}

// --- the GL side ------------------------------------------------------------------------

const VS = `
attribute vec3 aPos; attribute vec3 aNorm; attribute vec3 aCol; attribute vec3 aUV;
uniform vec3 uCam; uniform vec4 uRot; uniform vec2 uView; uniform float uDepth;
uniform vec3 uLight; uniform float uAmb; uniform vec3 uLift; uniform vec3 uFogAt;
varying vec3 vCol; varying vec3 vUV; varying float vFog;
void main() {
  vec3 p = aPos + vec3(0.0, uLift.x, 0.0);
  float u = (p.x - uCam.x) * uCam.z, v = (p.z - uCam.y) * uCam.z;
  float ru = u * uRot.x - v * uRot.y, rv = u * uRot.y + v * uRot.x;
  float X = ru, Y = rv * uRot.w - p.y * uCam.z * uRot.z;
  float Z = rv * uRot.z + p.y * uCam.z * uRot.w;
  gl_Position = vec4(X / (uView.x * 0.5), -Y / (uView.y * 0.5), -Z / uDepth, 1.0);
  float d = max(dot(aNorm, uLight), 0.0);
  vCol = aCol * (uAmb + (1.0 - uAmb) * d);
  vUV = aUV;
  float r = length(p.xz - uFogAt.xy);
  vFog = smoothstep(uFogAt.z, uFogAt.z * 1.9 + 4.0, r);
}`;

const FS = `
precision mediump float;
uniform sampler2D uTex; uniform float uTime; uniform vec3 uFog; uniform float uAlpha; uniform vec3 uTint;
varying vec3 vCol; varying vec3 vUV; varying float vFog;
float b2(vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
float bayer(vec2 a) { return b2(0.5 * a) * 0.25 + b2(a); }
void main() {
  vec2 l = vUV.xy;
  float slot = vUV.z;
  if (abs(slot - 8.0) < 0.5) l += vec2(uTime * 0.05, uTime * 0.13);
  vec2 cell = vec2(mod(slot, 8.0), floor(slot / 8.0));
  vec2 uv = (cell + (0.5 + fract(l) * 31.0) / 32.0) / 8.0;
  vec3 c = texture2D(uTex, uv).rgb * vCol * uTint;
  c = mix(c, uFog, vFog);
  float d = bayer(gl_FragCoord.xy) - 0.5;
  c = floor(c * 31.0 + d + 0.5) / 31.0;
  gl_FragColor = vec4(c, uAlpha);
}`;

/** How many screen pixels a pixel of the model is: about 250 across the short side. */
export function pixelSize(w, h, dpr) {
  return Math.max(1, Math.round((dpr * Math.min(w, h)) / 250));
}

export class LowPoly {
  /** `alpha`: a canvas with a clear background (the cards'), not the fog's. */
  constructor(canvas, { alpha = false } = {}) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl', { antialias: false, alpha, depth: true, preserveDrawingBuffer: true, powerPreference: 'low-power' });
    this.gl = gl;
    if (!gl) return;
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    this.prog = p;
    this.loc = {};
    for (const a of ['aPos', 'aNorm', 'aCol', 'aUV']) this.loc[a] = gl.getAttribLocation(p, a);
    for (const u of ['uCam', 'uRot', 'uView', 'uDepth', 'uLight', 'uAmb', 'uLift', 'uFogAt', 'uTex', 'uTime', 'uFog', 'uAlpha', 'uTint']) this.loc[u] = gl.getUniformLocation(p, u);
    this.tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, paintAtlas());
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.buffers = {};
    this.sceneKey = null;
    this.ghostKey = null;
    this.shown = new Map();     // each house square's storeys as drawn, easing toward its worth
    this.tops = new Map();
    this.t0 = performance.now();
  }

  get ok() { return !!this.gl && !!this.prog; }

  /** Size the backing store: CSS size over the pixel size, so the model is drawn in big pixels. */
  resize(w, h, dpr) {
    const px = pixelSize(w, h, dpr);
    const bw = Math.max(1, Math.round((w * dpr) / px)), bh = Math.max(1, Math.round((h * dpr) / px));
    if (this.canvas.width !== bw || this.canvas.height !== bh) { this.canvas.width = bw; this.canvas.height = bh; }
    this.px = px;
  }

  upload(name, mesh) {
    const gl = this.gl;
    let b = this.buffers[name];
    if (!b) { b = this.buffers[name] = { buf: gl.createBuffer(), n: 0 }; }
    gl.bindBuffer(gl.ARRAY_BUFFER, b.buf);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.floats, gl.DYNAMIC_DRAW);
    b.n = mesh.count;
  }

  drawBuffer(name, { alpha = 1, tint = [1, 1, 1], lift = 0, depthWrite = true } = {}) {
    const gl = this.gl, b = this.buffers[name], L = this.loc;
    if (!b || !b.n) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, b.buf);
    const F = 4;
    gl.vertexAttribPointer(L.aPos, 3, gl.FLOAT, false, STRIDE * F, 0);
    gl.vertexAttribPointer(L.aNorm, 3, gl.FLOAT, false, STRIDE * F, 3 * F);
    gl.vertexAttribPointer(L.aCol, 3, gl.FLOAT, false, STRIDE * F, 6 * F);
    gl.vertexAttribPointer(L.aUV, 3, gl.FLOAT, false, STRIDE * F, 9 * F);
    for (const a of ['aPos', 'aNorm', 'aCol', 'aUV']) gl.enableVertexAttribArray(L[a]);
    gl.uniform1f(L.uAlpha, alpha);
    gl.uniform3fv(L.uTint, tint);
    gl.uniform3f(L.uLift, lift, 0, 0);
    gl.depthMask(depthWrite);
    gl.drawArrays(gl.TRIANGLES, 0, b.n);
  }

  /**
   * How tall each square stands where a tap could land on it: what a ray
   * from the screen is tested against, highest first.
   */
  topAt(x, y, level) {
    return Math.max(this.tops.get(keyOf(x, y)) ?? 0, level(x, y) * LEVEL);
  }

  /**
   * Draw the city. `r` is the renderer: its camera, size and view, the
   * staged piece's preview (`ghost`), and the hold in progress.
   */
  render(game, r, { ghost = null, sealing = null, lit = null, dim = false } = {}) {
    const gl = this.gl;
    if (!this.ok) return;
    const view = r.view, cam = r.cam;
    const model = modelOf(game);
    this.model = model;
    // The houses' heights ease toward their worth (0.45 s a storey).
    const now = performance.now();
    const dt = Math.min(0.1, (now - (this.lastT || now)) / 1000);
    this.lastT = now;
    let moving = false;
    const live = new Set();
    for (const c of model.cells) {
      if (c.kind !== 'house') continue;
      const k = keyOf(c.x, c.y);
      live.add(k);
      const was = this.shown.get(k);
      if (was == null) { this.shown.set(k, c.worth); continue; }
      if (Math.abs(was - c.worth) > 0.01) {
        moving = true;
        this.shown.set(k, was + Math.sign(c.worth - was) * Math.min(Math.abs(c.worth - was), dt * 2.2));
      } else if (was !== c.worth) this.shown.set(k, c.worth);
    }
    for (const k of [...this.shown.keys()]) if (!live.has(k)) this.shown.delete(k);
    // A hold to lift a piece raises it off the table as the hold goes on.
    let raised = null, liftKey = '';
    if (sealing?.kind === 'lift') {
      const t = Math.max(0, Math.min(1, (now - sealing.t0) / sealing.dur));
      raised = new Map(sealing.cells.map((c) => [keyOf(c.x, c.y), t * 0.22]));
      liftKey = `${t.toFixed(2)}`;
    }
    const ext = game.m.extent ? game.m.extent() : { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    const R = Math.max(14, Math.ceil(Math.max(ext.maxX - ext.minX, ext.maxY - ext.minY) * 1.2) + 10);
    const mx = Math.round((ext.minX + ext.maxX) / 2), mz = Math.round((ext.minY + ext.maxY) / 2);
    const box = { x0: mx - R, x1: mx + R, z0: mz - R, z1: mz + R };
    const side = game.m.side || 7;
    const half = Math.ceil(side / 2) + 1;
    // The country kept clear of trees: round the plan's square, two squares
    // round anything built, one round the aqueduct and the spring.
    const clear = new Set();
    const grow = (x, y, d) => { for (let i = -d; i <= d; i++) for (let j = -d; j <= d; j++) clear.add(keyOf(x + i, y + j)); };
    for (const c of model.cells) grow(c.x, c.y, 2);
    for (const s of model.spans) grow(s.x, s.y, 1);
    if (model.spring) grow(model.spring.x, model.spring.y, 1);
    const reserve = (x, y) => (Math.abs(x) <= half && Math.abs(y) <= half) || clear.has(keyOf(x, y));
    const key = `${game.m.version}|${view.sig}|${box.x0},${box.z0},${box.x1}|${liftKey}|${moving ? now : ''}|${game.m.showingPlan ? 'plan' : ''}`;
    if (key !== this.sceneKey) {
      this.sceneKey = key;
      const s = buildScene(model, { view, box, reserve, shown: this.shown, raised });
      this.upload('scene', s.mesh);
      this.upload('shadow', s.shadows);
      this.tops = s.tops;
    }
    const gk = ghost ? `${ghost.key}|${game.m.version}` : '';
    if (gk !== this.ghostKey) {
      this.ghostKey = gk;
      this.upload('ghost', ghost ? buildGhost(ghost.model, model) : new Mesh());
    }

    const fr = Math.max(ext.maxX - ext.minX, ext.maxY - ext.minY, side) / 2 + 3;
    this.begin(view, cam, r.w, r.h, cam.zoom * (R * 2 + 12), [(ext.minX + ext.maxX + 1) / 2, (ext.minY + ext.maxY + 1) / 2, fr], FOG);
    this.drawBuffer('scene');
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthFunc(gl.LESS);
    this.drawBuffer('shadow', { alpha: 0.3 });
    // The squares the piece held up could go on: lamplight on the ground,
    // ringed, under anything that stands in front of them.
    const lk = lit ? [...lit].join(';') + `|${game.m.version}` : '';
    if (lk !== this.litKey) {
      this.litKey = lk;
      const m = new Mesh();
      for (const k of lit || []) {
        const [x, z] = k.split(',').map(Number);
        const g = model.level(x, z) * LEVEL + 0.012;
        m.flat(x + 0.06, z + 0.06, x + 0.94, z + 0.94, g, [1, 0.93, 0.78], T.flat);
      }
      this.upload('lit', m);
      const ring = new Mesh();
      for (const k of lit || []) {
        const [x, z] = k.split(',').map(Number);
        const g = model.level(x, z) * LEVEL + 0.014, e = 0.035;
        ring.flat(x + 0.04, z + 0.04, x + 0.96, z + 0.04 + e, g, [1, 0.97, 0.88], T.flat);
        ring.flat(x + 0.04, z + 0.96 - e, x + 0.96, z + 0.96, g, [1, 0.97, 0.88], T.flat);
        ring.flat(x + 0.04, z + 0.04 + e, x + 0.04 + e, z + 0.96 - e, g, [1, 0.97, 0.88], T.flat);
        ring.flat(x + 0.96 - e, z + 0.04 + e, x + 0.96, z + 0.96 - e, g, [1, 0.97, 0.88], T.flat);
      }
      this.upload('ring', ring);
    }
    if (lit) {
      const glow = 0.2 + Math.sin(now / 520) * 0.06;
      this.drawBuffer('lit', { alpha: dim ? glow * 0.6 : glow, depthWrite: false });
      this.drawBuffer('ring', { alpha: dim ? 0.45 : 0.8, depthWrite: false });
    }
    gl.depthFunc(gl.LEQUAL);
    if (ghost) {
      // Held over the table, bobbing a little; pressed down onto it as the seal sets.
      let lift = 0.16 + Math.sin(now / 380) * 0.025;
      if (sealing?.kind === 'seal') {
        const t = Math.max(0, Math.min(1, (now - sealing.t0) / sealing.dur));
        lift *= 1 - t;
      }
      this.drawBuffer('ghost', { alpha: ghost.model.fits ? 0.92 : 0.6, tint: ghost.model.fits ? [1.05, 1.03, 0.98] : [1.2, 0.55, 0.5], lift });
    }
    gl.depthMask(true);
  }

  /** Clear, and set the camera, the sun and the fog (at `fogAt`, `[x, z, radius]`) for a frame. */
  begin(view, cam, w, h, depth, fogAt, clear) {
    const gl = this.gl, L = this.loc;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(clear[0], clear[1], clear[2], clear[3] ?? 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.BLEND);
    gl.useProgram(this.prog);
    gl.uniform3f(L.uCam, cam.x, cam.y, cam.zoom);
    gl.uniform4f(L.uRot, view.c, view.s, view.cp, view.sp);
    gl.uniform2f(L.uView, w, h);
    gl.uniform1f(L.uDepth, depth);
    gl.uniform3fv(L.uLight, lightFor(view));
    gl.uniform1f(L.uAmb, 0.5);
    gl.uniform3fv(L.uFog, FOG);
    gl.uniform3f(L.uFogAt, fogAt[0], fogAt[1], fogAt[2]);
    gl.uniform1f(L.uTime, (performance.now() - this.t0) / 1000);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.uniform1i(L.uTex, 0);
  }

  /**
   * A card's piece (pieceModel) drawn whole on a clear canvas `size` pixels
   * square in `view`, framed to fill it; the canvas is `size / px` across,
   * so its pixels are the board's. Returns the canvas.
   */
  renderPiece(model, view, size, px) {
    const n = Math.max(8, Math.round(size / px));
    if (this.canvas.width !== n || this.canvas.height !== n) { this.canvas.width = n; this.canvas.height = n; }
    const flat = { level: () => 0, deck: null };
    this.upload('piece', buildGhost(model, flat));
    const pts = [];
    for (const c of model.cells) for (const [a, b] of [[0, 0], [1, 0], [1, 1], [0, 1]]) pts.push([c.x + a, c.y + b, 0], [c.x + a, c.y + b, 0.42]);
    for (const s of model.spans) for (const [a, b] of [[0.2, 0.2], [0.8, 0.2], [0.8, 0.8], [0.2, 0.8]]) pts.push([s.x + a, s.y + b, 0], [s.x + a, s.y + b, DECK + 0.08]);
    const f = fitPoints(view, pts, size * 0.94, size * 0.94, 0);
    this.begin(view, { x: f.x, y: f.y, zoom: f.zoom }, size, size, f.zoom * 30, [0, 0, 1e4], [0, 0, 0, 0]);
    this.drawBuffer('piece');
    return this.canvas;
  }
}
