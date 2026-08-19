"use client";

import { useEffect, useRef, useState } from "react";
import styles from "@/app/page.module.css";
import detailsStyles from "./operation-details.module.css";
import stripStyles from "./season-strip.module.css";
import { buildPlan } from "@/domain/planner";
import {
  FarmOperationInputSchema,
  OperationDraftSchema,
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
import { TerritoryEditor } from "./territory/territory-editor";
import { connectRealtimeVoiceSession, type RealtimeVoiceController } from "@/lib/realtime-client";

type ClimateStatus = "fixture" | "loading" | "live" | "error";
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
  { id: "SOJA-98", crop: "soybean", cycleDays: 98, availableAreaHa: 580 },
  { id: "SOJA-112", crop: "soybean", cycleDays: 112, availableAreaHa: 270 },
];

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function OperationForm() {
  const voiceControllerRef = useRef<RealtimeVoiceController | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>("voice");
  const [voiceStatus, setVoiceStatus] = useState<"idle" | "connecting" | "listening" | "processing" | "ready" | "parsing" | "error">("idle");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceReview, setVoiceReview] = useState<string[]>([]);
  const [naturalBrief, setNaturalBrief] = useState(PREPARED_BRIEF);
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

  useEffect(() => () => voiceControllerRef.current?.close(), []);

  function applyOperationDraft(draft: OperationDraft) {
    const place = [draft.municipalityQuery?.name, draft.municipalityQuery?.state].filter(Boolean).join(", ");
    if (place) setMunicipalityQuery(place);
    if (draft.totalAreaHa !== undefined) setTotalAreaHa(draft.totalAreaHa);
    if (draft.planterCapacityHaPerDay !== undefined) {
      setPlanterCount(1);
      setPlanterCapacityHaPerDay(draft.planterCapacityHaPerDay);
    }
    if (draft.startDate) setStartDate(draft.startDate);
    if (draft.secondCropTargetAreaHa !== undefined) setSecondCropTargetAreaHa(draft.secondCropTargetAreaHa);
    if (draft.finance?.soybeanMarginPerHa !== undefined) setSoybeanMarginPerHa(draft.finance.soybeanMarginPerHa);
    if (draft.finance?.cornMarginPerHa !== undefined) setCornMarginPerHa(draft.finance.cornMarginPerHa);
    if (draft.finance?.operatingCostPerDay !== undefined) setOperatingCostPerDay(draft.finance.operatingCostPerDay);

    const completeFields = draft.fields.flatMap((field) => field.areaHa === undefined ? [] : [{
      id: field.id,
      areaHa: field.areaHa,
      priority: field.secondCropEligible === undefined
        ? fields.find((current) => current.id === field.id)?.priority ?? "soy_only" as const
        : field.secondCropEligible ? "second_crop" as const : "soy_only" as const,
    }]);
    if (completeFields.length > 0) setFields(completeFields);

    const completeLots = draft.seedLots.flatMap((lot) =>
      lot.crop !== "soybean" || lot.cycleDays === undefined || lot.availableAreaHa === undefined
        ? []
        : [{ id: lot.id, crop: "soybean" as const, cycleDays: lot.cycleDays, availableAreaHa: lot.availableAreaHa }],
    );
    if (completeLots.length > 0) setSeedLots(completeLots);
    setVoiceReview([
      ...draft.missingFields.map((field) => `Falta confirmar: ${field}`),
      ...draft.ambiguities.map((item) => `Dado ambíguo: ${item}`),
    ]);
  }

  function closeVoiceSession() {
    voiceControllerRef.current?.close();
    voiceControllerRef.current = null;
  }

  async function toggleVoice() {
    if (voiceControllerRef.current) {
      if (voiceStatus === "listening") {
        voiceControllerRef.current.stopPushToTalk();
        setVoiceStatus("processing");
        window.setTimeout(() => {
          setVoiceStatus((current) => {
            if (current !== "processing") return current;
            setError("A transcrição demorou mais que o esperado. Tente falar novamente ou use o modo digitado.");
            return "error";
          });
        }, 8_000);
      } else {
        voiceControllerRef.current.startPushToTalk();
        setVoiceStatus("listening");
      }
      return;
    }

    setVoiceStatus("connecting");
    setError(null);
    try {
      const controller = await connectRealtimeVoiceSession(crypto.randomUUID(), {
        onTranscript: (transcript) => {
          setVoiceTranscript((current) => current ? `${current} ${transcript}` : transcript);
          setNaturalBrief((current) => current === PREPARED_BRIEF ? transcript : `${current} ${transcript}`);
          setVoiceStatus((current) => current === "processing" ? "ready" : current);
        },
        onError: () => {
          closeVoiceSession();
          setVoiceStatus("error");
          setError("A sessão de voz foi interrompida. A transcrição já recebida continua disponível.");
        },
        updateOperationDraft: ({ draft }) => {
          applyOperationDraft(draft);
          return { ok: true, message: "Rascunho atualizado. Continue a conversa e confirme os dados com o produtor." };
        },
        requestOperationConfirmation: ({ draftVersion }) => ({
          ok: true,
          draftVersion,
          confirmationToken: `voice-${draftVersion}`,
          message: "Leia o resumo e peça uma confirmação explícita." ,
        }),
        confirmOperationAndCalculate: ({ affirmative }) => ({ ok: affirmative, message: "A confirmação final será feita na interface depois da revisão dos campos." }),
        updateFieldEventDraft: () => ({ ok: true }),
        requestFieldEventConfirmation: ({ draftVersion }) => ({ ok: true, draftVersion, confirmationToken: `event-${draftVersion}` }),
        confirmFieldEvent: ({ affirmative }) => ({ ok: affirmative }),
      });
      voiceControllerRef.current = controller;
      controller.startPushToTalk();
      setVoiceStatus("listening");
    } catch {
      closeVoiceSession();
      setVoiceStatus("error");
      setError("Não foi possível abrir o microfone agora. Você pode tentar novamente ou digitar o relato.");
    }
  }

  async function useVoiceTranscript() {
    const transcript = voiceTranscript.trim();
    if (!transcript) {
      setError("Ainda não recebemos uma transcrição. Fale novamente e aguarde o texto aparecer.");
      return;
    }
    closeVoiceSession();
    setVoiceStatus("parsing");
    setError(null);
    try {
      const response = await fetch("/api/parse-brief", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: transcript }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "não foi possível organizar a transcrição");
      const draft = OperationDraftSchema.parse(body.draft);
      applyOperationDraft(draft);
      setVoiceStatus("ready");
      beginCompletion("voice");
    } catch {
      setVoiceStatus("ready");
      setError("A fala foi transcrita, mas não conseguimos organizar os campos. Revise pelo modo digitado.");
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
    invalidateConfirmation();
    setClimateStatus("loading");
    try {
      const locRes = await fetch(`/api/locations?q=${encodeURIComponent(municipalityQuery)}`);
      const locBody = await locRes.json();
      if (!locRes.ok) throw new Error(locBody.error ?? "geocodificação falhou");
      const resolved: Municipality = locBody.municipality;

      const climateRes = await fetch("/api/climate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ municipality: resolved }),
      });
      const climateBody = await climateRes.json();
      if (!climateRes.ok) throw new Error(climateBody.error ?? "busca de clima falhou");

      setMunicipality(resolved);
      setDataset(climateBody.dataset);
      setClimateStatus("live");
    } catch {
      setMunicipality(sorrisoMt);
      setDataset(sorrisoMt41Seasons);
      setClimateStatus("error");
    }
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
      setError(null);
      setJourneyStage("plan");
    } catch (cause) {
      setPlan(null);
      setError(cause instanceof Error ? cause.message : "Não foi possível montar o plano com estes dados.");
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
                    <button type="button" className={styles.voiceButton} onClick={toggleVoice} disabled={voiceStatus === "connecting" || voiceStatus === "processing" || voiceStatus === "parsing"} aria-pressed={voiceStatus === "listening"}>
                      <span className={styles.voiceIcon} aria-hidden="true">
                        <svg className={styles.microphoneIcon} viewBox="0 0 24 24" fill="none" focusable="false" aria-hidden="true">
                          <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z" stroke="currentColor" strokeWidth="1.8" />
                          <path d="M18 11a6 6 0 0 1-12 0M12 17v4M8 21h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                      </span>
                      <strong>
                        {voiceStatus === "connecting" ? "Conectando…"
                          : voiceStatus === "listening" ? "Ouvindo — toque para parar"
                          : voiceStatus === "processing" ? "Processando sua fala…"
                          : voiceTranscript ? "Falar mais" : "Começar a falar"}
                      </strong>
                      <small>{voiceStatus === "listening" ? "Fale normalmente; o texto aparecerá abaixo" : "O avanço só será liberado depois da transcrição"}</small>
                    </button>
                    <p className={styles.voicePreparedNote}>
                      {voiceStatus === "error" ? "A voz foi interrompida; tente novamente ou use o caminho digitado." : "A IA organiza a fala, mas você confere os campos antes do cálculo."}
                    </p>
                    <div className={styles.transcriptBox} aria-live="polite">
                      <strong>Transcrição</strong>
                      <p>{voiceTranscript || "Sua fala aparecerá aqui para você conferir."}</p>
                    </div>
                    {voiceReview.length > 0 && <ul className={styles.voiceReview}>{voiceReview.map((item) => <li key={item}>{item}</li>)}</ul>}
                    <button
                      type="button"
                      className={styles.ctaPrimary}
                      onClick={useVoiceTranscript}
                      disabled={!voiceTranscript.trim() || voiceStatus === "connecting" || voiceStatus === "listening" || voiceStatus === "processing" || voiceStatus === "parsing"}
                    >
                      {voiceStatus === "parsing" ? "Organizando dados…" : "Usar esta transcrição →"}
                    </button>
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
                  />
                  <div className={styles.journeyActions}>
                    <span>Vamos organizar o que você escreveu na próxima etapa.</span>
                    <button type="button" className={styles.ctaPrimary} onClick={() => beginCompletion("text")}>
                      Continuar →
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
            <TerritoryEditor embedded onContinue={() => setJourneyStage("complete")} />
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
                      {climateStatus === "loading" && "Buscando informações de clima da região…"}
                      {climateStatus === "error" && <span className={detailsStyles.riskNote}>Não foi possível buscar o clima agora. Vamos usar dados de exemplo de {sorrisoMt.name}/{sorrisoMt.state}.</span>}
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
                        <span>Confira área e uso na segunda safra</span>
                      </div>
                      <div className={detailsStyles.itemEditor}>
                        <label>Área (ha)<input type="number" min="1" value={field.areaHa} onChange={(event) => { setFields((current) => current.map((item) => item.id === field.id ? { ...item, areaHa: Number(event.target.value) } : item)); invalidateConfirmation(); }} /></label>
                        <label>Uso<select value={field.priority} onChange={(event) => { setFields((current) => current.map((item) => item.id === field.id ? { ...item, priority: event.target.value as "second_crop" | "soy_only" } : item)); invalidateConfirmation(); }}><option value="second_crop">soja e milho</option><option value="soy_only">só soja</option></select></label>
                      </div>
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
                    <li key={seed.id} className={detailsStyles.itemCard}>
                      <div>
                        <strong>{seed.id}</strong>
                        <span>Confira ciclo e cobertura do lote</span>
                      </div>
                      <div className={detailsStyles.itemEditor}>
                        <label>Ciclo (dias)<input type="number" min="1" value={seed.cycleDays} onChange={(event) => { setSeedLots((current) => current.map((item) => item.id === seed.id ? { ...item, cycleDays: Number(event.target.value) } : item)); invalidateConfirmation(); }} /></label>
                        <label>Cobre (ha)<input type="number" min="1" value={seed.availableAreaHa} onChange={(event) => { setSeedLots((current) => current.map((item) => item.id === seed.id ? { ...item, availableAreaHa: Number(event.target.value) } : item)); invalidateConfirmation(); }} /></label>
                      </div>
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
            : `dados de exemplo de ${municipality.name}/${municipality.state}`}
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
            {error && <p className={styles.submitNote} style={{ color: "var(--risk)" }}>{error}</p>}
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
            {error && <p className={styles.submitNote} style={{ color: "var(--risk)" }}>{error}</p>}
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
            <TerritoryEditor embedded />
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
