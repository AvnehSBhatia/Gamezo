"use client";

import { Play } from "lucide-react";
import type { RefObject } from "react";

interface DemoGamePanelProps {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  html: string;
  isDemoing: boolean;
  playerLabel: string;
}

export function DemoGamePanel({ iframeRef, html, isDemoing, playerLabel }: DemoGamePanelProps) {
  return (
    <article className="flex min-h-[28rem] flex-col rounded-[2rem] border-2 border-neutral-950 bg-white p-4 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xl font-black">
          {isDemoing ? "Your game — show them what you built!" : `Watching ${playerLabel}'s game`}
        </p>
        <Play className="h-6 w-6 text-orange-500" />
      </div>
      <div className="relative flex-1 overflow-hidden rounded-2xl border-2 border-neutral-200 bg-neutral-950">
        {html ? (
          <iframe
            ref={iframeRef}
            title="Demo game"
            sandbox="allow-scripts"
            srcDoc={html}
            className="h-full min-h-[24rem] w-full"
          />
        ) : (
          <div className="flex h-full min-h-[24rem] items-center justify-center text-neutral-500">
            Waiting for demo…
          </div>
        )}
        {!isDemoing && html && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 text-center text-sm font-bold text-white">
            Inputs sync from the demoing player
          </div>
        )}
      </div>
    </article>
  );
}
