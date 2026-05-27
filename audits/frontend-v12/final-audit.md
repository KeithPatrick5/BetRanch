# Frontend v12 Final Audit

Status: Pass for frontend-to-backend game mapping

Tests run:
- `node tests/static-check.mjs`
- `node tests/frontend-game-map.mjs`
- `NODE_PATH=$(npm root -g) TS_NODE_COMPILER_OPTIONS='{"module":"CommonJS","moduleResolution":"node","noEmit":false}' node -r ts-node/register/transpile-only tests/backend-game-tests.mjs`

Results:
- Static checks passed.
- Frontend mapping checks passed.
- Backend/game tests passed.

Main fixes:
- Session games now use session APIs from the frontend.
- Simple one-shot games remain on `/api/bet`.
- Frontend reads active sessions and changes controls/buttons accordingly.
- Mines, Tower, Hilo, and Blackjack now have UI actions that match their backend session engines.

Remaining next-level QA:
- Run Playwright browser click tests after local dependency install.
- Verify mobile touch behavior for Mines/Tower tile clicking in a real browser.
- Verify live browser visuals after repeated session state changes.
