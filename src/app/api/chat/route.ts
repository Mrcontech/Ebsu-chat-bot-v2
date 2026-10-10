import { NextResponse } from "next/server";
import { handleMessage, MAX_MESSAGE_LENGTH } from "@/lib/chat";
import { isConnectionError } from "@/lib/db";

export const dynamic = "force-dynamic";

/** POST /api/chat  { message, sessionId } -> the bot's reply */
export async function POST(request: Request) {
  let body: { message?: unknown; sessionId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send JSON with a message field." }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : null;
  if (!message) return NextResponse.json({ error: "Type a question first." }, { status: 400 });
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: `Questions can be up to ${MAX_MESSAGE_LENGTH} characters.` }, { status: 400 });
  }

  try {
    return NextResponse.json(await handleMessage(message, sessionId));
  } catch (error) {
    console.error("[chat]", error);
    const offline = isConnectionError(error);
    return NextResponse.json(
      {
        error: offline
          ? "The knowledge base is not reachable. Start MySQL in the XAMPP Control Panel, then try again."
          : "Something went wrong while answering. Please try again.",
      },
      { status: offline ? 503 : 500 },
    );
  }
}
