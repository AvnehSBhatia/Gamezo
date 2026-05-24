import { NextRequest, NextResponse } from "next/server";

/**
 * Anti-abuse rate limit for the public AI endpoints. NOT auth — Gamezo runs
 * anonymous-direct. This exists only so a single client can't trivially drain
 * the LLM budget by tight-looping a request.
 *
 * In-memory only — fine for single-instance Vercel cold starts; replace with
 * a KV-backed limiter when you outgrow that.
 */

interface Bucket {
  tokens: number;
  refilledAt: number;
}

interface BucketConfig {
  capacity: number;
  refillPerSec: number;
}

const buckets = new Map<string, Bucket>();

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

function consume(key: string, cfg: BucketConfig): boolean {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { tokens: cfg.capacity, refilledAt: now };
    buckets.set(key, bucket);
  }
  const elapsedSec = (now - bucket.refilledAt) / 1000;
  if (elapsedSec > 0) {
    bucket.tokens = Math.min(cfg.capacity, bucket.tokens + elapsedSec * cfg.refillPerSec);
    bucket.refilledAt = now;
  }
  if (bucket.tokens < 1) return false;
  bucket.tokens -= 1;
  return true;
}

/**
 * Returns 429 when the caller is over budget, null when they may proceed.
 */
export function guardAiRequest(
  req: NextRequest,
  cfg: BucketConfig = { capacity: 20, refillPerSec: 0.2 },
): NextResponse | null {
  const ip = getClientIp(req);
  if (!consume(ip, cfg)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }
  return null;
}
