# Bet Ranch Real Foundation v2 Notes

This pass turns the earlier local arcade foundation into a server-owned local casino foundation. The remaining distinction is important: this repo now has persistent local data, real sessions, server-settled bets, ledger-only money movement, interactive session APIs for Mines/Tower, admin action APIs, risk enforcement hooks, and test scaffolding. It is still not a licensed live-money casino and still needs a hosted transactional database, production auth hardening, real NOWPayments credentials, and a legal/compliance review before public money use.

## Local dev accounts

- User: `rancher@betranch.local` / `ChangeMe123!`
- Admin: `admin@betranch.local` / `ChangeMe123!`

Data is stored in `.betranch/db.json` during local development. Delete that folder to reset the local database.
