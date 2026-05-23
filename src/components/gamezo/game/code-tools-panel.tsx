"use client";

import type { EvalBadge } from "@/components/gamezo/game/game-types";
import { CheckCircle2, RotateCcw, Sparkles, Wrench } from "lucide-react";

interface CodeToolsPanelProps {
  code: string;
  evalBadge: EvalBadge | null;
  onReset: () => void;
  onFix: () => void;
  onGenerateSprite: () => void;
  isGeneratingSprite: boolean;
  assetCount: number;
}

export function CodeToolsPanel({
  code,
  evalBadge,
  onReset,
  onFix,
  onGenerateSprite,
  isGeneratingSprite,
  assetCount,
}: CodeToolsPanelProps) {
  const lines = (code || "<!DOCTYPE html>\n<html>\n<body>\n  <div id=\"game\"></div>\n</body>\n</html>").split("\n").slice(0, 14);

  return (
    <aside className="flex min-h-[32rem] flex-col rounded-[1.5rem] border-2 border-neutral-950 bg-white p-3">
      <div className="mb-3 grid grid-cols-4 gap-2 text-sm font-black">
        {["HTML", "CSS", "JS", "Assets"].map((tab, index) => (
          <button
            key={tab}
            className={`rounded-xl border px-3 py-2 ${index === 0 ? "border-orange-300 bg-orange-50 text-orange-600" : index === 3 && assetCount > 0 ? "border-blue-300 bg-blue-50 text-blue-600" : "border-neutral-200 text-neutral-600"}`}
          >
            {tab}{index === 3 && assetCount > 0 ? ` (${assetCount})` : ""}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
        <div className="mb-3 flex items-center gap-2 text-sm font-bold">
          <span className="h-3 w-3 rounded-full bg-orange-500" />
          index.html
        </div>
        <pre className="max-h-[18rem] overflow-hidden rounded-xl bg-white p-3 font-mono text-xs leading-relaxed text-neutral-600">
          {lines.map((line, index) => `${String(index + 1).padStart(2, " ")}  ${line}`).join("\n")}
        </pre>
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4">
        <CheckCircle2 className="h-10 w-10 text-green-600" />
        <div>
          <p className="text-lg font-black text-green-600">{evalBadge ? "Last build passed" : "Ready to build"}</p>
          <p className="text-sm font-semibold text-neutral-500">{evalBadge ? `${evalBadge.attempts} pass attempt(s)` : "No errors"}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button type="button" onClick={onFix} className="flex items-center justify-center gap-2 rounded-2xl border-2 border-orange-200 px-4 py-4 text-lg font-black text-orange-600">
          <Wrench className="h-6 w-6" />
          Fix
        </button>
        <button type="button" onClick={onReset} className="flex items-center justify-center gap-2 rounded-2xl border-2 border-orange-200 px-4 py-4 text-lg font-black text-orange-600">
          <RotateCcw className="h-6 w-6" />
          Reset
        </button>
      </div>

      <button
        type="button"
        onClick={onGenerateSprite}
        disabled={isGeneratingSprite}
        className="mt-3 flex items-center justify-center gap-2 rounded-2xl border-2 border-blue-200 px-4 py-4 text-lg font-black text-blue-600 disabled:opacity-60"
      >
        <Sparkles className="h-6 w-6" />
        {isGeneratingSprite ? "Generating…" : "Generate sprite"}
      </button>
    </aside>
  );
}
