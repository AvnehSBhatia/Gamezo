"use client";

import { CHAOS_SEEDS } from "@/lib/chaos-seeds";

interface PromptSuggestionsProps {
  activePrompt: string;
  disabled?: boolean;
  onSelect: (prompt: string) => void;
}

export function PromptSuggestions({ activePrompt, disabled, onSelect }: PromptSuggestionsProps) {
  return (
    <div className="mt-4">
      <p className="mb-3 text-sm font-black uppercase tracking-wide text-neutral-500">
        Or pick a chaos prompt
      </p>
      <div className="flex flex-wrap gap-2">
        {CHAOS_SEEDS.map((seed) => {
          const selected = activePrompt === seed;
          return (
            <button
              key={seed}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(seed)}
              className={`rounded-2xl border px-3 py-2 text-left text-sm font-bold transition-colors disabled:opacity-60 ${
                selected
                  ? "border-blue-500 bg-blue-100 text-blue-900"
                  : "border-neutral-200 bg-neutral-50 text-neutral-800 hover:border-blue-200 hover:bg-blue-50"
              }`}
            >
              {seed}
            </button>
          );
        })}
      </div>
    </div>
  );
}
