// Toolbar, pointer drawing and the demo button. Strokes are committed through `mutate` (app.js).
import { createTools, userStroke } from '../../lib/model/tools.js';
import { newAgentObjects } from '../../lib/model/sync.js';

const $ = (id) => document.getElementById(id);

export function initInput({ view, mutate }) {
  const c = $('c'), sizeEl = $('size'), autoEl = $('auto');
  let tool = 'brush', col = '#7c5cff', pts = null;

  // toolbar
  document.querySelectorAll('#tools button').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('#tools button').forEach((o) => o.classList.remove('on'));
    b.classList.add('on'); tool = b.dataset.tool;
  }));
  document.querySelectorAll('#sw b').forEach((b) => {
    b.style.background = b.dataset.c;
    b.addEventListener('click', () => {
      document.querySelectorAll('#sw b').forEach((o) => o.classList.remove('on'));
      b.classList.add('on'); col = b.dataset.c;
    });
  });
  $('undo').addEventListener('click', () => mutate((s) => s.undo()));
  $('clr').addEventListener('click', () => mutate((s) => s.clear('user')));
  $('png').addEventListener('click', () => view.exportPng());

  // pointer drawing
  const pos = (e) => { const r = c.getBoundingClientRect(); return [((e.clientX - r.left) * c.width) / r.width, ((e.clientY - r.top) * c.height) / r.height]; };
  const pstyle = () => ({ color: tool === 'eraser' ? '#ffffff' : col, size: tool === 'eraser' ? +sizeEl.value * 3 : +sizeEl.value });
  const freehand = () => tool === 'brush' || tool === 'eraser';

  c.addEventListener('pointerdown', (e) => {
    c.setPointerCapture(e.pointerId);
    const p = pos(e);
    if (tool === 'text') {
      const text = prompt('Text (A-Z, 0-9)'); if (!text) return;
      mutate((s) => userStroke(s, { tool: 'text', text, points: [p], ...pstyle() })); return;
    }
    pts = [p];
  });
  c.addEventListener('pointermove', (e) => {
    if (!pts) return;
    const p = pos(e);
    if (freehand()) pts.push(p); else pts[1] = p;
    const z = pts[pts.length - 1], a = pts[0];
    const paths = freehand() ? [pts]
      : tool === 'line' ? [[a, z]]
        : tool === 'rectangle' ? [[a, [z[0], a[1]], z, [a[0], z[1]], a]]
          : [Array.from({ length: 49 }, (_, i) => { const t = (i / 48) * 6.2832, r = Math.hypot(z[0] - a[0], z[1] - a[1]); return [a[0] + r * Math.cos(t), a[1] + r * Math.sin(t)]; })];
    view.preview = { ...pstyle(), paths }; view.render();
  });
  c.addEventListener('pointerup', async () => {
    if (!pts) return;
    const done = pts; pts = null;
    if (done.length < 2 && !freehand()) { view.preview = null; view.render(); return; }
    if (done.length === 1) done.push([done[0][0] + 0.1, done[0][1]]);
    const t = tool, st = pstyle(), auto = autoEl.checked;
    view.preview = null;
    await mutate((s) => userStroke(s, { tool: t, points: done, auto, ...st }));
  });

  // demo: runs the same agent tools in the page (source "agent"), so it animates like a real agent call
  $('play').addEventListener('click', () => mutate((s) => {
    const tools = createTools(s), before = s.snapshot().objects;
    for (const [n, a] of [
      ['draw_line', { x1: 380, y1: 110, x2: 640, y2: 110, color: '#0ea5e9', size: 5 }],
      ['draw_shape', { shape: 'rectangle', geometry: { x: 400, y: 300, w: 220, h: 110 }, color: '#22c55e', size: 5 }],
      ['draw_shape', { shape: 'circle', geometry: { cx: 800, cy: 400, r: 80 }, color: '#ef4444', size: 5 }],
      ['draw_text', { x: 380, y: 160, text: 'HELLO', fontSize: 80, color: '#7c5cff', size: 6 }],
    ]) { tools.call(n, a); view.showCall({ name: n, args: a }); }
    for (const o of newAgentObjects(before, s.snapshot().objects)) view.enqueue(o.id);
    view.runQueue();
  }));
}
