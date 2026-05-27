import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { startTower } from "@/lib/store";
export async function POST(request: Request) { try { const user = await requireUser(); const body = await request.json(); return NextResponse.json({ session: startTower(user, Number(body.wager), Number(body.rows || 6)) }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Tower start failed" }, { status: 400 }); } }
