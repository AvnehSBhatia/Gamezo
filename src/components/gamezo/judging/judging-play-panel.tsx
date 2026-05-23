"use client";

import { Monitor } from "lucide-react";
import { useState } from "react";

interface JudgingPlayPanelProps {
  opponentHtml: string | null;
  yourHtml: string | null;
}

export function JudgingPlayPanel({ opponentHtml, yourHtml }: JudgingPlayPanelProps) {
  const [tab, setTab] = useState<"opponent" | "yours">("opponent");
  const html = tab === "opponent" ? opponentHtml : yourHtml;

  if (!opponentHtml && !yourHtml) return null;

  return (
    <section className="mt-7 rounded-[2rem] border-2 border-neutral-950 bg-white p-5 shadow-lg">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-xl font-black">
          <Monitor className="h-6 w-6" />
          Play the games before you vote
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab("opponent")}
            disabled={!opponentHtml}
            className={`rounded-xl px-4 py-2 text-sm font-black ${tab === "opponent" ? "bg-orange-500 text-white" : "bg-neutral-100 text-neutral-600"}`}
          >
            Opponent&apos;s game
          </button>
          <button
            type="button"
            onClick={() => setTab("yours")}
            disabled={!yourHtml}
            className={`rounded-xl px-4 py-2 text-sm font-black ${tab === "yours" ? "bg-blue-600 text-white" : "bg-neutral-100 text-neutral-600"}`}
          >
            Your game
          </button>
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border-2 border-neutral-200 bg-neutral-950">
        {html ? (
          <iframe
            key={tab}
            title={tab === "opponent" ? "Opponent game" : "Your game"}
            sandbox="allow-scripts allow-pointer-lock"
            srcDoc={html}
            className="h-[28rem] w-full border-0"
          />
        ) : (
          <div className="flex h-[28rem] items-center justify-center text-neutral-500">
            No game submitted for this slot
          </div>
        )}
      </div>
      <p className="mt-3 text-center text-sm font-semibold text-neutral-500">
        {tab === "opponent"
          ? "Try their build — then vote for the most fun chaos"
          : "Revisit your own build before the final score"}
      </p>
    </section>
  );
}
