# Implement

_Run r-9b2e104025, step build, agent builder_

I built the whole design (T1–T10) in one pass. `node --test` passes (10 tests) and the server answers `GET /` on `$PORT`. I did not run the Docker build and did not try the UI or the agent animation in a browser, so the testing step should do both.

- **Not done:** `README.md` with API examples isn't written.
- **Deviation from the design:** I added `src/shapes.js`. It gives every object a list of line paths, and the browser and the PNG renderer just draw those. Letter tests are in `test/recognizer.test.js` rather than a separate `letters.test.js`.
- **Notes:** these are recorded in the "Build status" section I added at the end of `docs/DESIGN-drawing.md`.

Files are in the project root:
- `package.json`
- `Dockerfile`
- `.dockerignore`
- `server.js`
- `src/`
- `public/`
- `test/`
