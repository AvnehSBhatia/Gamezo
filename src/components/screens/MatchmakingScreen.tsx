"use client";
import { ASSETS } from "@/lib/assets";
import { useGameSocket } from "@/lib/useGameSocket";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function getUserId(): string {
  if (typeof window === "undefined") return "usr_ssr";
  let id = sessionStorage.getItem("gamezo_userId");
  if (!id) {
    id = `usr_${Math.random().toString(36).slice(2, 12)}`;
    sessionStorage.setItem("gamezo_userId", id);
  }
  return id;
}

export default function MatchmakingScreen() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [roomInfo, setRoomInfo] = useState<{
    roomId: string; yourSlot: string; playerA: string; playerB: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { send, connected } = useGameSocket({
    queued: () => {
      // Just stay on searching — no fake steps
    },
    matched: (msg) => {
      const info = {
        roomId:   String(msg["roomId"]),
        yourSlot: String(msg["yourSlot"]),
        playerA:  String(msg["playerA"]),
        playerB:  String(msg["playerB"]),
      };
      setRoomInfo(info);
      setReady(true);
      sessionStorage.setItem("gamezo_roomId",  info.roomId);
      sessionStorage.setItem("gamezo_yourSlot", info.yourSlot);
      sessionStorage.setItem("gamezo_playerA",  info.playerA);
      sessionStorage.setItem("gamezo_playerB",  info.playerB);
    },
    "phase-change": (msg) => {
      if (msg["state"] === "BUILD_PHASE" || msg["state"] === "ROOM_READY") {
        router.push("/game");
      }
    },
    error: (msg) => setError(String(msg["message"])),
  });

  useEffect(() => {
    const userId = getUserId();
    const t = setTimeout(() => {
      send({ type: "enqueue", userId });
    }, 400);
    return () => clearTimeout(t);
  }, [send]);

  useEffect(() => {
    if (ready) return;
    const t = setTimeout(() => {
      if (connected || ready) return;
      const userId = getUserId();
      const info = {
        roomId: "demo-room",
        yourSlot: "demo",
        playerA: userId,
        playerB: "demo-opponent",
      };
      setRoomInfo(info);
      setReady(true);
      sessionStorage.setItem("gamezo_roomId", info.roomId);
      sessionStorage.setItem("gamezo_yourSlot", info.yourSlot);
      sessionStorage.setItem("gamezo_playerA", info.playerA);
      sessionStorage.setItem("gamezo_playerB", info.playerB);
      sessionStorage.setItem("gamezo_demo_mode", "true");
    }, 2400);
    return () => clearTimeout(t);
  }, [connected, ready]);

  return (
    <div className="min-h-screen bg-[#FFFAF4] flex flex-col items-center justify-center relative overflow-x-hidden font-sans px-6">
      <img src={ASSETS.blueBlobVertical}   alt="" className="absolute -top-10 -left-16 w-64 opacity-30 pointer-events-none" />
      <img src={ASSETS.orangeBlobVertical} alt="" className="absolute -top-10 -right-16 w-64 opacity-30 pointer-events-none" />

      <nav className="absolute top-4 left-4 sm:left-6 flex items-center gap-2">
        <img src={ASSETS.logoMark} alt="Gamezo" className="h-10 w-10" />
        <img src={ASSETS.wordmark}  alt="Gamezo" className="h-8" />
      </nav>

      <button onClick={() => router.push("/")} className="absolute top-4 right-4 sm:right-6 text-sm font-semibold text-neutral-500 hover:text-neutral-800">
        ← Back
      </button>

      <div className="flex flex-col items-center w-full max-w-md z-10">
        {!ready ? (
          <>
            <div className="relative mb-8">
              <img src={ASSETS.matchmakingOrb} alt="Searching" className="w-56 h-56 object-contain animate-pulse" />
              <div className="absolute w-56 h-56 rounded-full border-4 border-blue-300 animate-ping opacity-20" />
            </div>
            <h1 className="text-4xl font-black text-neutral-900 text-center mb-3">
              Finding opponent…
            </h1>
            <p className="text-neutral-500 text-base text-center max-w-xs">
              Matching you with the best stranger on the internet
            </p>
            {!connected && (
              <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Demo fallback starts automatically
              </p>
            )}
            {error && (
              <div className="mt-6 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 text-center">
                {error}
              </div>
            )}
            <button onClick={() => router.push("/")} className="mt-10 hover:scale-105 active:scale-95 transition-transform">
              <img src={ASSETS.buttonLeaveQueue} alt="Leave queue" className="h-14 object-contain" />
            </button>
          </>
        ) : (
          <>
            <h1 className="text-4xl font-black text-neutral-900 text-center mb-6">
              Opponent found! 🎉
            </h1>
            <div className="flex items-center gap-6 mb-8 animate-in fade-in zoom-in-95 duration-500">
              <div className="flex flex-col items-center gap-2">
                <img src={ASSETS.avatarYou} alt="You" className="w-28 h-28 object-contain drop-shadow-xl" />
                <img src={ASSETS.labelYou}  alt="You" className="h-9 object-contain" />
                <span className="text-xs text-blue-500 font-bold uppercase tracking-wider">{roomInfo?.yourSlot}</span>
              </div>
              <img src={ASSETS.badgeVs} alt="VS" className="w-16 h-16 object-contain" />
              <div className="flex flex-col items-center gap-2">
                <img src={ASSETS.avatarOpponent} alt="Opponent" className="w-28 h-28 object-contain drop-shadow-xl" />
                <img src={ASSETS.labelOpponent}  alt="Opponent" className="h-9 object-contain" />
              </div>
            </div>
            <p className="text-neutral-500 text-sm text-center mb-6">
              {roomInfo?.roomId === "demo-room"
                ? "Demo mode — build your game without waiting on the live server"
                : "Lock in — battle starts now"}
            </p>
            <button onClick={() => router.push("/game")} className="w-full hover:scale-[1.03] active:scale-[0.97] transition-transform">
              <img src={ASSETS.buttonStartMatch} alt="Start match" className="w-full object-contain drop-shadow-xl" />
            </button>
          </>
        )}
      </div>

      <img src={ASSETS.yellowBlobHorizontal} alt="" className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 opacity-20 pointer-events-none" />
    </div>
  );
}
