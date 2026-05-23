"use client";

import { DecorativeBackdrop } from "@/components/gamezo/common/decorative-backdrop";
import { LandingPreviewCard } from "@/components/gamezo/landing/landing-preview-card";
import { LandingSteps } from "@/components/gamezo/landing/landing-steps";
import { Play } from "lucide-react";
import { useRouter } from "next/navigation";

export function GamezoLandingPage() {
  const router = useRouter();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fffdf8] text-neutral-950">
      <DecorativeBackdrop />

      <nav className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5">
        <button
          onClick={() => router.push("/")}
          className="text-3xl font-black tracking-tight text-neutral-950 sm:text-4xl"
        >
          Gamezo
        </button>
        <div className="flex items-center gap-3 text-sm font-black sm:gap-8 sm:text-base">
          <a href="#how-it-works" className="hidden hover:text-blue-600 sm:inline">
            How it works
          </a>
          <button onClick={() => router.push("/judging")} className="hidden hover:text-blue-600 sm:inline">
            Spectate
          </button>
          <span className="rounded-full border-2 border-neutral-950 bg-white px-5 py-2">No login</span>
        </div>
      </nav>

      <section className="relative z-10 mx-auto flex max-w-6xl flex-col items-center px-5 pb-4 pt-6 text-center sm:pt-12">
        <h1 className="text-[clamp(4.5rem,13vw,9rem)] font-black leading-none tracking-tight text-neutral-950">
          Gamezo
        </h1>
        <p className="mt-4 max-w-3xl text-[clamp(2rem,5vw,4rem)] font-black leading-[1.04] tracking-tight">
          Build a game against a stranger in <span className="text-blue-600">5 minutes</span>
        </p>
        <div className="mt-8 flex w-full max-w-3xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-center">
          <button
            onClick={() => router.push("/matchmaking")}
            className="flex min-h-20 flex-1 items-center justify-center gap-5 rounded-[1.45rem] border-2 border-neutral-950 bg-orange-500 px-8 text-4xl font-black text-neutral-950 shadow-[inset_0_8px_0_rgba(255,255,255,0.35),0_8px_0_#111] transition-transform hover:-translate-y-1 active:translate-y-1 active:shadow-[inset_0_8px_0_rgba(255,255,255,0.35),0_2px_0_#111]"
          >
            Find Match
            <span aria-hidden>{"->"}</span>
          </button>
          <button
            onClick={() => router.push("/judging")}
            className="flex min-h-16 items-center justify-center gap-3 rounded-2xl border-2 border-neutral-950 bg-white px-8 text-xl font-black text-neutral-950 shadow-sm transition-transform hover:-translate-y-0.5"
          >
            <Play className="h-6 w-6 fill-neutral-950" />
            Watch Finals
          </button>
        </div>
      </section>

      <LandingPreviewCard />
      <div id="how-it-works">
        <LandingSteps />
      </div>
    </main>
  );
}
