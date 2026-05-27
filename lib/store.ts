import crypto from "crypto";
import { BET_LIMITS, runGame, type GameKey } from "./gameEngine";
import { createSeedPair, sha256, rollInt, sampleWithoutReplacement, type FairInput } from "./fairness";
import { id, now, readDb, roundMoney, transact, type AppDb, type BetRecord, type Deposit, type GameSession, type User, type Withdrawal } from "./db";
import { addLedger, availableBalance, finalizeLockedWithdrawal, getWallet, lockFunds, unlockFunds } from "./money";

const ranks = ["Dust", "Copper", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Ranch Boss"];
const rankThresholds = [0, 500, 1500, 5000, 15000, 50000, 150000, 500000];

function assertRisk(db: AppDb, user: User, wager = 0) {
  if (user.frozen) throw new Error("Account is frozen");
  if (!user.termsAcceptedAt) throw new Error("Terms must be accepted");
  if (user.amlStatus === "blocked") throw new Error("Account blocked for review");
  const risk = db.risks.find((item) => item.userId === user.id);
  if (!risk?.ageGateAccepted) throw new Error("Age gate required");
  if (risk.selfExcludedUntil && new Date(risk.selfExcludedUntil).getTime() > Date.now()) throw new Error("Account is self-excluded");
  if (risk.coolOffUntil && new Date(risk.coolOffUntil).getTime() > Date.now()) throw new Error("Account is cooling off");
  if (wager > 0 && wager > risk.wagerLimit) throw new Error("Wager limit exceeded");
}

function getReward(db: AppDb, userId: string) {
  let reward = db.rewards.find((item) => item.userId === userId);
  if (!reward) { reward = { userId, rakebackAccrued: 0, rakebackClaimed: 0, rank: "Dust" }; db.rewards.push(reward); }
  return reward;
}
function getSeed(db: AppDb, userId: string) { if (!db.seeds[userId]) db.seeds[userId] = createSeedPair(); return db.seeds[userId]; }
function updateRank(db: AppDb, userId: string) {
  const wallet = getWallet(db, userId);
  const reward = getReward(db, userId);
  let rank = ranks[0];
  for (let i = 0; i < rankThresholds.length; i += 1) if (wallet.wagered >= rankThresholds[i]) rank = ranks[i];
  reward.rank = rank;
}
function idempotent<T>(db: AppDb, key: string | undefined, scope: string): T | null {
  if (!key) return null;
  const found = db.idempotency.find((item) => item.key === key && item.scope === scope);
  return found?.response as T | null;
}
function remember(db: AppDb, key: string | undefined, scope: string, refId: string, response: unknown) {
  if (!key) return;
  if (!db.idempotency.some((item) => item.key === key && item.scope === scope)) db.idempotency.push({ key, scope, refId, response, createdAt: now() });
}

export function publicState(userId: string) {
  const db = readDb();
  const user = db.users.find((item) => item.id === userId);
  if (!user) throw new Error("User not found");
  const wallet = getWallet(db, userId);
  const reward = getReward(db, userId);
  const seed = getSeed(db, userId);
  return {
    user: { displayName: user.displayName, privacyMode: user.privacyMode, frozen: user.frozen, role: user.role },
    wallet,
    reward,
    seed: { serverSeedHash: seed.serverSeedHash, clientSeed: seed.clientSeed, nonce: seed.nonce },
    bets: db.bets.filter((bet) => bet.userId === userId).slice(0, 50),
    ledger: db.ledgers.filter((entry) => entry.userId === userId).slice(0, 50),
    deposits: db.deposits.filter((dep) => dep.userId === userId).slice(0, 20),
    withdrawals: db.withdrawals.filter((wd) => wd.userId === userId).slice(0, 20),
    activeSessions: db.gameSessions.filter((s) => s.userId === userId && s.status === "active"),
  };
}

export function placeBet(user: User, input: { game: GameKey; wager: number; params?: Record<string, unknown>; idempotencyKey?: string }) {
  return transact((db) => {
    const existing = idempotent<BetRecord>(db, input.idempotencyKey, "bet");
    if (existing) return existing;
    const wager = roundMoney(Number(input.wager));
    if (!Number.isFinite(wager) || wager < BET_LIMITS.min || wager > BET_LIMITS.max) throw new Error(`Wager must be between ${BET_LIMITS.min} and ${BET_LIMITS.max}`);
    assertRisk(db, user, wager);
    const wallet = getWallet(db, user.id);
    if (availableBalance(wallet) < wager) throw new Error("Insufficient balance");
    const seed = getSeed(db, user.id);
    const fair: FairInput = { serverSeed: seed.serverSeed, clientSeed: seed.clientSeed, nonce: seed.nonce };
    const outcome = runGame(input.game, wager, fair, input.params);
    const betId = id("bet");
    addLedger(db, user.id, "bet_debit", -wager, betId, `${input.game} wager`, input.idempotencyKey);
    if (outcome.payout > 0) addLedger(db, user.id, outcome.result === "push" ? "bet_refund" : "bet_win", outcome.payout, betId, outcome.detail, input.idempotencyKey);
    const updated = getWallet(db, user.id);
    updated.wagered = roundMoney(updated.wagered + wager);
    updated.netProfit = roundMoney(updated.netProfit + outcome.profit);
    const reward = getReward(db, user.id);
    reward.rakebackAccrued = roundMoney(reward.rakebackAccrued + wager * 0.0025);
    updateRank(db, user.id);
    const bet: BetRecord = { id: betId, userId: user.id, game: input.game, wager, multiplier: outcome.multiplier, payout: outcome.payout, profit: outcome.profit, result: outcome.result, detail: outcome.detail, nonce: seed.nonce, clientSeed: seed.clientSeed, serverSeedHash: seed.serverSeedHash, params: input.params, proof: outcome.proof, idempotencyKey: input.idempotencyKey || betId, createdAt: now() };
    db.bets.unshift(bet);
    seed.nonce += 1;
    remember(db, input.idempotencyKey, "bet", bet.id, bet);
    return bet;
  });
}

export function rotateSeed(user: User, clientSeed?: string) {
  return transact((db) => {
    const current = getSeed(db, user.id);
    db.revealedSeeds.unshift({ ...current, userId: user.id, rotatedAt: now() });
    const next = createSeedPair(String(clientSeed || current.clientSeed || "ranch-client"));
    db.seeds[user.id] = next;
    db.auditLogs.unshift({ id: id("audit"), actorUserId: user.id, action: "seed.rotate", target: user.id, createdAt: now() });
    return { previous: { serverSeed: current.serverSeed, serverSeedHash: current.serverSeedHash }, next: { serverSeedHash: next.serverSeedHash, clientSeed: next.clientSeed, nonce: next.nonce } };
  });
}

export function verifyBet(user: User, betId: string, serverSeed?: string) {
  const db = readDb();
  const bet = db.bets.find((item) => item.id === betId && item.userId === user.id);
  if (!bet) throw new Error("Bet not found");
  const revealed = serverSeed || db.revealedSeeds.find((seed) => seed.userId === user.id && seed.serverSeedHash === bet.serverSeedHash)?.serverSeed;
  if (!revealed) return { verified: false, reason: "Server seed is not revealed yet", bet };
  if (sha256(revealed) !== bet.serverSeedHash) return { verified: false, reason: "Server seed hash mismatch", bet };
  const recomputed = runGame(bet.game as GameKey, bet.wager, { serverSeed: revealed, clientSeed: bet.clientSeed, nonce: bet.nonce }, bet.params);
  const verified = recomputed.result === bet.result && recomputed.payout === bet.payout && JSON.stringify(recomputed.proof) === JSON.stringify(bet.proof);
  return { verified, bet, recomputed };
}

export async function createDeposit(user: User, amount: number, currency = "btc") {
  return transact((db) => {
    assertRisk(db, user);
    const value = roundMoney(Number(amount));
    const risk = db.risks.find((item) => item.userId === user.id);
    if (!Number.isFinite(value) || value <= 0 || value > (risk?.depositLimit || 500)) throw new Error("Deposit amount outside limits");
    const deposit: Deposit = { id: id("dep"), userId: user.id, amount: value, currency: currency.toLowerCase(), status: "pending", provider: "nowpayments", checkoutUrl: process.env.NOWPAYMENTS_API_KEY ? undefined : `/wallet?deposit=${Date.now()}`, createdAt: now(), updatedAt: now() };
    db.deposits.unshift(deposit);
    return deposit;
  });
}

export function handlePaymentWebhook(payload: any, signature?: string) {
  return transact((db) => {
    if (process.env.NOWPAYMENTS_IPN_SECRET) {
      const expected = crypto.createHmac("sha512", process.env.NOWPAYMENTS_IPN_SECRET).update(JSON.stringify(payload)).digest("hex");
      if (!signature || signature !== expected) throw new Error("Invalid webhook signature");
    }
    const paymentId = String(payload.payment_id || payload.id || payload.providerPaymentId || "");
    const deposit = db.deposits.find((item) => item.providerPaymentId === paymentId || item.id === payload.order_id || item.id === payload.depositId);
    if (!deposit) throw new Error("Deposit not found");
    deposit.providerPaymentId = paymentId || deposit.providerPaymentId;
    deposit.raw = payload;
    deposit.updatedAt = now();
    const status = String(payload.payment_status || payload.status || "").toLowerCase();
    if (["finished", "confirmed", "sending"].includes(status) && !deposit.creditedLedgerId) {
      deposit.status = "confirmed";
      const ledger = addLedger(db, deposit.userId, "deposit_confirmed", deposit.amount, deposit.id, "NOWPayments confirmed", `deposit:${deposit.id}`);
      deposit.creditedLedgerId = ledger.id;
    } else if (["expired", "failed"].includes(status)) deposit.status = status as Deposit["status"];
    else if (status === "partially_paid") deposit.status = "underpaid";
    return deposit;
  });
}

export function requestWithdrawal(user: User, amount: number, currency: string, address: string) {
  return transact((db) => {
    assertRisk(db, user);
    if (user.kycStatus === "required" || user.amlStatus === "review") throw new Error("Withdrawal requires account review");
    const value = roundMoney(Number(amount));
    if (!Number.isFinite(value) || value < 5) throw new Error("Minimum withdrawal is $5.00");
    if (!address || address.length < 18) throw new Error("Withdrawal address is too short");
    const withdrawal: Withdrawal = { id: id("wd"), userId: user.id, amount: value, currency: currency.toLowerCase(), address, status: "pending", createdAt: now(), updatedAt: now() };
    const lock = lockFunds(db, user.id, value, withdrawal.id, "manual withdrawal request");
    withdrawal.lockLedgerId = lock.id;
    db.withdrawals.unshift(withdrawal);
    return withdrawal;
  });
}

export function decideWithdrawal(admin: User, withdrawalId: string, decision: "approved" | "rejected" | "sent", reason?: string, txHash?: string) {
  return transact((db) => {
    const withdrawal = db.withdrawals.find((item) => item.id === withdrawalId);
    if (!withdrawal) throw new Error("Withdrawal not found");
    if (decision === "rejected") {
      if (withdrawal.status !== "pending" && withdrawal.status !== "approved") throw new Error("Withdrawal cannot be rejected from this state");
      unlockFunds(db, withdrawal.userId, withdrawal.amount, withdrawal.id, reason || "admin rejected");
      withdrawal.status = "rejected";
    }
    if (decision === "approved") {
      if (withdrawal.status !== "pending") throw new Error("Only pending withdrawals can be approved");
      withdrawal.status = "approved";
    }
    if (decision === "sent") {
      if (withdrawal.status !== "approved") throw new Error("Only approved withdrawals can be marked sent");
      if (!txHash || txHash.length < 6) throw new Error("Transaction hash required");
      const final = finalizeLockedWithdrawal(db, withdrawal.userId, withdrawal.amount, withdrawal.id, reason || "manual payout sent");
      withdrawal.finalLedgerId = final.id;
      withdrawal.status = "sent";
      withdrawal.txHash = txHash;
    }
    withdrawal.reason = reason;
    withdrawal.updatedAt = now();
    db.auditLogs.unshift({ id: id("audit"), actorUserId: admin.id, action: `withdrawal.${decision}`, target: withdrawal.id, reason, createdAt: now() });
    return withdrawal;
  });
}

export function claimDaily(user: User) {
  return transact((db) => {
    assertRisk(db, user);
    const reward = getReward(db, user.id);
    const last = reward.lastDailyClaimAt ? new Date(reward.lastDailyClaimAt).getTime() : 0;
    if (Date.now() - last < 24 * 60 * 60 * 1000) throw new Error("Daily bonus already claimed");
    reward.lastDailyClaimAt = now();
    return addLedger(db, user.id, "bonus_credit", 2.5, "daily_bonus", "daily claim");
  });
}

export function claimRakeback(user: User) {
  return transact((db) => {
    assertRisk(db, user);
    const reward = getReward(db, user.id);
    const amount = roundMoney(reward.rakebackAccrued - reward.rakebackClaimed);
    if (amount <= 0) throw new Error("No rakeback available");
    reward.rakebackClaimed = roundMoney(reward.rakebackClaimed + amount);
    return addLedger(db, user.id, "rakeback_credit", amount, "rakeback_claim", "rakeback claim");
  });
}

export function adminSummary(admin: User) {
  const db = readDb();
  return { users: db.users.map(({ passwordHash, ...user }) => user), wallets: db.wallets, bets: db.bets.slice(0, 100), ledgers: db.ledgers.slice(0, 100), deposits: db.deposits, withdrawals: db.withdrawals, rewards: db.rewards, risks: db.risks, creators: db.creators, auditLogs: db.auditLogs.slice(0, 100), totals: { users: db.users.length, bets: db.bets.length, deposits: db.deposits.length, withdrawals: db.withdrawals.length, volume: roundMoney(db.bets.reduce((sum, bet) => sum + bet.wager, 0)) }, admin: admin.displayName };
}

export function liveFeed() {
  const db = readDb();
  const users = Object.fromEntries(db.users.map((user) => [user.id, user]));
  return db.bets.slice(0, 100).map((bet) => ({ ...bet, displayName: users[bet.userId]?.privacyMode ? `rancher_${bet.id.slice(-4)}` : users[bet.userId]?.displayName || "rancher" }));
}

// Session games. These are intentionally small but server-owned, restorable, and verifyable.
export function startMines(user: User, wager: number, mineCount = 3) {
  return transact((db) => {
    assertRisk(db, user, wager);
    const wallet = getWallet(db, user.id); if (availableBalance(wallet) < wager) throw new Error("Insufficient balance");
    const seed = getSeed(db, user.id); const fair = { serverSeed: seed.serverSeed, clientSeed: seed.clientSeed, nonce: seed.nonce };
    const mines = sampleWithoutReplacement(fair, 25, Math.max(1, Math.min(24, Math.floor(mineCount))));
    const session: GameSession = { id: id("game"), userId: user.id, game: "mines", status: "active", wager, payout: 0, profit: -wager, nonce: seed.nonce, clientSeed: seed.clientSeed, serverSeedHash: seed.serverSeedHash, state: { mineCount, mines, revealed: [] }, proof: { mineCount, mines }, idempotencyKey: id("idem"), createdAt: now(), updatedAt: now() };
    addLedger(db, user.id, "bet_debit", -wager, session.id, "mines session wager"); seed.nonce += 1; db.gameSessions.unshift(session); return session;
  });
}
export function revealMinesTile(user: User, sessionId: string, tile: number) {
  return transact((db) => {
    const s = db.gameSessions.find((x) => x.id === sessionId && x.userId === user.id && x.game === "mines"); if (!s || s.status !== "active") throw new Error("Active Mines session not found");
    const mines = s.state.mines as number[]; const revealed = s.state.revealed as number[]; if (tile < 0 || tile > 24 || revealed.includes(tile)) throw new Error("Invalid tile");
    if (mines.includes(tile)) { s.status = "busted"; s.profit = -s.wager; }
    else { revealed.push(tile); s.state.revealed = revealed; s.payout = roundMoney(s.wager * (1 + revealed.length * 0.18)); s.profit = roundMoney(s.payout - s.wager); }
    s.updatedAt = now(); return s;
  });
}
export function cashoutSession(user: User, sessionId: string) {
  return transact((db) => {
    const s = db.gameSessions.find((x) => x.id === sessionId && x.userId === user.id); if (!s || s.status !== "active") throw new Error("Active session not found");
    s.status = "cashed_out"; s.updatedAt = now(); if (s.payout > 0) addLedger(db, user.id, "bet_win", s.payout, s.id, `${s.game} cashout`); return s;
  });
}
export function startTower(user: User, wager: number, rows = 6) {
  return transact((db) => { assertRisk(db, user, wager); const wallet = getWallet(db, user.id); if (availableBalance(wallet) < wager) throw new Error("Insufficient balance"); const seed = getSeed(db, user.id); const fair = { serverSeed: seed.serverSeed, clientSeed: seed.clientSeed, nonce: seed.nonce }; const traps = Array.from({ length: rows }, (_, row) => rollInt({ ...fair, cursor: row }, 3)); const s: GameSession = { id: id("game"), userId: user.id, game: "tower", status: "active", wager, payout: 0, profit: -wager, nonce: seed.nonce, clientSeed: seed.clientSeed, serverSeedHash: seed.serverSeedHash, state: { rows, traps, currentRow: 0, picks: [] }, proof: { traps }, idempotencyKey: id("idem"), createdAt: now(), updatedAt: now() }; addLedger(db, user.id, "bet_debit", -wager, s.id, "tower session wager"); seed.nonce += 1; db.gameSessions.unshift(s); return s; });
}
export function pickTower(user: User, sessionId: string, pick: number) {
  return transact((db) => { const s = db.gameSessions.find((x) => x.id === sessionId && x.userId === user.id && x.game === "tower"); if (!s || s.status !== "active") throw new Error("Active Tower session not found"); const row = Number(s.state.currentRow || 0); const traps = s.state.traps as number[]; const picks = s.state.picks as number[]; if (pick < 0 || pick > 2) throw new Error("Invalid tower pick"); if (traps[row] === pick) { s.status = "busted"; s.profit = -s.wager; } else { picks.push(pick); s.state.picks = picks; s.state.currentRow = row + 1; s.payout = roundMoney(s.wager * (1 + picks.length * 0.4)); s.profit = roundMoney(s.payout - s.wager); if (row + 1 >= traps.length) s.status = "complete"; if (s.status === "complete") addLedger(db, user.id, "bet_win", s.payout, s.id, "tower complete"); } s.updatedAt = now(); return s; });
}

export function setRisk(admin: User, userId: string, patch: Partial<{ frozen: boolean; selfExcludedUntil: string; coolOffUntil: string; wagerLimit: number; depositLimit: number; lossLimit: number; amlStatus: User["amlStatus"]; kycStatus: User["kycStatus"] }>) {
  return transact((db) => { const user = db.users.find((u) => u.id === userId); if (!user) throw new Error("User not found"); const risk = db.risks.find((r) => r.userId === userId); if (typeof patch.frozen === "boolean") user.frozen = patch.frozen; if (patch.amlStatus) user.amlStatus = patch.amlStatus; if (patch.kycStatus) user.kycStatus = patch.kycStatus; if (risk) Object.assign(risk, Object.fromEntries(Object.entries(patch).filter(([k,v]) => k in risk && v !== undefined))); db.auditLogs.unshift({ id: id("audit"), actorUserId: admin.id, action: "risk.update", target: userId, reason: JSON.stringify(patch), createdAt: now() }); return { user, risk }; });
}
