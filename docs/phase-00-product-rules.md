# Phase 0 Product Rules and Math Bible

## Product position
Bet Ranch is an originals-only crypto casino focused on fast games, clean wallet history, live activity, rewards, mobile-first play, and provably fair results.

## UI rules
- Dark compact interface.
- Pink accent system.
- No bubbly AI SaaS styling.
- No builder-facing copy in the UI.
- No sportsbook in the first launch track.
- No provider slots in the first launch track.
- Every visible word must serve a player action.

## Money rules
- Balances are derived from ledger entries.
- No direct balance mutation.
- Deposits are credited only from verified payment webhooks.
- Withdrawals start manual-only.
- Pending withdrawals lock balance until sent, failed, or rejected.
- Admin adjustments require audit log entries.

## Fairness rules
- Every bet uses server seed, client seed, nonce, and game-specific transform.
- Active server seed remains secret until rotation.
- Server seed hash is shown before bets are placed.
- User can rotate client seed.
- Past bets can be verified after seed reveal.
- Game outcome generation belongs in shared backend code.

## Initial game math targets
| Game | Initial house edge | Notes |
| --- | ---: | --- |
| Dice | 1.00% | First game, fastest fairness proof |
| Limbo | 1.00% | Second game, simple multiplier target |
| Mines | 1.00% | First interactive grid game |
| Plinko | 1.00% | Visual game, careful payout tables |
| Wheel | 1.50% | Risk presets and segment tables |
| Keno | 2.00% | Slower number-pick game |
| Hilo | 1.50% | Fair deck sequence |
| Tower | 1.50% | Vertical Mines-style ladder |
| Crash | 1.00% | Solo first, global later |
| Blackjack | Rules dependent | Requires separate rule sheet |

## Bet limits
Development defaults:
- Minimum bet: $0.01
- Maximum bet: $100.00
- Maximum payout per bet: $10,000.00

Closed beta defaults:
- Maximum deposit: $20.00 equivalent
- Maximum withdrawal: $50.00 equivalent
- Maximum bet: $1.00 equivalent
- Manual withdrawals only

## Ledger entry types
- deposit_pending
- deposit_confirmed
- deposit_failed
- bet_debit
- bet_win
- bet_loss
- bet_refund
- withdrawal_pending
- withdrawal_sent
- withdrawal_failed
- withdrawal_rejected
- bonus_credit
- rakeback_credit
- admin_adjustment

## Risk controls required before real-money launch
- Age gate
- Restricted jurisdiction rules
- Deposit limits
- Session limits
- Loss limits
- Self-exclusion
- Duplicate account detection
- Admin account freeze
- Manual withdrawal review
- Payment webhook logs
- Ledger reconciliation
