"use client";

import dynamic from "next/dynamic";

export const GamezoGamePageClient = dynamic(
  () => import("@/components/gamezo/game").then((mod) => mod.GamezoGamePage),
  { ssr: false },
);
