"use client";

import { DecorativeBackdrop } from "@/components/gamezo/common/decorative-backdrop";
import { LogoLockup } from "@/components/gamezo/common/logo-lockup";
import { StatusPill } from "@/components/gamezo/common/status-pill";
import { ChaosSeedCard } from "@/components/gamezo/matchmaking/chaos-seed-card";
import { VersusLobby } from "@/components/gamezo/matchmaking/versus-lobby";
import { useGameSocket } from "@/lib/useGameSocket";
import { Camera, Clock, Link2, Mic, ShieldCheck, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getOrCreateUserId } from "@/components/gamezo/game/session";

export function GamezoMatchmakingPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { send } = useGameSocket({
    queued: () => setError(null),
    matched: (msg) => {
      const roomId = String(msg["roomId"]);
      const yourSlot = String(msg["yourSlot"]);
      sessionStorage.setItem("gamezo_roomId", roomId);
      sessionStorage.setItem("gamezo_yourSlot", yourSlot);
      sessionStorage.setItem("gamezo_playerA", String(msg["playerA"]));
      sessionStorage.setItem("gamezo_playerB", String(msg["playerB"]));
      setReady(true);
    },
    "phase-change": (msg) => {
      if (msg["state"] === "BUILD_PHASE" || msg["state"] === "ROOM_READY") router.push("/game");
    },
    error: (msg) => setError(String(msg["message"])),
  });

  useEffect(() => {
    const userId = getOrCreateUserId();
    const timer = setTimeout(() => send({ type: "enqueue", userId }), 400);
    return () => clearTimeout(timer);
  }, [send]);

  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => router.push("/game"), 900);
    return () => clearTimeout(timer);
  }, [ready, router]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fffdf8] pb-8 text-neutral-950">
      <DecorativeBackdrop />
      <div className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-6">
        <LogoLockup compact />
        <button
          onClick={() => router.push("/")}
          className="rounded-full border-2 border-neutral-950 bg-white px-5 py-2 text-sm font-black shadow-sm"
        >
          Back
        </button>
      </div>

      <section className="relative z-10 px-5 text-center">
        <h1 className="text-[clamp(3.25rem,8vw,5.75rem)] font-black leading-none tracking-tight">
          Finding opponent
        </h1>
        <p className="mt-4 text-sm font-black uppercase tracking-[0.18em] text-neutral-500">
          You&apos;re anonymous. We&apos;ll pair you with someone awesome.
        </p>
      </section>

      <VersusLobby ready={ready} />

      <section className="relative z-10 mx-auto mt-7 grid w-[min(46rem,calc(100%-2rem))] gap-4 sm:grid-cols-3">
        <StatusPill icon={Camera} label="Camera ready" tone="blue" />
        <StatusPill icon={Mic} label="Mic ready" tone="blue" />
        <StatusPill icon={ShieldCheck} label="No login" tone="orange" />
      </section>

      <ChaosSeedCard error={error} />

      <section className="relative z-10 mx-auto mt-6 grid w-[min(46rem,calc(100%-2rem))] gap-4 sm:grid-cols-3">
        <StatusPill icon={Clock} label="Average wait 8s" tone="blue" />
        <StatusPill icon={UserRound} label="Anonymous" tone="blue" />
        <StatusPill icon={Link2} label="Replay link after match" tone="orange" />
      </section>
    </main>
  );
}
