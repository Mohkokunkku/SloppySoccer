# Party 2 defaults handoff

Owned tuning defaults are updated in `shared/tuning.ts`: field dimensions are 35.2 × 22, sprint multiplier is 1.15, and field width/height sliders use 0.1 increments. Canonical `FIELD.width`/`height` and existing power settings were not changed.

Added enlarged-field/sanitization/formation coverage in `shared/party-defaults.test.ts` and updated expected tuning defaults in `shared/tuning.test.ts`.

TDD evidence: focused RED run `python .local-server/quiet-node.py node_modules/vitest/vitest.mjs run shared/party-defaults.test.ts` failed as expected (fieldWidth was 32, expected 35.2). GREEN run `python .local-server/quiet-node.py node_modules/vitest/vitest.mjs run shared/party-defaults.test.ts shared/tuning.test.ts` passed: 2 files, 7 tests.

Limitations: the larger field defaults may invalidate legacy geometry assumptions in other tests; contract assigns fixture corrections to the coordinator. No full build/E2E run, per worker contract.
