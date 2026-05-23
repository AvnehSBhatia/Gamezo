export interface AiBuildResult {
  html: string;
  total: number;
  attempts: number;
  chaos: number;
  verdict: string;
}

export async function buildGameWithAi(prompt: string, currentCode?: string): Promise<AiBuildResult> {
  const response = await fetch("/api/ai-build", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, currentCode }),
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(error.error ?? `AI build failed with HTTP ${response.status}`);
  }

  return {
    html: await response.text(),
    total: Number(response.headers.get("X-Eval-Total") ?? 0),
    attempts: Number(response.headers.get("X-Eval-Attempts") ?? 1),
    chaos: Number(response.headers.get("X-Eval-Chaos") ?? 0),
    verdict: response.headers.get("X-Eval-Verdict") ?? "pass",
  };
}
