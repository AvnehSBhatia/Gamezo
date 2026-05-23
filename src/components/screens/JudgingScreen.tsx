"use client";
import { ASSETS } from "@/lib/assets";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Category = { label: string; you: number; opp: number };

interface StoredMetrics {
  playability?: number;
  completeness?: number;
  mobile?: number;
  chaos?: number;
}

function getStoredMetrics(): StoredMetrics {
  if (typeof window === "undefined") return {};
  const raw = sessionStorage.getItem("gamezo_submission_metrics");
  if (!raw) return {};
  try {
    return JSON.parse(raw) as StoredMetrics;
  } catch {
    return {};
  }
}

function getCategories(): Category[] {
  const metrics = getStoredMetrics();
  const playability = metrics.playability ?? 7;
  const completeness = metrics.completeness ?? 7;
  const mobile = metrics.mobile ?? 6;
  const chaos = metrics.chaos ?? 8;

  return [
    { label: "Playability", you: playability, opp: 7 },
    { label: "Completeness", you: completeness, opp: 7 },
    { label: "Mobile", you: mobile, opp: 6 },
    { label: "Chaos", you: chaos, opp: 6 },
  ];
}

function getGameTitle(): string {
  if (typeof window === "undefined") return "your game";
  return sessionStorage.getItem("gamezo_submission_title") ?? "your game";
}

function getJudgeLines(gameTitle: string): string[] {
  return [
    "Alright... time to judge the build.",
    `Blue shipped ${gameTitle} before the timer ran out.`,
    "Orange is the demo opponent baseline for this run.",
    "The score comes from the AI eval loop that reviewed the submitted game.",
  ];
}

export default function JudgingScreen() {
  const router = useRouter();
  const [lineIdx,    setLineIdx]    = useState(0);
  const [animBars,   setAnimBars]   = useState(false);
  const [voted,      setVoted]      = useState(false);
  const [winner,     setWinner]     = useState<"you" | "opponent" | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [categories] = useState(getCategories);
  const [gameTitle] = useState(getGameTitle);
  const [judgeLines] = useState(() => getJudgeLines(getGameTitle()));
  const [demoMode] = useState(() =>
    typeof window === "undefined"
      ? true
      : sessionStorage.getItem("gamezo_demo_mode") === "true",
  );

  // Type out judge lines
  useEffect(() => {
    if (lineIdx < judgeLines.length - 1) {
      const t = setTimeout(() => setLineIdx((l) => l + 1), 1600);
      return () => clearTimeout(t);
    }
    // Animate score bars after last line
    const t = setTimeout(() => setAnimBars(true), 800);
    return () => clearTimeout(t);
  }, [judgeLines.length, lineIdx]);

  function handleVote(w: "you" | "opponent") {
    if (voted) return;
    setVoted(true);
    setWinner(w);
    setTimeout(() => setShowResult(true), 500);
  }

  const youTotal  = categories.reduce((s, c) => s + c.you, 0);
  const oppTotal  = categories.reduce((s, c) => s + c.opp, 0);
  const youWon    = youTotal >= oppTotal;

  return (
    <div className="min-h-screen bg-[#FFFAF4] flex flex-col items-center relative overflow-x-hidden font-sans">
      {/* Blobs */}
      <img src={ASSETS.blueBlobHorizontal}   alt="" className="absolute -top-10 -left-12 w-56 opacity-40 pointer-events-none select-none" />
      <img src={ASSETS.orangeBlobHorizontal} alt="" className="absolute -top-10 -right-12 w-56 opacity-40 pointer-events-none select-none" />

      {/* Nav */}
      <nav className="w-full flex items-center justify-between px-4 sm:px-6 pt-4 pb-2 relative z-10">
        <div className="flex items-center gap-2">
          <img src={ASSETS.logoMark} alt="Gamezo" className="h-10 w-10" />
          <img src={ASSETS.wordmark} alt="Gamezo" className="h-8" />
        </div>
        <button onClick={() => router.push("/")} className="text-sm font-semibold text-neutral-500 hover:text-neutral-800 transition-colors">
          ← Home
        </button>
      </nav>

      <div className="flex flex-col items-center px-6 pt-6 pb-16 w-full max-w-xl z-10">

        {/* Judge speaking */}
        <div className="flex items-start gap-4 mb-8 w-full">
          <img src={ASSETS.judgeAvatar} alt="Judge" className="w-16 h-16 object-contain flex-shrink-0 mt-1" />
          <div className="flex-1 bg-white border-2 border-neutral-200 rounded-2xl rounded-tl-sm px-5 py-4 shadow-lg">
            <p className="text-xs text-neutral-400 font-bold mb-2 uppercase tracking-wider">
              {demoMode ? "Demo judging" : "Judge speaking..."}
            </p>
            <div className="space-y-1">
              {judgeLines.slice(0, lineIdx + 1).map((line, i) => (
                <p
                  key={i}
                  className={`text-sm leading-relaxed transition-all duration-500 ${
                    i === lineIdx ? "text-neutral-900 font-semibold" : "text-neutral-500"
                  }`}
                >
                  {line}
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* Score cards */}
        <div className="flex items-start gap-3 w-full mb-6">
          {/* YOU */}
          <div className="flex-1 bg-white rounded-3xl border-2 border-blue-200 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-400 px-4 py-3 flex items-center gap-2">
              <img src={ASSETS.avatarYou} alt="" className="w-8 h-8 object-contain" />
              <img src={ASSETS.labelYou}  alt="You" className="h-6 object-contain" />
            </div>
            <div className="p-4 space-y-3">
              {categories.map((c) => (
                <div key={c.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-neutral-600">{c.label}</span>
                    <span className="text-xs font-black text-blue-500">{animBars ? c.you : 0}/10</span>
                  </div>
                  <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                      style={{ width: animBars ? `${c.you * 10}%` : "0%" }}
                    />
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-500">Total</span>
                <span className="text-lg font-black text-blue-600">{animBars ? youTotal : 0}/40</span>
              </div>
            </div>
          </div>

          {/* VS */}
          <div className="flex items-center justify-center pt-16 flex-shrink-0">
            <img src={ASSETS.badgeVs} alt="VS" className="w-12 h-12 object-contain" />
          </div>

          {/* OPPONENT */}
          <div className="flex-1 bg-white rounded-3xl border-2 border-orange-200 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-orange-400 px-4 py-3 flex items-center gap-2">
              <img src={ASSETS.avatarOpponent}  alt=""           className="w-8 h-8 object-contain" />
              <img src={ASSETS.labelOpponent}   alt="Opponent"   className="h-6 object-contain" />
            </div>
            <div className="p-4 space-y-3">
              {categories.map((c) => (
                <div key={c.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-neutral-600">{c.label}</span>
                    <span className="text-xs font-black text-orange-500">{animBars ? c.opp : 0}/10</span>
                  </div>
                  <div className="h-2 bg-orange-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500 rounded-full transition-all duration-1000"
                      style={{ width: animBars ? `${c.opp * 10}%` : "0%" }}
                    />
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-500">Total</span>
                <span className="text-lg font-black text-orange-600">{animBars ? oppTotal : 0}/40</span>
              </div>
            </div>
          </div>
        </div>

        {/* Crowd vote section */}
        {animBars && !voted && (
          <div className="flex flex-col items-center gap-4 w-full animate-in fade-in zoom-in-95 duration-500">
            <p className="text-sm font-black text-neutral-700 uppercase tracking-wider">Crowd vote — who won?</p>
            <div className="flex items-center gap-4 w-full">
              <button
                onClick={() => handleVote("you")}
                className="flex-1 flex flex-col items-center gap-2 bg-blue-50 hover:bg-blue-100 border-2 border-blue-300 rounded-3xl py-4 transition-all hover:scale-[1.02] active:scale-[0.97]"
              >
                <img src={ASSETS.avatarYou}  alt="" className="w-12 h-12 object-contain" />
                <span className="text-sm font-black text-blue-600">Vote Blue</span>
              </button>
              <button
                onClick={() => handleVote("opponent")}
                className="flex-1 flex flex-col items-center gap-2 bg-orange-50 hover:bg-orange-100 border-2 border-orange-300 rounded-3xl py-4 transition-all hover:scale-[1.02] active:scale-[0.97]"
              >
                <img src={ASSETS.avatarOpponent} alt="" className="w-12 h-12 object-contain" />
                <span className="text-sm font-black text-orange-600">Vote Orange</span>
              </button>
            </div>
            <img src={ASSETS.buttonVoteWinner} alt="Vote!" className="h-14 object-contain opacity-60" />
          </div>
        )}

        {/* Post-vote result */}
        {voted && (
          <div className="flex flex-col items-center gap-4 w-full animate-in fade-in zoom-in-95 duration-700">
            {showResult && (
              <>
                <div className={`rounded-3xl px-8 py-6 text-center w-full border-2 ${youWon ? "bg-blue-50 border-blue-300" : "bg-orange-50 border-orange-300"}`}>
                  <img
                    src={youWon ? ASSETS.avatarYou : ASSETS.avatarOpponent}
                    alt="Winner"
                    className="w-20 h-20 object-contain mx-auto mb-3 drop-shadow-xl"
                  />
                  <p className="text-2xl font-black text-neutral-900 mb-1">
                    {winner === "you" ? "You won the crowd!" : "Opponent took the crowd"}
                  </p>
                  <p className="text-sm text-neutral-500">
                    {youWon
                      ? `${gameTitle}: ${youTotal}/40 vs ${oppTotal}/40`
                      : `Demo opponent: ${oppTotal}/40 vs ${youTotal}/40`}
                  </p>
                </div>
                <button
                  onClick={() => router.push("/")}
                  className="hover:scale-[1.03] active:scale-[0.97] transition-transform"
                >
                  <img src={ASSETS.buttonStartMatch} alt="Play again" className="h-14 object-contain" />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <img src={ASSETS.yellowBlobHorizontal} alt="" className="absolute bottom-0 left-1/2 -translate-x-1/2 w-72 opacity-20 pointer-events-none select-none" />
    </div>
  );
}
