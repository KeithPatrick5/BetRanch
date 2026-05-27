import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { startCrash } from "@/lib/store";
export async function POST(request: Request) {
  try { const user = await requireUser(); const body = await request.json(); return NextResponse.json({ session: startCrash(user, Number(body.wager), Number(body.autoCashout || 2)) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Crash start failed" }, { status: 400 }); }
}
