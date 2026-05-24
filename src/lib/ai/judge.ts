import { aiChat } from "@/lib/ai/chat";

/**
 * Match-judge implementation shared by the public `/api/ai-judge` route and
 * the polling engines. Engines must call `judgeMatch` directly — going via the
 * HTTP route makes the call appear to the per-IP rate limiter as one of the
 * Vercel internal IPs, draining the bucket and silently falling back to fake
 * scores under load. This module has zero HTTP- or auth-layer knowledge.
 */

const MODEL = "deepseek.v3.1";

const JUDGE_SYSTEM = `You are the Gamezo AI judge — a witty, chaotic referee for a 1-minute game-building battle.

Two players built tiny web games from their prompts. Evaluate EACH game on exactly four dimensions (0-10 each):
- creativity: Original ideas, surprising mechanics, artistic flair
- fun: Is it enjoyable? Clear feedback, satisfying loops, would you keep playing?
- chaos: Unexpected, funny, delightfully broken, or absurd elements
- uniqueness: Distinct from generic clones; feels like THIS player's vision

Respond ONLY with valid JSON — no markdown:
{
  "playerA": { "creativity": N, "fun": N, "chaos": N, "uniqueness": N, "total": sum },
  "playerB": { "creativity": N, "fun": N, "chaos": N, "uniqueness": N, "total": sum },
  "winner": "playerA" | "playerB",
  "commentary": "2-3 humorous sentences explaining the verdict"
}`;

export interface PlayerSubmission {
  html: string;
  prompt: string;
}

export interface JudgeBody {
  roomId: string;
  playerA: PlayerSubmission;
  playerB: PlayerSubmission;
}

export interface JudgeScore {
  creativity: number;
  fun: number;
  chaos: number;
  uniqueness: number;
  total: number;
}

export interface JudgeResult {
  playerA: JudgeScore;
  playerB: JudgeScore;
  winner: "playerA" | "playerB";
  commentary: string;
}

export async function judgeMatch(body: JudgeBody): Promise<JudgeResult> {
  const aHtml = (body.playerA?.html ?? "").slice(0, 6000);
  const bHtml = (body.playerB?.html ?? "").slice(0, 6000);
  const aPrompt = body.playerA?.prompt ?? "unknown";
  const bPrompt = body.playerB?.prompt ?? "unknown";

  const userContent = `Player A prompt: "${aPrompt}"
Player A game HTML:
${aHtml || "(no submission)"}

Player B prompt: "${bPrompt}"
Player B game HTML:
${bHtml || "(no submission)"}`;

  const result = await aiChat({
    model: MODEL,
    messages: [
      { role: "system", content: JUDGE_SYSTEM },
      { role: "user", content: userContent },
    ],
    stream: false,
  });

  const raw = (result as { choices: { message: { content: string } }[] }).choices?.[0]?.message?.content ?? "";
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  try {
    return JSON.parse(cleaned) as JudgeResult;
  } catch {
    return fallbackJudge(aHtml, bHtml);
  }
}

export function fallbackJudge(aHtml: string, bHtml: string): JudgeResult {
  const score = (hasHtml: boolean): JudgeScore => {
    const base = hasHtml ? 6 : 2;
    return {
      creativity: base + 2,
      fun: base + 1,
      chaos: base + 3,
      uniqueness: base + 1,
      total: (base + 2) + (base + 1) + (base + 3) + (base + 1),
    };
  };
  const playerA = score(Boolean(aHtml));
  const playerB = score(Boolean(bHtml));
  return {
    playerA,
    playerB,
    winner: playerA.total >= playerB.total ? "playerA" : "playerB",
    commentary: "The judge's circuits overheated. These scores are pure chaos energy.",
  };
}
