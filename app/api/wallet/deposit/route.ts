import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createDeposit, publicState } from "@/lib/store";
export async function POST(request: Request) {
  try { const user = await requireUser(); const body = await request.json(); const deposit = await createDeposit(user, Number(body.amount), String(body.currency || "btc")); return NextResponse.json({ deposit, state: publicState(user.id) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Deposit failed" }, { status: 400 }); }
}
