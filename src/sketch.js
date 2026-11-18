// ---------------------------------------------------------------------------
// Strokes drawn the way a hand draws them.
//
// ink.js bends a finished PICTURE, which is right for anything drawn once and
// kept (a tile sprite, Starà's castle walls). The lines drawn live, every
// frame, want the same hand without paying for a pixel pass, so they are
// made hand-drawn as PATHS instead, the way rough.js does it:
//
//   - a straight line is a shallow curve: its middle bowed a little off true;
//   - its ends land a hair off where they were aimed, and run a touch long;
//   - and it is drawn twice, the two passes never quite on top of each other,
//     which is the single thing that most reads as ink rather than vector.
//
// Every stroke is SEEDED from where it is, so the same line wobbles the same
// way every frame. A line that re-rolled its wobble sixty times a second
// would crawl.
//
// These functions add to the current path and leave the stroke to the
// caller, so a whole grid is one beginPath and one stroke.
// ---------------------------------------------------------------------------

/** A small seeded PRNG: the same seed, the same hand. */
export function hand(seed) {
  let a = (seed >>> 0) || 1;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A seed from a handful of numbers (a position, mostly). */
export function seedOf(...nums) {
  let h = 2166136261;
  for (const n of nums) {
    h ^= Math.round(n * 100) | 0;
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * One line from (x1, y1) to (x2, y2), drawn by hand. `rough` scales every
 * wander (1 is a steady pen); `passes` is how many times it is gone over.
 */
export function sketchLine(ctx, x1, y1, x2, y2, { seed = 1, rough = 1, passes = 2 } = {}) {
  const r = hand(seed);
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ux = (x2 - x1) / len, uy = (y2 - y1) / len;
  const bow = Math.min(len * 0.018, 2.4) * rough;
  const jit = 0.7 * rough;
  for (let p = 0; p < passes; p++) {
    const over = (r() * 0.6 + 0.2) * Math.min(len * 0.02, 2.5) * rough;
    const ax = x1 - ux * over * r() + (r() - 0.5) * jit;
    const ay = y1 - uy * over * r() + (r() - 0.5) * jit;
    const bx = x2 + ux * over + (r() - 0.5) * jit;
    const by = y2 + uy * over + (r() - 0.5) * jit;
    const t = 0.35 + r() * 0.3;
    const off = (r() - 0.5) * 2 * bow;
    const mx = ax + (bx - ax) * t - uy * off;
    const my = ay + (by - ay) * t + ux * off;
    ctx.moveTo(ax, ay);
    ctx.quadraticCurveTo(mx, my, bx, by);
  }
}

/** A rectangle as four hand-drawn sides. */
export function sketchRect(ctx, x, y, w, h, { seed = 1, rough = 1, passes = 2 } = {}) {
  sketchLine(ctx, x, y, x + w, y, { seed: seed + 1, rough, passes });
  sketchLine(ctx, x + w, y, x + w, y + h, { seed: seed + 2, rough, passes });
  sketchLine(ctx, x + w, y + h, x, y + h, { seed: seed + 3, rough, passes });
  sketchLine(ctx, x, y + h, x, y, { seed: seed + 4, rough, passes });
}

/**
 * A circle drawn the way a hand draws one: not quite round, starting
 * somewhere, and running a little past where it began.
 */
export function sketchCircle(ctx, cx, cy, radius, { seed = 1, rough = 1, passes = 2 } = {}) {
  const r = hand(seed);
  const steps = Math.max(14, Math.round(radius * 0.9));
  for (let p = 0; p < passes; p++) {
    const start = r() * Math.PI * 2;
    const sweep = Math.PI * 2 * (1.04 + r() * 0.08);
    const squash = 1 + (r() - 0.5) * 0.06 * rough;
    const wob = radius * 0.025 * rough;
    const phase = r() * Math.PI * 2;
    for (let i = 0; i <= steps; i++) {
      const a = start + sweep * (i / steps);
      const rr = radius + Math.sin(a * 3 + phase) * wob;
      const x = cx + Math.cos(a) * rr * squash;
      const y = cy + Math.sin(a) * rr / squash;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
  }
}
