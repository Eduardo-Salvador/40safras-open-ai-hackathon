import type { FarmOperationInput } from "./schemas";

/** Currency math happens in integer cents; callers convert back to reais. */
function toCents(reais: number): number {
  return Math.round(reais * 100);
}

export function centsToReais(cents: number): number {
  return Math.round(cents) / 100;
}

export function seasonFinancialResultCents(
  finance: FarmOperationInput["finance"],
  totalAreaHa: number,
  secondCropViableAreaHa: number,
  operationDays: number,
): number {
  const soyMarginCents = toCents(finance.soybeanMarginPerHa);
  const cornMarginCents = toCents(finance.cornMarginPerHa);
  const opCostCents = finance.operatingCostPerDay ? toCents(finance.operatingCostPerDay) : 0;

  const revenueCents = soyMarginCents * totalAreaHa + cornMarginCents * secondCropViableAreaHa;
  const costCents = opCostCents * operationDays;

  return Math.round(revenueCents - costCents);
}
