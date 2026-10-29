# Test

_Run r-9b2e104025, step test, agent tester_

I wrote the report to `docs/TEST-drawing.md`. The overall result is PASS with gaps: I found no failures, but I couldn't check the browser behaviour or the Docker build.

- **Passed:** `npm test` passes 10 of 10. My live probes of the server API passed too: all 5 tools work and bad input returns 400 without changing the canvas. The criteria on recognizer determinism, auto-correct off, and unchanged scribbles pass, and `package.json` has no dependencies. I took the shape and letter recognition criteria (A7, A8) from the passing recognizer tests and didn't count the fixtures myself.
- **Not run:**
  - Browser checks A1 (layout against the mockup), A2 (brush, eraser, undo, clear) and A6 (agent animation).
  - A12 (Docker build), because the Docker daemon isn't running here. The `docker build` command failed on the pipe connection.
- **Gap:** the README with API examples is still missing.

The browser items and the Docker build still need a manual check.
