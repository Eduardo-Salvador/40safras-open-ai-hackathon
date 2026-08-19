# Product specification - MVP

Status: frozen candidate for kickoff. The human product owner may change it once during
kickoff; later additions require a cut of equal or greater cost.

## Promise

For a soybean producer planning a second corn crop, provide a Portuguese planning
assistant that accepts the operation by voice, natural-language text, or structured form,
turns every mode into the same confirmed input, creates a robust planting order for any
Brazilian municipality, proves the order against 41 historical climate seasons, and
replans transparently when field conditions change. After a plan is ready, the producer
may identify themselves to save it, find it later, and replan from that saved plan.

## Three-minute story

1. The first screen lists the information needed: municipality, area, planter capacity,
   seed cycles, field blocks, second-crop target, and simple margin assumptions. Voice is
   the dominant initial action. A visible “Prefere digitar?” action reveals independent
   natural-language text and structured-form paths in one click.
2. The assistant asks only for missing required values. The screen shows the same editable
   draft in every mode, then the assistant reads or displays a concise summary and waits
   for explicit confirmation before requesting any calculation.
3. Voice/text model arguments and direct form input are validated with the shared Zod
   schema. The deterministic engine, not a model or UI component, performs every date,
   feasibility, and financial calculation.
4. The app geocodes the municipality, loads 41 climate seasons, and caches the normalized
   dataset. A prepared municipality is available when the network is unavailable.
5. The deterministic engine compares the usual order with the Quarenta Safras order.
6. The agent speaks a short conclusion while the UI shows the recommended sequence and
   its proof: viable seasons, second-crop area at P20, simple financial result at P20,
   and historical-strip evidence.
7. If the producer chooses “Salvar este plano”, the app asks for e-mail and password only
   then. The field called “E-mail” is sent as `username` to the demo login. Cancelling
   keeps the calculated result visible but does not save it.
8. A field event arrives by voice or text from a saved plan. The AI extracts changed constraints, the
   engine recomputes, and the UI shows what moved, why, and the impact.
9. The result is shared through a real WhatsApp deep link. The team reveals the boundary:
   AI interprets and communicates; code calculates.

### AC-00 - Multi-input confirmed calculation

- The initial screen explains what must be spoken or filled, presents voice as the
  dominant action, and keeps a visible one-click path to text and structured-form entry.
- The browser starts a Portuguese speech-to-speech session only after microphone consent.
- The agent can collect the canonical operation through natural conversation and exposes
  a synchronized transcript or editable structured draft.
- The agent must summarize required inputs and receive explicit confirmation before it
  can call the calculation tool.
- Every tool call is parsed by the shared Zod schema; invalid or incomplete arguments do
  not reach the planner.
- The calculation result comes only from the deterministic engine and is returned to the
  voice session for a short spoken explanation.
- Natural-language text and the structured form complete the same flow independently of
  microphone availability. Voice failure preserves the draft and never blocks either path.

## Supported crop path

The engine is configuration-driven, but the validated product path is:

```text
soybean first crop -> corn second crop
```

Adding another crop means adding a reviewed crop profile, not changing planner code.
The interface must not claim validated support for profiles that do not exist.

## Functional acceptance criteria

### AC-01 - Structured operation brief

- Given the canonical Portuguese brief, the app returns `FarmOperationInput` matching
  the shared schema.
- Missing or ambiguous required values are shown for confirmation; they are not invented
  silently.
- Invalid AI output cannot reach the simulator.

### AC-02 - Any Brazilian municipality with safe fallback

- The user can search a Brazilian municipality by name and state.
- Geocoding returns a normalized municipality, coordinates, elevation when available,
  and timezone.
- The app retrieves and normalizes exactly 41 complete climate seasons for that location.
- Successful results are cached by normalized grid/location key.
- Source, period, units, retrieval status, and cache status are visible.
- At least three prepared municipalities work with the network disabled.

### AC-03 - Configurable soybean-to-corn path

- Soybean and second-crop corn parameters live in reviewed configuration, outside the
  planner algorithm.
- The plan respects field area, planter capacity, seed availability, cultivar cycle,
  blocked periods, and second-crop target.
- Unsupported crop paths fail clearly instead of silently using soybean rules.

### AC-04 - Deterministic planning across 41 seasons

- The same operation, dataset, and assumptions always produce the same result.
- The engine compares a documented baseline order with at least one candidate order.
- It returns sequence, start/end dates, viable second-crop area per season, P20 area,
  viable-season count, and assumptions.
- Every displayed number is traceable to the result payload.

### AC-05 - Simple financial scenario

- The user declares soybean margin per hectare, corn margin per hectare, and optional
  operating cost assumptions.
- The engine calculates results deterministically for every historical season.
- The UI shows median, P20, worst observed result, and difference from baseline.
- Copy always says “using the assumptions provided”; it never promises profit.

### AC-06 - Replan

- Given a saved plan and a field event that blocks a field or changes available seed, the
  app produces a new plan and deterministic diff.
- Each diff item identifies changed constraint, before/after state, and reason.
- The original plan remains visible for comparison.

### AC-07 - Credential-free sharing

- The app generates a short operational message from `PlanResult` or `ReplanResult`.
- A real `wa.me` deep link opens WhatsApp with URL-encoded text.
- A real `t.me/share/url` link opens Telegram with URL-encoded text and result link.
- Web Share API is used when available, with copy-to-clipboard as fallback.
- The message includes sequence, critical change, source/result identifier, and prototype
  disclaimer without inventing numbers.
- No Business account, provider webhook, or paid messaging integration is required.

### AC-08 - Failure-safe demo

- The canonical path works from prepared climate and AI fixtures when network services
  are unavailable.
- Live and fallback states are visibly different; the team never hides fallback usage.
- OpenAI, geocoding, climate, and optional IBGE failures are isolated.
- There is a one-command check and one-command local start in the final README.

### AC-09 - Honest boundary

- The UI and README state that this is a prototype and not ZARC, agronomic, financial,
  insurance, or credit guidance.
- Regional climate resolution is not presented as field-level measurement.
- Real data, cached data, synthetic fixtures, user assumptions, third-party code, and
  team-built code are clearly separated.

### AC-10 - Progressive authentication and saved plans

- A producer can enter the operation, confirm it, calculate it, and view the full result
  without an account prompt.
- Only the voluntary action to save a completed plan requests identification. Cancelling,
  failing, or deferring this step keeps the current result visible and explicitly unsaved.
- The demo login accepts `{ username, password }`; the UI labels `username` as “E-mail”
  and does not alter the value. A signed HttpOnly cookie keeps the session for up to 8
  hours.
- The server stores the confirmed operation, dataset, deterministic result, provenance,
  hashes, timestamps, and replans in the local file `.data/analyses.json`.
- Replanning begins from a saved plan and appends its auditable result to that record; the
  original calculated plan remains available for comparison.
- This is a single-user demo account configured by `APP_LOGIN_USER` and
  `APP_LOGIN_PASSWORD`, not individual producer accounts or multi-tenant access. Anyone
  with the shared credentials sees the same demo history.
- Local-file persistence is for the running demo only. It must not be described as
  durable on Vercel or as a production retention solution; retention and migration remain
  pending.

## Ordered extensions after the core is verified

### X-01 - IBGE calibration and analogous yields

- Retrieve or load soybean municipal yield history with provenance.
- Remove the technological trend before correlating climate indicators.
- Show sample size, missing years, correlations, and “no detectable signal” when needed.
- Display the observed yield range and trend deviation of the closest historical seasons.
- Do not turn this into an unvalidated point forecast.

### X-02 - Telegram Bot outbound alert

- Send the already confirmed deterministic alert through Telegram Bot API.
- Require explicit recipient and send confirmation after the replanning result exists.
- Skip this extension if bot token/chat ID are not ready or the core has open findings.

### X-03 - Additional crop profile

- Add one reviewed crop/succession profile through configuration.
- Reuse the same planner with profile-specific tests.
- Never label an unreviewed configuration as agronomically validated.

## Non-goals

- Mandatory login before entering or calculating, external identity-provider integration,
  broad farm-account administration, individual producer accounts, multi-tenant isolation,
  durable Vercel storage, NASA POWER, maps/drawn fields, PDF for banks or insurers,
  sophisticated financial optimization, dashboard-as-product, or a scientifically
  validated agronomic model.
- Telephone/SIP calling, always-listening audio, voice biometrics, or storing raw audio.
- Exact yield prediction without a serious temporal backtest, baseline, error metric, and
  uncertainty interval.
- Provider-driven inbound messaging or paid/Business messaging integrations.

## Cut order

Cut in this order when a checkpoint slips:

1. Telegram Bot automatic sending;
2. additional crop profile;
3. live SIDRA for uncached municipalities;
4. IBGE calibration and analogous-yield panel;
5. generated explanation;
6. interactive historical hover;
7. arbitrary number of field blocks.

Never cut: voice, text/form entry, structured confirmation,
municipality/climate cache, deterministic plan,
replan diff, simple financial assumptions, WhatsApp output, or prepared offline path.

## Judge evidence map

| Criterion | Evidence |
|---|---|
| Functional version | Voice or text/form brief -> confirmed JSON -> plan -> spoken/visual result -> event -> replan -> WhatsApp |
| Engineering | Shared schemas, cached data, pure engine, tests, failure isolation, provenance |
| Technical ambition | 41-season simulation, configurable crop path, constraint-based replanning |
| Innovation/originality | Operational order and auditable replan, not a chatbot or dashboard |
| Utility/clarity | One producer decision, one executable sequence, visible before/after |
| Final reliability | Prepared municipalities, cached AI fallback, rehearsed three-minute path |
