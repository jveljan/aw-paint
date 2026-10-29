# Drawing applet with agent tool API

**Goal:** A drawing applet in Agent Web where users draw on a canvas and agents draw too via a tool API.

## What you told the Captain


- **Style:** A simple, modern paint app (clean UI, few tools, no clutter).
- **Auto-correct mode:** Optional mode that snaps rough strokes to clean, deterministic shapes (line, circle, rectangle, triangle) and letters. Rule-based recognition, no ML, same input gives same output.
- **Live view:** Agent drawing is visible in real time (animated strokes, agent cursor).

## Applet port (2026-10-28)
Now an Agent Web applet (see AGENTS.md). Server, Dockerfile and REST/SSE API removed; agent tools are `cli/draw.js`, shared state is `drawing/canvas.json` in the project.
