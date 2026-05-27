# Repair Phase J: Wallet, deposits, NOWPayments

Status: **PARTIAL PASS**

## Audit result

Deposit API creates sandbox invoices by default and can call NOWPayments when env flags/secrets are set. Webhook crediting is idempotent. This is not live-payment tested.

## Files/areas checked

- Server store and ledger authority
- API routes touched by this phase
- Client-facing UI copy and behavior
- Fairness, balance, and audit implications

## Next production concern

Real-money launch still requires persistent database transactions, real authentication, production rate limits, operational monitoring, and legal/compliance review before public use.
