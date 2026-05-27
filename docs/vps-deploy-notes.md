# Bet Ranch VPS Notes

This build is intended for a single VPS process first.

Recommended environment:

```bash
NODE_ENV=production
BET_RANCH_DATA_DIR=/var/lib/betranch
BET_RANCH_ALLOW_DEMO_FALLBACK=false
NEXT_PUBLIC_SITE_URL=https://your-domain.example
NOWPAYMENTS_API_KEY=...
NOWPAYMENTS_IPN_SECRET=...
NOWPAYMENTS_IPN_CALLBACK_URL=https://your-domain.example/api/wallet/nowpayments/webhook
```

Notes:
- The file database now supports a simple lock for a single VPS process.
- For serious real-money volume, move the wallet/ledger/session tables to Postgres.
- Do not run multiple app instances pointing at the same JSON file unless you replace the persistence layer.
- Keep `/var/lib/betranch` backed up.
