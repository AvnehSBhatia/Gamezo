"use client";

import { BuildArena } from "@/components/gamezo/game/build-arena";
import type { AiMsg, EvalBadge, GamePhase } from "@/components/gamezo/game/game-types";
import { PromptLockScreen } from "@/components/gamezo/game/prompt-lock-screen";
import { getOrCreateUserId, getRoomCode, getSessionValue } from "@/components/gamezo/game/session";
import { buildGameWithAi, submitGameCode } from "@/lib/api";
import { TOTAL_SECONDS } from "@/lib/game-data";
import { useGameSocket } from "@/lib/useGameSocket";
import { useWebcam } from "@/lib/useWebcam";
import { useWebRTC } from "@/lib/useWebRTC";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const EMPTY_PREVIEW = `<!DOCTYPE html>
<html><body style="margin:0;background:#111;color:#555;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center">
<div><div style="font-size:3rem;margin-bottom:1rem">GAMEZO</div><p style="font-size:1rem">Lock a prompt, then ask the AI to build.</p></div>
</body></html>`;

const DEFAULT_PROMPT = "a boss fight where the floor is a keyboard";

export function GamezoGamePage() {
  const router = useRouter();
  const [roomId] = useState(() => getSessionValue("gamezo_roomId"));
  const [userId] = useState(() => getOrCreateUserId());
  const aiChatRef = useRef<HTMLDivElement>(null);

  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [promptLocked, setPromptLocked] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SECONDS);
  const [phase, setPhase] = useState<GamePhase>("BUILD_PHASE");
  const [code, setCode] = useState("");
  const [preview, setPreview] = useState(EMPTY_PREVIEW);
  const [aiInput, setAiInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [evalBadge, setEvalBadge] = useState<EvalBadge | null>(null);
  const [activeTab, setActiveTab] = useState<"AI" | "Preview" | "Code" | "Players">("AI");
  const [aiMessages, setAiMessages] = useState<AiMsg[]>([
    {
      role: "system",
      text: "Lock your prompt, then ask the AI builder to generate and improve a playable one-file game.",
    },
  ]);

  const { attachStream, getStream, hasCamera } = useWebcam();
  const { attachPeerStream } = useWebRTC({
    roomId,
    userId,
    getLocalStream: getStream,
    enabled: !!roomId && !!userId,
  });

  const { send } = useGameSocket({
    "phase-change": (msg) => {
      const newPhase = String(msg["state"]) as GamePhase;
      setPhase(newPhase);
      const remaining = Number(msg["remainingMs"] ?? 0);
      if (remaining > 0) setSecondsLeft(Math.round(remaining / 1000));
      if (newPhase === "GRADING" || newPhase === "COMPLETE") router.push("/judging");
    },
    "sync-state": (msg) => {
      const newPhase = String(msg["state"]) as GamePhase;
      setPhase(newPhase);
      const remaining = Number(msg["remainingMs"] ?? 0);
      if (remaining > 0) setSecondsLeft(Math.round(remaining / 1000));
    },
    "grade-complete": () => router.push("/judging"),
    error: (msg) => console.error("[WS]", msg["message"]),
  });

  useEffect(() => {
    if (!roomId) return;
    const timer = setTimeout(() => {
      send({ type: "join-room", userId, roomId });
    }, 300);
    return () => clearTimeout(timer);
  }, [roomId, send, userId]);

  useEffect(() => {
    if (phase !== "BUILD_PHASE" && phase !== "RUN_PHASE") return;
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft, phase]);

  useEffect(() => {
    aiChatRef.current?.scrollTo({ top: aiChatRef.current.scrollHeight, behavior: "smooth" });
  }, [aiMessages]);

  function lockPrompt() {
    const locked = prompt.trim() || DEFAULT_PROMPT;
    setPrompt(locked);
    setAiInput(locked);
    setPromptLocked(true);
    setAiMessages((messages) => [
      ...messages,
      { role: "system", text: `Prompt locked: ${locked}` },
    ]);
  }

  async function sendToAI() {
    const nextPrompt = aiInput.trim();
    if (!nextPrompt || isGenerating) return;

    setAiInput("");
    setIsGenerating(true);
    setEvalBadge(null);
    setActiveTab("Preview");
    setAiMessages((messages) => [
      ...messages,
      { role: "user", text: nextPrompt },
      { role: "assistant", text: "", isGenerating: true },
    ]);

    try {
      const result = await buildGameWithAi(nextPrompt, code || undefined);
      const extracted = extractHtml(result.html);

      if (extracted) {
        setCode(extracted);
        setPreview(extracted);
        setEvalBadge({ total: result.total, attempts: result.attempts, chaos: result.chaos });
        submitGameCode({ roomId, userId, html: extracted }).catch(() => {});
      }

      setAiMessages((messages) => replaceGeneratingMessage(messages, describeBuildResult(Boolean(extracted), result.total, result.attempts, result.chaos)));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong";
      setAiMessages((messages) => replaceGeneratingMessage(messages, `Error: ${message}`));
    } finally {
      setIsGenerating(false);
    }
  }

  function resetBuild() {
    setCode("");
    setPreview(EMPTY_PREVIEW);
    setEvalBadge(null);
    setAiInput(prompt);
    setActiveTab("AI");
  }

  function requestFix() {
    setAiInput("Fix bugs, improve mobile controls, and make the objective clearer.");
    setActiveTab("AI");
  }

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeStr = `${minutes}:${String(seconds).padStart(2, "0")}`;

  if (!promptLocked) {
    return (
      <PromptLockScreen
        prompt={prompt}
        onPromptChange={setPrompt}
        onLock={lockPrompt}
        attachStream={attachStream}
        attachPeerStream={attachPeerStream}
        hasCamera={hasCamera}
      />
    );
  }

  return (
    <BuildArena
      roomCode={getRoomCode(roomId)}
      timeStr={timeStr}
      isUrgent={secondsLeft <= 30}
      activeTab={activeTab}
      messages={aiMessages}
      input={aiInput}
      isGenerating={isGenerating}
      chatRef={aiChatRef}
      preview={preview}
      code={code}
      evalBadge={evalBadge}
      attachStream={attachStream}
      attachPeerStream={attachPeerStream}
      hasCamera={hasCamera}
      onReady={() => router.push("/judging")}
      onTabChange={setActiveTab}
      onInputChange={setAiInput}
      onSend={sendToAI}
      onReset={resetBuild}
      onFix={requestFix}
    />
  );
}

function extractHtml(raw: string): string | null {
  const start = raw.indexOf("<!DOCTYPE");
  const end = raw.lastIndexOf("</html>") + "</html>".length;
  if (start === -1 || end < start) return null;
  return raw.slice(start, end);
}

function replaceGeneratingMessage(messages: AiMsg[], text: string): AiMsg[] {
  const updated = [...messages];
  const last = updated[updated.length - 1];
  if (last?.isGenerating) {
    updated[updated.length - 1] = { role: "assistant", text, isGenerating: false };
  }
  return updated;
}

function describeBuildResult(hasHtml: boolean, total: number, attempts: number, chaos: number): string {
  if (!hasHtml) return "Generated a response, but could not extract clean HTML. Try rephrasing the prompt.";
  const quality = total >= 32 ? "Great game" : total >= 28 ? "Ready to play" : "Best effort";
  const refined = attempts > 1 ? ` Refined ${attempts} times.` : "";
  const weird = chaos >= 7 ? " The chaos score is strong." : "";
  return `${quality}. Your game is live in the preview.${refined}${weird}`;
}
