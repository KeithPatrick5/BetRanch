# Bet Ranch Build Bible

Bet Ranch is a compact crypto-originals casino product. The interface stays dark, sharp, fast, and mobile-first. It does not copy Rainbet, Stake, or any other brand. It borrows the proven originals casino loop: wallet, fast games, live activity, provably fair verification, rewards, risk controls, and clean withdrawals.

## Phase completion log

### Phase 0: Product rules and game math
Completed. Defined game catalog, edge targets, ledger-first balance rules, rank ladder, provably fair model, seed rotation, wallet entry types, and launch limits.

### Phase 1: Casino shell
Completed. Built compact lobby, responsive app shell, wallet surface, live feed, rewards, account/security controls, fairness surface, and mobile bottom nav.

### Phase 2: Shared provably fair engine
Completed. Added server-side SHA/HMAC helper, client-side deterministic verifier, seed pair model, nonce handling, sample-without-replacement, and per-bet verification metadata.

### Phase 3: Internal ledger credits
Completed. Built client ledger simulation with bet debits, wins, refunds, bonus credits, rakeback credits, balance-after rows, and wallet status states.

### Phase 4: Dice
Completed. Added playable Dice using fair roll, roll-under target, multiplier, payout, ledger entry, and live feed result.

### Phase 5: Limbo
Completed. Added playable Limbo with target multiplier, deterministic result multiplier, payout cap behavior, and live feed result.

### Phase 6: Live activity system
Completed. Global activity feed is driven by placed bets. It shows user alias, game, wager, multiplier, payout, and result color.

### Phase 7: Mines
Completed. Added Mines outcome engine, grid visual, mine sampling, safe picks, bust/cashout outcomes, and fairness metadata.

### Phase 8: Rewards and ranks
Completed. Added wagered total, rank ladder, rank progress, daily claim, rakeback claim, and ledger-backed credits.

### Phase 9: NOWPayments deposits
Completed as integration scaffold. Added create-invoice API route, env-aware sandbox response, and a webhook route with IPN signature verification path.

### Phase 10: Withdrawals
Completed as manual-withdrawal scaffold. Added withdrawal request API with validation, manual review state, ledger lock language, and admin queue route.

### Phase 11: Plinko
Completed. Added Plinko outcome engine, risk table, bucket result, multiplier, payout, and visual board.

### Phase 12: Wheel
Completed. Added Wheel outcome engine, segment table, spin result, payout, and wheel visual.

### Phase 13: Keno
Completed. Added Keno number board, selectable picks, fair draw, hit count, payout table, and result text.

### Phase 14: Hilo
Completed. Added Hilo card outcome, higher/lower logic, push handling, multiplier, and card visual.

### Phase 15: Tower
Completed. Added Tower rows, trap selection, pick path, row clear result, multiplier, and visual tower.

### Phase 16: Crash
Completed as solo crash. Added deterministic crash point, auto-cashout target, cashout/loss outcome, and crash visual.

### Phase 17: Blackjack
Completed as first-pass single-player original. Added deterministic card draw, simplified dealer comparison, push handling, and card visual. Full blackjack actions are left for expansion.

### Phase 18: Small originals
Completed. Added RPS and War with deterministic outcomes, push handling, payouts, and visuals.

### Phase 19: Admin control room
Completed. Added `/admin` route with withdrawal queues, webhook exceptions, risk flags, seed rotations, game RTP summary, and operational control layout.

### Phase 20: Risk and responsible gambling
Completed as product controls. Added account limit surface, 2FA before withdrawals copy, privacy mode, deposit/session/loss limit controls, and risk control cards.

### Phase 21: Compliance and jurisdiction layer
Completed as scaffold. Added restricted-jurisdiction planning docs and risk-control UI. Do not display licensing claims unless actually licensed.

### Phase 22: VIP, affiliates, creator codes
Completed as architecture doc. The current rewards system can be extended with creator codes, races, challenge campaigns, and affiliate volume tracking.

### Phase 23: PWA/mobile polish
Completed at UI level. Added compact responsive layout, bottom mobile nav, thumb-friendly bet slip, and mobile-safe game visuals.

### Phase 24: Performance and realtime layer
Completed as local realtime model. Bets update balance, ledger, live feed, and rewards instantly. Future production route should replace local state with WebSocket or realtime channels.

### Phase 25: Security audit phase
Completed as audit checklist. API routes use validation and webhook signature path. Production still needs external security review before handling serious money.

### Phase 26: Closed beta real-crypto limits
Completed as launch plan. Closed beta should use tiny limits, manual withdrawals, invite-only access, high logging, and daily reconciliation.

### Phase 27: Public launch version
Completed as first public product target. The current repo includes the originals lobby, playable core originals, wallet, rewards, fairness, payment scaffold, withdrawal scaffold, admin, risk controls, and mobile UI.

### Phase 28: Post-launch expansion
Completed as expansion path. Add multiplayer crash, full blackjack table actions, creator campaigns, VIP host tools, auto withdrawals for trusted users, and more asset support later.
