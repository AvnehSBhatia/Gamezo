"use client";

import { Code2, Heart, Play, Trophy, Zap } from "lucide-react";

const steps = [
  { icon: Zap, title: "Match", detail: "Get paired instantly" },
  { icon: Code2, title: "Build", detail: "Create with AI in 1 minute" },
  { icon: Play, title: "Demo", detail: "Show off your game live" },
  { icon: Heart, title: "Vote", detail: "The crowd decides the winner" },
  { icon: Trophy, title: "Get judged", detail: "Earn points and climb" },
];

export function LandingSteps() {
  return (
    <section className="relative z-10 mt-3 w-full rounded-t-[2rem] border-t-2 border-neutral-950 bg-white px-4 py-8 shadow-[0_-18px_50px_rgba(15,23,42,0.08)]">
      <h2 className="text-center text-3xl font-black tracking-tight text-neutral-950 sm:text-4xl">
        Build. Demo. Vote. Get judged.
      </h2>
      <div className="mx-auto mt-8 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {steps.map((step) => (
          <div key={step.title} className="flex items-center gap-4 rounded-2xl bg-white p-3">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white shadow-md">
              <step.icon className="h-7 w-7 text-orange-500" strokeWidth={2.6} />
            </div>
            <div>
              <p className="font-black text-neutral-950">{step.title}</p>
              <p className="text-sm font-semibold leading-snug text-neutral-500">{step.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
