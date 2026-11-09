# Party UI fix handoff

Scope: src/main.ts, new src/local-config.ts and src/local-config.test.ts, this document. Branch checked: feature/local-multiplayer-formations. Existing staged/unrelated work preserved.

Changes
- selectedConfig reads radio checked/value properties through pure selectedLocalConfig, not FormData successful controls. Disabled controls stay locked without losing duration/difficulty; formation values remain sanitized. Restart, paused restart and Play again still share beginMatch.
- Persistent guide and canvas aria-label use actual localSeats: seat IDs, Spain/Argentina direction, separate keyboard1/keyboard2 layouts and numbered standard-mapped controllers. Solo keyboard1 arrow/Right Shift aliases are shown only without keyboard2. Renderer untouched; main updates its canvas label.
- Fixed-step engine call explicitly passes fifth argument 'pulses'. Poll remains once per RAF; queued inputs are consumed only inside simulation ticks. Existing setup locking, disconnect status, tuning/audio cancellation and new match IDs/save-once paths unchanged.

Commands and actual results
- RED: 'C:/Program Files/nodejs/node.exe' node_modules/vitest/vitest.mjs run src/local-config.test.ts
  1 file failed; 8 failed, 1 passed (9 tests). Initial helper deliberately mirrored disabled-control omission: six configuration cases returned 120/normal instead of 60/hard or 180/easy; two guide cases lacked device instructions. This is a pure boundary reproduction, not browser lifecycle execution.
- GREEN: 'C:/Program Files/nodejs/node.exe' node_modules/vitest/vitest.mjs run src/local-config.test.ts src/local-input-queue.test.ts
  2 files passed, 12 tests passed (9 configuration/guide, 3 existing queue regressions).
- git diff --check -- src/main.ts src/local-config.ts src/local-config.test.ts: exit 0, no output.
- 'C:/Program Files/nodejs/node.exe' node_modules/typescript/bin/tsc --noEmit: exit 1, only reported deployment/runtime.test.ts:2 missing pollActivation export, deployment/watcher.test.ts:2 missing reconcile export, deployment/watcher.test.ts:8 implicit-any parameter s. Outside ownership; not changed. No main/local-config diagnostics in that run.

Integration assumptions / remaining review
- Engine's observed signature already accepts inputMode:'held'|'pulses'='held'; input specialist owns its semantics. Client assumes hub action pulses plus held movement/sprint and existing queue consumption contract.
- Local lobby readSeats preserves disabled seat selections; main's existing match setup lock remains authoritative. Standard controller mappings are instructions, not physical hardware verification.
- Coordinator should execute real Restart/paused Restart/Play again DOM lifecycle coverage and assess persistent guide wrapping/accessibility with active writers finished. No full build, browser suite, hardware/GPU validation, deployment or review approval claimed.
