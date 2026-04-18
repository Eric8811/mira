export type Message = { role: "system" | "user" | "assistant"; content: string };

const GLM_BASE = process.env.GLM_VOICE_ENDPOINT?.replace(/\/$/, "") || "https://api.z.ai/api/paas/v4";

export async function glmChat(
  messages: Message[],
  systemPrompt: string,
  opts: { temperature?: number; maxTokens?: number; model?: string } = {},
) {
  const apiKey = process.env.ZAI_API_KEY_1;
  if (!apiKey) throw new Error("ZAI_API_KEY_1 is not set");

  const res = await fetch(`${GLM_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model ?? "glm-4-flash",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      temperature: opts.temperature ?? 0.8,
      max_tokens: opts.maxTokens ?? 300,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GLM chat failed: ${res.status} ${body}`);
  }

  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
  };
  return data.choices[0]?.message?.content ?? "";
}
