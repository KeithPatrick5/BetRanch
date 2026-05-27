# Backend v11 Audit 02: Fixes Made During Audit

Status: Pass

Fixes made after running the tests:

1. Fixed the backend game test deposit flow.
   - The test originally treated `createDeposit()` as sync while the function was marked async.
   - The test now awaits deposit creation.

2. Simplified `createDeposit()`.
   - Removed unnecessary `async` from `createDeposit()` because the function currently only writes to the local DB transaction.
   - API routes can still safely `await` it because awaiting a non-Promise value is valid.

3. Confirmed the actual backend/game suite passes after the fix.

Remaining production caveats:

- The local JSON DB is still development storage only.
- NOWPayments needs live credential/IPN testing.
- Frontend session-game controls can be improved later so Mines/Tower/Hilo/Blackjack expose full interactive flows in the UI, not just backend routes.
