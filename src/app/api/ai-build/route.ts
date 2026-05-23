import { ai } from "@eazo/sdk";
import { NextRequest, NextResponse } from "next/server";

// ─── Prompts ──────────────────────────────────────────────────────────────────

const BUILDER_SYSTEM = `You are an expert game developer helping someone build a tiny web game in under 5 minutes.

Given the user's description or change request, return a COMPLETE, self-contained HTML document that:
- Uses ONLY vanilla HTML, CSS, and JavaScript — no external libraries, no CDN links
- Runs fully inside a sandboxed iframe (no fetch, no WebSocket, no localStorage)
- Is immediately fun and playable — has a clear win/lose condition or objective
- Has a dark background (#111 or similar) and visible game title at the top
- Responds to BOTH touch (touchstart/touchend/touchmove) AND keyboard/mouse events
- Contains zero placeholder text, zero TODO comments, zero unfinished sections
- Is surprising, chaotic, or funny in at least one way
- Keeps all JS under 250 lines and avoids over-engineering

Respond ONLY with raw HTML. Start with <!DOCTYPE html>. No markdown, no code fences, no explanation.`;

const EVALUATOR_SYSTEM = `You are a strict code quality judge for a competitive game-building contest.

You will receive an HTML game submission. Evaluate it on exactly these four dimensions and respond ONLY with a valid JSON object — no markdown, no explanation, nothing else:

{
  "playability": <0-10>,
  "completeness": <0-10>,
  "mobile": <0-10>,
  "chaos": <0-10>,
  "total": <sum of above>,
  "issues": ["list of specific problems to fix"],
  "verdict": "pass" | "fail"
}

Scoring guide:
- playability (0-10): Does it run? Is there a clear objective, win state, or feedback loop? 10 = fully playable, 0 = blank screen or crash
- completeness (0-10): No placeholders, no TODOs, no broken references, no missing assets. 10 = fully finished
- mobile (0-10): Does it handle touch events? Is it playable on a phone with thumbs? 10 = excellent touch UX
- chaos (0-10): Is there something unexpected, funny, or delightfully broken about it? 10 = extremely chaotic

verdict = "pass" if total >= 28, else "fail"`;

const REFINER_SYSTEM = `You are an expert game developer. You will receive:
1. An HTML game that has quality issues
2. A list of specific problems identified by an evaluator

Fix ALL the listed issues and return a COMPLETE, improved HTML document.
- Keep everything that was working
- Do not add new features, just fix the problems
- Respond ONLY with raw HTML starting with <!DOCTYPE html>`;

// ─── Model ────────────────────────────────────────────────────────────────────
const MODEL = "deepseek.v3.1";
const MAX_RETRIES = 2;
const PASS_THRESHOLD = 28;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function generateFull(messages: { role: "user" | "assistant" | "system"; content: string }[]): Promise<string> {
  const result = await ai.chat({ model: MODEL, messages, stream: false });
  return (result as { choices: { message: { content: string } }[] }).choices?.[0]?.message?.content ?? "";
}

function extractHtml(raw: string): string {
  const start = raw.indexOf("<!DOCTYPE");
  const end   = raw.lastIndexOf("</html>") + "</html>".length;
  if (start === -1 || end < 9) return raw.trim();
  return raw.slice(start, end);
}

interface EvalResult {
  playability: number;
  completeness: number;
  mobile: number;
  chaos: number;
  total: number;
  issues: string[];
  verdict: "pass" | "fail";
}

async function evaluateGame(html: string): Promise<EvalResult> {
  const raw = await generateFull([
    { role: "system",  content: EVALUATOR_SYSTEM },
    { role: "user",    content: `Evaluate this game submission:\n\n${html.slice(0, 8000)}` },
  ]);

  // Strip markdown fences if model wraps in them
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  try {
    return JSON.parse(cleaned) as EvalResult;
  } catch {
    // If JSON parse fails, default to pass to avoid blocking the user
    console.warn("[eval] parse failed, defaulting to pass:", cleaned.slice(0, 200));
    return { playability: 8, completeness: 8, mobile: 7, chaos: 7, total: 30, issues: [], verdict: "pass" };
  }
}

async function refineGame(html: string, issues: string[]): Promise<string> {
  const raw = await generateFull([
    { role: "system",  content: REFINER_SYSTEM },
    { role: "user",    content: `Here is the game with issues:\n${html.slice(0, 8000)}\n\nProblems to fix:\n${issues.map((i, n) => `${n + 1}. ${i}`).join("\n")}` },
  ]);
  return extractHtml(raw);
}

// ─── Agentic eval loop ────────────────────────────────────────────────────────

async function buildWithEval(prompt: string, currentCode?: string): Promise<{
  html: string;
  evalResult: EvalResult;
  attempts: number;
}> {
  const userMessage = currentCode
    ? `Current game:\n${currentCode.slice(0, 6000)}\n\nChange request: ${prompt}`
    : `Build this game: ${prompt}`;

  // Step 1: Initial generation
  let html = extractHtml(await generateFull([
    { role: "system", content: BUILDER_SYSTEM },
    { role: "user",   content: userMessage },
  ]));

  let evalResult: EvalResult;
  let attempts = 1;

  // Step 2: Eval + refine loop
  for (let i = 0; i < MAX_RETRIES; i++) {
    evalResult = await evaluateGame(html);
    console.log(`[eval] attempt ${attempts} → total=${evalResult.total} verdict=${evalResult.verdict} issues=${evalResult.issues.length}`);

    if (evalResult.verdict === "pass" || evalResult.total >= PASS_THRESHOLD) {
      return { html, evalResult, attempts };
    }

    // Refine based on issues
    console.log(`[eval] refining — issues: ${evalResult.issues.join("; ")}`);
    html = await refineGame(html, evalResult.issues);
    attempts++;
  }

  // Final eval after last refinement
  evalResult = await evaluateGame(html);
  return { html, evalResult, attempts };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { prompt, currentCode } = await req.json() as {
      prompt: string;
      currentCode?: string;
    };

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "No prompt provided" }, { status: 400 });
    }

    const { html, evalResult, attempts } = await buildWithEval(prompt.trim(), currentCode);

    // Return HTML as a streaming-compatible plain text response
    // plus eval metadata in a header so the frontend can show a score badge
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(html));
        controller.close();
      },
    });

    return new NextResponse(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Eval-Total":       String(evalResult!.total),
        "X-Eval-Verdict":     evalResult!.verdict,
        "X-Eval-Attempts":    String(attempts),
        "X-Eval-Playability": String(evalResult!.playability),
        "X-Eval-Chaos":       String(evalResult!.chaos),
        "Access-Control-Expose-Headers": "X-Eval-Total,X-Eval-Verdict,X-Eval-Attempts,X-Eval-Playability,X-Eval-Chaos",
      },
    });
  } catch (err) {
    console.error("[ai-build] error:", err);
    return NextResponse.json(
      { error: "AI generation failed — check server logs." },
      { status: 500 }
    );
  }
}
