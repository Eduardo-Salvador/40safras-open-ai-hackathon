import { centsToReais, seasonFinancialResultCents } from "./finance";
import { generateCandidates, type PlanCandidate } from "./candidates";
import { hashObject, median, nearestRankPercentile } from "./metrics";
import { compareCandidateRanking } from "./ranking";
import {
  FarmOperationInputSchema,
  HistoricalDatasetSchema,
  PlanResultSchema,
  type FarmOperationInput,
  type HistoricalDataset,
  type PlanResult,
} from "./schemas";
import { buildSequence, secondCropViableAreaHa, totalOperationDays, type SequenceItem } from "./simulator";

type OrderEvaluation = {
  candidate: PlanCandidate;
  sequence: SequenceItem[];
  historicalOutcomes: PlanResult["historicalOutcomes"];
  targetReachedSeasons: number;
  viableSeasons: number;
  secondCropAreaP20Ha: number;
  financialMedian: number;
  financialP20: number;
  financialWorstObserved: number;
  operationDays: number;
};

const RANKING_CRITERIA = [
  "secondCropAreaP20Ha:desc",
  "targetReachedSeasons:desc",
  "viableSeasons:desc",
  "financialP20:desc",
  "operationDays:asc",
  "candidateKey:asc",
] as const;

function publicSequence(evaluation: OrderEvaluation): PlanResult["sequence"] {
  return evaluation.sequence.map(
    ({ fieldId, seedLotId, cycleDays, startDate, endDate, secondCropCandidate }) => ({
      fieldId,
      seedLotId,
      cycleDays,
      startDate,
      endDate,
      secondCropCandidate,
    }),
  );
}

function evidenceMetrics(evaluation: OrderEvaluation) {
  return {
    targetReachedSeasons: evaluation.targetReachedSeasons,
    viableSeasons: evaluation.viableSeasons,
    secondCropAreaP20Ha: evaluation.secondCropAreaP20Ha,
    financialMedian: evaluation.financialMedian,
    financialP20: evaluation.financialP20,
    financialWorstObserved: evaluation.financialWorstObserved,
    operationDays: evaluation.operationDays,
  };
}

function evaluateOrder(
  input: FarmOperationInput,
  dataset: HistoricalDataset,
  candidate: PlanCandidate,
): OrderEvaluation {
  const sequence = buildSequence(
    input,
    candidate.fieldOrder,
    candidate.cycleDaysByField,
    candidate.seedLotIdByField,
  );
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
    candidate,
    sequence,
    historicalOutcomes,
    targetReachedSeasons: historicalOutcomes.filter(
      (outcome) => outcome.secondCropViableAreaHa >= input.secondCropTargetAreaHa,
    ).length,
    viableSeasons: historicalOutcomes.filter((o) => o.secondCropViableAreaHa > 0).length,
    secondCropAreaP20Ha: nearestRankPercentile(areaValues, 20),
    financialMedian: median(financialValues),
    financialP20: nearestRankPercentile(financialValues, 20),
    financialWorstObserved: Math.min(...financialValues),
    operationDays,
  };
}

function compareEvaluations(a: OrderEvaluation, b: OrderEvaluation): number {
  return compareCandidateRanking(
    { ...a, key: a.candidate.key },
    { ...b, key: b.candidate.key },
  );
}

export function buildPlan(input: FarmOperationInput, dataset: HistoricalDataset): PlanResult {
  if (dataset.records.length !== 41) {
    throw new Error("o planejador exige exatamente 41 safras históricas");
  }
  const validInput = FarmOperationInputSchema.parse(input);
  const validDataset = HistoricalDatasetSchema.parse(dataset);

  const evaluations = generateCandidates(validInput).map((candidate) =>
    evaluateOrder(validInput, validDataset, candidate),
  );
  const baseline = evaluations.find((evaluation) => evaluation.candidate.baseline)!;
  const winner = [...evaluations].sort(compareEvaluations)[0];

  return PlanResultSchema.parse({
    inputHash: hashObject(validInput),
    datasetHash: hashObject(validDataset),
    dataset: {
      source: validDataset.source,
      seasons: validDataset.seasons,
      cached: validDataset.cached,
      real: validDataset.real,
    },
    assumptions: [
      `foram avaliados ${evaluations.length} candidatos válidos pelo ranking determinístico`,
      "o limite operacional de fim das águas é uma premissa declarada do protótipo, sem validação agronômica",
      "o ciclo do milho usa o padrão configurado no perfil da cultura, não uma cultivar específica por talhão",
      "o resultado financeiro usa somente margens e custos informados; não representa garantia de lucro",
    ],
    candidatesEvaluated: evaluations.length,
    recommendedCandidateKey: winner.candidate.key,
    rankingCriteria: RANKING_CRITERIA,
    baseline: {
      candidateKey: baseline.candidate.key,
      sequence: publicSequence(baseline),
      historicalOutcomes: baseline.historicalOutcomes,
      metrics: evidenceMetrics(baseline),
    },
    sequence: publicSequence(winner),
    historicalOutcomes: winner.historicalOutcomes,
    metrics: {
      ...evidenceMetrics(winner),
      differenceFromBaselineP20: winner.financialP20 - baseline.financialP20,
    },
  });
}
