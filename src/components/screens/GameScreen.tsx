"use client";
import { auth, memory } from "@eazo/sdk";
import { useEazo } from "@eazo/sdk/react";
import { ASSETS } from "@/lib/assets";
import { useGameSocket } from "@/lib/useGameSocket";
import { useWebcam } from "@/lib/useWebcam";
import { useWebRTC } from "@/lib/useWebRTC";
import { TOTAL_SECONDS, type ChatMsg } from "@/lib/game-data";
import { buildGameWithAi, submitGameToRoom, type AiBuildResult } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// ─── helpers ──────────────────────────────────────────────────────────────────
function getSession(key: string, fallback = "") {
  if (typeof window === "undefined") return fallback;
  return sessionStorage.getItem(key) ?? fallback;
}

function getOrCreateUserId(): string {
  if (typeof window === "undefined") return "demo-user";
  const existing = sessionStorage.getItem("gamezo_userId");
  if (existing) return existing;
  const id = `usr_${Math.random().toString(36).slice(2, 12)}`;
  sessionStorage.setItem("gamezo_userId", id);
  return id;
}

const PLACEHOLDER_PROMPTS = [
  "a bouncing ball game",
  "a chaotic cooking sim",
  "whack-a-mole but evil",
  "a side-scrolling runner",
  "snake but on ice",
];

const EMPTY_PREVIEW = `<!DOCTYPE html>
<html><body style="margin:0;background:#111;color:#555;font-family:sans-serif;
display:flex;align-items:center;justify-content:center;height:100vh;text-align:center">
<div><div style="font-size:3rem;margin-bottom:1rem">🎮</div>
<p style="font-size:1rem">Describe your game to the AI<br>and it will appear here</p>
</div></body></html>`;

// ─── AI message types ─────────────────────────────────────────────────────────
interface AiMsg {
  role: "user" | "assistant" | "system";
  text: string;
  isGenerating?: boolean;
}

// ─── component ────────────────────────────────────────────────────────────────
export default function GameScreen() {
  const router = useRouter();
  const user = useEazo((s) => s.auth.user);
  const authLoading = useEazo((s) => s.auth.loading);

  const [roomId] = useState(() => getSession("gamezo_roomId", "demo-room"));
  const [userId] = useState(() => getSession("gamezo_userId", getOrCreateUserId()));
  const [placeholder] = useState(
    () => PLACEHOLDER_PROMPTS[Math.floor(Math.random() * PLACEHOLDER_PROMPTS.length)],
  );

  // Timer
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SECONDS);
  const [phase, setPhase] = useState<"BUILD_PHASE" | "RUN_PHASE" | "GRADING" | "COMPLETE">("BUILD_PHASE");

  // Game code + preview
  const [code,    setCode]    = useState("");
  const [preview, setPreview] = useState(EMPTY_PREVIEW);

  // AI chat
  const [aiMessages, setAiMessages] = useState<AiMsg[]>([
    {
      role: "system",
      text: `You have ${Math.floor(TOTAL_SECONDS / 60)} minutes. Describe what you want to build — the AI will write, evaluate, and refine your game automatically.`,
    },
  ]);
  const [aiInput,      setAiInput]      = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [evalBadge,    setEvalBadge]    = useState<{ total: number; attempts: number; chaos: number } | null>(null);
  const aiChatRef = useRef<HTMLDivElement>(null);

  // Opponent chat
  const [chatInput,  setChatInput]  = useState("");
  const [chatMsgs,   setChatMsgs]   = useState<ChatMsg[]>([
    { from: "opponent", text: "let's gooo 🔥" },
  ]);
  const [showChat, setShowChat] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  // Webcam — your own camera
  const { attachStream, getStream, hasCamera, error: camError } = useWebcam();

  // WebRTC — opponent's camera via peer connection
  const { attachPeerStream } = useWebRTC({
    roomId,
    userId,
    getLocalStream: getStream,
    enabled:       roomId !== "demo-room" && !!roomId && !!userId,
  });

  // ── WebSocket ────────────────────────────────────────────────────────────────
  const { send } = useGameSocket({
    "phase-change": (msg) => {
      const newPhase = String(msg["state"]) as typeof phase;
      setPhase(newPhase);
      const remaining = Number(msg["remainingMs"] ?? 0);
      if (remaining > 0) setSecondsLeft(Math.round(remaining / 1000));
      if (newPhase === "GRADING" || newPhase === "COMPLETE") router.push("/judging");
    },
    "sync-state": (msg) => {
      const st = String(msg["state"]) as typeof phase;
      setPhase(st);
      const remaining = Number(msg["remainingMs"] ?? 0);
      if (remaining > 0) setSecondsLeft(Math.round(remaining / 1000));
    },
    "grade-complete": () => router.push("/judging"),
    error: (msg) => console.error("[WS]", msg["message"]),
  });

  useEffect(() => {
    if (!roomId || roomId === "demo-room") return;
    const t = setTimeout(() =>
      send({ type: "join-room", userId, roomId }), 300);
    return () => clearTimeout(t);
  }, [roomId, send, userId]);

  // ── Countdown ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "BUILD_PHASE" && phase !== "RUN_PHASE") return;
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft, phase]);

  // ── Auto-scroll ──────────────────────────────────────────────────────────────
  useEffect(() => {
    aiChatRef.current?.scrollTo({ top: aiChatRef.current.scrollHeight, behavior: "smooth" });
  }, [aiMessages]);
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [chatMsgs]);

  // ── Submit to backend ────────────────────────────────────────────────────────
  async function submitCode(finalCode: string, result: AiBuildResult) {
    if (!roomId || !finalCode) return;
    if (typeof window !== "undefined") {
      sessionStorage.setItem("gamezo_submission_html", finalCode);
      sessionStorage.setItem(
        "gamezo_submission_metrics",
        JSON.stringify({
          total: result.total,
          attempts: result.attempts,
          playability: result.playability,
          completeness: result.completeness,
          mobile: result.mobile,
          chaos: result.chaos,
          verdict: result.verdict,
        }),
      );
      sessionStorage.setItem("gamezo_submission_title", extractGameTitle(finalCode));
    }
    if (roomId === "demo-room") return;

    const backend = process.env.NEXT_PUBLIC_BACKEND_HTTP_URL ?? "http://localhost:3001";
    try {
      await submitGameToRoom(backend, roomId, {
        userId,
        html: finalCode,
        css: "",
        js: "",
        assets: [],
      });
    } catch (e) { console.error("submit failed", e); }
  }

  // ── AI generation (eval-loop: generate → evaluate → refine) ─────────────
  async function sendToAI() {
    const prompt = aiInput.trim();
    if (!prompt || isGenerating || authLoading) return;
    setAiInput("");
    setIsGenerating(true);
    setEvalBadge(null);

    setAiMessages((prev) => [...prev, { role: "user", text: prompt }]);
    setAiMessages((prev) => [...prev, { role: "assistant", text: "", isGenerating: true }]);

    try {
      if (!user) {
        await auth.login();
      }

      const result = await buildGameWithAi({ prompt, currentCode: code || undefined });
      const { html, total, attempts, chaos, verdict } = result;
      const extracted = extractHtml(html);

      if (extracted) {
        setCode(extracted);
        setPreview(extracted);
        submitCode(extracted, result);
        if (total > 0) setEvalBadge({ total, attempts, chaos });
        memory.reportAction({
          content: `User generated a Gamezo game: "${prompt}"`,
          event_type: "create",
          page: "game",
          metadata: {
            type: "create_game",
            prompt,
            total,
            verdict,
          },
        }).catch(() => {});
      }

      const attemptsLabel = attempts > 1 ? ` (refined ${attempts}×)` : "";
      const qualityLabel  = verdict === "fail" ? "⚠ best effort" : total >= 32 ? "🔥 great game" : total >= 28 ? "✓ ready to play" : "⚠ best effort";
      const chaosLabel    = chaos >= 8 ? " · maximum chaos" : chaos >= 6 ? " · pretty chaotic" : "";

      setAiMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.isGenerating) {
          updated[updated.length - 1] = {
            role: "assistant",
            text: extracted
              ? `${qualityLabel}${chaosLabel}${attemptsLabel} — your game is live in the preview. Ask me to change anything!`
              : "Generated, but couldn't extract clean HTML. Try rephrasing.",
            isGenerating: false,
          };
        }
        return updated;
      });

    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setAiMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.isGenerating) {
          updated[updated.length - 1] = { role: "assistant", text: `Error: ${msg}`, isGenerating: false };
        }
        return updated;
      });
    } finally {
      setIsGenerating(false);
    }
  }

  function extractHtml(raw: string): string | null {
    const start = raw.indexOf("<!DOCTYPE");
    const end   = raw.lastIndexOf("</html>") + "</html>".length;
    if (start === -1 || end < start) return null;
    return raw.slice(start, end);
  }

  function extractGameTitle(html: string): string {
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    if (titleMatch?.[1]) return titleMatch[1].trim();
    const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
    if (h1Match?.[1]) return h1Match[1].replace(/<[^>]+>/g, "").trim();
    return "AI-built game";
  }

  function sendOpponentChat() {
    const txt = chatInput.trim();
    if (!txt) return;
    setChatMsgs((m) => [...m, { from: "you", text: txt }]);
    setChatInput("");
  }

  // ── Timer display ─────────────────────────────────────────────────────────
  const mins     = Math.floor(secondsLeft / 60);
  const secs     = secondsLeft % 60;
  const timeStr  = `${mins}:${String(secs).padStart(2, "0")}`;
  const isUrgent = secondsLeft <= 30;
  const pct      = secondsLeft / TOTAL_SECONDS;

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen bg-[#0F0F0F] flex flex-col overflow-hidden font-sans text-white">

      {/* ── TOP BAR ────────────────────────────────────────────────────── */}
      <header className="flex items-center gap-2 px-3 py-2 bg-[#1A1A1A] border-b border-white/10 flex-shrink-0">
        <img src={ASSETS.logoMark} alt="Gamezo" className="h-7 w-7" />
        <img src={ASSETS.wordmark}  alt="Gamezo" className="h-5 hidden sm:block" />
        <div className="flex-1 flex items-center justify-center">
          <img src={ASSETS.promptPillChaos} alt="Prompt" className="h-8 object-contain max-w-full" />
        </div>
        <div className="flex flex-col items-center min-w-[52px]">
          <span className={`text-xl font-black tabular-nums ${isUrgent ? "text-red-400 animate-pulse" : "text-white"}`}>
            {timeStr}
          </span>
          <div className="w-12 h-1.5 bg-white/20 rounded-full mt-0.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${isUrgent ? "bg-red-400" : "bg-orange-400"}`}
              style={{ width: `${pct * 100}%` }}
            />
          </div>
        </div>
        <button onClick={() => setShowChat((v) => !v)} className="p-1.5 hover:bg-white/10 rounded-lg ml-1">
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white/70"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
        </button>
      </header>

      {/* ── MAIN SPLIT ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* ── LEFT: AI CODING ASSISTANT ─────────────────────────────── */}
        <div className="flex flex-col w-full md:w-[420px] md:flex-shrink-0 border-r border-white/10 overflow-hidden bg-[#141414]">

          {/* YOUR label row */}
          <div className="flex items-center gap-2 px-3 py-2 bg-[#1E2A3A] border-b border-blue-500/30 flex-shrink-0">
            <img src={ASSETS.labelYou} alt="You" className="h-5 object-contain" />
            {camError && <span className="text-[10px] text-red-400 ml-1">cam blocked</span>}
            <div className="ml-auto flex items-center gap-1.5 text-[10px] text-green-400 font-semibold">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              {hasCamera ? "cam live" : "AI ready"}
            </div>
          </div>

          {/* AI conversation */}
          <div
            ref={aiChatRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0"
          >
            {aiMessages.map((msg, i) => {
              if (msg.role === "system") {
                return (
                  <div key={i} className="text-center">
                    <span className="inline-block bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white/50 leading-relaxed">
                      {msg.text}
                    </span>
                  </div>
                );
              }

              if (msg.role === "user") {
                return (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[80%] bg-blue-600 rounded-2xl rounded-br-sm px-4 py-2.5 text-sm font-medium">
                      {msg.text}
                    </div>
                  </div>
                );
              }

              // assistant
              return (
                <div key={i} className="flex justify-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5">
                    AI
                  </div>
                  <div className="max-w-[85%] bg-white/8 border border-white/10 rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm text-white/90 leading-relaxed">
                    {msg.isGenerating ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            {[0,1,2].map((j) => (
                              <div key={j} className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: `${j * 0.15}s` }} />
                            ))}
                          </div>
                          <span className="text-xs text-white/40">building → evaluating → refining…</span>
                        </div>
                      </div>
                    ) : msg.text}
                  </div>
                </div>
              );
            })}
          </div>

          {/* AI input */}
          <div className="flex-shrink-0 p-3 border-t border-white/10 bg-[#1A1A1A]">
            <div className="flex items-end gap-2">
              <textarea
                className="flex-1 bg-white/8 border border-white/15 text-white text-sm rounded-2xl px-4 py-3 resize-none focus:outline-none focus:border-blue-500/60 placeholder-white/25 leading-snug max-h-32 transition-colors"
                placeholder={`e.g. "${placeholder}"…`}
                rows={1}
                value={aiInput}
                onChange={(e) => {
                  setAiInput(e.target.value);
                  // Auto-grow
                  e.target.style.height = "auto";
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendToAI();
                  }
                }}
                disabled={isGenerating}
              />
              <button
                onClick={sendToAI}
                disabled={isGenerating || !aiInput.trim()}
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-30
                  bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 active:scale-95 shadow-lg"
              >
                {isGenerating ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
                )}
              </button>
            </div>
            <p className="text-[10px] text-white/25 mt-2 px-1">
              Shift+Enter for new line · Enter to send
            </p>
          </div>

          {/* ── YOUR WEBCAM ──────────────────────────────────────────── */}
          <div className="flex-shrink-0 border-t border-white/10 bg-[#0F0F0F]">
            <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
              <video
                ref={attachStream}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
              />
              {!hasCamera && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-neutral-900 cam-placeholder">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white/20"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
                  <span className="text-[10px] text-white/30">
                    {camError ? "Camera blocked" : "Requesting camera…"}
                  </span>
                </div>
              )}
              <div className="absolute bottom-1 left-2">
                <img src={ASSETS.labelYou} alt="You" className="h-4 object-contain opacity-80" />
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: LIVE PREVIEW + OPPONENT ──────────────────────────── */}
        <div className="hidden md:flex flex-col flex-1 overflow-hidden">

          {/* Preview header */}
          <div className="flex items-center justify-between px-4 py-2 bg-[#1A1A1A] border-b border-white/10 flex-shrink-0">
            <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Live Preview</span>
            <div className="flex items-center gap-2">
              {isGenerating && (
                <span className="text-xs text-purple-400 animate-pulse font-semibold">AI evaluating…</span>
              )}
              {evalBadge && !isGenerating && (
                <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-2.5 py-0.5">
                  <span className="text-[10px] text-white/50">score</span>
                  <span className="text-xs font-black text-green-400">{evalBadge.total}/40</span>
                  {evalBadge.attempts > 1 && (
                    <span className="text-[10px] text-purple-400">{evalBadge.attempts}× refined</span>
                  )}
                  {evalBadge.chaos >= 7 && (
                    <span className="text-[10px]">🔥</span>
                  )}
                </div>
              )}
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
              </div>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden min-h-0">
            {/* Preview iframe */}
            <div className="flex-1 bg-[#0A0A0A]">
              <iframe
                key={preview}
                className="w-full h-full border-0"
                srcDoc={preview}
                sandbox="allow-scripts"
                title="Game preview"
              />
            </div>

            {/* Opponent panel */}
            <div className="flex flex-col w-52 border-l border-white/10 flex-shrink-0">
              <div className="flex items-center gap-2 px-3 py-2 bg-[#2A1E0E] border-b border-orange-500/30">
                <div className="w-5 h-5 rounded-full bg-neutral-700 border border-orange-400/50" />
                <img src={ASSETS.labelOpponent} alt="Opponent" className="h-4 object-contain" />
                <div className="ml-auto text-[10px] text-orange-400 animate-pulse">building…</div>
              </div>
              <div className="flex-1 flex items-center justify-center bg-[#141414]">
                <div className="text-center px-4">
                  <div className="flex gap-1.5 justify-center mb-3">
                    {[0,1,2].map((i) => (
                      <div key={i} className="w-2 h-2 bg-orange-400 rounded-full animate-ping" style={{ animationDelay: `${i * 0.2}s` }} />
                    ))}
                  </div>
                  <p className="text-xs text-white/30">Hidden until<br/>time is up</p>
                </div>
              </div>
              {/* Opponent webcam — populated by WebRTC peer connection */}
              <div className="flex-shrink-0 border-t border-white/10 bg-[#0F0F0F]">
                <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
                  <video
                    ref={attachPeerStream}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-neutral-900 peer-video-placeholder">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white/20"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
                    <span className="text-[10px] text-white/25">Waiting for opponent…</span>
                  </div>
                  <div className="absolute bottom-1 left-2">
                    <img src={ASSETS.labelOpponent} alt="Opponent" className="h-4 object-contain opacity-80" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile: preview below AI chat */}
        <div className="flex md:hidden flex-col w-0 overflow-hidden">
          {/* hidden — full screen is AI chat on mobile; preview shown when run */}
        </div>
      </div>

      {/* ── OPPONENT CHAT ─────────────────────────────────────────────── */}
      {showChat && (
        <div className="fixed bottom-4 right-4 z-50 w-72 bg-[#1E1E1E] rounded-2xl shadow-2xl border border-white/10 flex flex-col overflow-hidden max-h-[60vh]">
          <div className="flex justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full" />
              <span className="font-bold text-sm">Opponent Chat</span>
            </div>
            <button onClick={() => setShowChat(false)} className="text-white/40 hover:text-white text-xl">×</button>
          </div>
          <div ref={chatRef} className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[80px]">
            {chatMsgs.map((m, i) => (
              <div key={i} className={`flex ${m.from === "you" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-xs font-medium ${
                  m.from === "you" ? "bg-blue-600 rounded-br-sm" : "bg-white/10 rounded-bl-sm"
                }`}>{m.text}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 px-3 py-2.5 border-t border-white/10 flex-shrink-0">
            <input
              className="flex-1 bg-white/10 text-xs rounded-full px-3 py-2 focus:outline-none placeholder-white/30"
              placeholder="Talk trash…"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendOpponentChat()}
            />
            <button onClick={sendOpponentChat} className="w-8 h-8 bg-blue-500 hover:bg-blue-400 rounded-full flex items-center justify-center active:scale-90 flex-shrink-0">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
