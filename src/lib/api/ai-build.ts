import { request } from "@/lib/api/request";

export interface AiBuildRequest {
  prompt: string;
  currentCode?: string;
}

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

export interface GameSubmission {
  userId: string;
  html: string;
  css: string;
  js: string;
  assets: string[];
}

export async function buildGameWithAi(params: AiBuildRequest): Promise<AiBuildResult> {
  const res = await request("/api/ai-build", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const text = await res.text();
    let message = `HTTP ${res.status}`;
    try {
      const body = text ? (JSON.parse(text) as { error?: string }) : null;
      message = body?.error ?? message;
    } catch {
      if (text) message = text;
    }
    throw new Error(message);
  }

  return {
    html: await res.text(),
    total: Number(res.headers.get("X-Eval-Total") ?? 0),
    attempts: Number(res.headers.get("X-Eval-Attempts") ?? 1),
    playability: Number(res.headers.get("X-Eval-Playability") ?? 0),
    completeness: Number(res.headers.get("X-Eval-Completeness") ?? 0),
    mobile: Number(res.headers.get("X-Eval-Mobile") ?? 0),
    chaos: Number(res.headers.get("X-Eval-Chaos") ?? 0),
    verdict: res.headers.get("X-Eval-Verdict") ?? "pass",
  };
}

export async function submitGameToRoom(
  backendUrl: string,
  roomId: string,
  submission: GameSubmission,
): Promise<void> {
  const res = await fetch(`${backendUrl}/session/${roomId}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(submission),
  });

  if (!res.ok) {
    throw new Error(`Submit failed with HTTP ${res.status}`);
  }
}
