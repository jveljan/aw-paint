# Requirements and acceptance criteria

_Run r-9b2e104025, step analyse, agent analyst_

I wrote `docs/REQUIREMENTS-drawing.md`. I didn't compare options or give a recommendation, because this step only asked for requirements and acceptance criteria.

It has 14 functional requirements (paint, agent tool API, live drawing, auto-correct), 4 non-functional ones (Node with no dependencies, `$PORT`, Dockerfile, `node --test`), and 13 testable acceptance criteria. The sources were `brief.md`, `docs/FEATURES.md` and the mockup, since the project has no `AGENTS.md`.

I assumed these, and the open questions in the doc ask you to confirm them:
- The API is plain HTTP; I don't know whether Agent Web also needs it as an MCP tool.
- There is one shared canvas, with no auth and no persistence across restarts.
- The canvas is a fixed 1200x800.
- Letters are uppercase A–Z and 0–9 only.
- The mockup toolbar has no triangle tool, so triangle exists only in auto-correct and `draw_shape`.
