"use client";

import type { AiMsg } from "@/components/gamezo/game/game-types";
import { AiBuilderWebcam } from "@/components/gamezo/game/ai-builder-webcam";
import { Bot, Send, Sparkles } from "lucide-react";
import type { RefCallback, RefObject } from "react";

interface AiBuilderPanelProps {
  messages: AiMsg[];
  input: string;
  isGenerating: boolean;
  chatRef: RefObject<HTMLDivElement | null>;
  attachStream?: RefCallback<HTMLVideoElement>;
  hasCamera?: boolean;
  cameraError?: string | null;
  cameraRequesting?: boolean;
  onEnableCamera?: () => void;
  onInputChange: (value: string) => void;
  onSend: () => void;
}

export function AiBuilderPanel({
  messages,
  input,
  isGenerating,
  chatRef,
  attachStream,
  hasCamera = false,
  cameraError = null,
  cameraRequesting = false,
  onEnableCamera,
  onInputChange,
  onSend,
}: AiBuilderPanelProps) {
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.5rem] border-2 border-neutral-950 bg-white">
      <header className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2 text-2xl font-black">
          <Sparkles className="h-6 w-6 flex-shrink-0 fill-orange-500 text-orange-500" />
          <span className="truncate">AI Builder</span>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          {attachStream && (
            <AiBuilderWebcam
              attachStream={attachStream}
              hasCamera={hasCamera}
              cameraError={cameraError}
              requesting={cameraRequesting}
              onEnable={onEnableCamera}
            />
          )}
          <span className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-sm font-black text-green-700">
            Eazo AI
          </span>
        </div>
      </header>

      <div ref={chatRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((message, index) => (
          <div key={index} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
            {message.role !== "user" && (
              <span className="mr-2 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-500">
                <Bot className="h-5 w-5" />
              </span>
            )}
            <div
              className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm font-semibold leading-relaxed ${
                message.role === "user"
                  ? "bg-blue-600 text-white"
                  : message.role === "system"
                    ? "bg-neutral-100 text-neutral-500"
                    : "bg-neutral-100 text-neutral-800"
              }`}
            >
              {message.isGenerating ? "Building, evaluating, and refining..." : message.text}
            </div>
          </div>
        ))}
      </div>

      <footer className="flex-shrink-0 border-t border-neutral-200 p-3">
        <div className="flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white p-2">
          <input
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onSend();
            }}
            disabled={isGenerating}
            className="min-w-0 flex-1 px-2 text-sm font-semibold outline-none"
            placeholder="Tell the AI what to change..."
          />
          <button
            type="button"
            onClick={onSend}
            disabled={isGenerating || !input.trim()}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-white disabled:opacity-40"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-2 text-xs font-semibold text-neutral-400">Tip: be specific for better results.</p>
      </footer>
    </section>
  );
}
