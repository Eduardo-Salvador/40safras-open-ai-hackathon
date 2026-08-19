import { z } from "zod";

const ForecastResponseSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  timezone: z.string(),
  daily: z.object({
    time: z.array(z.string()),
    temperature_2m_min: z.array(z.number().nullable()),
    temperature_2m_max: z.array(z.number().nullable()),
    precipitation_sum: z.array(z.number().nullable()),
    precipitation_probability_max: z.array(z.number().nullable()),
    et0_fao_evapotranspiration: z.array(z.number().nullable()),
    wind_gusts_10m_max: z.array(z.number().nullable()),
  }),
});

export type ForecastDay = {
  date: string;
  temperatureMinC: number | null;
  temperatureMaxC: number | null;
  precipitationMm: number | null;
  precipitationProbabilityPct: number | null;
  et0Mm: number | null;
  windGustKmh: number | null;
};

export type WeatherSignal = {
  code: "heavy_rain" | "dry_window" | "heat" | "wind" | "no_alert";
  severity: "attention" | "favorable" | "neutral";
  title: string;
  detail: string;
};

export type WeatherForecast = {
  location: { latitude: number; longitude: number; timezone: string };
  source: "Open-Meteo forecast";
  days: ForecastDay[];
  signals: WeatherSignal[];
  disclaimer: string;
};

const valueAt = (values: Array<number | null>, index: number) => values[index] ?? null;

export function deriveWeatherSignals(days: ForecastDay[]): WeatherSignal[] {
  const signals: WeatherSignal[] = [];
  const nextThree = days.slice(0, 3);
  const heavyRainDay = days.find(
    (day) =>
      (day.precipitationMm ?? 0) >= 30 ||
      ((day.precipitationMm ?? 0) >= 15 && (day.precipitationProbabilityPct ?? 0) >= 80),
  );
  if (heavyRainDay) {
    signals.push({
      code: "heavy_rain",
      severity: "attention",
      title: "Chuva relevante no horizonte",
      detail: `${heavyRainDay.date}: ${heavyRainDay.precipitationMm ?? 0} mm previstos, com ${heavyRainDay.precipitationProbabilityPct ?? 0}% de probabilidade.`,
    });
  }

  const threeDayRain = nextThree.reduce((sum, day) => sum + (day.precipitationMm ?? 0), 0);
  const maxThreeDayProbability = Math.max(0, ...nextThree.map((day) => day.precipitationProbabilityPct ?? 0));
  if (nextThree.length === 3 && threeDayRain < 5 && maxThreeDayProbability < 50) {
    signals.push({
      code: "dry_window",
      severity: "favorable",
      title: "Janela com baixa chuva prevista",
      detail: `${threeDayRain.toFixed(1)} mm acumulados nos próximos três dias e probabilidade máxima de ${maxThreeDayProbability}%.`,
    });
  }

  const heatDay = days.find((day) => (day.temperatureMaxC ?? -Infinity) >= 35);
  if (heatDay) {
    signals.push({
      code: "heat",
      severity: "attention",
      title: "Calor elevado previsto",
      detail: `${heatDay.date}: máxima prevista de ${heatDay.temperatureMaxC} °C.`,
    });
  }

  const windDay = days.find((day) => (day.windGustKmh ?? 0) >= 50);
  if (windDay) {
    signals.push({
      code: "wind",
      severity: "attention",
      title: "Rajadas fortes previstas",
      detail: `${windDay.date}: rajadas de até ${windDay.windGustKmh} km/h.`,
    });
  }

  return signals.length
    ? signals
    : [
        {
          code: "no_alert",
          severity: "neutral",
          title: "Sem sinal operacional simples",
          detail: "Os limiares determinísticos do protótipo não identificaram chuva intensa, calor ou vento fortes.",
        },
      ];
}

export async function fetchWeatherForecast(
  latitude: number,
  longitude: number,
  fetchImpl: typeof fetch = fetch,
): Promise<WeatherForecast> {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) throw new Error("invalid latitude");
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new Error("invalid longitude");

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", latitude.toFixed(6));
  url.searchParams.set("longitude", longitude.toFixed(6));
  url.searchParams.set(
    "daily",
    [
      "temperature_2m_min",
      "temperature_2m_max",
      "precipitation_sum",
      "precipitation_probability_max",
      "et0_fao_evapotranspiration",
      "wind_gusts_10m_max",
    ].join(","),
  );
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "7");

  const response = await fetchImpl(url.toString());
  if (!response.ok) throw new Error(`Open-Meteo forecast request failed: ${response.status}`);
  const parsed = ForecastResponseSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error("Open-Meteo returned an invalid forecast payload");

  const body = parsed.data;
  const days = body.daily.time.map<ForecastDay>((date, index) => ({
    date,
    temperatureMinC: valueAt(body.daily.temperature_2m_min, index),
    temperatureMaxC: valueAt(body.daily.temperature_2m_max, index),
    precipitationMm: valueAt(body.daily.precipitation_sum, index),
    precipitationProbabilityPct: valueAt(body.daily.precipitation_probability_max, index),
    et0Mm: valueAt(body.daily.et0_fao_evapotranspiration, index),
    windGustKmh: valueAt(body.daily.wind_gusts_10m_max, index),
  }));

  return {
    location: { latitude: body.latitude, longitude: body.longitude, timezone: body.timezone },
    source: "Open-Meteo forecast",
    days,
    signals: deriveWeatherSignals(days),
    disclaimer: "Apoio operacional de protótipo. Não substitui previsão local, agrônomo ou ZARC.",
  };
}
