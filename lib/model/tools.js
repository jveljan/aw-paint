// Agent tools: JSON schemas + validated calls against a state (lib/state.js). Pure, no I/O.
import { W, H } from './state.js';
import { recognize } from '../recognition/recognizer.js';

export class ToolError extends Error {}
const bad = (m) => { throw new ToolError(m); };
const num = (a, k, lo = 0, hi = Infinity) => {
  const v = a[k];
  if (typeof v !== 'number' || !Number.isFinite(v)) bad(`${k} must be a finite number`);
  if (v < lo || v > hi) bad(`${k} out of range`);
  return v;
};
const style = (a) => {
  const color = a.color === undefined ? '#111827' : a.color;
  if (typeof color !== 'string' || !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color)) bad('color must be a hex color like #ff0000');
  const size = a.size === undefined ? 4 : num(a, 'size', 1, 60);
  return { color, size, fill: a.fill === true };
};
const X = (a, k) => num(a, k, 0, W), Y = (a, k) => num(a, k, 0, H);
const obj = { type: 'object' };
export const SCHEMAS = [
  { name: 'draw_line', description: 'Draw a straight line.', input_schema: { ...obj, required: ['x1', 'y1', 'x2', 'y2'], properties: { x1: { type: 'number' }, y1: { type: 'number' }, x2: { type: 'number' }, y2: { type: 'number' }, color: { type: 'string' }, size: { type: 'number' } } } },
  { name: 'draw_shape', description: 'Draw line {x1,y1,x2,y2}, circle {cx,cy,r}, rectangle {x,y,w,h} or triangle {points:[[x,y],[x,y],[x,y]]}.', input_schema: { ...obj, required: ['shape', 'geometry'], properties: { shape: { enum: ['line', 'circle', 'rectangle', 'triangle'] }, geometry: { type: 'object' }, color: { type: 'string' }, size: { type: 'number' }, fill: { type: 'boolean' } } } },
  { name: 'draw_text', description: 'Draw text (A-Z, 0-9) with the stroke font; x,y is the top-left.', input_schema: { ...obj, required: ['x', 'y', 'text'], properties: { x: { type: 'number' }, y: { type: 'number' }, text: { type: 'string', maxLength: 200 }, fontSize: { type: 'number' }, color: { type: 'string' }, size: { type: 'number' } } } },
  { name: 'clear', description: 'Clear the canvas (undoable).', input_schema: { ...obj, properties: {} } },
  { name: 'get_canvas', description: 'Return size and the ordered objects (with polyline paths). The CLI adds a PNG with --png.', input_schema: { ...obj, properties: {} } },
];

export function createTools(state) {
  const impl = {
    draw_line(a) {
      const g = { x1: X(a, 'x1'), y1: Y(a, 'y1'), x2: X(a, 'x2'), y2: Y(a, 'y2') };
      return { object: state.add('line', g, style(a), 'agent') };
    },
    draw_shape(a) {
      const g = a.geometry;
      if (!g || typeof g !== 'object') bad('geometry must be an object');
      const st = style(a);
      let geo;
      switch (a.shape) {
        case 'line': geo = { x1: X(g, 'x1'), y1: Y(g, 'y1'), x2: X(g, 'x2'), y2: Y(g, 'y2') }; break;
        case 'circle': geo = { cx: X(g, 'cx'), cy: Y(g, 'cy'), r: num(g, 'r', 0.5, 2000) }; break;
        case 'rectangle': geo = { x: X(g, 'x'), y: Y(g, 'y'), w: num(g, 'w', 0, W), h: num(g, 'h', 0, H) }; break;
        case 'triangle':
          if (!Array.isArray(g.points) || g.points.length !== 3) bad('points must be 3 [x,y] pairs');
          geo = { points: g.points.map((p) => { if (!Array.isArray(p)) bad('point must be [x,y]'); return [X({ v: p[0] }, 'v'), Y({ v: p[1] }, 'v')]; }) };
          break;
        default: bad('unknown shape');
      }
      return { object: state.add(a.shape, geo, st, 'agent') };
    },
    draw_text(a) {
      if (typeof a.text !== 'string' || !a.text.length) bad('text must be a non-empty string');
      if (a.text.length > 200) bad('text too long (max 200)');
      const g = { x: X(a, 'x'), y: Y(a, 'y'), text: a.text, fontSize: a.fontSize === undefined ? 32 : num(a, 'fontSize', 6, 400) };
      const st = style({ ...a, size: a.size === undefined ? 3 : a.size });
      return { object: state.add('text', g, st, 'agent') };
    },
    clear() { state.clear('agent'); return {}; },
    get_canvas() { const s = state.snapshot(); return { width: s.width, height: s.height, objects: s.objects }; },
  };
  return {
    schemas: SCHEMAS,
    call(name, args) {
      if (!Object.hasOwn(impl, name)) throw new ToolError('unknown tool');
      if (args === null || typeof args !== 'object' || Array.isArray(args)) bad('arguments must be an object');
      const res = impl[name](args);
      if (name !== 'get_canvas') state.note({ name, args });
      return { ok: true, ...res };
    },
  };
}

// User input from the canvas UI: {tool, points, color, size, auto, text}. Auto-correct is deterministic (lib/recognizer.js).
export function userStroke(state, b) {
  if (!b || typeof b !== 'object') bad('body must be an object');
  const color = typeof b.color === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(b.color) ? b.color : '#111827';
  const size = Number.isFinite(b.size) ? Math.min(60, Math.max(1, b.size)) : 4;
  const pts = b.points;
  if (!Array.isArray(pts) || !pts.length || pts.length > 20000 ||
      !pts.every((p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]))) bad('points must be [[x,y],...]');
  const c = (v, m) => Math.min(m, Math.max(0, v));
  const P = pts.map((p) => [c(p[0], W), c(p[1], H)]);
  const a = P[0], z = P[P.length - 1], st = { color, size };
  switch (b.tool) {
    case 'brush': case 'eraser': {
      const sty = b.tool === 'eraser' ? { color: '#ffffff', size } : st;
      const snap = b.tool === 'brush' && b.auto === true ? recognize(P) : null;
      return snap ? state.add(snap.type, snap.geometry, sty) : state.add('stroke', { points: P }, sty);
    }
    case 'line': return state.add('line', { x1: a[0], y1: a[1], x2: z[0], y2: z[1] }, st);
    case 'rectangle': return state.add('rectangle', { x: Math.min(a[0], z[0]), y: Math.min(a[1], z[1]), w: Math.abs(z[0] - a[0]), h: Math.abs(z[1] - a[1]) }, st);
    case 'circle': return state.add('circle', { cx: a[0], cy: a[1], r: Math.max(0.5, Math.hypot(z[0] - a[0], z[1] - a[1])) }, st);
    case 'text': {
      if (typeof b.text !== 'string' || !b.text || b.text.length > 200) bad('text must be 1-200 chars');
      return state.add('text', { x: a[0], y: a[1], text: b.text, fontSize: Math.max(12, size * 4) }, { color, size: Math.max(2, size / 2) });
    }
    default: bad('unknown tool');
  }
}
