# V14 Phase 2: VPS Persistence Hardening

Status: Pass for single VPS process

Changes:
- Added `BET_RANCH_DATA_DIR` and `BET_RANCH_DB_FILE` support.
- Added simple file lock around `transact()` and `resetLocalDb()`.
- Added VPS deployment notes.

Audit:
- This is safer for one VPS process than the prior plain JSON write path.
- Still not a replacement for Postgres if the app grows or runs multiple processes.
