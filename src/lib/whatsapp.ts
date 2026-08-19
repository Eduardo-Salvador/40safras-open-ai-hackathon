import type { Municipality, PlanResult, ReplanResult } from "@/domain/schemas";

const DISCLAIMER =
  "Protótipo de apoio à decisão. Não substitui o ZARC nem constitui orientação agronômica, financeira, de crédito ou de seguro.";

function resultId(plan: PlanResult): string {
  return `${plan.inputHash}-${plan.datasetHash}`;
}

function formatSequence(sequence: PlanResult["sequence"]): string {
  return sequence.map((s) => `${s.fieldId} (${s.startDate})`).join(" → ");
}

export function buildPlanWhatsAppMessage(municipality: Municipality, plan: PlanResult): string {
  return [
    `*Quarenta Safras* — ${municipality.name}/${municipality.state}`,
    `Sequência: ${formatSequence(plan.sequence)}`,
    `Safras viáveis: ${plan.metrics.viableSeasons}/${plan.dataset.seasons}`,
    `Segunda safra em P20: ${plan.metrics.secondCropAreaP20Ha} ha`,
    `Resultado financeiro em P20: R$ ${plan.metrics.financialP20.toLocaleString("pt-BR")}`,
    `Fonte do clima: ${plan.dataset.source}${plan.dataset.real ? "" : " (fixture)"}`,
    `ID do resultado: ${resultId(plan)}`,
    DISCLAIMER,
  ].join("\n");
}

export function buildReplanWhatsAppMessage(municipality: Municipality, replan: ReplanResult): string {
  const critical = replan.changes[0];
  return [
    `*Quarenta Safras* — replanejamento em ${municipality.name}/${municipality.state}`,
    critical
      ? `Mudança crítica: ${critical.entity}: ${critical.before} → ${critical.after} (${critical.reason})`
      : "Sem mudanças detectadas neste evento.",
    `Sequência atualizada: ${formatSequence(replan.after.sequence)}`,
    `Segunda safra em P20: ${replan.before.metrics.secondCropAreaP20Ha} ha → ${replan.after.metrics.secondCropAreaP20Ha} ha`,
    `ID do resultado: ${resultId(replan.after)}`,
    DISCLAIMER,
  ].join("\n");
}

export function buildWhatsAppShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
