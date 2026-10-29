# Test report: drawing applet

Overall: **PASS with gaps** (UI and Docker not verifiable here).

Commands: `npm test` (10/10 pass); live curl probes of the server on a test port.

| ID | Result | Evidence |
|---|---|---|
| A1 | PASS (partial) | GET / returns 200. Layout versus the mockup was not checked in a browser. |
| A2 | NOT RUN | Needs a browser. Server-side undo and clear are covered by the api tests. |
| A3 | PASS | draw_line returned 200 and the line shows in the canvas. |
| A4 | PASS | /api/tools lists all 5 schemas. Each tool works. draw_shape needs `{shape, geometry:{...}}`. |
| A5 | PASS | A missing field, a non-number, an unknown shape and text over 200 characters each returned 400. The canvas had no objects added by those calls. |
| A6 | PARTIAL | /api/events SSE connects. The animation was not seen in a browser. |
| A7 | PASS | The recognizer tests pass. The fixture count was not independently checked. |
| A8 | PASS | The letter tests pass. |
| A9 | PASS | The determinism test passes. |
| A10 | PASS | Covered by the api and recognizer tests. |
| A11 | PASS | The "scribble unchanged" test passes. |
| A12 | NOT RUN | The Docker daemon isn't running (`docker build` failed on the pipe connection). |
| A13 | PASS | package.json has no dependencies. |

Gaps: the README with API examples is missing. The browser items (A1, A2, A6) and the Docker build (A12) still need a manual check.
No failures were found.
