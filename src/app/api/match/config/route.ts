import { NextResponse } from "next/server";
import { matchBackendMode, matchTransportMode } from "@/lib/match/serverless-mode";

export async function GET() {
  const mode = matchBackendMode();
  return NextResponse.json({
    transport: matchTransportMode(),
    mode,
    polling: matchTransportMode() === "polling",
  });
}
