"use client";

import { DecorativeBackdrop } from "@/components/gamezo/common/decorative-backdrop";
import { LogoLockup } from "@/components/gamezo/common/logo-lockup";
import { PlayerCameraCard } from "@/components/gamezo/game/player-camera-card";
import { Bot, Code2, Info, Lock, Sparkles, Timer, Wand2, Wrench, Zap } from "lucide-react";
import type { RefCallback } from "react";

interface PromptLockScreenProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  onLock: () => void;
  attachStream: RefCallback<HTMLVideoElement>;
  attachPeerStream: RefCallback<HTMLVideoElement>;
  hasCamera: boolean;
}

export function PromptLockScreen({
  prompt,
  onPromptChange,
  onLock,
  attachStream,
  attachPeerStream,
  hasCamera,
}: PromptLockScreenProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fffdf8] px-4 pb-8 text-neutral-950">
      <DecorativeBackdrop />
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between py-5">
        <LogoLockup compact />
        <div className="hidden rounded-3xl border border-neutral-200 bg-white px-6 py-3 text-xl font-black shadow-md sm:flex sm:items-center sm:gap-3">
          <span className="h-5 w-5 rounded-full bg-green-500" />
          Opponent connected
        </div>
        <div className="flex gap-2">
          {[Info, Bot].map((Icon, index) => (
            <button key={index} className="flex h-12 w-12 items-center justify-center rounded-2xl border border-neutral-200 bg-white shadow-sm">
              <Icon className="h-6 w-6" />
            </button>
          ))}
        </div>
      </header>

      <section className="relative z-10 mx-0 grid w-full max-w-none items-start gap-5 lg:mx-auto lg:max-w-7xl lg:grid-cols-[22rem_1fr_22rem]">
        <PlayerCameraCard label="You" tone="blue" videoRef={attachStream} hasCamera={hasCamera} />

        <article className="min-w-0 rounded-[2rem] border-2 border-neutral-950 bg-white p-5 shadow-[0_18px_42px_rgba(15,23,42,0.08)] sm:p-7">
          <div className="mb-5 flex items-start justify-between gap-4">
            <h1 className="max-w-2xl text-[clamp(2rem,4.2vw,3.8rem)] font-black leading-[0.98] tracking-tight">
              <Sparkles className="mr-2 inline h-8 w-8 fill-yellow-300 text-yellow-300 sm:h-10 sm:w-10" />
              What chaotic game will you build?
            </h1>
            <Info className="h-8 w-8 flex-shrink-0 text-blue-600" />
          </div>

          <div className="relative">
            <textarea
              value={prompt}
              onChange={(event) => onPromptChange(event.target.value)}
              className="min-h-44 w-full resize-none rounded-3xl border-2 border-blue-500 bg-white px-5 py-5 font-mono text-xl font-bold leading-relaxed outline-none focus:ring-4 focus:ring-blue-100 sm:text-2xl"
              maxLength={200}
              placeholder="a boss fight where the floor is a keyboard"
            />
            <span className="absolute bottom-4 right-5 text-sm font-bold text-neutral-400">{prompt.length}/200</span>
          </div>

          <div className="mt-6">
            <p className="mb-3 flex items-center gap-2 text-xl font-black">
              <Sparkles className="h-5 w-5 text-blue-600" />
              AI helpers
            </p>
            <div className="flex flex-wrap gap-3">
              {[
                { icon: Bot, label: "add sprites" },
                { icon: Wand2, label: "make it weird" },
                { icon: Code2, label: "one-file HTML" },
                { icon: Zap, label: "fix bugs fast" },
              ].map((helper) => (
                <button
                  key={helper.label}
                  onClick={() => onPromptChange(`${prompt}${prompt ? ", " : ""}${helper.label}`)}
                  className="flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-black text-neutral-800"
                >
                  <helper.icon className="h-5 w-5 text-blue-600" />
                  {helper.label}
                </button>
              ))}
            </div>
          </div>
        </article>

        <PlayerCameraCard label="Opponent" tone="orange" videoRef={attachPeerStream} note="Opponent: ready" />
      </section>

      <section className="relative z-10 mx-0 mt-5 grid w-full max-w-none gap-4 rounded-[2rem] border border-neutral-200 bg-white p-4 shadow-[0_16px_36px_rgba(15,23,42,0.08)] sm:mx-auto sm:max-w-5xl sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <Timer className="h-9 w-9" />
          </span>
          <div>
            <p className="text-4xl font-black text-blue-600">5:00</p>
            <p className="font-black">Build time</p>
          </div>
        </div>
        <button
          onClick={onLock}
          className="flex min-h-16 items-center justify-center gap-4 rounded-[1.4rem] border-2 border-neutral-950 bg-orange-500 px-8 text-3xl font-black text-white shadow-[inset_0_8px_0_rgba(255,255,255,0.28),0_7px_0_#111] transition-transform hover:-translate-y-1 active:translate-y-1 active:shadow-[inset_0_8px_0_rgba(255,255,255,0.28),0_2px_0_#111] sm:min-h-20 sm:text-4xl"
        >
          <Lock className="h-9 w-9" />
          Lock prompt
        </button>
        <div className="flex items-center gap-3 text-xl font-black">
          <Wrench className="h-8 w-8 text-orange-500" />
          Build starts when both prompts lock
        </div>
      </section>
    </main>
  );
}
