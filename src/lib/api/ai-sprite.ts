export interface AiSpriteResult {
  svg: string;
  dataUrl: string;
}

export async function generateSprite(description: string): Promise<AiSpriteResult> {
  const res = await fetch("/api/ai-sprite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ description }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error ?? `Sprite generation failed (${res.status})`);
  }

  return res.json() as Promise<AiSpriteResult>;
}
