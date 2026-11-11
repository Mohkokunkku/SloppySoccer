# Party controls, charged shots and full-time celebrations — verification

Branch: `feature/party-controls-charged-shots`

Merged base: `a1668715be5403771d42b971bfdf817cfc15fbdd`

Coordinator verification date: November 11, 2026.

## Delivered behavior

- Defaults: 35.2 × 22 pitch and 1.15 sprint multiplier. Canonical tactical coordinates remain 32 × 20. Previously saved custom tuning is preserved; use **Reset tuning** to return to the new defaults.
- Original keyboard/controller SVG binding diagrams and colored device tokens grouped under Spain/Argentina. Native keyboard activation, click and drag/drop synchronize the existing assignment controls. Locked/duplicate seats cannot change ownership.
- Per-seat hold/release shots, authorized visible kick meters, deterministic bounded inaccuracy, ownership/phase/control/cancellation safeguards, and compatible legacy/AI/keeper actions.
- Three distinct full-time themes with winner layouts/dances/smiles, real-face camera shots, frustrated opponents, a sweeping finale, original instrumental loops and synthesized spoken cheers. Draws are neutral. Finished simulation/score remain frozen and results are saved once. Pause, mute, skip, restart and reduced motion are supported.
- `victory.html` provides an explicitly labelled rehearsal using the real presentation modules and example scores. It does not save results.

## Executed gates

- `npm run check`: **473 tests passed in 69 files**, strict TypeScript/client/server builds and deployment-runtime build passed.
- Last completed pre-focus-fix full browser run (November 10): **47 passed, 2 skipped, 0 unexpected/flaky/global errors**. Its receipt confirms unchanged source during that run.
- The final token-focus regression was reproduced RED with native Enter activation, fixed by avoiding needless DOM reparenting and restoring focus when moving between teams, then passed GREEN against the rebuilt production client.
- **Final full-browser replay (November 11): 48 passed, 2 skipped, 50 enumerated cases, 0 unexpected/flaky/global errors.** Run: `2026-11-11T20:10:41.656867Z` through `2026-11-11T20:23:35.534026Z`, exit 0. Before/after hashes confirm unchanged source. The real one-minute match/save-once/backend-readback case passed, as did native token-focus preservation and keyboard-operated touch-shot blur cancellation.
- Production dependency audit: zero vulnerabilities in the executed `npm audit --omit=dev` run.
- Six supplied victory WAVs were validated as non-silent, non-clipping mono 22050 Hz PCM and decoded with a real browser AudioContext. Native playback and cancellation are exercised by browser tests; speaker/headphone listening is not claimed.

## Evidence and limitations

Ignored coordinator evidence is under `.local-server/verification/party2/`: `source-before.json`, `browser-report.json`, `browser-receipt.json`, `browser-output.txt`, and `preview-readback.json`. Failed RED regressions and passing focused runs are retained separately. Browser screenshots are under `test-results/` until copied into the verification folder.

The two native-capability skips concern true OS/window blur and alternate-tab visibility behavior in the runner. They are not passes. Deterministic suspension/input tests cover cancellation, but physical controllers, actual Bluetooth/USB mapping, real OS focus behavior and audible output still require manual checks.

The model-pinned independent review attempts returned inconclusive verdicts, not approval. They raised missing-context concerns rather than establishing a confirmed defect. Coordinator source review, real tests/builds and native browser evidence are the acceptance record; no independent-approved commit prefix is warranted.

No automatic deployment has been enabled. The manual loopback preview uses separate preview result storage and does not activate a production release. GitHub publication is not implied by a local build or commit.
