# Phase 01: Database replacement

Status: **PASS**

Replaced globalThis-only store with a file-backed local database adapter at lib/db.ts. Users, sessions, wallets, ledger, bets, game sessions, seeds, deposits, withdrawals, rewards, risks, creator codes, audit logs, and idempotency are persisted to .betranch/db.json. This passes the local persistence requirement. For hosted real-money use, swap this adapter to Postgres/Prisma or another transactional database.
