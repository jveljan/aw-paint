// Canvas rendering, agent-stroke animation and the log line. No data access, no project logic.
import { callText } from '../../lib/model/sync.js';

const sleep = (t) => new Promise((r) => setTimeout(r, t));
export const pathsLen = (paths) => paths.reduce((s, p) => s + p.reduce((a, q, i) => a + (i ? Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1]) : 0), 0), 0);

export function createView({ canvas: c, cur, badge, log }) {
  const x = c.getContext('2d');
  const view = {
    objs: [],            // objects to draw (ordered)
    prog: new Map(),     // id -> 0..1 while an agent object is animating
    queue: [],           // ids waiting to animate
    preview: null,       // in-progress user stroke
    animating: false,
  };

  // Draw paths up to fraction f; returns the last point drawn.
  function drawObj(o, f) {
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

  view.render = () => {
    x.lineCap = x.lineJoin = 'round';
    x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
    for (const o of view.objs) { const f = view.prog.has(o.id) ? view.prog.get(o.id) : 1; if (f > 0) drawObj(o, f); }
    if (view.preview) drawObj(view.preview, 1);
  };

  const toScreen = (p) => {
    const r = c.getBoundingClientRect();
    cur.style.left = r.left + (p[0] * r.width) / c.width + 'px';
    cur.style.top = r.top + (p[1] * r.height) / c.height + 'px';
  };

  view.enqueue = (id) => { view.prog.set(id, 0); view.queue.push(id); };

  view.runQueue = async () => {
    if (view.animating) return;
    view.animating = true; badge.classList.add('on'); cur.style.display = 'block';
    while (view.queue.length) {
      const id = view.queue.shift(), o = view.objs.find((q) => q.id === id);
      if (!o) continue;
      const dur = Math.max(400, pathsLen(o.paths) / 0.8), t0 = performance.now();
      for (;;) {
        const f = Math.min(1, (performance.now() - t0) / dur);
        if (!view.objs.includes(o)) break;
        view.prog.set(id, f); view.render();
        const p = drawObj(o, f); if (p) toScreen(p);
        if (f >= 1) break;
        await new Promise(requestAnimationFrame);
      }
      view.prog.delete(id); view.render(); await sleep(120);
    }
    view.animating = false; badge.classList.remove('on'); cur.style.display = 'none';
  };

  view.reset = () => { view.objs = []; view.prog.clear(); view.queue.length = 0; view.render(); };

  view.showCall = (call) => {
    const t = callText(call);
    if (!t) return;
    log.textContent = t[0] + ' ';
    const s = document.createElement('span'); s.style.color = '#8b91a1'; s.textContent = t[1]; log.append(s);
  };

  view.exportPng = () => {
    view.render();
    c.toBlob((b) => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'drawing.png'; a.click(); });
  };

  return view;
}
