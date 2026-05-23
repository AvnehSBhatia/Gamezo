"use client";

import { Camera, UserRound } from "lucide-react";

interface VersusLobbyProps {
  ready: boolean;
}

export function VersusLobby({ ready }: VersusLobbyProps) {
  return (
    <section className="mx-auto mt-8 grid w-full max-w-5xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-5 sm:gap-10">
      <div className="flex flex-col items-center gap-4">
        <div className="relative flex aspect-square w-full max-w-[15rem] items-center justify-center rounded-full border-4 border-blue-200 bg-gradient-to-br from-blue-400 to-blue-600 shadow-[inset_0_16px_28px_rgba(255,255,255,0.45),0_24px_50px_rgba(0,92,255,0.18)]">
          <UserRound className="h-24 w-24 text-white/80" strokeWidth={1.6} />
          <span className="absolute bottom-5 flex h-12 w-12 items-center justify-center rounded-full bg-white text-blue-600 shadow-lg">
            <Camera className="h-6 w-6" />
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-5">
        <div className="flex h-28 w-28 items-center justify-center rounded-full border border-neutral-200 bg-white text-5xl font-black shadow-[0_20px_50px_rgba(15,23,42,0.12)]">
          <span className="text-blue-600">V</span>
          <span className="text-orange-500">S</span>
        </div>
        <div className="flex items-center gap-2">
          {Array.from({ length: 19 }).map((_, index) => (
            <span
              key={index}
              className={`h-2.5 w-2.5 rounded-full ${
                index === 9 ? "h-5 w-5 border-4 border-orange-500 bg-white" : index < 9 ? "bg-blue-500" : "bg-neutral-200"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className="relative flex aspect-square w-full max-w-[15rem] items-center justify-center rounded-full border-4 border-orange-200 bg-gradient-to-br from-yellow-300 to-orange-500 shadow-[inset_0_16px_28px_rgba(255,255,255,0.45),0_24px_50px_rgba(255,106,0,0.18)]">
          <UserRound className="h-24 w-24 text-white/80" strokeWidth={1.6} />
          <span className="absolute bottom-5 flex h-12 w-12 items-center justify-center rounded-full bg-white text-orange-600 shadow-lg">
            <Camera className="h-6 w-6" />
          </span>
        </div>
      </div>

      {ready && (
        <p className="col-span-3 text-center text-lg font-black text-green-600">
          Opponent found. Moving to the build room.
        </p>
      )}
    </section>
  );
}
