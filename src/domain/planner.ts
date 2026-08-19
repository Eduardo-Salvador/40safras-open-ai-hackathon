import { centsToReais, seasonFinancialResultCents } from "./finance";
import { hashObject, median, percentile } from "./metrics";
import type { FarmOperationInput, FieldBlock, HistoricalDataset, PlanResult } from "./schemas";
import { buildSequence, secondCropViableAreaHa, totalOperationDays, type SequenceItem } from "./simulator";

/**
 * The "Quarenta Safras order": second-crop fields move to the front so the
 * planter frees them earliest, maximizing the odds each one beats that
 * season's rain window. `Array#sort` is stable, so relative order within
 * each priority group is preserved from the user's input.
 */
function candidateFieldOrder(fields: FarmOperationInput["fields"]): FieldBlock[] {
  return [...fields].sort((a, b) => {
    if (a.priority === b.priority) return 0;
    return a.priority === "second_crop" ? -1 : 1;
  });
}

type OrderEvaluation = {
  sequence: SequenceItem[];
  historicalOutcomes: PlanResult["historicalOutcomes"];
  viableSeasons: number;
  secondCropAreaP20Ha: number;
  financialMedian: number;
  financialP20: number;
  financialWorstObserved: number;
};

function evaluateOrder(
  input: FarmOperationInput,
  dataset: HistoricalDataset,
  fieldOrder: FieldBlock[],
): OrderEvaluation {
  const sequence = buildSequence(input, fieldOrder);
  const totalAreaHa = input.fields.reduce((sum, f) => sum + f.areaHa, 0);
  const operationDays = totalOperationDays(sequence);

  const historicalOutcomes = dataset.records.map((season) => {
    const viableHa = secondCropViableAreaHa(sequence, season);
    const resultCents = seasonFinancialResultCents(input.finance, totalAreaHa, viableHa, operationDays);
    return {
      season: season.season,
      secondCropViableAreaHa: viableHa,
      financialResult: centsToReais(resultCents),
    };
  });

  const areaValues = historicalOutcomes.map((o) => o.secondCropViableAreaHa);
  const financialValues = historicalOutcomes.map((o) => o.financialResult);

  return {
    sequence,
    historicalOutcomes,
    viableSeasons: historicalOutcomes.filter((o) => o.secondCropViableAreaHa > 0).length,
    secondCropAreaP20Ha: Math.round(percentile(areaValues, 20)),
    financialMedian: Math.round(median(financialValues)),
    financialP20: Math.round(percentile(financialValues, 20)),
    financialWorstObserved: Math.round(Math.min(...financialValues)),
  };
}

export function buildPlan(input: FarmOperationInput, dataset: HistoricalDataset): PlanResult {
  const baseline = evaluateOrder(input, dataset, input.fields);
  const candidate = evaluateOrder(input, dataset, candidateFieldOrder(input.fields));

  return {
    inputHash: hashObject(input),
    datasetHash: hashObject(dataset),
    dataset: {
      source: dataset.source,
      seasons: dataset.seasons,
      cached: dataset.cached,
      real: dataset.real,
    },
    assumptions: [
      "operational end-of-rains threshold is a declared prototype assumption, not agronomically validated",
      "second-crop fields use the fastest available soybean cultivar; soy-only fields use the slowest",
      "corn cycle uses the configured default for the crop profile, not a field-specific cultivar",
      "financial result uses only the margins and cost you provided; it is not a profit guarantee",
    ],
    sequence: candidate.sequence.map(({ fieldId, cycleDays, startDate, endDate, secondCropCandidate }) => ({
      fieldId,
      cycleDays,
      startDate,
      endDate,
      secondCropCandidate,
    })),
    historicalOutcomes: candidate.historicalOutcomes,
    metrics: {
      viableSeasons: candidate.viableSeasons,
      secondCropAreaP20Ha: candidate.secondCropAreaP20Ha,
      financialMedian: candidate.financialMedian,
      financialP20: candidate.financialP20,
      financialWorstObserved: candidate.financialWorstObserved,
      differenceFromBaselineP20: candidate.financialP20 - baseline.financialP20,
    },
  };
}
