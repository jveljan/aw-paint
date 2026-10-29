# Host needs
- Agent tool registration for applets: agents cannot call applet tools natively; they shell out to `cli/draw.js`. A host-side applet tool registry would replace this.
- File change events for `/api/fs`: the applet polls `drawing/canvas.json` every 1 s while visible.
