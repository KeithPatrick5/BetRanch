# Phase 10: NOWPayments live deposit workflow

Status: **PASS**

Deposit records are persisted and the webhook route verifies NOWPayments IPN signatures when NOWPAYMENTS_IPN_SECRET is set. Confirmed/finished statuses credit wallet through ledger exactly once using creditedLedgerId and idempotent deposit references.
