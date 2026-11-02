# Role AI branch contract
Branch `feature/role-based-ai`; main/live localhost:3000 must remain unchanged. Real-time gameplay, not turn-based. Each team has attacker (ID suffix0), midfielder/middle man (1), defender (2), keeper (3). Keep physical Player.role outfield/keeper intact; add optional Player.tacticalRole: TacticalRole for backward-compatible fixtures. Roles are assigned on creation and preserved on kickoff and control switch. User-controlled player is never moved by AI.

## Pure planner ownership/API
Tactics agent owns ONLY shared/tactics.ts and shared/tactics.test.ts. Parent owns types/engine/integration/UI/docs and Git. TypeScript NodeNext .js imports.
Export `tacticalRoleOf(player: Player): TacticalRole | null`: keeper -> null; explicit tacticalRole wins; legacy ID0 attacker/1 midfielder/2 defender; unknown legacy outfielder -> midfielder.
Export `interface TacticalIntent { playerId: string; x: number; y: number; action: 'carry'|'support'|'press'|'cover'|'hold'; arrivalRadius: number }`.
Export `planTeamMovement(state: GameState, team: Team): TacticalIntent[]`: deterministic, pure, finite bounded world-coordinate targets, one intent per UNCONTROLLED outfield player of requested team, no keepers, no mutations.

## Behavior
- Own possession: attacker finds space ahead with an open pass lane (score candidate positions for interception risk and defender clearance), midfielder offers a connecting pass option behind attacker/ahead of deep defender, defender stays behind as cover. Carrier moves by role: attacker can advance to goal, midfielder advances less, defender stays conservative enough to pass out.
- Defending: exactly one AI presser at most; other midfielder blocks the lane between opposing midfielder/carrier and attacker, defender stays goal-side/deeper between enemy attacker and own goal. Prefer not to drag defender upfield unnecessarily; allow emergency pressure in own danger area.
- Opponent keeper holding securely: avoid charging/crowding his hands, maintain formation awaiting clearance.
- Loose/moving ball: only one AI chaser per team, lead the ball's trajectory; others retain attack/midfield/defense shape, no synchronized swarm.
- Support targets have an arrival deadzone (about0.5-0.7 units) so settled figures stop rather than endlessly shuffle. Press/carry may use smaller radius. Parent handles arrival stopping and preserves facing while stationary.
- Attack-normalized x=world x*(home?1:-1); own goal -16/opponent+16. Tests mirror x and x velocities across teams. FIELD32x20, boundaries player radius .62.

## Acceptance
Test role fallback/override; attacking depth separation and pass-lane choice; defending screen and deepest cover; <=one presser/chaser; opponent keeper no swarm; excludes controlled/keeper; bounded deterministic pure results and mirrored home/away. Strict test-first RED/GREEN vertical slices. npx vitest run shared/tactics.test.ts. Do not install packages/edit other files/commit. Parent independently verifies all110 existing tests and browser.
