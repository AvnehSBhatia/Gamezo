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
};

export async function enqueueMatch(userId: string): Promise<QueueResponse> {
  const res = await fetch("/api/match/queue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) throw new Error(`Enqueue failed (${res.status})`);
  return res.json() as Promise<QueueResponse>;
}

export async function pollMatchStatus(userId: string): Promise<QueueResponse> {
  const res = await fetch(`/api/match/queue?userId=${encodeURIComponent(userId)}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Poll failed (${res.status})`);
  return res.json() as Promise<QueueResponse>;
}
