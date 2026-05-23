import OpenAI from "openai";

function platformBase(): string {
  return (process.env.EAZO_PLATFORM_API_BASE ?? "https://eazo.ai").replace(/\/$/, "");
}

function getApiKey(): string {
  const key = process.env.EAZO_PRIVATE_KEY;
  if (!key) {
    throw new Error("EAZO_PRIVATE_KEY is required for AI requests.");
  }
  return key;
}

function createClient(): OpenAI {
  return new OpenAI({
    baseURL: `${platformBase()}/v1`,
    apiKey: getApiKey(),
  });
}

export async function aiChat(
  params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming,
): Promise<OpenAI.Chat.ChatCompletion> {
  const client = createClient();
  return client.chat.completions.create(params);
}
