# Phase 04: Server-authoritative betting hardening

Status: **PASS**

Bet placement now requires an authenticated user, validates wager limits and risk rules, checks available unlocked balance, derives outcome server-side, writes ledger entries, stores bet records, updates rewards/rank, and records idempotency responses.
