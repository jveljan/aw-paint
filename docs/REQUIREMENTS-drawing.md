# Requirements: Drawing applet

Sources: brief.md, docs/FEATURES.md, mockup/index.html (approved look: toolbar Brush/Eraser/Line/Rectangle/Circle/Text, color swatch #sw, size #size, Undo, Clear, "Agent draws" button, canvas #c, mode badge #badge, agent log #log, agent cursor #cur). No AGENTS.md exists.

## Functional requirements
**Paint**
- R1 Brush and eraser draw freehand with pointer events (mouse/touch).
- R2 Color picker and size slider affect subsequent strokes.
- R3 Undo reverts the last stroke (user or agent), multi-level. Clear empties the canvas and is undoable.
- R4 Line, rectangle, circle and text tools as in the mockup. PNG download is the only export.

**Agent tool API** (HTTP JSON, same canvas state as the user)
- R5 `draw_line {x1,y1,x2,y2,color?,size?}`, `draw_shape {shape: line|circle|rectangle|triangle, geometry, color?, size?, fill?}`, `draw_text {x,y,text,color?,size?}`, `clear {}`, `get_canvas {}` (returns size, ordered object list and a PNG data URL).
- R6 Invalid input returns 400 with a JSON error; the canvas is unchanged.
- R7 Endpoints: GET /api/tools (schemas), POST /api/tools/NAME, GET /api/events (SSE).
- R8 Canvas state is held on the server (one shared canvas); the browser syncs from it.

**Live agent drawing**
- R9 Each agent call is streamed over SSE and drawn progressively (animated points), with an agent cursor and the current call in the log.
- R10 The user can draw while the agent animates; order is kept and nothing is lost.

**Auto-correct mode**
- R11 Toggle with visible badge. When on, a finished freehand stroke snaps to line, circle, rectangle, triangle, or a letter (A-Z, 0-9).
- R12 Rule-based and deterministic: same points give identical output. No randomness, time or ML.
- R13 Unrecognised strokes stay as drawn. A snap is undone as one step.
- R14 Letters: built-in stroke font; template matching on normalised strokes with a documented threshold.

## Non-functional
- N1 Node 22, no npm dependencies, plain static front end.
- N2 Listens on 0.0.0.0:$PORT (default 3000); relative paths, env config.
- N3 Dockerfile included; works on Linux and Windows.
- N4 Tests run with `node --test`; recognizer and API need no browser.

## Acceptance criteria
| ID | Given / When / Then |
|---|---|
| A1 | Server starts on $PORT; GET / returns the UI matching the mockup layout |
| A2 | Brush drag makes a stroke; eraser removes pixels; undo removes it; clear then undo restores |
| A3 | POST draw_line returns 200 and get_canvas lists the line |
| A4 | All 5 tools have a schema in /api/tools and work as in R5 |
| A5 | Bad input (missing field, non-number, unknown shape, text over 200 chars) gives 400, state unchanged |
| A6 | An open browser gets an SSE event and animates the stroke over at least 300 ms, with cursor and log line |
| A7 | Noisy line/circle/rectangle/triangle fixtures snap correctly in at least 95% of a fixed set |
| A8 | Letter fixtures (at least A, E, L, O, T, X, 1) recognised at least 90% |
| A9 | Recognizer run twice on the same points gives byte-identical output |
| A10 | Auto-correct off: strokes never altered |
| A11 | Scribbles matching nothing stay unchanged |
| A12 | docker build succeeds and the container answers on $PORT |
| A13 | package.json has no dependencies |

## Assumptions and open questions
- One shared canvas, no auth, no persistence across restarts (assumed).
- Triangle is in auto-correct and draw_shape only; the mockup has no triangle tool (assumed fine).
- Canvas fixed 1200x800 logical size (assumed).
- Is HTTP enough, or must the API also be exposed as an MCP tool in Agent Web? Assumed HTTP.
- Letters limited to uppercase A-Z and 0-9 (assumed).
