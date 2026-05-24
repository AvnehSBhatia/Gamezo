import { NextResponse } from "next/server";
import { getGameServerHttpBase, gameServerUnavailableMessage } from "@/lib/server/game-server-backend";
import { matchTransportMode, useServerlessMatchBackend } from "@/lib/match/serverless-mode";
import { VERCEL_GAME_SERVER_MSG, vercelNeedsGameServer } from "@/lib/match/vercel-setup";

export async function GET() {
  if (vercelNeedsGameServer()) {
    return NextResponse.json(
      { ok: false, mode: "needs-game-server", error: VERCEL_GAME_SERVER_MSG },
      { status: 503 },
    );
  }

  if (useServerlessMatchBackend()) {
    return NextResponse.json({
      ok: true,
      mode: "serverless",
      transport: matchTransportMode(),
      database: Boolean(process.env.DATABASE_URL),
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
