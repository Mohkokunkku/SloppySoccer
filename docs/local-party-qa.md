# Local party QA handoff

Owned artifacts: tests/browser/local-party.spec.ts and this document only. Branch checked: feature/local-multiplayer-formations. Contract read before AGENTS; older ownership/count rules superseded.

## Verification actually performed

Command: `node node_modules/@playwright/test/cli.js test tests/browser/local-party.spec.ts --list`
Result: exit 0; 8 tests discovered in 1 file. No browser, production server, full build, dependency/config change, commit, push or deployment was run.

Runtime RED/GREEN: NOT RUN. The exclusive QA instruction requires discovery only while writers are active; this prevents observing behavioral RED or GREEN. Discovery success is not a passing behavioral test or TDD completion. No Vitest invocation is appropriate for this Playwright-only assignment. Coordinator owns final build and runtime execution.

## Coverage authored

- Both formation choices, ten markers, per-team four outfield plus legacy slot-3 keeper, correct A/M/D/GK counts and active formation locking.
- Co-op and opposing keyboard seats: simultaneous opposite movement using real held keys; simultaneous switch changes both bindings without duplicate assignment or keeper ownership; independent pass pulses preserve the idle partner's binding.
- Natural entrance/spotlight/play sequence, frozen intro clock, close camera/pullback/wide transitions, skip visibility and ticking gameplay clock.
- Reduced-motion wide reveal, four setup rows/default enablement, active seat locking, skip, change-players reset/unlock and live input-status semantics.
- Five named production demo dances with rendered root planar displacement sampled during goal phase, not simulation mutation or limb-only changes.
- 390px setup, active match and reset overflow checks; actual canvas/WebGL context and production runtime-error checks.

## Exact integration contracts to confirm before executing

1. Main exposes #formation-home/#formation-away and #seat-pN-enabled/#seat-pN-team/#seat-pN-device (p1..p4), #start, #skip-intro, #change-players, #clock, #phase-label and #local-input-status with role=status. Disabled setup controls must report disabled through native/fieldset semantics. Defaults enable p1 only. Formation changes update ready-state markers immediately. Buttons remain reachable on mobile.
2. Phase labels are exactly Teams entering, Team spotlight, In play; renderer phase values ready/intro/playing. Entrance-to-intro can take up to 30 seconds. Natural intro exposes camera modes intro then intro-pullback then wide; reduced-motion intro exposes wide. Skip is not visible outside intro. Change players resets to ready without starting a new entrance.
3. Renderer publishes data-controlled-players as JSON object mapping seat IDs p1/p2 to player IDs; no keeper binding. data-player-positions must be JSON object keyed by all ten player IDs, each containing finite numeric x/z of ACTUAL rendered roots, on both #pitch and #demo-pitch. This x/z object encoding is the QA expectation for the contract's otherwise unspecified JSON representation: coordinator/cinematic worker must confirm or adapt the tests to the agreed representation.
4. Markers remain .role-marker[data-player] with visible text A/M/D/GK; slot3 is keeper, slot4 outfield. Existing IDs and team prefixes retained. Keyboard W decreases rendered z; ArrowDown increases z; Q/Period switch, E/Slash pass. Test movement thresholds are 0.3 world units within 3 seconds.
5. Demo keeps /celebrations.html, #demo-pitch, #demo-status[data-phase], button[data-dance], exact first-three names plus Victory orbit and Heel-toe slide. #demo-pitch[data-dance-style] is expected to be zero-based numeric string 0..4; confirm this representation with cinematic/dance workers. All five goal dances must move a home root more than 0.08 units within 2.5 real seconds while still in goal phase.
6. Coordinator builds compiled production assets and Fastify server, then executes `node node_modules/@playwright/test/cli.js test tests/browser/local-party.spec.ts`. Configured server must exclusively own 127.0.0.1:4173. Existing browser suites' eight-player/intro expectations remain coordinator-owned; no changes made here.

## Remaining acceptance limits / manual checks

Pass tests exercise real pass input, but do not guarantee that a human-to-human completed pass actually occurs in live play. Engine worker's deterministic ownership regression is required for that exact receiver path. Camera-mode assertions do not alone establish face direction, both-team closeup subject coverage, or pixel-level visual quality: inspect the real spotlight and verify both teams' welcome dances and smooth pullback. No forced goals, fake possession, engine hooks or fake controller connection were added to manufacture those outcomes.

Physical Sony hardware is NOT validated by keyboard browser coverage or injected unit doubles. On this Windows PC, connect an actual PlayStation pad by USB and Bluetooth separately, press a button, confirm standard mapping/detected device and honest disconnected/unmapped labels; assign it in the lobby. Check left stick/deadzone, Cross pass, Circle shoot, L1 switch, R2 held sprint, Options single-edge pause, two pads simultaneously, mixed keyboard/pad seats, disconnect empty input/status, reconnect, clear/pause held-action suppression and device uniqueness. Confirm no setup keystrokes become gameplay input. Record actual model/transport/browser and observations; never infer success from discovery.
