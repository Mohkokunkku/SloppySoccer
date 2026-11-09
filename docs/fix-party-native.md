# Native boundary fix handoff

Scope: deployment/windows-boundary.ts, deployment/runtime.test.ts, this document only. Branch checked: feature/local-multiplayer-formations. Existing staged/unrelated changes preserved.

Root cause: CreateProcess with non-null applicationName does not resolve bare git using PATH. Resolve the executable before constructing the native call. Bare names now search only absolute trusted PATH entries, excluding cwd and its descendants; no shell, PATHEXT expansion, relative PATH entries, or implicit project-local lookup. Explicit absolute Node paths are preserved. Atomic process job-list assignment, suspended launch, job tree termination, crash cleanup and lease lifetime code were not changed.

Actual RED:
'C:/Program Files/nodejs/node.exe' node_modules/vitest/vitest.mjs run deployment/runtime.test.ts -t 'runs actual bare git'
Exit 1: 1 failed, 10 skipped; actual git --version rejected with Bounded process failed. Test cwd contains an invalid project-local git.exe decoy.

Actual GREEN (final run):
'C:/Program Files/nodejs/node.exe' node_modules/vitest/vitest.mjs run deployment/runtime.test.ts
Exit 0: 1 file passed, 13 tests passed, duration 9.73s. Includes real Windows git --version, literal metacharacter/quote arguments, detached descendant cleanup, supervisor crash and lease recovery. Also asserts cwd prepended to PATH cannot select the decoy. git diff --check on both owned code files: exit 0, no diagnostics.

Portability: only the actual native git case and the two Windows job/crash cases use platform guards. Selector, quoting, activation readback/network, CD lock and portable process tests remain enabled on Linux. Every scratch directory uses process.env.TMPDIR ?? tmpdir(). Linux was NOT executed: wsl --list --quiet returned exit 1, Windows Subsystem for Linux is not installed. Ubuntu root Vitest execution remains CI/coordinator verification, not a claimed pass.

Integration assumptions: supervisor PATH is trusted configuration; other absolute PATH entries are not provenance-validated. Callers supply the project root as cwd to exclude that working tree from generic lookup. Explicit absolute executable paths remain caller-trusted. Existing runtime command() Windows delegation is used without editing runtime.ts; TRUST worker retains runtime/watcher/installer/build ownership. No compiled deployment artifact or full build was run while writers were active; coordinator must compile final integrated sources before compiled-runtime acceptance. No deployment, services/tasks, credentials, installs, commits, push, production operations or browser suites were performed. Process exit 0 is not independent review approval.

The requested latest local-party-deployment verdict was not found by filename/content searches within this workspace's docs; the coordinator's exact reproduced symptom in the assignment was used as the regression target. AGENTS.md and docs/local-party-contract.md were read.
