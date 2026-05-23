"use client";

import { DecorativeBackdrop } from "@/components/gamezo/common/decorative-backdrop";
import { LogoLockup } from "@/components/gamezo/common/logo-lockup";
import { JudgeScoreCard } from "@/components/gamezo/judging/judge-score-card";
import { Bot, Heart, Home, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const youScores = [
  { label: "Product completeness", value: 88 },
  { label: "Innovation", value: 92 },
  { label: "Technical execution", value: 84 },
  { label: "Design experience", value: 90 },
  { label: "Commercial potential", value: 78 },
];

const opponentScores = [
  { label: "Product completeness", value: 80 },
  { label: "Innovation", value: 76 },
  { label: "Technical execution", value: 86 },
  { label: "Design experience", value: 74 },
  { label: "Commercial potential", value: 82 },
];

const lines = [
  "The builds are in. The judge is looking for complete, original, playable chaos.",
  "Blue shipped stronger moment-to-moment delight and clearer controls.",
  "Orange had commercial polish, but fewer surprising mechanics.",
  "The crowd gets the final say.",
];

export function GamezoJudgingPage() {
  const router = useRouter();
  const [lineIndex, setLineIndex] = useState(0);
  const [animate, setAnimate] = useState(false);
  const [winner, setWinner] = useState<"you" | "opponent" | null>(null);

  useEffect(() => {
    if (lineIndex < lines.length - 1) {
      const timer = setTimeout(() => setLineIndex((index) => index + 1), 1400);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setAnimate(true), 500);
    return () => clearTimeout(timer);
  }, [lineIndex]);

  const youTotal = youScores.reduce((sum, score) => sum + score.value, 0);
  const opponentTotal = opponentScores.reduce((sum, score) => sum + score.value, 0);
  const scoreWinner = youTotal >= opponentTotal ? "you" : "opponent";
  const finalWinner = winner ?? scoreWinner;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fffdf8] px-4 pb-10 text-neutral-950">
      <DecorativeBackdrop />
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between py-5">
        <LogoLockup compact />
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 rounded-full border-2 border-neutral-950 bg-white px-5 py-2 text-sm font-black shadow-sm"
        >
          <Home className="h-4 w-4" />
          Home
        </button>
      </header>

      <section className="relative z-10 mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 rounded-[2rem] border-2 border-neutral-950 bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.12)] sm:flex-row sm:items-start">
          <span className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-500">
            <Bot className="h-12 w-12" />
          </span>
          <div>
            <p className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-neutral-400">Judge vote criteria</p>
            <div className="space-y-2">
              {lines.slice(0, lineIndex + 1).map((line, index) => (
                <p key={line} className={`text-lg font-bold leading-snug ${index === lineIndex ? "text-neutral-950" : "text-neutral-500"}`}>
                  {line}
                </p>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
          <JudgeScoreCard title="Blue build" tone="blue" categories={youScores} animate={animate} />
          <div className="flex justify-center">
            <span className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-neutral-950 bg-white text-3xl font-black shadow-lg">
              VS
            </span>
          </div>
          <JudgeScoreCard title="Orange build" tone="orange" categories={opponentScores} animate={animate} />
        </div>

        {animate && !winner && (
          <div className="mt-7 rounded-[2rem] border-2 border-neutral-950 bg-white p-5 text-center shadow-lg">
            <p className="mb-5 text-2xl font-black">Crowd vote: who won?</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <button
                onClick={() => setWinner("you")}
                className="flex items-center justify-center gap-3 rounded-3xl border-2 border-blue-300 bg-blue-50 px-5 py-6 text-2xl font-black text-blue-600"
              >
                <Heart className="h-7 w-7" />
                Vote Blue
              </button>
              <button
                onClick={() => setWinner("opponent")}
                className="flex items-center justify-center gap-3 rounded-3xl border-2 border-orange-300 bg-orange-50 px-5 py-6 text-2xl font-black text-orange-600"
              >
                <Heart className="h-7 w-7" />
                Vote Orange
              </button>
            </div>
          </div>
        )}

        {winner && (
          <div className={`mt-7 rounded-[2rem] border-2 p-8 text-center shadow-lg ${finalWinner === "you" ? "border-blue-300 bg-blue-50" : "border-orange-300 bg-orange-50"}`}>
            <Trophy className={`mx-auto mb-3 h-16 w-16 ${finalWinner === "you" ? "text-blue-600" : "text-orange-500"}`} />
            <p className="text-4xl font-black">{finalWinner === "you" ? "Blue takes the match" : "Orange takes the match"}</p>
            <p className="mt-2 text-lg font-bold text-neutral-600">Judged score: {youTotal} vs {opponentTotal}</p>
            <button
              onClick={() => router.push("/matchmaking")}
              className="mt-6 rounded-2xl border-2 border-neutral-950 bg-orange-500 px-8 py-4 text-xl font-black text-white shadow-[0_5px_0_#111]"
            >
              Play again
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
