import { NextResponse } from "next/server";
import { recordFeedback } from "@/lib/chat";

export const dynamic = "force-dynamic";

/** POST /api/feedback  { logId, value: 1 | -1, sessionId } */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { logId?: unknown; value?: unknown; sessionId?: unknown };
    const logId = Number(body.logId);
    const value = body.value === 1 || body.value === -1 ? body.value : null;
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : null;
    if (!Number.isInteger(logId) || logId <= 0 || value === null) {
      return NextResponse.json({ error: "Invalid feedback." }, { status: 400 });
    }
    const saved = await recordFeedback(logId, value, sessionId);
    return NextResponse.json({ saved });
  } catch (error) {
    console.error("[feedback]", error);
    return NextResponse.json({ error: "Could not save feedback." }, { status: 500 });
  }
}
