export type CandidateRanking = {
  key: string;
  secondCropAreaP20Ha: number;
  targetReachedSeasons: number;
  viableSeasons: number;
  financialP20: number;
  operationDays: number;
};

function compareCanonicalKey(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Comparador lexicográfico congelado pelo plano de execução. */
export function compareCandidateRanking(a: CandidateRanking, b: CandidateRanking): number {
  return (
    b.secondCropAreaP20Ha - a.secondCropAreaP20Ha ||
    b.targetReachedSeasons - a.targetReachedSeasons ||
    b.viableSeasons - a.viableSeasons ||
    b.financialP20 - a.financialP20 ||
    a.operationDays - b.operationDays ||
    compareCanonicalKey(a.key, b.key)
  );
}
