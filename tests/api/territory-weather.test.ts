import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET as searchTerritory } from "@/app/api/territory-search/route";
import { GET as getWeather } from "@/app/api/weather/route";

afterEach(() => vi.unstubAllGlobals());

describe("territory and weather API contracts", () => {
  it("normalizes Nominatim search results", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify([
            {
              place_id: 123,
              display_name: "Sorriso, Mato Grosso, Brasil",
              name: "Sorriso",
              lat: "-12.5453",
              lon: "-55.7217",
              boundingbox: ["-12.7", "-12.4", "-55.9", "-55.5"],
              type: "administrative",
            },
          ]),
          { status: 200 },
        ),
      ),
    );

    const response = await searchTerritory(
      new NextRequest("http://localhost/api/territory-search?q=Sorriso%20MT"),
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.source).toBe("OpenStreetMap Nominatim");
    expect(body.results[0]).toMatchObject({
      id: "123",
      name: "Sorriso",
      latitude: -12.5453,
      longitude: -55.7217,
    });
  });

  it("rejects incomplete territory and weather queries", async () => {
    expect(
      (await searchTerritory(new NextRequest("http://localhost/api/territory-search?q=S"))).status,
    ).toBe(400);
    expect((await getWeather(new NextRequest("http://localhost/api/weather"))).status).toBe(400);
  });

  it("returns the normalized forecast contract", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            latitude: -12.54,
            longitude: -55.71,
            timezone: "America/Cuiaba",
            daily: {
              time: ["2026-08-20"],
              weather_code: [80],
              temperature_2m_min: [18],
              temperature_2m_max: [31],
              precipitation_sum: [7],
              precipitation_probability_max: [62],
              et0_fao_evapotranspiration: [4.2],
              wind_gusts_10m_max: [33],
            },
          }),
          { status: 200 },
        ),
      ),
    );

    const response = await getWeather(
      new NextRequest("http://localhost/api/weather?latitude=-12.54&longitude=-55.71"),
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      source: "Open-Meteo Forecast API (Best Match)",
      location: { latitude: -12.54, longitude: -55.71, timezone: "America/Cuiaba" },
    });
    expect(body.days).toHaveLength(1);
  });
});
