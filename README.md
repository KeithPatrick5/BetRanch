# Bet Ranch

Compact crypto-originals casino foundation with server-settled games, provably fair results, wallet ledger, rewards, manual withdrawals, admin controls, and a dark pink ranch theme.

## Run locally

```bash
npm install --package-lock=false
npm run dev
```

Then open the local Next.js URL.

## Dev accounts

```text
User:  rancher@betranch.local / ChangeMe123!
Admin: admin@betranch.local   / ChangeMe123!
```

## Local data

Local data is stored in:

```text
.betranch/db.json
```

Delete `.betranch/` to reset the local database.

## Scripts

```bash
npm run dev
npm run build
npm run typecheck
npm test
```

## Notes

This is a real server-owned local foundation, not a client-only arcade. It still needs a hosted transactional database, production auth/session hardening, real NOWPayments testing, legal/compliance review, and expanded tests before any live-money launch.
