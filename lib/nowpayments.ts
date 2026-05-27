export type NowPaymentRequest = {
  amount: number;
  payCurrency: string;
  orderId: string;
  ipnCallbackUrl: string;
};

export type NowPaymentResponse = {
  payment_id?: string | number;
  invoice_url?: string;
  payment_url?: string;
  pay_address?: string;
  pay_amount?: number;
  pay_currency?: string;
  [key: string]: unknown;
};

const apiBase = process.env.NOWPAYMENTS_API_BASE || "https://api.nowpayments.io/v1";

export function nowPaymentsConfigured() {
  return Boolean(process.env.NOWPAYMENTS_API_KEY);
}

export function getIpnCallbackUrl(requestOrigin?: string) {
  if (process.env.NOWPAYMENTS_IPN_CALLBACK_URL) return process.env.NOWPAYMENTS_IPN_CALLBACK_URL;
  if (process.env.NEXT_PUBLIC_SITE_URL) return `${process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")}/api/wallet/nowpayments/webhook`;
  if (requestOrigin) return `${requestOrigin.replace(/\/$/, "")}/api/wallet/nowpayments/webhook`;
  return "";
}

export async function createNowPayment(input: NowPaymentRequest): Promise<NowPaymentResponse> {
  if (!process.env.NOWPAYMENTS_API_KEY) throw new Error("NOWPayments API key is not configured");
  if (!input.ipnCallbackUrl) throw new Error("NOWPayments IPN callback URL is not configured");

  const response = await fetch(`${apiBase}/payment`, {
    method: "POST",
    headers: {
      "x-api-key": process.env.NOWPAYMENTS_API_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      price_amount: input.amount,
      price_currency: "usd",
      pay_currency: input.payCurrency,
      order_id: input.orderId,
      order_description: "Bet Ranch deposit",
      ipn_callback_url: input.ipnCallbackUrl,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data?.message === "string" ? data.message : `NOWPayments create payment failed (${response.status})`;
    throw new Error(message);
  }
  return data as NowPaymentResponse;
}

export function checkoutUrlFromPayment(data: NowPaymentResponse) {
  if (typeof data.invoice_url === "string") return data.invoice_url;
  if (typeof data.payment_url === "string") return data.payment_url;
  if (typeof data.pay_address === "string") return `nowpayments:${data.pay_address}`;
  return undefined;
}
