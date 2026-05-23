"use client";

import { Dice5, Sparkles } from "lucide-react";

interface ChaosSeedCardProps {
  error: string | null;
}

export function ChaosSeedCard({ error }: ChaosSeedCardProps) {
  return (
    <section className="relative z-10 mx-auto mt-8 w-[min(46rem,calc(100%-2rem))] rounded-3xl border border-neutral-200 bg-white p-5 shadow-[0_18px_46px_rgba(15,23,42,0.12)]">
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-neutral-950">
          <Dice5 className="h-12 w-12" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="mb-2 text-lg font-black">Your chaos seed</p>
          <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-blue-200 bg-blue-50/60 px-4 py-3">
            <p className="truncate text-base font-semibold sm:text-xl">
              a rhythm platformer where gravity argues back
            </p>
            <Sparkles className="h-6 w-6 flex-shrink-0 text-blue-600" />
          </div>
        </div>
      </div>
      {error && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-bold text-red-600">
          {error}
        </div>
      )}
    </section>
  );
}
