import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const AUTH_COOKIE_NAME = "quarenta_safras_session";
const SESSION_TTL_SECONDS = 8 * 60 * 60;

export const LoginSchema = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(200),
});

const SessionPayloadSchema = z.object({
  username: z.string().min(1),
  issuedAt: z.number().int().nonnegative(),
  expiresAt: z.number().int().positive(),
});

export type SessionPayload = z.infer<typeof SessionPayloadSchema>;

type Credentials = { username: string; password: string };
type SessionOptions = { secret?: string; now?: () => number };

function secureTextMatch(actual: string, expected: string): boolean {
  const actualDigest = createHmac("sha256", "credential-comparison").update(actual).digest();
  const expectedDigest = createHmac("sha256", "credential-comparison").update(expected).digest();
  return timingSafeEqual(actualDigest, expectedDigest);
}

function configuredCredentials(): Credentials {
  const username = process.env.APP_LOGIN_USER;
  const password = process.env.APP_LOGIN_PASSWORD;
  if (!username || !password) throw new Error("single-user login is not configured");
  return { username, password };
}

function configuredSecret(override?: string): string {
  const secret = override ?? process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET must contain at least 32 characters");
  return secret;
}

function sign(encodedPayload: string, secret: string): string {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

export function validateLogin(rawLogin: unknown, credentials: Credentials = configuredCredentials()): boolean {
  const parsed = LoginSchema.safeParse(rawLogin);
  if (!parsed.success) return false;
  return (
    secureTextMatch(parsed.data.username, credentials.username) &&
    secureTextMatch(parsed.data.password, credentials.password)
  );
}

export function createSessionToken(username: string, options: SessionOptions = {}): string {
  const secret = configuredSecret(options.secret);
  const issuedAt = Math.floor((options.now ?? Date.now)() / 1000);
  const payload = SessionPayloadSchema.parse({
    username,
    issuedAt,
    expiresAt: issuedAt + SESSION_TTL_SECONDS,
  });
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded, secret)}`;
}

export function verifySessionToken(token: string | undefined, options: SessionOptions = {}): SessionPayload | null {
  if (!token) return null;
  const [encoded, candidateSignature, extra] = token.split(".");
  if (!encoded || !candidateSignature || extra) return null;

  const secret = configuredSecret(options.secret);
  const expectedSignature = sign(encoded, secret);
  const actualBuffer = Buffer.from(candidateSignature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;

  try {
    const payload = SessionPayloadSchema.parse(
      JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")),
    );
    const now = Math.floor((options.now ?? Date.now)() / 1000);
    return payload.expiresAt > now ? payload : null;
  } catch {
    return null;
  }
}
