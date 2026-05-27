# V13 Phase 1: Gameplay Match Sweep

Status: Pass

Reviewed frontend gameplay against the Rainbet/Stake originals pattern: compact bet panel, visual stage, fast action, live result feedback, and clear stateful session games.

Fixes:
- Preserved last completed/busted session in the UI so session games do not visually vanish after backend refresh.
- Mines now shows revealed gems, busted mines, final layout, payout value, and has a Random tile helper.
- Tower now shows reversed climb order, picked gems, trap/bust state, and current row locking.
- Hilo now shows current card/history, higher/lower state, and cashout payout.
- Crash now shows stored crash point and auto cashout value.
- Blackjack now converts backend numeric cards into readable card labels and keeps dealer hole card hidden while active.
- Keno now highlights selected, drawn, and hit numbers.
- Plinko now reflects path/bucket results visually.
- Dice/Limbo/Wheel/RPS/War now read recent proof/session data more directly.

Audit:
- Every game still maps to the correct backend route.
- Frontend mapping check passed.
- Backend game test suite passed.
