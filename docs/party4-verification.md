# Fair-play line, human voices and stronger passing — verification

Date: 2026-11-16. Source: `D:/SloppySoccer/Game`, branch `feature/party-controls-charged-shots`, base `0246fc8dc2213b23e44ff5a078575af19a137ad6`.

## Delivered behavior

- The fixed five-pair ending is replaced by two moving lines. Each Spain player greets each Argentina player: 25 distinct opposing contacts, including both keepers, after either winner or a neutral draw. Players walk, turn, ease into a real rigid-arm grip, pump, release and continue past the next opponent without wrapping/teleporting. Keeper arms and gait are relaxed. The complete figures stay framed; label spacing and moulds are preserved. Pause freezes pose/camera; reduced motion uses static per-encounter poses. Simulation, score and save-once behavior remain unchanged.
- Fair play lasts 18 seconds after the original presentation: winner sequence 16+18=34 seconds, neutral draw 8+18=26. Skip/rematch remain available. Renderer completion diagnostics count actual measured full-strength palm contacts, not just scheduled encounters.
- Every active spoken cue now uses a named recorded human performance. Three synthesized victory clips are replaced, and the two existing field cues are restored from clean source recordings rather than earlier EQ/normalization. No TTS, voice cloning, synthetic formants or pitch shifting is used. Actual phrases and performers are cataloged honestly, even where filenames are legacy aliases. Instrumental music remains synthesized and unchanged. Regeneration can no longer recreate synthetic speech; versioned vocal URLs avoid cached old TTS.
- Default pass power is exactly 15% above 15: **17.25**. The slider uses **0.25** increments to represent it exactly, including reset. Actual engine pass velocity is tested. Shot power 22 and keeper clearance 13.8 remain unchanged.

## Executed gates

- `npm run check`: **520 tests in 78 files passed**, with strict client/server/deployment builds. Existing nonfatal bundler/deprecation warnings remain; no TypeScript errors.
- Final full built-production browser replay: **62 cases — 60 passed, two native-capability skips, zero unexpected failures, zero flaky cases and no global errors**. Started `2026-11-16T20:25:12.383711+00:00`, finished `2026-11-16T20:39:12.677291+00:00`. All 233 non-document source/artifact files retained identical SHA256 hashes across checks and browser replay. This includes a natural one-minute match with exact single-save/backend readback, all 25 measured fair-play contacts for both winners and a reduced-motion draw, pause/rematch, native human-audio decoding/cache paths, passing slider/reset and existing input/audio/UI regressions. The two skips are actual alternate-tab visibility and native browser-window blur capability tests; they are not passes.
- Production dependency audit: **zero advisories**. Staged secret/shell-injection/eval scans use tested positive controls and report no matches. Diff whitespace check passed.
- Independent read-only review: `gpt-6-luna / low`, actual model checked, passed with no confirmed security/logic concerns; seven focused test files/49 tests passed in that review. The coordinator owns full browser verification. The only subsequent code-tree change was an atomic browser-test observation; production source was not changed by that correction.

## Recorded human audio proof

The official Kenney Voiceover Pack page was fetched and lists CC0. Original archived `License.txt` and `Credits.txt` were read: male Jeffrey M. Smith and female Giselle. Shipped phrases are male/female “You win!”, female “Congratulations!”, male “Go!” and female “Hurry up!”.

All five shipped vocal PCM streams were compared with fresh direct conversions of their original OGG recordings and were byte-identical. WAV decoding, duration/non-silence, unclipped peaks, metadata and hashes were checked. Native browser playback requested the human-versioned paths and decoded all five voices. This is not a claim of listening on physical headphones or speakers.

Proof: `.local-server/verification/party4/human-recordings-proof.json`; shipped credits/manifests are under `public/audio-v2/` and `public/audio-v3/`. Music generation and voice preparation are separate scripts.

## Replay correction and presentation evidence

The first full replay passed 59 cases, skipped two native-capability cases and failed one handshake harness assertion. That assertion observed `shake`, then separately read a transient contact after the grip had already ended. The correction samples and validates palms atomically in one browser evaluation; it does not change gameplay or weaken the distance/25-encounter requirements. The first receipt/report/trace are preserved under `.local-server/verification/party4-attempt1/`; the final source-hashed replay is under `party4/`.

Focused real-browser rehearsals verified all 25 contacts for Spain-winning, Argentina-winning and reduced-motion draw cases, pause and unchanged backend results. Early/middle/late recorded frames were inspected for real movement through different opponents, connected limbs, preserved figures, relaxed gait/keepers, complete framing and corrected human-voice footer text. Actual videos are retained with browser artifacts; `presentation/fair-play-preview.mp4` is an excerpt of a successful real-renderer rehearsal, not a simulated response or fabricated animation.

## Preview and limitations

Manual quiet preview: `http://127.0.0.1:3003/`. Rehearsal: `/victory.html`, choose a result/theme. Both HTML pages and 15 referenced assets/diagrams/versioned human recordings were byte-compared to `dist`; health/results API readback passed. Preview storage stays separate at `.local-server/party-preview-data`. No recurring service or watcher was installed.

`SloppySoccer-GitHubDeploy` remains **Disabled / Enabled=false**. No production pointer/results or Telegram settings were changed, and no remote push/merge was performed. True native OS window/tab focus and physical controllers still require manual hardware checks; the browser capability skips are not passes.
