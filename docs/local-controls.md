# Local input handoff

Owned files: src/local-input.ts, src/local-input.test.ts, src/local-lobby.ts, src/local-lobby.test.ts, src/local-lobby.css, this document. Legacy src/input.ts unchanged. No dependencies/config edits or commits.

Verification (actual runs)
- RED: `node node_modules/vitest/vitest.mjs run src/local-input.test.ts` failed importing the not-yet-created input module.
- GREEN: same command passed 5 tests after implementation.
- RED: `node node_modules/vitest/vitest.mjs run src/local-lobby.test.ts` failed importing the not-yet-created lobby module.
- GREEN: combined owned suites passed 8 tests.
- Regression RED: input suite had 2 failures / 4 passes for held pad sprint after clear and double-counted touch diagonal. Fixed both paths.
- Final GREEN: `node node_modules/vitest/vitest.mjs run src/local-input.test.ts src/local-lobby.test.ts` passed 2 files / 9 tests.
- Focused typing passed (exit 0): `node node_modules/typescript/bin/tsc --noEmit --ignoreConfig --strict --skipLibCheck --target ES2022 --module ESNext --moduleResolution Bundler --lib ES2022,DOM,DOM.Iterable --types node,vite/client src/local-input.ts src/local-input.test.ts src/local-lobby.ts src/local-lobby.test.ts`.

Integration contracts for coordinator
- Import LocalInputHub from src/local-input and mountLocalLobby from src/local-lobby. Lobby imports its own scoped CSS. Mount once; onChange receives normalized seats. readSeats() also normalizes; duplicate devices/IDs are omitted by shared helper, empty setup falls back to p1/home/keyboard1. Duplicate rows display an explicit warning, and other assigned-device options are disabled.
- At match setup call hub.setSeats(lobby.readSeats()), assignLocalControls(state,seats), and lobby.setLocked(true). Unlock on returning to setup. Defaults: p1 keyboard1/home checked; p2 keyboard2/away, p3 gamepad:0/home, p4 gamepad:1/away unchecked.
- Forward gameplay event.code to keyDown/keyUp; forward touch pointer ID and legacy KeyW/A/S/D, Space, KeyE, KeyQ, ShiftLeft codes to pointerDown/pointerUp. Setup fieldset stops bubbling keyboard/pointer events; global listeners must use bubbling (not capture) and exclude other editable setup controls too. Coordinator owns those listeners. Call clear on pause, focus loss, match/reset/intro-skip boundaries; continue forwarding releases. Held buttons/keys/touch actions remain suppressed until release. Gamepad movement remains live; held sprint/actions are suppressed.
- Poll exactly once per RAF. Record seat-keyed inputs, consume shoot/pass/switch pulses only once across fixed steps, preserving pulses until a step actually runs. Movement/sprint are held values. pausePressed combines Escape and standard-pad Options rising edges; never repoll within fixed steps. Feed stepLocalGame using the returned seat IDs. Consume/discard action edges during intro so none leak into kickoff.
- Render disconnected seat IDs in #local-input-status; an assigned disconnected pad yields empty input, never AI-looking movement or a success claim. Refresh lobby devices on gamepadconnected/gamepaddisconnected and while setup is visible so button-activated browser discovery appears. A selected missing controller remains as a labeled disconnected placeholder; other controller options are genuinely detected devices only. Nonstandard mapping produces empty input and an unsupported warning.
- Keyboard1 WASD/Space/E/Q/LeftShift; keyboard2 arrows/Enter/Slash/Period/RightShift. Without keyboard2, keyboard1 retains arrow and RightShift aliases. Touch supplements first normalized seat only. Standard pad uses axes 0/1 radial deadzone .18, buttons 0 pass / 1 shoot / 4 switch / 7 sprint / 9 pause; action buttons pulse, sprint holds. Analog values are finite-clamped and diagonals normalized.

Remaining validation
- Lobby tests use a minimal DOM unit double, not browser layout/event-propagation verification. Coordinator/QA must run real integration and mobile layout checks after writers finish.
- No browser suites/full builds run. No physical Sony/USB/Bluetooth verification performed; injected gamepad samples prove mapping logic only. Manual hardware connection, standard mapping, disconnect/reconnect, Options edge and simultaneous keyboard/pad play remain required.
