import { NextRequest, NextResponse } from "next/server";
import { getGameServerHttpBase, gameServerUnavailableMessage } from "@/lib/server/game-server-backend";
import { usePollingMatchBackend } from "@/lib/match/serverless-mode";
import { matchEnqueue, matchQueueStatus } from "@/lib/match/match-engine";

export async function POST(req: NextRequest) {
  let body: { userId?: unknown } & Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (usePollingMatchBackend()) {
    try {
      const userId = String(body.userId ?? "");
      if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
      const data = await matchEnqueue(userId);
      return NextResponse.json(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Match enqueue failed";
      return NextResponse.json({ error: message }, { status: 503 });
    }
  }

  try {
    const res = await fetch(`${getGameServerHttpBase()}/queue/enqueue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: gameServerUnavailableMessage() }, { status: 503 });
  }
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  if (usePollingMatchBackend()) {
    try {
      const data = await matchQueueStatus(userId);
      return NextResponse.json(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Match poll failed";
      return NextResponse.json({ error: message }, { status: 503 });
    }
  }

  try {
    const res = await fetch(`${getGameServerHttpBase()}/queue/status?userId=${encodeURIComponent(userId)}`, {
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: gameServerUnavailableMessage() }, { status: 503 });
  }
}
