"use client";

import type { EvalBadge } from "@/components/gamezo/game/game-types";
import { Expand, Monitor, Play } from "lucide-react";

interface LivePreviewPanelProps {
  preview: string;
  evalBadge: EvalBadge | null;
  isGenerating: boolean;
}

export function LivePreviewPanel({ preview, evalBadge, isGenerating }: LivePreviewPanelProps) {
  return (
    <section className="flex min-h-[32rem] flex-col rounded-[1.5rem] border-2 border-neutral-950 bg-white p-3">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-2xl font-black">
          <Monitor className="h-6 w-6" />
          Live Game Preview
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 rounded-xl border border-blue-200 px-4 py-2 text-sm font-black text-blue-600">
            <Play className="h-4 w-4 fill-blue-600" />
            Run
          </button>
          <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200">
            <Expand className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-950">
        <iframe key={preview} className="h-full min-h-[24rem] w-full border-0" srcDoc={preview} sandbox="allow-scripts" title="Game preview" />
      </div>

      <footer className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200 px-4 py-3 text-xs font-bold text-neutral-500">
        <div className="flex items-center gap-2 text-green-600">
          <span className="h-3 w-3 rounded-full bg-green-500" />
          {isGenerating ? "Building in sandbox" : "Running in sandbox"}
        </div>
        <div className="flex gap-4">
          <span>FPS <b className="text-green-600">60</b></span>
          <span>CPU <b className="text-blue-600">12%</b></span>
          <span>MEM <b className="text-purple-600">34MB</b></span>
        </div>
        <span>{evalBadge ? `Score ${evalBadge.total}/40` : "Auto-save on"}</span>
      </footer>
    </section>
  );
}
