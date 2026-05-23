"use client";

import { CodeEditorField } from "@/components/gamezo/game/code-editor-field";
import type { EvalBadge } from "@/components/gamezo/game/game-types";
import type { GameAsset } from "@/components/gamezo/game/game-types";
import {
  applyScriptBlock,
  applyStyleBlock,
  DEFAULT_GAME_HTML,
  extractScriptBlock,
  extractStyleBlock,
} from "@/lib/game-html";
import { CheckCircle2, Play, RotateCcw, Sparkles, Wrench } from "lucide-react";
import { useEffect, useState } from "react";

type CodeTab = "HTML" | "CSS" | "JS" | "Assets";

interface CodeToolsPanelProps {
  code: string;
  evalBadge: EvalBadge | null;
  assets: GameAsset[];
  onCodeChange: (code: string) => void;
  onRun: () => void;
  onReset: () => void;
  onFix: () => void;
  onGenerateSprite: () => void;
  isGeneratingSprite: boolean;
}

function valueForTab(tab: CodeTab, html: string, assets: GameAsset[]): string {
  switch (tab) {
    case "HTML":
      return html;
    case "CSS":
      return extractStyleBlock(html);
    case "JS":
      return extractScriptBlock(html);
    case "Assets":
      if (!assets.length) return "No sprites yet — generate one below.";
      return assets.map((a, i) => `# Asset ${i + 1}: ${a.description}\n${a.dataUrl.slice(0, 120)}…`).join("\n\n");
  }
}

export function CodeToolsPanel({
  code,
  evalBadge,
  assets,
  onCodeChange,
  onRun,
  onReset,
  onFix,
  onGenerateSprite,
  isGeneratingSprite,
}: CodeToolsPanelProps) {
  const [tab, setTab] = useState<CodeTab>("HTML");
  const htmlSource = code.trim() || DEFAULT_GAME_HTML;
  const [editValue, setEditValue] = useState(() => valueForTab("HTML", htmlSource, assets));

  useEffect(() => {
    setEditValue(valueForTab(tab, htmlSource, assets));
  }, [tab, htmlSource, assets]);

  function handleEdit(next: string) {
    setEditValue(next);
    if (tab === "HTML") {
      onCodeChange(next);
      return;
    }
    if (tab === "CSS") {
      onCodeChange(applyStyleBlock(htmlSource, next));
      return;
    }
    if (tab === "JS") {
      onCodeChange(applyScriptBlock(htmlSource, next));
    }
  }

  const fileLabel =
    tab === "HTML" ? "index.html" : tab === "CSS" ? "styles" : tab === "JS" ? "game.js" : "assets";

  const isEditable = tab !== "Assets";

  return (
    <aside className="relative z-10 flex h-full min-h-0 flex-col rounded-[1.5rem] border-2 border-neutral-950 bg-white p-3">
      <div className="mb-3 grid grid-cols-4 gap-2 text-sm font-black">
        {(["HTML", "CSS", "JS", "Assets"] as const).map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setTab(name)}
            className={`rounded-xl border px-3 py-2 transition-colors ${
              tab === name
                ? "border-orange-400 bg-orange-100 text-orange-700"
                : name === "Assets" && assets.length > 0
                  ? "border-blue-300 bg-blue-50 text-blue-600"
                  : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            {name}
            {name === "Assets" && assets.length > 0 ? ` (${assets.length})` : ""}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
        <div className="mb-3 flex items-center justify-between gap-2 text-sm font-bold">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-orange-500" />
            {fileLabel}
          </div>
          {isEditable && (
            <button
              type="button"
              onClick={onRun}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-black text-blue-600 hover:bg-blue-50"
            >
              <Play className="h-3.5 w-3.5 fill-blue-600" />
              Run
            </button>
          )}
        </div>
        <CodeEditorField
          value={editValue}
          onChange={handleEdit}
          readOnly={!isEditable}
          placeholder={isEditable ? "Start typing your game code…" : undefined}
        />
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4">
        <CheckCircle2 className="h-10 w-10 text-green-600" />
        <div>
          <p className="text-lg font-black text-green-600">{evalBadge ? "Last build passed" : "Ready to build"}</p>
          <p className="text-sm font-semibold text-neutral-500">{evalBadge ? `${evalBadge.attempts} pass attempt(s)` : "Edit code, then Run to preview"}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onFix}
          className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-orange-200 px-4 py-4 text-lg font-black text-orange-600 hover:bg-orange-50 active:scale-[0.98]"
        >
          <Wrench className="h-6 w-6" />
          Fix
        </button>
        <button
          type="button"
          onClick={onReset}
          className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-orange-200 px-4 py-4 text-lg font-black text-orange-600 hover:bg-orange-50 active:scale-[0.98]"
        >
          <RotateCcw className="h-6 w-6" />
          Reset
        </button>
      </div>

      <button
        type="button"
        onClick={onGenerateSprite}
        disabled={isGeneratingSprite}
        className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-blue-200 px-4 py-4 text-lg font-black text-blue-600 hover:bg-blue-50 active:scale-[0.98] disabled:opacity-60"
      >
        <Sparkles className="h-6 w-6" />
        {isGeneratingSprite ? "Generating…" : "Generate sprite"}
      </button>
    </aside>
  );
}
