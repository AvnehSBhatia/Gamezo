import { NextRequest, NextResponse } from "next/server";
import { getGameServerHttpBase } from "@/lib/server/game-server-backend";
import { useServerlessMatchBackend } from "@/lib/match/serverless-mode";
import { serverlessGetPublicRoom, serverlessSubmitCode } from "@/lib/match/serverless-engine";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await params;

  if (useServerlessMatchBackend()) {
    try {
      const data = await serverlessGetPublicRoom(roomId);
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
  const body = await req.json();

  if (useServerlessMatchBackend()) {
    try {
      const data = await serverlessSubmitCode(
        roomId,
        String(body.userId ?? ""),
        String(body.html ?? ""),
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
