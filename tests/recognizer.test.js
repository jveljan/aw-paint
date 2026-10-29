
import test from 'node:test';
import assert from 'node:assert';
import { recognize, resample } from '../lib/recognizer.js';
import { GLYPHS } from '../lib/font.js';

// seeded PRNG (test only)
function prng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const noisy = (pts, rnd, amp) => pts.map(([x, y]) => [x + (rnd() - 0.5) * 2 * amp, y + (rnd() - 0.5) * 2 * amp]);
const poly = (k, n = 60) => resample(k, n);
const ell = (cx, cy, rx, ry, n = 80) => Array.from({ length: n + 1 }, (_, i) => { const t = (i / n) * 6.283 - 1.57; return [cx + rx * Math.cos(t), cy + ry * Math.sin(t)]; });
const place = (g, x, y, w, h) => g.map(([u, v]) => [x + u * w, y + v * h]);

function rate(make, expect, runs = 40) {
  let ok = 0;
  for (let i = 0; i < runs; i++) {
    const rnd = prng(i + 1);
    const r = recognize(make(rnd, i));
    if (r && r.type === expect.type && (!expect.char || r.geometry.char === expect.char)) ok++;
  }
  return ok / runs;
}
const scale = (i) => 120 + (i % 5) * 40;

test('shapes snap at >=95%', () => {
  const cases = {
    line: (r, i) => noisy(poly([[100, 100], [100 + scale(i), 160 + i]], 40), r, 1.5),
    circle: (r, i) => noisy(ell(300, 300, scale(i) / 2, scale(i) / 2), r, 2),
    rectangle: (r, i) => noisy(poly([[100, 100], [100 + scale(i), 100], [100 + scale(i), 100 + scale(i) * 0.7], [100, 100 + scale(i) * 0.7], [100, 100]], 80), r, 2),
    triangle: (r, i) => noisy(poly([[200, 100], [200 + scale(i) / 2, 100 + scale(i)], [200 - scale(i) / 2, 100 + scale(i)], [200, 100]], 80), r, 2),
  };
  for (const [type, make] of Object.entries(cases)) {
    const s = rate(make, { type });
    assert.ok(s >= 0.95, `${type} ${s}`);
  }
});

test('letters recognized at >=90%', () => {
  for (const ch of ['A', 'E', 'L', 'O', 'T', 'X', '1']) {
    const s = rate((r, i) => noisy(place(GLYPHS[ch], 100, 100, 50 + (i % 3) * 10, 100 + (i % 4) * 15), r, 2), { type: 'letter', char: ch });
    assert.ok(s >= 0.9, `${ch} ${s}`);
  }
});

test('scribble and tiny strokes unchanged', () => {
  const rnd = prng(7);
  const scribble = Array.from({ length: 60 }, () => [rnd() * 300, rnd() * 300]);
  assert.strictEqual(recognize(scribble), null);
  assert.strictEqual(recognize([[1, 1], [2, 2], [3, 3]]), null);
});

test('deterministic: identical output', () => {
  const pts = noisy(ell(300, 300, 80, 80), prng(3), 2);
  assert.strictEqual(JSON.stringify(recognize(pts)), JSON.stringify(recognize(pts)));
});

test('deterministic: same input, same output', () => {
  const pts = Array.from({ length: 60 }, (_, i) => { const t = (i / 59) * 6.283; return [400 + 80 * Math.cos(t) + (i % 3), 300 + 80 * Math.sin(t)]; });
  assert.deepStrictEqual(recognize(pts), recognize(pts.map((p) => p.slice())));
});
