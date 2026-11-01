# Backend

Fastify serves a local, single-process game and a small JSON API. There are no accounts, sessions, credentials, competitive score verification, or multiplayer simulation. Scores are client-reported and are not trustworthy rankings.

## Run and configuration

- Development API: `npm run dev:server` (TypeScript watch entrypoint).
- Production: `npm run build`, then `npm start` (`dist-server/server/index.js`).
- Backend checks: `npx vitest run server`; project types: `npm run typecheck`.

| Variable | Default | Behavior |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | Bind IP or hostname, not a URL. `0.0.0.0` exposes the unauthenticated API to your network. IPv6 addresses are unbracketed. |
| `PORT` | `3000` | Decimal integer from 1 through 65535. Empty, fractional, exponential and out-of-range values fail startup. |
| `DATA_DIR` | `data` | Writable score directory. Created if absent. |
| `STATIC_DIR` | `dist` | Built frontend directory. If absent, the API still starts; static requests return JSON 404. |

Relative directories resolve against the process working directory; absolute directories are preserved. The entrypoint passes absolute paths into `buildApp`. For releases, set `DATA_DIR` to a stable directory **outside** `STATIC_DIR` and outside disposable release folders. Static files under `STATIC_DIR` are public: never put scores, credentials or private files there.

Example in a POSIX shell:

```sh
HOST=127.0.0.1 PORT=3000 DATA_DIR=D:/SloppySoccer/data STATIC_DIR=D:/SloppySoccer/Game/dist npm start
```

Startup failures log an error and set exit status 1. SIGINT and SIGTERM call `app.close()`, stop accepting requests, finish in-flight requests and drain queued repository writes. Repeated signals do not launch duplicate closes. Shutdown errors set exit status 1; there is no forced-exit timer that could interrupt a write. Abrupt termination/power loss cannot use this graceful path. Configuration parsing lives in a pure module; tests never import the auto-starting entrypoint.

## API

Responses are JSON except successful static files. Unknown API routes are JSON 404, not frontend fallback HTML.

| Method/path | Response |
| --- | --- |
| `GET /api/health` | `200 { "status": "ok" }`; liveness only, not an ongoing disk-writability check. |
| `GET /api/config` | `200 { "duration": 120, "difficulty": "normal" }` (shared default match config). |
| `GET /api/results` | `200 { "results": [...] }`; at most 50, newest first. |
| `POST /api/results` | JSON body `{ "home": 2, "away": 1, "duration": 120 }`; `201 { "result": { ...body, "id": "<server UUID>", "createdAt": "<ISO timestamp>" } }`. |

`home` and `away` must be integers from 0 to 99. `duration` is a number from 15 to 600 seconds, inclusive (fractions allowed). All three fields are required. Extra fields, type coercion, null and array bodies are rejected. The request body limit is 1 KiB.

Errors use `{ "error": "message" }`: validation/malformed JSON is 400, a disallowed Origin is 403, missing routes are 404, oversized bodies are 413, unsupported media types are 415, and unexpected persistence errors are generic 500 responses without filesystem details.

## Browser security

All normal success/error/static responses receive `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Cross-Origin-Resource-Policy: same-origin` and `Cache-Control: no-store`.

The CSP allows local scripts, styles, fonts, images and connections, plus data images. It blocks plugins, framing, base-tag overrides and form submissions. It does not allow eval, remote CDNs, or inline script/style on the game. WebGL uses local JavaScript without eval. Only `/design-board.html` permits inline styles and scripts: the standalone SVG board has embedded CSS, inline SVG styles and an inline print-button handler. No other route receives this exception.

Mutating requests with an `Origin` header require an exact canonical match to the request scheme/host/port. Opaque, malformed and cross-origin values are rejected before persistence. Requests without Origin are intentionally accepted for the local frontend/CLI use case; this is not authentication. There is no permissive CORS header and forwarded host/protocol headers are not trusted. Keep the loopback default. A reverse proxy must preserve the intended origin scheme/host; TLS termination requires an explicit reviewed proxy configuration rather than blindly trusting forwarded headers. Public exposure needs authentication, abuse/rate controls and a proper durable database.

## Persistence and limits

`DATA_DIR/results.json` is loaded and validated at startup. A missing file means no scores. Invalid JSON or invalid stored rows fail startup without overwriting the file; stop the process and restore/repair it before restarting. Only the newest 50 stored rows enter memory.

Within **one repository instance in one process**, adds are serialized on a promise queue, preventing concurrent requests from losing acknowledged results. Each add creates a unique same-directory temporary file with exclusive creation and mode `0600` (subject to OS permission semantics), writes the full next list, syncs and closes it, then renames it over `results.json`. Memory changes only after the file operation succeeds. Failed operations return 500, clean up their temp file when possible, and do not poison subsequent queued writes. Atomic replacement avoids exposing a half-written JSON file, but directory metadata is not fsynced: this is not a guarantee against every filesystem or power-loss failure. Stale temporary files from an abrupt kill are ignored on startup and may be removed while stopped.

**Exactly one writer/app instance per data directory.** There is no cross-process lock, database transaction, distributed coordination or external-file-change reload. Do not run clustered workers or two releases against the same directory. Network filesystems may not provide the expected rename behavior. Back up the file when stopped (or use a filesystem snapshot). Reads are served from memory; a deployment must preserve the external data directory. The retained-history cap is 50, not an audit log. Retries of a POST are not idempotent and can create duplicate results.
