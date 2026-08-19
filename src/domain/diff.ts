import type { FieldEvent, PlanResult, ReplanResult } from "./schemas";

/** Deterministic before/after comparison; every entry names what changed and why. */
export function computeReplanDiff(before: PlanResult, after: PlanResult, event: FieldEvent): ReplanResult["changes"] {
  const changes: ReplanResult["changes"] = [];
  const blocked = new Set(event.blockedFieldIds);

  const beforeByField = new Map(before.sequence.map((s) => [s.fieldId, s]));
  const afterByField = new Map(after.sequence.map((s) => [s.fieldId, s]));
  const allFieldIds = new Set([...beforeByField.keys(), ...afterByField.keys()]);

  for (const fieldId of allFieldIds) {
    const b = beforeByField.get(fieldId);
    const a = afterByField.get(fieldId);

    if (b && !a) {
      changes.push({
        entity: `talhão ${fieldId}`,
        before: "no plano",
        after: "bloqueado",
        reason: blocked.has(fieldId) ? "bloqueado pelo evento de campo" : "removido do plano",
      });
      continue;
    }
    if (!b && a) {
      changes.push({
        entity: `talhão ${fieldId}`,
        before: "fora do plano",
        after: "no plano",
        reason: "incluído após reavaliação do evento",
      });
      continue;
    }
    if (b && a) {
      if (b.startDate !== a.startDate) {
        changes.push({
          entity: `talhão ${fieldId} · início do plantio`,
          before: b.startDate,
          after: a.startDate,
          reason: "reordenado pela fila da plantadeira após o evento",
        });
      }
      if (b.secondCropCandidate !== a.secondCropCandidate) {
        changes.push({
          entity: `talhão ${fieldId} · candidato a segunda safra`,
          before: b.secondCropCandidate ? "sim" : "não",
          after: a.secondCropCandidate ? "sim" : "não",
          reason: "mudança de prioridade após o evento",
        });
      }
    }
  }

  if (before.metrics.viableSeasons !== after.metrics.viableSeasons) {
    changes.push({
      entity: "safras viáveis (de 41)",
      before: before.metrics.viableSeasons,
      after: after.metrics.viableSeasons,
      reason: "recalculado com o plano atualizado",
    });
  }
  if (before.metrics.secondCropAreaP20Ha !== after.metrics.secondCropAreaP20Ha) {
    changes.push({
      entity: "área segunda safra, P20 (ha)",
      before: before.metrics.secondCropAreaP20Ha,
      after: after.metrics.secondCropAreaP20Ha,
      reason: "recalculado com o plano atualizado",
    });
  }
  if (before.metrics.financialP20 !== after.metrics.financialP20) {
    changes.push({
      entity: "resultado financeiro, P20 (R$)",
      before: before.metrics.financialP20,
      after: after.metrics.financialP20,
      reason: "recalculado com o plano atualizado",
    });
  }

  return changes;
}
