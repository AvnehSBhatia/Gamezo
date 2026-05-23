"use client";

import { DecorativeBackdrop } from "@/components/gamezo/common/decorative-backdrop";
import { LogoLockup } from "@/components/gamezo/common/logo-lockup";
import { JudgeScoreCard } from "@/components/gamezo/judging/judge-score-card";
import type { JudgeResult, MatchState } from "@/components/gamezo/game/game-types";
import { getMatchState } from "@/lib/api/game-submission";
import { useGameSocket } from "@/lib/useGameSocket";
import { Bot, Home, Play } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const JUDGE_LABELS = ["Creativity", "Fun", "Chaos", "Uniqueness"] as const;

function toCategories(scores: JudgeResult["playerA"]) {
  return JUDGE_LABELS.map((label) => ({
    label,
    value: (scores[label.toLowerCase() as keyof typeof scores] as number) * 10,
  }));
}

interface SpectatorPageProps {
  roomId: string;
}

export function GamezoSpectatorPage({ roomId }: SpectatorPageProps) {
  const [match, setMatch] = useState<MatchState | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const state = await getMatchState(roomId);
    setMatch(state);
    setLoading(false);
  }, [roomId]);

  const { send } = useGameSocket({
    "spectator-joined": (msg) => {
      setMatch(parseSpectatorMsg(msg));
      setLoading(false);
    },
    "grade-complete": () => { refresh(); },
    "phase-change": () => { refresh(); },
  });

  useEffect(() => {
    send({ type: "spectate", roomId });
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [roomId, send, refresh]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fffdf8]">
        <p className="text-xl font-black">Loading match…</p>
      </main>
    );
  }

  if (!match) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#fffdf8]">
        <p className="text-2xl font-black">Match not found</p>
        <Link href="/" className="rounded-2xl border-2 border-neutral-950 bg-orange-500 px-6 py-3 font-black text-white">
          Go home
        </Link>
      </main>
    );
  }

  const jr = match.judgeResult;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fffdf8] px-4 pb-10 text-neutral-950">
      <DecorativeBackdrop />
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between py-5">
        <LogoLockup compact />
        <div className="flex items-center gap-3">
          <span className="rounded-full border-2 border-neutral-950 bg-white px-4 py-2 text-sm font-black uppercase">
            {match.phase.replace("_", " ")}
          </span>
          <Link href="/" className="flex items-center gap-2 rounded-full border-2 border-neutral-950 bg-white px-5 py-2 text-sm font-black">
            <Home className="h-4 w-4" />
            Home
          </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-6xl">
        <div className="mb-6 rounded-[2rem] border-2 border-neutral-950 bg-white p-5 shadow-lg">
          <p className="text-sm font-black uppercase tracking-widest text-neutral-400">Spectator mode</p>
          <h1 className="mt-2 text-3xl font-black">Match #{roomId.slice(-8)}</h1>
          <p className="mt-2 font-bold text-neutral-600">Chaos seed: {match.chaosSeed}</p>
          {jr && (
            <div className="mt-4 flex items-start gap-3 rounded-2xl bg-orange-50 p-4">
              <Bot className="h-8 w-8 text-orange-500" />
              <p className="font-bold">{jr.commentary}</p>
            </div>
          )}
        </div>

        {jr && (
          <div className="mb-8 grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
            <JudgeScoreCard title="Player A" tone="blue" categories={toCategories(jr.playerA)} animate />
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-neutral-950 bg-white text-2xl font-black">VS</span>
            <JudgeScoreCard title="Player B" tone="orange" categories={toCategories(jr.playerB)} animate />
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {(["playerA", "playerB"] as const).map((slot, i) => (
            <article key={slot} className="overflow-hidden rounded-[1.5rem] border-2 border-neutral-950 bg-white shadow-lg">
              <header className={`flex items-center gap-2 px-4 py-3 font-black text-white ${i === 0 ? "bg-blue-600" : "bg-orange-500"}`}>
                <Play className="h-5 w-5" />
                {slot === "playerA" ? "Player A" : "Player B"}
                {match.prompts[slot] && <span className="ml-auto max-w-[50%] truncate text-sm opacity-80">{match.prompts[slot]}</span>}
              </header>
              <div className="bg-neutral-950">
                {match.games[slot] ? (
                  <iframe title={`${slot} game`} sandbox="allow-scripts" srcDoc={match.games[slot]!} className="h-80 w-full" />
                ) : (
                  <div className="flex h-80 items-center justify-center text-neutral-500">No game yet</div>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function parseSpectatorMsg(msg: Record<string, unknown>): MatchState {
  return {
    roomId: String(msg.roomId ?? ""),
    phase: (msg.phase as MatchState["phase"]) ?? "COMPLETE",
    chaosSeed: String(msg.chaosSeed ?? ""),
    playerA: String(msg.playerA ?? ""),
    playerB: String(msg.playerB ?? ""),
    games: (msg.games as MatchState["games"]) ?? { playerA: null, playerB: null },
    prompts: (msg.prompts as MatchState["prompts"]) ?? { playerA: "", playerB: "" },
    judgeResult: (msg.judgeResult as JudgeResult) ?? null,
    votes: (msg.votes as MatchState["votes"]) ?? { playerA: null, playerB: null },
    finalWinner: String(msg.finalWinner ?? ""),
    createdAt: Number(msg.createdAt ?? 0),
  };
}
