import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { pickTower } from "@/lib/store";
export async function POST(request: Request) { try { const user = await requireUser(); const body = await request.json(); return NextResponse.json({ session: pickTower(user, String(body.sessionId), Number(body.pick)) }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Tower pick failed" }, { status: 400 }); } }
