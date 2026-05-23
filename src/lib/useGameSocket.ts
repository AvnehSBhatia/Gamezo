/**
 * Thin WebSocket client for the game WS endpoint.
 * Handles connect, send, reconnect, and typed message dispatch.
 *
 * WS connections go to the SAME host/port as the page — the custom
 * Next.js server proxies /ws/game and /ws/signaling to the backend.
 * This means ws://localhost:3001 is never used from the browser.
 */
"use client";
import { useEffect, useRef, useCallback, useState } from "react";

export type WsMessage = Record<string, unknown> & { type: string };
type Handler = (msg: WsMessage) => void;

/** Derive WS URL from current page origin so it works on any host/port */
function getWsBase(): string {
  if (typeof window === "undefined") return "ws://localhost:3000";
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}`;
}

export function useGameSocket(handlers: Record<string, Handler>) {
  const wsRef      = useRef<WebSocket | null>(null);
  const handlersRef = useRef(handlers);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    let alive = true;
    let ws: WebSocket;

    function connect() {
      if (!alive) return;
      ws = new WebSocket(`${getWsBase()}/ws/game`);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data as string) as WsMessage;
          const h = handlersRef.current[msg.type] ?? handlersRef.current["*"];
          h?.(msg);
        } catch {}
      };

      ws.onclose = () => {
        setConnected(false);
        if (alive) setTimeout(connect, 2000);
      };
    }

    connect();

    return () => {
      alive = false;
      wsRef.current?.close();
    };
  }, []); // only once

  const send = useCallback((msg: WsMessage): boolean => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
      return true;
    }
    return false;
  }, []);

  return { send, connected };
}

export function useSignalingSocket(handlers: Record<string, Handler>) {
  const wsRef       = useRef<WebSocket | null>(null);
  const handlersRef = useRef(handlers);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    let alive = true;
    let ws: WebSocket;

    function connect() {
      if (!alive) return;
      ws = new WebSocket(`${getWsBase()}/ws/signaling`);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data as string) as WsMessage;
          const h = handlersRef.current[msg.type] ?? handlersRef.current["*"];
          h?.(msg);
        } catch {}
      };

      ws.onclose = () => {
        setConnected(false);
        if (alive) setTimeout(connect, 2000);
      };
    }

    connect();

    return () => {
      alive = false;
      wsRef.current?.close();
    };
  }, []);

  const send = useCallback((msg: WsMessage): boolean => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
      return true;
    }
    return false;
  }, []);

  return { send, connected };
}
