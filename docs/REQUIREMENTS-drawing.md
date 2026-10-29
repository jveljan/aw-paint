# Requirements: Drawing applet

Sources: brief.md, docs/FEATURES.md, mockup/index.html (approved look: toolbar Brush/Eraser/Line/Rectangle/Circle/Text, color swatch #sw, size #size, Undo, Clear, "Agent draws" button, canvas #c, mode badge #badge, agent log #log, agent cursor #cur). No AGENTS.md exists.

## Functional requirements
**Paint**
- R1 Brush and eraser draw freehand with pointer events (mouse/touch).
- R2 Color picker and size slider affect subsequent strokes.
- R3 Undo reverts the last stroke (user or agent), multi-level. Clear empties the canvas and is undoable.
- R4 Line, rectangle, circle and text tools as in the mockup. PNG download is the only export.

**Agent tool API** (CLI, `node cli/draw.js <tool> <json>`; same canvas file as the user)
- R5 draw_line {x1,y1,x2,y2,color?,size?}, draw_shape {shape: line|circle|rectangle|triangle, geometry, color?, size?, fill?}, draw_text {x,y,text,color?,size?}, clear {}, get_canvas {} (objects, optional PNG with --png).
- R6 Invalid input prints {"ok":false,"error"} and exits 1; the file is unchanged.
- R7 `list` prints the tool schemas; `batch` is all-or-nothing.
- R8 State lives in drawing/canvas.json of the open project.

**Live agent drawing**
- R9 New agent objects are picked up by polling (1 s) and drawn progressively (animated points), with an agent cursor and the current call in the log.
- R10 The user can draw while the agent animates; order is kept and nothing is lost.

**Auto-correct mode**
- R11 Toggle with visible badge. When on, a finished freehand stroke snaps to line, circle, rectangle, triangle, or a letter (A-Z, 0-9).
- R12 Rule-based and deterministic: same points give identical output. No randomness, time or ML.
- R13 Unrecognised strokes stay as drawn. A snap is undone as one step.
- R14 Letters: built-in stroke font; template matching on normalised strokes with a documented threshold.

## Non-functional
- N1 Node 22, no npm dependencies, plain ES modules.
- N2 Runs inside Agent Web (applet contract); no own server, no Dockerfile.
- N3 `npm test` runs without a browser.

## Acceptance criteria
| ID | Given / When / Then |
|---|---|
| A1 | Applet opens at /dapp/<name>/?project=<p> and matches the mockup layout |
| A2 | Brush drag makes a stroke; eraser removes pixels; undo removes it; clear then undo restores |
| A3 | draw_line via CLI succeeds and get_canvas lists the line |
| A4 | list shows 5 tool schemas; each tool works as in R5 |
| A5 | Bad input (missing field, non-number, unknown shape, text over 200 chars) exits 1, file unchanged |
| A6 | An open applet animates a new agent stroke over at least 300 ms, with cursor and log line |
| A7 | Noisy line/circle/rectangle/triangle fixtures snap correctly in at least 95% of a fixed set |
| A8 | Letter fixtures (at least A, E, L, O, T, X, 1) recognised at least 90% |
| A9 | Recognizer run twice on the same points gives byte-identical output |
| A10 | Auto-correct off: strokes never altered |
| A11 | Scribbles matching nothing stay unchanged |
| A12 | package.json has no dependencies |

## Assumptions
One shared canvas per project, 1200x800, uppercase A-Z and 0-9, triangle only via auto-correct and draw_shape. Not verified in a browser yet: A1, A2, A6.
