import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { setRisk } from "@/lib/store";
export async function POST(request: Request) { try { const admin = await requireAdmin(); const body = await request.json(); return NextResponse.json(setRisk(admin, String(body.userId), body.patch || {})); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Risk update failed" }, { status: 400 }); } }
