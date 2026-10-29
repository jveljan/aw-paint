# Applet contract (host version 1)

An applet is a small web app that runs inside Agent Web (as a view or a drawer tab) or standalone in its own browser tab. This file is everything you need to build one; the Agent Web source is not visible from this project.

## 1. Where it runs
- Your folder is served by Agent Web at `/dapp/{{id}}/` (same origin as the app, so `/api/*` and `/core/*` just work). Dev mode only, or when settings has `devApplets: true`. Files starting with `.`, `node_modules`, `.system-data` and anything outside the folder are never served; GET/HEAD only; no caching, reload to see edits.
- Opened with `?project=<name>`: the workspace project the user is working on.
- Embedded: the host shows it in an iframe (view switcher for `placement: "view"`, drawer tab for `"drawer"`). Standalone: same page, no parent.

## 2. Manifest (`applet.json`)
| Field | Meaning |
|---|---|
| `id` | lowercase `a-z0-9-`, starts with a letter, equals the folder name |
| `title`, `description` | shown in tabs and the switcher |
| `placement` | `view` (full screen, switchable), `drawer` (right panel tab), `board` (only listed in the applets registry) |
| `dock.drawer` | for `drawer`: `{ "label": "Tab", "order": 50 }` |
| `start` | `true` = may be chosen as start view |
| `needs` | `["project"]` if it needs a project context |
| `cmds` | host commands it uses (section 5) |
| `host` | contract version, `1` |
| `service` | ignored for dev applets (no backend code yet) |
A built-in applet with the same `id` wins; yours is then skipped.

## 3. Allowed imports
Only absolute `/core/*` modules and your own relative files. Never `/js/*` (host UI), never another applet.
- `/core/applet-boot.js`: `bootApplet(id, { title, onContext(ctx, changedKeys), onShow, onHide, onProject })` returns `{ project, ctx, cmd(name,args), embedded, visible(), destroy() }`. Standalone it adds a small header with a project picker.
- `/core/api.js`: `api(method, url, body)` fetch wrapper with token handling (JSON in/out, throws with `.status`), `q(obj)` query string, `sseParse`.
- `/core/chat-client.js`: `createThread`, `postMessage`, `abortRun`, `followRun(sid, onEvent, isStale)`.
- `/core/boards-client.js`: `listBoards`, `listItems`, `addItem`, `updateItem`, `removeItem`, `watch` for per-project boards (tasks, notes...).
- `/core/markdown.js`, `/core/theme.js`, `/core/state.js`: rendering and theme helpers.
- Theme: `/css/themes.css` defines CSS variables per `data-theme`; set it from `localStorage.aw_theme` (index.html of the template does). No host CSS beyond that.

## 4. Rules
1. Standalone first: works with `?project=` and no parent frame.
2. React to `onContext` (project, agent, session changes) and `onShow`; stop timers and SSE on `onHide`.
3. No inline `on*=` handlers, no `window.top`/`parent` access, no host element ids.
4. Keep all fetches in one module (`data.js`).
5. Applets are not a security boundary: you run with the user's token. Do not call destructive endpoints without the user asking.

## 5. Host commands (`boot.cmd(name, args)`)
Returns `false` when standalone or unsupported. Others are ignored.
- `toast {text}` (max 300 chars)
- `open-thread {id, mid?}`
- `switch-project {key}`, `open-tab {id}`, `drawer {op: "max"|"unmax"|"close"}`

Messages host to applet (handled by `bootApplet`): `project`, `context {project?, agent?, session?}`, `show`, `hide`.

## 6. What `/api/*` offers (same origin, JSON, errors `{ "error": "..." }`)
Auth: if the app has a token, `api()` asks for it once and sends `Authorization: Bearer`.
- `GET /api/info` mode, workspace root. `GET/PUT /api/settings`.
- `GET /api/projects`; per project `GET /api/projects/:name/...` (notes, ideas, stages, suggestions, boards).
- Boards: `/api/projects/:name/boards[/:board[/items]]` (see boards-client).
- Files: `/api/fs/*?project=<name>` (list, read, write, upload, download). This is how an applet saves data (or use boards); there is no own backend.
- Threads: `GET /api/sessions`, `POST /api/sessions`, `POST /api/sessions/:id/messages`, `GET /api/search?q=`; runs stream as SSE (use `followRun`).
- Agents and crews: `GET /api/agents?project=`, `GET /api/crews`.
- Registry: `GET /api/views`, `GET /api/applets`.
- Events: `GET /api/events` (SSE, invalidate-only hints).
Exact fields: ask the user for `docs/REST-API.md` of Agent Web if you need more detail.

## 7. Develop and test
- Agent Web is your dev server. Open `/dapp/{{id}}/?project=<name>` in a browser tab (standalone) or as the app tab, then reload after edits. Do not write a dev server or harness, and do not vendor or mock `/core/*`. They only exist on the host origin.
- Layout: `applet.json` and `index.html` at the project root (no `web/` or `mockups/` subfolder). Code may live in relative subfolders. `docs/`, `tests/`, `package.json` (test scripts only) live beside it.
- Tests (`npm test`, plain `node`, no dependencies): (a) logic tests that import only your modules without `/core/*` imports or DOM (put pure logic in such files), (b) `tests/contract.js` checks the manifest, imports and the absence of `on*=`.
- Missing host feature? Add one line to `docs/NEEDS.md`. Do not build a workaround.

## 8. Checklist
- `applet.json` valid, id equals folder.
- Page loads at `/dapp/{{id}}/?project=<name>` and standalone shows the project picker.
- Imports only `/core/*`, no `on*=`.
- `npm test` green (contract and logic).
