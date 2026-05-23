"use client";

import { Camera } from "lucide-react";
import type { RefCallback } from "react";

interface AiBuilderWebcamProps {
  attachStream: RefCallback<HTMLVideoElement>;
  hasCamera: boolean;
  cameraError?: string | null;
  requesting?: boolean;
  onEnable?: () => void;
}

export function AiBuilderWebcam({
  attachStream,
  hasCamera,
  cameraError = null,
  requesting = false,
  onEnable,
}: AiBuilderWebcamProps) {
  return (
    <button
      type="button"
      onClick={hasCamera ? undefined : onEnable}
      disabled={hasCamera || requesting}
      className="relative h-16 w-24 flex-shrink-0 overflow-hidden rounded-xl border-2 border-blue-200 bg-neutral-100 disabled:cursor-default"
      title={hasCamera ? "Camera live" : cameraError ?? "Enable camera"}
    >
      <video
        ref={attachStream}
        autoPlay
        playsInline
        muted
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />
      {!hasCamera && (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-neutral-100/95 text-neutral-500">
          <Camera className="h-5 w-5" />
          <span className="px-1 text-center text-[9px] font-bold leading-tight">
            {requesting ? "…" : "Tap cam"}
          </span>
        </span>
      )}
      {hasCamera && (
        <span className="pointer-events-none absolute bottom-1 left-1 flex items-center gap-0.5 rounded-full bg-black/50 px-1.5 py-0.5 text-[9px] font-bold text-white">
          <Camera className="h-2.5 w-2.5" />
          Live
        </span>
      )}
    </button>
  );
}
