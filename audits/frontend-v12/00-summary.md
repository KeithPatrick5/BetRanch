# Frontend v12 Game QA Summary

Status: Pass, with live-browser caveat

This pass checked whether the frontend controls, buttons, visual stages, and API calls match the backend game engines. I found and fixed a real mismatch: the UI still treated Mines, Tower, Hilo, Crash, and Blackjack like generic `/api/bet` one-shot games even though the backend now has real session APIs for several of them.

Fixes made:
- Added `activeSessions` support to frontend state.
- Added frontend calls to Mines, Tower, Hilo, Crash, and Blackjack session APIs.
- Added tile/cell/card action buttons for session games.
- Kept Dice, Limbo, Plinko, Wheel, Keno, RPS, and War mapped to `/api/bet` one-shot settlement.
- Added `tests/frontend-game-map.mjs` to assert frontend-to-backend mapping.
- Updated `npm test` to run static checks, frontend mapping checks, and backend game tests.

Caveat:
- This was a frontend-code and API-mapping audit plus backend engine test run. A full Playwright click-through browser test still requires local dependency install and browser runtime.
