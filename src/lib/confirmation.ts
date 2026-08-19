import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const DEFAULT_TTL_MS = 5 * 60 * 1000;

export const ConfirmationSubjectSchema = z.enum(["operation", "field_event"]);
export type ConfirmationSubject = z.infer<typeof ConfirmationSubjectSchema>;

export const RequestConfirmationArgsSchema = z.object({
  sessionId: z.string().min(1),
  subject: ConfirmationSubjectSchema,
  draftVersion: z.string().min(1),
});

export const ConfirmDraftArgsSchema = z.object({
  sessionId: z.string().min(1),
  subject: ConfirmationSubjectSchema,
  draftVersion: z.string().min(1),
  confirmationToken: z.string().min(1),
  method: z.enum(["voice", "button"]),
  affirmative: z.boolean(),
});

export type ConfirmationChallenge = {
  draftVersion: string;
  confirmationToken: string;
  issuedAt: string;
  expiresAt: string;
};

export type ConfirmationErrorCode =
  | "INVALID_ARGUMENTS"
  | "NEGATIVE_CONFIRMATION"
  | "TOKEN_NOT_FOUND"
  | "TOKEN_MISMATCH"
  | "STALE_DRAFT"
  | "TOKEN_EXPIRED";

export class ConfirmationError extends Error {
  constructor(
    public readonly code: ConfirmationErrorCode,
    message: string,
  ) {
    super(message);
  }
}

type PendingConfirmation = {
  sessionId: string;
  subject: ConfirmationSubject;
  draftVersion: string;
  tokenHash: Buffer;
  expiresAtMs: number;
};

type ConfirmationGuardOptions = {
  now?: () => number;
  tokenFactory?: () => string;
  ttlMs?: number;
};

function hashToken(token: string): Buffer {
  return createHash("sha256").update(token).digest();
}

function tokensMatch(actual: Buffer, candidate: Buffer): boolean {
  return actual.length === candidate.length && timingSafeEqual(actual, candidate);
}

export class ConfirmationGuard {
  private readonly pendingByTokenHash = new Map<string, PendingConfirmation>();
  private readonly now: () => number;
  private readonly tokenFactory: () => string;
  private readonly ttlMs: number;

  constructor(options: ConfirmationGuardOptions = {}) {
    this.now = options.now ?? Date.now;
    this.tokenFactory = options.tokenFactory ?? (() => randomBytes(18).toString("base64url"));
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  }

  request(rawArgs: unknown): ConfirmationChallenge {
    const parsed = RequestConfirmationArgsSchema.safeParse(rawArgs);
    if (!parsed.success) throw new ConfirmationError("INVALID_ARGUMENTS", "invalid confirmation request");

    const { sessionId, subject, draftVersion } = parsed.data;
    this.invalidate(sessionId, subject);

    const confirmationToken = this.tokenFactory();
    const tokenHash = hashToken(confirmationToken);
    const issuedAtMs = this.now();
    const expiresAtMs = issuedAtMs + this.ttlMs;
    this.pendingByTokenHash.set(tokenHash.toString("hex"), {
      sessionId,
      subject,
      draftVersion,
      tokenHash,
      expiresAtMs,
    });

    return {
      draftVersion,
      confirmationToken,
      issuedAt: new Date(issuedAtMs).toISOString(),
      expiresAt: new Date(expiresAtMs).toISOString(),
    };
  }

  confirm(rawArgs: unknown): void {
    const parsed = ConfirmDraftArgsSchema.safeParse(rawArgs);
    if (!parsed.success) throw new ConfirmationError("INVALID_ARGUMENTS", "invalid confirmation arguments");
    const args = parsed.data;
    if (!args.affirmative) {
      throw new ConfirmationError("NEGATIVE_CONFIRMATION", "explicit affirmative confirmation is required");
    }

    const candidateHash = hashToken(args.confirmationToken);
    const pending = this.pendingByTokenHash.get(candidateHash.toString("hex"));
    if (!pending) throw new ConfirmationError("TOKEN_NOT_FOUND", "confirmation token was not issued");
    if (!tokensMatch(pending.tokenHash, candidateHash) || pending.sessionId !== args.sessionId || pending.subject !== args.subject) {
      throw new ConfirmationError("TOKEN_MISMATCH", "confirmation token belongs to another session or subject");
    }
    if (pending.draftVersion !== args.draftVersion) {
      this.pendingByTokenHash.delete(candidateHash.toString("hex"));
      throw new ConfirmationError("STALE_DRAFT", "draft changed after the confirmation summary");
    }
    if (this.now() > pending.expiresAtMs) {
      this.pendingByTokenHash.delete(candidateHash.toString("hex"));
      throw new ConfirmationError("TOKEN_EXPIRED", "confirmation token expired");
    }
    this.pendingByTokenHash.delete(candidateHash.toString("hex"));
  }

  invalidate(sessionId: string, subject: ConfirmationSubject): void {
    for (const [key, pending] of this.pendingByTokenHash) {
      if (pending.sessionId === sessionId && pending.subject === subject) this.pendingByTokenHash.delete(key);
    }
  }
}

export const confirmationGuard = new ConfirmationGuard();
