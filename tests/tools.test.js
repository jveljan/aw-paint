// Ported from the old server API tests: same behaviour, now against lib/* and the agent CLI.
import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createState, HISTORY_MAX } from '../lib/model/state.js';
import { createTools, userStroke, ToolError } from '../lib/model/tools.js';
import { isNewer, newAgentObjects } from '../lib/model/sync.js';
import { run } from '../cli/draw.js';
import { renderPng } from '../cli/render-png.js';

const CLI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'cli', 'draw.js');
const tmpFile = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'paint-')), 'drawing', 'canvas.json');

test('tools list has 5 schemas', () => {
  assert.deepStrictEqual(createTools(createState()).schemas.map((t) => t.name), ['draw_line', 'draw_shape', 'draw_text', 'clear', 'get_canvas']);
});

test('tools: draw, get_canvas, bad input unchanged, undo/clear', () => {
  const s = createState(), t = createTools(s);
  t.call('draw_line', { x1: 10, y1: 10, x2: 300, y2: 200, color: '#ff0000' });
  t.call('draw_shape', { shape: 'circle', geometry: { cx: 500, cy: 400, r: 50 } });
  t.call('draw_text', { x: 50, y: 50, text: 'HI 5' });
  const g = t.call('get_canvas', {});
  assert.strictEqual(g.objects.length, 3);
  assert.deepStrictEqual([g.width, g.height], [1200, 800]);
  assert.ok(g.objects.every((o) => o.source === 'agent' && o.paths.length));
  const bads = [
    ['draw_line', { x1: 1 }], ['draw_line', { x1: 'a', y1: 1, x2: 1, y2: 1 }], ['draw_line', { x1: 1, y1: 1, x2: 99999, y2: 1 }],
    ['draw_shape', { shape: 'hexagon', geometry: {} }], ['draw_text', { x: 1, y: 1, text: 'A'.repeat(201) }],
    ['draw_line', { x1: 1, y1: 1, x2: 2, y2: 2, color: 'red' }], ['nope', {}], ['clear', null], ['clear', []],
  ];
  for (const [n, a] of bads) assert.throws(() => t.call(n, a), ToolError, n);
  assert.strictEqual(s.snapshot().objects.length, 3);
  s.undo();
  assert.strictEqual(s.snapshot().objects.length, 2);
  t.call('clear', {});
  assert.strictEqual(s.snapshot().objects.length, 0);
  s.undo();
  assert.strictEqual(s.snapshot().objects.length, 2);
});

test('strokes: auto snaps a circle (one undo), auto off keeps raw, eraser is white', () => {
  const s = createState();
  const pts = Array.from({ length: 60 }, (_, i) => { const t = (i / 59) * 6.283; return [400 + 80 * Math.cos(t) + (i % 3), 300 + 80 * Math.sin(t)]; });
  assert.strictEqual(userStroke(s, { tool: 'brush', color: '#7c5cff', size: 6, points: pts, auto: true }).type, 'circle');
  assert.strictEqual(s.snapshot().objects.length, 1);
  s.undo();
  assert.strictEqual(s.snapshot().objects.length, 0);
  assert.strictEqual(userStroke(s, { tool: 'brush', points: pts, auto: false }).type, 'stroke');
  assert.throws(() => userStroke(s, { tool: 'brush', points: [] }), ToolError);
  assert.strictEqual(userStroke(s, { tool: 'eraser', points: pts }).color, '#ffffff');
});

test('state: serializable round trip keeps ids, seq and undo; history is bounded', () => {
  const a = createState();
  createTools(a).call('draw_line', { x1: 1, y1: 1, x2: 50, y2: 50 });
  const b = createState(JSON.parse(JSON.stringify(a.toJSON())));
  assert.strictEqual(b.seq, a.seq);
  assert.strictEqual(b.toJSON().lastCall.name, 'draw_line');
  assert.strictEqual(b.add('line', { x1: 0, y1: 0, x2: 1, y2: 1 }, { color: '#000', size: 1 }).id, 2);
  assert.ok(b.undo() && b.undo() && !b.undo());
  for (let i = 0; i < HISTORY_MAX + 10; i++) b.clear();
  assert.strictEqual(b.toJSON().history.length, HISTORY_MAX);
});

test('sync: newer docs detected, only new agent objects animate', () => {
  assert.ok(isNewer({ seq: 3 }, 2) && !isNewer({ seq: 2 }, 2) && !isNewer(null, 0));
  const prev = [{ id: 1, source: 'agent' }];
  const next = [...prev, { id: 2, source: 'user' }, { id: 3, source: 'agent' }];
  assert.deepStrictEqual(newAgentObjects(prev, next).map((o) => o.id), [3]);
});

test('cli: tools persist to the file, batch is atomic, get_canvas --png writes a PNG', () => {
  const f = tmpFile();
  assert.strictEqual(run(['list'], f).tools.length, 5);
  run(['draw_line', '{"x1":10,"y1":10,"x2":300,"y2":200}'], f);
  run(['batch', JSON.stringify([{ name: 'draw_shape', args: { shape: 'circle', geometry: { cx: 500, cy: 400, r: 50 } } }, { name: 'draw_text', args: { x: 5, y: 5, text: 'OK' } }])], f);
  assert.strictEqual(JSON.parse(fs.readFileSync(f, 'utf8')).objects.length, 3);
  assert.throws(() => run(['batch', JSON.stringify([{ name: 'clear', args: {} }, { name: 'nope', args: {} }])], f), ToolError);
  assert.throws(() => run(['draw_line', '{bad'], f), ToolError);
  assert.strictEqual(JSON.parse(fs.readFileSync(f, 'utf8')).objects.length, 3);
  const g = run(['get_canvas', '--png'], f);
  const png = fs.readFileSync(g.png);
  assert.strictEqual(png.subarray(1, 4).toString(), 'PNG');
  assert.strictEqual(png.readUInt32BE(16), 1200); assert.strictEqual(png.readUInt32BE(20), 800);
  assert.strictEqual(run(['undo'], f).ok, true);
  assert.strictEqual(JSON.parse(fs.readFileSync(f, 'utf8')).objects.length, 2); // undo is per call, not per batch
});

test('cli: real process, default file under cwd, exit 1 with JSON error', () => {
  const cwd = path.dirname(path.dirname(tmpFile()));
  const out = JSON.parse(execFileSync(process.execPath, [CLI, 'draw_line', '{"x1":1,"y1":1,"x2":50,"y2":50}'], { cwd, encoding: 'utf8' }));
  assert.strictEqual(out.object.source, 'agent');
  assert.ok(fs.existsSync(path.join(cwd, 'drawing', 'canvas.json')));
  let err;
  try { execFileSync(process.execPath, [CLI, 'nope', '{}'], { cwd, encoding: 'utf8' }); } catch (e) { err = e; }
  assert.strictEqual(err.status, 1);
  assert.deepStrictEqual(JSON.parse(err.stdout), { ok: false, error: 'unknown tool' });
});

test('png: a drawn line changes pixels', () => {
  const a = renderPng([], 100, 100);
  const b = renderPng([{ color: '#000', size: 3, paths: [[[0, 0], [99, 99]]] }], 100, 100);
  assert.notDeepStrictEqual(a, b);
});
