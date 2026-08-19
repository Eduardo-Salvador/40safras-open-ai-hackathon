const COMBINING_DIACRITICS = /[̀-ͯ]/g;

/** Lowercase, strip diacritics, collapse whitespace — for fuzzy name matching only. */
export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}
