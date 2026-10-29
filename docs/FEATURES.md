# Feature analysis: Drawing applet

## Must-have features
1. **Paint canvas** - brush, eraser, color, size, undo, clear. Clean modern UI.
2. **Agent tool API** - agents draw via tools: `draw_line`, `draw_shape`, `draw_text`, `clear`, `get_canvas`. Same canvas state as the user.
3. **Auto-correct mode** - toggle; rough strokes snap to line, circle, rectangle, triangle and letters. Deterministic rules, no ML.

## Out of scope (v1)
Layers, import/export beyond PNG, ML recognition.

## Live agent drawing
Agent strokes appear in real time: tool calls are streamed as animated strokes (points drawn progressively), with an agent cursor and the log line showing the current call. User can keep drawing meanwhile.
