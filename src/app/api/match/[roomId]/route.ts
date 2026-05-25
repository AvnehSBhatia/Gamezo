import { NextRequest, NextResponse } from "next/server";
import { getGameServerHttpBase } from "@/lib/server/game-server-backend";
import { usesPollingMatchBackend } from "@/lib/match/serverless-mode";
import { matchGetPublicRoom, matchSubmitCode } from "@/lib/match/match-engine";

const MAX_HTML_BYTES = 256 * 1024;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await params;

  if (usesPollingMatchBackend()) {
    try {
      const data = await matchGetPublicRoom(roomId);
      if (!data) return NextResponse.json({ error: "Room not found" }, { status: 404 });
      return NextResponse.json(data);
    } catch {
      return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
    }
  }

  try {
    const res = await fetch(`${getGameServerHttpBase()}/session/${roomId}`, { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await params;
  let body: { userId?: unknown; html?: unknown; assets?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const html = String(body.html ?? "");
  if (html.length > MAX_HTML_BYTES) {
    return NextResponse.json(
      { error: `Submission too large (${html.length} bytes, max ${MAX_HTML_BYTES})` },
      { status: 413 },
    );
  }

  if (usesPollingMatchBackend()) {
    try {
      const data = await matchSubmitCode(
        roomId,
        String(body.userId ?? ""),
        html,
        Array.isArray(body.assets) ? body.assets : [],
      );
      const status = data.error ? 404 : 200;
      return NextResponse.json(data, { status });
    } catch {
      return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
    }
  }

  try {
    const res = await fetch(`${getGameServerHttpBase()}/session/${roomId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
  }
}
