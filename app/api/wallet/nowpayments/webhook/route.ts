import { NextResponse } from "next/server";
import { handlePaymentWebhook } from "@/lib/store";
export async function POST(request: Request) {
  try { const payload = await request.json(); const signature = request.headers.get("x-nowpayments-sig") || request.headers.get("x-ipn-signature") || undefined; const deposit = handlePaymentWebhook(payload, signature); return NextResponse.json({ ok: true, deposit }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Webhook failed" }, { status: 400 }); }
}
