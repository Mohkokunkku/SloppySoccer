# Bounded security-final handoff

Scope: feature/local-multiplayer-formations; only deployment/windows-boundary.ts, deployment/runtime.test.ts, deployment/watcher.ts, deployment/watcher.test.ts and this document changed by this pass. Existing staged work preserved. Read AGENTS.md, docs/local-party-contract.md and .local-server/reviews/local-party-deployment.json.

## Fixes

- Supervisor execFile now receives an absolute System32/WindowsPowerShell/v1.0/powershell.exe path from validated SystemRoot, with WinDir fallback only when SystemRoot is absent. Reject relative, drive-relative, UNC, traversal and malformed roots; never resolve the supervisor using cwd or PATH. OS environment roots remain a trusted integration input. Native Job Object implementation, atomic process assignment, nested-tree cleanup, lease lifetime and timeout logic are unchanged.
- Validate both API repository identities before case-insensitive comparison with the validated configured identity. Only comparison values are lowercased; validateRepository still returns the original literal, and remote URL/runtime code is untouched. Both same-repository gates and exact-SHA/push/main/success gates remain mandatory. Malformed API identities are rejected, including trailing newline.

## Exact focused evidence (Windows)

Command for both RED and GREEN:

    'C:/Program Files/nodejs/node.exe' node_modules/vitest/vitest.mjs run --config deployment/vitest.config.ts deployment/runtime.test.ts deployment/watcher.test.ts

RED: exit 1; 2 failed files; 3 failed, 19 passed tests (22 total), duration 11.66s. Missing system-root resolver failed; harmless git --version from a temporary cwd containing inert git.exe AND powershell.exe decoys failed with spawn UNKNOWN at the old bare supervisor execFile; mixed-case canonical API identities returned undefined instead of the accepted run. No malicious executable was executed.

GREEN: exit 0; 2 passed files; 22 passed tests, no skips, duration 11.19s. Includes real harmless bare Git execution despite both cwd decoys, real benign detached descendant timeout/lease exclusion/stale-lock recovery, supervisor-crash tree cleanup, quoting, malformed system roots, canonical mixed-case identities and unrelated/fork/malformed identities in BOTH API fields. Existing push/main/exact-SHA rejection tests also passed. Native tests are platform-guarded; resolver/quoting tests are portable. Linux execution was not performed.

Additional commands:

    git diff --check -- deployment/windows-boundary.ts deployment/runtime.test.ts deployment/watcher.ts deployment/watcher.test.ts

Exit 0, no whitespace diagnostics.

    'C:/Program Files/nodejs/node.exe' node_modules/typescript/bin/tsc -p tsconfig.deploy.json --noEmit

Exit 0, no diagnostics; no emitted runtime artifacts.

## Integration assumptions / limits

SystemRoot/WinDir must describe the trusted local Windows installation, with system Windows PowerShell available; the configured environment itself is not an attacker-controlled trust boundary. Git still uses the pre-existing trusted absolute/PATH resolver. The installed bundled runtime must be rebuilt/reviewed/activated by the coordinator through the existing publication procedure; this pass did not touch installed output. Test success is not independent security review approval or deployment activation evidence.

No runtime.ts, installer, build helper, CI, main, dependency/global setting, credential or production-process changes. No full builds, browser suites, Scheduled Tasks, installs, commits, pushes or deployments executed.
