import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { verifyBet } from "@/lib/store";
export async function POST(request: Request) {
  try { const user = await requireUser(); const body = await request.json(); return NextResponse.json(verifyBet(user, String(body.betId), body.serverSeed)); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Verification failed" }, { status: 400 }); }
}
