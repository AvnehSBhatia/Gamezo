"use client";

import { DecorativeBackdrop } from "@/components/gamezo/common/decorative-backdrop";
import { LogoLockup } from "@/components/gamezo/common/logo-lockup";
import { DemoGamePanel } from "@/components/gamezo/demo/demo-game-panel";
import { DemoTopBar } from "@/components/gamezo/demo/demo-top-bar";
import { PlayerCameraCard } from "@/components/gamezo/game/player-camera-card";
import { storeMatchFromWs } from "@/components/gamezo/game/session";
import type { GamePhase } from "@/components/gamezo/game/game-types";
import { storeJudgeResult } from "@/lib/api/game-submission";
import { applyDemoInput, injectDemoRelay, parseDemoMessage } from "@/lib/demo-input-relay";
import { useMatchSession } from "@/lib/use-match-session";
import { useSafeNavigate } from "@/lib/use-safe-navigate";
import { useGameSocket } from "@/lib/useGameSocket";
import { useWebcam } from "@/lib/useWebcam";
import { useWebRTC } from "@/lib/useWebRTC";
import { useCallback, useEffect, useRef, useState } from "react";

export function GamezoDemoPage() {
  const navigate = useSafeNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { roomId, userId, yourSlot, hydrated } = useMatchSession();

  const [phase, setPhase] = useState<GamePhase>("RUN_PHASE");
  const [demoPlayer, setDemoPlayer] = useState<"playerA" | "playerB" | null>("playerA");
  const [demoHtml, setDemoHtml] = useState("");
  const [demoSeconds, setDemoSeconds] = useState(30);
  const [demoIndex, setDemoIndex] = useState(0);

  const { attachStream, getStream, hasCamera } = useWebcam();
  const { attachPeerStream, hasRemoteStream } = useWebRTC({
    roomId,
    userId,
    getLocalStream: getStream,
    enabled: !!roomId && !!userId,
  });

  const handlePhase = useCallback((msg: Record<string, unknown>) => {
    const newPhase = String(msg.state) as GamePhase;
    setPhase(newPhase);

    if (msg.demoPlayer === "playerA" || msg.demoPlayer === "playerB") {
      setDemoPlayer(msg.demoPlayer);
    }
    if (typeof msg.demoHtml === "string") {
      setDemoHtml(injectDemoRelay(msg.demoHtml));
    }
    if (typeof msg.demoRemainingMs === "number") {
      setDemoSeconds(Math.max(0, Math.ceil(Number(msg.demoRemainingMs) / 1000)));
    }
    if (typeof msg.demoIndex === "number") setDemoIndex(Number(msg.demoIndex));

    if (newPhase === "GRADING" || newPhase === "COMPLETE") {
      navigate("/judging");
    }
  }, [navigate]);

  const { send } = useGameSocket({
    "phase-change": handlePhase,
    "sync-state": (msg) => {
      handlePhase(msg);
      if (typeof msg.demoHtml === "string") setDemoHtml(injectDemoRelay(String(msg.demoHtml)));
    },
    "demo-input": (msg) => {
      applyDemoInput(iframeRef.current, msg.event as Parameters<typeof applyDemoInput>[1]);
    },
    "grade-complete": (msg) => {
      if (msg.judgeResult) storeJudgeResult(msg.judgeResult as Parameters<typeof storeJudgeResult>[0]);
      navigate("/judging");
    },
    "rematch-start": (msg) => {
      storeMatchFromWs(msg);
      navigate("/game");
    },
    "return-to-queue": () => {
      navigate("/matchmaking");
    },
    error: (msg) => console.error("[demo-ws]", msg.message),
  });

  useEffect(() => {
    if (!hydrated) return;
    if (!roomId) {
      navigate("/matchmaking");
      return;
    }
    send({ type: "join-room", userId, roomId });
  }, [hydrated, roomId, send, userId, navigate]);

  useEffect(() => {
    if (phase !== "RUN_PHASE" || demoSeconds <= 0) return;
    const timer = setTimeout(() => setDemoSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(timer);
  }, [phase, demoSeconds]);

  useEffect(() => {
    function onMessage(ev: MessageEvent) {
      const parsed = parseDemoMessage(ev.data);
      if (!parsed || !roomId) return;
      if (yourSlot !== demoPlayer) return;
      send({ type: "demo-input", userId, roomId, event: parsed });
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [demoPlayer, roomId, send, userId, yourSlot]);

  const isDemoing = hydrated && yourSlot === demoPlayer;
  const demoLabel = demoIndex === 0 ? "Round 1" : "Round 2";
  const playerLabel = demoPlayer === "playerA" ? "Blue" : "Orange";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fffdf8] px-4 pb-8 text-neutral-950">
      <DecorativeBackdrop />
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between py-5">
        <LogoLockup compact />
        <DemoTopBar demoLabel={demoLabel} playerLabel={playerLabel} seconds={demoSeconds} isDemoing={isDemoing} />
      </header>

      <section className="relative z-10 mx-auto grid max-w-7xl gap-5 lg:grid-cols-[18rem_1fr_18rem]">
        <PlayerCameraCard
          label="You"
          tone="blue"
          videoRef={attachStream}
          hasCamera={hasCamera}
          note={isDemoing ? "You are demoing" : undefined}
        />
        <DemoGamePanel
          iframeRef={iframeRef}
          html={demoHtml}
          isDemoing={isDemoing}
          playerLabel={playerLabel}
        />
        <PlayerCameraCard
          label="Opponent"
          tone="orange"
          videoRef={attachPeerStream}
          hasCamera={hasRemoteStream}
        />
      </section>
    </main>
  );
}
