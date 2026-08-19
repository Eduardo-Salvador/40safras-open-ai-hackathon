import { NextRequest, NextResponse } from "next/server";

type NominatimResult = {
  place_id: number;
  display_name: string;
  name?: string;
  lat: string;
  lon: string;
  boundingbox?: [string, string, string, string];
  type?: string;
};

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query || query.length < 2) {
    return NextResponse.json({ error: "query must have at least 2 characters" }, { status: 400 });
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "6");
  url.searchParams.set("accept-language", "pt-BR");
  url.searchParams.set("addressdetails", "1");

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent":
          "QuarentaSafrasHackathon/0.1 (https://github.com/Eduardo-Salvador/40safras-open-ai-hackathon)",
      },
      next: { revalidate: 86_400 },
    });
    if (!response.ok) throw new Error(`geocoding request failed: ${response.status}`);
    const body = (await response.json()) as NominatimResult[];
    return NextResponse.json({
      results: body.map((item) => ({
        id: String(item.place_id),
        name: item.name ?? item.display_name.split(",")[0],
        displayName: item.display_name,
        latitude: Number(item.lat),
        longitude: Number(item.lon),
        boundingBox: item.boundingbox?.map(Number),
        type: item.type ?? "place",
      })),
      source: "OpenStreetMap Nominatim",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "territory search failed" },
      { status: 502 },
    );
  }
}
