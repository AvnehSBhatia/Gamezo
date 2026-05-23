import { NextResponse } from "next/server";

const INVALID_KEY_MESSAGE =
  "EAZO_PRIVATE_KEY is invalid or revoked. Update .env with a valid key from your Eazo app dashboard.";

export function aiErrorResponse(err: unknown, logPrefix: string): NextResponse {
  const status = err && typeof err === "object" && "status" in err ? Number(err.status) : 0;
  const message =
    err && typeof err === "object" && "message" in err ? String(err.message) : "";

  if (status === 401 || message.includes("Invalid or revoked private key")) {
    console.error(`[${logPrefix}]`, INVALID_KEY_MESSAGE);
    return NextResponse.json({ error: INVALID_KEY_MESSAGE }, { status: 503 });
  }

  console.error(`[${logPrefix}]`, err);
  return NextResponse.json({ error: "AI request failed — check server logs." }, { status: 500 });
}
