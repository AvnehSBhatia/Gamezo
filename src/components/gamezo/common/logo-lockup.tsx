"use client";

import { Gamepad2 } from "lucide-react";

interface LogoLockupProps {
  compact?: boolean;
}

export function LogoLockup({ compact = false }: LogoLockupProps) {
  return (
    <div className="flex items-center gap-2 text-neutral-950">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-[inset_0_4px_8px_rgba(255,255,255,0.35),0_8px_18px_rgba(255,106,0,0.22)]">
        <Gamepad2 className="h-6 w-6" strokeWidth={3} />
      </div>
      <span className={compact ? "text-3xl font-black tracking-tight" : "text-4xl font-black tracking-tight"}>
        Gamezo
      </span>
    </div>
  );
}
