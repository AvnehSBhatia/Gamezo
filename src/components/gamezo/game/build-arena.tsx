"use client";

import { AiBuilderPanel } from "@/components/gamezo/game/ai-builder-panel";
import { CodeToolsPanel } from "@/components/gamezo/game/code-tools-panel";
import type { AiMsg, EvalBadge } from "@/components/gamezo/game/game-types";
import { GameTopBar } from "@/components/gamezo/game/game-top-bar";
import { LivePreviewPanel } from "@/components/gamezo/game/live-preview-panel";
import { MobileGameTabs } from "@/components/gamezo/game/mobile-game-tabs";
import { VideoRail } from "@/components/gamezo/game/video-rail";
import type { RefCallback, RefObject } from "react";

interface BuildArenaProps {
  roomCode: string;
  timeStr: string;
  isUrgent: boolean;
  activeTab: "AI" | "Preview" | "Code" | "Players";
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
  onReady: () => void;
  onTabChange: (tab: "AI" | "Preview" | "Code" | "Players") => void;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onReset: () => void;
  onFix: () => void;
}

export function BuildArena(props: BuildArenaProps) {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#fffdf8] text-neutral-950">
      <GameTopBar roomCode={props.roomCode} timeStr={props.timeStr} isUrgent={props.isUrgent} onReady={props.onReady} />

      <div className="hidden gap-3 px-4 pb-5 lg:grid lg:grid-cols-[18rem_minmax(20rem,23rem)_minmax(32rem,1fr)_22rem]">
        <VideoRail attachStream={props.attachStream} attachPeerStream={props.attachPeerStream} hasCamera={props.hasCamera} />
        <AiBuilderPanel
          messages={props.messages}
          input={props.input}
          isGenerating={props.isGenerating}
          chatRef={props.chatRef}
          onInputChange={props.onInputChange}
          onSend={props.onSend}
        />
        <LivePreviewPanel preview={props.preview} evalBadge={props.evalBadge} isGenerating={props.isGenerating} />
        <CodeToolsPanel code={props.code} evalBadge={props.evalBadge} onReset={props.onReset} onFix={props.onFix} />
      </div>

      <MobileGameTabs {...props} />
    </main>
  );
}
