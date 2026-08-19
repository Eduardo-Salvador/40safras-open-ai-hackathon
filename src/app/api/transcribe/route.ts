import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audio = formData.get("audio");
    if (!(audio instanceof File) || audio.size === 0) {
      return NextResponse.json({ error: "Não recebemos o áudio." }, { status: 400 });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const transcription = await client.audio.transcriptions.create({
      file: audio,
      model: process.env.OPENAI_TRANSCRIBE_MODEL ?? "gpt-4o-mini-transcribe",
      language: "pt",
    });
    return NextResponse.json({ text: transcription.text });
  } catch (error) {
    console.error("audio transcription failed", error);
    return NextResponse.json({ error: "Não conseguimos entender o áudio agora." }, { status: 502 });
  }
}
