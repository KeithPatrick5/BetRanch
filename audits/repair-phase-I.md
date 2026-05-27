# Repair Phase I: Blackjack rebuild

Status: **PARTIAL PASS**

## Audit result

Blackjack now has dealer draw rules, hit/stand/double handling, blackjack payout, bust/push/win logic, and proof cards. Split, insurance, surrender, and full multi-action session UX are not included.

## Files/areas checked

- Server store and ledger authority
- API routes touched by this phase
- Client-facing UI copy and behavior
- Fairness, balance, and audit implications

## Next production concern

Real-money launch still requires persistent database transactions, real authentication, production rate limits, operational monitoring, and legal/compliance review before public use.
