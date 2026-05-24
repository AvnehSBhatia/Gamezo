import { NextResponse } from "next/server";
import { matchTransportMode } from "@/lib/match/serverless-mode";

export async function GET() {
  return NextResponse.json({
    transport: matchTransportMode(),
    serverless: matchTransportMode() === "polling",
  });
}
