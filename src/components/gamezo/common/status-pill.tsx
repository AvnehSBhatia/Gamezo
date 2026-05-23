"use client";

import type { LucideIcon } from "lucide-react";

interface StatusPillProps {
  icon: LucideIcon;
  label: string;
  tone?: "blue" | "orange" | "green" | "neutral";
}

const toneClass = {
  blue: "text-blue-600 bg-blue-50 border-blue-100",
  orange: "text-orange-600 bg-orange-50 border-orange-100",
  green: "text-green-600 bg-green-50 border-green-100",
  neutral: "text-neutral-700 bg-white border-neutral-200",
};

export function StatusPill({ icon: Icon, label, tone = "neutral" }: StatusPillProps) {
  return (
    <div className={`flex items-center gap-2 rounded-2xl border px-4 py-3 shadow-sm ${toneClass[tone]}`}>
      <Icon className="h-5 w-5" strokeWidth={2.6} />
      <span className="text-sm font-black">{label}</span>
    </div>
  );
}
