import { NextRequest, NextResponse } from "next/server";
import { climateCacheKey, getCachedClimate, getPreparedClimateFixture, setCachedClimate } from "@/data/cache";
import { ClimateFetchError, fetchHistoricalSeasons } from "@/data/climate";
import { MunicipalitySchema } from "@/domain/schemas";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = MunicipalitySchema.safeParse(body?.municipality);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid or missing 'municipality' in request body" }, { status: 400 });
  }
  const municipality = parsed.data;

  const key = climateCacheKey(municipality);
  const cached = getCachedClimate(key);
  if (cached) {
    return NextResponse.json({ dataset: cached });
  }

  try {
    const dataset = await fetchHistoricalSeasons(municipality);
    setCachedClimate(key, dataset);
    return NextResponse.json({ dataset: { ...dataset, cached: false } });
  } catch (err) {
    const fixture = getPreparedClimateFixture(municipality);
    if (fixture) {
      return NextResponse.json({ dataset: fixture, fallback: true });
    }
    const message = err instanceof ClimateFetchError ? err.message : "climate fetch failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
