// Paint applet entry: boot, project switching and document sync.
// UI lives in ui/*, pure logic in ../lib/*, data only through data.js.
// The agent draws via cli/draw.js (writes drawing/canvas.json); we poll that file while visible and animate agent objects.
import { bootApplet } from '/core/applet-boot.js';
import { loadDoc, saveDoc, DOC_PATH } from './data.js';
import { createState } from '../lib/model/state.js';
import { isNewer, newAgentObjects } from '../lib/model/sync.js';
import { createView } from './ui/view.js';
import { initInput } from './ui/input.js';

const $ = (id) => document.getElementById(id);
const POLL_MS = 1000;

const view = createView({ canvas: $('c'), cur: $('cur'), badge: $('badge'), log: $('log') });
let project = '', ready = false, timer = null, busy = false;
let state = createState(null);

const host = bootApplet('drawing-applet-with-agent-tool-api', {
  title: 'Paint',
  onShow: () => startPoll(),
  onHide: () => stopPoll(),
  onProject: (p) => { if (ready) switchProject(p); },
});

const toast = (text) => { if (!host.cmd('toast', { text })) $('log').textContent = text; };

// ---- document sync
function adopt(doc, animate) {
  const before = view.objs;
  state = createState(doc);
  view.objs = state.snapshot().objects;
  for (const id of [...view.prog.keys()]) if (!view.objs.some((o) => o.id === id)) view.prog.delete(id);
  if (animate) for (const o of newAgentObjects(before, view.objs)) view.enqueue(o.id);
  if (doc && doc.lastCall) view.showCall(doc.lastCall);
  view.render();
  if (view.queue.length) view.runQueue();
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
    view.objs = state.snapshot().objects;
    view.render();
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
  state = createState(null);
  view.reset();
  await pull(false);
  if (host.visible()) startPoll();
}

initInput({ view, mutate });
addEventListener('resize', view.render);
ready = true;
switchProject(host.project);
