# Phase 0 Audit

## Scope
Product rules, phase order, game math targets, ledger rules, fairness rules, payment assumptions, withdrawal assumptions, and UI direction.

## Passed
- Product direction is defined as originals-only and mobile-first.
- UI rules reject AI SaaS styling and builder-facing copy.
- Ledger is defined as the source of truth for balance.
- Real deposits are restricted to verified payment webhooks.
- Withdrawals are manual-only in the first real-money track.
- Provably fair model is defined as shared infrastructure.
- Initial game list and house edge targets are documented.
- Bet limits and closed-beta limits are documented.
- Phase order keeps money/risk infrastructure separate from game UI.

## Needs future implementation
- Actual fairness hashing library.
- Database schema.
- Deposit webhook signature verification.
- Withdrawal approval workflow.
- Game-specific payout tables.
- Admin audit log enforcement.
- Jurisdiction and compliance settings.

## Decision
Phase 0 is complete enough to start Phase 1. Do not build real-money deposits until ledger, fairness, and admin controls are implemented and audited.
