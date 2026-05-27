# Keno Frontend QA

Status: Pass

Frontend mapping:
- Uses `/api/bet`.
- Sends `picks: selectedKeno`.
- UI lets user select up to 10 numbers from the 40-number board.

Backend match:
- Keno engine normalizes picks, draws numbers, counts hits, and applies payout table.
- Backend tests passed.
