import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { blackjackAction } from "@/lib/store";
export async function POST(request: Request) {
  try { const user = await requireUser(); const body = await request.json(); return NextResponse.json({ session: blackjackAction(user, String(body.sessionId), String(body.action) as "hit" | "stand" | "double") }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Blackjack action failed" }, { status: 400 }); }
}
