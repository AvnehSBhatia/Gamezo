"use client";

import { DecorativeBackdrop } from "@/components/gamezo/common/decorative-backdrop";
import { LogoLockup } from "@/components/gamezo/common/logo-lockup";
import { StatusPill } from "@/components/gamezo/common/status-pill";
import { ChaosSeedCard } from "@/components/gamezo/matchmaking/chaos-seed-card";
import { VersusLobby } from "@/components/gamezo/matchmaking/versus-lobby";
import { getOrCreateUserId, storeMatchFromWs } from "@/components/gamezo/game/session";
import type { QueueResponse } from "@/lib/api/match-queue";
import { enqueueMatch, pollMatchStatus } from "@/lib/api/match-queue";
import { useSafeNavigate } from "@/lib/use-safe-navigate";
import { useGameSocket } from "@/lib/useGameSocket";
import { Camera, Clock, Link2, Mic, ShieldCheck, UserRound, Wifi, WifiOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export function GamezoMatchmakingPage() {
  const navigate = useSafeNavigate();
  const startedRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [opponentIsBot, setOpponentIsBot] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chaosSeed, setChaosSeed] = useState("Finding your chaos seed…");
  const [statusLine, setStatusLine] = useState("Joining matchmaking queue…");

  const handleMatched = useCallback((msg: QueueResponse) => {
    storeMatchFromWs(msg);
    if (msg.chaosSeed) setChaosSeed(String(msg.chaosSeed));
    setOpponentIsBot(Boolean(msg.opponentIsBot));
    setReady(true);
    setStatusLine("Opponent found!");
    setError(null);
  }, []);

  const { send, connected } = useGameSocket({
    matched: (msg) => handleMatched(msg as QueueResponse),
    error: (msg) => setError(String(msg.message)),
  });

  useEffect(() => {
    if (startedRef.current || ready) return;
    startedRef.current = true;

    const userId = getOrCreateUserId();
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    async function start() {
      try {
        const result = await enqueueMatch(userId);
        if (cancelled) return;

        if (result.type === "matched") {
          handleMatched(result);
          return;
        }

        if (result.previewSeed) setChaosSeed(String(result.previewSeed));
        setStatusLine("In queue — matching with next player or a sparring bot…");

        pollTimer = setInterval(async () => {
          try {
            const status = await pollMatchStatus(userId);
            if (cancelled) return;
            if (status.type === "matched") {
              if (pollTimer) clearInterval(pollTimer);
              handleMatched(status);
            }
          } catch {
            // keep polling
          }
        }, 1000);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Matchmaking failed — is the game server running? (npm run dev)",
          );
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [ready, handleMatched]);

  useEffect(() => {
    if (!connected || ready) return;
    send({ type: "enqueue", userId: getOrCreateUserId() });
  }, [connected, ready, send]);

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
          {ready ? "Opponent found!" : "Finding opponent…"}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg font-bold text-neutral-500">
          {ready
            ? opponentIsBot
              ? "Sparring bot matched — you'll still build and demo for real."
              : "Get ready — you'll lock prompts, then build for 5 minutes."
            : statusLine}
        </p>
        <div className="mx-auto mt-8 flex max-w-md flex-wrap items-center justify-center gap-4 text-sm font-black text-neutral-600">
          <span className="flex items-center gap-2"><Clock className="h-4 w-4" /> 5 min build</span>
          <span className="flex items-center gap-2"><UserRound className="h-4 w-4" /> 2 players</span>
          <span className="flex items-center gap-2"><Link2 className="h-4 w-4" /> Replay link after match</span>
        </div>
      </section>

      {ready ? <VersusLobby ready={ready} /> : null}
      <ChaosSeedCard seed={chaosSeed} error={error} />
    </main>
  );
}
