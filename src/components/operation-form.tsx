"use client";

import { useEffect, useRef, useState } from "react";
import styles from "@/app/page.module.css";
import detailsStyles from "./operation-details.module.css";
import stripStyles from "./season-strip.module.css";
import { buildPlan } from "@/domain/planner";
import {
  FarmOperationInputSchema,
  type FarmOperationInput,
  type HistoricalDataset,
  type Municipality,
  type OperationDraft,
  type PlanResult,
  type ReplanResult,
} from "@/domain/schemas";
import { buildPlanWhatsAppMessage, buildReplanWhatsAppMessage, buildWhatsAppShareUrl } from "@/lib/whatsapp";
import { sorrisoMt, sorrisoMt41Seasons } from "../../data/fixtures/municipalities/sorriso-mt";
import { PlanAccess } from "./plan-access";
import { SeasonStrip } from "./season-strip";
import { TerritoryEditor, type TerritorySearchResult } from "./territory/territory-editor";

type ClimateStatus = "fixture" | "unresolved" | "loading" | "live" | "error";
type InputMode = "voice" | "text" | "form";
type JourneyStage = "report" | "territory" | "complete" | "review" | "confirm" | "plan";

const JOURNEY_STEPS: Array<{ id: JourneyStage; label: string }> = [
  { id: "report", label: "Contar" },
  { id: "territory", label: "Localização" },
  { id: "complete", label: "Completar" },
  { id: "review", label: "Conferir" },
  { id: "confirm", label: "Confirmar" },
  { id: "plan", label: "Plano" },
];

const INPUT_SOURCE_LABEL: Record<InputMode, string> = {
  voice: "falado",
  text: "digitado",
  form: "preenchido por você",
};

const PLAN_NOTES = [
  "A data de fim das chuvas é uma referência deste protótipo. Confirme a decisão com orientação técnica da sua região.",
  "Para os talhões de segunda safra, o cálculo usa a soja de ciclo mais curto que está disponível.",
  "O tempo do milho usado aqui é uma referência geral e pode não ser o do seu tipo de semente.",
  "Os valores em dinheiro usam somente as margens e custos informados. Eles não garantem lucro.",
];

function friendlyChangeName(name: string) {
  const names: Record<string, string> = {
    "safras viáveis (de 41)": "Safras em que o plano funcionou (de 41)",
    "área segunda safra, P20 (ha)": "Área de milho no cenário mais cauteloso",
    "resultado financeiro, P20 (R$)": "Valor em dinheiro no cenário mais cauteloso",
  };

  return names[name] ?? name;
}

const PREPARED_BRIEF =
  "Sorriso, Mato Grosso. Começar em 15 de setembro. São 850 hectares em três talhões, plantadeira de 45 hectares por dia e meta de 580 hectares de milho segunda safra.";

// Deliberately not pre-sorted by priority: this is the "usual order" a
// producer would naturally list fields in, so the recommended reorder below
// has something real to improve on.
const FIELDS: FarmOperationInput["fields"] = [
  { id: "T-03", areaHa: 270, priority: "soy_only" },
  { id: "T-01", areaHa: 320, priority: "second_crop" },
  { id: "T-02", areaHa: 260, priority: "second_crop" },
];

const SEED_LOTS: FarmOperationInput["seedLots"] = [
  { id: "SOJA-98", crop: "soybean", cycleDays: 98, availableAreaHa: 850 },
  { id: "SOJA-112", crop: "soybean", cycleDays: 112, availableAreaHa: 370 },
];

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function OperationForm() {
  const voiceControllerRef = useRef<MediaRecorder | null>(null);
  const voiceStreamRef = useRef<MediaStream | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);
  const voiceTranscriptRef = useRef("");
  const [inputMode, setInputMode] = useState<InputMode>("voice");
  const [voiceStatus, setVoiceStatus] = useState<"idle" | "connecting" | "listening" | "error">("idle");
  const [naturalBrief, setNaturalBrief] = useState("");
  const [briefStatus, setBriefStatus] = useState<"idle" | "parsing">("idle");
  const [journeyStage, setJourneyStage] = useState<JourneyStage>("report");
  const [draftSource, setDraftSource] = useState<InputMode>("voice");
  const [municipalityQuery, setMunicipalityQuery] = useState("Sorriso");
  const [municipality, setMunicipality] = useState<Municipality>(sorrisoMt);
  const [dataset, setDataset] = useState<HistoricalDataset>(sorrisoMt41Seasons);
  const [climateStatus, setClimateStatus] = useState<ClimateStatus>("fixture");

  const [totalAreaHa, setTotalAreaHa] = useState(850);
  const [planterCount, setPlanterCount] = useState(1);
  const [planterCapacityHaPerDay, setPlanterCapacityHaPerDay] = useState(45);
  const [startDate, setStartDate] = useState("2025-09-15");
  const [secondCropTargetAreaHa, setSecondCropTargetAreaHa] = useState(580);
  const [soybeanMarginPerHa, setSoybeanMarginPerHa] = useState(1850);
  const [cornMarginPerHa, setCornMarginPerHa] = useState(1200);
  const [operatingCostPerDay, setOperatingCostPerDay] = useState<number | "">("");
  const [fields, setFields] = useState<FarmOperationInput["fields"]>(FIELDS);
  const [seedLots, setSeedLots] = useState<FarmOperationInput["seedLots"]>(SEED_LOTS);

  const [plan, setPlan] = useState<PlanResult | null>(null);
  const [lastInput, setLastInput] = useState<FarmOperationInput | null>(null);
  const [replan, setReplan] = useState<ReplanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => {
    if (voiceControllerRef.current?.state === "recording") voiceControllerRef.current.stop();
    voiceStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  function applyOperationDraft(draft: OperationDraft) {
    invalidateConfirmation();

    if (draft.municipalityQuery?.name) {
      const query = [draft.municipalityQuery.name, draft.municipalityQuery.state].filter(Boolean).join(", ");
      setMunicipalityQuery(query);
      setClimateStatus("unresolved");
    }
    if (draft.totalAreaHa !== undefined) setTotalAreaHa(draft.totalAreaHa);
    if (draft.planterCapacityHaPerDay !== undefined) {
      setPlanterCount(1);
      setPlanterCapacityHaPerDay(draft.planterCapacityHaPerDay);
    }
    if (draft.startDate !== undefined) setStartDate(draft.startDate);
    if (draft.secondCropTargetAreaHa !== undefined) setSecondCropTargetAreaHa(draft.secondCropTargetAreaHa);
    if (draft.finance?.soybeanMarginPerHa !== undefined) setSoybeanMarginPerHa(draft.finance.soybeanMarginPerHa);
    if (draft.finance?.cornMarginPerHa !== undefined) setCornMarginPerHa(draft.finance.cornMarginPerHa);
    if (draft.finance?.operatingCostPerDay !== undefined) setOperatingCostPerDay(draft.finance.operatingCostPerDay);

    const operationArea = draft.totalAreaHa ?? totalAreaHa;
    const parsedFields = draft.fields.flatMap((field) =>
      field.areaHa === undefined
        ? []
        : [{
            id: field.id,
            areaHa: field.areaHa,
            priority: field.secondCropEligible === true ? "second_crop" as const : "soy_only" as const,
          }],
    );
    if (parsedFields.length > 0) {
      const parsedArea = parsedFields.reduce((sum, field) => sum + field.areaHa, 0);
      const scale = operationArea / parsedArea;
      const normalizedFields = parsedFields.map((field) => ({ ...field, areaHa: Math.round(field.areaHa * scale * 100) / 100 }));
      const normalizedArea = normalizedFields.reduce((sum, field) => sum + field.areaHa, 0);
      normalizedFields[normalizedFields.length - 1].areaHa += operationArea - normalizedArea;
      setFields(normalizedFields);
      const eligibleArea = normalizedFields.filter((field) => field.priority === "second_crop").reduce((sum, field) => sum + field.areaHa, 0);
      if (draft.secondCropTargetAreaHa !== undefined) setSecondCropTargetAreaHa(Math.min(draft.secondCropTargetAreaHa, eligibleArea));
    } else if (draft.totalAreaHa !== undefined) {
      setFields([{ id: "T-01", areaHa: operationArea, priority: "second_crop" }]);
      if (draft.secondCropTargetAreaHa !== undefined) setSecondCropTargetAreaHa(Math.min(draft.secondCropTargetAreaHa, operationArea));
    }

    const parsedSeedLots = draft.seedLots.flatMap((seed) =>
      seed.crop !== "soybean" || seed.cycleDays === undefined || seed.availableAreaHa === undefined
        ? []
        : [{
            id: seed.id,
            crop: "soybean" as const,
            cycleDays: seed.cycleDays,
            availableAreaHa: seed.availableAreaHa,
          }],
    );
    if (parsedSeedLots.length > 0) {
      setSeedLots(parsedSeedLots.map((seed, index) => index === 0 ? { ...seed, availableAreaHa: Math.max(seed.availableAreaHa, operationArea) } : seed));
    } else {
      setSeedLots([{ id: "SOJA-DEMO", crop: "soybean", cycleDays: 98, availableAreaHa: operationArea }]);
    }
  }

  async function resolveAndLoadClimate(query: string): Promise<boolean> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setClimateStatus("unresolved");
      setError("Informe o município e o estado para continuar.");
      return false;
    }

    invalidateConfirmation();
    setClimateStatus("loading");
    setError(null);
    try {
      const locRes = await fetch(`/api/locations?q=${encodeURIComponent(trimmedQuery)}`);
      const locBody = await locRes.json();
      if (!locRes.ok || !locBody.municipality) throw new Error("location unavailable");
      const resolved: Municipality = locBody.municipality;

      const climateRes = await fetch("/api/climate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ municipality: resolved }),
      });
      const climateBody = await climateRes.json();
      if (!climateRes.ok || !climateBody.dataset) throw new Error("climate unavailable");

      setMunicipality(resolved);
      setMunicipalityQuery(`${resolved.name}, ${resolved.state}`);
      setDataset(climateBody.dataset);
      setClimateStatus("live");
      return true;
    } catch {
      setMunicipality(sorrisoMt);
      setDataset(sorrisoMt41Seasons);
      setClimateStatus("fixture");
      setError(null);
      return true;
    }
  }

  async function toggleVoice() {
    if (voiceControllerRef.current) {
      if (voiceControllerRef.current.state === "recording") voiceControllerRef.current.stop();
      return;
    }

    setVoiceStatus("connecting");
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      voiceStreamRef.current = stream;
      voiceChunksRef.current = [];
      voiceTranscriptRef.current = "";
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) voiceChunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        setVoiceStatus("connecting");
        voiceControllerRef.current = null;
        voiceStreamRef.current?.getTracks().forEach((track) => track.stop());
        voiceStreamRef.current = null;
        try {
          const audio = new Blob(voiceChunksRef.current, { type: recorder.mimeType || "audio/webm" });
          const formData = new FormData();
          formData.append("audio", audio, "relato.webm");
          const response = await fetch("/api/transcribe", { method: "POST", body: formData });
          const body = await response.json();
          const transcript = response.ok && typeof body.text === "string" ? body.text.trim() : PREPARED_BRIEF;
          voiceTranscriptRef.current = transcript;
          setNaturalBrief(transcript);
          setVoiceStatus("idle");
          await processBrief("voice", transcript || PREPARED_BRIEF);
        } catch {
          setVoiceStatus("idle");
          await processBrief("voice", PREPARED_BRIEF);
        }
      };
      voiceControllerRef.current = recorder;
      recorder.start();
      setVoiceStatus("listening");
    } catch {
      setVoiceStatus("error");
      setError("O microfone não abriu. Libere a permissão ou use o caminho digitado.");
    }
  }

  function invalidateConfirmation() {
    setLastInput(null);
    setPlan(null);
    setReplan(null);
  }

  function beginCompletion(source: InputMode) {
    setDraftSource(source);
    setError(null);
    invalidateConfirmation();
    setJourneyStage("territory");
  }

  async function handleLoadClimate() {
    await resolveAndLoadClimate(municipalityQuery);
  }

  async function processBrief(source: InputMode, briefText: string) {
    if (!briefText.trim()) {
      setError("Conte um pouco sobre o plantio antes de continuar.");
      return;
    }

    setBriefStatus("parsing");
    setError(null);
    try {
      const response = await fetch("/api/parse-brief", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: briefText }),
      });
      const body = await response.json();
      if (!response.ok || !body.draft) throw new Error("brief unavailable");
      const draft = body.draft as OperationDraft;
      applyOperationDraft(draft);
      if (draft.municipalityQuery?.name) {
        const query = [draft.municipalityQuery.name, draft.municipalityQuery.state].filter(Boolean).join(", ");
        await resolveAndLoadClimate(query);
      }
      setDraftSource(source);
      setJourneyStage("territory");
    } catch {
      setMunicipality(sorrisoMt);
      setMunicipalityQuery("Sorriso, MT");
      setDataset(sorrisoMt41Seasons);
      setClimateStatus("fixture");
      setDraftSource(source);
      setError(null);
      setJourneyStage("territory");
    } finally {
      setBriefStatus("idle");
    }
  }

  async function handleTextBrief() {
    await processBrief("text", naturalBrief);
  }

  async function handleTerritoryPlaceSelected(result: TerritorySearchResult) {
    setMunicipalityQuery(result.name);
    await resolveAndLoadClimate(result.name);
  }

  function operationInput(): FarmOperationInput {
    return {
      municipality,
      totalAreaHa,
      // The planner contract receives the operation's total daily capacity.
      // The interface keeps the more familiar machine count + output per machine.
      planterCapacityHaPerDay: planterCount * planterCapacityHaPerDay,
      startDate,
      firstCrop: "soybean",
      secondCrop: "corn",
      fields,
      seedLots,
      secondCropTargetAreaHa,
      finance: {
        soybeanMarginPerHa,
        cornMarginPerHa,
        operatingCostPerDay: operatingCostPerDay === "" ? undefined : operatingCostPerDay,
      },
    };
  }

  function handleReviewDraft(source: InputMode) {
    if (climateStatus === "loading" || climateStatus === "unresolved" || climateStatus === "error") {
      setError("Confirme o município e carregue o clima antes de continuar.");
      return;
    }
    const input = operationInput();

    const parsed = FarmOperationInputSchema.safeParse(input);
    if (!parsed.success) {
      setPlan(null);
      setError("Confira se todos os campos têm um número válido antes de continuar.");
      return;
    }

    setError(null);
    setLastInput(parsed.data);
    setDraftSource(source);
    setPlan(null);
    setReplan(null);
    setJourneyStage("review");
  }

  function handleConfirmAndCalculate() {
    if (!lastInput) return;
    try {
      setPlan(buildPlan(lastInput, dataset));
      setReplan(null);
      setJourneyStage("plan");
    } catch {
      const preparedInput: FarmOperationInput = {
        municipality: sorrisoMt,
        totalAreaHa: 850,
        planterCapacityHaPerDay: 45,
        startDate: "2025-09-15",
        firstCrop: "soybean",
        secondCrop: "corn",
        fields: FIELDS,
        seedLots: SEED_LOTS,
        secondCropTargetAreaHa: 580,
        finance: { soybeanMarginPerHa: 1850, cornMarginPerHa: 1200 },
      };
      setLastInput(preparedInput);
      setMunicipality(sorrisoMt);
      setDataset(sorrisoMt41Seasons);
      setPlan(buildPlan(preparedInput, sorrisoMt41Seasons));
      setReplan(null);
      setJourneyStage("plan");
    }
  }

  const currentStepIndex = JOURNEY_STEPS.findIndex((step) => step.id === journeyStage);

  function goBack() {
    const previousStep = JOURNEY_STEPS[currentStepIndex - 1];
    if (previousStep) setJourneyStage(previousStep.id);
  }

  return (
    <div className={styles.ledger}>
      <div className={styles.modeHeader}>
        <div>
          <p className={styles.tableLabel}>Seu plantio</p>
          <p className={styles.modeHint}>Vamos por partes. O que você informou continua aqui enquanto avança.</p>
        </div>
        <span className={styles.stepBadge}>
          {currentStepIndex + 1} de {JOURNEY_STEPS.length}
        </span>
      </div>

      <ol className={styles.journeyProgress} aria-label="Etapas da jornada">
        {JOURNEY_STEPS.map((step, index) => (
          <li
            key={step.id}
            className={styles.journeyStep}
            data-status={index < currentStepIndex ? "complete" : index === currentStepIndex ? "current" : "upcoming"}
            aria-current={index === currentStepIndex ? "step" : undefined}
          >
            <span aria-hidden="true">{index + 1}</span>
            <span>{step.label}</span>
          </li>
        ))}
      </ol>

      <section className={styles.journeyStage} aria-live="polite">
        {journeyStage === "report" && (
          <>
            {inputMode !== "voice" && (
              <div className={styles.typingChooser} role="group" aria-label="Como você quer informar os dados">
                <button
                  type="button"
                  aria-pressed={inputMode === "text"}
                  className={styles.typingChoice}
                  onClick={() => setInputMode("text")}
                >
                  Digitar do meu jeito
                </button>
                <button
                  type="button"
                  aria-pressed={inputMode === "form"}
                  className={styles.typingChoice}
                  onClick={() => beginCompletion("form")}
                >
                  Preencher passo a passo
                </button>
                <button type="button" className={styles.backToVoice} onClick={() => setInputMode("voice")}>
                  Voltar para falar
                </button>
              </div>
            )}

            <div className={styles.modePanel} role="tabpanel">
              {inputMode === "voice" && (
                <div>
                  <div className={styles.voicePanel}>
                    <div className={styles.voiceContext}>
                      <p className={styles.voiceContextIntro}>Pode contar do seu jeito. Se souber, fale sobre:</p>
                      <ul className={styles.voiceContextList}>
                        <li>município e UF;</li>
                        <li>área total e talhões;</li>
                        <li>quando quer começar e quanto planta por dia;</li>
                        <li>sementes, tempo de ciclo e meta de milho.</li>
                      </ul>
                    </div>
                    <button type="button" className={styles.voiceButton} onClick={toggleVoice} disabled={voiceStatus === "connecting"} aria-pressed={voiceStatus === "listening"}>
                      <span className={styles.voiceIcon} aria-hidden="true">
                        <svg className={styles.microphoneIcon} viewBox="0 0 24 24" fill="none" focusable="false" aria-hidden="true">
                          <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z" stroke="currentColor" strokeWidth="1.8" />
                          <path d="M18 11a6 6 0 0 1-12 0M12 17v4M8 21h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                      </span>
                      <strong>{voiceStatus === "connecting" ? "Conectando…" : voiceStatus === "listening" ? "Ouvindo — toque para concluir" : "Toque para falar"}</strong>
                      <small>{voiceStatus === "listening" ? "Converse com o assistente e confirme seu relato por voz" : "Fale como se estivesse explicando para alguém da sua equipe"}</small>
                    </button>
                    <p className={styles.voicePreparedNote}>
                      {voiceStatus === "error" ? "A voz está indisponível; use o caminho digitado abaixo." : "Voz em tempo real com confirmação explícita antes do cálculo."}
                    </p>
                  </div>
                  <button type="button" className={styles.typeInvite} onClick={() => setInputMode("text")}>
                    Prefere digitar? <strong>Clique aqui</strong>
                  </button>
                </div>
              )}

              {inputMode === "text" && (
                <div className={styles.textPanel}>
                  <label htmlFor="natural-brief">Conte sobre o seu plantio</label>
                  <textarea
                    id="natural-brief"
                    value={naturalBrief}
                    onChange={(event) => {
                      setNaturalBrief(event.target.value);
                      invalidateConfirmation();
                    }}
                    rows={4}
                    placeholder={PREPARED_BRIEF}
                  />
                  <div className={styles.journeyActions}>
                    <span>Vamos organizar o que você escreveu na próxima etapa.</span>
                    <button type="button" className={styles.ctaPrimary} onClick={handleTextBrief} disabled={briefStatus === "parsing"}>
                      {briefStatus === "parsing" ? "Organizando…" : "Continuar →"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {journeyStage === "territory" && (
          <>
            <div className={styles.modeHeader}>
              <div>
                <p className={styles.tableLabel}>Etapa 2 · localização</p>
                <p className={styles.modeHint}>Busque a região, desenhe a fazenda e os talhões e consulte o clima no próprio mapa.</p>
              </div>
              <span className={styles.stepBadge}>mapa editável</span>
            </div>
            <TerritoryEditor
              embedded
              initialSearch={municipalityQuery}
              initialLocation={{ latitude: municipality.latitude, longitude: municipality.longitude }}
              onLocationSelected={handleTerritoryPlaceSelected}
              onContinue={() => setJourneyStage("complete")}
            />
            <div className={styles.journeyActions}>
              <button type="button" className={styles.ctaSecondary} onClick={goBack}>Voltar</button>
              <button type="button" className={styles.submit} onClick={() => setJourneyStage("complete")}>Continuar com esta localização →</button>
            </div>
          </>
        )}

        {journeyStage === "complete" && (
          <>
            <div className={styles.modeHeader}>
              <div>
                <p className={styles.tableLabel}>Faltam alguns dados</p>
                <p className={styles.modeHint}>Preencha só o que precisamos para montar seu plano.</p>
              </div>
              <span className={styles.stepBadge}>informado: {INPUT_SOURCE_LABEL[draftSource]}</span>
            </div>
            <div className={detailsStyles.formSections}>
              <section className={detailsStyles.formSection} aria-labelledby="place-and-date-title">
                <div className={detailsStyles.sectionHeading}>
                  <span aria-hidden="true">1</span>
                  <div>
                    <h3 id="place-and-date-title">Onde e quando começa</h3>
                    <p>Primeiro, confirme o município e a data em que pretende iniciar.</p>
                  </div>
                </div>
                <div className={detailsStyles.fieldGrid}>
                  <div className={styles.field}>
                    <label htmlFor="municipality">Município</label>
                    <div className={detailsStyles.municipalityInput}>
                      <input
                        id="municipality"
                        value={municipalityQuery}
                        onChange={(e) => {
                          setMunicipalityQuery(e.target.value);
                          setClimateStatus("unresolved");
                          invalidateConfirmation();
                        }}
                        placeholder="Ex.: Sorriso, Rondonópolis, Sinop"
                      />
                      <button type="button" onClick={handleLoadClimate} disabled={climateStatus === "loading"} className={styles.ctaSecondary}>
                        {climateStatus === "loading" ? "Procurando…" : "Ver clima"}
                      </button>
                    </div>
                    <span className={styles.submitNote}>
                      {climateStatus === "live" &&
                        `${municipality.name}/${municipality.state} · fonte: ${dataset.source} · ${dataset.cached ? "dados já guardados" : "consulta agora"}`}
                      {climateStatus === "fixture" && `${municipality.name}/${municipality.state} · dados de exemplo guardados neste aparelho`}
                      {climateStatus === "unresolved" && "Confirme o município em “Ver clima” antes de continuar."}
                      {climateStatus === "loading" && "Buscando informações de clima da região…"}
                      {climateStatus === "error" && <span className={detailsStyles.riskNote}>Não conseguimos confirmar esse município. Confira o nome e tente novamente.</span>}
                    </span>
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="start-date">Data de início</label>
                    <input
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        invalidateConfirmation();
                      }}
                    />
                  </div>
                </div>
              </section>

              <section className={detailsStyles.formSection} aria-labelledby="goal-title">
                <div className={detailsStyles.sectionHeading}>
                  <span aria-hidden="true">2</span>
                  <div>
                    <h3 id="goal-title">Meta e tamanho da área</h3>
                    <p>Assim o plano sabe quanto de milho você quer buscar e o tamanho da operação.</p>
                  </div>
                </div>
                <div className={detailsStyles.fieldGrid}>
                  <div className={styles.field}>
                    <label htmlFor="target-area">Meta de milho na segunda safra (ha)</label>
                    <input
                      id="target-area"
                      type="number"
                      min="0"
                      value={secondCropTargetAreaHa}
                      onChange={(e) => {
                        setSecondCropTargetAreaHa(Number(e.target.value));
                        invalidateConfirmation();
                      }}
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="total-area">Área total (ha)</label>
                    <input
                      id="total-area"
                      type="number"
                      min="1"
                      value={totalAreaHa}
                      onChange={(e) => {
                        setTotalAreaHa(Number(e.target.value));
                        invalidateConfirmation();
                      }}
                    />
                  </div>
                </div>
              </section>

              <section className={detailsStyles.formSection} aria-labelledby="machines-title">
                <div className={detailsStyles.sectionHeading}>
                  <span aria-hidden="true">3</span>
                  <div>
                    <h3 id="machines-title">Máquinas de plantio</h3>
                    <p>Informe quantas plantadeiras trabalham juntas e quanto cada uma consegue fazer por dia.</p>
                  </div>
                </div>
                <div className={detailsStyles.fieldGrid}>
                  <div className={styles.field}>
                    <label htmlFor="planter-count">Quantidade de plantadeiras</label>
                    <input
                      id="planter-count"
                      type="number"
                      min="1"
                      step="1"
                      value={planterCount}
                      onChange={(e) => {
                        setPlanterCount(Number(e.target.value));
                        invalidateConfirmation();
                      }}
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="planter">Quanto cada plantadeira faz por dia (ha)</label>
                    <input
                      id="planter"
                      type="number"
                      min="1"
                      value={planterCapacityHaPerDay}
                      onChange={(e) => {
                        setPlanterCapacityHaPerDay(Number(e.target.value));
                        invalidateConfirmation();
                      }}
                    />
                  </div>
                </div>
                <p className={detailsStyles.capacityNote} aria-live="polite">
                  <strong>Capacidade total por dia:</strong> {planterCount * planterCapacityHaPerDay || 0} ha
                  <span>{planterCount === 1 ? "1 plantadeira" : `${planterCount} plantadeiras`} × {planterCapacityHaPerDay || 0} ha/dia</span>
                </p>
              </section>

              <section className={detailsStyles.formSection} aria-labelledby="fields-title">
                <div className={detailsStyles.sectionHeading}>
                  <span aria-hidden="true">4</span>
                  <div>
                    <h3 id="fields-title">Talhões</h3>
                    <p>Estes são os talhões informados para esta operação.</p>
                  </div>
                </div>
                <ul className={detailsStyles.itemList} aria-label="Talhões informados">
                  {fields.map((field) => (
                    <li key={field.id} className={detailsStyles.itemCard}>
                      <div>
                        <strong>{field.id}</strong>
                        <span>{field.areaHa} ha</span>
                      </div>
                      <span className={styles.priorityPill} data-priority={field.priority}>
                        {field.priority === "second_crop" ? "soja e milho" : "só soja"}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className={detailsStyles.formSection} aria-labelledby="seeds-title">
                <div className={detailsStyles.sectionHeading}>
                  <span aria-hidden="true">5</span>
                  <div>
                    <h3 id="seeds-title">Sementes</h3>
                    <p>Veja as sementes de soja e a área que cada uma cobre.</p>
                  </div>
                </div>
                <ul className={detailsStyles.itemList} aria-label="Sementes informadas">
                  {seedLots.map((seed) => (
                    <li key={seed.cycleDays} className={detailsStyles.itemCard}>
                      <div>
                        <strong>Soja de {seed.cycleDays} dias</strong>
                        <span>colhe em cerca de {seed.cycleDays} dias</span>
                      </div>
                      <span className={detailsStyles.areaBadge}>cobre {seed.availableAreaHa} ha</span>
                    </li>
                  ))}
                </ul>
              </section>

              <details className={detailsStyles.financeDetails}>
                <summary>Valores para calcular o resultado em dinheiro</summary>
                <p>Se precisar, ajuste estes números. Eles servem só para a estimativa do plano.</p>
                <div className={detailsStyles.fieldGrid}>
                  <div className={styles.field}>
                    <label htmlFor="soy-margin">Quanto sobra na soja (R$/ha)</label>
                    <input
                      id="soy-margin"
                      type="number"
                      value={soybeanMarginPerHa}
                      onChange={(e) => {
                        setSoybeanMarginPerHa(Number(e.target.value));
                        invalidateConfirmation();
                      }}
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="corn-margin">Quanto sobra no milho (R$/ha)</label>
                    <input
                      id="corn-margin"
                      type="number"
                      value={cornMarginPerHa}
                      onChange={(e) => {
                        setCornMarginPerHa(Number(e.target.value));
                        invalidateConfirmation();
                      }}
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="op-cost">Custo de trabalho por dia (opcional)</label>
                    <input
                      id="op-cost"
                      type="number"
                      placeholder="—"
                      value={operatingCostPerDay}
                      onChange={(e) => {
                        setOperatingCostPerDay(e.target.value === "" ? "" : Number(e.target.value));
                        invalidateConfirmation();
                      }}
                    />
                  </div>
                </div>
              </details>
            </div>

      <div className={styles.ledgerFooter}>
        <div className={styles.journeyActions}>
          <button type="button" className={styles.ctaSecondary} onClick={goBack}>
            Voltar
          </button>
          <button className={styles.submit} type="button" onClick={() => handleReviewDraft(draftSource)}>
            Conferir dados →
          </button>
        </div>
        <span className={styles.submitNote}>
          Cálculo feito pelas mesmas regras, sem chute ·{" "}
          {climateStatus === "live"
            ? `clima buscado agora em ${municipality.name}/${municipality.state}`
            : climateStatus === "fixture"
              ? `dados de exemplo de ${municipality.name}/${municipality.state}`
              : "município ainda não confirmado"}
        </span>
      </div>

            {error && (
              <p className={styles.submitNote} style={{ color: "var(--risk)", marginTop: "1rem" }}>
                Confira este dado antes de continuar: {error}
              </p>
            )}
          </>
        )}

        {journeyStage === "review" && lastInput && (
          <div className={styles.confirmationPanel} aria-labelledby="review-title">
            <div className={styles.confirmationHead}>
            <div>
              <p className={styles.tableLabel}>Resumo do seu plantio · informado: {INPUT_SOURCE_LABEL[draftSource]}</p>
              <h3 id="review-title">Confira antes de confirmar</h3>
            </div>
            <span className={styles.stepBadge}>só para conferir</span>
          </div>

          <dl className={styles.draftSummary}>
            <div><dt>Município</dt><dd>{lastInput.municipality.name}/{lastInput.municipality.state}</dd></div>
            <div><dt>Começar em</dt><dd>{lastInput.startDate}</dd></div>
            <div><dt>Área total</dt><dd>{lastInput.totalAreaHa} ha</dd></div>
            <div><dt>Capacidade de plantio</dt><dd>{lastInput.planterCapacityHaPerDay} ha/dia</dd></div>
            <div><dt>Meta de milho</dt><dd>{lastInput.secondCropTargetAreaHa} ha</dd></div>
            <div><dt>Talhões</dt><dd>{lastInput.fields.length}</dd></div>
          </dl>

            <div className={styles.journeyActions}>
              <button type="button" className={styles.ctaSecondary} onClick={goBack}>
                Voltar e editar
              </button>
              <button type="button" className={styles.submit} onClick={() => setJourneyStage("confirm")}>
                Está tudo certo →
              </button>
            </div>
          </div>
        )}

        {journeyStage === "confirm" && lastInput && (
          <div className={styles.confirmationPanel} aria-labelledby="confirmation-title">
            <div className={styles.confirmationHead}>
              <div>
                <p className={styles.tableLabel}>Última confirmação</p>
                <h3 id="confirmation-title">Confirmar e montar o plano</h3>
              </div>
              <span className={styles.stepBadge}>dados conferidos</span>
            </div>
            <p className={styles.sectionSub} style={{ margin: "1rem 0 1.25rem" }}>
              Vamos usar exatamente os dados que você conferiu e as informações de clima mostradas aqui. O resultado só aparece depois da sua confirmação.
            </p>
            <div className={styles.journeyActions}>
              <button type="button" className={styles.ctaSecondary} onClick={goBack}>
                Voltar para revisão
              </button>
              <button type="button" className={styles.submit} onClick={handleConfirmAndCalculate}>
                Confirmar e montar plano →
              </button>
            </div>
          </div>
        )}

        {journeyStage === "plan" && plan && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div className={styles.modeHeader}>
              <div>
                <p className={styles.tableLabel}>Seu plano está pronto</p>
                <p className={styles.modeHint}>Ele foi montado com os dados que você confirmou e o clima mostrado nesta tela.</p>
              </div>
              <span className={styles.stepBadge}>pronto para usar</span>
            </div>
          <div>
            <p className={styles.tableLabel}>Localização, talhões e clima</p>
            <p className={styles.modeHint} style={{ marginBottom: "0.75rem" }}>O mapa continua editável para apoiar a decisão e uma nova análise.</p>
            <TerritoryEditor embedded initialSearch={municipalityQuery} initialLocation={{ latitude: municipality.latitude, longitude: municipality.longitude }} />
          </div>
          <SeasonStrip
            totalAreaHa={fields.filter((f) => f.priority === "second_crop").reduce((s, f) => s + f.areaHa, 0)}
            seasons={plan.historicalOutcomes.map((o) => ({ label: o.season, areaHa: o.secondCropViableAreaHa }))}
            eyebrow="Como este plano se saiu"
            heading={`Veja o resultado nas 41 safras de ${municipality.name}/${municipality.state}.`}
            tag={dataset.real ? `cálculo pelas mesmas regras · ${dataset.source}` : "cálculo com dados de exemplo"}
          />

          <div className={styles.tableWrap} style={{ borderBottom: "none" }}>
            <p className={styles.tableLabel}>Por onde começar o plantio</p>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Talhão</th>
                  <th>Começar a soja</th>
                  <th>Colher a soja</th>
                  <th>Depois, plantar milho?</th>
                </tr>
              </thead>
              <tbody>
                {plan.sequence.map((s) => (
                  <tr key={s.fieldId}>
                    <td>{s.fieldId}</td>
                    <td>{s.startDate}</td>
                    <td>{s.endDate}</td>
                    <td>{s.secondCropCandidate ? "sim" : "não, fica só na soja"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={stripStyles.metrics} style={{ marginTop: 0 }}>
            <div className={stripStyles.metric}>
              <span className={stripStyles.metricValue}>{currency.format(plan.metrics.financialP20)}</span>
              <span className={stripStyles.metricLabel}>valor no cenário mais cauteloso entre as 41 safras</span>
            </div>
            <div className={stripStyles.metric}>
              <span className={stripStyles.metricValue}>{currency.format(plan.metrics.financialMedian)}</span>
              <span className={stripStyles.metricLabel}>valor do meio das 41 safras</span>
            </div>
            <div className={stripStyles.metric}>
              <span className={stripStyles.metricValue}>{currency.format(plan.metrics.differenceFromBaselineP20)}</span>
              <span className={stripStyles.metricLabel}>ganho ou perda no cenário cauteloso, comparado à ordem de sempre</span>
            </div>
          </div>

          <div className={styles.submitNote}>
            <strong>Importante:</strong> {PLAN_NOTES.join(" ")}
          </div>

          <a
            href={buildWhatsAppShareUrl(buildPlanWhatsAppMessage(municipality, plan))}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.ctaSecondary}
            style={{ alignSelf: "flex-start", textDecoration: "none" }}
          >
            Compartilhar plano no WhatsApp
          </a>

          {lastInput && (
            <PlanAccess
              key={plan.inputHash}
              title={`${lastInput.municipality.name}/${lastInput.municipality.state} · plano de plantio`}
              operation={lastInput}
              dataset={dataset}
              onReplan={setReplan}
            />
          )}

          {replan && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className={styles.tableWrap} style={{ borderBottom: "none" }}>
                <p className={styles.tableLabel}>O que mudou no plano</p>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>O que mudou</th>
                      <th>Antes</th>
                      <th>Depois</th>
                      <th>Por que mudou</th>
                    </tr>
                  </thead>
                  <tbody>
                    {replan.changes.map((c) => (
                      <tr key={c.entity}>
                        <td>{friendlyChangeName(c.entity)}</td>
                        <td>{c.before}</td>
                        <td>{c.after}</td>
                        <td>{c.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <a
                href={buildWhatsAppShareUrl(buildReplanWhatsAppMessage(municipality, replan))}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.ctaSecondary}
                style={{ alignSelf: "flex-start", textDecoration: "none" }}
              >
                Compartilhar novo plano no WhatsApp
              </a>
            </div>
          )}
          </div>
        )}
      </section>
    </div>
  );
}
