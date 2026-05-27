# Backend v11 Audit 01: Full Game Test Run

Status: Pass

Ran the backend/game test suite against every original game:

- Dice
- Limbo
- Mines
- Plinko
- Wheel
- Keno
- Hilo
- Tower
- Crash
- Blackjack
- RPS
- War

Result:

```text
All backend/game tests passed.
```

What was verified:

- Engine imports
- Every game returns a valid result
- Payout/profit reconciliation
- Shared server settlement
- Idempotent bet behavior
- Provably fair recomputation after seed rotation
- Mines session start, reveal, duplicate-tile rejection, and cashout
- Tower session start, pick validation, and cashout
- Hilo session start, higher/lower choice, and cashout/bust state
- Crash deterministic server result
- Blackjack deal and stand resolution
- Ledger reconciliation
- Deposit duplicate webhook protection
- Withdrawal lock/reject unlock flow
- Admin risk limit update and enforcement
- Password hash verification
