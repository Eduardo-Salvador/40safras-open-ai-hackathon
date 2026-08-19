import { describe, expect, it } from "vitest";
import { centsToReais, seasonFinancialResultCents } from "@/domain/finance";

describe("cálculo financeiro determinístico", () => {
  it("converte premissas para centavos antes da aritmética", () => {
    const cents = seasonFinancialResultCents(
      { soybeanMarginPerHa: 1.005, cornMarginPerHa: 0, operatingCostPerDay: 0.335 },
      1,
      0,
      1,
    );

    expect(cents).toBe(67);
    expect(centsToReais(cents)).toBe(0.67);
  });

  it("produz exatamente o mesmo resultado para as mesmas premissas", () => {
    const finance = { soybeanMarginPerHa: 1_234.56, cornMarginPerHa: 789.01, operatingCostPerDay: 12.34 };
    const first = seasonFinancialResultCents(finance, 123.45, 67.89, 210);
    const second = seasonFinancialResultCents(finance, 123.45, 67.89, 210);
    expect(second).toBe(first);
    expect(Number.isInteger(first)).toBe(true);
  });
});
