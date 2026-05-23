import { type NextRequest, NextResponse } from "next/server";

/** Scheduled by `vercel.json#crons`. Authenticated via `CRON_SECRET`. */
export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 500 },
    );
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  return NextResponse.json(
    { error: "Push notifications are not configured for this app." },
    { status: 501 },
  );
}
