// ---------------------------------------------------------------------------
// Starà's town wall, seen from above.
//
// Timothy, 2026-11-18: "the perimeter of the square should be top down castle
// walls. they also end features for the sake of scoring and finishing." Then,
// on 2026-11-27 (the seventh pass): "having the border on the outside is kind
// of restricting ... the bigger the castle walls get, the less points you
// get". So there is no square any more: the wall runs round whatever is
// built (`wallOf` in modes/stara-city.js has the rule), one STRETCH to every
// side of a square that faces open ground, and this draws it.
//
// A curtain wall along every stretch, standing just outside the square's
// edge: a stone wall-walk on the inside, a parapet of merlons along the
// outside. A round tower with a conical roof at every corner where the wall
// turns outward. A gatehouse wherever a street runs out through the wall,
// and on the high road's gates (the street out on the most sides) the
// bigger town gate between two round towers, its banners raised. The lamp
// is up and to the left, so every shadow falls down and to the right, the
// same way the tiles' do.
//
// Drawn with hand-drawn strokes (sketch.js) and then, being drawn once and
// kept until the wall changes, bent as a whole by ink.js the way the inked
// tiles are.
// ---------------------------------------------------------------------------

import { sketchLine, sketchRect, sketchCircle, seedOf } from './sketch.js';

/**
 * In tiles: how thick the wall is, and how far past the squares the whole
 * of it reaches (the corner towers, and their shadows).
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

const STEP = [[0, -1], [1, 0], [0, 1], [-1, 0]];

/**
 * Paint the wall round a city: `wall` is its stretches, `{x, y, s, gate}`
 * (a square and the side of it that faces open ground), `built(x, y)` says
 * whether a square is built, `high` is the set of `x,y,s` stretches that
 * are the high road's gates. Square (x, y) has its top left at
 * (ox + x z, oy + y z) in pixels.
 */
export function paintCityWall(ctx, { z, ox, oy, wall, built, high = new Set() }) {
  const T = CASTLE.band * z;
  const lw = Math.max(1.1, z * 0.03);
  const ink = (alpha = 1, width = lw) => {
    ctx.strokeStyle = INK;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.globalAlpha = 1;
  };
  const has = new Set(wall.map((w) => `${w.x},${w.y},${w.s}`));
  /** A stretch's own frame: `a` along it from its top or left end, `d` out from the square's edge. */
  const frame = (w) => {
    const X = ox + w.x * z, Y = oy + w.y * z;
    const at = (s, a, d) => {
      if (s === 0) return [X + a, Y - d];
      if (s === 1) return [X + z + d, Y + a];
      if (s === 2) return [X + a, Y + z + d];
      return [X - d, Y + a];
    };
    const box = (s, a0, a1, d0, d1) => {
      const [px, py] = at(s, a0, d0), [qx, qy] = at(s, a1, d1);
      return [Math.min(px, qx), Math.min(py, qy), Math.abs(qx - px), Math.abs(qy - py)];
    };
    return { at, box };
  };
  /**
   * How each end of a stretch meets the rest of the wall: 'out' where the
   * wall turns outward round the square's corner (a tower), 'in' where it
   * turns in round a square built across the corner, 'on' where it runs
   * straight on. End 0 is the top or left end, 1 the other.
   */
  const ends = (w) => [0, 1].map((e) => {
    // The side the end turns toward: for a north stretch, west at its left end, east at its right.
    const turn = w.s % 2 === 0 ? (e ? 1 : 3) : (e ? 2 : 0);
    if (has.has(`${w.x},${w.y},${turn}`)) return 'out';
    const nx = w.x + STEP[turn][0], ny = w.y + STEP[turn][1];
    if (built(nx + STEP[w.s][0], ny + STEP[w.s][1])) return 'in';
    return 'on';
  });

  // 1. The wall's body: every stretch's band, and a square at every outward
  // corner, its shadow first.
  const body = new Path2D();
  for (const w of wall) {
    const { box } = frame(w);
    const [x, y, bw, bh] = box(w.s, 0, z, 0, T);
    body.rect(x, y, bw, bh);
    const e = ends(w);
    for (const k of [0, 1]) {
      if (e[k] !== 'out') continue;
      const [cx, cy, cw, ch] = box(w.s, k ? z : -T, k ? z + T : 0, 0, T);
      body.rect(cx, cy, cw, ch);
    }
  }
  ctx.save();
  ctx.shadowColor = 'rgba(22,9,0,0.55)';
  ctx.shadowBlur = z * 0.16;
  ctx.shadowOffsetX = z * 0.05;
  ctx.shadowOffsetY = z * 0.08;
  ctx.fillStyle = STONE_MID;
  ctx.fill(body, 'nonzero');
  ctx.restore();
  ctx.fillStyle = STONE_MID;
  ctx.fill(body, 'nonzero');

  // 2. The wall-walk on the inside of each stretch.
  ctx.fillStyle = WALK;
  for (const w of wall) {
    const { box } = frame(w);
    const e = ends(w);
    const a0 = e[0] === 'in' ? T * 0.56 : 0, a1 = e[1] === 'in' ? z - T * 0.56 : z;
    const [x, y, bw, bh] = box(w.s, a0, a1, 0, T * 0.56);
    ctx.fillRect(x, y, bw, bh);
  }

  // 3. Flagstones on the walk, and merlons along the outside, each casting a
  // little shadow; none across a gate.
  ctx.beginPath();
  const merlons = [];
  for (const w of wall) {
    const { at, box } = frame(w);
    for (let a = 0.12 * z, k = 0; a < z; a += 0.23 * z, k++) {
      const [p, q] = [at(w.s, a, 0), at(w.s, a, T * 0.56)];
      sketchLine(ctx, p[0], p[1], q[0], q[1], { seed: seedOf(w.x, w.y, w.s, k), rough: 0.5, passes: 1 });
    }
    for (let a = 0.06 * z; a + 0.15 * z <= z; a += 0.235 * z) {
      if (w.gate && Math.abs(a + 0.075 * z - z / 2) < 0.36 * z) continue;
      merlons.push(box(w.s, a, a + 0.15 * z, T * 0.56, T + 0.015 * z));
    }
  }
  ink(0.32, lw * 0.8);
  ctx.fillStyle = 'rgba(30,14,2,0.55)';
  for (const [x, y, bw, bh] of merlons) ctx.fillRect(x + z * 0.025, y + z * 0.04, bw, bh);
  ctx.fillStyle = STONE;
  for (const [x, y, bw, bh] of merlons) ctx.fillRect(x, y, bw, bh);
  ctx.beginPath();
  merlons.forEach(([x, y, bw, bh], k) => sketchRect(ctx, x, y, bw, bh, { seed: seedOf(x, y, k), rough: 0.45, passes: 1 }));
  ink(0.85, lw * 0.85);

  // 4. The wall's own lines: its outer face, and the step up from the walk
  // to the parapet, run on round an outward corner and stopped short of an
  // inward one.
  ctx.beginPath();
  for (const w of wall) {
    const { at } = frame(w);
    const e = ends(w);
    for (const [d, seed] of [[T, 12], [T * 0.56, 13]]) {
      const a0 = e[0] === 'out' ? -d : e[0] === 'in' ? d : 0;
      const a1 = e[1] === 'out' ? z + d : e[1] === 'in' ? z - d : z;
      const [p, q] = [at(w.s, a0, d), at(w.s, a1, d)];
      sketchLine(ctx, p[0], p[1], q[0], q[1], { seed: seedOf(w.x, w.y, w.s, seed), rough: 0.9 });
    }
  }
  ink(0.95, lw * 1.1);

  // 5. Gatehouses, where a street runs out: the high road's are town gates.
  for (const w of wall) {
    if (!w.gate) continue;
    const { at, box } = frame(w);
    if (high.has(`${w.x},${w.y},${w.s}`)) townGate(ctx, at, box, w.s, z / 2, true, z, T, lw, ink);
    else gate(ctx, at, box, { s: w.s, i: 0 }, z, T, lw, ink);
  }

  // 6. A round tower at every outward corner (once each: two stretches share one).
  const towers = new Set();
  for (const w of wall) {
    const e = ends(w);
    for (const k of [0, 1]) {
      if (e[k] !== 'out') continue;
      const { at } = frame(w);
      const [cx, cy] = at(w.s, k ? z + T / 2 : -T / 2, T / 2);
      const key = `${Math.round(cx)},${Math.round(cy)}`;
      if (towers.has(key)) continue;
      towers.add(key);
      roundTower(ctx, cx, cy, z, lw, ink, seedOf(cx, cy, k));
    }
  }
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
