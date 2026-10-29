
// Pure geometry: turn a shape type + geometry into polylines ("paths").
import { GLYPHS } from '../recognition/font.js';
export const r1 = (n) => Math.round(n * 10) / 10;
const pt = (p) => [r1(p[0]), r1(p[1])];

export function circlePath(cx, cy, r, n = 48) {
  const p = [];
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2;
    p.push([r1(cx + r * Math.cos(t)), r1(cy + r * Math.sin(t))]);
  }
  return p;
}

// Text: glyph cell is 0.6*fs wide, fs high; (x,y) is the top-left.
export function textPaths(x, y, text, fs) {
  const out = [];
  let cx = x;
  for (const ch of String(text).toUpperCase()) {
    const gl = GLYPHS[ch];
    if (gl) out.push(gl.map(([u, v]) => [r1(cx + u * fs * 0.6), r1(y + v * fs)]));
    cx += fs * 0.8;
  }
  return out;
}

export function pathsFor(type, g) {
  switch (type) {
    case 'line': return [[[g.x1, g.y1], [g.x2, g.y2]].map(pt)];
    case 'circle': return [circlePath(g.cx, g.cy, g.r)];
    case 'rectangle': return [[[g.x, g.y], [g.x + g.w, g.y], [g.x + g.w, g.y + g.h], [g.x, g.y + g.h], [g.x, g.y]].map(pt)];
    case 'triangle': return [[...g.points, g.points[0]].map(pt)];
    case 'stroke': return [g.points.map(pt)];
    case 'letter': return [g.points.map(pt)];
    case 'text': return textPaths(g.x, g.y, g.text, g.fontSize || 32);
    default: return [];
  }
}

