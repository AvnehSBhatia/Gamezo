"use client";

import { DecorativeBackdrop } from "@/components/gamezo/common/decorative-backdrop";
import { LogoLockup } from "@/components/gamezo/common/logo-lockup";
import { JudgeScoreCard } from "@/components/gamezo/judging/judge-score-card";
import { JudgingPlayPanel } from "@/components/gamezo/judging/judging-play-panel";
import type { JudgeResult } from "@/components/gamezo/game/game-types";
import {
  clearMatchSession,
  copyShareUrl,
  getShareUrl,
} from "@/components/gamezo/game/session";
import { getMatchState, loadJudgeResult, storeJudgeResult } from "@/lib/api/game-submission";
import { useMatchSession } from "@/lib/use-match-session";
import { useGameSocket } from "@/lib/useGameSocket";
import { Bot, Copy, Heart, Home, RefreshCw, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const JUDGE_LABELS = ["Creativity", "Fun", "Chaos", "Uniqueness"] as const;

function toCategories(scores: JudgeResult["playerA"]) {
  return JUDGE_LABELS.map((label) => ({
    label,
    value: scores[label.toLowerCase() as keyof typeof scores] as number * 10,
  }));
}

export function GamezoJudgingPage() {
  const router = useRouter();
  const { roomId, userId, yourSlot, hydrated } = useMatchSession();

  const [judgeResult, setJudgeResult] = useState<JudgeResult | null>(() => loadJudgeResult());
  const [commentary, setCommentary] = useState("");
  const [lineIndex, setLineIndex] = useState(0);
  const [animate, setAnimate] = useState(false);
  const [peerVote, setPeerVote] = useState<"playerA" | "playerB" | null>(null);
  const [votes, setVotes] = useState<{ playerA: string | null; playerB: string | null }>({
    playerA: null,
    playerB: null,
  });
  const [rematchCount, setRematchCount] = useState(0);
  const [games, setGames] = useState<{ playerA: string | null; playerB: string | null }>({
    playerA: null,
    playerB: null,
  });

  const { send } = useGameSocket({
    "grade-complete": (msg) => {
      if (msg.judgeResult) {
        const jr = msg.judgeResult as JudgeResult;
        setJudgeResult(jr);
        storeJudgeResult(jr);
        setCommentary(jr.commentary);
      }
      if (msg.votes) setVotes(msg.votes as typeof votes);
    },
    "vote-update": (msg) => {
      if (msg.votes) setVotes(msg.votes as typeof votes);
    },
    "rematch-status": (msg) => {
      if (Array.isArray(msg.requests)) setRematchCount(msg.requests.length);
    },
    "rematch-start": () => router.push("/game"),
    "return-to-queue": () => {
      clearMatchSession();
      router.push("/matchmaking");
    },
    "sync-state": (msg) => {
      if (msg.judgeResult) {
        setJudgeResult(msg.judgeResult as JudgeResult);
        storeJudgeResult(msg.judgeResult as JudgeResult);
      }
    },
  });

  useEffect(() => {
    if (!hydrated || !roomId) return;
    send({ type: "join-room", userId, roomId });

    getMatchState(roomId).then((state) => {
      if (state?.games) setGames(state.games);
      if (state?.judgeResult) {
        setJudgeResult(state.judgeResult);
        storeJudgeResult(state.judgeResult);
        setCommentary(state.judgeResult.commentary);
      }
      if (state?.votes) setVotes(state.votes);
    });
  }, [hydrated, roomId, send, userId]);

  const lines = useMemo(() => {
    if (!judgeResult) {
      return ["The builds are in. The AI judge is deliberating…", "Evaluating creativity, fun, chaos, and uniqueness…"];
    }
    return [
      "The builds are in. The judge is looking for complete, original, playable chaos.",
      judgeResult.commentary,
      "Cast your vote for your opponent's game!",
    ];
  }, [judgeResult]);

  useEffect(() => {
    if (lineIndex < lines.length - 1) {
      const timer = setTimeout(() => setLineIndex((i) => i + 1), 1400);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setAnimate(true), 500);
    return () => clearTimeout(timer);
  }, [lineIndex, lines.length]);

  const youScores = judgeResult
    ? toCategories(yourSlot === "playerB" ? judgeResult.playerB : judgeResult.playerA)
    : JUDGE_LABELS.map((l) => ({ label: l, value: 0 }));

  const opponentScores = judgeResult
    ? toCategories(yourSlot === "playerB" ? judgeResult.playerA : judgeResult.playerB)
    : JUDGE_LABELS.map((l) => ({ label: l, value: 0 }));

  const youTotal = youScores.reduce((s, c) => s + c.value, 0) / 10;
  const opponentTotal = opponentScores.reduce((s, c) => s + c.value, 0) / 10;

  let finalScoreYou = youTotal;
  let finalScoreOpp = opponentTotal;
  if (votes.playerB === (yourSlot === "playerA" ? "playerA" : "playerB")) finalScoreYou += 10;
  if (votes.playerA === (yourSlot === "playerB" ? "playerA" : "playerB")) finalScoreOpp += 10;

  const aiWinner = judgeResult?.winner;
  const youAreA = yourSlot === "playerA";
  const scoreWinner = finalScoreYou >= finalScoreOpp ? "you" : "opponent";
  const finalWinner = peerVote
    ? peerVote === (yourSlot === "playerA" ? "playerB" : "playerA")
      ? "opponent"
      : "you"
    : scoreWinner;

  function castVote(voteFor: "playerA" | "playerB") {
    if (!roomId || voteFor === yourSlot) return;
    setPeerVote(voteFor);
    send({ type: "vote", userId, roomId, voteFor });
  }

  function handleRematch() {
    if (!roomId) return;
    send({ type: "rematch", userId, roomId });
    toast.message(rematchCount >= 1 ? "Rematch starting…" : "Waiting for opponent…");
  }

  function handleFindNew() {
    if (!roomId) return;
    clearMatchSession();
    send({ type: "find-new", userId, roomId });
    router.push("/matchmaking");
  }

  async function handleCopyLink() {
    if (!roomId) return;
    const ok = await copyShareUrl(roomId);
    if (ok) toast.success("Spectator link copied!");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fffdf8] px-4 pb-10 text-neutral-950">
      <DecorativeBackdrop />
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between py-5">
        <LogoLockup compact />
        <div className="flex gap-2">
          {roomId && (
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2 rounded-full border-2 border-neutral-950 bg-white px-5 py-2 text-sm font-black shadow-sm"
            >
              <Copy className="h-4 w-4" />
              Share
            </button>
          )}
        <Link href="/" className="flex items-center gap-2 rounded-full border-2 border-neutral-950 bg-white px-5 py-2 text-sm font-black shadow-sm">
          <Home className="h-4 w-4" />
          Home
        </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 rounded-[2rem] border-2 border-neutral-950 bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.12)] sm:flex-row sm:items-start">
          <span className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-500">
            <Bot className="h-12 w-12" />
          </span>
          <div>
            <p className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-neutral-400">AI Judge</p>
            <div className="space-y-2">
              {lines.slice(0, lineIndex + 1).map((line, index) => (
                <p key={index} className={`text-lg font-bold leading-snug ${index === lineIndex ? "text-neutral-950" : "text-neutral-500"}`}>
                  {line}
                </p>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
          <JudgeScoreCard title="Your build" tone="blue" categories={youScores} animate={animate} />
          <div className="flex justify-center">
            <span className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-neutral-950 bg-white text-3xl font-black shadow-lg">
              VS
            </span>
          </div>
          <JudgeScoreCard title="Opponent" tone="orange" categories={opponentScores} animate={animate} />
        </div>

        <JudgingPlayPanel
          opponentHtml={yourSlot === "playerA" ? games.playerB : games.playerA}
          yourHtml={yourSlot === "playerA" ? games.playerA : games.playerB}
        />

        {animate && !peerVote && judgeResult && (
          <div className="mt-7 rounded-[2rem] border-2 border-neutral-950 bg-white p-5 text-center shadow-lg">
            <p className="mb-5 text-2xl font-black">Vote for your opponent&apos;s game</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <button
                onClick={() => castVote(yourSlot === "playerA" ? "playerB" : "playerA")}
                className="flex items-center justify-center gap-3 rounded-3xl border-2 border-orange-300 bg-orange-50 px-5 py-6 text-2xl font-black text-orange-600"
              >
                <Heart className="h-7 w-7" />
                Vote Opponent
              </button>
            </div>
          </div>
        )}

        {animate && (peerVote || judgeResult) && (
          <div className={`mt-7 rounded-[2rem] border-2 p-8 text-center shadow-lg ${finalWinner === "you" ? "border-blue-300 bg-blue-50" : "border-orange-300 bg-orange-50"}`}>
            <Trophy className={`mx-auto mb-3 h-16 w-16 ${finalWinner === "you" ? "text-blue-600" : "text-orange-500"}`} />
            <p className="text-4xl font-black">{finalWinner === "you" ? "You take the match!" : "Opponent takes the match!"}</p>
            <p className="mt-2 text-lg font-bold text-neutral-600">
              AI score: {Math.round(youTotal)} vs {Math.round(opponentTotal)}
              {aiWinner && ` · AI picked ${aiWinner === (youAreA ? "playerA" : "playerB") ? "you" : "opponent"}`}
            </p>
            {roomId && (
              <p className="mt-2 text-sm font-semibold text-neutral-500">
                Spectator link: {getShareUrl(roomId)}
              </p>
            )}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={handleRematch}
                className="flex items-center justify-center gap-2 rounded-2xl border-2 border-neutral-950 bg-orange-500 px-8 py-4 text-xl font-black text-white shadow-[0_5px_0_#111]"
              >
                <RefreshCw className="h-5 w-5" />
                Rematch {rematchCount > 0 ? `(${rematchCount}/2)` : ""}
              </button>
              <button
                onClick={handleFindNew}
                className="flex items-center justify-center gap-2 rounded-2xl border-2 border-neutral-950 bg-white px-8 py-4 text-xl font-black shadow-sm"
              >
                <Users className="h-5 w-5" />
                Find new opponent
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
