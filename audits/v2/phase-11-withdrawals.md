# Phase 11: Manual withdrawal workflow

Status: **PASS**

Withdrawal requests validate amount/address, lock funds, persist queue entries, and support admin approve, reject, and sent actions. Reject unlocks funds. Sent finalizes locked funds, records TX hash, and writes audit logs.
