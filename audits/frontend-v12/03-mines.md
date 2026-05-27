# Mines Frontend QA

Status: Pass after fix

Problem found:
- Frontend was showing `Start Game`, but clicking it still called generic `/api/bet` with instant Mines params.

Fix:
- Start button now calls `/api/games/mines/start`.
- Frontend reads active Mines session from `/api/me`.
- Tile clicks call `/api/games/mines/reveal`.
- Cashout calls `/api/games/session/cashout`.
- Mine count controls disable while a session is active.

Backend match:
- Mines backend supports start, reveal, duplicate tile rejection, bust, payout, and cashout.
- Backend tests passed.
