import { NextRequest, NextResponse } from "next/server";
import { usePollingMatchBackend } from "@/lib/match/serverless-mode";
import { matchAction } from "@/lib/match/match-engine";

export async function POST(req: NextRequest) {
  if (!usePollingMatchBackend()) {
    return NextResponse.json({ error: "Actions only available in polling mode" }, { status: 404 });
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const result = await matchAction(body);
    const status = result.error ? 400 : 200;
    return NextResponse.json(result, { status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Action failed";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
