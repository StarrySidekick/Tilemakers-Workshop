// ---------------------------------------------------------------------------
// Starà's castle walls, seen from above.
//
// Timothy, 2026-11-18: "the perimeter of the square should be top down castle
// walls. they also end features for the sake of scoring and finishing." The
// rule is in board.js (`walled`); this is the picture of it.
//
// A curtain wall round the square: a stone wall-walk on the inside, a parapet
// of merlons along the outside, a round tower with a conical roof at each
// corner, two square turrets with pyramid roofs along each side (on the seams
// between squares, so they never sit where a road could meet the wall), and a
// gatehouse wherever a laid road runs into the wall, because that is where
// the road ends. And in the middle of each wall, a TOWN GATE (the third pass,
// 2026-11-18: "the middle top left right and bottom castle wall is a special
// gate"): a bigger gatehouse between two round towers, which raises its
// banners once a road runs out through it. The lamp is up and to the left, so every shadow falls down
// and to the right, the same way the tiles' do.
//
// Drawn with hand-drawn strokes (sketch.js) and then, being drawn once and
// kept, bent as a whole by ink.js the way the inked tiles are.
// ---------------------------------------------------------------------------

import { sketchLine, sketchRect, sketchCircle, seedOf } from './sketch.js';
import { roughen } from './ink.js';
import { gateRoads } from './modes/stara.js';

/**
 * In tiles: how thick the wall is, and how far past the square the whole
 * castle reaches (the corner towers, and their shadows). The screen is fitted
 * to the reach, so the towers touch its edges and nothing is cut off.
 */
export const CASTLE = { band: 0.34, reach: 0.5 };

const INK = '#3a2616';
const STONE = '#d9c39a';
const STONE_MID = '#a8916a';
const STONE_DARK = '#6f5c3e';
const WALK = '#e2cfa8';
const ROOF = '#a9563a';
const ROOF_LIT = '#cd7a55';
const ROOF_DARK = '#76351f';
const ROAD = '#d1bb8f';

/**
 * Where laid roads meet the wall: one small gate per road edge that faces
 * out of the square away from the middle, as {s, i}: the wall's side (0 N,
 * 1 E, 2 S, 3 W) and which square along it, from the top or the left. And
 * `towns`, for the four town gates in the middle: whether a road runs out
 * through each.
 */
export function gatesOf(board) {
  const gates = [];
  const b = board.bounds;
  if (!board.walled || !b) return { gates, towns: [false, false, false, false] };
  const mid = (b.maxX - b.minX) / 2;
  for (const cell of board.cells.values()) {
    for (const s of board.wallSidesAt(cell.x, cell.y)) {
      if (board.edgeAt(cell, s) !== 'r') continue;
      const i = s % 2 === 0 ? cell.x - b.minX : cell.y - b.minY;
      if (i !== mid) gates.push({ s, i });
    }
  }
  gates.sort((p, q) => p.s - q.s || p.i - q.i);
  return { gates, towns: gateRoads(board).map(Boolean) };
}

/**
 * Paint the castle round a square whose top-left corner is (x0, y0), `cols`
 * by `rows` squares of `z` pixels, with gates where `gates` says.
 */
export function paintCastle(ctx, { z, x0, y0, cols, rows, gates = [], towns = [false, false, false, false], quarters = null }) {
  const T = CASTLE.band * z;
  const w = cols * z, h = rows * z;
  const lw = Math.max(1.1, z * 0.03);

  // The four quarters' bounds, ruled in their tinctures OVER the tiles (the
  // castle layer is drawn above them), so the quarters still read once the
  // floor's wash is covered: {NW: color, ...}, the high street left between.
  if (quarters) {
    const mc = Math.floor(cols / 2), mr = Math.floor(rows / 2);
    const rects = {
      NW: [x0, y0, mc * z, mr * z], NE: [x0 + (mc + 1) * z, y0, (cols - mc - 1) * z, mr * z],
      SE: [x0 + (mc + 1) * z, y0 + (mr + 1) * z, (cols - mc - 1) * z, (rows - mr - 1) * z],
      SW: [x0, y0 + (mr + 1) * z, mc * z, (rows - mr - 1) * z],
    };
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const [q, [qx, qy, qw, qh]] of Object.entries(rects)) {
      if (!quarters[q]) continue;
      ctx.strokeStyle = quarters[q];
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = Math.max(1.6, z * 0.045);
      ctx.beginPath();
      const i = Math.max(1.5, z * 0.035);
      sketchRect(ctx, qx + i, qy + i, qw - 2 * i, qh - 2 * i, { seed: seedOf(qx, qy, 13), rough: 1.1 });
      ctx.stroke();
    }
    ctx.restore();
  }

  // A point on side s: `a` along it from its top or left end, `d` out from
  // the square's edge. The wall's frame, so every side is drawn the same way.
  const at = (s, a, d) => {
    if (s === 0) return [x0 + a, y0 - d];
    if (s === 1) return [x0 + w + d, y0 + a];
    if (s === 2) return [x0 + a, y0 + h + d];
    return [x0 - d, y0 + a];
  };
  const length = (s) => (s % 2 === 0 ? w : h);
  /** A box on side s, from a0 to a1 along and d0 to d1 out, as a rect. */
  const box = (s, a0, a1, d0, d1) => {
    const [px, py] = at(s, a0, d0), [qx, qy] = at(s, a1, d1);
    return [Math.min(px, qx), Math.min(py, qy), Math.abs(qx - px), Math.abs(qy - py)];
  };
  const ring = (inset0, inset1) => {
    ctx.beginPath();
    ctx.rect(x0 - inset1, y0 - inset1, w + inset1 * 2, h + inset1 * 2);
    ctx.rect(x0 - inset0, y0 - inset0, w + inset0 * 2, h + inset0 * 2);
  };
  const ink = (alpha = 1, width = lw) => {
    ctx.strokeStyle = INK;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.globalAlpha = 1;
  };

  // What interrupts the run of merlons along a side: the gates and turrets.
  // Turrets on the seams one square in from the town gate on either side:
  // seams 2 and 5 on a 7 x 7, 1 and 4 on a 5 x 5.
  const seams = (n) => { const k = Math.floor(n / 2) - 1; return [k * z, (n - k) * z]; };
  const turretsAt = seams(cols);
  const turretsDown = seams(rows);
  const gateHalf = 0.27 * z, turretHalf = 0.21 * z, townHalf = 0.42 * z;
  const middle = (s) => (s % 2 === 0 ? cols : rows) * z / 2;
  const busy = (s, a) => (s % 2 === 0 ? turretsAt : turretsDown).some((t) => Math.abs(a - t) < turretHalf + 0.05 * z)
    || gates.some((g) => g.s === s && Math.abs(a - (g.i + 0.5) * z) < gateHalf + 0.05 * z)
    || Math.abs(a - middle(s)) < townHalf + 0.05 * z;

  // 1. The wall's shadow, on the tiles inside and the table outside.
  ctx.save();
  ctx.shadowColor = 'rgba(22,9,0,0.55)';
  ctx.shadowBlur = z * 0.16;
  ctx.shadowOffsetX = z * 0.05;
  ctx.shadowOffsetY = z * 0.08;
  ring(0, T);
  ctx.fillStyle = STONE_MID;
  ctx.fill('evenodd');
  ctx.restore();

  // 2. The parapet (outside) and the wall-walk (inside).
  ring(0, T);
  ctx.fillStyle = STONE_MID;
  ctx.fill('evenodd');
  ring(0, T * 0.56);
  ctx.fillStyle = WALK;
  ctx.fill('evenodd');

  // 3. Flagstones on the walk: a joint across it every so often, and a
  // running joint down its middle broken at each of them.
  ctx.beginPath();
  for (let s = 0; s < 4; s++) {
    const L = length(s);
    for (let a = 0.21 * z, k = 0; a < L; a += 0.23 * z, k++) {
      const [p, q] = [at(s, a, 0), at(s, a, T * 0.56)];
      sketchLine(ctx, p[0], p[1], q[0], q[1], { seed: seedOf(s, k, 1), rough: 0.5, passes: 1 });
      const mid = T * (k % 2 ? 0.2 : 0.36);
      const [m0, m1] = [at(s, a, mid), at(s, a + 0.23 * z, mid)];
      if (a + 0.23 * z < L) sketchLine(ctx, m0[0], m0[1], m1[0], m1[1], { seed: seedOf(s, k, 2), rough: 0.4, passes: 1 });
    }
  }
  ink(0.32, lw * 0.8);

  // 4. Merlons along the outside of the parapet, each casting a little shadow.
  const merlons = [];
  for (let s = 0; s < 4; s++) {
    const L = length(s);
    for (let a = 0.25 * z; a + 0.15 * z < L - 0.22 * z; a += 0.235 * z) {
      if (busy(s, a + 0.075 * z)) continue;
      merlons.push(box(s, a, a + 0.15 * z, T * 0.56, T + 0.015 * z));
    }
  }
  ctx.fillStyle = 'rgba(30,14,2,0.55)';
  for (const [x, y, bw, bh] of merlons) ctx.fillRect(x + z * 0.025, y + z * 0.04, bw, bh);
  ctx.fillStyle = STONE;
  for (const [x, y, bw, bh] of merlons) ctx.fillRect(x, y, bw, bh);
  ctx.beginPath();
  merlons.forEach(([x, y, bw, bh], k) => sketchRect(ctx, x, y, bw, bh, { seed: seedOf(x, y, k), rough: 0.45, passes: 1 }));
  ink(0.85, lw * 0.85);

  // 5. The wall's own lines: its outer face, the inner face, and the step up
  // from the walk to the parapet.
  ctx.beginPath();
  for (let s = 0; s < 4; s++) {
    const L = length(s);
    for (const [d, seed] of [[0, 11], [T, 12], [T * 0.56, 13]]) {
      const [p, q] = [at(s, -d, d), at(s, L + d, d)];
      sketchLine(ctx, p[0], p[1], q[0], q[1], { seed: seedOf(s, seed), rough: 0.9 });
    }
  }
  ink(0.95, lw * 1.1);

  // 6. Gatehouses, where a road ends at the wall.
  for (const g of gates) gate(ctx, at, box, g, z, T, lw, ink);
  for (let s = 0; s < 4; s++) townGate(ctx, at, box, s, middle(s), towns[s], z, T, lw, ink);

  // 7. Square turrets on the seams along each side.
  for (let s = 0; s < 4; s++) {
    for (const a of s % 2 === 0 ? turretsAt : turretsDown) {
      tower(ctx, box(s, a - turretHalf, a + turretHalf, -0.02 * z, T + 0.07 * z), z, lw, ink, seedOf(s, a));
    }
  }

  // 8. A round tower with a conical roof at every corner.
  const corners = [[x0 - T / 2, y0 - T / 2], [x0 + w + T / 2, y0 - T / 2],
    [x0 + w + T / 2, y0 + h + T / 2], [x0 - T / 2, y0 + h + T / 2]];
  corners.forEach(([cx, cy], k) => roundTower(ctx, cx, cy, z, lw, ink, seedOf(cx, cy, k)));
}

/** A square turret, seen from above: a crenellated rim and a pyramid roof. */
function tower(ctx, [x, y, bw, bh], z, lw, ink, seed) {
  ctx.save();
  ctx.shadowColor = 'rgba(22,9,0,0.5)';
  ctx.shadowBlur = z * 0.1;
  ctx.shadowOffsetX = z * 0.04;
  ctx.shadowOffsetY = z * 0.07;
  ctx.fillStyle = STONE;
  ctx.fillRect(x, y, bw, bh);
  ctx.restore();
  // Crenels: dark notches round the rim.
  const notch = z * 0.045;
  ctx.fillStyle = STONE_DARK;
  for (const f of [0.3, 0.7]) {
    ctx.fillRect(x + bw * f - notch / 2, y, notch, notch * 0.9);
    ctx.fillRect(x + bw * f - notch / 2, y + bh - notch * 0.9, notch, notch * 0.9);
    ctx.fillRect(x, y + bh * f - notch / 2, notch * 0.9, notch);
    ctx.fillRect(x + bw - notch * 0.9, y + bh * f - notch / 2, notch * 0.9, notch);
  }
  // The pyramid roof: lit on the lamp's two sides, dark on the other two.
  const i = Math.min(bw, bh) * 0.17;
  const rx = x + i, ry = y + i, rw = bw - i * 2, rh = bh - i * 2;
  const cx = rx + rw / 2, cy = ry + rh / 2;
  const tri = (ax, ay, bx2, by2, fill) => {
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx2, by2); ctx.lineTo(cx, cy); ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
  };
  tri(rx, ry, rx + rw, ry, ROOF_LIT);
  tri(rx, ry, rx, ry + rh, ROOF);
  tri(rx + rw, ry, rx + rw, ry + rh, ROOF);
  tri(rx, ry + rh, rx + rw, ry + rh, ROOF_DARK);
  ctx.beginPath();
  sketchRect(ctx, x, y, bw, bh, { seed, rough: 0.6 });
  sketchRect(ctx, rx, ry, rw, rh, { seed: seed + 9, rough: 0.5, passes: 1 });
  sketchLine(ctx, rx, ry, rx + rw, ry + rh, { seed: seed + 17, rough: 0.4, passes: 1 });
  sketchLine(ctx, rx + rw, ry, rx, ry + rh, { seed: seed + 23, rough: 0.4, passes: 1 });
  ink(0.95, lw);
}

/** A round corner tower: a crenellated ring and a conical roof of tiles. */
function roundTower(ctx, cx, cy, z, lw, ink, seed) {
  const R = 0.32 * z, roof = 0.23 * z;
  ctx.save();
  ctx.shadowColor = 'rgba(22,9,0,0.55)';
  ctx.shadowBlur = z * 0.14;
  ctx.shadowOffsetX = z * 0.05;
  ctx.shadowOffsetY = z * 0.09;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fillStyle = STONE;
  ctx.fill();
  ctx.restore();
  // Crenels round the rim.
  ctx.fillStyle = STONE_DARK;
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    ctx.save();
    ctx.translate(cx + Math.cos(a) * (R - z * 0.025), cy + Math.sin(a) * (R - z * 0.025));
    ctx.rotate(a);
    ctx.fillRect(-z * 0.025, -z * 0.022, z * 0.05, z * 0.044);
    ctx.restore();
  }
  // The roof: a cone of tiles lit from the upper left, its courses and its
  // rafters ruled by hand, and a finial at the point.
  const lit = ctx.createRadialGradient(cx - roof * 0.45, cy - roof * 0.5, roof * 0.1, cx, cy, roof * 1.05);
  lit.addColorStop(0, ROOF_LIT);
  lit.addColorStop(0.55, ROOF);
  lit.addColorStop(1, ROOF_DARK);
  ctx.beginPath();
  ctx.arc(cx, cy, roof, 0, Math.PI * 2);
  ctx.fillStyle = lit;
  ctx.fill();
  ctx.beginPath();
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2 + 0.2;
    sketchLine(ctx, cx + Math.cos(a) * roof * 0.12, cy + Math.sin(a) * roof * 0.12,
      cx + Math.cos(a) * roof * 0.97, cy + Math.sin(a) * roof * 0.97, { seed: seed + k, rough: 0.35, passes: 1 });
  }
  ink(0.5, lw * 0.7);
  ctx.beginPath();
  sketchCircle(ctx, cx, cy, roof * 0.55, { seed: seed + 31, rough: 0.6, passes: 1 });
  ink(0.4, lw * 0.7);
  ctx.beginPath();
  sketchCircle(ctx, cx, cy, R, { seed: seed + 41, rough: 0.7 });
  sketchCircle(ctx, cx, cy, roof, { seed: seed + 43, rough: 0.6 });
  ink(0.95, lw);
  ctx.beginPath();
  ctx.arc(cx, cy, z * 0.03, 0, Math.PI * 2);
  ctx.fillStyle = '#d9a640';
  ctx.fill();
  ink(0.9, lw * 0.7);
}

/**
 * A TOWN GATE in the middle of a wall: a broad gatehouse between two round
 * towers, its passage open to the road, and on each tower a banner that is
 * raised (gules, swallow-tailed) once a road runs out through it. A gate no
 * road has reached yet stands shut, its passage dark.
 */
function townGate(ctx, at, box, s, mid, open, z, T, lw, ink) {
  const half = 0.42 * z, pass = 0.1 * z;
  const [gx, gy, gw, gh] = box(s, mid - half * 0.62, mid + half * 0.62, -0.01 * z, T + 0.1 * z);
  ctx.save();
  ctx.shadowColor = 'rgba(22,9,0,0.5)';
  ctx.shadowBlur = z * 0.12;
  ctx.shadowOffsetX = z * 0.05;
  ctx.shadowOffsetY = z * 0.08;
  ctx.fillStyle = STONE;
  ctx.fillRect(gx, gy, gw, gh);
  ctx.restore();
  // The passage: open, the road's colour; shut, the timber of the doors.
  const [px, py, pw, ph] = box(s, mid - pass, mid + pass, -0.01 * z, T + 0.1 * z);
  ctx.fillStyle = open ? ROAD : '#5a3a1c';
  ctx.fillRect(px, py, pw, ph);
  ctx.beginPath();
  if (open) {
    for (const f of [0.7, 0.88, 1.06]) {
      const [a0, a1] = [at(s, mid - pass, T * f), at(s, mid + pass, T * f)];
      sketchLine(ctx, a0[0], a0[1], a1[0], a1[1], { seed: seedOf(s, f, 21), rough: 0.3, passes: 1 });
    }
  } else {
    // The doors' planks, and the seam where they meet.
    for (const f of [-0.5, 0, 0.5]) {
      const [a0, a1] = [at(s, mid + pass * f, 0), at(s, mid + pass * f, T + 0.1 * z)];
      sketchLine(ctx, a0[0], a0[1], a1[0], a1[1], { seed: seedOf(s, f, 22), rough: 0.3, passes: 1 });
    }
  }
  ink(0.8, lw * 0.75);
  ctx.beginPath();
  sketchRect(ctx, gx, gy, gw, gh, { seed: seedOf(s, 31), rough: 0.6 });
  sketchRect(ctx, px, py, pw, ph, { seed: seedOf(s, 32), rough: 0.5, passes: 1 });
  ink(0.95, lw);
  // The two round towers, and their banners.
  for (const side of [-1, 1]) {
    const [cx, cy] = at(s, mid + side * half * 0.66, T * 0.58);
    const R = 0.17 * z;
    ctx.save();
    ctx.shadowColor = 'rgba(22,9,0,0.5)';
    ctx.shadowBlur = z * 0.1;
    ctx.shadowOffsetX = z * 0.04;
    ctx.shadowOffsetY = z * 0.07;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = STONE;
    ctx.fill();
    ctx.restore();
    const roof = R * 0.72;
    const lit = ctx.createRadialGradient(cx - roof * 0.45, cy - roof * 0.5, roof * 0.1, cx, cy, roof * 1.05);
    lit.addColorStop(0, ROOF_LIT);
    lit.addColorStop(0.55, ROOF);
    lit.addColorStop(1, ROOF_DARK);
    ctx.beginPath();
    ctx.arc(cx, cy, roof, 0, Math.PI * 2);
    ctx.fillStyle = lit;
    ctx.fill();
    ctx.beginPath();
    sketchCircle(ctx, cx, cy, R, { seed: seedOf(s, side, 41), rough: 0.6 });
    sketchCircle(ctx, cx, cy, roof, { seed: seedOf(s, side, 42), rough: 0.5, passes: 1 });
    ink(0.95, lw * 0.9);
    if (open) banner(ctx, cx, cy, z, lw, ink, seedOf(s, side, 43));
  }
}

/** A swallow-tailed banner, gules, flying from a tower top, seen from above. */
function banner(ctx, cx, cy, z, lw, ink, seed) {
  const L = 0.34 * z, H = 0.12 * z;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.35);
  ctx.beginPath();
  ctx.moveTo(0, -H / 2);
  ctx.quadraticCurveTo(L * 0.5, -H * 0.8, L, -H / 2);
  ctx.lineTo(L * 0.78, 0);
  ctx.lineTo(L, H / 2);
  ctx.quadraticCurveTo(L * 0.5, H * 0.2, 0, H / 2);
  ctx.closePath();
  ctx.fillStyle = '#a32a1d';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw * 0.8;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, z * 0.025, 0, Math.PI * 2);
  ctx.fillStyle = '#d9a640';
  ctx.fill();
  ctx.restore();
}

/**
 * A gatehouse where a road runs into the wall: the road goes into an arched
 * passage under a portcullis, between two small towers. Where the road ends.
 */
function gate(ctx, at, box, g, z, T, lw, ink) {
  const mid = (g.i + 0.5) * z;
  const half = 0.27 * z, pass = 0.085 * z;
  const [gx, gy, gw, gh] = box(g.s, mid - half, mid + half, -0.01 * z, T + 0.06 * z);
  ctx.save();
  ctx.shadowColor = 'rgba(22,9,0,0.5)';
  ctx.shadowBlur = z * 0.1;
  ctx.shadowOffsetX = z * 0.04;
  ctx.shadowOffsetY = z * 0.07;
  ctx.fillStyle = STONE;
  ctx.fillRect(gx, gy, gw, gh);
  ctx.restore();
  // The passage: the road's own colour, dark at its mouth.
  const [px, py, pw, ph] = box(g.s, mid - pass, mid + pass, -0.01 * z, T + 0.06 * z);
  ctx.fillStyle = ROAD;
  ctx.fillRect(px, py, pw, ph);
  const [dx, dy, dw, dh] = box(g.s, mid - pass, mid + pass, T * 0.62, T + 0.06 * z);
  ctx.fillStyle = 'rgba(38,20,8,0.82)';
  ctx.fillRect(dx, dy, dw, dh);
  ctx.beginPath();
  // The portcullis across the mouth.
  for (const f of [0.68, 0.84, 1.0]) {
    const [a0, a1] = [at(g.s, mid - pass, T * f), at(g.s, mid + pass, T * f)];
    sketchLine(ctx, a0[0], a0[1], a1[0], a1[1], { seed: seedOf(g.s, g.i, f), rough: 0.3, passes: 1 });
  }
  for (const f of [-0.5, 0, 0.5]) {
    const [a0, a1] = [at(g.s, mid + pass * f, T * 0.62), at(g.s, mid + pass * f, T + 0.06 * z)];
    sketchLine(ctx, a0[0], a0[1], a1[0], a1[1], { seed: seedOf(g.s, g.i, f, 3), rough: 0.3, passes: 1 });
  }
  ink(0.75, lw * 0.75);
  ctx.beginPath();
  sketchRect(ctx, gx, gy, gw, gh, { seed: seedOf(g.s, g.i, 7), rough: 0.6 });
  sketchRect(ctx, px, py, pw, ph, { seed: seedOf(g.s, g.i, 8), rough: 0.5, passes: 1 });
  ink(0.95, lw);
  // Two little towers either side, roofed.
  for (const side of [-1, 1]) {
    const a = mid + side * (pass + (half - pass) / 2);
    tower(ctx, box(g.s, a - (half - pass) / 2 + 0.01 * z, a + (half - pass) / 2 - 0.01 * z, T * 0.3, T + 0.1 * z),
      z, lw * 0.85, ink, seedOf(g.s, g.i, side));
  }
}

// ---------------------------------------------------------------------------
// THE KEEP (the fourth pass): a citadel on one tile, seen from above. Its own
// curtain wall on all four edges (it ends whatever runs into it), a round
// turret at each corner, a courtyard, and the donjon in the middle under a
// pyramid roof with a banner on it. Drawn once per size, in the same hand as
// the town wall, and inked by ink.js.
// ---------------------------------------------------------------------------

const keepSprites = new Map();

/** The keep at `px` pixels square, cached. */
export function keepSprite(px) {
  px = Math.max(16, Math.round(px));
  const had = keepSprites.get(px);
  if (had) return had;
  const c = document.createElement('canvas');
  c.width = c.height = px;
  const k = c.getContext('2d', { willReadFrequently: true });
  paintKeep(k, px);
  roughen(c, { amp: Math.max(0.5, px * 0.011), grain: 0.32 });
  roughen(c, { amp: Math.max(0.3, px * 0.004), grain: 0.06 });
  keepSprites.set(px, c);
  if (keepSprites.size > 8) keepSprites.delete(keepSprites.keys().next().value);
  return c;
}

function paintKeep(ctx, u) {
  const lw = Math.max(1, u * 0.022);
  const ink = (alpha = 1, width = lw) => {
    ctx.strokeStyle = INK;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.globalAlpha = 1;
  };
  const T = 0.14 * u;
  // The courtyard: beaten earth, flagged.
  ctx.fillStyle = '#cfb489';
  ctx.fillRect(0, 0, u, u);
  ctx.beginPath();
  for (let i = 1; i < 6; i++) {
    const v = T + (u - 2 * T) * (i / 6);
    sketchLine(ctx, T, v, u - T, v, { seed: seedOf(i, 71), rough: 0.5, passes: 1 });
  }
  ink(0.18, lw * 0.7);

  // The keep's own curtain wall, round all four edges: a walk and a parapet.
  ctx.fillStyle = STONE_MID;
  ctx.beginPath();
  ctx.rect(0, 0, u, u);
  ctx.rect(T, T, u - 2 * T, u - 2 * T);
  ctx.fill('evenodd');
  ctx.fillStyle = WALK;
  ctx.beginPath();
  ctx.rect(T * 0.45, T * 0.45, u - T * 0.9, u - T * 0.9);
  ctx.rect(T, T, u - 2 * T, u - 2 * T);
  ctx.fill('evenodd');
  // Merlons along the outside.
  ctx.fillStyle = STONE;
  const m = T * 0.42, step = u / 7;
  for (let i = 1; i < 7; i++) {
    const a = i * step - m * 0.6;
    ctx.fillRect(a, 0, m * 1.2, m);
    ctx.fillRect(a, u - m, m * 1.2, m);
    ctx.fillRect(0, a, m, m * 1.2);
    ctx.fillRect(u - m, a, m, m * 1.2);
  }
  ctx.beginPath();
  sketchRect(ctx, 1, 1, u - 2, u - 2, { seed: 81, rough: 0.6 });
  sketchRect(ctx, T, T, u - 2 * T, u - 2 * T, { seed: 82, rough: 0.6 });
  ink(0.95);

  // A round turret at each corner, and the donjon in the middle.
  for (const [cx, cy] of [[T * 0.9, T * 0.9], [u - T * 0.9, T * 0.9], [u - T * 0.9, u - T * 0.9], [T * 0.9, u - T * 0.9]]) {
    roundTower(ctx, cx, cy, u * 0.36, lw * 0.85, ink, seedOf(cx, cy, 91));
  }
  const d = 0.44 * u;
  tower(ctx, [(u - d) / 2, (u - d) / 2, d, d], u * 0.9, lw, ink, 97);
  banner(ctx, u / 2, u / 2, u * 0.75, lw, ink, 99);
}
