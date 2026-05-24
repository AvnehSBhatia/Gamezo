import { NextRequest, NextResponse } from "next/server";
import { useServerlessMatchBackend } from "@/lib/match/serverless-mode";
import { serverlessSync } from "@/lib/match/serverless-engine";

export async function GET(req: NextRequest) {
  if (!useServerlessMatchBackend()) {
    return NextResponse.json({ error: "Sync polling only available in serverless mode" }, { status: 404 });
  }

  const roomId = req.nextUrl.searchParams.get("roomId") ?? "";
  const userId = req.nextUrl.searchParams.get("userId") ?? "";
  const since = Number(req.nextUrl.searchParams.get("since") ?? "0");

  if (!roomId || !userId) {
    return NextResponse.json({ error: "roomId and userId required" }, { status: 400 });
  }

  try {
    const data = await serverlessSync(roomId, userId, since);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
