# Party6 wide-defense QA handoff

Owned coverage: `shared/wide-defense-stress.test.ts` adds focused checks for mirrored home/away normal and loose-ball phases, lateral width with a modest nonzero depth offset, a single defender pressing while a partner stays goal-side, multi-tick real-engine retreat, human/keeper authority, and the one-defender 1-2-1 shape.

Focused execution: `python .local-server/capture-node.py node_modules/vitest/vitest.mjs run shared/wide-defense-stress.test.ts` — 5 passed, 2 failed. The failures are the mirrored normal/loose phase line-depth check: observed depth difference 4.5m exceeds the required <1.5m. All other coverage passed.

Coordinator owns the source correction; no production files were changed by QA. The real-engine case evaluates defense over time while the enemy remains carrier; it does not assert incidental interception behavior or freeze runtime tactical state.

Coordinator follow-up: the two reported shallow-line failures were the loose-ball fixture at(-6,-7), where a DEF legitimately becomes the forechecker and requires deep cover, not a shallow pair. The normal loose-ball fixture now places the ball at midfield and explicitly asserts neither DEF is pressing; width requirement strengthened from3 to6. Separate mirrored wing-forecheck depth guards remain. The engine scenario now makes the opponent carrier human via normal controls and asserts actual forechecker advance plus spare retreat after15real ticks, not just initially separated geometry. Revised complete focused set:7files129tests passed.