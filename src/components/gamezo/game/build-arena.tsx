"use client";

import { GameTopBar } from "@/components/gamezo/game/game-top-bar";
import type { AiMsg, EvalBadge } from "@/components/gamezo/game/game-types";
import { AiBuilderPanel } from "@/components/gamezo/game/ai-builder-panel";
import { CodeToolsPanel } from "@/components/gamezo/game/code-tools-panel";
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
  hasRemoteStream?: boolean;
  cameraError?: string | null;
  cameraRequesting?: boolean;
  onEnableCamera?: () => void;
  selfReady: boolean;
  opponentReady: boolean;
  onReady: () => void;
  onCopyLink: () => void;
  onTabChange: (tab: "AI" | "Preview" | "Code" | "Players") => void;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onReset: () => void;
  onFix: () => void;
  onGenerateSprite: () => void;
  isGeneratingSprite: boolean;
  assetCount: number;
}

export function BuildArena(props: BuildArenaProps) {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#fffdf8] text-neutral-950">
      <GameTopBar
        roomCode={props.roomCode}
        timeStr={props.timeStr}
        isUrgent={props.isUrgent}
        selfReady={props.selfReady}
        opponentReady={props.opponentReady}
        onReady={props.onReady}
        onCopyLink={props.onCopyLink}
      />

      <div className="hidden h-[calc(100dvh-5.5rem)] gap-3 px-4 pb-5 lg:grid lg:grid-cols-[18rem_minmax(20rem,23rem)_minmax(32rem,1fr)_22rem] lg:items-stretch">
        <VideoRail
          attachStream={props.attachStream}
          attachPeerStream={props.attachPeerStream}
          hasCamera={props.hasCamera}
          hasRemoteStream={props.hasRemoteStream}
          cameraError={props.cameraError}
          cameraRequesting={props.cameraRequesting}
          onEnableCamera={props.onEnableCamera}
        />
        <AiBuilderPanel
          messages={props.messages}
          input={props.input}
          isGenerating={props.isGenerating}
          chatRef={props.chatRef}
          attachStream={props.attachStream}
          hasCamera={props.hasCamera}
          cameraError={props.cameraError}
          cameraRequesting={props.cameraRequesting}
          onEnableCamera={props.onEnableCamera}
          onInputChange={props.onInputChange}
          onSend={props.onSend}
        />
        <LivePreviewPanel preview={props.preview} evalBadge={props.evalBadge} isGenerating={props.isGenerating} />
        <CodeToolsPanel
          code={props.code}
          evalBadge={props.evalBadge}
          onReset={props.onReset}
          onFix={props.onFix}
          onGenerateSprite={props.onGenerateSprite}
          isGeneratingSprite={props.isGeneratingSprite}
          assetCount={props.assetCount}
        />
      </div>

      <MobileGameTabs {...props} />
    </main>
  );
}
