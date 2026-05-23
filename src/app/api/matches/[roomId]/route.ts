import { NextRequest, NextResponse } from "next/server";
import { ai } from "@eazo/sdk";
import {
  getGamezoRuntime,
  type JudgingResult,
  type JudgingScores,
  type PlayerSlot,
  type PublicMatchState,
} from "@/lib/gamezo-runtime";

export const runtime = "nodejs";

const JUDGE_MODEL = "deepseek.v3.1";

function clampScore(value: unknown): number {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return 50;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function peerVoteScore(match: PublicMatchState, slot: PlayerSlot): number {
  const votes = Object.values(match.votes);
  if (votes.length === 0) return 50;
  const wins = votes.filter((vote) => vote === slot).length;
  return Math.round((wins / votes.length) * 100);
}

function fallbackScores(match: PublicMatchState, slot: PlayerSlot): JudgingScores {
  const html = match.submissions[slot]?.html ?? "";
  const lengthScore = Math.min(100, Math.round(html.length / 180));
  const interactionScore = /keydown|keyup|pointer|touch|click|mousemove/i.test(html) ? 78 : 45;
  const chaosScore = /random|chaos|explode|shake|spin|bounce|particle/i.test(html) ? 82 : 56;
  const creativity = Math.max(45, Math.min(100, Math.round((lengthScore + chaosScore) / 2)));
  const fun = Math.max(40, Math.min(100, Math.round((interactionScore + chaosScore) / 2)));
  const uniqueness = /canvas|svg|transform|animation|requestAnimationFrame/i.test(html) ? 76 : 55;
  const peerVote = peerVoteScore(match, slot);
  const total = creativity + fun + chaosScore + uniqueness + peerVote;
  return { creativity, fun, chaos: chaosScore, uniqueness, peerVote, total };
}

function winnerFromScores(scores: Record<PlayerSlot, JudgingScores>): PlayerSlot {
  return scores.playerA.total >= scores.playerB.total ? "playerA" : "playerB";
}

async function judgeWithAi(match: PublicMatchState): Promise<JudgingResult> {
  const prompt = `Judge this two-player Gamezo match. Score each player from 0-100 on Creativity, Fun, Chaos, and Uniqueness. Include peerVote as provided and total as the sum of the five fields. Respond only as JSON matching this shape:
{
  "winner": "playerA" | "playerB",
  "commentary": ["short judge line", "short judge line", "short judge line"],
  "scores": {
    "playerA": {"creativity":0,"fun":0,"chaos":0,"uniqueness":0,"peerVote":0,"total":0},
    "playerB": {"creativity":0,"fun":0,"chaos":0,"uniqueness":0,"peerVote":0,"total":0}
  }
}

Peer votes: ${JSON.stringify(match.votes)}

Player A HTML:
${(match.submissions.playerA?.html ?? "").slice(0, 10000)}

Player B HTML:
${(match.submissions.playerB?.html ?? "").slice(0, 10000)}`;

  const result = await ai.chat({
    model: JUDGE_MODEL,
    stream: false,
    messages: [
      {
        role: "system",
        content: "You are a sharp but fair game jam judge. Reward Creativity, Fun, Chaos, and Uniqueness. Keep commentary punchy and specific.",
      },
      { role: "user", content: prompt },
    ],
  });
  const content = (result as { choices?: { message?: { content?: string } }[] }).choices?.[0]?.message?.content ?? "";
  const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const parsed = JSON.parse(cleaned) as JudgingResult;
  const scores = {
    playerA: {
      creativity: clampScore(parsed.scores.playerA.creativity),
      fun: clampScore(parsed.scores.playerA.fun),
      chaos: clampScore(parsed.scores.playerA.chaos),
      uniqueness: clampScore(parsed.scores.playerA.uniqueness),
      peerVote: peerVoteScore(match, "playerA"),
      total: 0,
    },
    playerB: {
      creativity: clampScore(parsed.scores.playerB.creativity),
      fun: clampScore(parsed.scores.playerB.fun),
      chaos: clampScore(parsed.scores.playerB.chaos),
      uniqueness: clampScore(parsed.scores.playerB.uniqueness),
      peerVote: peerVoteScore(match, "playerB"),
      total: 0,
    },
  };
  scores.playerA.total = scores.playerA.creativity + scores.playerA.fun + scores.playerA.chaos + scores.playerA.uniqueness + scores.playerA.peerVote;
  scores.playerB.total = scores.playerB.creativity + scores.playerB.fun + scores.playerB.chaos + scores.playerB.uniqueness + scores.playerB.peerVote;
  const winner = winnerFromScores(scores);
  return {
    winner,
    commentary: Array.isArray(parsed.commentary) && parsed.commentary.length > 0
      ? parsed.commentary.slice(0, 4).map(String)
      : [`${winner} had the stronger all-around game.`],
    scores,
    createdAt: new Date().toISOString(),
  };
}

function fallbackResult(match: PublicMatchState): JudgingResult {
  const scores = {
    playerA: fallbackScores(match, "playerA"),
    playerB: fallbackScores(match, "playerB"),
  };
  const winner = winnerFromScores(scores);
  return {
    winner,
    scores,
    commentary: [
      "The judge could not reach the AI booth, so the backup scorer stepped in.",
      `${winner === "playerA" ? "Blue" : "Orange"} takes it on the combined build, chaos, uniqueness, and peer vote score.`,
    ],
    createdAt: new Date().toISOString(),
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const runtimeStore = getGamezoRuntime();
  const { roomId } = await params;
  const match = await runtimeStore?.getPublicMatch(roomId);
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
  return NextResponse.json(match);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const runtimeStore = getGamezoRuntime();
  if (!runtimeStore) return NextResponse.json({ error: "Game server unavailable" }, { status: 503 });

  const { roomId } = await params;
  const { userId, matchToken } = await req.json() as { userId?: string; matchToken?: string };
  const validation = await runtimeStore.validateAction({
    roomId,
    userId: userId ?? "",
    matchToken: matchToken ?? "",
    allowedPhases: ["VOTING", "COMPLETE"],
  });
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: validation.status });

  const match = await runtimeStore.getPublicMatch(roomId);
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
  if (match.judgingResult) return NextResponse.json(match.judgingResult);
  if (!match.submissions.playerA || !match.submissions.playerB) {
    return NextResponse.json({ error: "Both submissions are required before judging" }, { status: 409 });
  }

  let result: JudgingResult;
  try {
    result = await judgeWithAi(match);
  } catch (err) {
    console.warn("[judge] AI judge failed, using fallback", err);
    result = fallbackResult(match);
  }
  await runtimeStore.saveJudgingResult(roomId, result);
  return NextResponse.json(result);
}
