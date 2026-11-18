# Party5 combined verification

Date2026-11-17; base552ad08c146b747c66408b212b65433aeb7e7b8a; feature/party-controls-charged-shots.

## Delivered scope

- Actual-nearest autonomous defender steps toward the ball; the spare tucks centrally with staggered depth. Existing active shot/pass screens, secure keeper handling, single-defender formation and human-seat authority stay intact.
- User-approved32-second/120BPM toy-pop Marcha Real for Spain wins and Himno Nacional Argentino chorus for Argentina wins. Selection follows winning team, not random visual dance; draws keep neutral music.
- Exact auditioned WAVs preserved (Spain SHA2568570829916e56a0e928236b32bb2a6b830941930ebcf069d400c287dbee40d0b; Argentina8edbeaeb5127dd65fb29ad6c2d7b44fa80be148a9d177aa1132aa349e93401ea). Real human cheers, opt-in playback, ducking and cancellation are preserved. Reproducible offline sound board remains available.

## Verification evidence

- Latest combined npm check: **543 unit tests /81 files**, strict client/server builds and deployment-runtime build passed. No deployment activation.
- Focused actual engine/tactics set:5files/113tests passed; real keyboard-driven wing checks passed and screenshots inspected for both sides. No simulation injection. Source-backed media asset tests pass; native sound-board playback/volume/loop/stop/mobile-fit checks pass.
- Approved music focused unit set:5files/21tests passed. Four actual browser checks passed: both winning tracks across all visual dances, native looping source evidence, distinct stereo decoding, pause/resume/skip/mute, neutral draws, no rehearsal writes, existing human cues and stronger passing slider.
- Independent GPT-6 Luna/low defender correction review passed with no confirmed security/logic issues. Separate GPT-6 Luna/low approved-music review passed (read-backed verdict required before final handoff); neither substitutes for the full coordinator browser gate.
- Full combined built-production browser replay: **66 cases —64 passed, two native-capability skips, zero unexpected failures, zero flaky cases and no global errors**. Receipt: `.local-server/verification/party5/receipt.json`, started2026-11-17T20:02:49.963649+00:00, finished2026-11-17T20:17:36.515289+00:00. All247 non-document source/artifact SHA256 hashes remained identical across checks and browser replay. Includes natural full match/save-once/backend readback, both keyboard-driven wing scenarios, both anthem/draw/lifecycle cases, human voices, all25 measured fair-play contacts for both winners and reduced-motion draw, pause/rematch and existing input/UI regressions. Earlier partial runs are not counted.
- Exact preview readback of `/`, `/victory.html`,17 referenced/voice/music/diagram assets passed, including both approved WAVs. Existing preview results readable. Scheduled SloppySoccer-GitHubDeploy verified Disabled/Enabled=false. No watcher/service installation, production pointer change, push or remote deployment.

## Preserved unsuccessful/interrupted gates

`party5-attempt1`: initial full unit check failed two old mirrored engine assertions that required jersey2 to stay on the former deep rail. Corrected them to retain deep-spare and midfield-gap safeguards and additionally assert the requested depth stagger/advanced defender. Only shared/engine.test.ts changed between the first two pre-approval snapshots, not production code. Initial reviewer failed closed on that receipt; the correction reviewer confirmed the intended test change.

`party5-before-anthem-approval`: corrected old-runtime unit/build check passed532tests/79files, but its browser replay was explicitly stopped on the user's later sound-board approval before integrating music. No completed-browser claim for that replay. A fresh combined replay replaces it.

Native alternate-tab visibility/window blur capability tests remain manual limitations if the full suite skips them. Physical controller hardware and subjective speaker/headphone mix are not established by automated browser tests.
