# Stack decision

## Decision

Use one TypeScript codebase:

| Layer | Choice | Reason for the hackathon |
|---|---|---|
| App | Next.js, App Router, TypeScript strict | One dev server, UI and server routes together, easy deploy |
| Input UX | Voice, natural-language text, and structured form over one draft state | Producer chooses the practical mode and can switch without losing data |
| Validation | Zod | One runtime schema shared by forms, AI outputs, engine, and API |
| OpenAI | Official JS SDK, Responses API | Structured extraction and concise explanation without a runtime agent framework |
| Voice | OpenAI Agents SDK for JS RealtimeAgent/RealtimeSession over browser WebRTC | Fast natural Portuguese conversation, interruption support, and tool calls |
| Voice model | `OPENAI_REALTIME_MODEL`, default `gpt-realtime-2.1-mini` | Lower-cost, low-latency audio input/output with function calling |
| Model | `OPENAI_MODEL`, default `gpt-5.6-terra` | Strong structured output with a cost/capability balance |
| Reasoning | `low` for interactive calls | Demo latency matters; deterministic code carries hard reasoning |
| Engine | Pure TypeScript functions | 41 seasons are small; no Python service or data-frame dependency needed |
| Data | Live geocoding/climate adapters, local cache, and prepared JSON/CSV fixtures | Any municipality without sacrificing an offline demo |
| Tests | Vitest | Fast unit and contract checks in the same language |
| Styling | CSS Modules/global tokens | Preserve the editorial agrarian direction without a template-heavy UI kit |
| Deploy | Local demo first; Vercel only after the offline path works | Public URL is useful, but network is not a demo dependency |

Official OpenAI model guidance recommends the Responses API for reasoning and tool-use
workflows and positions `gpt-5.6-terra` as the balance of intelligence and cost. Its
model page lists Structured Outputs support. Keep the model configurable because event
credits or account access may dictate another allowed model.

Official voice guidance identifies `RealtimeAgent` plus `RealtimeSession` as the fastest
JavaScript path for a browser voice assistant. The browser uses WebRTC and a short-lived
client secret minted by the application server. Realtime function calling is supported,
but Structured Outputs are not, so every tool argument still requires local Zod validation.

## Why both OpenAI SDKs are installed

`openai` is the direct API client. It runs on the server for Responses API calls and for
creating the short-lived Realtime client secret. The application owns the request/response
flow around it.

`@openai/agents` is the higher-level runtime used only for the browser voice experience.
`RealtimeAgent` and `RealtimeSession` manage WebRTC audio, conversational turns,
interruptions, session state, and tool execution. It uses OpenAI APIs underneath; it does
not replace the server SDK and does not own domain calculations.

```text
typed natural language -> openai/Responses -> OperationDraft
voice -> @openai/agents/Realtime -> OperationDraft
structured form -> Zod directly -> OperationDraft
confirmed draft -> pure TypeScript planner -> PlanResult
```

Neither SDK calculates dates, climate feasibility, P20, ranking, finance, or replans.

Sources:

- https://developers.openai.com/api/docs/guides/latest-model
- https://developers.openai.com/api/docs/models/gpt-5.6-terra
- https://developers.openai.com/api/docs/guides/voice-agents
- https://developers.openai.com/api/docs/models/gpt-realtime-2.1-mini

## Deliberate exclusions

- No Streamlit: expressly prohibited by the event.
- No Python/FastAPI split: it doubles setup, contracts, processes, and integration risk.
- No user database: the MVP has no accounts or durable farm history. A simple file/cache
  adapter is enough for climate reuse and prepared municipalities.
- No runtime multi-agent orchestration: the single Realtime voice agent and two bounded
  Responses calls are easier to trace and demo than autonomous handoffs.
- No RAG: the project is an operational simulator, not document retrieval.
- No map, authentication, NASA validation, or live IBGE dependency in the core path.
- WhatsApp and Telegram use credential-free share links; an outbound Telegram bot is optional.
- No heavy optimizer. Enumerate the small candidate set deterministically.

## Runtime AI calls

1. `voice_session`: Portuguese audio conversation -> confirmed tool arguments. The
   server creates an ephemeral secret; browser audio travels over WebRTC.
2. `confirm_operation_and_calculate`: Realtime tool call -> Zod validation -> pure planner.
3. `parse_operation_brief`: typed natural language -> the same editable draft used by voice/form.
4. `parse_field_event`: typed natural language -> `FieldEvent` JSON.
5. `explain_plan` is optional after the vertical slice passes. It receives a complete
   `PlanResult` and may only verbalize values already present. If verification fails,
   show deterministic copy instead.

The structured form needs no model call. All modes require schema validation and human
confirmation. The engine
never consumes unvalidated model text or audio-derived assumptions.

## Fast-development choices

- One Next.js server handles UI, OpenAI, geocoding, climate, and optional IBGE adapters.
- Plain TypeScript arrays are sufficient for 41 seasons; a second Python service would
  add process, deployment, and contract overhead.
- Culture rules are configuration, so soybean/corn work does not hard-code the planner.
- `wa.me`, `t.me/share/url`, and Web Share provide real sharing without provider credentials.
- Prepared fixtures make external APIs enhancements to the experience, not single points
  of failure.

## Dependency rule

When scaffolding, pin the versions produced by the scaffold. Do not chase latest versions
during the hacking window. A new dependency requires an acceptance criterion and must
keep a clean install under the team's agreed time budget.
