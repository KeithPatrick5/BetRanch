import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { publicState, requestWithdrawal } from "@/lib/store";
import { rateLimit, requestIp } from "@/lib/rateLimit";
export async function POST(request: Request) {
  try { rateLimit(`withdraw:${requestIp(request)}`, 15, 60_000);
    const user = await requireUser(); const body = await request.json(); const withdrawal = requestWithdrawal(user, Number(body.amount), String(body.currency || "btc"), String(body.address || "")); return NextResponse.json({ withdrawal, state: publicState(user.id) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Withdrawal failed" }, { status: 400 }); }
}
