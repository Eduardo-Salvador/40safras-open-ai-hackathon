import type { Municipality } from "@/domain/schemas";
import { normalizeName } from "./normalize";
import { STATE_NAME_TO_UF } from "./state-codes";

export class GeocodingError extends Error {}

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
  url.searchParams.set("country_code", "BR");

  const res = await fetchImpl(url.toString());
  if (!res.ok) {
    throw new GeocodingError(`Open-Meteo geocoding request failed: ${res.status}`);
  }
  const body = (await res.json()) as { results?: OpenMeteoGeocodingResult[] };
  return body.results ?? [];
}

async function fetchIbgeMunicipiosByState(uf: string, fetchImpl: FetchFn): Promise<IbgeMunicipio[]> {
  const url = `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`;
  const res = await fetchImpl(url);
  if (!res.ok) {
    throw new GeocodingError(`IBGE localidades request failed: ${res.status}`);
  }
  return (await res.json()) as IbgeMunicipio[];
}

function resolveStateCode(admin1: string | undefined): string | undefined {
  if (!admin1) return undefined;
  return STATE_NAME_TO_UF[normalizeName(admin1)];
}

/**
 * Resolves a free-text query to a canonical Brazilian municipality: name,
 * UF, coordinates (Open-Meteo Geocoding) cross-referenced against the
 * official IBGE municipality code (IBGE Localidades). Both sources are
 * public and require no API key.
 */
export async function geocodeMunicipality(query: string, fetchImpl: FetchFn = fetch): Promise<Municipality> {
  const candidates = await fetchOpenMeteoCandidates(query, fetchImpl);
  const best = candidates.find((c) => c.country_code === "BR") ?? candidates[0];
  if (!best) {
    throw new GeocodingError(`no municipality found for "${query}"`);
  }

  const state = resolveStateCode(best.admin1);
  if (!state) {
    throw new GeocodingError(`could not resolve a Brazilian state for "${query}" (admin1="${best.admin1}")`);
  }

  const municipios = await fetchIbgeMunicipiosByState(state, fetchImpl);
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
