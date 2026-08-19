import { createHash } from "node:crypto";
import { z } from "zod";
import {
  ConfirmedFarmOperationSchema,
  FarmOperationInputSchema,
  type ConfirmedFarmOperation,
} from "@/domain/schemas";
import { confirmationGuard, type ConfirmationGuard } from "@/lib/confirmation";
import { REALTIME_AGENT_INSTRUCTIONS } from "@/prompts/realtime-agent";

const REALTIME_CLIENT_SECRETS_URL = "https://api.openai.com/v1/realtime/client_secrets";
const DEFAULT_REALTIME_MODEL = "gpt-realtime-2.1-mini";
const DEFAULT_VOICE = "marin";

export const RealtimeSessionRequestSchema = z.object({
  sessionId: z.string().trim().min(1).max(200),
});

export const ConfirmOperationAndCalculateArgsSchema = z.object({
  sessionId: z.string().trim().min(1).max(200),
  draftVersion: z.string().min(1),
  confirmationToken: z.string().min(1),
  affirmative: z.boolean(),
  operation: FarmOperationInputSchema,
});

const ClientSecretResponseSchema = z.object({
  value: z.string().min(1),
  expires_at: z.number().optional(),
});

export type RealtimeSessionRequest = z.infer<typeof RealtimeSessionRequestSchema>;

export type RealtimeSessionCredentials = {
  clientSecret: string;
  expiresAt?: number;
  model: string;
};

export class RealtimeConfigurationError extends Error {}
export class RealtimeSessionError extends Error {}

export type RealtimeSecretRequester = (
  url: string,
  init: RequestInit,
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

export type RealtimeSessionDependencies = {
  apiKey?: string;
  model?: string;
  requester?: RealtimeSecretRequester;
};

export function validateConfirmedOperationToolCall(
  rawArgs: unknown,
  guard: Pick<ConfirmationGuard, "confirm"> = confirmationGuard,
): ConfirmedFarmOperation {
  const args = ConfirmOperationAndCalculateArgsSchema.parse(rawArgs);
  const confirmation = guard.confirm({
    sessionId: args.sessionId,
    subject: "operation",
    draftVersion: args.draftVersion,
    confirmationToken: args.confirmationToken,
    method: "voice",
    affirmative: args.affirmative,
  });

  return ConfirmedFarmOperationSchema.parse({
    draftVersion: args.draftVersion,
    confirmation,
    municipality: args.operation.municipality,
    operation: args.operation,
  });
}

function safetyIdentifier(sessionId: string): string {
  return createHash("sha256").update(`quarenta-safras:${sessionId}`).digest("hex");
}

function realtimeToolDefinition() {
  return {
    type: "function",
    name: "confirm_operation_and_calculate",
    description:
      "Envia a operacao validada para o planejador somente depois da confirmacao explicita da versao atual.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        sessionId: { type: "string", description: "Identificador da sessao atual." },
        draftVersion: { type: "string", description: "Versao exata do rascunho resumido." },
        confirmationToken: { type: "string", description: "Token efemero emitido pelo servidor." },
        affirmative: { type: "boolean", description: "True somente para confirmacao explicita." },
        operation: {
          type: "object",
          description: "Operacao completa. O servidor validara novamente pelo schema canonico.",
          additionalProperties: true,
        },
      },
      required: ["sessionId", "draftVersion", "confirmationToken", "affirmative", "operation"],
    },
  } as const;
}

export function buildRealtimeSessionConfig(model: string) {
  return {
    type: "realtime",
    model,
    instructions: REALTIME_AGENT_INSTRUCTIONS,
    audio: {
      output: { voice: DEFAULT_VOICE },
    },
    tools: [realtimeToolDefinition()],
    tool_choice: "auto",
  } as const;
}

export async function mintRealtimeClientSecret(
  rawRequest: unknown,
  dependencies: RealtimeSessionDependencies = {},
): Promise<RealtimeSessionCredentials> {
  const request = RealtimeSessionRequestSchema.parse(rawRequest);
  const apiKey = dependencies.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) throw new RealtimeConfigurationError("OPENAI_API_KEY is not configured");

  const model = dependencies.model ?? process.env.OPENAI_REALTIME_MODEL ?? DEFAULT_REALTIME_MODEL;
  const requester = dependencies.requester ?? fetch;
  const response = await requester(REALTIME_CLIENT_SECRETS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "OpenAI-Safety-Identifier": safetyIdentifier(request.sessionId),
    },
    body: JSON.stringify({ session: buildRealtimeSessionConfig(model) }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new RealtimeSessionError(`OpenAI Realtime client secret request failed (${response.status})`);
  }

  const parsed = ClientSecretResponseSchema.safeParse(await response.json());
  if (!parsed.success) throw new RealtimeSessionError("OpenAI returned an invalid Realtime client secret");

  return {
    clientSecret: parsed.data.value,
    ...(parsed.data.expires_at === undefined ? {} : { expiresAt: parsed.data.expires_at }),
    model,
  };
}
