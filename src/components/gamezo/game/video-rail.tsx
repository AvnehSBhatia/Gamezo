"use client";

import { Camera, UserRound } from "lucide-react";
import type { RefCallback } from "react";
import { CameraEnableButton } from "@/components/gamezo/game/camera-enable-button";
import { MediaControlButton } from "@/components/gamezo/game/media-control-button";

interface VideoRailProps {
  attachStream: RefCallback<HTMLVideoElement>;
  attachPeerStream: RefCallback<HTMLVideoElement>;
  hasCamera: boolean;
  hasRemoteStream?: boolean;
  cameraError?: string | null;
  cameraRequesting?: boolean;
  onEnableCamera?: () => void;
  hasMic?: boolean;
  micEnabled?: boolean;
  onToggleMic?: () => void;
}

export function VideoRail({
  attachStream,
  attachPeerStream,
  hasCamera,
  hasRemoteStream = false,
  cameraError = null,
  cameraRequesting = false,
  onEnableCamera,
  hasMic = false,
  micEnabled = true,
  onToggleMic,
}: VideoRailProps) {
  return (
    <aside className="relative z-10 flex h-full flex-col gap-3 rounded-[1.5rem] border-2 border-neutral-950 bg-white p-3">
      <div className="rounded-2xl border border-neutral-200 p-2">
        <span className="rounded-full bg-blue-600 px-3 py-1 text-sm font-black text-white">You</span>
        <div className="relative mt-2 aspect-[4/3] overflow-hidden rounded-xl bg-neutral-100">
          <video ref={attachStream} autoPlay playsInline muted className="absolute inset-0 z-10 h-full w-full object-cover" />
          {onEnableCamera && (
            <CameraEnableButton
              attachStream={attachStream}
              hasCamera={hasCamera}
              requesting={cameraRequesting}
              error={cameraError}
              onEnable={onEnableCamera}
            />
          )}
          {!hasCamera && !onEnableCamera && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-neutral-100 text-neutral-300">
              <UserRound className="h-24 w-24" />
            </div>
          )}
          <div className="pointer-events-auto absolute bottom-3 left-1/2 z-30 flex -translate-x-1/2 gap-3">
            <MediaControlButton
              label="Mic"
              enabled={hasMic}
              active={micEnabled}
              onClick={() => onToggleMic?.()}
            />
            <MediaControlButton
              label="Camera"
              enabled={hasCamera}
              active={hasCamera}
              onClick={() => onEnableCamera?.()}
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 p-2">
        <span className="rounded-full bg-orange-500 px-3 py-1 text-sm font-black text-white">Opponent</span>
        <div className="relative mt-2 aspect-[4/3] overflow-hidden rounded-xl bg-neutral-100">
          <video ref={attachPeerStream} autoPlay playsInline className="absolute inset-0 z-10 h-full w-full object-cover" />
          {!hasRemoteStream && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-neutral-100 text-neutral-300">
              <UserRound className="h-24 w-24" />
            </div>
          )}
          <div className="absolute right-3 top-3 h-3 w-3 rounded-full bg-green-500" />
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-blue-50 p-4 text-sm font-bold text-neutral-700">
        Both players are anonymous. Focus on building the best game.
      </div>
    </aside>
  );
}
