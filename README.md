# aw-applet-paint

A simple paint applet for Agent Web: brush, eraser, color, size, undo, clear, PNG export. Agents draw on the same canvas through a CLI tool API with a live animated view. An optional auto-correct mode snaps rough strokes to line, circle, rectangle, triangle and letters (deterministic, rule-based, no ML).

It is an applet, not a standalone app: Agent Web serves it at `/dapp/<name>/?project=<project>`.

## Agent tools
Run from the root of the target project:
```
node <applet>/cli/draw.js list
node <applet>/cli/draw.js draw_line '{"x1":10,"y1":10,"x2":300,"y2":200}'
node <applet>/cli/draw.js draw_shape '{"shape":"circle","geometry":{"cx":600,"cy":400,"r":80}}'
node <applet>/cli/draw.js draw_text '{"x":100,"y":100,"text":"HELLO"}'
node <applet>/cli/draw.js get_canvas --png
node <applet>/cli/draw.js clear '{}'
```
State is stored in `drawing/canvas.json`.

## Develop
`npm test` (Node 22, no dependencies).

Docs: [AGENTS.md](AGENTS.md), [brief](brief.md), [docs/](docs/).
