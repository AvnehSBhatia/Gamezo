"use client";

import { MediaControlButton } from "@/components/gamezo/game/media-control-button";
import { Camera, Signal } from "lucide-react";
import type { ReactNode, RefCallback } from "react";

interface PlayerCameraCardProps {
  label: "You" | "Opponent";
  tone: "blue" | "orange";
  videoRef?: RefCallback<HTMLVideoElement>;
  hasCamera?: boolean;
  hasMic?: boolean;
  micEnabled?: boolean;
  onToggleMic?: () => void;
  onEnableCamera?: () => void;
  note?: string;
  children?: ReactNode;
}

export function PlayerCameraCard({
  label,
  tone,
  videoRef,
  hasCamera = false,
  hasMic = false,
  micEnabled = true,
  onToggleMic,
  onEnableCamera,
  note,
  children,
}: PlayerCameraCardProps) {
  const isBlue = tone === "blue";
  const isYou = label === "You";

  return (
    <article
      className={`relative z-10 w-full min-w-0 rounded-[1.75rem] border-2 bg-white p-3 shadow-[0_18px_40px_rgba(15,23,42,0.08)] ${
        isBlue ? "border-blue-500" : "border-orange-400"
      }`}
    >
      <div className="mb-3 flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-full text-white ${
              isBlue ? "bg-blue-600" : "bg-orange-500"
            }`}
          >
            <span className="h-3 w-3 rounded-full bg-white" />
          </span>
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl">{label}</h2>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-black text-white ${isBlue ? "bg-blue-600" : "bg-orange-500"}`}>
          {isBlue ? "YOU" : "THEM"}
        </span>
      </div>

      <div
        className={`relative aspect-[4/3] overflow-hidden rounded-3xl ${
          isBlue ? "bg-gradient-to-br from-blue-400 to-blue-600" : "bg-gradient-to-br from-yellow-300 to-orange-500"
        }`}
      >
        {videoRef && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isYou}
            className={`absolute inset-0 h-full w-full object-cover ${hasCamera ? "z-10" : "z-0"}`}
          />
        )}
        {!hasCamera && !children && (
          <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 text-white">
            <Camera className="h-20 w-20" strokeWidth={1.7} />
            <p className="text-xl font-black">{isYou ? "Enable camera" : "Waiting…"}</p>
          </div>
        )}
        {children}
        {isYou && (onToggleMic || onEnableCamera) && (
          <div className="pointer-events-auto absolute bottom-3 left-1/2 z-30 flex -translate-x-1/2 gap-3">
            {onToggleMic && (
              <MediaControlButton
                label="Mic"
                enabled={hasMic || Boolean(onToggleMic)}
                active={micEnabled}
                onClick={onToggleMic}
              />
            )}
            {onEnableCamera && (
              <MediaControlButton
                label="Camera"
                enabled={hasCamera || Boolean(onEnableCamera)}
                active={hasCamera}
                onClick={onEnableCamera}
              />
            )}
          </div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 rounded-3xl bg-white p-2 shadow-inner">
        {isYou && onEnableCamera ? (
          <>
            <button
              type="button"
              onClick={onEnableCamera}
              className="flex cursor-pointer flex-col items-center gap-1 rounded-2xl p-2 text-xs font-black hover:bg-neutral-50"
            >
              <span className={`flex h-10 w-10 items-center justify-center rounded-full text-white sm:h-12 sm:w-12 ${isBlue ? "bg-blue-600" : "bg-orange-500"}`}>
                <Camera className="h-5 w-5 sm:h-6 sm:w-6" />
              </span>
              Camera
            </button>
            <button
              type="button"
              onClick={onToggleMic}
              className="flex cursor-pointer flex-col items-center gap-1 rounded-2xl p-2 text-xs font-black hover:bg-neutral-50"
            >
              <span className={`flex h-10 w-10 items-center justify-center rounded-full text-white sm:h-12 sm:w-12 ${micEnabled ? (isBlue ? "bg-blue-600" : "bg-orange-500") : "bg-red-500"}`}>
                <span className="text-lg font-black">{micEnabled ? "ON" : "OFF"}</span>
              </span>
              Mic
            </button>
          </>
        ) : (
          <>
            <div className="flex flex-col items-center gap-1 rounded-2xl p-2 text-xs font-black">
              <span className={`flex h-10 w-10 items-center justify-center rounded-full text-white sm:h-12 sm:w-12 ${isBlue ? "bg-blue-600" : "bg-orange-500"}`}>
                <Camera className="h-5 w-5 sm:h-6 sm:w-6" />
              </span>
              Camera
            </div>
            <div className="flex flex-col items-center gap-1 rounded-2xl p-2 text-xs font-black">
              <span className={`flex h-10 w-10 items-center justify-center rounded-full text-white sm:h-12 sm:w-12 ${isBlue ? "bg-blue-600" : "bg-orange-500"}`}>
                <span className="text-lg font-black">—</span>
              </span>
              Mic
            </div>
          </>
        )}
        <div className="hidden flex-col items-center gap-1 rounded-2xl p-2 text-xs font-black sm:flex">
          <span className={`flex h-12 w-12 items-center justify-center rounded-full text-white ${isBlue ? "bg-blue-600" : "bg-orange-500"}`}>
            <Signal className="h-6 w-6" />
          </span>
          Signal
        </div>
      </div>
      {note && <p className="mt-3 rounded-2xl bg-neutral-50 px-3 py-2 text-center text-sm font-bold text-neutral-600">{note}</p>}
    </article>
  );
}
