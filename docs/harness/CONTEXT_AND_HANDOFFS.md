# Context and handoff design

## Context packet by role

| Role | Always receives | Receives on demand | Excludes |
|---|---|---|---|
| Orchestrator | AGENTS, active plan, pending checklist, task graph | any task evidence | full specialist transcripts |
| Task decomposer | AGENTS, active plan, related unchecked checklist items, related graph nodes | linked MVP/architecture/walkthrough sections | implementation transcripts and unrelated docs |
| Spec | event constraints, MVP, contract section | domain notes | implementation details |
| Engine | task card, schemas, crop profiles, deterministic rules | API samples, cache fixture, domain formula note | UI history, prompt experiments |
| AI | task card, schemas, OpenAI boundary | one representative input/output | engine internals beyond contract |
| Frontend | task card, MVP demo story, mock payload | design tokens/reference screenshots | adapter investigation and raw API output |
| Reviewer | acceptance criteria, changed diff, commands/output | architecture invariant involved | author's chain of thought |

## Durable state

Only these artifacts carry state across agent sessions:

- `HACKATHON_PLAN.md`: current phase, decisions, cuts, risks, test/demo evidence.
- `pendencia.md`: canonical granular checklist; checked only with named evidence.
- `TASK_GRAPH.yaml`: dependencies and task status.
- `PROJECT_WALKTHROUGH.md`: canonical plain-language product/build explanation.
- Code and tests: executable truth.
- Handoff blocks: compact result and next risk.

Chat history is not project memory. If a decision matters after context compaction, write
it to the active plan immediately.

When asked “what is pending?”, read `pendencia.md`, filter unchecked items by satisfied
dependencies, and reconcile them with the active plan. Do not regenerate a generic list.

## Contract freeze

The schema file is the synchronization barrier. Before freeze, only the spec/contracts
owner edits it. After freeze, a contract change requires:

1. a one-line reason tied to an acceptance criterion;
2. orchestrator approval;
3. notification to every dependent active task;
4. contract tests updated before consumer code.

## Handoff quality

A handoff is accepted only when it states what changed, exact files, checks with outcomes,
known risks, and the next unblocked task. “Implemented successfully” without evidence is
not a handoff.

Review findings use `severity | file:line | violated criterion | evidence | smallest fix`.
If no defects are found, state the remaining untested risks rather than adding praise.
