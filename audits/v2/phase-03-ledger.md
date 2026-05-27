# Phase 03: Transactional wallet and ledger engine

Status: **PASS**

Added ledger-only money helpers in lib/money.ts for debit/credit, locked funds, withdrawal locks, unlocks, and finalization. Wallet invariant checks prevent negative balance and locked funds greater than balance. Money movements now produce ledger entries.
