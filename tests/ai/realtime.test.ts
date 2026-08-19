import { describe, expect, it, vi } from "vitest";
import { canonicalFarmOperationInput, malformedOperationToolArguments } from "../../data/fixtures/contracts";
import { ConfirmationGuard } from "@/lib/confirmation";
import {
  RealtimeConfigurationError,
  RealtimeSessionError,
  buildRealtimeSessionConfig,
  mintRealtimeClientSecret,
  validateConfirmedOperationToolCall,
  type RealtimeSecretRequester,
} from "@/lib/realtime";

describe("Realtime session boundary", () => {
  it("mints a narrowly configured ephemeral secret without returning the project key", async () => {
    const requester = vi.fn<RealtimeSecretRequester>().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ value: "ek_demo_short_lived", expires_at: 1_800_000_000 }),
    });

    const result = await mintRealtimeClientSecret(
      { sessionId: "demo-session" },
      { apiKey: "sk-project-secret", model: "gpt-realtime-test", requester },
    );

    expect(result).toEqual({
      clientSecret: "ek_demo_short_lived",
      expiresAt: 1_800_000_000,
      model: "gpt-realtime-test",
    });
    expect(JSON.stringify(result)).not.toContain("sk-project-secret");

    const [url, init] = requester.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/realtime/client_secrets");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer sk-project-secret",
      "Content-Type": "application/json",
    });
    expect((init.headers as Record<string, string>)["OpenAI-Safety-Identifier"]).toMatch(/^[a-f0-9]{64}$/);

    const body = JSON.parse(String(init.body));
    expect(body.session).toMatchObject({
      type: "realtime",
      model: "gpt-realtime-test",
      audio: { output: { voice: "marin" } },
      tool_choice: "auto",
    });
    expect(body.session.tools).toHaveLength(1);
    expect(body.session.tools[0].name).toBe("confirm_operation_and_calculate");
  });

  it("uses concise Portuguese guardrails for the voice agent", () => {
    const config = buildRealtimeSessionConfig("gpt-realtime-test");
    expect(config.instructions).toContain("portugues brasileiro");
    expect(config.instructions).toContain("confirmacao explicita");
    expect(config.instructions).toContain("Nao calcule");
  });

  it("rejects malformed session requests before calling OpenAI", async () => {
    const requester = vi.fn<RealtimeSecretRequester>();
    await expect(
      mintRealtimeClientSecret({ sessionId: "" }, { apiKey: "sk-test", requester }),
    ).rejects.toThrow();
    expect(requester).not.toHaveBeenCalled();
  });

  it("fails closed when the server key is absent", async () => {
    await expect(
      mintRealtimeClientSecret({ sessionId: "demo" }, { apiKey: "" }),
    ).rejects.toBeInstanceOf(RealtimeConfigurationError);
  });

  it("does not forward provider error bodies", async () => {
    const requester = vi.fn<RealtimeSecretRequester>().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: { message: "sensitive provider detail" } }),
    });

    await expect(
      mintRealtimeClientSecret({ sessionId: "demo" }, { apiKey: "sk-test", requester }),
    ).rejects.toEqual(new RealtimeSessionError("OpenAI Realtime client secret request failed (429)"));
  });

  it("validates untrusted tool arguments and consumes the current confirmation token", () => {
    const guard = new ConfirmationGuard({
      now: () => Date.parse("2026-08-19T15:00:00.000Z"),
      tokenFactory: () => "voice-token",
    });
    const challenge = guard.request({
      sessionId: "voice-session",
      subject: "operation",
      draftVersion: "operation-v1",
    });

    const confirmed = validateConfirmedOperationToolCall(
      {
        sessionId: "voice-session",
        draftVersion: "operation-v1",
        confirmationToken: challenge.confirmationToken,
        affirmative: true,
        operation: canonicalFarmOperationInput,
      },
      guard,
    );

    expect(confirmed.confirmation.method).toBe("voice");
    expect(confirmed.operation.totalAreaHa).toBe(200);
    expect(() =>
      validateConfirmedOperationToolCall(
        {
          sessionId: "voice-session",
          draftVersion: "operation-v1",
          confirmationToken: challenge.confirmationToken,
          affirmative: true,
          operation: canonicalFarmOperationInput,
        },
        guard,
      ),
    ).toThrowError(expect.objectContaining({ code: "TOKEN_NOT_FOUND" }));
  });

  it("rejects malformed Realtime tool arguments before confirmation or calculation", () => {
    const guard = new ConfirmationGuard();
    expect(() => validateConfirmedOperationToolCall(malformedOperationToolArguments, guard)).toThrow();
  });
});
