import { aiErrorResponse } from "@/lib/ai-errors";
import { aiChat } from "@/lib/ai/chat";
import { NextRequest, NextResponse } from "next/server";

const MODEL = "deepseek.v3.1";

const SPRITE_SYSTEM = `You generate tiny game sprite assets as inline SVG.

Given a description, respond ONLY with valid JSON — no markdown:
{
  "svg": "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>...</svg>",
  "dataUrl": "data:image/svg+xml;base64,..."
}

Rules:
- SVG must be 64x64 viewBox, colorful, game-ready
- Use simple shapes — no external references
- dataUrl is base64-encoded SVG for use in <img src>`;

export async function POST(req: NextRequest) {
  try {
    const { description } = (await req.json()) as { description?: string };
    if (!description?.trim()) {
      return NextResponse.json({ error: "No description" }, { status: 400 });
    }

    const result = await aiChat({
      model: MODEL,
      messages: [
        { role: "system", content: SPRITE_SYSTEM },
        { role: "user", content: `Generate a game sprite: ${description.trim()}` },
      ],
      stream: false,
    });

    const raw = (result as { choices: { message: { content: string } }[] }).choices?.[0]?.message?.content ?? "";
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    try {
      const parsed = JSON.parse(cleaned) as { svg?: string; dataUrl?: string };
      if (!parsed.dataUrl && parsed.svg) {
        parsed.dataUrl = `data:image/svg+xml;base64,${Buffer.from(parsed.svg).toString("base64")}`;
      }
      return NextResponse.json(parsed);
    } catch {
      const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" fill="#f97316"/><text x="32" y="38" text-anchor="middle" font-size="24">?</text></svg>`;
      return NextResponse.json({
        svg: fallbackSvg,
        dataUrl: `data:image/svg+xml;base64,${Buffer.from(fallbackSvg).toString("base64")}`,
      });
    }
  } catch (err) {
    return aiErrorResponse(err, "ai-sprite");
  }
}
