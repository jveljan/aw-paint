# AGENTS.md: Paint (drawing-applet-with-agent-tool-api)

**This project is an Agent Web applet, not a standalone application.** It is served by Agent Web at `/dapp/drawing-applet-with-agent-tool-api/?project=<name>` (same origin as the host). Do NOT add a Node server, Dockerfile or release pipeline. The old `server.js`/Dockerfile were removed on purpose.

Read first: `docs/APPLET-CONTRACT.md` (host contract), then `brief.md`, `docs/FEATURES.md`, `docs/DESIGN-drawing.md` (recognizer constants, history only for the server parts).

## How it works
- Canvas document = `drawing/canvas.json` in the **open project** (`{version,width,height,seq,nextId,objects,history,lastCall}`), 1200x800, undo history capped at 30.
- Applet (`src/app.js`): user strokes go through `lib/model/tools.js#userStroke` (optional deterministic auto-correct via `lib/recognition/recognizer.js`), saved via `src/data.js` (`/api/fs/read` + `/api/fs/write`). While visible it polls the file every 1 s; new `source:"agent"` objects animate with the agent cursor; the log line shows `lastCall`.
- **Agent tools** (`cli/draw.js`, plain node, no deps). Run from the project root of the target project:
  ```
  node <applet>/cli/draw.js list                                  # JSON schemas
  node <applet>/cli/draw.js draw_line '{"x1":10,"y1":10,"x2":300,"y2":200,"color":"#ef4444"}'
  node <applet>/cli/draw.js draw_shape '{"shape":"circle","geometry":{"cx":600,"cy":400,"r":80}}'
  node <applet>/cli/draw.js draw_text '{"x":100,"y":100,"text":"HELLO","fontSize":60}'
  node <applet>/cli/draw.js batch '[{"name":"clear","args":{}},{"name":"draw_line","args":{...}}]'
  node <applet>/cli/draw.js get_canvas --png                      # objects + writes drawing/canvas.png
  node <applet>/cli/draw.js undo | clear '{}'
  ```
  Output is one JSON line; errors print `{"ok":false,"error":...}` and exit 1, leaving the file unchanged (batch is all-or-nothing). `--file <path>` overrides the document path.
- PNG: the UI "PNG" button exports the on-screen canvas in the browser; agents get a PNG from `get_canvas --png` (node rasterizer `cli/render-png.js`, needs `node:zlib`, so it is CLI-only).

## Layout
- Root: `applet.json`, `index.html`, `favicon.svg` (the host needs these at the root).
- `src/`: page code. `app.js` (boot, project switch, doc sync), `data.js` (only data access), `style.css`, `ui/view.js` (render, agent animation, log), `ui/input.js` (toolbar, pointer drawing, demo).
- `lib/` pure ES modules, no `/core/*`, no DOM. `lib/model/`: `state.js`, `shapes.js`, `tools.js`, `sync.js`. `lib/recognition/`: `font.js`, `recognizer.js`.
- `cli/` node-only: `draw.js` (agent tools), `render-png.js`. Never imported by the page.
- `tests/`: `contract.js` (crew-lab copy, also skips `cli/` and checks `lib/` purity), `*.test.js` (node:test).
- `mockup/`: original design mockup, not used at runtime.

## Rules
- Imports: only `/core/*` and relative files in page code; no inline `on*=`, no `window.top/parent`.
- Auto-correct must stay deterministic (no randomness, time or ML).
- Test: `npm test`. Real check: open `/dapp/drawing-applet-with-agent-tool-api/?project=<name>`.
- Missing host feature: one line in `docs/NEEDS.md`.
