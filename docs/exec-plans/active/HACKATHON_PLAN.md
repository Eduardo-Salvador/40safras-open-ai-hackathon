# Active hackathon plan

## Current state

- Active node: four-area execution setup
- Product code: deterministic baseline present on `origin/main`; checklist evidence still needs reconciliation
- Scope: operational planner defined in `docs/product-specs/MVP.md`
- Remote repository: `https://github.com/Eduardo-Salvador/40safras-open-ai-hackathon`
- Branch plan: `docs/exec-plans/branches/README.md`

## Core outcome

The canonical path is:

```text
Brazilian municipality
-> Portuguese voice, natural-language text, or structured-form operation brief
-> confirmed structured input
-> 41-season cached climate dataset
-> baseline versus recommended soybean-to-corn plan
-> P20 operational and simple financial evidence
-> field event
-> auditable replan
-> short spoken conclusion
-> WhatsApp, Telegram, or Web Share
```

IBGE calibration, analogous-yield range, Telegram Bot sending, and another crop profile are
ordered extensions. They never block the core.

## Kickoff checklist

1. Confirm the MVP, canonical municipality, two backup municipalities, and crop profiles.
2. Confirm whether the UX mockup may be used as a visual reference.
3. Record reused, rebuilt, generated, and third-party assets.
4. Initialize/connect Git, create a baseline commit, and make the repository public:

   ```powershell
   git init
   git branch -M main
   git remote add origin https://github.com/Eduardo-Salvador/40safras-open-ai-hackathon.git
   git commit --allow-empty -m "chore: establish repository baseline"
   ```

5. Scaffold Next.js with TypeScript, install Zod, OpenAI SDK, OpenAI Agents SDK, and
   Vitest, then pin versions.
6. Freeze schemas and soybean/corn profiles.
7. Assign three exclusive Wave 1 write sets: data/engine, AI, and frontend.

Do not push, force-push, or rewrite remote history without explicit human authorization.

## Timeline and stop conditions

| BRT | Gate | If late |
|---|---|---|
| 11:45-12:00 | K0 complete, repo/scaffold/roles fixed | Use only canonical municipality plus two prepared fallbacks |
| 12:00-12:20 | S1 schemas and crop profiles green | Stop parallel work until contracts pass |
| 12:20-13:10 | Wave 1: data/engine, Realtime voice/AI, UI on frozen contracts | Use prepared climate fixtures; keep live fetch adapter thin |
| 13:10-13:30 | I1: voice/text/form -> confirmation -> real plan before lunch | Cut generated explanation and interactive history, never an input mode |
| 14:30-15:00 | Wave 2: replan, WhatsApp output, offline states | Use one fixed event; keep finance to three declared inputs |
| 15:00-15:10 | I2 core integration and scope freeze | Do not begin extensions before core review |
| 15:10-15:25 | R1 review and P0/P1 fixes | Core reliability beats every extension |
| 15:25-15:35 | One extension only if core is clean: X1 preferred | Cut X2/X3 unless setup is already ready |
| 15:35-15:47 | Video, README, public/deploy links | Use local capture if deploy is unstable |
| 15:47-15:55 | Two timed rehearsals and Q&A | Shorten narration, not proof |
| 15:55-16:00 | Submit and verify | Stop editing code |

## Extension priority

1. `X1` IBGE calibration and analogous-yield range: strongest technical evidence.
2. `X2` Telegram Bot sending: only when token/chat ID are ready and the core is green.
3. `X3` another crop profile: only with reviewed parameters and tests.

Never start two extensions merely because two agents are idle. The reviewer and demo work
have higher value after core freeze.

## File ownership ledger

| Task | Agent/person | Paths | Started | Released |
|---|---|---|---|---|
| K0/K1/S1/S2/A1/O1 + backend integration | `Eduarco` branch | contracts, APIs, OpenAI, manifests/configs and execution docs | after `main` sync | - |
| F1/F2 + visual integration | `Murilo` branch | UI, global styles, components, sharing and assets | after S1/S2 freeze | - |
| D1 | `Vitor` branch | geocoding, climate normalization, cache and municipality fixtures | after S1/S2 freeze | - |
| E1/E2 | `Pedro` branch | deterministic planner, simulator, metrics, finance and diff | after S1/S2 freeze | - |

## Decision log

| Phase | Decision | Evidence / consequence |
|---|---|---|
| baseline | operational v2 over diagnostic-only v1 | User sees and executes a planting order |
| baseline | any Brazilian municipality in core | Geocoding + climate adapter generalize cheaply; cache protects demo |
| baseline | soybean -> corn, config-driven engine | Real multi-crop path without unsupported broad claims |
| K0 | soybean -> second-crop corn is the validated demonstration path, not a hard-coded product limit | The jury may be shown that new grains enter through reviewed configuration profiles and profile-specific tests; the team must not claim support or agronomic validation before those tests exist |
| K0 | UX mockup authorized as visual reference only | Rebuild the product interface and behavior from scratch; do not copy reference HTML or present reference assets/code as team implementation; record any specifically reused or third-party asset |
| baseline | simple finance in core | Makes delay/ordering impact legible using declared assumptions |
| baseline | credential-free sharing in core | `wa.me`, Telegram share, and Web Share avoid provider setup |
| baseline | IBGE after core review | Valuable calibration, but not required to compute operational order |
| baseline | analogous yield range, no point prediction | More honest with a small municipal annual sample |
| baseline | TypeScript end-to-end | Fast single-process development and deployment |
| baseline | deterministic planner; LLM at language boundary | Traceable numbers and reliable offline demo |
| baseline | voice, text, and form are equal entry modes | Producer chooses a mode; all modes share one draft and deterministic boundary |
| baseline | explicit confirmation before voice tool call | Prevents misunderstood audio from reaching the planner |
| baseline | `pendencia.md` is the granular pending-work authority | Future status answers report unchecked dependency-ready items with evidence |
| baseline | walkthrough is the canonical plain-language explanation | Product/build questions reuse one unambiguous end-to-end narrative |
| baseline | task decomposer proposes but never dispatches | Complex work can be split safely without recursive agent ownership |
| baseline | direct SDK on server, Agents SDK for browser voice | `openai` handles API calls; `@openai/agents` handles Realtime session mechanics |
| execution | four areas follow team strengths | Murilo owns frontend; Eduarco owns backend/IA; Vitor owns external data; Pedro owns deterministic analytics. Write sets are disjoint and integration crosses only contracts/APIs |
| execution | pure E1 may start from the frozen historical fixture while D1 runs | Pedro and Vitor can work in parallel; I1 remains blocked until Vitor proves the normalized 41-season dataset |

## Cuts made

None yet.

## Verification evidence

| Gate | Command/manual path | Result | Time |
|---|---|---|---|
| - | - | - | - |

## Open risks

- Forty-one years of live climate data may be slow; prepared cache is mandatory.
- Municipality names can be ambiguous; confirmation must include state and coordinates.
- “End of rains” and financial formulas are prototype assumptions, not agronomic truth.
- SIDRA codes, missing years, and small samples can make IBGE calibration unavailable.
- Telegram Bot sending depends on a bot token/chat ID and is never required for the demo.
- Realtime access, microphone permission, network jitter, and ambient noise can fail;
  text input and prepared drafts remain mandatory fallbacks.
- Additional crop profiles need defensible parameters, not copied labels.

## Demo-ready criteria

- `npm run check` green.
- Canonical Portuguese voice brief and canonical text/form brief independently reach
  confirmation and the same calculation; permission-denied preserves the draft.
- Any-municipality live path demonstrated at least once outside the final demo.
- Three prepared municipalities load offline.
- Canonical municipality plan and replan work online and offline.
- Financial values trace to declared inputs and deterministic payloads.
- WhatsApp and Telegram share links open correctly encoded messages.
- No open P0/P1 reviewer finding.
- Claims and limitations are visible.
- Two three-minute rehearsals completed.
