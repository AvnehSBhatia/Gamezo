import type { GameAsset } from "@/components/gamezo/game/game-types";
import type { JudgeResult, MatchState } from "@/components/gamezo/game/game-types";

export interface GameSubmissionPayload {
  roomId: string;
  userId: string;
  html: string;
  assets?: GameAsset[];
}

export async function submitGameCode({
  roomId,
  userId,
  html,
  assets = [],
}: GameSubmissionPayload): Promise<void> {
  if (!roomId || !html) return;

  await fetch(`/api/match/${roomId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, html, css: "", js: "", assets }),
  });
}

export async function getMatchState(roomId: string): Promise<MatchState | null> {
  const res = await fetch(`/api/match/${roomId}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json() as Promise<MatchState>;
}

export function storeJudgeResult(result: JudgeResult) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem("gamezo_judgeResult", JSON.stringify(result));
}

export function loadJudgeResult(): JudgeResult | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem("gamezo_judgeResult");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as JudgeResult;
  } catch {
    return null;
  }
}
