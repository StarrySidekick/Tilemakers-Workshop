// ---------------------------------------------------------------------------
// Giardino's pictures: the beds, the plants as they grow, the rills, the
// fountain, and the garden wall round the square.
//
// Seen from above, lit from the upper left like Starà's table, so every
// shadow falls down and to the right. Each bed is a square of tilled earth
// edged in timber with a gravel path between beds; a crop grows in it as four
// plants, one in each corner, so the rill (a stone channel from the middle of
// a side to the middle of the bed) always has room to run between them. The
// soil is darker where it is watered, and a rill is blue where water runs in
// it and a dry bed of pebbles where it does not.
//
// A plant is drawn at five stages: sown (a drill and the seed packet on its
// stick), a seedling, young, grown (fruit coming), and ripe, which is how
// the hand shows it; and picked, gone to seed, faded to straw. Drawn once
// per look and size, then bent by ink.js the way Starà's tiles and keep are.
// ---------------------------------------------------------------------------

import { roughen } from './ink.js';
import { sketchLine, sketchRect, seedOf, hand } from './sketch.js';

const INK = '#3a2616';
const GRAVEL = '#d9c9a3';
const GRAVEL_DOT = '#b9a57c';
const TIMBER = '#8a6238';
const SOIL = '#8c6a47';
const SOIL_WET = '#5f4630';
const SOIL_DARK = '#6e5236';
const STONE = '#cfc3a8';
const STONE_DARK = '#9b8f76';
const WATER = '#5f9fc4';
const WATER_LIT = '#a8d4ea';
const DRY_BED = '#a99876';

/** In tiles: how thick the garden wall is and how far past the square it reaches. */
export const GARDEN_WALL = { band: 0.3, reach: 0.5 };

const SIDE_MID = [[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]];

// --- small drawing helpers (unit space) --------------------------------------

function ink(ctx, w = 0.012, a = 1) {
  ctx.strokeStyle = INK;
  ctx.globalAlpha = a;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function fillInk(ctx, fill, w = 0.01, a = 0.9) {
  ctx.fillStyle = fill;
  ctx.fill();
  ink(ctx, w, a);
}

/** A leaf: an ellipse pointing along `ang`, with its midrib. */
function leaf(ctx, x, y, len, wid, ang, fill, rib = true) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.5, -wid, len, 0);
  ctx.quadraticCurveTo(len * 0.5, wid, 0, 0);
  // A thin leaf gets a thin line, or the ink is all you see of it.
  fillInk(ctx, fill, Math.min(0.006, wid * 0.3), 0.6);
  if (rib) {
    ctx.beginPath();
    ctx.moveTo(len * 0.08, 0);
    ctx.lineTo(len * 0.85, 0);
    ink(ctx, 0.004, 0.45);
  }
  ctx.restore();
}

function dot(ctx, x, y, r, fill, w = 0.006) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  fillInk(ctx, fill, w, 0.85);
}

/** A soft shadow down and to the right, under whatever is drawn next. */
function shadow(ctx, x, y, r) {
  ctx.save();
  ctx.fillStyle = 'rgba(40,24,10,0.22)';
  ctx.beginPath();
  ctx.ellipse(x + r * 0.22, y + r * 0.26, r, r * 0.9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// --- the plants ------------------------------------------------------------
//
// Each is drawn round (x, y) at size r (the radius of a grown plant), at
// `stage` 2 (young) to 4 (ripe); stages 0 and 1 are the drill and the
// seedling, drawn for every plant alike in its own green. `R` is a seeded
// random, so a plant is the same plant every time it is drawn.

export const PLANT_COLOR = {
  tomato: '#c9432f', basil: '#5fae3e', bean: '#7d5fa8', corn: '#e1bd3e', squash: '#e08a2c',
  onion: '#d9c7a8', carrot: '#e5772a', cabbage: '#7fa6a0', lettuce: '#9fcf4f', rosemary: '#8aa4c8',
  marigold: '#f0a020', fennel: '#d6d34a', fig: '#6e4a78',
};
const GREEN = {
  tomato: '#4d8a3a', basil: '#5fae3e', bean: '#5c9a3c', corn: '#8fb24a', squash: '#3f7a35',
  onion: '#9cbf72', carrot: '#3f7f36', cabbage: '#88aea4', lettuce: '#a5d35a', rosemary: '#8fae98',
  marigold: '#5a8f3a', fennel: '#a9c25a', fig: '#4f7f3a',
};

const DRAW = {
  tomato(ctx, x, y, r, stage, R) {
    for (let i = 0; i < 6; i++) leaf(ctx, x, y, r * 0.95, r * 0.32, i * 1.05 + R() * 0.4, GREEN.tomato);
    // The stake it is tied to.
    dot(ctx, x, y, r * 0.11, TIMBER);
    if (stage >= 3) {
      const n = stage >= 4 ? 4 : 3;
      for (let i = 0; i < n; i++) {
        const a = i * 1.7 + 0.4, d = r * 0.5;
        dot(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, r * (stage >= 4 ? 0.2 : 0.14), stage >= 4 ? PLANT_COLOR.tomato : '#9fbf4a');
      }
    }
  },
  basil(ctx, x, y, r, stage, R) {
    for (let i = 0; i < 8; i++) {
      const a = i * 0.8 + R() * 0.3, d = r * (0.25 + 0.3 * (i % 2));
      leaf(ctx, x + Math.cos(a) * d * 0.4, y + Math.sin(a) * d * 0.4, r * 0.62, r * 0.3, a, i % 2 ? '#6fc24a' : GREEN.basil);
    }
    if (stage >= 3) dot(ctx, x, y, r * 0.12, '#f2f0e0');
  },
  bean(ctx, x, y, r, stage, R) {
    // A wigwam of canes, the vines up it.
    for (let i = 0; i < 7; i++) leaf(ctx, x, y, r * 0.9, r * 0.4, i * 0.9 + R() * 0.3, GREEN.bean);
    ctx.beginPath();
    for (let i = 0; i < 3; i++) { const a = i * 2.1 + 0.5; ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * r * 0.85, y + Math.sin(a) * r * 0.85); }
    ink(ctx, 0.014, 0.9);
    if (stage >= 3) {
      for (let i = 0; i < 3; i++) {
        const a = i * 2.1 + 1.4;
        if (stage >= 4) leaf(ctx, x + Math.cos(a) * r * 0.25, y + Math.sin(a) * r * 0.25, r * 0.6, r * 0.12, a, '#6a9a3a', false);
        else dot(ctx, x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.1, PLANT_COLOR.bean);
      }
    }
  },
  corn(ctx, x, y, r, stage, R) {
    // Long strap leaves from the stalk, and the tassel at the top.
    for (let i = 0; i < 6; i++) leaf(ctx, x, y, r * 1.1, r * 0.17, i * 1.05 + R() * 0.3, GREEN.corn);
    dot(ctx, x, y, r * 0.12, '#b9a24a');
    if (stage >= 3) {
      ctx.beginPath();
      for (let i = 0; i < 5; i++) { const a = i * 1.26; ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * r * 0.32, y + Math.sin(a) * r * 0.32); }
      ink(ctx, 0.01, 0.8);
      if (stage >= 4) leaf(ctx, x + r * 0.1, y + r * 0.05, r * 0.6, r * 0.2, 0.7, PLANT_COLOR.corn);
    }
  },
  squash(ctx, x, y, r, stage, R) {
    // Big round lobed leaves, sprawling.
    for (let i = 0; i < 4; i++) {
      const a = i * 1.57 + R() * 0.5, d = r * 0.42;
      ctx.beginPath();
      const lx = x + Math.cos(a) * d, ly = y + Math.sin(a) * d, lr = r * 0.48;
      for (let k = 0; k <= 10; k++) {
        const t = (k / 10) * Math.PI * 2, rr = lr * (0.82 + 0.18 * Math.cos(t * 5));
        const px = lx + Math.cos(t) * rr, py = ly + Math.sin(t) * rr;
        if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      }
      ctx.closePath();
      fillInk(ctx, i % 2 ? '#4f8a3f' : GREEN.squash, 0.008, 0.8);
    }
    if (stage >= 3) {
      ctx.save();
      ctx.translate(x + r * 0.05, y + r * 0.1);
      ctx.beginPath();
      const s = stage >= 4 ? 0.36 : 0.22;
      ctx.ellipse(0, 0, r * s * 1.2, r * s, 0.4, 0, Math.PI * 2);
      fillInk(ctx, stage >= 4 ? PLANT_COLOR.squash : '#f2d24a', 0.009);
      ctx.restore();
    }
  },
  onion(ctx, x, y, r, stage, R) {
    // A clump of hollow leaves standing up: from above, a bunch of spikes.
    for (let i = 0; i < 10; i++) leaf(ctx, x, y, r * (0.7 + R() * 0.3), r * 0.13, i * 0.63 + R() * 0.3, i % 2 ? '#b2d189' : GREEN.onion, false);
    if (stage >= 3) dot(ctx, x, y, r * (stage >= 4 ? 0.3 : 0.2), PLANT_COLOR.onion, 0.009);
  },
  carrot(ctx, x, y, r, stage, R) {
    // Feathery fronds: soft strokes of green, lighter at their tips.
    for (let i = 0; i < 7; i++) {
      const a = i * 0.9 + R() * 0.3;
      const ex = x + Math.cos(a) * r * 0.92, ey = y + Math.sin(a) * r * 0.92;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + Math.cos(a + 0.25) * r * 0.5, y + Math.sin(a + 0.25) * r * 0.5, ex, ey);
      ctx.strokeStyle = i % 2 ? '#4f9440' : GREEN.carrot;
      ctx.lineWidth = r * 0.2;
      ctx.lineCap = 'round';
      ctx.stroke();
      dot(ctx, ex, ey, r * 0.1, '#6fb052', 0.003);
    }
    if (stage >= 3) dot(ctx, x, y, r * (stage >= 4 ? 0.22 : 0.15), PLANT_COLOR.carrot, 0.009);
  },
  cabbage(ctx, x, y, r, stage) {
    // Rings of wide leaves round a tight head.
    for (let ring = 2; ring >= 0; ring--) {
      const n = 5 + ring;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + ring * 0.4;
        leaf(ctx, x, y, r * (0.45 + ring * 0.25), r * (0.32 + ring * 0.06), a, ring ? GREEN.cabbage : '#a8c8bd');
      }
    }
    if (stage >= 3) dot(ctx, x, y, r * (stage >= 4 ? 0.34 : 0.24), '#c4dccf', 0.009);
  },
  lettuce(ctx, x, y, r, stage) {
    // A frilled rosette, light at the heart.
    for (let ring = 1; ring >= 0; ring--) {
      const n = 7;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + ring * 0.45;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(a);
        ctx.beginPath();
        const L = r * (0.55 + ring * 0.4), Wd = r * 0.34;
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(L * 0.4, -Wd, L * 0.85, -Wd * 0.6);
        for (let k = 0; k < 4; k++) ctx.quadraticCurveTo(L * 1.05, -Wd * 0.6 + Wd * 0.3 * (k + 0.5), L * 0.9, -Wd * 0.6 + Wd * 0.3 * (k + 1));
        ctx.quadraticCurveTo(L * 0.4, Wd, 0, 0);
        fillInk(ctx, ring ? GREEN.lettuce : '#c8e67a', 0.007, 0.7);
        ctx.restore();
      }
    }
    if (stage >= 4) dot(ctx, x, y, r * 0.16, '#e2f2a2', 0.006);
  },
  rosemary(ctx, x, y, r, stage, R) {
    // A woody bush of grey-green needles, and pale blue flowers.
    for (let i = 0; i < 9; i++) {
      const a = i * 0.7 + R() * 0.3;
      const ex = x + Math.cos(a) * r * 0.88, ey = y + Math.sin(a) * r * 0.88;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(ex, ey);
      ctx.strokeStyle = i % 2 ? '#a9c2ad' : GREEN.rosemary;
      ctx.lineWidth = r * 0.16;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(ex, ey);
      ctx.strokeStyle = '#5d6f58';
      ctx.lineWidth = r * 0.03;
      ctx.stroke();
    }
    if (stage >= 3) for (let i = 0; i < (stage >= 4 ? 6 : 3); i++) { const a = i * 1.1; dot(ctx, x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5, r * 0.1, PLANT_COLOR.rosemary, 0.004); }
  },
  marigold(ctx, x, y, r, stage, R) {
    for (let i = 0; i < 7; i++) leaf(ctx, x, y, r * 0.75, r * 0.22, i * 0.9 + R() * 0.3, GREEN.marigold);
    if (stage >= 3) {
      const n = stage >= 4 ? 3 : 2;
      for (let i = 0; i < n; i++) {
        const a = i * 2.1 + 0.3, d = n > 1 ? r * 0.35 : 0;
        const fx = x + Math.cos(a) * d, fy = y + Math.sin(a) * d;
        for (let k = 0; k < 10; k++) {
          const t = (k / 10) * Math.PI * 2;
          dot(ctx, fx + Math.cos(t) * r * 0.16, fy + Math.sin(t) * r * 0.16, r * 0.09, PLANT_COLOR.marigold, 0.003);
        }
        dot(ctx, fx, fy, r * 0.12, '#d96a10', 0.004);
      }
    }
  },
  fennel(ctx, x, y, r, stage, R) {
    // A haze of thread-fine fronds round a swollen bulb.
    for (let i = 0; i < 12; i++) {
      const a = i * 0.52 + R() * 0.2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + Math.cos(a + 0.3) * r * 0.5, y + Math.sin(a + 0.3) * r * 0.5, x + Math.cos(a) * r, y + Math.sin(a) * r);
      ctx.strokeStyle = GREEN.fennel;
      ctx.lineWidth = r * 0.12;
      ctx.lineCap = 'round';
      ctx.stroke();
      ink(ctx, 0.005, 0.6);
    }
    dot(ctx, x, y, r * 0.22, '#e9efc4', 0.008);
    if (stage >= 3) for (let i = 0; i < 3; i++) { const a = i * 2.1 + 0.9; dot(ctx, x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, r * 0.13, PLANT_COLOR.fennel, 0.005); }
  },
};

/** The fig is a tree, the whole bed's worth: drawn once, in the middle. */
function drawFig(ctx, stage, R) {
  const s = [0.2, 0.3, 0.5, 0.85, 0.9, 0][stage];
  if (!s) return;
  const r = 0.42 * s;
  shadow(ctx, 0.5, 0.5, r * 1.05);
  for (let i = 0; i < 9; i++) {
    const a = i * 0.7 + R() * 0.3, d = r * 0.48;
    const lx = 0.5 + Math.cos(a) * d, ly = 0.5 + Math.sin(a) * d;
    // A fig leaf: three to five broad lobes.
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(a);
    ctx.beginPath();
    for (let k = 0; k <= 24; k++) {
      const t = (k / 24) * Math.PI * 2, rr = r * 0.5 * (0.72 + 0.28 * Math.cos(t * 3));
      const px = Math.cos(t) * rr, py = Math.sin(t) * rr;
      if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.closePath();
    fillInk(ctx, i % 2 ? '#5b8f42' : GREEN.fig, 0.008, 0.8);
    ctx.restore();
  }
  if (stage >= 3) for (let i = 0; i < (stage >= 4 ? 7 : 4); i++) { const a = i * 0.9 + 0.2; dot(ctx, 0.5 + Math.cos(a) * r * 0.55, 0.5 + Math.sin(a) * r * 0.55, 0.03, stage >= 4 ? PLANT_COLOR.fig : '#8fae5a', 0.006); }
}

/** One plant at stage `stage` in a corner of the bed. */
function drawPlant(ctx, kind, x, y, r, stage, R) {
  if (stage === 0) {
    // The drill, and a seed in it.
    ctx.beginPath();
    ctx.ellipse(x, y, r * 0.42, r * 0.2, -0.3, 0, Math.PI * 2);
    fillInk(ctx, SOIL_DARK, 0.006, 0.5);
    dot(ctx, x, y, r * 0.07, '#e8dcb8', 0.004);
    return;
  }
  if (stage === 1) {
    shadow(ctx, x, y, r * 0.34);
    leaf(ctx, x, y, r * 0.55, r * 0.22, -2.4, GREEN[kind]);
    leaf(ctx, x, y, r * 0.55, r * 0.22, -0.7, GREEN[kind]);
    return;
  }
  const s = stage === 2 ? 0.72 : 1;
  shadow(ctx, x, y, r * s * 0.9);
  if (stage < 5) return DRAW[kind](ctx, x, y, r * s, stage, R);
  // PICKED, and left to go to seed (the gardener's way of keeping seed for
  // next year): the plant faded to straw, and pale seed heads over it.
  ctx.save();
  ctx.filter = 'saturate(0.55) sepia(0.4) brightness(1.04)';
  DRAW[kind](ctx, x, y, r, 3, R);
  ctx.restore();
  for (let i = 0; i < 5; i++) {
    const a = i * 1.26 + 0.3, d = r * (0.25 + 0.35 * (i % 2));
    dot(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, r * 0.09, '#e9dcb0', 0.004);
  }
}

/** The seed packet on its stick: the crop's colour on a little white card. */
function drawLabel(ctx, kind, x, y) {
  ctx.beginPath();
  ctx.moveTo(x, y + 0.02);
  ctx.lineTo(x + 0.03, y + 0.11);
  ink(ctx, 0.012, 0.9);
  ctx.beginPath();
  ctx.rect(x - 0.055, y - 0.05, 0.11, 0.08);
  fillInk(ctx, '#f4ecd6', 0.008);
  dot(ctx, x, y - 0.01, 0.022, PLANT_COLOR[kind], 0.004);
}

// --- the bed and its rill --------------------------------------------------

function drawGround(ctx, wet, R) {
  ctx.fillStyle = GRAVEL;
  ctx.fillRect(0, 0, 1, 1);
  ctx.fillStyle = GRAVEL_DOT;
  for (let i = 0; i < 26; i++) {
    const x = R(), y = R();
    if (x > 0.1 && x < 0.9 && y > 0.1 && y < 0.9) continue;
    ctx.fillRect(x, y, 0.012, 0.012);
  }
  // The bed: tilled earth inside a timber edge.
  const m = 0.07;
  ctx.beginPath();
  ctx.rect(m, m, 1 - 2 * m, 1 - 2 * m);
  ctx.fillStyle = wet ? SOIL_WET : SOIL;
  ctx.fill();
  ctx.lineWidth = 0.028;
  ctx.strokeStyle = TIMBER;
  ctx.stroke();
  ctx.beginPath();
  sketchRect(ctx, m, m, 1 - 2 * m, 1 - 2 * m, { seed: 7, rough: 0.5, passes: 1 });
  ink(ctx, 0.008, 0.7);
  // Furrows.
  ctx.beginPath();
  for (let i = 1; i < 6; i++) {
    const v = m + ((1 - 2 * m) * i) / 6;
    sketchLine(ctx, m + 0.03, v, 1 - m - 0.03, v, { seed: 11 + i, rough: 0.6, passes: 1 });
  }
  ink(ctx, 0.006, wet ? 0.25 : 0.32);
}

/** The rill's arms in the world's frame, `sides` already turned. */
function drawRill(ctx, sides, running) {
  if (!sides.length) return;
  const wKerb = 0.17, wChan = 0.1;
  const arm = (s, w) => {
    const [ex, ey] = SIDE_MID[s];
    ctx.moveTo(0.5, 0.5);
    ctx.lineTo(ex, ey);
  };
  ctx.save();
  ctx.lineCap = 'butt';
  // Kerbstones, then the channel, then (if it runs) the water and its light.
  for (const [w, color] of [[wKerb + 0.02, INK], [wKerb, STONE], [wChan, running ? WATER : DRY_BED]]) {
    ctx.beginPath();
    for (const s of sides) arm(s, w);
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.globalAlpha = color === INK ? 0.75 : 1;
    ctx.stroke();
    ctx.globalAlpha = 1;
    // The joint in the middle, square-cornered like cut stone.
    ctx.fillStyle = color;
    ctx.globalAlpha = color === INK ? 0.75 : 1;
    ctx.fillRect(0.5 - w / 2, 0.5 - w / 2, w, w);
    ctx.globalAlpha = 1;
  }
  // A stub ends in a little round basin.
  if (sides.length === 1) {
    ctx.beginPath(); ctx.arc(0.5, 0.5, 0.11, 0, Math.PI * 2); fillInk(ctx, STONE, 0.012);
    ctx.beginPath(); ctx.arc(0.5, 0.5, 0.075, 0, Math.PI * 2); ctx.fillStyle = running ? WATER : DRY_BED; ctx.fill();
  }
  if (running) {
    ctx.beginPath();
    for (const s of sides) {
      const [ex, ey] = SIDE_MID[s];
      const nx = (ey - 0.5) * 0.06, ny = -(ex - 0.5) * 0.06;
      ctx.moveTo(0.5 + (ex - 0.5) * 0.25 + nx, 0.5 + (ey - 0.5) * 0.25 + ny);
      ctx.lineTo(0.5 + (ex - 0.5) * 0.85 + nx, 0.5 + (ey - 0.5) * 0.85 + ny);
    }
    ctx.strokeStyle = WATER_LIT;
    ctx.lineWidth = 0.018;
    ctx.lineCap = 'round';
    ctx.stroke();
  } else {
    for (const s of sides) {
      const [ex, ey] = SIDE_MID[s];
      for (let k = 1; k < 4; k++) dot(ctx, 0.5 + (ex - 0.5) * (k / 4) + 0.01 * k, 0.5 + (ey - 0.5) * (k / 4), 0.012, STONE_DARK, 0.003);
    }
  }
  ctx.restore();
}

/** The fountain: an eight-sided basin, a jet in the middle, a rill out of every side. */
function drawFountain(ctx, running) {
  ctx.fillStyle = GRAVEL;
  ctx.fillRect(0, 0, 1, 1);
  drawRill(ctx, [0, 1, 2, 3], true);
  const oct = (r) => {
    ctx.beginPath();
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
      const px = 0.5 + Math.cos(a) * r, py = 0.5 + Math.sin(a) * r;
      if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.closePath();
  };
  shadow(ctx, 0.5, 0.5, 0.34);
  oct(0.36); fillInk(ctx, STONE, 0.014);
  oct(0.29); ctx.fillStyle = WATER; ctx.fill(); ink(ctx, 0.008, 0.6);
  // Rings where the jet falls.
  ctx.beginPath(); ctx.arc(0.5, 0.5, 0.17, 0, Math.PI * 2); ctx.strokeStyle = WATER_LIT; ctx.lineWidth = 0.012; ctx.stroke();
  ctx.beginPath(); ctx.arc(0.5, 0.5, 0.11, 0, Math.PI * 2); ctx.stroke();
  dot(ctx, 0.5, 0.5, 0.06, STONE, 0.01);
  dot(ctx, 0.49, 0.49, 0.025, '#eef8fc', 0.004);
}

/**
 * Paint one garden tile in unit space, in the WORLD's frame: `rot` turns the
 * rill, never the light. `look` is the mode's (giardino.js lookOf): the
 * stage digit, then 'r' if its rill runs and 'w' if its soil is watered.
 */
export function paintGardenTile(ctx, type, rot, look) {
  const stage = Number(look[0]) || 0;
  const running = look.includes('r');
  const wet = look.includes('w');
  const R = hand(seedOf(type.id.length, rot, stage));
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, 1, 1);
  ctx.clip();
  if (type.fountain) { drawFountain(ctx, running); ctx.restore(); return; }
  drawGround(ctx, wet, R);
  const sides = (type.feats.find((f) => f.type === 'rill')?.sides || []).map((s) => (s + rot) % 4);
  drawRill(ctx, sides, running);
  const kind = type.plant;
  if (kind === 'fig') drawFig(ctx, stage, R);
  else {
    const r = sides.length ? 0.19 : 0.22;
    const q = sides.length ? 0.27 : 0.285;
    for (const [qx, qy] of [[q, q], [1 - q, q], [1 - q, 1 - q], [q, 1 - q]]) drawPlant(ctx, kind, qx, qy, r, stage, R);
  }
  if (stage <= 1 && kind) {
    // The packet's stick goes in the middle, or between two corners where no
    // rill runs.
    const spot = !sides.length ? [0.5, 0.5] : [[0, [0.5, 0.15]], [3, [0.15, 0.5]], [1, [0.85, 0.5]], [2, [0.5, 0.85]]]
      .find(([s]) => !sides.includes(s))?.[1] || [0.13, 0.13];
    drawLabel(ctx, kind, spot[0], spot[1]);
  }
  ctx.restore();
}

const sprites = new Map();

/** A garden tile at `px` pixels square, as it looks this week, cached. */
export function gardenSprite(type, rot, look, px) {
  px = Math.max(16, Math.round(px));
  const key = `${type.id}|${rot & 3}|${look}|${px}`;
  const had = sprites.get(key);
  if (had) return had;
  const c = document.createElement('canvas');
  c.width = c.height = px;
  const k = c.getContext('2d', { willReadFrequently: true });
  k.scale(px, px);
  paintGardenTile(k, type, rot & 3, look);
  roughen(c, { amp: Math.max(0.4, px * 0.008), grain: 0.3 });
  roughen(c, { amp: Math.max(0.25, px * 0.003), grain: 0.07 });
  sprites.set(key, c);
  if (sprites.size > 600) sprites.delete(sprites.keys().next().value);
  return c;
}

// --- the wall ----------------------------------------------------------------

/**
 * The garden wall round the square, seen from above: old brick under a stone
 * coping, square piers with stone balls at the corners, and ivy over it here
 * and there. In px, round a square of `cols` x `rows` tiles of `z` px whose
 * top left is at (x0, y0). Its shadow falls down and to the right, over the
 * beds along the north and west walls.
 */
export function paintGardenWall(ctx, { z, x0, y0, cols, rows }) {
  const band = GARDEN_WALL.band * z;
  const W = cols * z, H = rows * z;
  const lw = Math.max(1, z * 0.022);
  const R = hand(seedOf(cols, rows, 3));
  const runs = [
    [x0 - band, y0 - band, W + 2 * band, band, true],
    [x0 - band, y0 + H, W + 2 * band, band, true],
    [x0 - band, y0, band, H, false],
    [x0 + W, y0, band, H, false],
  ];
  // The shadow first, down and to the right.
  ctx.save();
  ctx.fillStyle = 'rgba(30,18,8,0.28)';
  const sh = band * 0.35;
  ctx.fillRect(x0, y0, W, sh);
  ctx.fillRect(x0, y0, sh, H);
  ctx.fillRect(x0 - band + sh, y0 + H + band, W + 2 * band, sh);
  ctx.fillRect(x0 + W + band, y0 - band + sh, sh, H + 2 * band);
  ctx.restore();
  for (const [x, y, w, h, across] of runs) {
    ctx.fillStyle = '#a5583b';
    ctx.fillRect(x, y, w, h);
    // Brick courses along the run, and the coping stones on top of them.
    ctx.beginPath();
    const step = z * 0.09;
    if (across) for (let v = y + step; v < y + h - 1; v += step) sketchLine(ctx, x, v, x + w, v, { seed: seedOf(x, v), rough: 0.5, passes: 1 });
    else for (let u = x + step; u < x + w - 1; u += step) sketchLine(ctx, u, y, u, y + h, { seed: seedOf(u, y), rough: 0.5, passes: 1 });
    ctx.strokeStyle = '#e3cdb0';
    ctx.lineWidth = lw * 0.7;
    ctx.stroke();
    const cap = band * 0.42;
    ctx.fillStyle = '#d7cbb1';
    if (across) ctx.fillRect(x, y + (h - cap) / 2, w, cap); else ctx.fillRect(x + (w - cap) / 2, y, cap, h);
    ctx.beginPath();
    const len = across ? w : h;
    for (let t = z * 0.5; t < len; t += z * 0.5) {
      if (across) sketchLine(ctx, x + t, y + (h - cap) / 2, x + t, y + (h + cap) / 2, { seed: seedOf(t, 5), rough: 0.6, passes: 1 });
      else sketchLine(ctx, x + (w - cap) / 2, y + t, x + (w + cap) / 2, y + t, { seed: seedOf(t, 6), rough: 0.6, passes: 1 });
    }
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw * 0.6;
    ctx.globalAlpha = 0.5;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    sketchRect(ctx, x, y, w, h, { seed: seedOf(x, y, 1), rough: 0.7 });
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
  // Ivy, in a few clumps along the walls.
  for (let i = 0; i < 10; i++) {
    const side = i % 4, t = 0.1 + R() * 0.8;
    const [cx, cy] = side === 0 ? [x0 + W * t, y0 - band / 2] : side === 1 ? [x0 + W + band / 2, y0 + H * t]
      : side === 2 ? [x0 + W * t, y0 + H + band / 2] : [x0 - band / 2, y0 + H * t];
    for (let k = 0; k < 6; k++) {
      const a = R() * Math.PI * 2, d = R() * band * 0.7;
      ctx.save();
      ctx.translate(cx + Math.cos(a) * d, cy + Math.sin(a) * d);
      ctx.scale(z, z);
      leaf(ctx, 0, 0, 0.1, 0.05, R() * Math.PI * 2, k % 2 ? '#3f6e34' : '#557f3e');
      ctx.restore();
    }
  }
  // Square piers at the corners, a stone ball on each.
  for (const [px, py] of [[x0 - band, y0 - band], [x0 + W, y0 - band], [x0 + W, y0 + H], [x0 - band, y0 + H]]) {
    const p = band * 1.3, o = (p - band) / 2;
    ctx.fillStyle = '#b06446';
    ctx.fillRect(px - o, py - o, p, p);
    ctx.beginPath();
    sketchRect(ctx, px - o, py - o, p, p, { seed: seedOf(px, py, 2), rough: 0.6 });
    ctx.strokeStyle = INK; ctx.lineWidth = lw; ctx.stroke();
    ctx.beginPath();
    ctx.arc(px + band / 2, py + band / 2, band * 0.34, 0, Math.PI * 2);
    ctx.fillStyle = '#ddd2b9'; ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = lw * 0.8; ctx.stroke();
    ctx.beginPath();
    ctx.arc(px + band * 0.42, py + band * 0.42, band * 0.1, 0, Math.PI * 2);
    ctx.fillStyle = '#f3ecdc'; ctx.fill();
  }
}
