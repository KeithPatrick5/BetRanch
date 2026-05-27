# Crash Frontend QA

Status: Pass after fix

Problem found:
- Frontend was calling generic `/api/bet` instead of using the new solo Crash route.

Fix:
- Start button now calls `/api/games/crash/start`.
- Auto cashout input feeds `autoCashout` to the backend.
- Result message displays session status and profit.

Backend match:
- Crash backend stores crash point and deterministic result.
- Backend tests passed.
