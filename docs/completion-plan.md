# Bet Ranch Completion Plan

This package repairs the previous full-phases build by moving the important casino paths toward server-authoritative behavior. The current implementation is still a local/in-memory foundation, but the user-facing app no longer settles bets or mutates balances purely in React state.

## Completed repair scope

- Repo cleanup and public-copy cleanup
- Server-side store for users, wallets, ledger, bets, seeds, deposits, withdrawals, rewards, risk, creator codes, and audit logs
- API routes for account state, bets, seed rotation, bet verification, deposits, NOWPayments webhook handling, withdrawals, rewards, live feed, and admin summary
- Server-authoritative bet settlement for all listed originals
- HMAC-SHA256 fairness engine for server results
- Ledger-only balance mutation helpers
- Idempotency keys for bet requests
- Daily claim cooldown and rakeback ledger crediting
- Deposit invoice route with real NOWPayments hook gated behind environment flags
- Manual withdrawal queue with balance lock and admin decision helper
- PWA manifest and icon
- Admin control room backed by store data

## Remaining production gap

The current package uses an in-memory server store so it can run locally without secrets. Before real money, replace the in-memory store with a real database transaction layer, add real auth, add production rate limiting, and run a third-party security review.
