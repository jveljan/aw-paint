# DESIGN: Preview Start ("not running. Press Start")

## Context
- `PORT=4101 node server.js` works (logs `Paint listening on 0.0.0.0:4101`, `GET /` = 200).
- Preview is configured as mode=server, entry `/preview/`. The app has no such route: `GET /preview/` = 404 (static serves only `/` and files under `public/`).
- `.mc.json` has no install/start/test/previewMode/previewEntry, so the UI has nothing explicit to run.
- The frontend uses absolute URLs (`/style.css`, `/app.js`, `/api/...`, `EventSource('/api/events')`). They break if the host ever proxies the app under a prefix.
- NOT VERIFIED: how the agent-web host probes readiness (HTTP probe of the entry vs. a log line). The host source is outside this project's sandbox and could not be read. Assumption: it polls HTTP GET on previewEntry at $PORT and treats 2xx/3xx as ready, without parsing the "listening" line. Task 5 confirms this.

## Decision
1. **Entry is `/`**, not `/preview/`. The app is root-served, so the smallest fix is configuration.
2. **Defensive alias:** the server also answers `/preview/...` by stripping the `/preview` prefix before routing (static and `/api`). This makes the old config work and is a fallback if the host proxies under a prefix. The frontend uses relative URLs (`style.css`, `app.js`, `api/canvas`, `api/events`) so it works at both `/` and `/preview/`.
3. **Commands in `.mc.json`** (via workspace_set_commands): type `node`, install `npm i`, start `node server.js`, test `npm test`, previewMode `server`, previewEntry `/`. The start command has no `PORT=...` prefix, because that is invalid on Windows cmd. The server reads the `PORT` env var, and also accepts `--port N`. Fallback if the host does not export PORT: `node server.js --port {{port}}`.
4. **Diagnostics:** after listen, print `Paint ready: http://localhost:<port>/`. On a listen error (e.g. EADDRINUSE) print `ERROR: <message>` and exit 1. Add `GET /healthz` returning 200 `ok`.
5. **One-action flow:** the app is usable on first load (canvas visible, default tool selected) and shows an in-page connection status.

## Consequences
- + Preview works with either entry and does not depend on unverified log parsing.
- + The same start command works on Windows dev and Linux Docker.
- - Small server changes (prefix strip, `--port`, `/healthz`) and a frontend path change. Existing API tests must stay green.
- - If the host needs something other than HTTP 200 on the entry, task 5 will reveal it.

## Tasks
1. **Set commands**
   - Files: `.mc.json` (only via workspace_set_commands).
   - Values: per Decision 3, with previewEntry `/`.
   - Accept: all keys present. Test: `npm test` passes.
2. **Relative frontend URLs** (parallel with 3)
   - Files: `public/index.html`, `public/app.js`.
   - Change: remove the leading `/` from asset, fetch and EventSource URLs.
   - Accept: canvas loads and draws at `/` and, after task 3, at `/preview/`. Test: `npm test` plus manual open.
3. **Server: prefix alias, port flag, healthz, errors** (parallel with 2)
   - Files: `server.js`, `test/api.test.js` (add tests).
   - Change: strip a leading `/preview` from the pathname. Add `GET /healthz`. `--port N` overrides PORT, default stays 3000. Log the ready line. Handle the listen `error` event with a message and exit 1.
   - Accept: `GET /preview/` = 200 HTML. `GET /preview/api/canvas` = 200 JSON. `GET /healthz` = 200. A second instance on the same port exits 1 with a readable message. `npm test` green.
4. **In-page status** (after 2)
   - Files: `public/app.js`, `public/index.html`.
   - Change: show "connected" or "reconnecting" from the EventSource open/error events.
   - Accept: stopping the server shows "reconnecting". Restarting it shows "connected".
5. **Verify in host** (tester)
   - Files: `docs/TEST-preview-start.md` only.
   - Action: press Start in the Preview tab (port 4101). Expect status running, canvas visible, and `Paint ready` in the console.
   - Accept: documented evidence. If it is still "not running", record the host's real probe (URL, log pattern) and return to the architect. The Dockerfile must still start `node server.js` on $PORT.
