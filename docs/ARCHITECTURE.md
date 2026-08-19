# Architecture and frozen contracts

## Shape

```text
browser
  -> text/form input ----------> editable OperationDraft -> shared confirmation guard
  -> /api/realtime-session ----> ephemeral secret -> OpenAI Realtime over WebRTC
  -> voice agent tool ---------> Zod-confirmed FarmOperationInput -> deterministic planner
  -> /api/locations ----------> geocoding -> Municipality
  -> /api/climate ------------> archive API -> normalize/cache -> HistoricalDataset[41]
  -> /api/parse-brief --------> OpenAI Responses -> Zod validation
  -> /api/plan ---------------> deterministic planner -> PlanResult
  -> voluntary save ----------> POST /api/auth/login { username, password }
                               -> signed HttpOnly cookie (8h, single demo user)
                               -> POST/GET /api/analyses -> .data/analyses.json
  -> /api/parse-event --------> OpenAI Responses -> Zod validation
  -> saved-plan replan -------> POST /api/analyses/:id/replan
                               -> authenticated demo session -> planner + appended diff
  -> WhatsApp deep link ------> encoded deterministic message

optional extension
  -> /api/ibge ---------------> SIDRA or prepared CSV -> calibration/analog evidence
```

The server owns secrets and external calls. The planner is a pure module with no network,
filesystem, clock, UI, or model dependency. The UI renders result payloads and does not
recalculate business numbers.

Voice, natural-language text, and the structured form are equal input transports into the
same editable draft and confirmation boundary. The entry screen lists every required
field before the producer chooses a mode. The browser connects to the
Realtime session with a short-lived client secret created by the server. The voice agent
may collect fields and call tools, but `confirm_operation_and_calculate` rejects calls
without explicit confirmation or valid `FarmOperationInput`. The tool invokes the same
planner used by the text form and returns `PlanResult`; the agent only verbalizes it.

## Suggested tree

```text
src/
  app/                  # page and route handlers
  components/           # location, brief, confirmation, plan, proof, replan, sharing
  domain/
    schemas.ts          # shared Zod contracts; frozen before parallel work
    crop-profiles.ts    # soybean and corn configuration
    planner.ts          # pure candidate evaluation
    simulator.ts        # one plan across 41 seasons
    finance.ts          # declared-assumption calculations
    diff.ts             # deterministic before/after comparison
    metrics.ts          # P20 and summaries
    analogs.ts          # optional IBGE/analog extension
  data/
    geocoding.ts
    climate.ts
    cache.ts
    normalize.ts
    ibge.ts             # optional extension
  lib/
    openai.ts           # server-only client
    realtime.ts         # ephemeral session creation and voice-agent configuration
    whatsapp.ts         # deterministic message and wa.me URL
  prompts/
data/
  fixtures/             # prepared municipalities, AI fallbacks, provenance
  crops/                # reviewed crop profiles
tests/
```

## Contract sketches

These are semantic contracts. The spec agent may refine names once during kickoff, then
`schemas.ts` becomes executable authority.

```ts
type Municipality = {
  name: string;
  state: string;
  countryCode: "BR";
  latitude: number;
  longitude: number;
  elevationM?: number;
  timezone: string;
  ibgeCode?: string;
};

type FarmOperationInput = {
  municipality: Municipality;
  totalAreaHa: number;
  planterCapacityHaPerDay: number;
  startDate: string;
  firstCrop: "soybean";
  secondCrop: "corn";
  fields: Array<{ id: string; areaHa: number; priority: "second_crop" | "soy_only" }>;
  seedLots: Array<{ crop: "soybean"; cycleDays: number; availableAreaHa: number }>;
  secondCropTargetAreaHa: number;
  finance: {
    soybeanMarginPerHa: number;
    cornMarginPerHa: number;
    operatingCostPerDay?: number;
  };
};

type HistoricalDataset = {
  location: Municipality;
  source: string;
  seasons: 41;
  cached: boolean;
  real: boolean;
  retrievedAt: string;
  variables: string[];
  records: HistoricalSeason[];
};

type FieldEvent = {
  effectiveDate: string;
  blockedFieldIds: string[];
  blockedUntil?: string;
  seedDeltaAreaHaByCycle: Record<string, number>;
  notes: string[];
};

type PlanResult = {
  inputHash: string;
  datasetHash: string;
  dataset: { source: string; seasons: 41; cached: boolean; real: boolean };
  assumptions: string[];
  sequence: Array<{
    fieldId: string;
    cycleDays: number;
    startDate: string;
    endDate: string;
    secondCropCandidate: boolean;
  }>;
  historicalOutcomes: Array<{
    season: string;
    secondCropViableAreaHa: number;
    financialResult: number;
  }>;
  metrics: {
    viableSeasons: number;
    secondCropAreaP20Ha: number;
    financialMedian: number;
    financialP20: number;
    financialWorstObserved: number;
    differenceFromBaselineP20: number;
  };
};

type ReplanResult = {
  before: PlanResult;
  after: PlanResult;
  event: FieldEvent;
  changes: Array<{
    entity: string;
    before: string | number | null;
    after: string | number | null;
    reason: string;
  }>;
};
```

## External-data strategy

### Geocoding and climate

- Live request enables any Brazilian municipality.
- Normalize municipality and climate responses before domain use.
- Cache by normalized coordinates/grid, period, and variables.
- Prepared municipalities include data and provenance and are bundled for offline demo.
- A live failure returns a recoverable state, never partial data to the planner.

### IBGE extension

- Resolve or store the IBGE municipality code.
- Prefer prepared CSV for demo municipalities; live SIDRA is opportunistic.
- Detrend yield before correlation and show sample size/missingness.
- Analogous-yield range is historical evidence, not a point prediction.

## Determinism rules

- Dates use ISO-8601 and one explicit timezone.
- Sort ties by documented stable keys.
- Quantiles use one named method and edge-case tests.
- Currency uses integer cents internally.
- Dataset and input hashes appear in provenance/debug output.
- Randomness is forbidden in the planner. Synthetic tests use a fixed seed.
- Financial copy always names user-provided assumptions.

## OpenAI boundary

- Responses input includes only compact instructions, frozen schema, and current text.
- Use Structured Outputs and validate locally with Zod.
- Retry malformed output once, then return an editable recovery form or labeled fixture.
- No model-created dates, scores, feasibility decisions, or financial calculations.
- Explanation receives `PlanResult`; a verifier rejects numeric tokens absent from it.

## Voice boundary

- Browser audio uses WebRTC through `RealtimeSession`; the long-lived OpenAI key never
  reaches the browser.
- The server issues only short-lived client secrets for a narrowly configured session.
- The agent uses push-to-talk by default, asks for missing fields, summarizes the draft,
  and requires a clear confirmation before tool execution.
- Realtime tool calling is not treated as Structured Outputs. Tool arguments are untrusted
  input and must pass the same Zod schema and confirmation guard as text input.
- The transcript and editable draft remain visible. The user can stop audio and finish by
  typing at any time.
- Raw audio is not persisted. Logs contain event types, latency, tool name, validation
  result, and plan identifiers, not audio bytes or secrets.

## Input-mode boundary

- The first screen lists municipality/UF, total area, fields, seed lots and cycles,
  planter capacity, second-crop target, start date, and declared financial assumptions.
- Voice, natural-language text, and the field-by-field form write the same
  `OperationDraft`; switching modes preserves everything already entered.
- Text/form use does not depend on microphone denial or Realtime failure.
- Every mode resolves the municipality, exposes missing/ambiguous fields, and crosses the
  same versioned confirmation guard before `/api/plan`.

## Sharing boundary

- Core sharing creates a deterministic message and `wa.me` URL; it needs no credential.
- The same deterministic message creates a Telegram share URL and Web Share payload.
- Message numbers come only from plan/replan payloads.
- Optional Telegram Bot sending remains behind an adapter and never blocks sharing.

## Progressive-authentication and persistence boundary

Authentication is not a precondition for `OperationDraft`, confirmation, climate loading,
planning, or viewing the resulting `PlanResult`. The browser asks for identification only
after the producer voluntarily chooses to save a completed result. Until then, any draft
or result retained by the browser is a session-local convenience, not a persisted plan.

The integration must reuse the contracts already implemented on `origin/Eduarco`, rather
than introduce parallel frontend contracts:

- `POST /api/auth/login` receives `{ username, password }`; the UI labels `username` as
  “E-mail” but sends its unchanged value in the `username` property.
- Successful login sets the signed `quarenta_safras_session` cookie with `HttpOnly`,
  `SameSite=Lax`, path `/`, production `Secure`, and an eight-hour lifetime.
- `GET /api/auth/session` returns the current demo login state; `POST /api/auth/logout`
  clears that cookie.
- Authenticated `POST` and `GET /api/analyses`, `GET /api/analyses/:id`, and
  `POST /api/analyses/:id/replan` save, list, load, and replan the existing analysis
  records. The UI reuses these endpoints after backend integration.

The backend validates the signed cookie and the request schemas. Credentials come only
from server environment variables `APP_LOGIN_USER` and `APP_LOGIN_PASSWORD`; the signing
key is `SESSION_SECRET`. The browser never receives these values or creates its own
session token. Raw audio and permanent credentials are never written to the analysis
record or client logs.

`FileAnalysisStore` persists the record in `.data/analyses.json` (or
`ANALYSIS_STORE_PATH`). Each record contains an internal ID, title, timestamps, confirmed
operation, dataset, deterministic plan, and an appended list of deterministic replan
results. The saved plan remains the reference result and replan entries are appended to
the record.

This is deliberately a single-user demo boundary, not ownership or multi-tenant access:
there is one configured login and no producer ID on an analysis record. Any user with the
shared credentials can list and load the same analyses. The local file is not durable on
serverless/ephemeral Vercel filesystems. Production retention, deletion/export,
individual-account authorization, persistent database choice, and migration strategy are
still pending; no production durability or producer isolation may be claimed.
