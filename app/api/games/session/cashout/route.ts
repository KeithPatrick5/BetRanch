import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { cashoutSession } from "@/lib/store";
export async function POST(request: Request) { try { const user = await requireUser(); const body = await request.json(); return NextResponse.json({ session: cashoutSession(user, String(body.sessionId)) }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Cashout failed" }, { status: 400 }); } }
