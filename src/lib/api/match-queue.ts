import type { WsMessage } from "@/lib/useGameSocket";

export type QueueResponse = WsMessage & {
  type: string;
  previewSeed?: string;
  queueSize?: number;
  roomId?: string;
  yourSlot?: string;
  playerA?: string;
  playerB?: string;
  chaosSeed?: string;
  opponentIsBot?: boolean;
  error?: string;
};

async function readQueueError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    if (body.error) return body.error;
  } catch {
    // ignore
  }
  return `Matchmaking failed (${res.status})`;
}

export async function enqueueMatch(userId: string): Promise<QueueResponse> {
  const res = await fetch("/api/match/queue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) throw new Error(await readQueueError(res));
  return res.json() as Promise<QueueResponse>;
}

export async function pollMatchStatus(userId: string): Promise<QueueResponse> {
  const res = await fetch(`/api/match/queue?userId=${encodeURIComponent(userId)}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await readQueueError(res));
  return res.json() as Promise<QueueResponse>;
}

export async function leaveMatchQueue(userId: string): Promise<void> {
  const res = await fetch(`/api/match/queue?userId=${encodeURIComponent(userId)}`, {
    method: "DELETE",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await readQueueError(res));
}
