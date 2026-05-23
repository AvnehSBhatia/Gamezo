"use client";

import { Timer } from "lucide-react";

interface DemoTopBarProps {
  demoLabel: string;
  playerLabel: string;
  seconds: number;
  isPlaying: boolean;
  isWatching: boolean;
}

export function DemoTopBar({ demoLabel, playerLabel, seconds, isPlaying, isWatching }: DemoTopBarProps) {
  return (
    <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-4">
      <div className="rounded-2xl border-2 border-neutral-950 bg-white px-5 py-2 text-center shadow-sm">
        <p className="text-xs font-black uppercase tracking-widest text-neutral-400">{demoLabel}</p>
        <p className="text-lg font-black">
          {isPlaying ? `Playing ${playerLabel}'s game` : isWatching ? "Your game is live" : `${playerLabel} demo`}
        </p>
      </div>
      <div className={`flex items-center gap-2 rounded-2xl border-2 border-neutral-950 px-5 py-2 font-black tabular-nums shadow-sm ${seconds <= 5 ? "bg-red-50 text-red-600" : "bg-white"}`}>
        <Timer className="h-5 w-5" />
        0:{String(seconds).padStart(2, "0")}
      </div>
      {isPlaying && (
        <span className="rounded-full bg-green-500 px-3 py-1 text-xs font-black text-white">PLAYING</span>
      )}
      {isWatching && (
        <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-black text-white">WATCHING</span>
      )}
    </div>
  );
}
