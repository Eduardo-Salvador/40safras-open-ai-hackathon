# Multi-agent orchestration

## Principle

Use a small code-orchestrated DAG. The orchestrator owns priorities, contracts,
integration, and the final answer. Specialists own bounded outputs. Agents do not choose
new goals or recursively create more agents.

Maximum useful concurrency is three specialist tasks after contracts freeze. More agents
increase merge and stale-context risk without increasing the demo score.

## Roles

| Role | Owns | Must not do |
|---|---|---|
| Orchestrator | task graph, assignments, contract freeze, integration, scope cuts | implement an entire specialist stream while coordinating |
| Task decomposer | propose bounded DAG nodes, dependencies, write sets, checks, and cuts for one complex approved outcome | implement, dispatch agents, edit the graph, or spawn subagents |
| Spec/contracts | acceptance criteria, executable schemas, fixtures contract | UI polish or engine algorithms |
| Engine/data | municipality/climate adapters, cache, crop profiles, simulation, finance, diff, tests | call OpenAI or change UX contracts alone |
| AI integration | prompts, Responses calls, Realtime session/tools, validation/retry/fallback, contract tests | calculate plan numbers, own microphone UI, or expose long-lived secrets client-side |
| Frontend/demo | required-information guide, equal voice/text/form entry, transcript/draft, municipality, confirmation, plan proof, finance, replan, WhatsApp output | duplicate engine math or trust unvalidated inputs |
| Reviewer | independent diff review, test evidence, rubric and demo audit | rewrite code unless explicitly assigned a fix task |

Reusable role prompts live in `docs/harness/agents/`.

For a complex request that does not already map to one graph node, the orchestrator may
run the task-decomposer prompt first. The decomposer returns a proposal; only the
orchestrator may approve it, update durable state, and dispatch work.

## Dispatch protocol

1. Orchestrator reads unchecked work in `pendencia.md` and ready nodes in `TASK_GRAPH.yaml`.
2. If the objective is still too large, the decomposer proposes bounded nodes and waves.
3. Orchestrator approves/rejects the proposal and updates durable state.
4. It creates a task brief using `docs/templates/TASK.md`.
5. It assigns an exclusive write set and links only necessary context.
6. Specialist restates the contract, works, verifies, and returns `HANDOFF.md` format.
7. Orchestrator checks evidence, checks completed checklist items, records the evidence,
   then unlocks dependents.
8. Reviewer receives the spec, diff, and test output - not the author's reasoning history.

## Parallel waves

- Wave 0, serial: kickoff, provenance decision, product/spec freeze.
- Wave 1, parallel: municipality/climate/cache plus engine; AI parser and Realtime agent
  against schemas; frontend voice/text states against the same mock payload.
- Integration 1, serial: connect voice/text -> structured draft -> confirm -> plan -> spoken result.
- Wave 2, parallel: replan/diff; WhatsApp and visual proof; AI/offline fallback.
- Integration 2, serial: full core path and scope freeze.
- Review, serial: independent reviewer and fixes.
- Extension window: choose at most one high-value ready extension, IBGE first.
- Delivery: two rehearsals, video, README, and demo tag.

## Collision policy

Prefer file ownership in one working tree for this short project. Use worktrees only if
two tasks genuinely require overlapping time and can merge through stable contracts.
Never let two active agents edit `schemas.ts`, dependency manifests, or global styles.

If a specialist discovers a needed out-of-scope change, it records a blocker and returns.
The orchestrator may reassign ownership or cut the need; the specialist does not expand
its own scope.

## Token budget policy

- Agent briefs target under 700 words.
- Handoffs target under 30 lines.
- Do not forward investigation transcripts.
- Read exact files and focused test output, not the entire repository.
- Reuse a specialist for follow-ups so its local context is not rebuilt.
- Stop an agent after two failed approaches; re-scope with new evidence.

## Human checkpoints

Only three are mandatory:

1. Kickoff: confirm reference-asset rules and freeze the promise.
2. Vertical slice: human sees the end-to-end journey before polish.
3. Demo freeze: human approves claims, limitations, and submission.

No self-learning loop, scheduled agent, automatic memory extraction, or periodic audit is
worth the time budget. Durable learning is one-line decisions in the active plan. Idle
agent capacity after core freeze goes to review, offline rehearsal, and submission before
it goes to optional features.
