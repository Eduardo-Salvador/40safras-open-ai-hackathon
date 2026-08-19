"use client";

import { useState } from "react";
import styles from "@/app/page.module.css";
import stripStyles from "./season-strip.module.css";
import { buildPlan } from "@/domain/planner";
import { buildReplan } from "@/domain/replan";
import {
  FarmOperationInputSchema,
  type FarmOperationInput,
  type FieldEvent,
  type HistoricalDataset,
  type FieldEventDraft,
  type Municipality,
  type OperationDraft,
  type PlanResult,
  type ReplanResult,
} from "@/domain/schemas";
import { buildPlanWhatsAppMessage, buildReplanWhatsAppMessage, buildWhatsAppShareUrl } from "@/lib/whatsapp";
import { sorrisoMt, sorrisoMt41Seasons } from "../../data/fixtures/municipalities/sorriso-mt";
import { SeasonStrip } from "./season-strip";
import { VoiceInput } from "./voice-input";
import { buildTelegramShareUrl, shareOrCopy } from "@/lib/sharing";

type ClimateStatus = "fixture" | "loading" | "live" | "error";

// Deliberately not pre-sorted by priority: this is the "usual order" a
// producer would naturally list fields in, so the recommended reorder below
// has something real to improve on.
const FIELDS: FarmOperationInput["fields"] = [
  { id: "T-03", areaHa: 270, priority: "soy_only" },
  { id: "T-01", areaHa: 320, priority: "second_crop" },
  { id: "T-02", areaHa: 260, priority: "second_crop" },
];

const SEED_LOTS: FarmOperationInput["seedLots"] = [
  { crop: "soybean", cycleDays: 98, availableAreaHa: 580 },
  { crop: "soybean", cycleDays: 112, availableAreaHa: 270 },
];

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function OperationForm() {
  const [entryMode, setEntryMode] = useState<"voice" | "text" | "form">("form");
  const [naturalBrief, setNaturalBrief] = useState("Sorriso, MT. Início 2025-09-15, área total 850 ha, capacidade 45 ha/dia e meta de 580 ha de milho.");
  const [draft, setDraft] = useState<OperationDraft | null>(null);
  const [draftSource, setDraftSource] = useState<"openai" | "prepared-fallback" | null>(null);
  const [parsingBrief, setParsingBrief] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [draftVersion, setDraftVersion] = useState(1);
  const [municipalityQuery, setMunicipalityQuery] = useState("Sorriso");
  const [municipality, setMunicipality] = useState<Municipality>(sorrisoMt);
  const [dataset, setDataset] = useState<HistoricalDataset>(sorrisoMt41Seasons);
  const [climateStatus, setClimateStatus] = useState<ClimateStatus>("fixture");
  const [climateNote, setClimateNote] = useState<string | null>(null);

  const [totalAreaHa, setTotalAreaHa] = useState(850);
  const [planterCapacityHaPerDay, setPlanterCapacityHaPerDay] = useState(45);
  const [startDate, setStartDate] = useState("2025-09-15");
  const [secondCropTargetAreaHa, setSecondCropTargetAreaHa] = useState(580);
  const [soybeanMarginPerHa, setSoybeanMarginPerHa] = useState(1850);
  const [cornMarginPerHa, setCornMarginPerHa] = useState(1200);
  const [operatingCostPerDay, setOperatingCostPerDay] = useState<number | "">("");

  const [plan, setPlan] = useState<PlanResult | null>(null);
  const [lastInput, setLastInput] = useState<FarmOperationInput | null>(null);
  const [replan, setReplan] = useState<ReplanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [eventText, setEventText] = useState("Chuva forte alagou o talhão T-01 em 2025-09-15.");
  const [eventDraft, setEventDraft] = useState<FieldEventDraft | null>(null);
  const [eventSource, setEventSource] = useState<"openai" | "prepared-fallback" | null>(null);
  const [eventConfirmed, setEventConfirmed] = useState(false);
  const [shareAuthorized, setShareAuthorized] = useState(false);
  const [shareNote, setShareNote] = useState<string | null>(null);

  function invalidateConfirmation() {
    setConfirmed(false);
    setDraftVersion((version) => version + 1);
    setPlan(null);
    setReplan(null);
    setShareAuthorized(false);
  }

  async function handleParseBrief() {
    setParsingBrief(true);
    setError(null);
    try {
      const response = await fetch("/api/parse-brief", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: naturalBrief }),
      });
      const body = (await response.json()) as { draft?: OperationDraft; source?: "openai" | "prepared-fallback"; error?: string };
      if (!response.ok || !body.draft || !body.source) throw new Error(body.error ?? "não foi possível estruturar o relato");
      setDraft(body.draft);
      setDraftSource(body.source);
      if (body.draft.municipalityQuery) setMunicipalityQuery(body.draft.municipalityQuery);
      if (body.draft.startDate) setStartDate(body.draft.startDate);
      if (body.draft.totalAreaHa !== null) setTotalAreaHa(body.draft.totalAreaHa);
      if (body.draft.planterCapacityHaPerDay !== null) setPlanterCapacityHaPerDay(body.draft.planterCapacityHaPerDay);
      if (body.draft.secondCropTargetAreaHa !== null) setSecondCropTargetAreaHa(body.draft.secondCropTargetAreaHa);
      if (body.draft.soybeanMarginPerHa !== null) setSoybeanMarginPerHa(body.draft.soybeanMarginPerHa);
      if (body.draft.cornMarginPerHa !== null) setCornMarginPerHa(body.draft.cornMarginPerHa);
      if (body.draft.operatingCostPerDay !== null) setOperatingCostPerDay(body.draft.operatingCostPerDay);
      invalidateConfirmation();
      setEntryMode("form");
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : "falha ao estruturar relato");
    } finally {
      setParsingBrief(false);
    }
  }

  async function handleLoadClimate() {
    setClimateStatus("loading");
    setClimateNote(null);
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
      setClimateStatus(climateBody.fallback ? "fixture" : "live");
      setClimateNote(climateBody.fallback ? "consulta ao vivo indisponível; fixture offline identificada" : null);
      invalidateConfirmation();
    } catch (err) {
      setMunicipality(sorrisoMt);
      setDataset(sorrisoMt41Seasons);
      setClimateStatus("error");
      setClimateNote(err instanceof Error ? err.message : "falha desconhecida ao buscar clima ao vivo");
    }
  }

  function handleSubmit() {
    const input: FarmOperationInput = {
      municipality,
      totalAreaHa,
      planterCapacityHaPerDay,
      startDate,
      firstCrop: "soybean",
      secondCrop: "corn",
      fields: FIELDS,
      seedLots: SEED_LOTS,
      secondCropTargetAreaHa,
      finance: {
        soybeanMarginPerHa,
        cornMarginPerHa,
        operatingCostPerDay: operatingCostPerDay === "" ? undefined : operatingCostPerDay,
      },
    };

    const parsed = FarmOperationInputSchema.safeParse(input);
    if (!parsed.success) {
      setPlan(null);
      setError(parsed.error.issues.map((i) => i.message).join("; "));
      return;
    }

    if (!confirmed) {
      setError("Revise o resumo e confirme esta versão antes de calcular.");
      setLastInput(parsed.data);
      return;
    }

    try {
      setError(null);
      setPlan(buildPlan(parsed.data, dataset));
      setLastInput(parsed.data);
      setReplan(null);
    } catch (planError) {
      setPlan(null);
      setError(planError instanceof Error ? planError.message : "falha ao calcular o plano");
    }
  }

  async function handleParseEvent() {
    setError(null);
    const response = await fetch("/api/parse-event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: eventText, defaultDate: startDate }),
    });
    const body = (await response.json()) as { draft?: FieldEventDraft; source?: "openai" | "prepared-fallback"; error?: string };
    if (!response.ok || !body.draft || !body.source) {
      setError(body.error ?? "não foi possível estruturar o evento");
      return;
    }
    setEventDraft(body.draft);
    setEventSource(body.source);
    setEventConfirmed(false);
    setShareAuthorized(false);
  }

  function handleApplyEvent() {
    if (!lastInput || !eventDraft || !eventConfirmed) return;
    const event: FieldEvent = {
      effectiveDate: eventDraft.effectiveDate,
      blockedFieldIds: eventDraft.blockedFieldIds,
      blockedUntil: eventDraft.blockedUntil ?? undefined,
      seedDeltaAreaHaByCycle: {},
      notes: eventDraft.notes,
    };
    setReplan(buildReplan(lastInput, dataset, event));
    setShareAuthorized(false);
  }

  return (
    <div className={styles.ledger}>
      <div className={styles.entryModes} role="group" aria-label="Modo de entrada">
        <button type="button" className={entryMode === "voice" ? styles.modeActive : styles.ctaSecondary} onClick={() => setEntryMode("voice")}>Falar</button>
        <button type="button" className={entryMode === "text" ? styles.modeActive : styles.ctaSecondary} onClick={() => setEntryMode("text")}>Escrever livremente</button>
        <button type="button" className={entryMode === "form" ? styles.modeActive : styles.ctaSecondary} onClick={() => setEntryMode("form")}>Preencher formulário</button>
      </div>

      {entryMode === "voice" && (
        <VoiceInput onTranscript={(transcript) => {
          setNaturalBrief((current) => current ? `${current} ${transcript}` : transcript);
          setEntryMode("text");
          invalidateConfirmation();
        }} />
      )}

      {entryMode === "text" && (
        <div className={styles.freeTextPanel}>
          <label htmlFor="natural-brief">Relato da operação em português</label>
          <textarea id="natural-brief" value={naturalBrief} onChange={(event) => {
            setNaturalBrief(event.target.value);
            invalidateConfirmation();
          }} rows={5} />
          <button type="button" className={styles.ctaPrimary} onClick={handleParseBrief} disabled={parsingBrief}>
            {parsingBrief ? "Organizando…" : "Organizar relato"}
          </button>
          <span className={styles.submitNote}>A IA apenas estrutura o relato; datas derivadas, clima e dinheiro ficam no código determinístico.</span>
        </div>
      )}

      {draft && (
        <div className={styles.draftNotice}>
          <strong>Rascunho v{draftVersion} · {draftSource === "openai" ? "OpenAI" : "fallback preparado"}</strong>
          <span>{draft.missingFields.length ? `Ainda faltam: ${draft.missingFields.join(", ")}.` : "Campos principais identificados; revise o formulário abaixo."}</span>
        </div>
      )}

      <div className={styles.ledgerRow}>
        <div className={styles.field}>
          <label htmlFor="municipality">Município</label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              id="municipality"
              value={municipalityQuery}
              onChange={(e) => { setMunicipalityQuery(e.target.value); invalidateConfirmation(); }}
              placeholder="ex: Sorriso, Rondonópolis, Sinop"
            />
            <button
              type="button"
              onClick={handleLoadClimate}
              disabled={climateStatus === "loading"}
              className={styles.ctaSecondary}
              style={{ padding: "0.6rem 0.9rem", fontSize: "0.85rem", whiteSpace: "nowrap" }}
            >
              {climateStatus === "loading" ? "Buscando…" : "Buscar clima"}
            </button>
          </div>
          <span className={styles.submitNote} style={{ marginTop: "0.35rem" }}>
            {climateStatus === "live" &&
              `${municipality.name}/${municipality.state} · ${dataset.source} · ${dataset.cached ? "cache" : "ao vivo"}`}
            {climateStatus === "fixture" &&
              `${municipality.name}/${municipality.state} · ${dataset.source} · fixture offline${climateNote ? ` (${climateNote})` : ""}`}
            {climateStatus === "loading" && "consultando Open-Meteo + IBGE…"}
            {climateStatus === "error" && (
              <span style={{ color: "var(--risk)" }}>
                {climateNote} — usando fixture de {sorrisoMt.name}/{sorrisoMt.state}
              </span>
            )}
          </span>
        </div>
        <div className={styles.field}>
          <label htmlFor="start-date">Data de início</label>
          <input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); invalidateConfirmation(); }}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="target-area">Meta de área segunda safra (ha)</label>
          <input
            id="target-area"
            type="number"
            value={secondCropTargetAreaHa}
            onChange={(e) => { setSecondCropTargetAreaHa(Number(e.target.value)); invalidateConfirmation(); }}
          />
        </div>
      </div>

      <div className={styles.ledgerRow}>
        <div className={styles.field}>
          <label htmlFor="total-area">Área total (ha)</label>
          <input
            id="total-area"
            type="number"
            value={totalAreaHa}
            onChange={(e) => { setTotalAreaHa(Number(e.target.value)); invalidateConfirmation(); }}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="planter">Capacidade da plantadeira (ha/dia)</label>
          <input
            id="planter"
            type="number"
            value={planterCapacityHaPerDay}
            onChange={(e) => { setPlanterCapacityHaPerDay(Number(e.target.value)); invalidateConfirmation(); }}
          />
        </div>
      </div>

      <div className={styles.tableWrap}>
        <p className={styles.tableLabel}>Talhões (fixo neste protótipo)</p>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Talhão</th>
              <th>Área (ha)</th>
              <th>Prioridade</th>
            </tr>
          </thead>
          <tbody>
            {FIELDS.map((f) => (
              <tr key={f.id}>
                <td>{f.id}</td>
                <td>{f.areaHa} ha</td>
                <td>
                  <span className={styles.priorityPill} data-priority={f.priority}>
                    {f.priority === "second_crop" ? "segunda safra" : "só soja"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.tableWrap}>
        <p className={styles.tableLabel}>Lotes de semente (fixo neste protótipo)</p>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Cultivar</th>
              <th>Ciclo (dias)</th>
              <th>Área disponível</th>
            </tr>
          </thead>
          <tbody>
            {SEED_LOTS.map((s) => (
              <tr key={s.cycleDays}>
                <td>Soja {s.cycleDays}d</td>
                <td>{s.cycleDays} dias</td>
                <td>{s.availableAreaHa} ha</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.ledgerRow}>
        <div className={styles.field}>
          <label htmlFor="soy-margin">Margem soja (R$/ha)</label>
          <input
            id="soy-margin"
            type="number"
            value={soybeanMarginPerHa}
            onChange={(e) => { setSoybeanMarginPerHa(Number(e.target.value)); invalidateConfirmation(); }}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="corn-margin">Margem milho (R$/ha)</label>
          <input
            id="corn-margin"
            type="number"
            value={cornMarginPerHa}
            onChange={(e) => { setCornMarginPerHa(Number(e.target.value)); invalidateConfirmation(); }}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="op-cost">Custo operacional (R$/dia, opcional)</label>
          <input
            id="op-cost"
            type="number"
            placeholder="—"
            value={operatingCostPerDay}
            onChange={(e) => { setOperatingCostPerDay(e.target.value === "" ? "" : Number(e.target.value)); invalidateConfirmation(); }}
          />
        </div>
      </div>

      <div className={styles.ledgerFooter}>
        <button
          className={styles.submit}
          type="button"
          onClick={() => {
            if (confirmed) {
              handleSubmit();
              return;
            }
            setConfirmed(true);
            setError(null);
          }}
          disabled={false}
          style={{ cursor: "pointer", opacity: 1 }}
        >
          {confirmed ? "Calcular plano confirmado →" : "Confirmar esta versão →"}
        </button>
        <span className={styles.submitNote}>
          {confirmed ? `versão ${draftVersion} confirmada por botão · ` : `versão ${draftVersion} ainda não confirmada · `}
          {climateStatus === "live"
            ? `clima ao vivo de ${municipality.name}/${municipality.state}`
            : `fixture climática de ${municipality.name}/${municipality.state}`}
        </span>
      </div>

      {error && (
        <p className={styles.submitNote} style={{ color: "var(--risk)", marginTop: "1rem" }}>
          Entrada inválida: {error}
        </p>
      )}

      {plan && (
        <div style={{ marginTop: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <SeasonStrip
            totalAreaHa={FIELDS.filter((f) => f.priority === "second_crop").reduce((s, f) => s + f.areaHa, 0)}
            seasons={plan.historicalOutcomes.map((o) => ({ label: o.season, areaHa: o.secondCropViableAreaHa }))}
            eyebrow="Resultado real"
            heading={`O motor rodou as 41 safras de ${municipality.name}/${municipality.state}.`}
            tag={dataset.real ? `motor determinístico · ${dataset.source}` : "motor determinístico · fixture"}
          />

          <div className={styles.tableWrap} style={{ borderBottom: "none" }}>
            <p className={styles.tableLabel}>Ordem recomendada (Quarenta Safras)</p>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Talhão</th>
                  <th>Plantio soja</th>
                  <th>Colheita soja</th>
                  <th>Segunda safra?</th>
                </tr>
              </thead>
              <tbody>
                {plan.sequence.map((s) => (
                  <tr key={s.fieldId}>
                    <td>{s.fieldId}</td>
                    <td>{s.startDate}</td>
                    <td>{s.endDate}</td>
                    <td>{s.secondCropCandidate ? "sim, candidata" : "não, só soja"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={stripStyles.metrics} style={{ marginTop: 0 }}>
            {plan.baseline && (
              <div className={stripStyles.metric}>
                <span className={stripStyles.metricValue}>{currency.format(plan.baseline.financialP20)}</span>
                <span className={stripStyles.metricLabel}>ordem usual (baseline), P20</span>
              </div>
            )}
            <div className={stripStyles.metric}>
              <span className={stripStyles.metricValue}>{currency.format(plan.metrics.financialP20)}</span>
              <span className={stripStyles.metricLabel}>plano recomendado, P20</span>
            </div>
            <div className={stripStyles.metric}>
              <span className={stripStyles.metricValue}>{currency.format(plan.metrics.financialMedian)}</span>
              <span className={stripStyles.metricLabel}>resultado financeiro, mediana</span>
            </div>
            <div className={stripStyles.metric}>
              <span className={stripStyles.metricValue}>{currency.format(plan.metrics.differenceFromBaselineP20)}</span>
              <span className={stripStyles.metricLabel}>diferença vs. ordem usual, P20</span>
            </div>
          </div>

          <p className={styles.submitNote}>{plan.assumptions.join(" · ")}</p>

          <a
            href={buildWhatsAppShareUrl(buildPlanWhatsAppMessage(municipality, plan))}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.ctaSecondary}
            style={{ alignSelf: "flex-start", textDecoration: "none" }}
          >
            Compartilhar plano no WhatsApp
          </a>

          <div className={styles.tableWrap} style={{ borderTop: "1px solid var(--rule)", borderBottom: "none", paddingTop: "1.5rem" }}>
            <p className={styles.tableLabel}>Evento de campo</p>
            <textarea value={eventText} onChange={(event) => {
              setEventText(event.target.value);
              setEventDraft(null);
              setEventConfirmed(false);
            }} rows={3} className={styles.eventInput} aria-label="Relato do evento de campo" />
            <div className={styles.eventActions}>
              <button type="button" className={styles.ctaSecondary} onClick={handleParseEvent}>Estruturar evento</button>
              {eventDraft && !eventConfirmed && (
                <button type="button" className={styles.ctaPrimary} onClick={() => setEventConfirmed(true)}>Confirmar evento</button>
              )}
              {eventDraft && eventConfirmed && (
                <button type="button" className={styles.ctaPrimary} onClick={handleApplyEvent}>Calcular replano confirmado</button>
              )}
            </div>
            {eventDraft && (
              <p className={styles.submitNote}>
                {eventSource === "openai" ? "OpenAI" : "fallback preparado"} · {eventDraft.eventType} · {eventDraft.severity} ·
                talhões {eventDraft.blockedFieldIds.join(", ") || "não identificados"} · data {eventDraft.effectiveDate}
              </p>
            )}
          </div>

          {replan && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className={styles.tableWrap} style={{ borderBottom: "none" }}>
                <p className={styles.tableLabel}>Diff auditável (antes → depois)</p>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>O que mudou</th>
                      <th>Antes</th>
                      <th>Depois</th>
                      <th>Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {replan.changes.map((c) => (
                      <tr key={c.entity}>
                        <td>{c.entity}</td>
                        <td>{c.before}</td>
                        <td>{c.after}</td>
                        <td>{c.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <label className={styles.shareAuthorization}>
                <input type="checkbox" checked={shareAuthorized} onChange={(event) => setShareAuthorized(event.target.checked)} />
                Autorizo abrir um canal com esta mensagem determinística. Nada será enviado automaticamente.
              </label>
              {shareAuthorized && (() => {
                const message = buildReplanWhatsAppMessage(municipality, replan);
                const resultUrl = typeof window === "undefined" ? "" : window.location.href;
                return (
                  <div className={styles.eventActions}>
                    <a href={buildWhatsAppShareUrl(message)} target="_blank" rel="noopener noreferrer" className={styles.ctaSecondary}>WhatsApp</a>
                    <a href={buildTelegramShareUrl(message, resultUrl)} target="_blank" rel="noopener noreferrer" className={styles.ctaSecondary}>Telegram</a>
                    <button type="button" className={styles.ctaSecondary} onClick={async () => {
                      const result = await shareOrCopy(message, resultUrl);
                      setShareNote(result === "shared" ? "Compartilhamento aberto." : "Mensagem copiada.");
                    }}>Web Share / copiar</button>
                  </div>
                );
              })()}
              {shareNote && <p className={styles.submitNote}>{shareNote}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
