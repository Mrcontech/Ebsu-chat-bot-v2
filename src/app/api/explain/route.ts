import { NextResponse } from "next/server";
import { MAX_MESSAGE_LENGTH } from "@/lib/chat";
import { isConnectionError } from "@/lib/db";
import { getThresholds, loadIndex } from "@/lib/kb";
import { match } from "@/lib/nlp/matcher";

export const dynamic = "force-dynamic";

/**
 * POST /api/explain { message }
 * Runs the matcher and returns every step, without logging anything.
 * Used by the "Try the matcher" box on the How it works page.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { message?: unknown };
    const message = typeof body.message === "string" ? body.message.trim().slice(0, MAX_MESSAGE_LENGTH) : "";
    if (!message) return NextResponse.json({ error: "Type a question first." }, { status: 400 });
    const [{ index }, thresholds] = await Promise.all([loadIndex(), getThresholds()]);
    const r = match(index, message, thresholds, 5);
    return NextResponse.json({
      cleaned: r.analysis.cleaned,
      corrections: r.analysis.corrections,
      rulesApplied: r.analysis.rulesApplied,
      tokens: r.analysis.tokens,
      stems: r.analysis.stems,
      candidates: r.candidates.map(({ question, phrasing, cosine, trigram, score }) => ({ question, phrasing, cosine, trigram, score })),
      thresholds: r.thresholds,
      decision: r.decision,
    });
  } catch (error) {
    console.error("[explain]", error);
    return NextResponse.json(
      { error: isConnectionError(error) ? "Start MySQL in XAMPP, then try again." : "Could not run the matcher." },
      { status: isConnectionError(error) ? 503 : 500 },
    );
  }
}
