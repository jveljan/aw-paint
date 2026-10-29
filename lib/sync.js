// Pure helpers for merging a document written elsewhere (agent CLI) into the open applet.
// Is `remote` newer than what we have? Docs carry a monotonically increasing seq.
export const isNewer = (remote, localSeq) => !!remote && Number.isFinite(remote.seq) && remote.seq > localSeq;
// Agent objects present in `next` but not in `prev` (in order): these get animated.
export function newAgentObjects(prev, next) {
  const had = new Set(prev.map((o) => o.id));
  return next.filter((o) => o.source === 'agent' && !had.has(o.id));
}
// Text for the log line from a tool call {name, args}.
export const callText = (call) => call ? [call.name, JSON.stringify(call.args || {}).slice(0, 140)] : null;
