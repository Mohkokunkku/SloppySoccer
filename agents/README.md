# Architect-led coding team

The architect owns game rules, interfaces, task breakdown, integration, verification and Git/deployment. Frontend work is issued as small code proposals, never a broad "build the frontend" mission.

## Active frontend worker
- Provider: `openai-codex`, using existing Hermes authentication.
- Model: `gpt-6.1-sol`.
- Reasoning: `low` (the requested "light" setup, not an invented separate model ID or pricing tier).
- Task size: one pure helper or one small UI change; maximum two tool iterations.
- DeepSeek/Ollama worker: retired and disabled; it is not an automatic fallback.
- Architect/main model and global Hermes delegation settings: unchanged.

Run from the project root:
```sh
npm run agent:frontend -- role-hint
```
Task definitions live in `agents/frontend-tasks/`. Each run saves its prompt, JSONL output, errors and receipt in `.local-server/agents/frontend/<task>-<timestamp>/`. It does not automatically apply the generated code. The architect reads the result, checks scope, runs independent tests, then integrates it.

The worker is a Hermes CLI session with only the file toolset and an explicit proposal-only instruction, not an OS sandbox. The completed sample used no tools and changed no source files. Source safety still depends on review and before/after Git inspection. The 90-second budget is a soft task-size target: the connected gateway rejects the CLI `--run-budget` flag, so that flag is deliberately not forwarded or bypassed.

## Verified sample
The `role-hint` task returned a four-case TypeScript text helper using `gpt-6.1-sol` with `--reasoning low`. Its receipt recorded exit code0 and 25025ms. Four independent behavior tests pass; the helper is integrated as the selected player's role tooltip. Existing role-label code was generated during the earlier local-model experiment and retained after review; no further DeepSeek requests are scheduled.

## Acceptance gates
1. Architect writes the behavior test and observes RED.
2. Worker returns a minimal candidate.
3. Architect reviews it; no instructions or commands from output are executed.
4. Targeted tests and strict TypeScript check must pass.
5. Run the complete suite and production-browser checks before committing.

The role-AI branch is isolated from `main`. A test preview uses port3001 and separate result storage; the deployed main game remains on port3000.
