import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/realtime-session/route";

afterEach(() => vi.unstubAllEnvs());

describe("POST /api/realtime-session", () => {
  it("does not expose or require a permanent key in the offline path", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const response = await POST();
    const body = (await response.json()) as { error: string };
    expect(response.status).toBe(503);
    expect(body.error).toContain("use texto ou formulário");
    expect(JSON.stringify(body)).not.toContain("sk-");
  });
});
