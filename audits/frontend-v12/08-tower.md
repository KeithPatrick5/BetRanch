# Tower Frontend QA

Status: Pass after fix

Problem found:
- Frontend was showing `Start Game`, but clicking it still called generic `/api/bet` with instant Tower params.

Fix:
- Start button now calls `/api/games/tower/start`.
- Tower grid row picks call `/api/games/tower/pick`.
- Cashout calls `/api/games/session/cashout`.
- Row count controls disable while a session is active.

Backend match:
- Tower backend supports start, row-by-row picks, invalid pick rejection, bust, payout, and cashout.
- Backend tests passed.
