import { NextRequest, NextResponse } from "next/server";
import { GeocodingError, geocodeMunicipality } from "@/data/geocoding";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q || !q.trim()) {
    return NextResponse.json({ error: "missing required query param 'q'" }, { status: 400 });
  }

  try {
    const municipality = await geocodeMunicipality(q.trim());
    return NextResponse.json({ municipality });
  } catch (err) {
    const message = err instanceof GeocodingError ? err.message : "geocoding failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
