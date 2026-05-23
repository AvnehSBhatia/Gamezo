"use client";

import { Camera, Mic, UserRound } from "lucide-react";
import type { RefCallback } from "react";

interface VideoRailProps {
  attachStream: RefCallback<HTMLVideoElement>;
  attachPeerStream: RefCallback<HTMLVideoElement>;
  hasCamera: boolean;
}

export function VideoRail({ attachStream, attachPeerStream, hasCamera }: VideoRailProps) {
  return (
    <aside className="flex flex-col gap-3 rounded-[1.5rem] border-2 border-neutral-950 bg-white p-3">
      <div className="rounded-2xl border border-neutral-200 p-2">
        <span className="rounded-full bg-blue-600 px-3 py-1 text-sm font-black text-white">You</span>
        <div className="relative mt-2 aspect-[4/3] overflow-hidden rounded-xl bg-neutral-100">
          <video ref={attachStream} autoPlay playsInline muted className="absolute inset-0 h-full w-full object-cover" />
          {!hasCamera && (
            <div className="absolute inset-0 flex items-center justify-center text-neutral-300">
              <UserRound className="h-24 w-24" />
            </div>
          )}
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-md">
              <Mic className="h-5 w-5" />
            </span>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-md">
              <Camera className="h-5 w-5" />
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 p-2">
        <span className="rounded-full bg-orange-500 px-3 py-1 text-sm font-black text-white">Opponent</span>
        <div className="relative mt-2 aspect-[4/3] overflow-hidden rounded-xl bg-neutral-100">
          <video ref={attachPeerStream} autoPlay playsInline muted className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center text-neutral-300 peer-video-placeholder">
            <UserRound className="h-24 w-24" />
          </div>
          <div className="absolute right-3 top-3 h-3 w-3 rounded-full bg-green-500" />
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-md">
              <Mic className="h-5 w-5" />
            </span>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-md">
              <Camera className="h-5 w-5" />
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-blue-50 p-4 text-sm font-bold text-neutral-700">
        Both players are anonymous. Focus on building the best game.
      </div>
    </aside>
  );
}
