export interface AiBuildResult {
  html: string;
  total: number;
  attempts: number;
  playability: number;
  completeness: number;
  mobile: number;
  chaos: number;
  verdict: string;
}

export async function buildGameWithAi(
  prompt: string,
  currentCode?: string,
): Promise<AiBuildResult> {
  const response = await fetch("/api/ai-build", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, currentCode }),
  });

  if (!response.ok) {
    const text = await response.text();
    let message = `HTTP ${response.status}`;
    try {
      const body = text ? (JSON.parse(text) as { error?: string }) : null;
      message = body?.error ?? message;
    } catch {
      if (text) message = text;
    }
    throw new Error(message);
  }

  return {
    html: await response.text(),
    total: Number(response.headers.get("X-Eval-Total") ?? 0),
    attempts: Number(response.headers.get("X-Eval-Attempts") ?? 1),
    playability: Number(response.headers.get("X-Eval-Playability") ?? 0),
    completeness: Number(response.headers.get("X-Eval-Completeness") ?? 0),
    mobile: Number(response.headers.get("X-Eval-Mobile") ?? 0),
    chaos: Number(response.headers.get("X-Eval-Chaos") ?? 0),
    verdict: response.headers.get("X-Eval-Verdict") ?? "pass",
  };
}
