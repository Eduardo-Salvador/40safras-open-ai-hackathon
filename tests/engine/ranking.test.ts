import { describe, expect, it } from "vitest";
import { compareCandidateRanking, type CandidateRanking } from "@/domain/ranking";

const base: CandidateRanking = {
  key: "B@100",
  secondCropAreaP20Ha: 100,
  targetReachedSeasons: 30,
  viableSeasons: 35,
  financialP20: 50_000,
  operationDays: 200,
};

describe("ranking de candidatos", () => {
  it.each([
    ["área P20", { secondCropAreaP20Ha: 101 }],
    ["safras que atingem a meta", { targetReachedSeasons: 31 }],
    ["safras viáveis", { viableSeasons: 36 }],
    ["financeiro P20", { financialP20: 50_001 }],
    ["término mais cedo", { operationDays: 199 }],
    ["chave canônica", { key: "A@100" }],
  ])("aplica o critério %s quando os anteriores empatam", (_label, improvement) => {
    const better = { ...base, ...improvement };
    expect([base, better].sort(compareCandidateRanking)[0]).toEqual(better);
  });

  it("não altera a ordem quando todos os critérios empatam", () => {
    expect(compareCandidateRanking(base, { ...base })).toBe(0);
  });
});
