import { NextRequest, NextResponse } from "next/server";
import { fetchWeatherForecast } from "@/data/weather";

export async function GET(request: NextRequest) {
  const latitude = Number(request.nextUrl.searchParams.get("latitude"));
  const longitude = Number(request.nextUrl.searchParams.get("longitude"));

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
