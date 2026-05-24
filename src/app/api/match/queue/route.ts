import { NextRequest, NextResponse } from "next/server";
import { getGameServerHttpBase, gameServerUnavailableMessage } from "@/lib/server/game-server-backend";
import { useServerlessMatchBackend } from "@/lib/match/serverless-mode";
import { serverlessEnqueue, serverlessQueueStatus } from "@/lib/match/serverless-engine";
import { VERCEL_DB_SETUP_MSG, vercelNeedsDatabase } from "@/lib/match/vercel-setup";

export async function POST(req: NextRequest) {
  if (vercelNeedsDatabase()) {
    return NextResponse.json({ error: VERCEL_DB_SETUP_MSG }, { status: 503 });
  }

  const body = await req.json();

  if (useServerlessMatchBackend()) {
    try {
      const userId = String(body.userId ?? "");
      if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
      const data = await serverlessEnqueue(userId);
      return NextResponse.json(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Serverless match failed";
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
  if (vercelNeedsDatabase()) {
    return NextResponse.json({ error: VERCEL_DB_SETUP_MSG }, { status: 503 });
  }

  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  if (useServerlessMatchBackend()) {
    try {
      const data = await serverlessQueueStatus(userId);
      return NextResponse.json(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Serverless poll failed";
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
