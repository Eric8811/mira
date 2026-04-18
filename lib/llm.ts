import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export type Message = { role: "system" | "user" | "assistant"; content: string };

const BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";
const TEXT_MODEL = "qwen-plus";
const DEFAULT_TIMEOUT_MS = 30_000;

function maskKey(k: string | undefined): string {
  if (!k) return "(none)";
  if (k.length <= 10) return "*".repeat(k.length);
  return `${"*".repeat(10)}${k.slice(10)}`;
}

let _client: OpenAI | null = null;
function client(): OpenAI {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    throw new Error("DASHSCOPE_API_KEY is not set — add it to .env.local and Vercel env");
  }
  if (_client) return _client;
  _client = new OpenAI({
    apiKey,
    baseURL: BASE_URL,
    timeout: DEFAULT_TIMEOUT_MS,
  });
  return _client;
}

export async function llmChat(
  messages: Message[],
  systemPrompt: string,
  opts: { temperature?: number; maxTokens?: number; model?: string } = {},
): Promise<string> {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  const url = `${BASE_URL}/chat/completions`;
  const model = opts.model ?? TEXT_MODEL;
  const body = {
    model,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages,
    ] as ChatCompletionMessageParam[],
    temperature: opts.temperature ?? 0.8,
    max_tokens: opts.maxTokens ?? 400,
    stream: false as const,
  };

  console.log("[llm] POST", url);
  console.log("[llm] auth: Bearer", maskKey(apiKey));
  console.log("[llm] body:", JSON.stringify(body));

  const started = Date.now();
  try {
    const completion = await client().chat.completions.create(body);
    console.log("[llm] status: 200 (", Date.now() - started, "ms)");
    return completion.choices[0]?.message?.content ?? "";
  } catch (e) {
    const err = e as Error & { status?: number; cause?: unknown };
    console.log("[llm] error:", err.name, err.message, "status:", err.status);
    if (err.cause) console.log("[llm] cause:", err.cause);
    throw e;
  }
}

/** Kept for call-site compatibility during migration. */
export const glmChat = llmChat;
