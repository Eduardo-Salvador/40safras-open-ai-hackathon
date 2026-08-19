import { describe, expect, it } from "vitest";
import { buildTelegramShareUrl, buildWebSharePayload } from "@/lib/sharing";

describe("credential-free sharing", () => {
  it("encodes Telegram text and result URL", () => {
    const url = new URL(buildTelegramShareUrl("Plano: T-01 → T-02", "https://example.test/r?id=á"));
    expect(url.origin).toBe("https://t.me");
    expect(url.searchParams.get("text")).toBe("Plano: T-01 → T-02");
    expect(url.searchParams.get("url")).toBe("https://example.test/r?id=á");
  });

  it("builds a deterministic Web Share payload", () => {
    expect(buildWebSharePayload("resultado", "https://example.test")).toEqual({
      title: "Quarenta Safras",
      text: "resultado",
      url: "https://example.test",
    });
  });
});
