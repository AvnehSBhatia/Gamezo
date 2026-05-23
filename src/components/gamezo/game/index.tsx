"use client";

import { BuildArena } from "@/components/gamezo/game/build-arena";
import type { AiMsg, EvalBadge, GamePhase } from "@/components/gamezo/game/game-types";
import { PromptLockScreen } from "@/components/gamezo/game/prompt-lock-screen";
import {
  clearMatchSession,
  getRoomCode,
  getSessionValue,
  setSessionValue,
  storeMatchFromWs,
} from "@/components/gamezo/game/session";
import { buildGameWithAi, generateSprite, storeJudgeResult, submitGameCode } from "@/lib/api";
import type { GameAsset } from "@/components/gamezo/game/game-types";
import { pickChaosSeed } from "@/lib/chaos-seeds";
import { DEFAULT_GAME_HTML } from "@/lib/game-html";
import { TOTAL_SECONDS } from "@/lib/game-data";
import { useMatchSession } from "@/lib/use-match-session";
import { useSafeNavigate } from "@/lib/use-safe-navigate";
import { useGameSocket } from "@/lib/useGameSocket";
import { useWebcam } from "@/lib/useWebcam";
import { useWebRTC } from "@/lib/useWebRTC";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const EMPTY_PREVIEW = `<!DOCTYPE html>
<html><body style="margin:0;background:#111;color:#555;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center">
<div><div style="font-size:3rem;margin-bottom:1rem">GAMEZO</div><p style="font-size:1rem">Lock a prompt, then ask the AI to build.</p></div>
</body></html>`;

export function GamezoGamePage() {
  const navigate = useSafeNavigate();
  const { roomId, userId, yourSlot, hydrated } = useMatchSession();
  const aiChatRef = useRef<HTMLDivElement>(null);

  const [chaosSeed, setChaosSeed] = useState("");
  const [prompt, setPrompt] = useState("");
  const [selfPromptLocked, setSelfPromptLocked] = useState(false);
  const [promptLocked, setPromptLocked] = useState(false);
  const [opponentPromptLocked, setOpponentPromptLocked] = useState(false);
  const [opponentReady, setOpponentReady] = useState(false);
  const [selfReady, setSelfReady] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SECONDS);
  const [phase, setPhase] = useState<GamePhase>("WAITING_PROMPTS");
  const [code, setCode] = useState("");
  const [preview, setPreview] = useState(EMPTY_PREVIEW);
  const [assets, setAssets] = useState<GameAsset[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingSprite, setIsGeneratingSprite] = useState(false);
  const [evalBadge, setEvalBadge] = useState<EvalBadge | null>(null);
  const [activeTab, setActiveTab] = useState<"AI" | "Preview" | "Code" | "Players">("AI");
  const [aiMessages, setAiMessages] = useState<AiMsg[]>([]);
  const [previewVersion, setPreviewVersion] = useState(0);

  useEffect(() => {
    if (!hydrated) return;
    const seed = getSessionValue("gamezo_chaosSeed", pickChaosSeed());
    setChaosSeed(seed);
    setPrompt(seed);
    setAiMessages([
      { role: "system", text: `Chaos seed: "${seed}". Lock your prompt, then ask the AI builder to generate a playable one-file game.` },
    ]);
  }, [hydrated]);

  const { attachStream, getStream, hasCamera, hasMic, micEnabled, toggleMic, error: cameraError, requesting: cameraRequesting, requestCamera } = useWebcam();
  const { attachPeerStream, hasRemoteStream } = useWebRTC({
    roomId,
    userId,
    getLocalStream: getStream,
    enabled: !!roomId && !!userId,
  });

  const handlePhaseChange = useCallback((msg: Record<string, unknown>) => {
    const newPhase = String(msg.state) as GamePhase;
    setPhase(newPhase);
    const remaining = Number(msg.remainingMs ?? 0);
    if (remaining > 0) setSecondsLeft(Math.round(remaining / 1000));

    if (newPhase === "BUILD_PHASE") {
      setPromptLocked(true);
      setSessionValue("gamezo_promptLocked", "1");
    }
    if (newPhase === "RUN_PHASE") navigate("/demo");
    if (newPhase === "GRADING" || newPhase === "COMPLETE") navigate("/judging");
  }, [navigate]);

  const { send, connected } = useGameSocket({
    "phase-change": handlePhaseChange,
    "sync-state": (msg) => {
      handlePhaseChange(msg);
      const serverPhase = String(msg.state ?? "");
      if (serverPhase === "BUILD_PHASE" || serverPhase === "RUN_PHASE" || serverPhase === "GRADING" || serverPhase === "COMPLETE") {
        setPromptLocked(true);
        setSessionValue("gamezo_promptLocked", "1");
      }
      if (msg.promptLocked) {
        const locked = msg.promptLocked as { playerA: boolean; playerB: boolean };
        const slot = yourSlot;
        if (!slot) return;
        const oppLocked = slot === "playerA" ? locked.playerB : locked.playerA;
        setOpponentPromptLocked(oppLocked);
        if (locked.playerA && locked.playerB) {
          setPromptLocked(true);
          setSessionValue("gamezo_promptLocked", "1");
        }
      }
      if (msg.ready) {
        const ready = msg.ready as { playerA: boolean; playerB: boolean };
        const slot = yourSlot;
        if (!slot) return;
        setOpponentReady(slot === "playerA" ? ready.playerB : ready.playerA);
        setSelfReady(slot === "playerA" ? ready.playerA : ready.playerB);
      }
    },
    "prompt-status": (msg) => {
      const locked = msg.promptLocked as { playerA: boolean; playerB: boolean };
      const slot = yourSlot;
      if (!slot) return;
      setOpponentPromptLocked(slot === "playerA" ? locked.playerB : locked.playerA);
      if (locked.playerA && locked.playerB) {
        setPromptLocked(true);
        setSessionValue("gamezo_promptLocked", "1");
      }
    },
    "ready-status": (msg) => {
      const ready = msg.ready as { playerA: boolean; playerB: boolean };
      const slot = yourSlot;
      if (!slot) return;
      setOpponentReady(slot === "playerA" ? ready.playerB : ready.playerA);
      setSelfReady(slot === "playerA" ? ready.playerA : ready.playerB);
    },
    "grade-complete": (msg) => {
      if (msg.judgeResult) storeJudgeResult(msg.judgeResult as Parameters<typeof storeJudgeResult>[0]);
      navigate("/judging");
    },
    "rematch-start": (msg) => {
      storeMatchFromWs(msg);
      setPromptLocked(false);
      setSelfPromptLocked(false);
      setSessionValue("gamezo_promptLocked", "");
      setOpponentPromptLocked(false);
      setSelfReady(false);
      setOpponentReady(false);
      setCode("");
      setPreview(EMPTY_PREVIEW);
      setPhase("WAITING_PROMPTS");
      setPrompt(String(msg.chaosSeed ?? chaosSeed));
    },
    "return-to-queue": () => navigate("/matchmaking"),
    error: (msg) => {
      const message = String(msg.message ?? "");
      if (message.toLowerCase().includes("room not found")) {
        clearMatchSession();
        navigate("/matchmaking");
        return;
      }
      console.error("[WS]", message);
    },
  });

  useEffect(() => {
    if (!hydrated) return;
    if (!roomId) {
      navigate("/matchmaking");
      return;
    }
    const timer = setTimeout(() => send({ type: "join-room", userId, roomId }), 300);
    return () => clearTimeout(timer);
  }, [hydrated, roomId, send, userId, navigate]);

  useEffect(() => {
    if (phase !== "BUILD_PHASE") return;
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((v) => Math.max(0, v - 1)), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft, phase]);

  useEffect(() => {
    aiChatRef.current?.scrollTo({ top: aiChatRef.current.scrollHeight, behavior: "smooth" });
  }, [aiMessages]);

  function lockPrompt() {
    const locked = prompt.trim() || chaosSeed;
    setPrompt(locked);
    setAiInput(locked);
    setSelfPromptLocked(true);
    send({ type: "lock-prompt", userId, roomId, prompt: locked });
    setAiMessages((m) => [...m, { role: "system", text: `Prompt locked: ${locked}. Waiting for opponent…` }]);
    if (!connected) toast.message("Connecting to game server…");
  }

  function handleReady() {
    setSelfReady(true);
    send({ type: "player-ready", userId, roomId });
  }

  async function sendToAI(overridePrompt?: string) {
    const nextPrompt = (overridePrompt ?? aiInput).trim();
    if (!nextPrompt || isGenerating) return;

    setAiInput("");
    setIsGenerating(true);
    setEvalBadge(null);
    setActiveTab("Preview");
    setAiMessages((m) => [...m, { role: "user", text: nextPrompt }, { role: "assistant", text: "", isGenerating: true }]);

    try {
      const result = await buildGameWithAi(nextPrompt, code || undefined);
      const extracted = extractHtml(result.html);

      if (extracted) {
        const withAssets = injectAssets(extracted, assets);
        setCode(withAssets);
        setPreview(withAssets);
        setPreviewVersion((v) => v + 1);
        setEvalBadge({ total: result.total, attempts: result.attempts, chaos: result.chaos });
        submitGameCode({ roomId, userId, html: withAssets, assets }).catch(() => {});
      }

      setAiMessages((m) => replaceGeneratingMessage(m, describeBuildResult(Boolean(extracted), result.total, result.attempts, result.chaos)));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong";
      setAiMessages((m) => replaceGeneratingMessage(m, `Error: ${message}`));
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleGenerateSprite() {
    if (isGeneratingSprite) return;
    setIsGeneratingSprite(true);
    try {
      const desc = prompt.trim() || "game character sprite";
      const sprite = await generateSprite(desc);
      const asset: GameAsset = { dataUrl: sprite.dataUrl, description: desc };
      setAssets((prev) => [...prev, asset]);
      setAiInput(`${aiInput}${aiInput ? ", " : ""}use this sprite: ${sprite.dataUrl}`);
      toast.success("Sprite generated — ask AI to add it to your game");
    } catch {
      toast.error("Sprite generation failed");
    } finally {
      setIsGeneratingSprite(false);
    }
  }

  function resetBuild() {
    setCode("");
    setPreview(EMPTY_PREVIEW);
    setPreviewVersion((v) => v + 1);
    setEvalBadge(null);
    setAiInput(prompt);
    setActiveTab("AI");
  }

  function handleCodeChange(next: string) {
    setCode(next);
  }

  function runPreview() {
    const html = code.trim() || DEFAULT_GAME_HTML;
    setPreview(html);
    setPreviewVersion((v) => v + 1);
    setActiveTab("Preview");
    submitGameCode({ roomId, userId, html, assets }).catch(() => {});
    toast.success("Preview updated");
  }

  function requestFix() {
    const fixPrompt = "Fix bugs, improve mobile controls, and make the objective clearer.";
    setActiveTab("AI");
    void sendToAI(fixPrompt);
  }

  async function copyRoomLink() {
    const { copyShareUrl } = await import("@/components/gamezo/game/session");
    const ok = await copyShareUrl(roomId);
    if (ok) toast.success("Spectator link copied!");
    else toast.error("Could not copy link");
  }

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeStr = `${minutes}:${String(seconds).padStart(2, "0")}`;

  if (!hydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fffdf8] text-neutral-500">
        Loading game…
      </main>
    );
  }

  if (phase === "WAITING_PROMPTS") {
    return (
      <PromptLockScreen
        prompt={prompt}
        onPromptChange={setPrompt}
        onLock={lockPrompt}
        attachStream={attachStream}
        attachPeerStream={attachPeerStream}
        hasCamera={hasCamera}
        hasRemoteStream={hasRemoteStream}
        cameraError={cameraError}
        cameraRequesting={cameraRequesting}
        onEnableCamera={() => void requestCamera()}
        hasMic={hasMic}
        micEnabled={micEnabled}
        onToggleMic={toggleMic}
        opponentPromptLocked={opponentPromptLocked}
        chaosSeed={chaosSeed}
        selfPromptLocked={selfPromptLocked}
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
      hasRemoteStream={hasRemoteStream}
      cameraError={cameraError}
      cameraRequesting={cameraRequesting}
      onEnableCamera={() => void requestCamera()}
      hasMic={hasMic}
      micEnabled={micEnabled}
      onToggleMic={toggleMic}
      selfReady={selfReady}
      opponentReady={opponentReady}
      onReady={handleReady}
      onCopyLink={copyRoomLink}
      onTabChange={setActiveTab}
      onInputChange={setAiInput}
      onSend={() => void sendToAI()}
      onReset={resetBuild}
      onFix={requestFix}
      onGenerateSprite={handleGenerateSprite}
      isGeneratingSprite={isGeneratingSprite}
      assets={assets}
      onCodeChange={handleCodeChange}
      onRun={runPreview}
      previewVersion={previewVersion}
    />
  );
}

function injectAssets(html: string, assets: GameAsset[]): string {
  if (!assets.length) return html;
  const imgs = assets.map((a) => `<img src="${a.dataUrl}" alt="${a.description}" style="display:none" data-gamezo-asset />`).join("");
  if (html.includes("</body>")) return html.replace("</body>", `${imgs}</body>`);
  return html + imgs;
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
  if (last?.isGenerating) updated[updated.length - 1] = { role: "assistant", text, isGenerating: false };
  return updated;
}

function describeBuildResult(hasHtml: boolean, total: number, attempts: number, chaos: number): string {
  if (!hasHtml) return "Generated a response, but could not extract clean HTML. Try rephrasing the prompt.";
  const quality = total >= 32 ? "Great game" : total >= 28 ? "Ready to play" : "Best effort";
  const refined = attempts > 1 ? ` Refined ${attempts} times.` : "";
  const weird = chaos >= 7 ? " The chaos score is strong." : "";
  return `${quality}. Your game is live in the preview.${refined}${weird}`;
}
