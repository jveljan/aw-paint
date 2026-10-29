# Technical design

_Run r-9b2e104025, step design, agent architect_

I wrote the design to `docs/DESIGN-drawing.md`. It has context, decision, consequences, a risk table and 10 tasks (T1–T10). Each task lists its files, acceptance criteria and test. I didn't run or build anything.

The main design choices:
- **Server-held canvas:** The server keeps an ordered list of drawing objects, so undo, clear and snapping work the same for users and agents.
- **Pure modules:** The recognizer, tools and PNG renderer are plain modules, so `node --test` covers them without a browser.
- **Recognizer on the server:** Snapping happens when a user stroke is committed, so every client gets the same result.
- **Animation on the client:** The server commits an agent call immediately and sends one SSE event. The browser animates the stroke over at least 400 ms.

I kept the requirements doc's assumptions: HTTP only (no MCP), one shared 1200x800 canvas, letters A–Z and 0–9, and no triangle button. Tell me if any of these should change.

Two limits to be aware of:
- **Letter drawing:** Letters are recognised from a single stroke only, so E, T and X must be drawn without lifting the pen.
- **PNG from `get_canvas`:** The server draws it itself, so it only approximates what the browser shows.

T3 and T7 both edit `server.js`, so they must run in order. T8 and T9 touch only `public/`, and T10 (Dockerfile and README) can run in parallel with the others.

The next step is the builder, starting with T1.
