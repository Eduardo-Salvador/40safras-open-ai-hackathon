# Quarenta Safras - operating contract for coding agents

This repository contains the operating harness for Quarenta Safras.
Read this file first. It is a map, not the full project documentation.

## Reference boundary

- Reference documents and mockups are inputs, not product implementation.
- Do not present reference code, synthetic values, or third-party assets as work created
  by the team.
- Record what was reused, rebuilt, generated, or obtained from third parties.
  Product implementation is then authorized.

## Read path

1. Read `docs/exec-plans/active/HACKATHON_PLAN.md`.
2. If you are orchestrating, decomposing work, or answering “what is pending?”, read
   `pendencia.md`; report unchecked ready work by dependency, not from chat memory.
3. Read the task card assigned to you in `docs/exec-plans/TASK_GRAPH.yaml`.
4. Read only the linked product, architecture, walkthrough, and harness sections.
5. Inspect the exact files you own before editing.

Use progressive disclosure. Do not load every document into every agent.

## Product invariant

Quarenta Safras accepts a Brazilian municipality and a farm-operation brief, loads and
caches 41 historical climate seasons, creates a soybean-to-second-crop-corn planting
sequence, and replans after a field event with an auditable diff. The LLM interprets
language and explains a ready JSON payload. All dates, scores, feasibility decisions,
and money values come from deterministic code.

The MVP is defined only by `docs/product-specs/MVP.md`. The mockup and older technical
documents are references, not specifications.

`docs/product-specs/PROJECT_WALKTHROUGH.md` is the canonical plain-language explanation.
`pendencia.md` is the canonical implementation checklist. Checked items require evidence
in the active plan; an unchecked item must not be described as complete.

## Work protocol

- One task, one owner, one explicit file set, one verifiable completion condition.
- Never edit a file owned by another active task. Ask the orchestrator to reassign it.
- Parallelize only graph nodes with satisfied dependencies and disjoint write sets.
- Freeze shared schemas before frontend, engine, and AI integration run in parallel.
- Prefer the smallest vertical slice that improves the three-minute demo.
- Do not add a dependency, endpoint, screen, agent, or abstraction without naming the
  acceptance criterion it unlocks.
- Do not silently weaken a failed test or acceptance criterion.
- Never claim completion without fresh command output or manual-demo evidence.
- Keep numbers out of generated prose unless they exist in the source payload.
- Never expose `OPENAI_API_KEY`; `.env*` stays ignored and server-only.

## Context and handoff

Before editing, restate: task id, objective, owned files, dependencies, and checks.
At completion, return the compact handoff defined in
`docs/templates/HANDOFF.md`. Record durable decisions in the active plan, not chat.

## Verification

Once the event scaffold defines scripts, the canonical gate is `npm run check`.
Until then, use the task-specific commands in the active plan. Engine changes require
unit tests; API/schema changes require contract tests; UI changes require a manual
happy-path and offline-path check. The independent reviewer evaluates the diff against
the spec and event rubric before the demo tag.

## Scope and safety

- No Streamlit, basic RAG, image analyzer, generic chatbot, medical advice, candidate
  screening, or dashboard-as-the-product.
- Live geocoding and climate retrieval are product features, but the canonical demo path
  must also work from cache. External APIs never become the only demo path.
- This is decision support and a hackathon prototype, not agronomic, financial, credit,
  insurance, or ZARC guidance.
- Do not copy implementation from the reference HTML or guide without explicit approval.
  Rebuild product behavior and document every reused or third-party asset.

## Documentation map

- Product: `docs/product-specs/MVP.md`
- Plain-language project walkthrough: `docs/product-specs/PROJECT_WALKTHROUGH.md`
- Canonical pending-work checklist: `pendencia.md`
- Stack: `docs/STACK.md`
- Architecture/contracts: `docs/ARCHITECTURE.md`
- Orchestration: `docs/harness/ORCHESTRATION.md`
- Context/handoffs: `docs/harness/CONTEXT_AND_HANDOFFS.md`
- Quality gates: `docs/harness/QUALITY_GATES.md`
- Event constraints: `docs/references/EVENT_CONSTRAINTS.md`
- Source reconciliation: `docs/references/SOURCE_RECONCILIATION.md`
- Active execution state: `docs/exec-plans/active/HACKATHON_PLAN.md`
- Complex-task decomposer prompt: `docs/harness/agents/task-decomposer.md`

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
