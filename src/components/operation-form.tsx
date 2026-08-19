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
  type Municipality,
  type PlanResult,
  type ReplanResult,
} from "@/domain/schemas";
import { buildPlanWhatsAppMessage, buildReplanWhatsAppMessage, buildWhatsAppShareUrl } from "@/lib/whatsapp";
import { sorrisoMt, sorrisoMt41Seasons } from "../../data/fixtures/municipalities/sorriso-mt";
import { SeasonStrip } from "./season-strip";

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
  { id: "SOJA-98", crop: "soybean", cycleDays: 98, availableAreaHa: 480 },
  { id: "SOJA-112", crop: "soybean", cycleDays: 112, availableAreaHa: 370 },
];

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function OperationForm() {
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

    setError(null);
    setPlan(buildPlan(parsed.data, dataset));
    setLastInput(parsed.data);
    setReplan(null);
  }

  const FIELD_EVENT: FieldEvent = {
    effectiveDate: startDate,
    blockedFieldIds: ["T-01"],
    seedDeltaAreaHaByCycle: {},
    notes: ["chuva forte alagou o talhão T-01"],
  };

  function handleApplyEvent() {
    if (!lastInput) return;
    setReplan(buildReplan(lastInput, dataset, FIELD_EVENT));
  }

  return (
    <div className={styles.ledger}>
      <div className={styles.ledgerRow}>
        <div className={styles.field}>
          <label htmlFor="municipality">Município</label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              id="municipality"
              value={municipalityQuery}
              onChange={(e) => setMunicipalityQuery(e.target.value)}
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
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="target-area">Meta de área segunda safra (ha)</label>
          <input
            id="target-area"
            type="number"
            value={secondCropTargetAreaHa}
            onChange={(e) => setSecondCropTargetAreaHa(Number(e.target.value))}
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
            onChange={(e) => setTotalAreaHa(Number(e.target.value))}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="planter">Capacidade da plantadeira (ha/dia)</label>
          <input
            id="planter"
            type="number"
            value={planterCapacityHaPerDay}
            onChange={(e) => setPlanterCapacityHaPerDay(Number(e.target.value))}
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
            onChange={(e) => setSoybeanMarginPerHa(Number(e.target.value))}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="corn-margin">Margem milho (R$/ha)</label>
          <input
            id="corn-margin"
            type="number"
            value={cornMarginPerHa}
            onChange={(e) => setCornMarginPerHa(Number(e.target.value))}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="op-cost">Custo operacional (R$/dia, opcional)</label>
          <input
            id="op-cost"
            type="number"
            placeholder="—"
            value={operatingCostPerDay}
            onChange={(e) => setOperatingCostPerDay(e.target.value === "" ? "" : Number(e.target.value))}
          />
        </div>
      </div>

      <div className={styles.ledgerFooter}>
        <button className={styles.submit} type="button" onClick={handleSubmit} disabled={false} style={{ cursor: "pointer", opacity: 1 }}>
          Confirmar e calcular →
        </button>
        <span className={styles.submitNote}>
          motor determinístico local ·{" "}
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
            <div className={stripStyles.metric}>
              <span className={stripStyles.metricValue}>{currency.format(plan.metrics.financialP20)}</span>
              <span className={stripStyles.metricLabel}>resultado financeiro, P20</span>
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
            <p className={styles.sectionSub} style={{ margin: "0 0 0.75rem" }}>
              Simula: &ldquo;{FIELD_EVENT.notes[0]}&rdquo; a partir de {FIELD_EVENT.effectiveDate}. O motor
              recalcula o plano sem esse talhão e mostra o diff auditável antes/depois.
            </p>
            <button type="button" className={styles.ctaSecondary} onClick={handleApplyEvent}>
              Aplicar evento e replanejar
            </button>
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

              <a
                href={buildWhatsAppShareUrl(buildReplanWhatsAppMessage(municipality, replan))}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.ctaSecondary}
                style={{ alignSelf: "flex-start", textDecoration: "none" }}
              >
                Compartilhar replanejamento no WhatsApp
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
