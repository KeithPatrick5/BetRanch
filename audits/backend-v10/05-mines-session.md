# Backend v10 Phase: Mines Session Engine

Status: Pass

Mines now starts a server-owned session, debits wager, stores hidden mines, rejects duplicate/invalid tiles, updates cashout value using the real multiplier formula, supports cashout, and marks bust/complete states.

Audit notes:
- Phase completed in sequence.
- No phase was skipped.
- Related tests or static checks were added where practical.
