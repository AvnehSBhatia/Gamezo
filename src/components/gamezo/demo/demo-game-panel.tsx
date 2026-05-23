"use client";

import { Play } from "lucide-react";
import type { RefObject } from "react";

interface DemoGamePanelProps {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  html: string;
  isPlaying: boolean;
  isWatching: boolean;
  playerLabel: string;
  onIframeLoad?: () => void;
}

export function DemoGamePanel({
  iframeRef,
  html,
  isPlaying,
  isWatching,
  playerLabel,
  onIframeLoad,
}: DemoGamePanelProps) {
  return (
    <article className="flex min-h-[28rem] flex-col rounded-[2rem] border-2 border-neutral-950 bg-white p-4 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xl font-black">
          {isPlaying
            ? `Play ${playerLabel}'s game — try to beat it!`
            : isWatching
              ? "Your game — opponent is playing live"
              : `Waiting for ${playerLabel}'s demo…`}
        </p>
        {isPlaying && (
          <span className="rounded-full bg-green-500 px-3 py-1 text-xs font-black text-white">YOUR TURN</span>
        )}
        <Play className="h-6 w-6 flex-shrink-0 text-orange-500" />
      </div>
      <div className="relative flex-1 overflow-hidden rounded-2xl border-2 border-neutral-200 bg-neutral-950">
        {html ? (
          <iframe
            ref={iframeRef}
            title="Demo game"
            sandbox="allow-scripts allow-pointer-lock"
            srcDoc={html}
            onLoad={onIframeLoad}
            className={`h-full min-h-[24rem] w-full ${isWatching ? "pointer-events-none" : ""}`}
          />
        ) : (
          <div className="flex h-full min-h-[24rem] items-center justify-center text-neutral-500">
            Waiting for demo…
          </div>
        )}
        {isWatching && html && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-center text-sm font-bold text-white">
            Opponent controls the game — you watch their inputs live
          </div>
        )}
        {isPlaying && html && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent p-4 text-center text-sm font-bold text-white">
            Click, type, and touch to play — they see everything you do
          </div>
        )}
      </div>
    </article>
  );
}
