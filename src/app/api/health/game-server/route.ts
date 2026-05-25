import { NextResponse } from "next/server";
import { getGameServerHttpBase, gameServerUnavailableMessage } from "@/lib/server/game-server-backend";
import { matchBackendMode, matchTransportMode, usesPollingMatchBackend } from "@/lib/match/serverless-mode";

export async function GET() {
  if (usesPollingMatchBackend()) {
    return NextResponse.json({
      ok: true,
      mode: matchBackendMode(),
      transport: matchTransportMode(),
    });
  }

  try {
    const res = await fetch(`${getGameServerHttpBase()}/health`, { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json({ ...data, mode: "websocket", transport: "websocket" }, { status: res.status });
  } catch {
    return NextResponse.json(
      { ok: false, error: gameServerUnavailableMessage(), configured: Boolean(process.env.GAME_SERVER_HTTP) },
      { status: 503 },
    );
  }
}
