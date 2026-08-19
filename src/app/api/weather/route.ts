import { NextRequest, NextResponse } from "next/server";
import { fetchWeatherForecast } from "@/data/weather";

export async function GET(request: NextRequest) {
  const rawLatitude = request.nextUrl.searchParams.get("latitude");
  const rawLongitude = request.nextUrl.searchParams.get("longitude");
  const latitude = rawLatitude === null ? Number.NaN : Number(rawLatitude);
  const longitude = rawLongitude === null ? Number.NaN : Number(rawLongitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json({ error: "latitude and longitude are required" }, { status: 400 });
  }

  try {
    return NextResponse.json(await fetchWeatherForecast(latitude, longitude));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "weather forecast failed" },
      { status: 502 },
    );
  }
}
