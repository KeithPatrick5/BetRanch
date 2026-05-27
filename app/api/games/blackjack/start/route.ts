import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { startBlackjack } from "@/lib/store";
export async function POST(request: Request) {
  try { const user = await requireUser(); const body = await request.json(); return NextResponse.json({ session: startBlackjack(user, Number(body.wager)) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Blackjack start failed" }, { status: 400 }); }
}
