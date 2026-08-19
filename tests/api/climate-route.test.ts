import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/climate/route";
import { rioVerdeGo } from "../../data/fixtures/municipalities/rio-verde-go";

afterEach(() => vi.unstubAllGlobals());

describe("POST /api/climate", () => {
  it("returns a labeled prepared dataset when live climate retrieval fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("unavailable", { status: 503 })));
    const request = new NextRequest("http://localhost/api/climate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ municipality: rioVerdeGo }),
    });

    const response = await POST(request);
    const body = (await response.json()) as { fallback: boolean; dataset: { source: string; records: unknown[] } };

    expect(response.status).toBe(200);
    expect(body.fallback).toBe(true);
    expect(body.dataset.source).toContain("ERA5");
    expect(body.dataset.records).toHaveLength(41);
  });
});
