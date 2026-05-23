"use client";

import { ASSETS } from "@/lib/assets";
import { useGameSocket } from "@/lib/useGameSocket";
import type { JudgingResult, PlayerSlot, PublicMatchState } from "@/lib/gamezo-runtime";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

function getSession(key: string) {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(key) ?? "";
}

const CATEGORY_LABELS: Array<[keyof JudgingResult["scores"]["playerA"], string]> = [
  ["creativity", "Creativity"],
  ["fun", "Fun"],
  ["chaos", "Chaos"],
  ["uniqueness", "Uniqueness"],
  ["peerVote", "Peer vote"],
];

export default function JudgingScreen() {
  const router = useRouter();
  const [roomId] = useState(() => getSession("gamezo_roomId"));
  const [userId] = useState(() => getSession("gamezo_userId"));
  const [matchToken] = useState(() => getSession("gamezo_matchToken"));
  const [yourSlot] = useState<PlayerSlot>(() => getSession("gamezo_yourSlot") === "playerB" ? "playerB" : "playerA");
  const opponentSlot: PlayerSlot = yourSlot === "playerA" ? "playerB" : "playerA";
  const [match, setMatch] = useState<PublicMatchState | null>(null);
  const [result, setResult] = useState<JudgingResult | null>(null);
  const [vote, setVote] = useState<PlayerSlot | null>(null);
  const [loading, setLoading] = useState(() => Boolean(roomId));
  const [error, setError] = useState<string | null>(() => roomId ? null : "No active match found.");

  const { send, connected } = useGameSocket({
    "vote-update": (msg) => {
      setMatch((current) => current ? { ...current, votes: msg["votes"] as PublicMatchState["votes"] } : current);
    },
    "phase-change": (msg) => {
      setMatch((current) => current ? { ...current, phase: String(msg["state"]) as PublicMatchState["phase"] } : current);
    },
  });

  useEffect(() => {
    if (!roomId) {
      return;
    }
    let cancelled = false;
    async function load() {
      const response = await fetch(`/api/matches/${roomId}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Match not found");
      const data = await response.json() as PublicMatchState;
      if (cancelled) return;
      setMatch(data);
      setResult(data.judgingResult);
      setLoading(false);
    }
    load().catch((err) => {
      if (!cancelled) {
        setError(err instanceof Error ? err.message : "Failed to load match.");
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  useEffect(() => {
    if (!connected || !roomId || !userId) return;
    send({ type: "join-room", userId, roomId, matchToken });
  }, [connected, matchToken, roomId, send, userId]);

  async function castVote(slot: PlayerSlot) {
    if (vote || !roomId || !userId) return;
    setVote(slot);
    send({ type: "vote", roomId, userId, matchToken, votedFor: slot });
    const response = await fetch(`/api/matches/${roomId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, matchToken }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: "Judging failed" })) as { error?: string };
      setError(body.error ?? "Judging failed");
      return;
    }
    const judged = await response.json() as JudgingResult;
    setResult(judged);
  }

  const visibleResult = useMemo(() => result ?? match?.judgingResult ?? null, [match, result]);
  const youScores = visibleResult?.scores[yourSlot];
  const opponentScores = visibleResult?.scores[opponentSlot];
  const youWon = visibleResult?.winner === yourSlot;

  return (
    <div className="min-h-screen bg-[#FFFAF4] flex flex-col items-center relative overflow-x-hidden font-sans">
      <img src={ASSETS.blueBlobHorizontal} alt="" className="absolute -top-10 -left-12 w-56 opacity-40 pointer-events-none select-none" />
      <img src={ASSETS.orangeBlobHorizontal} alt="" className="absolute -top-10 -right-12 w-56 opacity-40 pointer-events-none select-none" />

      <nav className="w-full flex items-center justify-between px-4 sm:px-6 pt-4 pb-2 relative z-10">
        <div className="flex items-center gap-2">
          <img src={ASSETS.logoMark} alt="Gamezo" className="h-10 w-10" />
          <img src={ASSETS.wordmark} alt="Gamezo" className="h-8" />
        </div>
        <button onClick={() => router.push("/")} className="text-sm font-semibold text-neutral-500 hover:text-neutral-800 transition-colors">
          Home
        </button>
      </nav>

      <div className="flex flex-col items-center px-6 pt-6 pb-16 w-full max-w-3xl z-10">
        <div className="flex items-start gap-4 mb-8 w-full">
          <img src={ASSETS.judgeAvatar} alt="Judge" className="w-16 h-16 object-contain flex-shrink-0 mt-1" />
          <div className="flex-1 bg-white border-2 border-neutral-200 rounded-2xl rounded-tl-sm px-5 py-4 shadow-lg">
            <p className="text-xs text-neutral-400 font-bold mb-2 uppercase tracking-wider">Judge speaking</p>
            {loading && <p className="text-sm text-neutral-600">Loading match...</p>}
            {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
            {!loading && !visibleResult && !error && (
              <p className="text-sm text-neutral-600">Cast a peer vote to unlock the AI judge.</p>
            )}
            {visibleResult?.commentary.map((line) => (
              <p key={line} className="text-sm leading-relaxed text-neutral-700 font-semibold">{line}</p>
            ))}
          </div>
        </div>

        {!visibleResult && !loading && (
          <div className="flex flex-col items-center gap-4 w-full">
            <p className="text-sm font-black text-neutral-700 uppercase tracking-wider">Peer vote - who won?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              <button
                onClick={() => castVote(yourSlot)}
                className="flex flex-col items-center gap-2 bg-blue-50 hover:bg-blue-100 border-2 border-blue-300 rounded-3xl py-5 transition-all hover:scale-[1.02] active:scale-[0.97]"
              >
                <img src={ASSETS.avatarYou} alt="" className="w-14 h-14 object-contain" />
                <span className="text-sm font-black text-blue-600">Vote Blue</span>
              </button>
              <button
                onClick={() => castVote(opponentSlot)}
                className="flex flex-col items-center gap-2 bg-orange-50 hover:bg-orange-100 border-2 border-orange-300 rounded-3xl py-5 transition-all hover:scale-[1.02] active:scale-[0.97]"
              >
                <img src={ASSETS.avatarOpponent} alt="" className="w-14 h-14 object-contain" />
                <span className="text-sm font-black text-orange-600">Vote Orange</span>
              </button>
            </div>
          </div>
        )}

        {visibleResult && youScores && opponentScores && (
          <div className="w-full space-y-6">
            <div className={`rounded-3xl px-8 py-6 text-center border-2 ${youWon ? "bg-blue-50 border-blue-300" : "bg-orange-50 border-orange-300"}`}>
              <img
                src={youWon ? ASSETS.avatarYou : ASSETS.avatarOpponent}
                alt="Winner"
                className="w-20 h-20 object-contain mx-auto mb-3 drop-shadow-xl"
              />
              <p className="text-2xl font-black text-neutral-900 mb-1">
                {youWon ? "You won the match" : "Opponent won the match"}
              </p>
              <p className="text-sm text-neutral-500">
                {youScores.total} vs {opponentScores.total}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: "Blue", scores: youScores, avatar: ASSETS.avatarYou, color: "blue" },
                { label: "Orange", scores: opponentScores, avatar: ASSETS.avatarOpponent, color: "orange" },
              ].map((card) => (
                <div key={card.label} className="bg-white rounded-3xl border-2 border-neutral-200 shadow-lg overflow-hidden">
                  <div className={`px-4 py-3 flex items-center gap-2 ${card.color === "blue" ? "bg-blue-500" : "bg-orange-500"}`}>
                    <img src={card.avatar} alt="" className="w-8 h-8 object-contain" />
                    <span className="text-sm font-black text-white">{card.label}</span>
                  </div>
                  <div className="p-4 space-y-3">
                    {CATEGORY_LABELS.map(([key, label]) => (
                      <div key={key}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-neutral-600">{label}</span>
                          <span className="text-xs font-black text-neutral-800">{card.scores[key]}</span>
                        </div>
                        <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${card.color === "blue" ? "bg-blue-500" : "bg-orange-500"}`}
                            style={{ width: `${Math.min(100, card.scores[key])}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-500">Total</span>
                      <span className="text-lg font-black text-neutral-900">{card.scores.total}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => router.push("/matchmaking")}
              className="mx-auto block hover:scale-[1.03] active:scale-[0.97] transition-transform"
            >
              <img src={ASSETS.buttonStartMatch} alt="Play again" className="h-14 object-contain" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
