import { aiErrorResponse } from "@/lib/ai-errors";
import { guardAiRequest } from "@/lib/ai/guard";
import { judgeMatch, type JudgeBody } from "@/lib/ai/judge";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const rejected = guardAiRequest(req, { capacity: 30, refillPerSec: 0.5 });
  if (rejected) return rejected;

  try {
    const body = (await req.json()) as JudgeBody;
    const result = await judgeMatch(body);
    return NextResponse.json(result);
  } catch (err) {
    return aiErrorResponse(err, "ai-judge");
  }
}
