# Party reconnect handoff

Scope: src/local-input.ts, src/local-input.test.ts, and only global keyDown forwarding/controller-unavailable handling in src/main.ts. Background: AGENTS.md, docs/local-party-contract.md, .local-server/reviews/local-party-gameplay.json. Branch verified: feature/local-multiplayer-formations. Existing staged/unrelated changes preserved; no staging or commits.

Changes:
- keyDown(code, repeat = false) distinguishes real presses from auto-repeat. A fresh non-repeat press recovers a blocked key after clear/blur loses keyup. Held repeats remain blocked until release; repeats never create action pulses. Global gameplay handler forwards event.repeat.
- Pending pulses still survive keyup until poll, are consumed once, and are discarded by clear. Pointer/controller clear boundaries unchanged.
- poll adds unsupported: string[] containing connected nonstandard-mapped seat IDs, separate from disconnected. Both yield empty seat input.
- Main's active-match unavailable branch pauses for either condition, keeps truthful separate labels and actionable standard-controller/Change players instructions. It runs before simulation advancement, including after a Resume attempt. Returning standard mapping clears the warning but does not auto-resume. Existing setup standard-mapping check retained unchanged.

Actual commands/results (Windows bash, working directory D:/SloppySoccer/Game):
- RED: 'C:/Program Files/nodejs/node.exe' node_modules/vitest/vitest.mjs run src/local-input.test.ts
  Exit 1: 1 file failed, 2 failed / 7 passed (9 tests). Fresh lost-keyup press returned moveX 0/shoot false; reconnect regression failed on missing unsupported result field. Held-repeat/pending-pulse regression already passed as a preservation guard. TypeScript also reported the intentionally not-yet-implemented second keyDown parameter during RED.
- GREEN: same command after implementation.
  Exit 0: 1 file passed, 9 tests passed.
- Adjacent focused verification: 'C:/Program Files/nodejs/node.exe' node_modules/vitest/vitest.mjs run src/local-input.test.ts src/local-input-integration.test.ts src/local-input-queue.test.ts
  Exit 0: 3 files passed, 16 tests passed.
- git diff --check -- src/local-input.ts src/local-input.test.ts src/main.ts
  No whitespace errors/output.

Integration assumptions/limits:
- Real global KeyboardEvent.repeat is authoritative; synthetic callers omitting repeat represent fresh presses. Existing callers remain source-compatible.
- Injected controller regression exercises standard -> absent -> connected unmapped -> standard, distinct availability arrays, neutral unavailable input and restored movement/new pass pulse. These are unit doubles, not physical-controller validation.
- Main integration uses existing setPaused/clearInput/inputQueue boundaries. Its DOM status and pause behavior were source-checked, not browser-executed. Coordinator should exercise reconnect/Resume with unsupported mapping and keyboard blur/refocus in browser integration after writers finish.
- No full build, browser suite, dependency/global setting change, deployment, scheduled task, credentials, production-process change, commit or push. Test exit 0 is not review approval; latest review's unrelated deployment finding is outside this ownership.
