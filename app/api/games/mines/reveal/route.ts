import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { revealMinesTile } from "@/lib/store";
export async function POST(request: Request) { try { const user = await requireUser(); const body = await request.json(); return NextResponse.json({ session: revealMinesTile(user, String(body.sessionId), Number(body.tile)) }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Mines reveal failed" }, { status: 400 }); } }
