"use client";

import { AiBuilderPanel } from "@/components/gamezo/game/ai-builder-panel";
import { CodeToolsPanel } from "@/components/gamezo/game/code-tools-panel";
import type { AiMsg, EvalBadge } from "@/components/gamezo/game/game-types";
import { LivePreviewPanel } from "@/components/gamezo/game/live-preview-panel";
import { VideoRail } from "@/components/gamezo/game/video-rail";
import type { RefCallback, RefObject } from "react";

interface MobileGameTabsProps {
  activeTab: "AI" | "Preview" | "Code" | "Players";
  onTabChange: (tab: "AI" | "Preview" | "Code" | "Players") => void;
  messages: AiMsg[];
  input: string;
  isGenerating: boolean;
  chatRef: RefObject<HTMLDivElement | null>;
  preview: string;
  code: string;
  evalBadge: EvalBadge | null;
  attachStream: RefCallback<HTMLVideoElement>;
  attachPeerStream: RefCallback<HTMLVideoElement>;
  hasCamera: boolean;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onReset: () => void;
  onFix: () => void;
}

export function MobileGameTabs({
  activeTab,
  onTabChange,
  messages,
  input,
  isGenerating,
  chatRef,
  preview,
  code,
  evalBadge,
  attachStream,
  attachPeerStream,
  hasCamera,
  onInputChange,
  onSend,
  onReset,
  onFix,
}: MobileGameTabsProps) {
  return (
    <div className="px-4 pb-5 lg:hidden">
      <div className="mb-3 grid grid-cols-4 gap-2 rounded-2xl border-2 border-neutral-950 bg-white p-2">
        {(["AI", "Preview", "Code", "Players"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`rounded-xl px-2 py-3 text-sm font-black ${activeTab === tab ? "bg-blue-600 text-white" : "bg-neutral-50 text-neutral-600"}`}
          >
            {tab}
          </button>
        ))}
      </div>
      {activeTab === "AI" && (
        <AiBuilderPanel messages={messages} input={input} isGenerating={isGenerating} chatRef={chatRef} onInputChange={onInputChange} onSend={onSend} />
      )}
      {activeTab === "Preview" && <LivePreviewPanel preview={preview} evalBadge={evalBadge} isGenerating={isGenerating} />}
      {activeTab === "Code" && <CodeToolsPanel code={code} evalBadge={evalBadge} onReset={onReset} onFix={onFix} />}
      {activeTab === "Players" && <VideoRail attachStream={attachStream} attachPeerStream={attachPeerStream} hasCamera={hasCamera} />}
    </div>
  );
}
