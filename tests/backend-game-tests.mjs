import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const dbDir = path.join(process.cwd(), ".betranch");
if (fs.existsSync(dbDir)) fs.rmSync(dbDir, { recursive: true, force: true });

const game = require("../lib/gameEngine.ts");
const store = require("../lib/store.ts");
const dbmod = require("../lib/db.ts");

function user(email = "rancher@betranch.local") {
  const db = dbmod.readDb();
  const found = db.users.find((u) => u.email === email);
  assert.ok(found, `missing user ${email}`);
  return found;
}

function admin() {
  return user("admin@betranch.local");
}

function fair(nonce = 0) {
  return { serverSeed: "server-seed-for-tests", clientSeed: "client-seed-for-tests", nonce };
}

function assertMoney(outcome, wager) {
  assert.ok(Number.isFinite(outcome.multiplier), "multiplier finite");
  assert.ok(Number.isFinite(outcome.payout), "payout finite");
  assert.ok(Number.isFinite(outcome.profit), "profit finite");
  assert.ok(outcome.payout >= 0, "payout non-negative");
  assert.equal(outcome.profit, game.roundMoney(outcome.payout - wager), "profit reconciles");
  assert.ok(["win", "loss", "push", "cashout"].includes(outcome.result), "valid result");
}

console.log("Phase 1: route/engine import audit");
assert.ok(game.GAME_KEYS.length === 12, "all game keys exported");
assert.ok(typeof store.placeBet === "function", "placeBet exists");
assert.ok(typeof store.startMines === "function", "startMines exists");
assert.ok(typeof store.startTower === "function", "startTower exists");
assert.ok(typeof store.startHilo === "function", "startHilo exists");
assert.ok(typeof store.startCrash === "function", "startCrash exists");
assert.ok(typeof store.startBlackjack === "function", "startBlackjack exists");

console.log("Phase 2: game-by-game one-shot engine tests");
for (const key of game.GAME_KEYS) {
  const params = {
    dice: { target: 50.5, direction: "under" },
    limbo: { target: 2 },
    mines: { mineCount: 3, picks: 3 },
    plinko: { risk: "medium" },
    wheel: {},
    keno: { picks: [1, 7, 13, 21, 33] },
    hilo: { choice: "higher" },
    tower: { rows: 4 },
    crash: { autoCashout: 2 },
    blackjack: { action: "stand" },
    rps: { pick: "rock" },
    war: {},
  }[key];
  const out = game.runGame(key, 10, fair(game.GAME_KEYS.indexOf(key)), params);
  assertMoney(out, 10);
  assert.ok(out.proof?.game === key, `proof includes game ${key}`);
}

console.log("Phase 3: settlement/idempotency tests");
const u = user();
const before = store.publicState(u.id).wallet.balance;
const bet = store.placeBet(u, { game: "dice", wager: 10, params: { target: 50.5, direction: "under" }, idempotencyKey: "idem-dice-1" });
const again = store.placeBet(u, { game: "dice", wager: 10, params: { target: 50.5, direction: "under" }, idempotencyKey: "idem-dice-1" });
assert.equal(bet.id, again.id, "idempotency returns same bet");
const afterIdem = store.publicState(u.id);
assert.equal(afterIdem.bets.filter((b) => b.id === bet.id).length, 1, "single bet stored for idempotent request");
assert.ok(afterIdem.wallet.balance <= before + 100, "wallet remains sane");

console.log("Phase 4: provably fair verifier tests");
const rotation = store.rotateSeed(u, "post-rotate-client");
const verified = store.verifyBet(u, bet.id, rotation.previous.serverSeed);
assert.equal(verified.verified, true, "rotated seed verifies previous bet");

console.log("Phase 5: Mines session tests");
const m = store.startMines(u, 5, 3);
assert.equal(m.status, "active");
const mines = m.state.mines;
let safeTile = Array.from({ length: 25 }, (_, i) => i).find((i) => !mines.includes(i));
assert.ok(Number.isInteger(safeTile));
const m2 = store.revealMinesTile(u, m.id, safeTile);
assert.ok(["active", "complete"].includes(m2.status), "safe reveal stays alive/complete");
assert.ok(m2.payout > 0, "safe reveal has cashout value");
assert.throws(() => store.revealMinesTile(u, m.id, safeTile), /Invalid tile/, "duplicate tile rejected");
const m3 = store.cashoutSession(u, m.id);
assert.equal(m3.status, "cashed_out");
assert.throws(() => store.cashoutSession(u, m.id), /Active session not found/, "double cashout rejected");

console.log("Phase 6: Tower session tests");
const t = store.startTower(u, 5, 4);
assert.equal(t.status, "active");
const traps = t.state.traps;
const goodPick = [0,1,2].find((n) => n !== traps[0]);
const t2 = store.pickTower(u, t.id, goodPick);
assert.ok(["active", "complete"].includes(t2.status));
assert.ok(t2.payout > 0, "tower safe pick has cashout value");
assert.throws(() => store.pickTower(u, t.id, 9), /Invalid tower pick/, "invalid tower pick rejected");
if (t2.status === "active") {
  const t3 = store.cashoutSession(u, t.id);
  assert.equal(t3.status, "cashed_out");
}

console.log("Phase 7: Hilo session tests");
const h = store.startHilo(u, 5);
assert.equal(h.status, "active");
const h2 = store.pickHilo(u, h.id, "higher");
assert.ok(["active", "busted"].includes(h2.status), "hilo pick changes state");
if (h2.status === "active") {
  assert.ok(h2.payout >= h.wager, "hilo active payout is cashout-capable");
  const h3 = store.cashoutSession(u, h.id);
  assert.equal(h3.status, "cashed_out");
}

console.log("Phase 8: Crash session tests");
const c = store.startCrash(u, 5, 2);
assert.ok(["cashed_out", "busted"].includes(c.status), "crash ends deterministically");
assert.ok(Number.isFinite(c.state.crashAt), "crash point stored");

console.log("Phase 9: Blackjack session tests");
const bj = store.startBlackjack(u, 5);
assert.ok(["active", "complete"].includes(bj.status), "blackjack deal valid");
if (bj.status === "active") {
  const bj2 = store.blackjackAction(u, bj.id, "stand");
  assert.equal(bj2.status, "complete", "stand completes hand");
  assert.ok(["dealer_win", "dealer_bust", "player_win", "push"].includes(bj2.state.result), "result stored");
}

console.log("Phase 10: payout math/RTP sanity");
for (const key of game.GAME_KEYS) {
  for (let i = 0; i < 20; i++) {
    const out = game.runGame(key, 1, fair(i + 500), {
      target: 2,
      direction: "under",
      mineCount: 3,
      picks: 2,
      risk: "medium",
      rows: 4,
      autoCashout: 2,
      choice: "higher",
      action: "stand",
      pick: "rock",
      picks: [1,2,3,4,5],
    });
    assert.ok(out.payout <= game.BET_LIMITS.maxPayout, `${key} capped`);
    assertMoney(out, 1);
  }
}

console.log("Phase 11: wallet/ledger reconciliation");
const state = store.publicState(u.id);
const ledgerSum = state.ledger.reduce((sum, entry) => game.roundMoney(sum + entry.amount), 0);
assert.equal(game.roundMoney(state.wallet.balance), game.roundMoney(ledgerSum), "wallet balance equals user ledger sum");
assert.ok(state.wallet.balance >= state.wallet.locked, "locked funds not above balance");

console.log("Phase 12: deposit/withdrawal workflow");
const dep = store.createDeposit(u, 25, "btc");
const beforeDeposit = store.publicState(u.id).wallet.balance;
const credited = store.handlePaymentWebhook({ depositId: dep.id, payment_status: "confirmed", actually_paid: 25, price_amount: 25 });
assert.equal(credited.status, "confirmed", "deposit confirmed");
const dup = store.handlePaymentWebhook({ depositId: dep.id, payment_status: "confirmed", actually_paid: 25, price_amount: 25 });
assert.equal(dup.creditedLedgerId, credited.creditedLedgerId, "duplicate webhook does not credit again");
assert.equal(store.publicState(u.id).wallet.balance, game.roundMoney(beforeDeposit + 25), "deposit credited once");
const wd = store.requestWithdrawal(u, 10, "btc", "bc1qmanualreviewaddress000000000000000");
assert.equal(wd.status, "pending");
const locked = store.publicState(u.id).wallet.locked;
assert.ok(locked >= 10, "withdrawal locked funds");
const rejected = store.decideWithdrawal(admin(), wd.id, "rejected", "test reject");
assert.equal(rejected.status, "rejected");
assert.ok(store.publicState(u.id).wallet.locked < locked, "rejection unlocks funds");

console.log("Phase 13: admin/risk functionality");
const summary = store.adminSummary(admin());
assert.ok(summary.totals.users >= 2, "admin summary returns users");
const riskResult = store.setRisk(admin(), u.id, { wagerLimit: 1 });
assert.equal(riskResult.risk.wagerLimit, 1, "risk limit updated");
assert.throws(() => store.placeBet(u, { game: "dice", wager: 2, params: { target: 50.5 } }), /Wager limit exceeded/, "risk limit enforced");
store.setRisk(admin(), u.id, { wagerLimit: 1000 });

console.log("Phase 14: auth helpers");
assert.equal(dbmod.verifyPassword("ChangeMe123!", user().passwordHash), true, "password verification works");
assert.equal(dbmod.verifyPassword("wrong", user().passwordHash), false, "bad password rejected");

console.log("All backend/game tests passed.");
