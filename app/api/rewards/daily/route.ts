import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { claimDaily, publicState } from "@/lib/store";
export async function POST() { try { const user = await requireUser(); const ledger = claimDaily(user); return NextResponse.json({ ledger, state: publicState(user.id) }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Daily claim failed" }, { status: 400 }); } }
