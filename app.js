// Paint applet: canvas UI. Pure logic in lib/*, data only through data.js.
// The agent draws via cli/draw.js (writes drawing/canvas.json); we poll that file while visible and animate agent objects.
import { bootApplet } from '/core/applet-boot.js';
import { loadDoc, saveDoc, DOC_PATH } from './data.js';
import { createState } from './lib/state.js';
import { createTools, userStroke } from './lib/tools.js';
import { isNewer, newAgentObjects, callText } from './lib/sync.js';

const $ = (id) => document.getElementById(id);
const c = $('c'), x = c.getContext('2d');
const logEl = $('log'), cur = $('cur'), badge = $('badge'), sizeEl = $('size'), autoEl = $('auto');
const POLL_MS = 1000;

let project = '', ready = false;
let state = createState(null), objs = [];
let tool = 'brush', col = '#7c5cff';
const prog = new Map();        // id -> 0..1 while an agent object is animating
const queue = [];              // ids waiting to animate
let animating = false, preview = null, timer = null, busy = false;

const host = bootApplet('drawing-applet-with-agent-tool-api', {
  title: 'Paint',
  onShow: () => startPoll(),
  onHide: () => stopPoll(),
  onProject: (p) => { if (ready) switchProject(p); },
});

const sleep = (t) => new Promise((r) => setTimeout(r, t));
const pathsLen = (paths) => paths.reduce((s, p) => s + p.reduce((a, q, i) => a + (i ? Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1]) : 0), 0), 0);
const toast = (text) => { if (!host.cmd('toast', { text })) logEl.textContent = text; };

// ---- rendering
function drawObj(o, f) { // draw paths up to fraction f; returns the last point drawn
  x.strokeStyle = o.color; x.fillStyle = o.color; x.lineWidth = o.size;
  let left = pathsLen(o.paths) * f, last = null;
  for (const p of o.paths) {
    if (!p.length) continue;
    x.beginPath(); x.moveTo(p[0][0], p[0][1]); last = p[0];
    for (let i = 1; i < p.length && left > 0; i++) {
      const d = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
      if (d <= left) { x.lineTo(p[i][0], p[i][1]); last = p[i]; left -= d; }
      else { const t = left / d; last = [p[i - 1][0] + (p[i][0] - p[i - 1][0]) * t, p[i - 1][1] + (p[i][1] - p[i - 1][1]) * t]; x.lineTo(last[0], last[1]); left = 0; }
    }
    if (o.fill && f >= 1) x.fill();
    x.stroke();
    if (left <= 0 && f < 1) break;
  }
  return last;
}
function render() {
  x.lineCap = x.lineJoin = 'round';
  x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
  for (const o of objs) { const f = prog.has(o.id) ? prog.get(o.id) : 1; if (f > 0) drawObj(o, f); }
  if (preview) drawObj(preview, 1);
}
function toScreen(p) {
  const r = c.getBoundingClientRect();
  cur.style.left = r.left + (p[0] * r.width) / c.width + 'px';
  cur.style.top = r.top + (p[1] * r.height) / c.height + 'px';
}
async function runQueue() {
  if (animating) return;
  animating = true; badge.classList.add('on'); cur.style.display = 'block';
  while (queue.length) {
    const id = queue.shift(), o = objs.find((q) => q.id === id);
    if (!o) continue;
    const dur = Math.max(400, pathsLen(o.paths) / 0.8), t0 = performance.now();
    for (;;) {
      const f = Math.min(1, (performance.now() - t0) / dur);
      if (!objs.includes(o)) break;
      prog.set(id, f); render();
      const p = drawObj(o, f); if (p) toScreen(p);
      if (f >= 1) break;
      await new Promise(requestAnimationFrame);
    }
    prog.delete(id); render(); await sleep(120);
  }
  animating = false; badge.classList.remove('on'); cur.style.display = 'none';
}
function showCall(call) {
  const t = callText(call);
  if (!t) return;
  logEl.textContent = t[0] + ' ';
  const s = document.createElement('span'); s.style.color = '#8b91a1'; s.textContent = t[1]; logEl.append(s);
}

// ---- document sync
function adopt(doc, animate) {
  const before = objs;
  state = createState(doc);
  objs = state.snapshot().objects;
  for (const id of [...prog.keys()]) if (!objs.some((o) => o.id === id)) prog.delete(id);
  if (animate) for (const o of newAgentObjects(before, objs)) { prog.set(o.id, 0); queue.push(o.id); }
  if (doc && doc.lastCall) showCall(doc.lastCall);
  render();
  if (queue.length) runQueue();
}
async function pull(animate = true) {
  if (!project || busy) return;
  try { const d = await loadDoc(project); if (isNewer(d, state.seq)) adopt(d, animate); } catch (e) { $('where').textContent = 'load failed: ' + (e.message || e); }
}
// Mutate: pull latest first (agent may have drawn), apply locally, save.
async function mutate(fn) {
  busy = true;
  try {
    if (project) { try { const d = await loadDoc(project); if (isNewer(d, state.seq)) adopt(d, true); } catch { /* offline: local only */ } }
    const res = fn(state);
    objs = state.snapshot().objects;
    render();
    if (project) await saveDoc(project, state.toJSON());
    return res;
  } catch (e) { toast(e.message || String(e)); }
  finally { busy = false; }
}
function startPoll() { stopPoll(); if (project) timer = setInterval(() => pull(true), POLL_MS); }
function stopPoll() { if (timer) clearInterval(timer); timer = null; }
async function switchProject(p) {
  project = typeof p === 'string' ? p : (p && (p.key || p.name)) || '';
  $('where').textContent = project ? `${project} · ${DOC_PATH}` : 'no project: not saved';
  state = createState(null); objs = []; prog.clear(); queue.length = 0;
  render();
  await pull(false);
  if (host.visible()) startPoll();
}

// ---- toolbar
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
$('png').addEventListener('click', () => { // client-side export of what is on screen
  render();
  c.toBlob((b) => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'drawing.png'; a.click(); });
});

// ---- user drawing
let pts = null;
const pos = (e) => { const r = c.getBoundingClientRect(); return [((e.clientX - r.left) * c.width) / r.width, ((e.clientY - r.top) * c.height) / r.height]; };
const pstyle = () => ({ color: tool === 'eraser' ? '#ffffff' : col, size: tool === 'eraser' ? +sizeEl.value * 3 : +sizeEl.value });
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
  if (tool === 'brush' || tool === 'eraser') pts.push(p); else pts[1] = p;
  const s = pstyle(), z = pts[pts.length - 1], a = pts[0];
  const paths = tool === 'brush' || tool === 'eraser' ? [pts]
    : tool === 'line' ? [[a, z]]
      : tool === 'rectangle' ? [[a, [z[0], a[1]], z, [a[0], z[1]], a]]
        : [Array.from({ length: 49 }, (_, i) => { const t = (i / 48) * 6.2832, r = Math.hypot(z[0] - a[0], z[1] - a[1]); return [a[0] + r * Math.cos(t), a[1] + r * Math.sin(t)]; })];
  preview = { ...s, paths }; render();
});
c.addEventListener('pointerup', async () => {
  if (!pts) return;
  const done = pts; pts = null;
  if (done.length < 2 && tool !== 'brush' && tool !== 'eraser') { preview = null; render(); return; }
  if (done.length === 1) done.push([done[0][0] + 0.1, done[0][1]]);
  const t = tool, st = pstyle(), auto = autoEl.checked;
  preview = null;
  await mutate((s) => userStroke(s, { tool: t, points: done, auto, ...st }));
});

// ---- demo: runs the same agent tools in the page (source "agent"), so it animates like a real agent call
$('play').addEventListener('click', () => mutate((s) => {
  const tools = createTools(s), before = s.snapshot().objects;
  for (const [n, a] of [
    ['draw_line', { x1: 380, y1: 110, x2: 640, y2: 110, color: '#0ea5e9', size: 5 }],
    ['draw_shape', { shape: 'rectangle', geometry: { x: 400, y: 300, w: 220, h: 110 }, color: '#22c55e', size: 5 }],
    ['draw_shape', { shape: 'circle', geometry: { cx: 800, cy: 400, r: 80 }, color: '#ef4444', size: 5 }],
    ['draw_text', { x: 380, y: 160, text: 'HELLO', fontSize: 80, color: '#7c5cff', size: 6 }],
  ]) { tools.call(n, a); showCall({ name: n, args: a }); }
  for (const o of newAgentObjects(before, s.snapshot().objects)) { prog.set(o.id, 0); queue.push(o.id); }
  runQueue();
}));

addEventListener('resize', render);
ready = true;
switchProject(host.project);
