import type { MatchRoomState } from "@/lib/match/types";

export interface QueueEntry {
  userId: string;
  joinedAt: number;
  lastSeenAt: number;
  previewSeed: string;
}

export interface MatchEvent {
  id: number;
  payload: Record<string, unknown>;
}

export interface MemoryMatchStore {
  queue: Map<string, QueueEntry>;
  rooms: Map<string, MatchRoomState>;
  userRoom: Map<string, string>;
  events: Map<string, MatchEvent[]>;
  nextEventId: number;
}

const STORE_KEY = "__gamezoMemoryMatch";

export function getMemoryStore(): MemoryMatchStore {
  const g = globalThis as typeof globalThis & { [STORE_KEY]?: MemoryMatchStore };
  if (!g[STORE_KEY]) {
    g[STORE_KEY] = {
      queue: new Map(),
      rooms: new Map(),
      userRoom: new Map(),
      events: new Map(),
      nextEventId: 1,
    };
  }
  return g[STORE_KEY];
}
