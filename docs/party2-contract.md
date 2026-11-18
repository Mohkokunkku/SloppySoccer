# Party controls / charged shots / full-time celebrations

Branch: feature/party-controls-charged-shots, based on verified merged main a1668715be5403771d42b971bfdf817cfc15fbdd. This document is a coordinator planning contract; no implementation or worker completion is claimed yet.

User-requested changes:
1. Default field dimensions: 35.2 by 22 (10% over 32 by 20); sprint multiplier 1.15. Keep a canonical 32x20 tactical coordinate basis rather than accidentally multiplying normalized AI/formation coordinates twice.
2. Original SVG keyboard/gamepad diagrams with accurately labelled active controls. Colored player/device tokens for graphical team assignment, plus click/keyboard alternatives to drag-and-drop; preserve unique device assignment and stable seat control IDs.
3. Per-human-seat hold/release shot charging and a visible kick meter. Tap is a weak accurate kick; charging increases power and bounded directional spread. Keep deterministic engine replays, ordered action queues, pause/blur/visibility/disconnect clearing, no shot leakage across intro/kickoff/possession/control changes. Preserve AI shots and keeper clearances unless explicitly extended.
4. Full-time winner party instead of a frozen pitch: three randomly chosen original themes with camera shots, traveling dances, happy winner faces and a short disappointed-loser reaction. Draws get a neutral ending. Final score/save-once must remain correct; no scoring or controls during the party, pause/mute/reduced motion/skip/rematch supported. Use original/licensed music and spoken cheers, not a recording of a commercial song.

Operational constraints:
- Coordinator owns shared shapes, interfaces, integration, package/config/Git, final build/browser validation and preview activation.
- Coding workers must use the user-approved Luna model after exact live model verification; do not silently substitute Sol or a higher-cost model. Keep parent architect model unchanged.
- No automatic deployment, task/service installation or global configuration edits. Existing SloppySoccer-GitHubDeploy stays disabled; no repeated console windows. Workers will be one-shot, quiet, bounded, with disjoint ownership and receipts.
- Existing production and result data remain untouched. Do not alter label spacing, original keeper/Argentina moulds, aggressive-defender safeguards or device ownership semantics.
- Worker scopes and finalized shared API contracts must be written before any specialist implementation begins.
