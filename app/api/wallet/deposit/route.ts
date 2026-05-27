import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { attachDepositProvider, createDeposit, publicState } from "@/lib/store";
import { checkoutUrlFromPayment, createNowPayment, getIpnCallbackUrl, nowPaymentsConfigured } from "@/lib/nowpayments";
import { rateLimit, requestIp } from "@/lib/rateLimit";

export async function POST(request: Request) {
  try {
    rateLimit(`deposit:${requestIp(request)}`, 15, 60_000);
    const user = await requireUser();
    const body = await request.json();
    let deposit = createDeposit(user, Number(body.amount), String(body.currency || "btc"));

    if (nowPaymentsConfigured()) {
      const origin = request.headers.get("origin") || undefined;
      const payment = await createNowPayment({
        amount: deposit.amount,
        payCurrency: deposit.currency,
        orderId: deposit.id,
        ipnCallbackUrl: getIpnCallbackUrl(origin),
      });
      deposit = attachDepositProvider(deposit.id, {
        providerPaymentId: payment.payment_id ? String(payment.payment_id) : undefined,
        checkoutUrl: checkoutUrlFromPayment(payment),
        raw: payment,
      });
    }

    return NextResponse.json({ deposit, state: publicState(user.id) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Deposit failed" }, { status: 400 });
  }
}
