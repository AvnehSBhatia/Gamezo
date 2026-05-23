"use client";

import { Camera, Mic, MicOff } from "lucide-react";

interface MediaControlButtonProps {
  enabled: boolean;
  active: boolean;
  onClick: () => void;
  label: "Mic" | "Camera";
}

export function MediaControlButton({ enabled, active, onClick, label }: MediaControlButtonProps) {
  const Icon = label === "Mic" ? (active ? Mic : MicOff) : Camera;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!enabled && label === "Mic"}
      title={active ? `${label} on` : `${label} off`}
      className={`flex h-11 w-11 cursor-pointer items-center justify-center rounded-full shadow-md transition-colors ${
        label === "Camera"
          ? "bg-white text-neutral-800 hover:bg-neutral-50"
          : enabled
            ? active
              ? "bg-white text-neutral-800 hover:bg-neutral-50"
              : "bg-red-100 text-red-600 hover:bg-red-200"
            : "cursor-not-allowed bg-neutral-100 text-neutral-400"
      }`}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}
