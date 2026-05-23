import { NextResponse } from "next/server";
import { getGameServerHttpBase } from "@/lib/server/game-server-backend";

export async function GET() {
  try {
    const res = await fetch(`${getGameServerHttpBase()}/health`, { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ ok: false, error: "Game server unreachable" }, { status: 503 });
  }
}
