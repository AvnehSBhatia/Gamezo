import { NextRequest, NextResponse } from "next/server";
import { getGameServerHttpBase } from "@/lib/server/game-server-backend";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${getGameServerHttpBase()}/queue/enqueue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { error: "Game server unavailable — run npm run dev" },
      { status: 503 },
    );
  }
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }
  try {
    const res = await fetch(`${getGameServerHttpBase()}/queue/status?userId=${encodeURIComponent(userId)}`, {
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { error: "Game server unavailable — run npm run dev" },
      { status: 503 },
    );
  }
}
