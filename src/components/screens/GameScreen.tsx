"use client";
import { ASSETS } from "@/lib/assets";
import { useGameSocket } from "@/lib/useGameSocket";
import { useWebcam } from "@/lib/useWebcam";
import { useWebRTC } from "@/lib/useWebRTC";
import { TOTAL_SECONDS, type ChatMsg } from "@/lib/game-data";
import type { MatchPhase, PlayerSlot } from "@/lib/gamezo-runtime";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

// ─── helpers ──────────────────────────────────────────────────────────────────
function getSession(key: string, fallback = "") {
  if (typeof window === "undefined") return fallback;
  return sessionStorage.getItem(key) ?? fallback;
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

  const [roomId] = useState(() => getSession("gamezo_roomId"));
  const [userId] = useState(() => getSession("gamezo_userId"));
  const [matchToken] = useState(() => getSession("gamezo_matchToken"));
  const [yourSlot] = useState<PlayerSlot>(() => (
    getSession("gamezo_yourSlot") === "playerB" ? "playerB" : "playerA"
  ));

  // Timer
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SECONDS);
  const [phase, setPhase] = useState<MatchPhase>("BUILD_PHASE");

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
  const [submitted, setSubmitted] = useState(false);
  const [ready, setReady] = useState(false);
  const [opponentReady, setOpponentReady] = useState(false);
  const aiChatRef = useRef<HTMLDivElement>(null);
  const previewFrameRef = useRef<HTMLIFrameElement>(null);

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
    enabled:       !!roomId && !!userId,
  });

  // ── WebSocket ────────────────────────────────────────────────────────────────
  const { send, connected } = useGameSocket({
    "phase-change": (msg) => {
      const newPhase = String(msg["state"]) as MatchPhase;
      setPhase(newPhase);
      const remaining = Number(msg["remainingMs"] ?? 0);
      if (remaining > 0) setSecondsLeft(Math.round(remaining / 1000));
      if (newPhase === "VOTING" || newPhase === "COMPLETE") router.push("/judging");
    },
    "sync-state": (msg) => {
      const st = String(msg["state"]) as MatchPhase;
      setPhase(st);
      const remaining = Number(msg["remainingMs"] ?? 0);
      if (remaining > 0) setSecondsLeft(Math.round(remaining / 1000));
    },
    "ready-update": (msg) => {
      const state = msg["ready"] as Partial<Record<PlayerSlot, boolean>>;
      setReady(Boolean(state?.[yourSlot]));
      setOpponentReady(Boolean(state?.[yourSlot === "playerA" ? "playerB" : "playerA"]));
    },
    "submission-update": (msg) => {
      if (msg["slot"] === yourSlot) setSubmitted(true);
    },
    "chat-message": (msg) => {
      const from = msg["from"] === userId ? "you" : "opponent";
      setChatMsgs((items) => [...items, { from, text: String(msg["text"] ?? "") }]);
    },
    "demo-input": (msg) => {
      previewFrameRef.current?.contentWindow?.postMessage({
        type: "gamezo-demo-input",
        event: msg["event"],
      }, "*");
    },
    error: (msg) => console.error("[WS]", msg["message"]),
  });

  useEffect(() => {
    if (!connected || !roomId || !userId) return;
    send({ type: "join-room", userId, roomId, matchToken });
  }, [connected, matchToken, roomId, send, userId]);

  // ── Countdown ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "BUILD_PHASE" && phase !== "PLAYER_A_DEMO" && phase !== "PLAYER_B_DEMO") return;
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
  function submitCode(finalCode: string) {
    if (!roomId || !userId || !finalCode) return;
    send({ type: "submit-game", userId, roomId, matchToken, html: finalCode });
    setSubmitted(true);
  }

  // ── AI generation (eval-loop: generate → evaluate → refine) ─────────────
  async function sendToAI() {
    const prompt = aiInput.trim();
    if (!prompt || isGenerating) return;
    setAiInput("");
    setIsGenerating(true);
    setEvalBadge(null);

    setAiMessages((prev) => [...prev, { role: "user", text: prompt }]);
    setAiMessages((prev) => [...prev, { role: "assistant", text: "", isGenerating: true }]);

    try {
      const res = await fetch("/api/ai-build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, currentCode: code || undefined, roomId, userId, matchToken }),
      });

      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? "Request failed");
      }

      // Read eval metadata from headers
      const total    = Number(res.headers.get("X-Eval-Total")    ?? 0);
      const attempts = Number(res.headers.get("X-Eval-Attempts") ?? 1);
      const chaos    = Number(res.headers.get("X-Eval-Chaos")    ?? 0);
      // Read full HTML body
      const html = await res.text();
      const extracted = extractHtml(html);

      if (extracted) {
        setCode(extracted);
        setPreview(injectDemoRelay(extracted));
        submitCode(extracted);
        if (total > 0) setEvalBadge({ total, attempts, chaos });
      }

      const attemptsLabel = attempts > 1 ? ` (refined ${attempts}×)` : "";
      const qualityLabel  = total >= 32 ? "🔥 great game" : total >= 28 ? "✓ ready to play" : "⚠ best effort";
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

  function injectDemoRelay(html: string): string {
    const relay = `<script>
window.addEventListener("message",function(e){
  if(!e.data||e.data.type!=="gamezo-demo-input")return;
  var ev=e.data.event||{};
  var target=document.elementFromPoint(ev.x||innerWidth/2,ev.y||innerHeight/2)||document.body;
  if(ev.kind==="key"){
    target.dispatchEvent(new KeyboardEvent(ev.name,{key:ev.key,bubbles:true}));
  } else {
    target.dispatchEvent(new PointerEvent(ev.name,{clientX:ev.x||0,clientY:ev.y||0,bubbles:true}));
    target.dispatchEvent(new MouseEvent(ev.name.replace("pointer","mouse"),{clientX:ev.x||0,clientY:ev.y||0,bubbles:true}));
  }
});
</script>`;
    return html.includes("</body>") ? html.replace("</body>", `${relay}</body>`) : `${html}${relay}`;
  }

  function sendOpponentChat() {
    const txt = chatInput.trim();
    if (!txt) return;
    send({ type: "chat-message", roomId, userId, matchToken, text: txt });
    setChatInput("");
  }

  function markReady() {
    if (!code) return;
    if (!submitted) submitCode(code);
    setReady(true);
    send({ type: "player-ready", roomId, userId, matchToken });
  }

  useEffect(() => {
    const activeSlot = phase === "PLAYER_A_DEMO" ? "playerA" : phase === "PLAYER_B_DEMO" ? "playerB" : null;
    if (activeSlot !== yourSlot) return;

    function sendPointer(event: PointerEvent) {
      send({
        type: "demo-input",
        roomId,
        userId,
        matchToken,
        event: { kind: "pointer", name: event.type, x: event.clientX, y: event.clientY },
      });
    }
    function sendKey(event: KeyboardEvent) {
      send({
        type: "demo-input",
        roomId,
        userId,
        matchToken,
        event: { kind: "key", name: event.type, key: event.key },
      });
    }

    window.addEventListener("pointerdown", sendPointer);
    window.addEventListener("pointermove", sendPointer);
    window.addEventListener("pointerup", sendPointer);
    window.addEventListener("keydown", sendKey);
    window.addEventListener("keyup", sendKey);
    return () => {
      window.removeEventListener("pointerdown", sendPointer);
      window.removeEventListener("pointermove", sendPointer);
      window.removeEventListener("pointerup", sendPointer);
      window.removeEventListener("keydown", sendKey);
      window.removeEventListener("keyup", sendKey);
    };
  }, [matchToken, phase, roomId, send, userId, yourSlot]);

  // ── Timer display ─────────────────────────────────────────────────────────
  const mins     = Math.floor(secondsLeft / 60);
  const secs     = secondsLeft % 60;
  const timeStr  = `${mins}:${String(secs).padStart(2, "0")}`;
  const isUrgent = secondsLeft <= 30;
  const pct      = secondsLeft / TOTAL_SECONDS;
  const placeholder = useMemo(
    () => {
      const seed = userId.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
      return PLACEHOLDER_PROMPTS[seed % PLACEHOLDER_PROMPTS.length];
    },
    [userId]
  );

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
              <span className="text-[10px] text-white/45 font-semibold uppercase tracking-wide">{phase.replaceAll("_", " ")}</span>
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
                disabled={isGenerating || phase !== "BUILD_PHASE"}
              />
              <button
                onClick={sendToAI}
                disabled={isGenerating || !aiInput.trim() || phase !== "BUILD_PHASE"}
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
            <button
              onClick={markReady}
              disabled={!code || ready || phase !== "BUILD_PHASE"}
              className="mt-3 w-full rounded-xl bg-green-500 px-3 py-2 text-xs font-black uppercase tracking-wide text-black transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {ready ? opponentReady ? "Both ready" : "Ready - waiting for opponent" : submitted ? "Ready up" : "Submit and ready"}
            </button>
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
                ref={previewFrameRef}
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
                  <p className="text-xs text-white/30">Hidden until<br/>time&apos;s up</p>
                </div>
              </div>
              {/* Opponent webcam — populated by WebRTC peer connection */}
              <div className="flex-shrink-0 border-t border-white/10 bg-[#0F0F0F]">
                <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
                  <video
                    ref={attachPeerStream}
                    autoPlay
                    playsInline
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
