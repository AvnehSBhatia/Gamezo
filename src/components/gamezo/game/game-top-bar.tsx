"use client";

import { LogoLockup } from "@/components/gamezo/common/logo-lockup";
import { Bot, Copy, Timer, Zap } from "lucide-react";

interface GameTopBarProps {
  roomCode: string;
  timeStr: string;
  isUrgent: boolean;
  onReady: () => void;
}

export function GameTopBar({ roomCode, timeStr, isUrgent, onReady }: GameTopBarProps) {
  return (
    <header className="grid gap-3 px-4 py-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
      <div className="flex items-center gap-4">
        <LogoLockup compact />
        <div className="hidden items-center gap-3 rounded-2xl border-2 border-neutral-950 bg-white px-5 py-3 font-mono text-lg font-bold shadow-sm sm:flex">
          <span>#</span>
          {roomCode}
          <Copy className="h-5 w-5" />
        </div>
      </div>

      <div className={`rounded-[1.5rem] border-2 border-neutral-950 bg-white px-8 py-3 text-center shadow-sm ${isUrgent ? "text-red-500" : "text-neutral-950"}`}>
        <div className="flex items-center justify-center gap-3 text-5xl font-black tabular-nums leading-none">
          <Timer className="h-9 w-9" />
          {timeStr}
        </div>
        <p className="mt-1 text-sm font-black uppercase tracking-[0.18em] text-orange-500">5 min build battle</p>
      </div>

      <div className="flex items-center justify-start gap-3 lg:justify-end">
        <div className="hidden items-center gap-3 rounded-2xl border-2 border-neutral-950 bg-white px-5 py-3 font-bold shadow-sm sm:flex">
          <span className="h-3 w-3 rounded-full bg-blue-600" />
          Opponent building
          <Bot className="h-7 w-7 text-blue-600" />
        </div>
        <button
          onClick={onReady}
          className="flex min-h-14 items-center justify-center gap-3 rounded-2xl border-2 border-orange-700 bg-orange-500 px-8 text-xl font-black text-white shadow-[inset_0_5px_0_rgba(255,255,255,0.3),0_5px_0_#9a3412] transition-transform hover:-translate-y-0.5 active:translate-y-0.5"
        >
          I am Ready
          <Zap className="h-5 w-5 fill-white" />
        </button>
      </div>
    </header>
  );
}
