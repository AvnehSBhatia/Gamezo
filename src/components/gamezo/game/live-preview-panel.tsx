"use client";

import type { EvalBadge } from "@/components/gamezo/game/game-types";
import { Expand, Monitor, Play } from "lucide-react";
import { useState } from "react";

interface LivePreviewPanelProps {
  preview: string;
  previewVersion: number;
  evalBadge: EvalBadge | null;
  isGenerating: boolean;
  onRun: () => void;
}

export function LivePreviewPanel({
  preview,
  previewVersion,
  evalBadge,
  isGenerating,
  onRun,
}: LivePreviewPanelProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <section className="flex min-h-[32rem] flex-col rounded-[1.5rem] border-2 border-neutral-950 bg-white p-3">
        <header className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-2xl font-black">
            <Monitor className="h-6 w-6" />
            Live Game Preview
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRun}
              className="flex cursor-pointer items-center gap-2 rounded-xl border border-blue-200 px-4 py-2 text-sm font-black text-blue-600 hover:bg-blue-50 active:scale-[0.98]"
            >
              <Play className="h-4 w-4 fill-blue-600" />
              Run
            </button>
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-neutral-200 hover:bg-neutral-50"
              title="Fullscreen preview"
            >
              <Expand className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-950">
          <iframe
            key={previewVersion}
            className="h-full min-h-[24rem] w-full border-0"
            srcDoc={preview}
            sandbox="allow-scripts"
            title="Game preview"
          />
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

      {expanded && (
        <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950">
          <header className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
            <p className="text-sm font-black text-white">Fullscreen preview</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onRun}
                className="rounded-xl border border-blue-400 px-4 py-2 text-sm font-black text-blue-300 hover:bg-blue-950"
              >
                Run
              </button>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="rounded-xl border border-neutral-600 px-4 py-2 text-sm font-black text-white hover:bg-neutral-800"
              >
                Close
              </button>
            </div>
          </header>
          <iframe
            key={`fs-${previewVersion}`}
            className="h-full w-full flex-1 border-0"
            srcDoc={preview}
            sandbox="allow-scripts"
            title="Fullscreen game preview"
          />
        </div>
      )}
    </>
  );
}
