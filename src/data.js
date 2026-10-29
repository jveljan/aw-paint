// The only module that touches data: the canvas document lives in the project at drawing/canvas.json,
// read/written through the host file API. The agent CLI (cli/draw.js) writes the same file.
//   GET /api/fs/read?project=&path=   -> { path, content }   (404/ENOENT when missing)
//   PUT /api/fs/write?project=  { path, content }
// note: q() returns the query string without a leading "?".
import { api, q } from '/core/api.js';
export const DOC_PATH = 'drawing/canvas.json';

// Returns the saved document, or null if none yet / no project / unreadable.
export async function loadDoc(project) {
  if (!project) return null;
  let r;
  try { r = await api('GET', '/api/fs/read?' + q({ project, path: DOC_PATH })); }
  catch (e) { if (e.status === 404 || /ENOENT/.test(e.message || '')) return null; throw e; }
  try { const d = JSON.parse(r && r.content); return d && typeof d === 'object' ? d : null; } catch { return null; }
}
export async function saveDoc(project, doc) {
  if (!project) return false;
  await api('PUT', '/api/fs/write?' + q({ project }), { path: DOC_PATH, content: JSON.stringify(doc) });
  return true;
}
