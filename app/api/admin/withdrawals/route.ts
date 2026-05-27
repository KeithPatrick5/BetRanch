import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { decideWithdrawal } from "@/lib/store";
export async function POST(request: Request) { try { const admin = await requireAdmin(); const body = await request.json(); const decision = String(body.decision) as "approved" | "rejected" | "sent"; const withdrawal = decideWithdrawal(admin, String(body.withdrawalId), decision, body.reason, body.txHash); return NextResponse.json({ withdrawal }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Withdrawal decision failed" }, { status: 400 }); } }
