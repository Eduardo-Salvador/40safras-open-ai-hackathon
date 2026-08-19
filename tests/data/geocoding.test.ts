import { describe, expect, it } from "vitest";
import { GeocodingError, geocodeMunicipality } from "@/data/geocoding";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

function mockFetch(handlers: { openMeteo?: unknown; ibge?: unknown[] }): typeof fetch {
  return (async (input: string | URL) => {
    const url = String(input);
    if (url.includes("geocoding-api.open-meteo.com")) {
      return jsonResponse({ results: handlers.openMeteo ?? [] });
    }
    if (url.includes("servicodados.ibge.gov.br")) {
      return jsonResponse(handlers.ibge ?? []);
    }
    throw new Error(`unexpected fetch to ${url}`);
  }) as unknown as typeof fetch;
}

describe("geocodeMunicipality", () => {
  it("resolves name, UF, coordinates, and the IBGE code from both public sources", async () => {
    const fetchImpl = mockFetch({
      openMeteo: [
        {
          name: "Sorriso",
          latitude: -12.5453,
          longitude: -55.7217,
          elevation: 380,
          timezone: "America/Cuiaba",
          country_code: "BR",
          admin1: "Mato Grosso",
        },
      ],
      ibge: [
        { id: 5107925, nome: "Sorriso" },
        { id: 5103403, nome: "Cuiabá" },
      ],
    });

    const municipality = await geocodeMunicipality("Sorriso", fetchImpl);

    expect(municipality).toEqual({
      name: "Sorriso",
      state: "MT",
      countryCode: "BR",
      latitude: -12.5453,
      longitude: -55.7217,
      elevationM: 380,
      timezone: "America/Cuiaba",
      ibgeCode: "5107925",
    });
  });

  it("throws when no Brazilian candidate is found", async () => {
    const fetchImpl = mockFetch({ openMeteo: [] });
    await expect(geocodeMunicipality("Cidade Inexistente", fetchImpl)).rejects.toThrow(GeocodingError);
  });

  it("throws when the state name cannot be resolved to a UF", async () => {
    const fetchImpl = mockFetch({
      openMeteo: [
        {
          name: "Somewhere",
          latitude: 0,
          longitude: 0,
          country_code: "BR",
          admin1: "Not A Real State",
        },
      ],
    });
    await expect(geocodeMunicipality("Somewhere", fetchImpl)).rejects.toThrow(GeocodingError);
  });
});
