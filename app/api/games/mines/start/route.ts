import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { startMines } from "@/lib/store";
export async function POST(request: Request) { try { const user = await requireUser(); const body = await request.json(); return NextResponse.json({ session: startMines(user, Number(body.wager), Number(body.mineCount || 3)) }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Mines start failed" }, { status: 400 }); } }
