"use client";

import { useRef, useState } from "react";
import { RealtimeAgent, RealtimeSession } from "@openai/agents/realtime";
import styles from "@/app/page.module.css";

type Props = { onTranscript: (text: string) => void };

export function VoiceInput({ onTranscript }: Props) {
  const sessionRef = useRef<RealtimeSession | null>(null);
  const seenRef = useRef(new Set<string>());
  const [status, setStatus] = useState<"idle" | "connecting" | "ready" | "speaking" | "error">("idle");
  const [message, setMessage] = useState("A voz é opcional; texto e formulário sempre ficam disponíveis.");

  async function connect() {
    setStatus("connecting");
    try {
      const response = await fetch("/api/realtime-session", { method: "POST" });
      const body = (await response.json()) as { clientSecret?: string; model?: string; error?: string };
      if (!response.ok || !body.clientSecret) throw new Error(body.error ?? "sessão de voz indisponível");
      const agent = new RealtimeAgent({
        name: "Assistente Quarenta Safras",
        instructions: "Conduza o relato em português e nunca invente números ausentes.",
      });
      const session = new RealtimeSession(agent, {
        model: body.model ?? "gpt-realtime-2.1-mini",
        config: {
          audio: {
            input: {
              transcription: { model: "gpt-4o-mini-transcribe", language: "pt" },
              turnDetection: null,
            },
          },
        },
        historyStoreAudio: false,
      });
      session.on("history_updated", (history) => {
        for (const item of history) {
          if (item.type !== "message" || item.role !== "user" || item.status !== "completed" || seenRef.current.has(item.itemId)) continue;
          const transcript = item.content
            .map((content) => content.type === "input_audio" ? content.transcript : content.text)
            .filter(Boolean)
            .join(" ");
          if (transcript) {
            seenRef.current.add(item.itemId);
            onTranscript(transcript);
          }
        }
      });
      session.on("error", () => {
        setStatus("error");
        setMessage("A voz desconectou. Seu texto foi preservado; continue pelo formulário.");
      });
      await session.connect({ apiKey: body.clientSecret });
      session.mute(true);
      sessionRef.current = session;
      setStatus("ready");
      setMessage("Conectado. Segure o botão para falar e solte para enviar.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "voz indisponível");
    }
  }

  function startTalking() {
    if (!sessionRef.current) return;
    sessionRef.current.mute(false);
    setStatus("speaking");
  }

  function stopTalking() {
    if (!sessionRef.current) return;
    sessionRef.current.mute(true);
    setStatus("ready");
  }

  return (
    <div className={styles.voicePanel}>
      {status === "idle" || status === "error" || status === "connecting" ? (
        <button type="button" className={styles.ctaSecondary} onClick={connect} disabled={status === "connecting"}>
          {status === "connecting" ? "Conectando…" : "Conectar microfone"}
        </button>
      ) : (
        <button
          type="button"
          className={styles.ctaPrimary}
          onPointerDown={startTalking}
          onPointerUp={stopTalking}
          onPointerCancel={stopTalking}
          onPointerLeave={status === "speaking" ? stopTalking : undefined}
        >
          {status === "speaking" ? "Ouvindo… solte para enviar" : "Segure para falar"}
        </button>
      )}
      <span className={styles.submitNote}>{message}</span>
    </div>
  );
}
