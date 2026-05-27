# Hilo Frontend QA

Status: Pass after fix

Problem found:
- Frontend was still treating Hilo as a one-shot `/api/bet` game.

Fix:
- Start button now calls `/api/games/hilo/start`.
- Higher/Lower buttons call `/api/games/hilo/pick` when a session is active.
- Cashout calls `/api/games/session/cashout`.
- Visual stage reads active session card history.

Backend match:
- Hilo backend supports deterministic deck, higher/lower decisions, push/win/bust, and cashout.
- Backend tests passed.
