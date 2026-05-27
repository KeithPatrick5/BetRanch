# Blackjack Frontend QA

Status: Pass after fix

Problem found:
- Frontend was calling generic `/api/bet` with `action: stand`, which skipped the new session engine.

Fix:
- Deal button now calls `/api/games/blackjack/start`.
- Hit, Stand, and Double buttons call `/api/games/blackjack/action`.
- Visual stage reads active Blackjack session cards.

Backend match:
- Blackjack backend supports deal, hit, stand, double, dealer draw, bust, push, and payout.
- Backend tests passed.
