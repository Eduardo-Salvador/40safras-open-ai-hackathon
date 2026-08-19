/** All arithmetic is done in UTC epoch-days to avoid DST/timezone drift. */

function toEpochDay(isoDate: string): number {
  return Date.UTC(
    Number(isoDate.slice(0, 4)),
    Number(isoDate.slice(5, 7)) - 1,
    Number(isoDate.slice(8, 10)),
  ) / 86_400_000;
}

function fromEpochDay(epochDay: number): string {
  return new Date(epochDay * 86_400_000).toISOString().slice(0, 10);
}

export function addDays(isoDate: string, days: number): string {
  return fromEpochDay(toEpochDay(isoDate) + days);
}

export function daysBetween(fromIsoDate: string, toIsoDate: string): number {
  return toEpochDay(toIsoDate) - toEpochDay(fromIsoDate);
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
