import type { Municipality } from "@/domain/schemas";
import { normalizeName } from "./normalize";
import { STATE_NAME_TO_UF } from "./state-codes";

export class GeocodingError extends Error {}
export class MunicipalityAmbiguityError extends GeocodingError {}

type OpenMeteoGeocodingResult = {
  name: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  timezone?: string;
  country_code?: string;
  admin1?: string;
};

type IbgeMunicipio = { id: number; nome: string };

type FetchFn = typeof fetch;

async function fetchOpenMeteoCandidates(query: string, fetchImpl: FetchFn): Promise<OpenMeteoGeocodingResult[]> {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", query);
  url.searchParams.set("count", "5");
  url.searchParams.set("language", "pt");
  url.searchParams.set("format", "json");
  // Open-Meteo uses camelCase for this query parameter. Keeping it here makes
  // the country restriction server-side rather than relying on a client filter.
  url.searchParams.set("countryCode", "BR");

  const res = await fetchImpl(url.toString(), { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) {
    const kind = res.status === 429 ? "rate limited" : `failed: ${res.status}`;
    throw new GeocodingError(`Open-Meteo geocoding request ${kind}`);
  }
  const body = (await res.json()) as { results?: OpenMeteoGeocodingResult[] };
  return body.results ?? [];
}

async function fetchIbgeMunicipiosByState(uf: string, fetchImpl: FetchFn): Promise<IbgeMunicipio[]> {
  const url = `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`;
  const res = await fetchImpl(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) {
    throw new GeocodingError(`IBGE localidades request failed: ${res.status}`);
  }
  return (await res.json()) as IbgeMunicipio[];
}

function resolveStateCode(admin1: string | undefined): string | undefined {
  if (!admin1) return undefined;
  return STATE_NAME_TO_UF[normalizeName(admin1)];
}

function municipalityNameFromQuery(query: string): string {
  const beforeComma = query.split(",", 1)[0];
  const normalized = normalizeName(beforeComma);
  if (query.includes(",")) return normalized;

  const parts = normalized.split(/\s+/);
  const stateCodes = new Set(Object.values(STATE_NAME_TO_UF).map(normalizeName));
  if (parts.length > 1 && stateCodes.has(parts.at(-1)!)) parts.pop();
  return parts.join(" ");
}

/**
 * Resolves a free-text query to a canonical Brazilian municipality: name,
 * UF, coordinates (Open-Meteo Geocoding) cross-referenced against the
 * official IBGE municipality code (IBGE Localidades). Both sources are
 * public and require no API key.
 */
export async function geocodeMunicipality(query: string, fetchImpl: FetchFn = fetch): Promise<Municipality> {
  let candidates: OpenMeteoGeocodingResult[];
  try {
    candidates = await fetchOpenMeteoCandidates(query, fetchImpl);
  } catch (error) {
    if (error instanceof GeocodingError) throw error;
    throw new GeocodingError(`Open-Meteo geocoding request failed: ${error instanceof Error ? error.message : "unknown error"}`);
  }
  const brazilianCandidates = candidates.filter((candidate) => candidate.country_code === "BR");
  if (brazilianCandidates.length === 0) {
    throw new GeocodingError(`no municipality found for "${query}"`);
  }

  const requestedName = municipalityNameFromQuery(query);
  const exactCandidates = brazilianCandidates.filter(
    (candidate) => normalizeName(candidate.name) === requestedName,
  );
  const eligibleCandidates = exactCandidates.length > 0 ? exactCandidates : brazilianCandidates;
  const uniqueCandidates = new Map(
    eligibleCandidates.map((candidate) => [`${normalizeName(candidate.name)}:${candidate.admin1 ?? ""}`, candidate]),
  );
  if (uniqueCandidates.size !== 1) {
    throw new MunicipalityAmbiguityError(`multiple Brazilian municipalities match "${query}"; include the UF`);
  }
  const best = [...uniqueCandidates.values()][0];

  const state = resolveStateCode(best.admin1);
  if (!state) {
    throw new GeocodingError(`could not resolve a Brazilian state for "${query}" (admin1="${best.admin1}")`);
  }

  let municipios: IbgeMunicipio[];
  try {
    municipios = await fetchIbgeMunicipiosByState(state, fetchImpl);
  } catch (error) {
    if (error instanceof GeocodingError) throw error;
    throw new GeocodingError(`IBGE localidades request failed: ${error instanceof Error ? error.message : "unknown error"}`);
  }
  const target = normalizeName(best.name);
  const match =
    municipios.find((m) => normalizeName(m.nome) === target) ??
    municipios.find((m) => normalizeName(m.nome).includes(target) || target.includes(normalizeName(m.nome)));

  return {
    name: match?.nome ?? best.name,
    state,
    countryCode: "BR",
    latitude: best.latitude,
    longitude: best.longitude,
    elevationM: best.elevation,
    timezone: best.timezone ?? "America/Sao_Paulo",
    ibgeCode: match ? String(match.id) : undefined,
  };
}
