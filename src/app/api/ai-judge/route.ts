import { aiErrorResponse } from "@/lib/ai-errors";
import { aiChat } from "@/lib/ai/chat";
import { NextRequest, NextResponse } from "next/server";

const MODEL = "deepseek.v3.1";

const JUDGE_SYSTEM = `You are the Gamezo AI judge — a witty, chaotic referee for a 5-minute game-building battle.

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

interface PlayerSubmission {
  html: string;
  prompt: string;
}

interface JudgeBody {
  roomId: string;
  playerA: PlayerSubmission;
  playerB: PlayerSubmission;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as JudgeBody;
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
      const parsed = JSON.parse(cleaned);
      return NextResponse.json(parsed);
    } catch {
      return NextResponse.json(fallbackJudge(aHtml, bHtml));
    }
  } catch (err) {
    return aiErrorResponse(err, "ai-judge");
  }
}

function fallbackJudge(aHtml: string, bHtml: string) {
  const score = (hasHtml: boolean) => {
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
