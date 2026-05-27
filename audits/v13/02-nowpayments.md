# V13 Phase 2: NOWPayments Routing Audit

Status: Partial pass, API-ready

Fixes:
- Added `lib/nowpayments.ts` with NOWPayments `/v1/payment` create-payment integration.
- Deposit API now creates local deposit record first, then creates NOWPayments payment when `NOWPAYMENTS_API_KEY` is configured.
- Sends `price_amount`, `price_currency`, `pay_currency`, `order_id`, `order_description`, and `ipn_callback_url`.
- Added callback URL resolution through `NOWPAYMENTS_IPN_CALLBACK_URL`, `NEXT_PUBLIC_SITE_URL`, or request origin.
- Added provider payment id / checkout URL attach step.
- Webhook already checks IPN signature when `NOWPAYMENTS_IPN_SECRET` is configured.
- Webhook duplicate, underpaid, and overpaid handling remains in place.

Audit:
- Payment/security static check passed.
- Real live provider test is still required with actual NOWPayments API key + IPN secret + public callback URL.
