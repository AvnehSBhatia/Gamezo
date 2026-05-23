"use client";

import { Camera, Mic, Signal } from "lucide-react";
import type { ReactNode, RefCallback } from "react";

interface PlayerCameraCardProps {
  label: "You" | "Opponent";
  tone: "blue" | "orange";
  videoRef?: RefCallback<HTMLVideoElement>;
  hasCamera?: boolean;
  note?: string;
  children?: ReactNode;
}

export function PlayerCameraCard({ label, tone, videoRef, hasCamera = false, note, children }: PlayerCameraCardProps) {
  const isBlue = tone === "blue";

  return (
    <article
      className={`w-full min-w-0 rounded-[1.75rem] border-2 bg-white p-3 shadow-[0_18px_40px_rgba(15,23,42,0.08)] ${
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
            muted={label === "You"}
            className={`absolute inset-0 h-full w-full object-cover ${hasCamera ? "z-10" : "z-0"}`}
          />
        )}
        {!hasCamera && !children && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 text-white">
            <Camera className="h-20 w-20" strokeWidth={1.7} />
            <p className="text-xl font-black">{label === "You" ? "Enable camera" : "Waiting…"}</p>
          </div>
        )}
        {children}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 rounded-3xl bg-white p-2 shadow-inner">
        {[
          { icon: Camera, label: "Camera" },
          { icon: Mic, label: "Mic" },
          { icon: Signal, label: "Signal" },
        ].map((item, index) => (
          <div
            key={item.label}
            className={`flex flex-col items-center gap-1 rounded-2xl p-2 text-xs font-black ${index === 2 ? "hidden sm:flex" : ""}`}
          >
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-full text-white sm:h-12 sm:w-12 ${
                isBlue ? "bg-blue-600" : "bg-orange-500"
              }`}
            >
              <item.icon className="h-5 w-5 sm:h-6 sm:w-6" />
            </span>
            {item.label}
          </div>
        ))}
      </div>
      {note && <p className="mt-3 rounded-2xl bg-neutral-50 px-3 py-2 text-center text-sm font-bold text-neutral-600">{note}</p>}
    </article>
  );
}
