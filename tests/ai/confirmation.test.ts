import { describe, expect, it } from "vitest";
import { ConfirmationGuard } from "@/lib/confirmation";

function createHarness() {
  let now = Date.parse("2026-08-19T15:00:00.000Z");
  const guard = new ConfirmationGuard({
    now: () => now,
    tokenFactory: () => "test-token",
    ttlMs: 60_000,
  });
  return { guard, advance: (milliseconds: number) => (now += milliseconds) };
}

describe("ConfirmationGuard", () => {
  it("confirms the same draft version after an explicit affirmative response", () => {
    const { guard, advance } = createHarness();
    const challenge = guard.request({
      sessionId: "session-1",
      subject: "operation",
      draftVersion: "operation-v1",
    });
    advance(1_000);

    const confirmation = guard.confirm({
      sessionId: "session-1",
      subject: "operation",
      draftVersion: "operation-v1",
      confirmationToken: challenge.confirmationToken,
      method: "voice",
      affirmative: true,
    });

    expect(confirmation.method).toBe("voice");
    expect(confirmation.confirmedAt).toBe("2026-08-19T15:00:01.000Z");
  });

  it("rejects a stale draft version", () => {
    const { guard } = createHarness();
    const challenge = guard.request({
      sessionId: "session-1",
      subject: "operation",
      draftVersion: "operation-v1",
    });

    expect(() =>
      guard.confirm({
        sessionId: "session-1",
        subject: "operation",
        draftVersion: "operation-v2",
        confirmationToken: challenge.confirmationToken,
        method: "button",
        affirmative: true,
      }),
    ).toThrowError(expect.objectContaining({ code: "STALE_DRAFT" }));
  });

  it("rejects a negative response", () => {
    const { guard } = createHarness();
    const challenge = guard.request({
      sessionId: "session-1",
      subject: "field_event",
      draftVersion: "event-v1",
    });

    expect(() =>
      guard.confirm({
        sessionId: "session-1",
        subject: "field_event",
        draftVersion: "event-v1",
        confirmationToken: challenge.confirmationToken,
        method: "voice",
        affirmative: false,
      }),
    ).toThrowError(expect.objectContaining({ code: "NEGATIVE_CONFIRMATION" }));
  });

  it("rejects an expired token", () => {
    const { guard, advance } = createHarness();
    const challenge = guard.request({
      sessionId: "session-1",
      subject: "operation",
      draftVersion: "operation-v1",
    });
    advance(60_001);

    expect(() =>
      guard.confirm({
        sessionId: "session-1",
        subject: "operation",
        draftVersion: "operation-v1",
        confirmationToken: challenge.confirmationToken,
        method: "voice",
        affirmative: true,
      }),
    ).toThrowError(expect.objectContaining({ code: "TOKEN_EXPIRED" }));
  });

  it("rejects untrusted malformed tool arguments", () => {
    const { guard } = createHarness();
    expect(() => guard.confirm({ affirmative: "sim", draftVersion: null })).toThrowError(
      expect.objectContaining({ code: "INVALID_ARGUMENTS" }),
    );
  });

  it("invalidates an earlier challenge when a new version is summarized", () => {
    let tokenSequence = 0;
    const guard = new ConfirmationGuard({
      now: () => Date.parse("2026-08-19T15:00:00.000Z"),
      tokenFactory: () => `test-token-${++tokenSequence}`,
    });
    const first = guard.request({
      sessionId: "session-1",
      subject: "operation",
      draftVersion: "operation-v1",
    });
    guard.request({
      sessionId: "session-1",
      subject: "operation",
      draftVersion: "operation-v2",
    });

    expect(() =>
      guard.confirm({
        sessionId: "session-1",
        subject: "operation",
        draftVersion: "operation-v1",
        confirmationToken: first.confirmationToken,
        method: "button",
        affirmative: true,
      }),
    ).toThrowError(expect.objectContaining({ code: "TOKEN_NOT_FOUND" }));
  });
});
