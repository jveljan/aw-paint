# REVIEW: drawing applet

**Verdict: PASS** (with non-blocking follow-ups)

Reviewed: server.js, src/, public/, Dockerfile, package.json, docs/TEST-drawing.md. `npm test` 10/10 per the test report. I did not re-run it.

## Findings
| Sev | Where | Issue | Fix |
|---|---|---|---|
| Low | server.js serveStatic | Path traversal is guarded (resolve + prefix check), and decodeURIComponent errors become 400. OK. | none |
| Low | server.js readJson | Over-limit body rejects but the stream isn't always drained. Size is capped at 2 MB. | Optional. |
| Low | server.js SSE events endpoint | No SSE heartbeat, so proxies may drop idle streams. | Optional: send a keepalive comment every 25s. |
| Med (non-blocking) | repo | No README with API examples. The TEST report flagged this. No AGENTS.md. | Releaser to add both. |
| Med (non-blocking) | A1, A2, A6, A12 | Browser checks and Docker build not verified. | Manual check before release. |
| Info | git | Project files are untracked. The only modified file is the unrelated tests/bus.js in the parent repo, which must NOT go in this commit. | Stage only the project paths. |

No secrets and no host-specific code. There are no dependencies. The server listens on $PORT. Confirm the listen call binds 0.0.0.0.

## Proposed commit message
feat(drawing): paint app, agent tool API with live SSE, deterministic auto-correct recognizer
