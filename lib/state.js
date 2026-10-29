// Canvas document: ordered object list + bounded undo history. Pure and serializable
// (saved as data/drawing.json in the project), shared by the applet UI and the agent CLI.
import { pathsFor } from './shapes.js';
export const W = 1200, H = 800;
export const HISTORY_MAX = 30;

export const emptyDoc = () => ({ version: 1, width: W, height: H, seq: 0, nextId: 1, objects: [], history: [], lastCall: null });

// doc: a previously saved document (or nothing). onChange gets {event, seq, ...} after every change.
export function createState(doc, onChange = () => {}) {
  const d = { ...emptyDoc(), ...(doc && typeof doc === 'object' ? doc : {}) };
  if (!Array.isArray(d.objects)) d.objects = [];
  if (!Array.isArray(d.history)) d.history = [];
  const emit = (event, extra) => { d.seq++; onChange({ event, seq: d.seq, ...extra }); };
  const push = () => { d.history.push(d.objects); if (d.history.length > HISTORY_MAX) d.history.shift(); };
  return {
    W, H,
    get seq() { return d.seq; },
    toJSON: () => d,
    snapshot: () => ({ width: W, height: H, objects: d.objects.slice(), seq: d.seq }),
    add(type, geometry, style, source = 'user') {
      const obj = { id: d.nextId++, type, color: style.color, size: style.size, source, geometry, paths: pathsFor(type, geometry) };
      if (style.fill) obj.fill = true;
      push(); d.objects = [...d.objects, obj];
      emit('object', { object: obj });
      return obj;
    },
    clear(source = 'user') { push(); d.objects = []; emit('clear', { source }); },
    undo() {
      if (!d.history.length) return false;
      d.objects = d.history.pop(); emit('undo'); return true;
    },
    note(call) { d.lastCall = { ...call, seq: d.seq + 1 }; emit('agent_call', { call }); },
  };
}
