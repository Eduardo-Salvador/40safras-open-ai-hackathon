import { describe, expect, it, vi } from "vitest";
import {
  describeWeatherCode,
  deriveWeatherSignals,
  fetchWeatherForecast,
  type ForecastDay,
} from "@/data/weather";

const day = (overrides: Partial<ForecastDay> = {}): ForecastDay => ({
  date: "2026-08-20",
  weatherCode: 1,
  temperatureMinC: 20,
  temperatureMaxC: 30,
  precipitationMm: 2,
  precipitationProbabilityPct: 20,
  et0Mm: 4,
  windGustKmh: 25,
  ...overrides,
});

describe("weather forecast normalization", () => {
  it("derives deterministic rain, heat and wind signals", () => {
    const signals = deriveWeatherSignals([
      day({ precipitationMm: 35, precipitationProbabilityPct: 90 }),
      day({ date: "2026-08-21", temperatureMaxC: 36 }),
      day({ date: "2026-08-22", windGustKmh: 55 }),
    ]);
    expect(signals.map((signal) => signal.code)).toEqual(["heavy_rain", "heat", "wind"]);
  });

  it("identifies a low-rain three-day window", () => {
    const signals = deriveWeatherSignals([
      day({ precipitationMm: 0, precipitationProbabilityPct: 10 }),
      day({ date: "2026-08-21", precipitationMm: 1, precipitationProbabilityPct: 20 }),
      day({ date: "2026-08-22", precipitationMm: 2, precipitationProbabilityPct: 30 }),
    ]);
    expect(signals).toContainEqual(
      expect.objectContaining({ code: "dry_window", severity: "favorable" }),
    );
  });

  it("normalizes a seven-day Open-Meteo payload", async () => {
    const fetchMock = vi.fn(async () =>
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
    );

    const result = await fetchWeatherForecast(-12.54, -55.71, fetchMock as typeof fetch);
    expect(result.location.timezone).toBe("America/Cuiaba");
    expect(result.days[0]).toEqual(
      expect.objectContaining({
        weatherCode: 80,
        precipitationMm: 7,
        precipitationProbabilityPct: 62,
        et0Mm: 4.2,
      }),
    );
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("translates WMO codes into readable conditions", () => {
    expect(describeWeatherCode(0)).toEqual({ icon: "☀️", label: "Céu limpo" });
    expect(describeWeatherCode(63).label).toBe("Chuva");
    expect(describeWeatherCode(95).label).toBe("Temporal");
    expect(describeWeatherCode(null).label).toBe("Sem condição");
  });

  it("rejects invalid coordinates and payloads", async () => {
    await expect(fetchWeatherForecast(91, 0)).rejects.toThrow("invalid latitude");
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ invalid: true }), { status: 200 }),
    );
    await expect(fetchWeatherForecast(0, 0, fetchMock as typeof fetch)).rejects.toThrow(
      "invalid forecast payload",
    );
  });
});
