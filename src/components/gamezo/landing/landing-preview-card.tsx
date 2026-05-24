"use client";

import { Bot, Clock, Monitor, Sparkles, Star } from "lucide-react";

export function LandingPreviewCard() {
  return (
    <section className="relative z-10 mx-auto mt-8 w-[min(74rem,calc(100%-2rem))] rounded-[1.75rem] border-2 border-neutral-950 bg-white/95 p-4 shadow-[0_24px_70px_rgba(15,23,42,0.16)] sm:p-6">
      <div className="flex flex-col gap-4 border-b border-neutral-200 pb-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-blue-500 bg-blue-50 text-blue-600">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-base font-black">Anonymous</p>
              <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-black text-white">P1</span>
            </div>
            <p className="text-sm font-semibold text-neutral-500">Ready to build</p>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 rounded-2xl border-2 border-neutral-950 bg-white px-4 py-2 text-2xl font-black tabular-nums">
            <Clock className="h-6 w-6" />
            01:00
          </div>
          <div className="mt-2 flex items-center gap-1">
            {Array.from({ length: 16 }).map((_, index) => (
              <span
                key={index}
                className={`h-1.5 w-1.5 rounded-full ${index < 8 ? "bg-blue-500" : "bg-orange-500"}`}
              />
            ))}
          </div>
          <p className="mt-1 text-sm font-black">VS</p>
        </div>

        <div className="flex items-center justify-end gap-3">
          <div className="text-right">
            <div className="flex items-center justify-end gap-2">
              <span className="rounded-full bg-orange-500 px-2 py-0.5 text-xs font-black text-white">P2</span>
              <p className="text-base font-black">Anonymous</p>
            </div>
            <p className="text-sm font-semibold text-neutral-500">Let&apos;s go</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-orange-500 bg-orange-50 text-orange-600">
            <Bot className="h-6 w-6" />
          </div>
        </div>
      </div>

      <div className="grid gap-5 pt-5 md:grid-cols-[1fr_1.1fr_1fr]">
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm font-black">
            <Sparkles className="h-4 w-4 text-blue-600" />
            AI Chat
          </div>
          <div className="space-y-3 text-sm font-semibold">
            <div className="max-w-[15rem] rounded-2xl bg-blue-100 px-4 py-3 text-neutral-900">
              Add a moving platform that reverses direction.
            </div>
            <div className="ml-auto max-w-[15rem] rounded-2xl bg-orange-100 px-4 py-3 text-neutral-900">
              Done. Added toggling spikes and coin chaos.
            </div>
          </div>
        </div>

        <div className="border-y border-neutral-200 py-4 md:border-x md:border-y-0 md:px-5 md:py-0">
          <div className="mb-3 flex items-center gap-2 text-sm font-black">
            <Monitor className="h-4 w-4" />
            Game Preview
          </div>
          <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border-2 border-neutral-950 bg-sky-300">
            <div className="absolute inset-0 bg-[linear-gradient(#4cb3ff,#95d9ff_58%,#214e7d_59%,#214e7d)]" />
            <div className="absolute bottom-5 left-0 right-0 h-8 bg-[repeating-linear-gradient(90deg,#26383c_0_28px,#1b2c30_28px_56px)]" />
            <div className="absolute bottom-12 left-10 h-9 w-24 rounded-md bg-blue-600 shadow-[inset_0_5px_0_rgba(255,255,255,0.25)]" />
            <div className="absolute bottom-12 right-10 h-8 w-24 rounded-md bg-orange-500" />
            <div className="absolute right-8 top-5 flex gap-2 rounded-xl bg-neutral-950/80 px-3 py-1 text-xs font-black text-white">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              12
              <Clock className="h-4 w-4" />
              45
            </div>
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center gap-2 text-sm font-black">
            <Sparkles className="h-4 w-4 text-orange-500" />
            What we built
          </div>
          <div className="flex flex-wrap gap-3">
            <span className="rounded-xl bg-blue-100 px-4 py-3 text-sm font-black text-blue-700">Moving Platforms</span>
            <span className="rounded-xl bg-orange-100 px-4 py-3 text-sm font-black text-orange-700">Spikes</span>
            <span className="rounded-xl bg-cyan-100 px-4 py-3 text-sm font-black text-cyan-700">Score System</span>
          </div>
          <p className="mt-4 text-sm font-semibold text-neutral-500">... and more</p>
        </div>
      </div>
    </section>
  );
}
