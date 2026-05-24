"use client";

import type { WsMessage } from "@/lib/useGameSocket";
import { useGameSocket } from "@/lib/useGameSocket";
import { useCallback, useEffect, useRef, useState } from "react";

type Handler = (msg: WsMessage) => void;

async function postMatchAction(msg: WsMessage): Promise<boolean> {
  try {
    const res = await fetch("/api/match/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(msg),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Game transport: WebSocket (local / monolith) or HTTP polling (Vercel + Postgres).
 */
export function useMatchTransport(handlers: Record<string, Handler>) {
  const handlersRef = useRef(handlers);
  const sinceRef = useRef(0);
  const pollRoomRef = useRef<{ roomId: string; userId: string } | null>(null);
  const [mode, setMode] = useState<"websocket" | "polling" | "loading">("loading");

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    fetch("/api/match/config", { cache: "no-store" })
      .then((r) => r.json())
      .then((c: { transport?: string }) => setMode(c.transport === "polling" ? "polling" : "websocket"))
      .catch(() => setMode("websocket"));
  }, []);

  const ws = useGameSocket(mode === "websocket" ? handlers : {}, mode === "websocket");

  useEffect(() => {
    if (mode !== "polling") return;
    let alive = true;

    async function poll() {
      const ctx = pollRoomRef.current;
      if (!ctx || !alive) return;
      try {
        const res = await fetch(
          `/api/match/sync?roomId=${encodeURIComponent(ctx.roomId)}&userId=${encodeURIComponent(ctx.userId)}&since=${sinceRef.current}`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const data = (await res.json()) as { events?: Array<{ id?: number; type: string }> };
        for (const ev of data.events ?? []) {
          if (typeof ev.id === "number" && ev.id > 0) sinceRef.current = ev.id;
          const { id: _id, ...payload } = ev as { id?: number; type: string };
          const h = handlersRef.current[payload.type] ?? handlersRef.current["*"];
          h?.(payload as WsMessage);
        }
      } catch {
        // keep polling
      }
    }

    const timer = setInterval(() => void poll(), 800);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [mode]);

  const send = useCallback(
    (msg: WsMessage): boolean => {
      if (mode === "polling") {
        if (msg.type === "join-room" && msg.roomId && msg.userId) {
          pollRoomRef.current = { roomId: String(msg.roomId), userId: String(msg.userId) };
          sinceRef.current = 0;
        }
        void postMatchAction(msg);
        return true;
      }
      if (mode === "websocket") return ws.send(msg);
      return false;
    },
    [mode, ws],
  );

  const connected = mode === "polling" ? true : mode === "websocket" ? ws.connected : false;

  return { send, connected, mode };
}
