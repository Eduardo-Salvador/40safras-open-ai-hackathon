# Quality gates for a 3h15 build

The goal is fast convergence, not maximal ceremony. A gate must catch a plausible demo
failure in seconds or it does not belong in the critical path.

## Gate 0 - scope and provenance

- Organizer answer about uncertain reference assets recorded.
- Public repository policy understood.
- Repository baseline commit created.
- MVP and “not building” list read aloud by the team.

## Gate 1 - contracts

- Zod schemas compile.
- Canonical valid and invalid fixtures pass contract tests.
- Frontend, engine, and AI owners confirm the same payload version/hash.

## Gate 2 - engine

- Data tests cover ambiguous municipality selection, exactly 41 complete seasons, units,
  cache hit/miss, prepared fallback, and provenance.
- Pure-function tests cover crop-profile validation, stable ordering, capacity, blocked
  field, seed availability, P20 edge cases, simple finance, deterministic repeat, and diff.
- All critical engine branches are covered. Do not pursue arbitrary repository-wide 100%
  coverage during the event.
- No network, model, clock, or UI dependency in engine tests.

## Gate 3 - AI boundary

- Valid extraction passes Zod.
- Missing values surface as confirmation needs.
- Invalid/malformed output follows one retry then deterministic recovery.
- Key is server-only and absent from client output and Git.
- Numeric explanation verifier has one approve and one reject test.

## Gate 3B - voice boundary

- Microphone permission is requested only after an explicit user action.
- Realtime session uses a short-lived client secret; the project key is absent from client
  code, network payloads after session creation, logs, and Git.
- Canonical Portuguese audio reaches the editable structured draft.
- Missing information produces a concise follow-up question, not an invented value.
- The calculation tool cannot run before explicit confirmation or with invalid Zod input.
- Spoken numeric output is a subset of the returned `PlanResult`.
- Permission denied, disconnect, model failure, and unavailable audio all lead to the
  visible text flow without losing the draft.

## Gate 3C - equal input modes

- The initial screen lists every required category before input begins.
- Voice, natural-language text, and structured form are simultaneously discoverable.
- Each mode writes the same draft contract and can hand off to another mode without loss.
- Text/form complete the journey without first attempting or failing voice.
- Every mode uses the same location resolution and versioned confirmation guard.

## Gate 4 - vertical slice

- Municipality plus canonical spoken brief and canonical text/form brief independently
  reach the same confirmed visible plan; audio may additionally speak the conclusion.
- A field event reaches a visible replan diff.
- Simple financial results trace to the three declared assumptions.
- WhatsApp and Telegram share links open correctly encoded deterministic messages.
- Refresh/restart does not destroy the demo fixture path.
- Browser console has no critical error.

## Gate 5 - offline and claims

- Disable network after startup and run the full rehearsed path for three prepared
  municipalities.
- UI visibly labels cached AI fallback when used.
- Data source, municipality, period, cache state, and synthetic/real status are visible.
- No copy claims prediction, causal certainty, field-level precision, or replacement of ZARC.

## Gate 5B - optional IBGE extension

- Municipality code and soybean series have provenance.
- Missing years and sample size are visible.
- Technological trend is removed before correlation.
- “No detectable signal” is a valid result.
- Analogous yield is an observed historical range, never an unsupported point forecast.

## Gate 6 - independent review

Reviewer checks, in order:

1. functional/demo blockers;
2. numerical or date correctness;
3. schema and secret boundary;
4. race/stale-state and error handling;
5. event-rule and claim risk;
6. WhatsApp encoding/provider and external-data fallback;
7. microphone permission, Realtime secret, confirmation, interruption, and voice fallback;
8. maintainability only where it can break the demo.

P0/P1 findings block the demo tag. P2 is fixed only if the timebox allows. Cosmetic notes
after freeze are ignored unless they reduce comprehension in the pitch.

## Canonical command

Once scaffolding exists, `npm run check` must run typecheck, lint, and tests. Keep it under
60 seconds. CI may mirror it, but local success is the demo prerequisite.

## Completion language

- `implemented`: code exists, checks not yet complete.
- `verified`: named automated checks passed with fresh output.
- `demo-ready`: verified plus canonical live and offline paths rehearsed.
