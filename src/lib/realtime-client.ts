"use client";

import { RealtimeAgent, RealtimeSession, tool } from "@openai/agents/realtime";
import { z } from "zod";
import { FarmOperationInputSchema, FieldEventDraftSchema, OperationDraftSchema } from "@/domain/schemas";
import { REALTIME_AGENT_INSTRUCTIONS } from "@/prompts/realtime-agent";

const RealtimeCredentialsSchema = z.object({
  clientSecret: z.string().min(1),
  model: z.string().min(1),
  expiresAt: z.number().optional(),
});

const UpdateOperationDraftArgsSchema = z.object({
  draftVersion: z.string().min(1),
  draft: OperationDraftSchema,
});

const DraftVersionArgsSchema = z.object({
  draftVersion: z.string().min(1),
});

const ConfirmOperationArgsSchema = z.object({
  draftVersion: z.string().min(1),
  confirmationToken: z.string().min(1),
  affirmative: z.boolean(),
  operation: FarmOperationInputSchema,
});

const UpdateFieldEventDraftArgsSchema = z.object({
  draftVersion: z.string().min(1),
  draft: FieldEventDraftSchema,
});

const ConfirmFieldEventArgsSchema = z.object({
  draftVersion: z.string().min(1),
  confirmationToken: z.string().min(1),
  affirmative: z.boolean(),
  event: FieldEventDraftSchema,
});

export type RealtimeVoiceHandlers = {
  updateOperationDraft: (args: z.infer<typeof UpdateOperationDraftArgsSchema>) => unknown | Promise<unknown>;
  requestOperationConfirmation: (args: z.infer<typeof DraftVersionArgsSchema>) => unknown | Promise<unknown>;
  confirmOperationAndCalculate: (args: z.infer<typeof ConfirmOperationArgsSchema>) => unknown | Promise<unknown>;
  updateFieldEventDraft: (args: z.infer<typeof UpdateFieldEventDraftArgsSchema>) => unknown | Promise<unknown>;
  requestFieldEventConfirmation: (args: z.infer<typeof DraftVersionArgsSchema>) => unknown | Promise<unknown>;
  confirmFieldEvent: (args: z.infer<typeof ConfirmFieldEventArgsSchema>) => unknown | Promise<unknown>;
};

export type RealtimeVoiceController = {
  session: RealtimeSession;
  startPushToTalk: () => void;
  stopPushToTalk: () => void;
  close: () => void;
};

function toolResult(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value ?? { ok: true });
}

export async function fetchRealtimeCredentials(sessionId: string) {
  const response = await fetch("/api/realtime-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
  });
  if (!response.ok) throw new Error("voice session is temporarily unavailable");
  return RealtimeCredentialsSchema.parse(await response.json());
}

export async function connectRealtimeVoiceSession(
  sessionId: string,
  handlers: RealtimeVoiceHandlers,
): Promise<RealtimeVoiceController> {
  const credentials = await fetchRealtimeCredentials(sessionId);
  const updateOperationDraft = tool({
    name: "update_operation_draft",
    description: "Atualiza o rascunho editavel sem inventar campos ausentes.",
    parameters: UpdateOperationDraftArgsSchema,
    execute: async (args) => toolResult(await handlers.updateOperationDraft(args)),
  });
  const requestOperationConfirmation = tool({
    name: "request_operation_confirmation",
    description: "Pede ao servidor um token depois de ler o resumo da versao atual.",
    parameters: DraftVersionArgsSchema,
    execute: async (args) => toolResult(await handlers.requestOperationConfirmation(args)),
  });
  const confirmOperation = tool({
    name: "confirm_operation_and_calculate",
    description: "Confirma a versao resumida e delega o calculo ao planejador deterministico do servidor.",
    parameters: ConfirmOperationArgsSchema,
    execute: async (args) => toolResult(await handlers.confirmOperationAndCalculate(args)),
  });
  const updateFieldEventDraft = tool({
    name: "update_field_event_draft",
    description: "Atualiza o rascunho de evento de campo sem calcular o replano.",
    parameters: UpdateFieldEventDraftArgsSchema,
    execute: async (args) => toolResult(await handlers.updateFieldEventDraft(args)),
  });
  const requestFieldEventConfirmation = tool({
    name: "request_field_event_confirmation",
    description: "Pede um novo token depois de resumir a versao atual do evento.",
    parameters: DraftVersionArgsSchema,
    execute: async (args) => toolResult(await handlers.requestFieldEventConfirmation(args)),
  });
  const confirmFieldEvent = tool({
    name: "confirm_field_event",
    description: "Confirma explicitamente o evento atual antes de qualquer replano.",
    parameters: ConfirmFieldEventArgsSchema,
    execute: async (args) => toolResult(await handlers.confirmFieldEvent(args)),
  });

  const agent = new RealtimeAgent({
    name: "Quarenta Safras",
    instructions: REALTIME_AGENT_INSTRUCTIONS,
    voice: "marin",
    tools: [
      updateOperationDraft,
      requestOperationConfirmation,
      confirmOperation,
      updateFieldEventDraft,
      requestFieldEventConfirmation,
      confirmFieldEvent,
    ],
  });
  const session = new RealtimeSession(agent, {
    model: credentials.model,
    tracingDisabled: true,
  });

  await session.connect({ apiKey: credentials.clientSecret });
  session.mute(true);

  return {
    session,
    startPushToTalk() {
      session.interrupt();
      session.mute(false);
    },
    stopPushToTalk() {
      session.mute(true);
    },
    close() {
      session.close();
    },
  };
}
