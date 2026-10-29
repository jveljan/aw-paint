#!/usr/bin/env node
// Agent tool entry point (node, no dependencies). Applies tool calls to <cwd>/drawing/canvas.json;
// the open applet picks the change up and animates agent objects.
//   node cli/draw.js list                         -> tool schemas
//   node cli/draw.js <tool> '<json args>'         -> e.g. draw_line '{"x1":10,"y1":10,"x2":300,"y2":200}'
//   node cli/draw.js batch '[{"name":..,"args":..}]'
//   node cli/draw.js get_canvas --png             -> also writes drawing/canvas.png
//   node cli/draw.js undo
// Options: --file <path> (default drawing/canvas.json in the current directory = project root). Prints JSON; exit 1 on error.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createState } from '../lib/state.js';
import { createTools, SCHEMAS, ToolError } from '../lib/tools.js';
import { renderPng } from './render-png.js';

// Same relative path the applet uses via /api/fs?project=: run the CLI from the project root.
export const DOC_PATH = 'drawing/canvas.json';
export const DEFAULT_FILE = path.resolve(process.cwd(), DOC_PATH);

function load(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { if (e.code === 'ENOENT') return null; throw new ToolError('cannot read ' + file + ': ' + e.message); }
}
function save(file, doc) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(doc));
  fs.renameSync(tmp, file);
}
const parse = (s, what) => { try { return s === undefined ? {} : JSON.parse(s); } catch { throw new ToolError(what + ' must be valid JSON'); } };

// Pure-ish runner (exported for tests): returns the JSON result, throws ToolError.
export function run(argv, file = DEFAULT_FILE) {
  const args = argv.slice();
  const fi = args.indexOf('--file');
  if (fi >= 0) { file = path.resolve(args[fi + 1] || ''); args.splice(fi, 2); }
  const png = args.includes('--png');
  const [cmd, json] = args.filter((a) => a !== '--png');
  if (!cmd || cmd === 'list') return { tools: SCHEMAS };
  const state = createState(load(file));
  const tools = createTools(state);
  let out;
  if (cmd === 'undo') out = { ok: state.undo() };
  else if (cmd === 'batch') {
    const calls = parse(json, 'batch');
    if (!Array.isArray(calls)) throw new ToolError('batch must be an array of {name, args}');
    out = { ok: true, results: calls.map((c) => tools.call(c && c.name, c && c.args)) };
  } else out = tools.call(cmd, parse(json, 'args'));
  if (cmd === 'get_canvas' && png) {
    const p = file.replace(/\.json$/, '') + '.png';
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, renderPng(out.objects, out.width, out.height));
    out.png = p;
  }
  if (cmd !== 'get_canvas') save(file, state.toJSON());
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(run(process.argv.slice(2)))); }
  catch (e) {
    console.log(JSON.stringify({ ok: false, error: e instanceof ToolError ? e.message : String(e.message || e) }));
    process.exit(1);
  }
}
