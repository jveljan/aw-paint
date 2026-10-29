
// Deterministic stroke recognizer: no randomness, no time, no ML.
// recognize(points) -> {type, geometry} or null (leave stroke unchanged).
import { GLYPHS, AMBIGUOUS } from './font.js';

// Tunable constants (see docs/DESIGN-drawing.md)
const N = 64;               // resample count for shapes
const CLOSED_GAP = 0.2;     // end gap < 0.2 * path length => closed
const LINE_DEV = 0.04;      // max deviation from chord < 4% of chord
const CIRCLE_CV = 0.1;      // radius stddev/mean
const RECT_CV_MIN = 0.06;   // above this a 4-corner shape is a rectangle, not a circle
const DP_EPS = 0.06;        // Douglas-Peucker epsilon x bbox diagonal
const RIGHT_TOL = 30;       // degrees from 90 for rectangle corners
const LETTER_N = 32;
const LETTER_MAX = 0.18;    // max mean point distance (unit box) to accept a letter
const LETTER_MARGIN = 0.02; // min gap to the second-best letter
const MIN_LEN = 20;         // px: shorter strokes are never snapped

const d2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const r1 = (n) => Math.round(n * 10) / 10;
const pathLen = (p) => { let l = 0; for (let i = 1; i < p.length; i++) l += d2(p[i - 1], p[i]); return l; };

export function resample(p, n) {
  const total = pathLen(p);
  if (total === 0) return Array.from({ length: n }, () => p[0].slice());
  const step = total / (n - 1), out = [p[0].slice()];
  let acc = 0, i = 1, prev = p[0];
  while (out.length < n - 1 && i < p.length) {
    const seg = d2(prev, p[i]);
    if (acc + seg >= step && seg > 0) {
      const t = (step - acc) / seg;
      const q = [prev[0] + (p[i][0] - prev[0]) * t, prev[1] + (p[i][1] - prev[1]) * t];
      out.push(q); prev = q; acc = 0;
    } else { acc += seg; prev = p[i]; i++; }
  }
  while (out.length < n) out.push(p[p.length - 1].slice());
  return out;
}

function distToSeg(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
  if (l2 === 0) return d2(p, a);
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2));
  return d2(p, [a[0] + t * dx, a[1] + t * dy]);
}

function dp(p, eps) {
  if (p.length < 3) return p.slice();
  let mi = 0, md = -1;
  for (let i = 1; i < p.length - 1; i++) {
    const d = distToSeg(p[i], p[0], p[p.length - 1]);
    if (d > md) { md = d; mi = i; }
  }
  if (md <= eps) return [p[0], p[p.length - 1]];
  return dp(p.slice(0, mi + 1), eps).slice(0, -1).concat(dp(p.slice(mi), eps));
}

function bbox(p) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of p) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
}

function corners(p, eps) {
  // closed polygon: split at the point farthest from the start, simplify both halves
  let fi = 0, fd = -1;
  for (let i = 0; i < p.length; i++) { const d = d2(p[i], p[0]); if (d > fd) { fd = d; fi = i; } }
  const a = dp(p.slice(0, fi + 1), eps), b = dp(p.slice(fi).concat([p[0]]), eps);
  const c = a.slice(0, -1).concat(b.slice(0, -1));
  // merge near-collinear duplicates by removing the closing duplicate
  return c;
}

function angleAt(a, b, c) {
  const v1 = [a[0] - b[0], a[1] - b[1]], v2 = [c[0] - b[0], c[1] - b[1]];
  const cos = (v1[0] * v2[0] + v1[1] * v2[1]) / ((Math.hypot(...v1) * Math.hypot(...v2)) || 1);
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
}

function unit(p) {
  const b = bbox(p), w = b.w || 1, h = b.h || 1;
  return p.map(([x, y]) => [(x - b.x0) / w, (y - b.y0) / h]);
}

const TEMPLATES = Object.keys(GLYPHS).filter((k) => !AMBIGUOUS.has(k)).map((k) => ({ k, pts: resample(unit(GLYPHS[k]), LETTER_N) }));

function letter(pts) {
  const b = bbox(pts);
  if (Math.max(b.w, b.h) < MIN_LEN) return null;
  const u = resample(unit(pts), LETTER_N);
  const scores = TEMPLATES.map((t) => {
    let s = 0;
    for (let i = 0; i < LETTER_N; i++) s += d2(u[i], t.pts[i]);
    return { k: t.k, s: s / LETTER_N };
  });
  scores.sort((a, c) => a.s - c.s || (a.k < c.k ? -1 : 1));
  if (scores[0].s > LETTER_MAX || scores[1].s - scores[0].s < LETTER_MARGIN) return null;
  const g = unit(GLYPHS[scores[0].k]);
  return {
    type: 'letter',
    geometry: { char: scores[0].k, points: g.map(([x, y]) => [r1(b.x0 + x * b.w), r1(b.y0 + y * b.h)]) },
  };
}

export function recognize(points) {
  if (!Array.isArray(points) || points.length < 3) return null;
  const len = pathLen(points);
  if (len < MIN_LEN) return null;
  const p = resample(points, N);
  const first = p[0], last = p[N - 1];
  const chord = d2(first, last);
  const closed = chord < CLOSED_GAP * len;
  if (!closed) {
    let dev = 0;
    for (const q of p) dev = Math.max(dev, distToSeg(q, first, last));
    if (chord > 0 && dev < LINE_DEV * chord) {
      return { type: 'line', geometry: { x1: r1(points[0][0]), y1: r1(points[0][1]), x2: r1(points[points.length - 1][0]), y2: r1(points[points.length - 1][1]) } };
    }
    return letter(points);
  }
  const b = bbox(p), diag = Math.hypot(b.w, b.h);
  const cx = p.reduce((s, q) => s + q[0], 0) / N, cy = p.reduce((s, q) => s + q[1], 0) / N;
  const rad = p.map((q) => d2(q, [cx, cy]));
  const mean = rad.reduce((s, v) => s + v, 0) / N;
  const cv = Math.sqrt(rad.reduce((s, v) => s + (v - mean) ** 2, 0) / N) / mean;
  const aspect = b.w / (b.h || 1);
  const cs = corners(p, DP_EPS * diag);
  if (cs.length === 4) {
    const ok = cs.every((c, i) => Math.abs(angleAt(cs[(i + 3) % 4], c, cs[(i + 1) % 4]) - 90) <= RIGHT_TOL);
    if (ok && cv > RECT_CV_MIN) return { type: 'rectangle', geometry: { x: r1(b.x0), y: r1(b.y0), w: r1(b.w), h: r1(b.h) } };
  }
  if (cv < CIRCLE_CV && aspect > 0.75 && aspect < 1.33) {
    return { type: 'circle', geometry: { cx: r1((b.x0 + b.x1) / 2), cy: r1((b.y0 + b.y1) / 2), r: r1((b.w + b.h) / 4) } };
  }
  if (cs.length === 3) return { type: 'triangle', geometry: { points: cs.map((c) => [r1(c[0]), r1(c[1])]) } };
  return letter(points);
}

