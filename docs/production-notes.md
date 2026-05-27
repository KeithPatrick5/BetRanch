# Production Notes

## Required environment variables

- `NOWPAYMENTS_API_KEY`
- `NOWPAYMENTS_IPN_SECRET`
- `DATABASE_URL`
- `SESSION_SECRET`
- `ADMIN_EMAILS`

## Hard production rules

1. Never credit deposits from a success page.
2. Credit deposits only from a verified provider webhook.
3. Never directly mutate balances outside the ledger.
4. Every bet must be idempotent.
5. Every withdrawal starts as manual review.
6. Every admin action must write an audit log.
7. Every real-money launch must use restricted-jurisdiction checks.
8. Do not claim a license unless one exists.
9. Do not enable automatic withdrawals until the ledger and risk engine survive closed beta.
10. Keep provider game assets, logos, and brand language out of the product.
