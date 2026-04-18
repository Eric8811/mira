import { NextRequest, NextResponse } from "next/server";
import { llmChat } from "@/lib/llm";
import { buildEncounterPrompt, FALLBACK_ENCOUNTER } from "@/lib/prompts";
import type { MiraSession } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const session = (await req.json()) as MiraSession;
  const { system, user } = buildEncounterPrompt(session);

  try {
    const text = await llmChat([{ role: "user", content: user }], system, {
      temperature: 0.9,
      maxTokens: 400,
    });
    if (!text) throw new Error("empty completion");
    return NextResponse.json({ text, source: "qwen" });
  } catch (e) {
    const err = e as Error;
    console.log("[encounter] falling back:", err.message);
    const fallback = FALLBACK_ENCOUNTER[session.archetype][session.locale];
    return NextResponse.json({ text: fallback, source: "fallback", error: err.message });
  }
}
