"use client";

import { Camera } from "lucide-react";
import type { RefCallback } from "react";

interface CameraEnableButtonProps {
  attachStream: RefCallback<HTMLVideoElement>;
  hasCamera: boolean;
  requesting?: boolean;
  error?: string | null;
  onEnable: () => void;
  compact?: boolean;
}

export function CameraEnableButton({
  attachStream,
  hasCamera,
  requesting = false,
  error = null,
  onEnable,
  compact = false,
}: CameraEnableButtonProps) {
  if (hasCamera) return null;

  return (
    <div className={compact ? "relative" : "absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 bg-neutral-900/60 p-3 text-center text-white"}>
      {!compact && (
        <video ref={attachStream} autoPlay playsInline muted className="pointer-events-none absolute h-0 w-0 opacity-0" />
      )}
      <Camera className={compact ? "h-4 w-4" : "h-10 w-10"} />
      <p className={compact ? "sr-only" : "text-sm font-bold"}>
        {error ? "Camera blocked" : requesting ? "Starting camera…" : "Enable your camera"}
      </p>
      {!compact && error && <p className="max-w-[12rem] text-xs text-white/80">{error}</p>}
      <button
        type="button"
        onClick={onEnable}
        disabled={requesting}
        className={
          compact
            ? "rounded-lg bg-blue-600 px-2 py-1 text-[10px] font-black text-white disabled:opacity-60"
            : "rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white disabled:opacity-60"
        }
      >
        {requesting ? "…" : "Enable camera"}
      </button>
    </div>
  );
}
