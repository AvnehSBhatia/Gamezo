"use client";

import { DecorativeBackdrop } from "@/components/gamezo/common/decorative-backdrop";
import { LogoLockup } from "@/components/gamezo/common/logo-lockup";
import { StatusPill } from "@/components/gamezo/common/status-pill";
import { ChaosSeedCard } from "@/components/gamezo/matchmaking/chaos-seed-card";
import { FindingOpponentLoader } from "@/components/gamezo/matchmaking/finding-opponent-loader";
import { VersusLobby } from "@/components/gamezo/matchmaking/versus-lobby";
import { getOrCreateUserId, storeMatchFromWs } from "@/components/gamezo/game/session";
import type { QueueResponse } from "@/lib/api/match-queue";
import { enqueueMatch, leaveMatchQueue, pollMatchStatus } from "@/lib/api/match-queue";
import { useSafeNavigate } from "@/lib/use-safe-navigate";
import { useMatchTransport } from "@/lib/useMatchTransport";
import { Camera, Clock, Link2, Mic, ShieldCheck, UserRound, Wifi, WifiOff } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export function GamezoMatchmakingPage() {
  const navigate = useSafeNavigate();
  const [ready, setReady] = useState(false);
  const [inviteHintVisible, setInviteHintVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chaosSeed, setChaosSeed] = useState("Finding your chaos seed…");
  const [statusLine, setStatusLine] = useState("Joining matchmaking queue…");

  const handleMatched = useCallback((msg: QueueResponse, userId: string) => {
    if (!isValidHumanMatch(msg, userId)) {
      setError("Matched room was unavailable. Still searching for another player…");
      return false;
    }
    storeMatchFromWs(msg);
    if (msg.chaosSeed) setChaosSeed(String(msg.chaosSeed));
    setReady(true);
    setInviteHintVisible(false);
    setStatusLine("Opponent found!");
    setError(null);
    return true;
  }, []);

  const { send, connected, mode } = useMatchTransport({
    matched: (msg) => {
      handleMatched(msg as QueueResponse, getOrCreateUserId());
    },
    error: (msg) => setError(String(msg.message)),
  });

  useEffect(() => {
    if (ready || mode === "loading") return;
    if (mode === "websocket" && !connected) {
      const timer = setTimeout(() => setStatusLine("Connecting to matchmaking…"), 0);
      return () => clearTimeout(timer);
    }

    const userId = getOrCreateUserId();
    let resetTimer: ReturnType<typeof setTimeout> | null = null;
    let inviteHintTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;
    let matched = false;

    resetTimer = setTimeout(() => {
      if (cancelled) return;
      setError(null);
      setInviteHintVisible(false);
    }, 0);
    inviteHintTimer = setTimeout(() => {
      if (!cancelled) setInviteHintVisible(true);
    }, 3000);

    async function enqueuePolling() {
      const result = await enqueueMatch(userId);
      if (cancelled) return;

      if (result.type === "matched") {
        matched = handleMatched(result, userId);
        return;
      }

      if (result.previewSeed) setChaosSeed(String(result.previewSeed));
      setStatusLine("In queue — matching with the next available player…");
    }

    async function pollUntilMatched() {
      let enqueued = false;

      while (!cancelled && !matched) {
        try {
          if (!enqueued) {
            await enqueuePolling();
            enqueued = true;
          }

          await wait(1000);
          if (cancelled) return;

          const status = await pollMatchStatus(userId);
          if (cancelled) return;

          if (status.type === "matched") {
            matched = handleMatched(status, userId);
            continue;
          }

          if (status.type === "idle") {
            enqueued = false;
            continue;
          }

          setError(null);
          setStatusLine("In queue — matching with the next available player…");
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Matchmaking connection hiccup — still trying.",
          );
          await wait(1000);
        }
      }
    }

    if (mode === "polling") {
      void pollUntilMatched();
    } else {
      resetTimer = setTimeout(() => {
        if (!cancelled) setStatusLine("In queue — matching with the next available player…");
      }, 0);
      send({ type: "enqueue", userId });
    }

    return () => {
      cancelled = true;
      if (resetTimer) clearTimeout(resetTimer);
      if (inviteHintTimer) clearTimeout(inviteHintTimer);
      if (!matched) {
        if (mode === "polling") {
          void leaveMatchQueue(userId).catch(() => {});
        } else {
          send({ type: "dequeue", userId });
        }
      }
    };
  }, [connected, mode, ready, send, handleMatched]);

  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => navigate("/game"), 900);
    return () => clearTimeout(timer);
  }, [ready, navigate]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fffdf8] pb-8 text-neutral-950">
      <DecorativeBackdrop />
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
        <LogoLockup compact />
        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          <StatusPill
            icon={connected ? Wifi : WifiOff}
            label={connected ? "Live sync on" : "Live sync connecting…"}
            tone={connected ? "green" : "blue"}
          />
          <StatusPill icon={Camera} label="Camera ready" tone="green" />
          <StatusPill icon={Mic} label="Mic ready" tone="green" />
          <StatusPill icon={ShieldCheck} label="Anonymous" tone="blue" />
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-4xl px-5 pt-4 text-center">
        <p className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-neutral-400">Matchmaking</p>
        <h1 className="text-[clamp(2.5rem,7vw,4.5rem)] font-black leading-none tracking-tight">
          {ready ? "Opponent found!" : <FindingOpponentLoader />}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg font-bold text-neutral-500">
          {ready
            ? "Get ready — you'll lock prompts, then build for 1 minute."
            : inviteHintVisible
              ? "Still searching — we'll keep trying until another player becomes available."
              : statusLine}
        </p>
        <div className="mx-auto mt-8 flex max-w-md flex-wrap items-center justify-center gap-4 text-sm font-black text-neutral-600">
          <span className="flex items-center gap-2"><Clock className="h-4 w-4" /> 1 min build</span>
          <span className="flex items-center gap-2"><UserRound className="h-4 w-4" /> 2 players</span>
          <span className="flex items-center gap-2"><Link2 className="h-4 w-4" /> Replay link after match</span>
        </div>
      </section>

      {ready ? <VersusLobby ready={ready} /> : null}
      <ChaosSeedCard seed={chaosSeed} error={error} />
    </main>
  );
}

function isValidHumanMatch(msg: QueueResponse, userId: string): boolean {
  if (msg.type !== "matched") return false;
  if (!msg.roomId || !msg.yourSlot) return false;
  if (!msg.playerA || !msg.playerB) return false;
  if (msg.playerA === msg.playerB) return false;
  if (msg.playerA !== userId && msg.playerB !== userId) return false;
  if (msg.opponentIsBot) return false;
  return !msg.playerA.startsWith("bot_") && !msg.playerB.startsWith("bot_");
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
