// ---------------------------------------------------------------------------
// Starà's pictures: the city-state's places (the fifth pass, 2026-11-23).
//
// Timothy: "one of those beautiful Italian city-states from the Middle Ages
// ... like the city of Lucca ... everything's sort of within these city
// walls. There's a whole civilization that exists and is doing things."
//
// Seen from above and lit from the upper left like the rest of the table, so
// every roof is lighter on its upper and left faces and every shadow falls
// down and to the right. Terracotta roofs, ochre and stone, paved streets.
//
// A tile is laid out on a three-by-three grid. The middle row and column are
// where its streets run (from the middle of a side to the middle of the
// tile); the corners are always free to build on, the middle of a side is
// free when no street comes in there, and the middle is free when there are
// no streets at all. A place is drawn into what its streets leave, so the
// same place looks different with one street than with three. A street that
// comes in on one side only is a short lane up to the door of what stands
// there.
//
// Drawn once per look and size, then bent by ink.js the way Giardino's beds
// and the castle are.
// ---------------------------------------------------------------------------

import { roughen } from './ink.js';
import { hand, seedOf } from './sketch.js';

const INK = '#3a2616';
const GROUND = '#cdb68a';
const PAVE = '#c4b796';
const PAVE_DARK = '#a49673';
const BRICK = '#c4835a';
const STONE = '#ddcda7';
const STONE_DARK = '#a8946c';
const ROOF = ['#b85a3c', '#c2673f', '#a94f35', '#c97a4e', '#b3613f'];
const WALLS = '#e6cf9d';
const GRASS = '#8daa5c';
const GRASS_DARK = '#6d8d45';
const HEDGE = '#557d3c';
const LEAF = '#5f8a3e';
const WATER = '#5f9fc4';
const WATER_LIT = '#a8d4ea';
const DRY = '#b3a17c';

const G = 0.045;                 // the lane between one tile's buildings and the next
const A = 0.35, B = 0.65;        // the street band
/** The three columns (and rows) of the tile's grid: [from, to]. */
const BANDS = [[G, A - 0.02], [A, B], [B + 0.02, 1 - G]];
const SIDE_MID = [[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]];

/**
 * The sides of the square being drawn that run on into more of the same
 * piece (the sixth pass, 2026-11-27: "tiles can be more than one tile big").
 * A terrace of houses has no lane between its squares and a farm no hedge,
 * so on those sides the picture runs to the edge. Set by paintCityTile for
 * the square it is drawing; drawing is synchronous, so one square at a time.
 */
let JOIN = [false, false, false, false];
/** Where a rect's near and far edges stand on each axis: G off a free side, 0 off a joined one. */
const edgeX = (g = G) => [JOIN[3] ? 0 : g, JOIN[1] ? 1 : 1 - g];
const edgeY = (g = G) => [JOIN[0] ? 0 : g, JOIN[2] ? 1 : 1 - g];
/** The whole square less its lanes, as [x, y, w, h], run to the edge where it joins. */
function inner(g = G) {
  const [x0, x1] = edgeX(g), [y0, y1] = edgeY(g);
  return [x0, y0, x1 - x0, y1 - y0];
}
/** Ink round a rect on its free sides only. */
function inkFree(ctx, x, y, w, h, wd, a) {
  ctx.beginPath();
  if (!JOIN[0]) { ctx.moveTo(x, y); ctx.lineTo(x + w, y); }
  if (!JOIN[1]) { ctx.moveTo(x + w, y); ctx.lineTo(x + w, y + h); }
  if (!JOIN[2]) { ctx.moveTo(x, y + h); ctx.lineTo(x + w, y + h); }
  if (!JOIN[3]) { ctx.moveTo(x, y); ctx.lineTo(x, y + h); }
  ink(ctx, wd, a);
}

// --- small helpers (unit space) ---------------------------------------------

function ink(ctx, w = 0.008, a = 0.85) {
  ctx.strokeStyle = INK;
  ctx.globalAlpha = a;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function fill(ctx, color, w = 0.008, a = 0.85) {
  ctx.fillStyle = color;
  ctx.fill();
  if (w) ink(ctx, w, a);
}

/** Lighter or darker by `k` (-1..1), for the faces of a roof. */
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.round(k > 0 ? c + (255 - c) * k : c * (1 + k)));
  return `rgb(${ch.join(',')})`;
}

/** The shadow a building of this footprint throws down and to the right. */
function castShadow(ctx, x, y, w, h, tall = 0.035) {
  ctx.save();
  ctx.fillStyle = 'rgba(46,26,10,0.30)';
  ctx.beginPath();
  ctx.moveTo(x + w, y);
  ctx.lineTo(x + w + tall, y + tall * 1.2);
  ctx.lineTo(x + w + tall, y + h + tall * 1.2);
  ctx.lineTo(x + tall, y + h + tall * 1.2);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * A gabled roof from above: the ridge along its long side, the face toward
 * the lamp lighter, rows of curved tiles running down each face.
 */
function roof(ctx, x, y, w, h, color, R, tall = 0.035) {
  castShadow(ctx, x, y, w, h, tall);
  const along = w >= h;
  ctx.save();
  if (along) {
    const m = y + h / 2;
    ctx.fillStyle = shade(color, 0.16); ctx.fillRect(x, y, w, h / 2);
    ctx.fillStyle = shade(color, -0.12); ctx.fillRect(x, m, w, h / 2);
    ctx.beginPath();
    for (let t = x + 0.022; t < x + w - 0.01; t += 0.024) { ctx.moveTo(t, y + 0.006); ctx.lineTo(t, y + h - 0.006); }
    ink(ctx, 0.003, 0.28);
    ctx.beginPath(); ctx.moveTo(x, m); ctx.lineTo(x + w, m); ink(ctx, 0.007, 0.75);
  } else {
    const m = x + w / 2;
    ctx.fillStyle = shade(color, 0.16); ctx.fillRect(x, y, w / 2, h);
    ctx.fillStyle = shade(color, -0.12); ctx.fillRect(m, y, w / 2, h);
    ctx.beginPath();
    for (let t = y + 0.022; t < y + h - 0.01; t += 0.024) { ctx.moveTo(x + 0.006, t); ctx.lineTo(x + w - 0.006, t); }
    ink(ctx, 0.003, 0.28);
    ctx.beginPath(); ctx.moveTo(m, y); ctx.lineTo(m, y + h); ink(ctx, 0.007, 0.75);
  }
  ctx.beginPath(); ctx.rect(x, y, w, h); ink(ctx, 0.009, 0.9);
  // A chimney, now and then.
  if (R() < 0.5) {
    const cx = x + w * (0.25 + R() * 0.5), cy = y + h * (0.25 + R() * 0.5);
    ctx.beginPath(); ctx.rect(cx - 0.012, cy - 0.012, 0.024, 0.024); fill(ctx, shade(color, -0.3), 0.004);
  }
  ctx.restore();
}

/** A hipped roof: four faces to a short ridge, each lit by which way it faces. */
function hipRoof(ctx, x, y, w, h, color, tall = 0.04) {
  castShadow(ctx, x, y, w, h, tall);
  const inset = Math.min(w, h) / 2;
  const r0 = w >= h ? [x + inset, y + h / 2, x + w - inset, y + h / 2] : [x + w / 2, y + inset, x + w / 2, y + h - inset];
  const [ax, ay, bx, by] = r0;
  const face = (pts, k) => {
    ctx.beginPath();
    pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.closePath();
    fill(ctx, shade(color, k), 0.005, 0.6);
  };
  face([[x, y], [x + w, y], [bx, by], [ax, ay]], 0.2);           // north, toward the lamp
  face([[x, y], [ax, ay], [bx, by], [x, y + h]], 0.08);          // west
  face([[x + w, y], [x + w, y + h], [bx, by]], -0.1);            // east
  face([[x, y + h], [ax, ay], [bx, by], [x + w, y + h]], -0.2);  // south
  ctx.beginPath(); ctx.rect(x, y, w, h); ink(ctx, 0.009, 0.9);
}

/** A round tree from above: a soft crown, lit at the top left, its shadow. */
function tree(ctx, x, y, r, color = LEAF) {
  ctx.save();
  ctx.fillStyle = 'rgba(46,26,10,0.26)';
  ctx.beginPath(); ctx.arc(x + r * 0.35, y + r * 0.45, r, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); fill(ctx, color, 0.006, 0.7);
  ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.45, 0, Math.PI * 2);
  ctx.fillStyle = shade(color, 0.25); ctx.fill();
  ctx.restore();
}

/** A square tower from above, tall, so its shadow is long. */
function tower(ctx, x, y, s, color, tall = 0.12) {
  hipRoof(ctx, x, y, s, s, color, tall);
}

/** A fountain basin, playing (blue) or dry. */
function fountain(ctx, x, y, r, wet) {
  const oct = (rr) => {
    ctx.beginPath();
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.closePath();
  };
  oct(r); fill(ctx, STONE, 0.009);
  oct(r * 0.78); ctx.fillStyle = wet ? WATER : DRY; ctx.fill(); ink(ctx, 0.005, 0.6);
  if (wet) {
    ctx.beginPath(); ctx.arc(x, y, r * 0.45, 0, Math.PI * 2);
    ctx.strokeStyle = WATER_LIT; ctx.lineWidth = 0.008; ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(x, y, r * 0.18, 0, Math.PI * 2); fill(ctx, STONE, 0.005);
}

/** Paving over a rect: flagstones, or Siena's brick laid in herringbone. */
function paving(ctx, x, y, w, h, R, brick = false) {
  ctx.fillStyle = brick ? BRICK : PAVE;
  ctx.fillRect(x, y, w, h);
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.beginPath();
  if (brick) {
    for (let t = -1; t < 2; t += 0.05) { ctx.moveTo(x + t, y); ctx.lineTo(x + t + h, y + h); }
    for (let t = -1; t < 2; t += 0.1) { ctx.moveTo(x + t, y + h); ctx.lineTo(x + t + h * 0.5, y + h * 0.5); }
    ink(ctx, 0.003, 0.3);
  } else {
    for (let t = y + 0.04; t < y + h; t += 0.055) {
      ctx.moveTo(x, t); ctx.lineTo(x + w, t);
      for (let u = x + R() * 0.05; u < x + w; u += 0.06 + R() * 0.03) { ctx.moveTo(u, t); ctx.lineTo(u, t - 0.055); }
    }
    ink(ctx, 0.0025, 0.32);
  }
  ctx.restore();
}

// --- the layout ---------------------------------------------------------------

/**
 * Which of the nine cells of the grid are free to build on, given the sides
 * a street comes in on (world frame): `free[row][col]`.
 */
function freeCells(sides) {
  const has = (s) => sides.includes(s);
  const free = [[true, !has(0), true], [!has(3), sides.length === 0, !has(1)], [true, !has(2), true]];
  return free;
}

/** One of the nine cells of the grid, run to the edge on a joined side. */
function cellRect(row, col) {
  const bx = col === 0 ? [edgeX()[0], BANDS[0][1]] : col === 2 ? [BANDS[2][0], edgeX()[1]] : BANDS[1];
  const by = row === 0 ? [edgeY()[0], BANDS[0][1]] : row === 2 ? [BANDS[2][0], edgeY()[1]] : BANDS[1];
  return [bx[0], by[0], bx[1] - bx[0], by[1] - by[0]];
}

/** The streets: paved arms from each side's middle to the tile's middle. */
function drawStreets(ctx, sides, R, stub = false) {
  if (!sides.length) return;
  const one = sides.length === 1 && stub;
  for (const s of sides) {
    const [ex, ey] = SIDE_MID[s];
    // A lone street is a lane up to the door: it stops short of the middle.
    const reach = one ? 0.36 : 0.5 + (B - A) / 2;
    const ix = ex === 0.5 ? A : ex === 0 ? 0 : 1 - reach;
    const iy = ey === 0.5 ? A : ey === 0 ? 0 : 1 - reach;
    const w = ex === 0.5 ? B - A : reach;
    const h = ey === 0.5 ? B - A : reach;
    paving(ctx, ix, iy, w, h, R);
  }
  if (!one) paving(ctx, A, A, B - A, B - A, R);
  // The kerb of each arm, inked.
  ctx.beginPath();
  for (const s of sides) {
    const [ex, ey] = SIDE_MID[s];
    if (ex === 0.5) {
      const y0 = ey === 0 ? 0 : one ? 1 - 0.36 : A, y1 = ey === 0 ? (one ? 0.36 : B) : 1;
      ctx.moveTo(A, y0); ctx.lineTo(A, y1); ctx.moveTo(B, y0); ctx.lineTo(B, y1);
    } else {
      const x0 = ex === 0 ? 0 : one ? 1 - 0.36 : A, x1 = ex === 0 ? (one ? 0.36 : B) : 1;
      ctx.moveTo(x0, A); ctx.lineTo(x1, A); ctx.moveTo(x0, B); ctx.lineTo(x1, B);
    }
  }
  ink(ctx, 0.006, 0.55);
}

/** The free area left by a lone lane in from side `s`: the far part of the tile. */
function beyondLane(s) {
  const d = 0.4;
  const [x0, x1] = edgeX(), [y0, y1] = edgeY();
  if (s === 0) return [x0, d, x1 - x0, y1 - d];
  if (s === 2) return [x0, y0, x1 - x0, 1 - d - y0];
  if (s === 3) return [d, y0, x1 - d, y1 - y0];
  return [x0, y0, 1 - d - x0, y1 - y0];
}

/** Houses in every free cell: a long row along a side with no street, else one to a corner. */
function drawHouses(ctx, sides, R, skip = new Set()) {
  const free = freeCells(sides);
  const used = new Set(skip);
  const take = (r, c) => { used.add(`${r},${c}`); };
  const rowRun = (r) => [0, 1, 2].every((c) => free[r][c] && !used.has(`${r},${c}`));
  const colRun = (c) => [0, 1, 2].every((r) => free[r][c] && !used.has(`${r},${c}`));
  const colour = () => ROOF[Math.floor(R() * ROOF.length)];
  for (const r of [0, 2]) {
    if (!rowRun(r)) continue;
    const [x0, y] = cellRect(r, 0), [x1, , w1] = cellRect(r, 2);
    // A row of three houses wall to wall, each its own roof.
    const span = x1 + w1 - x0, h = cellRect(r, 0)[3];
    let at = x0;
    for (let k = 0; k < 3; k++) {
      const w = k === 2 ? x0 + span - at : span * (0.28 + R() * 0.1);
      roof(ctx, at, y, w, h, colour(), R);
      at += w;
    }
    [0, 1, 2].forEach((c) => take(r, c));
  }
  for (const c of [0, 2]) {
    if (!colRun(c)) continue;
    const [x, y0, w] = cellRect(0, c), [, y1, , h1] = cellRect(2, c);
    const span = y1 + h1 - y0;
    let at = y0;
    for (let k = 0; k < 3; k++) {
      const h = k === 2 ? y0 + span - at : span * (0.28 + R() * 0.1);
      roof(ctx, x, at, w, h, colour(), R);
      at += h;
    }
    [0, 1, 2].forEach((r) => take(r, c));
  }
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (!free[r][c] || used.has(`${r},${c}`)) continue;
      const [x, y, w, h] = cellRect(r, c);
      if (r === 1 && c === 1) { drawCourtyard(ctx, x, y, w, h, R); continue; }
      // A tower house now and then: the noble families' (San Gimignano had dozens).
      if (R() < 0.12) tower(ctx, x + w * 0.2, y + h * 0.2, w * 0.6, colour(), 0.1);
      else roof(ctx, x, y, w, h, colour(), R);
    }
  }
}

/** The middle of a block with no streets: a courtyard with a tree in it. */
function drawCourtyard(ctx, x, y, w, h, R) {
  ctx.fillStyle = GRASS;
  ctx.fillRect(x, y, w, h);
  tree(ctx, x + w / 2, y + h / 2, w * 0.3);
}

// --- the places ----------------------------------------------------------------

/** Each place, drawn after the ground and the streets. `o` is {sides, wet, run, R, span}. */
const PLACE_ART = {
  house(ctx, o) { drawHouses(ctx, o.sides, o.R); },

  plaza(ctx, o) {
    piazza(ctx, o);
    fountain(ctx, 0.5, 0.5, 0.13, o.wet);
    // A tree or two in the corners where no street comes in, and a loggia.
    const free = freeCells(o.sides);
    const corners = [[0, 0], [0, 2], [2, 2], [2, 0]];
    corners.forEach(([r, c], i) => {
      const [x, y, w, h] = cellRect(r, c);
      if (i === 0) roof(ctx, x, y, w, h * 0.7, ROOF[3], o.R, 0.03);
      else if (i === 2 || free[1][c === 0 ? 0 : 2]) tree(ctx, x + w / 2, y + h / 2, 0.07);
    });
  },

  comune(ctx, o) {
    piazza(ctx, o);
    fountain(ctx, 0.5, 0.5, 0.14, o.wet);
    // The Palazzo Pubblico across the NW corner, crenellated, and its tower.
    const [x, y, w, h] = cellRect(0, 0);
    roof(ctx, x, y, w, h, ROOF[0], o.R, 0.05);
    ctx.save();
    ctx.beginPath();
    for (let t = x; t < x + w; t += 0.03) ctx.rect(t, y - 0.004, 0.015, 0.012);
    fill(ctx, STONE, 0.003);
    ctx.restore();
    tower(ctx, x + w - 0.13, y + 0.005, 0.13, STONE_DARK, 0.24);
    // A bench of a loggia opposite, and trees.
    const [x2, y2, w2, h2] = cellRect(2, 2);
    roof(ctx, x2, y2 + h2 * 0.3, w2, h2 * 0.7, ROOF[3], o.R, 0.03);
    const [x3, y3, w3, h3] = cellRect(0, 2);
    tree(ctx, x3 + w3 / 2, y3 + h3 / 2, 0.07);
    const [x4, y4, w4, h4] = cellRect(2, 0);
    tree(ctx, x4 + w4 / 2, y4 + h4 / 2, 0.07);
  },

  garden(ctx, o) {
    const free = freeCells(o.sides);
    const lane = o.sides.length === 1 ? beyondLane(o.sides[0]) : inner();
    const [x, y, w, h] = lane;
    ctx.fillStyle = o.wet ? GRASS : shade(GRASS, -0.08);
    ctx.fillRect(x, y, w, h);
    // Beds edged in box hedge, a gravel walk, a tree.
    const bw = (w - 0.06) / 2, bh = (h - 0.06) / 2;
    for (const [bx, by] of [[x + 0.02, y + 0.02], [x + 0.04 + bw, y + 0.02], [x + 0.02, y + 0.04 + bh], [x + 0.04 + bw, y + 0.04 + bh]]) {
      ctx.beginPath(); ctx.rect(bx, by, bw, bh); fill(ctx, o.wet ? GRASS_DARK : shade(GRASS_DARK, 0.1), 0.004, 0.5);
      ctx.beginPath(); ctx.rect(bx + 0.012, by + 0.012, bw - 0.024, bh - 0.024); ctx.strokeStyle = HEDGE; ctx.lineWidth = 0.014; ctx.stroke();
      for (let k = 0; k < 4; k++) {
        ctx.beginPath(); ctx.arc(bx + bw * (0.3 + 0.4 * (k % 2)), by + bh * (0.3 + 0.4 * (k > 1)), 0.016, 0, Math.PI * 2);
        ctx.fillStyle = ['#d65a5a', '#e8c040', '#f0ecd8', '#9a6ac0'][Math.floor(o.R() * 4)]; ctx.fill();
      }
    }
    if (o.wet) fountain(ctx, x + w / 2, y + h / 2, 0.05, true);
    else tree(ctx, x + w / 2, y + h / 2, 0.06);
    if (!free[0][0]) return;
  },

  farm(ctx, o) {
    const [x, y, w, h] = o.sides.length === 1 ? beyondLane(o.sides[0]) : inner(G * 0.5);
    // One crop across the whole of a farm of several squares.
    const kind = o.crop ?? Math.floor(o.R() * 3);
    ctx.fillStyle = kind === 2 ? '#d9b960' : GRASS;
    ctx.fillRect(x, y, w, h);
    inkFree(ctx, x, y, w, h, 0.006, 0.5);
    if (kind === 0) {
      // Vines in rows.
      for (let t = y + 0.05; t < y + h - 0.02; t += 0.07) {
        ctx.beginPath(); ctx.moveTo(x + 0.03, t); ctx.lineTo(x + w - 0.03, t); ink(ctx, 0.004, 0.5);
        for (let u = x + 0.05; u < x + w - 0.03; u += 0.045) { ctx.beginPath(); ctx.arc(u, t, 0.016, 0, Math.PI * 2); fill(ctx, HEDGE, 0.003, 0.5); }
      }
    } else if (kind === 1) {
      // An orchard: trees in a grid.
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) tree(ctx, x + w * (0.18 + c * 0.32), y + h * (0.18 + r * 0.32), Math.min(w, h) * 0.1, c % 2 ? LEAF : '#6f9a44');
    } else {
      // Wheat, furrowed, and a stook or two.
      ctx.beginPath();
      for (let t = x + 0.03; t < x + w; t += 0.03) { ctx.moveTo(t, y + 0.02); ctx.lineTo(t, y + h - 0.02); }
      ink(ctx, 0.003, 0.3);
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(x + w * (0.25 + k * 0.25), y + h * (0.3 + (k % 2) * 0.35), 0.03, 0, Math.PI * 2); fill(ctx, '#c49a3c', 0.004); }
    }
  },

  market(ctx, o) {
    drawHouses(ctx, o.sides, o.R);
    // Stalls under striped awnings along each street.
    const stripes = ['#c8443a', '#3e66b0', '#d9a338', '#4f8a3a', '#7b4f93'];
    for (const s of o.sides) {
      const [ex, ey] = SIDE_MID[s];
      for (const k of [0.12, 0.27]) {
        const along = ex === 0.5;
        const px = along ? A + 0.015 : ex === 0 ? k : 1 - k - 0.1;
        const py = along ? (ey === 0 ? k : 1 - k - 0.1) : A + 0.015;
        const w = along ? 0.1 : 0.1, h = along ? 0.1 : 0.1;
        for (const off of [0, along ? B - A - 0.13 : 0]) {
          const qx = px + (along ? off : 0), qy = py + (along ? 0 : B - A - 0.13);
          const c = stripes[Math.floor(o.R() * stripes.length)];
          castShadow(ctx, qx, qy, w, h, 0.02);
          ctx.beginPath(); ctx.rect(qx, qy, w, h); fill(ctx, '#f1e6cc', 0.005);
          ctx.save(); ctx.beginPath(); ctx.rect(qx, qy, w, h); ctx.clip();
          ctx.fillStyle = c;
          for (let t = 0; t < 0.1; t += 0.04) ctx.fillRect(along ? qx + t : qx, along ? qy : qy + t, along ? 0.02 : w, along ? h : 0.02);
          ctx.restore();
          if (!along) break;
        }
      }
    }
  },

  church(ctx, o) {
    const lane = o.sides.length === 1 ? o.sides[0] : null;
    if (lane == null) {
      // A church on one side of the street, houses on the other.
      const vertical = o.sides.includes(0);
      if (vertical) { basilica(ctx, BANDS[2][0], G, BANDS[2][1] - BANDS[2][0], 1 - 2 * G, 3, o.R); drawHouses(ctx, o.sides, o.R, new Set(['0,2', '1,2', '2,2'])); }
      else { basilica(ctx, G, BANDS[2][0], 1 - 2 * G, BANDS[2][1] - BANDS[2][0], 0, o.R); drawHouses(ctx, o.sides, o.R, new Set(['2,0', '2,1', '2,2'])); }
      return;
    }
    const [x, y, w, h] = beyondLane(lane);
    basilica(ctx, x + w * 0.18, y + 0.01, w * 0.64, h - 0.02, lane, o.R, true);
    tree(ctx, x + 0.06, y + 0.08, 0.05);
  },

  cathedral(ctx, o) {
    const lane = o.sides[0] ?? 0;
    const [x, y, w, h] = beyondLane(lane);
    // A Latin cross: the nave from the door at the lane, the transept, a dome
    // at the crossing, the apse at the far end; and the campanile in banded
    // marble beside it, as at Siena and Pisa.
    const vert = lane % 2 === 0;
    const L = vert ? h : w, Wd = vert ? w : h;
    const nave = Wd * 0.34;
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate([0, -Math.PI / 2, Math.PI, Math.PI / 2][lane]);
    // In this frame the door is at the top (-L/2) and the apse at the bottom.
    roof(ctx, -nave / 2, -L / 2 + 0.01, nave, L * 0.78, '#c97a4e', o.R, 0.06);
    roof(ctx, -Wd * 0.44, -L * 0.02, Wd * 0.88, nave * 0.8, '#c2673f', o.R, 0.06);
    ctx.beginPath(); ctx.arc(0, L * 0.27, nave * 0.5, 0, Math.PI); fill(ctx, '#b85a3c', 0.008);
    // The dome: an octagon of ribs, lit on the upper left.
    const r = nave * 0.62;
    ctx.beginPath(); ctx.arc(0, nave * 0.4 - L * 0.02, r, 0, Math.PI * 2); fill(ctx, '#c45f3e', 0.01);
    ctx.beginPath(); ctx.arc(-r * 0.25, nave * 0.4 - L * 0.02 - r * 0.25, r * 0.5, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,230,200,0.25)'; ctx.fill();
    ctx.beginPath();
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; ctx.moveTo(0, nave * 0.4 - L * 0.02); ctx.lineTo(Math.cos(a) * r, nave * 0.4 - L * 0.02 + Math.sin(a) * r); }
    ink(ctx, 0.004, 0.6);
    ctx.beginPath(); ctx.arc(0, nave * 0.4 - L * 0.02, r * 0.18, 0, Math.PI * 2); fill(ctx, STONE, 0.005);
    ctx.restore();
    // The campanile, striped.
    const cs = 0.1;
    const cx = lane === 1 ? x + 0.02 : x + w - cs - 0.02, cy = lane === 2 ? y + h - cs - 0.02 : y + 0.02;
    castShadow(ctx, cx, cy, cs, cs, 0.18);
    ctx.beginPath(); ctx.rect(cx, cy, cs, cs); fill(ctx, '#f1ead8', 0.009);
    ctx.fillStyle = '#3d3a36';
    for (let t = 0; t < cs; t += 0.03) ctx.fillRect(cx, cy + t, cs, 0.012);
    ctx.beginPath(); ctx.rect(cx, cy, cs, cs); ink(ctx, 0.009);
  },

  convent(ctx, o) {
    const [x, y, w, h] = o.sides.length === 1 ? beyondLane(o.sides[0]) : inner();
    cloister(ctx, x, y, w, h, o.R, '#b3613f');
    tree(ctx, x + w / 2, y + h / 2, Math.min(w, h) * 0.12);
  },

  barracks(ctx, o) {
    const lane = o.sides.length === 1 ? o.sides[0] : null;
    const rect = lane != null ? beyondLane(lane) : (o.sides.includes(0) ? [BANDS[2][0], G, BANDS[2][1] - BANDS[2][0], 1 - 2 * G] : [G, BANDS[2][0], 1 - 2 * G, BANDS[2][1] - BANDS[2][0]]);
    const [x, y, w, h] = rect;
    // A long block round a beaten drill yard, a flag, a rack of spears.
    ctx.fillStyle = '#b9a073'; ctx.fillRect(x, y, w, h);
    const t = Math.min(w, h) * 0.3;
    roof(ctx, x, y, w, t, '#8f4a32', o.R, 0.04);
    if (h > t * 2.2) roof(ctx, x, y + h - t, w, t, '#8f4a32', o.R, 0.04);
    ctx.beginPath(); ctx.moveTo(x + w * 0.7, y + h * 0.55); ctx.lineTo(x + w * 0.7, y + h * 0.35); ink(ctx, 0.008);
    ctx.beginPath(); ctx.moveTo(x + w * 0.7, y + h * 0.35); ctx.lineTo(x + w * 0.85, y + h * 0.39); ctx.lineTo(x + w * 0.7, y + h * 0.43); ctx.closePath(); fill(ctx, '#b23a2c', 0.005);
    ctx.beginPath();
    for (let k = 0; k < 5; k++) { const sx = x + w * 0.15 + k * 0.025; ctx.moveTo(sx, y + h * 0.42); ctx.lineTo(sx + 0.01, y + h * 0.62); }
    ink(ctx, 0.005, 0.8);
    if (lane == null) drawHouses(ctx, o.sides, o.R, new Set(o.sides.includes(0) ? ['0,2', '1,2', '2,2'] : ['2,0', '2,1', '2,2']));
  },

  silk(ctx, o) {
    const lane = o.sides.length === 1 ? o.sides[0] : null;
    const rect = lane != null ? beyondLane(lane) : (o.sides.includes(0) ? [BANDS[2][0], G, BANDS[2][1] - BANDS[2][0], 1 - 2 * G] : [G, BANDS[2][0], 1 - 2 * G, BANDS[2][1] - BANDS[2][0]]);
    const [x, y, w, h] = rect;
    const long = w >= h;
    // The mill, a water wheel on its flank, and frames of dyed silk drying.
    const mw = long ? w * 0.55 : w, mh = long ? h : h * 0.55;
    roof(ctx, x, y, mw, mh, '#a94f35', o.R, 0.05);
    const wx = long ? x + mw + 0.03 : x + w * 0.5, wy = long ? y + h * 0.5 : y + mh + 0.03;
    ctx.beginPath(); ctx.arc(wx, wy, 0.045, 0, Math.PI * 2); fill(ctx, o.wet ? WATER : DRY, 0.006);
    ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; ctx.moveTo(wx, wy); ctx.lineTo(wx + Math.cos(a) * 0.045, wy + Math.sin(a) * 0.045); } ink(ctx, 0.005);
    const silks = ['#c8443a', '#d9a338', '#3e66b0', '#7b4f93', '#e07ab0'];
    const fx = long ? x + mw + 0.08 : x, fy = long ? y : y + mh + 0.08;
    const fw = long ? w - mw - 0.08 : w, fh = long ? h : h - mh - 0.08;
    for (let k = 0; k < 4; k++) {
      ctx.fillStyle = o.wet ? silks[(k + Math.floor(o.R() * 5)) % 5] : '#d8ccb0';
      if (long) ctx.fillRect(fx + 0.01, fy + 0.03 + k * (fh - 0.06) / 4, fw - 0.02, 0.022);
      else ctx.fillRect(fx + 0.03 + k * (fw - 0.06) / 4, fy + 0.01, 0.022, fh - 0.02);
    }
    if (lane == null) drawHouses(ctx, o.sides, o.R, new Set(o.sides.includes(0) ? ['0,2', '1,2', '2,2'] : ['2,0', '2,1', '2,2']));
  },

  tannery(ctx, o) {
    const [x, y, w, h] = o.sides.length === 1 ? beyondLane(o.sides[0]) : inner();
    // The pits: round vats of lime and dye in a honeycomb of stone, a shed.
    ctx.fillStyle = '#d6c49c'; ctx.fillRect(x, y, w, h);
    inkFree(ctx, x, y, w, h, 0.006, 0.5);
    const dyes = ['#e6e0cf', '#c9a13a', '#a8392c', '#5b7fb0', '#7a5134', '#c27a3a'];
    const r = Math.min(w, h) * 0.085;
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) {
        const cx = x + w * (0.15 + col * 0.22) + (row % 2) * w * 0.05, cy = y + h * (0.32 + row * 0.24);
        if (cx + r > x + w) continue;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); fill(ctx, STONE, 0.005);
        ctx.beginPath(); ctx.arc(cx, cy, r * 0.75, 0, Math.PI * 2);
        ctx.fillStyle = o.wet ? dyes[Math.floor(o.R() * dyes.length)] : '#9c8a68'; ctx.fill();
      }
    }
    roof(ctx, x, y, w, h * 0.16, '#8f4a32', o.R, 0.03);
  },

  wizard(ctx, o) {
    const [x, y, w, h] = o.sides.length === 1 ? beyondLane(o.sides[0]) : [G, G, 1 - 2 * G, 1 - 2 * G];
    const cx = x + w / 2, cy = y + h / 2, r = Math.min(w, h) * 0.34;
    // A ring of rough grass and toadstools, the tower's long shadow, and its
    // conical roof of midnight slates with gold stars on it.
    ctx.fillStyle = '#7d8f58'; ctx.beginPath(); ctx.arc(cx, cy, r * 1.35, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.fillStyle = 'rgba(30,20,40,0.32)';
    ctx.beginPath(); ctx.moveTo(cx - r * 0.7, cy + r * 0.7); ctx.lineTo(cx + r * 1.9, cy + r * 2.3); ctx.lineTo(cx + r * 2.3, cy + r * 1.9); ctx.lineTo(cx + r * 0.7, cy - r * 0.7); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); fill(ctx, '#9c93a8', 0.01);
    for (let k = 0; k < 8; k++) {
      const a0 = (k / 8) * Math.PI * 2, a1 = ((k + 1) / 8) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r * 0.9, a0, a1); ctx.closePath();
      const lit = Math.cos(a0 + Math.PI / 8 + Math.PI * 0.75);
      fill(ctx, shade('#2f2f6e', lit * 0.3), 0.004, 0.6);
    }
    ctx.fillStyle = '#e8c45a';
    for (let k = 0; k < 7; k++) {
      const a = o.R() * Math.PI * 2, d = r * (0.25 + o.R() * 0.55);
      ctx.beginPath(); ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 0.009, 0, Math.PI * 2); ctx.fill();
    }
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.1, 0, Math.PI * 2); fill(ctx, '#e8c45a', 0.004);
    for (let k = 0; k < 3; k++) {
      const a = 0.6 + k * 1.9, d = r * 1.18;
      ctx.beginPath(); ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 0.014, 0, Math.PI * 2); fill(ctx, '#c8443a', 0.003);
    }
  },

  university(ctx, o) {
    const [x, y, w, h] = o.sides.length === 1 ? beyondLane(o.sides[0]) : [G, G, 1 - 2 * G, 1 - 2 * G];
    cloister(ctx, x, y, w, h, o.R, '#c97a4e');
    // Scholars in the cortile, and a well.
    fountain(ctx, x + w / 2, y + h / 2, Math.min(w, h) * 0.1, o.wet);
    ctx.fillStyle = '#2f2a5e';
    for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(x + w * (0.35 + 0.3 * (k % 2)), y + h * (0.38 + 0.25 * (k > 1)), 0.011, 0, Math.PI * 2); ctx.fill(); }
  },

  aqueduct(ctx, o) {
    // A yard under the arches, darker in its shade, so the span stands out.
    paving(ctx, 0, 0, 1, 1, o.R);
    ctx.fillStyle = 'rgba(70,50,25,0.12)'; ctx.fillRect(0, 0, 1, 1);
    drawSpan(ctx, o.span, o.run);
  },
};

/**
 * A piazza: brick laid in herringbone over the whole square, the streets
 * coming into it in flagstones so you can see where they meet it, and a row
 * of house fronts along every side no street comes in on.
 */
function piazza(ctx, o) {
  paving(ctx, 0, 0, 1, 1, o.R, true);
  for (const s of o.sides) {
    const [ex, ey] = SIDE_MID[s];
    const d = 0.2;
    const x = ex === 0.5 ? A : ex === 0 ? 0 : 1 - d, y = ey === 0.5 ? A : ey === 0 ? 0 : 1 - d;
    paving(ctx, x, y, ex === 0.5 ? B - A : d, ey === 0.5 ? B - A : d, o.R);
    ctx.beginPath(); ctx.rect(x, y, ex === 0.5 ? B - A : d, ey === 0.5 ? B - A : d); ink(ctx, 0.006, 0.6);
  }
  const fronts = [[0, [G, G, 1 - 2 * G, 0.12]], [1, [1 - G - 0.12, G, 0.12, 1 - 2 * G]], [2, [G, 1 - G - 0.12, 1 - 2 * G, 0.12]], [3, [G, G, 0.12, 1 - 2 * G]]];
  for (const [side, [x, y, w, h]] of fronts) if (!o.sides.includes(side)) roof(ctx, x, y, w, h, ROOF[side % ROOF.length], o.R, 0.03);
}

/** A small church: a nave ridged toward its door, an apse, a bell tower. */
function basilica(ctx, x, y, w, h, door, R, tower_ = false) {
  const vert = door % 2 === 0;
  if (vert) {
    roof(ctx, x, y, w, h * 0.82, '#c2673f', R, 0.05);
    const ay = door === 0 ? y + h * 0.82 : y;
    ctx.beginPath(); ctx.arc(x + w / 2, door === 0 ? ay : ay + h * 0.18, w * 0.32, door === 0 ? 0 : Math.PI, door === 0 ? Math.PI : Math.PI * 2); fill(ctx, '#b85a3c', 0.008);
  } else {
    roof(ctx, x, y, w * 0.82, h, '#c2673f', R, 0.05);
  }
  if (tower_) {
    const s = Math.min(w, h) * 0.32;
    tower(ctx, x + w - s * 0.3, y + h * 0.5, s, STONE_DARK, 0.12);
  }
}

/** A building round a courtyard: four roofs and the open middle. */
function cloister(ctx, x, y, w, h, R, color) {
  const t = Math.min(w, h) * 0.26;
  ctx.fillStyle = GRASS; ctx.fillRect(x + t, y + t, w - 2 * t, h - 2 * t);
  // The arcade round the garth: a row of little arches on each side.
  ctx.beginPath();
  for (let u = x + t + 0.02; u < x + w - t; u += 0.03) { ctx.moveTo(u, y + t); ctx.arc(u, y + t, 0.008, 0, Math.PI); ctx.moveTo(u, y + h - t); ctx.arc(u, y + h - t, 0.008, Math.PI, Math.PI * 2); }
  ink(ctx, 0.003, 0.5);
  roof(ctx, x, y, w, t, color, R, 0.045);
  roof(ctx, x, y + h - t, w, t, color, R, 0.045);
  roof(ctx, x, y + t, t, h - 2 * t, color, R, 0.045);
  roof(ctx, x + w - t, y + t, t, h - 2 * t, color, R, 0.045);
}

/**
 * The aqueduct's span: a stone channel on piers, its arches seen as the gaps
 * in its shadow on the ground, water in it if it runs.
 */
function drawSpan(ctx, span, run) {
  if (!span?.length) return;
  const wC = 0.26;
  const arm = (w) => {
    ctx.beginPath();
    for (const sd of span) { const [ex, ey] = SIDE_MID[sd]; ctx.moveTo(0.5, 0.5); ctx.lineTo(ex, ey); }
    ctx.lineWidth = w; ctx.lineCap = 'butt'; ctx.stroke();
    ctx.fillRect(0.5 - w / 2, 0.5 - w / 2, w, w);
  };
  // Its shadow, long, down and to the right: it stands high on its arches.
  ctx.save();
  ctx.translate(0.07, 0.09);
  ctx.strokeStyle = ctx.fillStyle = 'rgba(46,26,10,0.36)';
  arm(wC * 0.9);
  ctx.restore();
  // The piers, wider than the channel, where its arches come down.
  ctx.fillStyle = STONE_DARK;
  for (const sd of span) {
    const [ex, ey] = SIDE_MID[sd];
    for (const t of [0.3, 0.75]) {
      const px = 0.5 + (ex - 0.5) * t * 2, py = 0.5 + (ey - 0.5) * t * 2;
      ctx.beginPath(); ctx.rect(px - wC * 0.66, py - wC * 0.66, wC * 1.32, wC * 1.32); fill(ctx, STONE_DARK, 0.01);
    }
  }
  // The channel on top: dark edge, pale coping, the water (or its dry bed).
  ctx.strokeStyle = ctx.fillStyle = INK; arm(wC + 0.03);
  ctx.strokeStyle = ctx.fillStyle = '#efe2c2'; arm(wC);
  ctx.strokeStyle = ctx.fillStyle = run ? WATER : '#8a7a5c'; arm(wC * 0.42);
  // The joints of the coping, across it.
  ctx.beginPath();
  for (const sd of span) {
    const [ex, ey] = SIDE_MID[sd];
    for (let k = 1; k < 6; k++) {
      const t = k / 12, px = 0.5 + (ex - 0.5) * t * 2, py = 0.5 + (ey - 0.5) * t * 2;
      if (ex === 0.5) { ctx.moveTo(px - wC / 2, py); ctx.lineTo(px - wC * 0.21, py); ctx.moveTo(px + wC * 0.21, py); ctx.lineTo(px + wC / 2, py); }
      else { ctx.moveTo(px, py - wC / 2); ctx.lineTo(px, py - wC * 0.21); ctx.moveTo(px, py + wC * 0.21); ctx.lineTo(px, py + wC / 2); }
    }
  }
  ink(ctx, 0.005, 0.6);
  if (run) {
    ctx.beginPath();
    for (const sd of span) { const [ex, ey] = SIDE_MID[sd]; ctx.moveTo(0.5 + (ex - 0.5) * 0.15, 0.5 + (ey - 0.5) * 0.15); ctx.lineTo(0.5 + (ex - 0.5) * 0.95, 0.5 + (ey - 0.5) * 0.95); }
    ctx.strokeStyle = WATER_LIT; ctx.lineWidth = 0.014; ctx.lineCap = 'round'; ctx.stroke();
  }
}

/**
 * Paint one city tile in unit space, in the WORLD's frame: `rot` turns its
 * streets and its span, never the light. `look` is the mode's (stara.js
 * lookOf): the place, then 'r' if water runs along it and 'w' if watered.
 */
export function paintCityTile(ctx, type, rot, look = '') {
  const kind = type.place;
  // The mode's look (stara.js lookString): the place and its water flags,
  // then the sides the square joins the rest of its piece on, then the piece.
  const [head, ...rest] = look.split('|');
  const flags = head.startsWith(kind) ? head.slice(kind.length) : '';
  const run = flags.includes('r');
  const wet = flags.includes('w');
  const joined = rest.find((p) => p[0] === 'j')?.slice(1) || '';
  const piece = rest.find((p) => p[0] === 'p')?.slice(1) || '';
  JOIN = [0, 1, 2, 3].map((s) => joined.includes(String(s)));
  const pn = Number(piece.replace(/\D/g, '')) || 0;
  const R = hand(seedOf(type.id.length, rot, type.id.charCodeAt(2) || 1, (type.id.charCodeAt(type.id.length - 1) || 0) + pn * 7));
  const sides = (type.feats.find((f) => f.type === 'road')?.sides || []).map((s) => (s + rot) % 4);
  const span = (type.span || []).map((s) => (s + rot) % 4);
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, 1, 1); ctx.clip();
  ctx.fillStyle = GROUND; ctx.fillRect(0, 0, 1, 1);
  const stub = !['plaza', 'comune', 'aqueduct'].includes(kind);
  if (!['comune', 'plaza', 'aqueduct'].includes(kind)) drawStreets(ctx, sides, R, stub);
  const crop = piece ? pn % 3 : null;
  (PLACE_ART[kind] || PLACE_ART.house)(ctx, { sides, wet, run, R, span, crop });
  ctx.restore();
  JOIN = [false, false, false, false];
}

const sprites = new Map();

/** A city tile at `px` pixels square, as it looks now, cached. */
export function citySprite(type, rot, look, px) {
  px = Math.max(16, Math.round(px));
  const key = `${type.id}|${rot & 3}|${look}|${px}`;
  const had = sprites.get(key);
  if (had) return had;
  const c = document.createElement('canvas');
  c.width = c.height = px;
  const k = c.getContext('2d', { willReadFrequently: true });
  k.scale(px, px);
  paintCityTile(k, type, rot & 3, look || '');
  roughen(c, { amp: Math.max(0.4, px * 0.007), grain: 0.3 });
  roughen(c, { amp: Math.max(0.25, px * 0.003), grain: 0.07 });
  sprites.set(key, c);
  if (sprites.size > 700) sprites.delete(sprites.keys().next().value);
  return c;
}

/**
 * The water arch in the town wall, seen from above: a round-headed opening
 * through the wall's thickness with the channel coming in over it from
 * outside, and a basin at its foot inside where the water falls. In px, on
 * side `s` of a square whose top left is (x0, y0), `i` squares along, the
 * wall `T` thick.
 */
export function paintArch(ctx, { z, x0, y0, cols, rows, s, i, T }) {
  const w = cols * z, h = rows * z;
  const along = (i + 0.5) * z;
  ctx.save();
  // Into the wall's frame: x along the side, y out from the square.
  if (s === 0) ctx.translate(x0 + along, y0);
  else if (s === 1) { ctx.translate(x0 + w, y0 + along); ctx.rotate(Math.PI / 2); }
  else if (s === 2) { ctx.translate(x0 + along, y0 + h); ctx.rotate(Math.PI); }
  else { ctx.translate(x0, y0 + along); ctx.rotate(-Math.PI / 2); }
  const lw = Math.max(1, z * 0.025);
  const cw = z * 0.16;
  // The channel coming in from outside the wall, on its piers.
  ctx.fillStyle = STONE;
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.beginPath(); ctx.rect(-cw, -T - z * 0.5, cw * 2, z * 0.5 + T); ctx.fill(); ctx.stroke();
  ctx.fillStyle = WATER;
  ctx.fillRect(-cw * 0.45, -T - z * 0.5, cw * 0.9, z * 0.5 + T + z * 0.02);
  ctx.strokeStyle = WATER_LIT; ctx.lineWidth = lw * 0.8;
  ctx.beginPath(); ctx.moveTo(0, -T - z * 0.45); ctx.lineTo(0, -z * 0.02); ctx.stroke();
  // The arch's keystone and voussoirs over the opening.
  ctx.strokeStyle = INK; ctx.lineWidth = lw;
  ctx.beginPath(); ctx.arc(0, -T * 0.5, cw * 1.3, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
  ctx.fillStyle = STONE_DARK; ctx.beginPath(); ctx.rect(-cw * 0.25, -T * 0.5 - cw * 1.45, cw * 0.5, cw * 0.4); ctx.fill(); ctx.stroke();
  ctx.restore();
}
