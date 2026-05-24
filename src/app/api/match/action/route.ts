import { NextRequest, NextResponse } from "next/server";
import { useServerlessMatchBackend } from "@/lib/match/serverless-mode";
import { serverlessAction } from "@/lib/match/serverless-engine";

export async function POST(req: NextRequest) {
  if (!useServerlessMatchBackend()) {
    return NextResponse.json({ error: "Actions only available in serverless mode" }, { status: 404 });
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const result = await serverlessAction(body);
    const status = result.error ? 400 : 200;
    return NextResponse.json(result, { status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Action failed";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
