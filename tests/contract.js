// Contract check for an Agent Web applet (plain node, no dependencies). Run: node tests/contract.js
// Copied from crew-lab; one local change: cli/ is skipped (node-only agent CLI, never loaded by the page).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NODE_ONLY = new Set(['tests', 'cli']);
const errors = [];
const bad = (m) => errors.push(m);

let man = null;
try { man = JSON.parse(fs.readFileSync(path.join(root, 'applet.json'), 'utf8')); } catch (e) { bad('applet.json: ' + e.message); }
if (man) {
  const folder = path.basename(root);
  if (!/^[a-z][a-z0-9-]*$/.test(String(man.id))) bad('id must match ^[a-z][a-z0-9-]*$: ' + man.id);
  if (man.id !== folder) bad(`id "${man.id}" must equal the folder name "${folder}"`);
  if (!['view', 'drawer', 'board'].includes(man.placement)) bad('placement must be view|drawer|board: ' + man.placement);
  if (man.host !== 1) bad('host must be 1: ' + man.host);
}
if (!fs.existsSync(path.join(root, 'index.html'))) bad('index.html missing at the root');

function* files(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules' || (NODE_ONLY.has(e.name) && dir === root)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* files(p);
    else if (/\.(html|js)$/.test(e.name)) yield p;
  }
}
for (const f of files(root)) {
  const rel = path.relative(root, f).split(path.sep).join('/');
  const t = fs.readFileSync(f, 'utf8');
  if (/<[a-z][^<>]*\son[a-z]+\s*=/i.test(t)) bad(rel + ': inline on*= handler');
  if (/window\s*\.\s*(top|parent)\b/.test(t)) bad(rel + ': window.top/parent');
  const specs = [
    ...t.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g),
    ...t.matchAll(/\b(?:import|export)\s[^'"`;]*?\bfrom\s*['"]([^'"]+)['"]/g),
    ...t.matchAll(/\bimport\s*['"]([^'"]+)['"]/g),
  ];
  for (const m of specs) if (!/^(\/core\/|\.\.?\/)/.test(m[1])) bad(`${rel}: import "${m[1]}" (only /core/* or relative)`);
}
// lib/ must stay pure (importable from node tests): no /core/* there.
for (const f of fs.readdirSync(path.join(root, 'lib'))) {
  if (/\/core\//.test(fs.readFileSync(path.join(root, 'lib', f), 'utf8'))) bad(`lib/${f}: must not import /core/*`);
}

if (errors.length) { console.error('contract FAILED:\n- ' + errors.join('\n- ')); process.exit(1); }
console.log('contract ok');
