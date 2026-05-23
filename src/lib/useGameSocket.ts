"use client";

import { useEffect, useRef, useCallback, useState } from "react";

export type WsMessage = Record<string, unknown> & { type: string };
type Handler = (msg: WsMessage) => void;

export function getGameWsUrl(path: "/ws/game" | "/ws/signaling"): string {
  if (typeof window === "undefined") return `ws://localhost:3000${path}`;

  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}${path}`;
}

export function useGameSocket(handlers: Record<string, Handler>) {
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef(handlers);
  const queueRef = useRef<WsMessage[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    let alive = true;
    let ws: WebSocket;

    function flushQueue() {
      const socket = wsRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) return;
      while (queueRef.current.length > 0) {
        const msg = queueRef.current.shift();
        if (msg) socket.send(JSON.stringify(msg));
      }
    }

    function connect() {
      if (!alive) return;
      ws = new WebSocket(getGameWsUrl("/ws/game"));
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        flushQueue();
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data as string) as WsMessage;
          const h = handlersRef.current[msg.type] ?? handlersRef.current["*"];
          h?.(msg);
        } catch {
          // ignore malformed frames
        }
      };

      ws.onerror = () => setConnected(false);

      ws.onclose = () => {
        setConnected(false);
        if (alive) setTimeout(connect, 2000);
      };
    }

    connect();

    return () => {
      alive = false;
      queueRef.current = [];
      wsRef.current?.close();
    };
  }, []);

  const send = useCallback((msg: WsMessage): boolean => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
      return true;
    }
    queueRef.current.push(msg);
    return false;
  }, []);

  return { send, connected };
}

export function useSignalingSocket(handlers: Record<string, Handler>) {
  const wsRef = useRef<WebSocket | null>(null);
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
      ws = new WebSocket(getGameWsUrl("/ws/signaling"));
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data as string) as WsMessage;
          const h = handlersRef.current[msg.type] ?? handlersRef.current["*"];
          h?.(msg);
        } catch {
          // ignore
        }
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
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
      return true;
    }
    return false;
  }, []);

  return { send, connected };
}
