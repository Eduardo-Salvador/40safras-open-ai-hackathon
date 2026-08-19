import OpenAI from "openai";
import { NextResponse } from "next/server";

const instructions = `Fale português do Brasil. Ajude o produtor a relatar município, data inicial,
área, talhões, sementes, capacidade e meta. Não calcule clima, datas derivadas, viabilidade
ou dinheiro. Antes de confirmar, leia um resumo e peça confirmação explícita.`;

export async function POST() {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "voz online indisponível; use texto ou formulário" }, { status: 503 });
  }
  const model = process.env.OPENAI_REALTIME_MODEL ?? "gpt-realtime-2.1-mini";
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const secret = await openai.realtime.clientSecrets.create({
    expires_after: { anchor: "created_at", seconds: 60 },
    session: {
      type: "realtime",
      model,
      instructions,
      output_modalities: ["audio"],
      audio: {
        input: {
          transcription: { model: "gpt-4o-mini-transcribe", language: "pt" },
          turn_detection: null,
        },
      },
    },
  });
  return NextResponse.json({ clientSecret: secret.value, expiresAt: secret.expires_at, model });
}
