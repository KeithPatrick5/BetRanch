import crypto from "crypto";
import { BET_LIMITS, compareOutcome, minesMultiplier, towerMultiplier, crashPoint, hiloDeck, blackjackDeck, handValue, cardName, cardRank, runGame, type GameKey } from "./gameEngine";
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
  const verified = compareOutcome(recomputed, bet as any);
  return { verified, bet, recomputed };
}

export function createDeposit(user: User, amount: number, currency = "btc") {
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

export function attachDepositProvider(depositId: string, update: { providerPaymentId?: string; checkoutUrl?: string; raw?: unknown }) {
  return transact((db) => {
    const deposit = db.deposits.find((item) => item.id === depositId);
    if (!deposit) throw new Error("Deposit not found");
    if (update.providerPaymentId) deposit.providerPaymentId = update.providerPaymentId;
    if (update.checkoutUrl) deposit.checkoutUrl = update.checkoutUrl;
    if (update.raw) deposit.raw = update.raw;
    deposit.updatedAt = now();
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
    const actuallyPaid = Number(payload.actually_paid ?? payload.pay_amount ?? payload.amount_received ?? deposit.amount);
    const required = Number(payload.price_amount ?? payload.amount ?? deposit.amount);
    if (["finished", "confirmed", "sending"].includes(status) && !deposit.creditedLedgerId) {
      if (Number.isFinite(actuallyPaid) && Number.isFinite(required) && actuallyPaid + 0.00000001 < required) {
        deposit.status = "underpaid";
        return deposit;
      }
      deposit.status = Number.isFinite(actuallyPaid) && actuallyPaid > required ? "overpaid" : "confirmed";
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

// Session games. These are server-owned, restorable, ledger-backed, and verifyable.
function validateSessionWager(db: AppDb, user: User, wager: number) {
  const value = roundMoney(Number(wager));
  if (!Number.isFinite(value) || value < BET_LIMITS.min || value > BET_LIMITS.max) throw new Error(`Wager must be between ${BET_LIMITS.min} and ${BET_LIMITS.max}`);
  assertRisk(db, user, value);
  const wallet = getWallet(db, user.id);
  if (availableBalance(wallet) < value) throw new Error("Insufficient balance");
  return value;
}

export function startMines(user: User, wager: number, mineCount = 3) {
  return transact((db) => {
    const value = validateSessionWager(db, user, wager);
    const seed = getSeed(db, user.id);
    const count = Math.max(1, Math.min(24, Math.floor(Number(mineCount) || 3)));
    const fair = { serverSeed: seed.serverSeed, clientSeed: seed.clientSeed, nonce: seed.nonce };
    const mines = sampleWithoutReplacement(fair, 25, count);
    const session: GameSession = {
      id: id("game"), userId: user.id, game: "mines", status: "active",
      wager: value, payout: 0, profit: -value, nonce: seed.nonce, clientSeed: seed.clientSeed, serverSeedHash: seed.serverSeedHash,
      state: { mineCount: count, mines, revealed: [] }, params: { mineCount: count }, proof: { game: "mines", mineCount: count, mines },
      idempotencyKey: id("idem"), createdAt: now(), updatedAt: now()
    };
    addLedger(db, user.id, "bet_debit", -value, session.id, "mines session wager");
    seed.nonce += 1;
    db.gameSessions.unshift(session);
    return session;
  });
}

export function revealMinesTile(user: User, sessionId: string, tile: number) {
  return transact((db) => {
    const s = db.gameSessions.find((x) => x.id === sessionId && x.userId === user.id && x.game === "mines");
    if (!s || s.status !== "active") throw new Error("Active Mines session not found");
    const selected = Math.floor(Number(tile));
    const mines = s.state.mines as number[];
    const revealed = (s.state.revealed as number[]) || [];
    if (!Number.isInteger(selected) || selected < 0 || selected > 24 || revealed.includes(selected)) throw new Error("Invalid tile");
    if (mines.includes(selected)) {
      s.status = "busted";
      s.payout = 0;
      s.profit = -s.wager;
      s.state = { ...s.state, bustedTile: selected, finalMines: mines };
    } else {
      revealed.push(selected);
      const mineCount = Number(s.state.mineCount || 3);
      s.state.revealed = revealed;
      s.payout = roundMoney(s.wager * minesMultiplier(mineCount, revealed.length));
      s.profit = roundMoney(s.payout - s.wager);
      if (revealed.length >= 25 - mineCount) {
        s.status = "complete";
        addLedger(db, user.id, "bet_win", s.payout, s.id, "mines full clear");
      }
    }
    s.updatedAt = now();
    return s;
  });
}

export function startTower(user: User, wager: number, rows = 6) {
  return transact((db) => {
    const value = validateSessionWager(db, user, wager);
    const rowCount = Math.max(1, Math.min(8, Math.floor(Number(rows) || 6)));
    const seed = getSeed(db, user.id);
    const fair = { serverSeed: seed.serverSeed, clientSeed: seed.clientSeed, nonce: seed.nonce };
    const traps = Array.from({ length: rowCount }, (_, row) => rollInt({ ...fair, cursor: row }, 3));
    const s: GameSession = {
      id: id("game"), userId: user.id, game: "tower", status: "active",
      wager: value, payout: 0, profit: -value, nonce: seed.nonce, clientSeed: seed.clientSeed, serverSeedHash: seed.serverSeedHash,
      state: { rows: rowCount, width: 3, traps, currentRow: 0, picks: [] }, params: { rows: rowCount, width: 3 }, proof: { game: "tower", traps },
      idempotencyKey: id("idem"), createdAt: now(), updatedAt: now()
    };
    addLedger(db, user.id, "bet_debit", -value, s.id, "tower session wager");
    seed.nonce += 1;
    db.gameSessions.unshift(s);
    return s;
  });
}

export function pickTower(user: User, sessionId: string, pick: number) {
  return transact((db) => {
    const s = db.gameSessions.find((x) => x.id === sessionId && x.userId === user.id && x.game === "tower");
    if (!s || s.status !== "active") throw new Error("Active Tower session not found");
    const row = Number(s.state.currentRow || 0);
    const traps = s.state.traps as number[];
    const picks = (s.state.picks as number[]) || [];
    const selected = Math.floor(Number(pick));
    if (!Number.isInteger(selected) || selected < 0 || selected > 2) throw new Error("Invalid tower pick");
    if (row !== picks.length || row >= traps.length) throw new Error("Invalid tower row");
    if (traps[row] === selected) {
      s.status = "busted";
      s.payout = 0;
      s.profit = -s.wager;
      s.state = { ...s.state, bustRow: row, bustPick: selected };
    } else {
      picks.push(selected);
      s.state.picks = picks;
      s.state.currentRow = row + 1;
      s.payout = roundMoney(s.wager * towerMultiplier(picks.length, 3));
      s.profit = roundMoney(s.payout - s.wager);
      if (row + 1 >= traps.length) {
        s.status = "complete";
        addLedger(db, user.id, "bet_win", s.payout, s.id, "tower complete");
      }
    }
    s.updatedAt = now();
    return s;
  });
}

export function startHilo(user: User, wager: number) {
  return transact((db) => {
    const value = validateSessionWager(db, user, wager);
    const seed = getSeed(db, user.id);
    const fair = { serverSeed: seed.serverSeed, clientSeed: seed.clientSeed, nonce: seed.nonce };
    const deck = hiloDeck(fair, 20);
    const s: GameSession = {
      id: id("game"), userId: user.id, game: "hilo", status: "active",
      wager: value, payout: value, profit: 0, nonce: seed.nonce, clientSeed: seed.clientSeed, serverSeedHash: seed.serverSeedHash,
      state: { deck, cursor: 1, currentCard: deck[0], history: [cardName(deck[0])] }, proof: { game: "hilo", deck: deck.map(cardName) },
      idempotencyKey: id("idem"), createdAt: now(), updatedAt: now()
    };
    addLedger(db, user.id, "bet_debit", -value, s.id, "hilo session wager");
    seed.nonce += 1;
    db.gameSessions.unshift(s);
    return s;
  });
}

export function pickHilo(user: User, sessionId: string, choice: "higher" | "lower") {
  return transact((db) => {
    const s = db.gameSessions.find((x) => x.id === sessionId && x.userId === user.id && x.game === "hilo");
    if (!s || s.status !== "active") throw new Error("Active Hilo session not found");
    const valid = choice === "higher" || choice === "lower" ? choice : "higher";
    const deck = s.state.deck as number[];
    const cursor = Number(s.state.cursor || 1);
    const currentCard = Number(s.state.currentCard);
    const nextCard = deck[cursor];
    if (nextCard === undefined) throw new Error("Deck exhausted");
    const current = cardRank(currentCard);
    const next = cardRank(nextCard);
    const win = valid === "higher" ? next > current : next < current;
    const push = next === current;
    const history = [...((s.state.history as string[]) || []), cardName(nextCard)];
    if (push) {
      s.state = { ...s.state, cursor: cursor + 1, currentCard: nextCard, history, lastChoice: valid, lastResult: "push" };
    } else if (win) {
      const wins = Number(s.state.wins || 0) + 1;
      s.payout = roundMoney(s.wager * Math.pow(1.94, wins));
      s.profit = roundMoney(s.payout - s.wager);
      s.state = { ...s.state, cursor: cursor + 1, currentCard: nextCard, history, wins, lastChoice: valid, lastResult: "win" };
    } else {
      s.status = "busted";
      s.payout = 0;
      s.profit = -s.wager;
      s.state = { ...s.state, cursor: cursor + 1, currentCard: nextCard, history, lastChoice: valid, lastResult: "loss" };
    }
    s.updatedAt = now();
    return s;
  });
}

export function startCrash(user: User, wager: number, autoCashout = 2) {
  return transact((db) => {
    const value = validateSessionWager(db, user, wager);
    const target = Math.max(1.01, Math.min(1000, Number(autoCashout) || 2));
    const seed = getSeed(db, user.id);
    const fair = { serverSeed: seed.serverSeed, clientSeed: seed.clientSeed, nonce: seed.nonce };
    const crashAt = crashPoint(fair);
    const won = crashAt >= target;
    const payout = won ? roundMoney(value * target) : 0;
    const status: GameSession["status"] = won ? "cashed_out" : "busted";
    const s: GameSession = {
      id: id("game"), userId: user.id, game: "crash", status,
      wager: value, payout, profit: roundMoney(payout - value), nonce: seed.nonce, clientSeed: seed.clientSeed, serverSeedHash: seed.serverSeedHash,
      state: { autoCashout: target, crashAt, cashedOutAt: won ? target : undefined }, params: { autoCashout: target }, proof: { game: "crash", autoCashout: target, crashAt },
      idempotencyKey: id("idem"), createdAt: now(), updatedAt: now()
    };
    addLedger(db, user.id, "bet_debit", -value, s.id, "crash session wager");
    if (payout > 0) addLedger(db, user.id, "bet_win", payout, s.id, "crash auto cashout");
    seed.nonce += 1;
    db.gameSessions.unshift(s);
    return s;
  });
}

export function startBlackjack(user: User, wager: number) {
  return transact((db) => {
    const value = validateSessionWager(db, user, wager);
    const seed = getSeed(db, user.id);
    const fair = { serverSeed: seed.serverSeed, clientSeed: seed.clientSeed, nonce: seed.nonce };
    const deck = blackjackDeck(fair);
    const playerCards = [deck[0], deck[2]];
    const dealerCards = [deck[1], deck[3]];
    const player = handValue(playerCards);
    const natural = player === 21;
    const s: GameSession = {
      id: id("game"), userId: user.id, game: "blackjack", status: natural ? "complete" : "active",
      wager: value, payout: natural ? roundMoney(value * 2.5) : 0, profit: natural ? roundMoney(value * 1.5) : -value,
      nonce: seed.nonce, clientSeed: seed.clientSeed, serverSeedHash: seed.serverSeedHash,
      state: { deck, cursor: 4, playerCards, dealerCards, player, dealerUpCard: cardName(dealerCards[0]), actionLog: ["deal"], natural },
      proof: { game: "blackjack", deck: deck.map(cardName) }, idempotencyKey: id("idem"), createdAt: now(), updatedAt: now()
    };
    addLedger(db, user.id, "bet_debit", -value, s.id, "blackjack session wager");
    if (natural) addLedger(db, user.id, "bet_win", s.payout, s.id, "blackjack natural");
    seed.nonce += 1;
    db.gameSessions.unshift(s);
    return s;
  });
}

export function blackjackAction(user: User, sessionId: string, action: "hit" | "stand" | "double") {
  return transact((db) => {
    const s = db.gameSessions.find((x) => x.id === sessionId && x.userId === user.id && x.game === "blackjack");
    if (!s || s.status !== "active") throw new Error("Active Blackjack session not found");
    const deck = s.state.deck as number[];
    const playerCards = [...((s.state.playerCards as number[]) || [])];
    const dealerCards = [...((s.state.dealerCards as number[]) || [])];
    let cursor = Number(s.state.cursor || 4);
    const act = action === "hit" || action === "double" || action === "stand" ? action : "stand";
    const actionLog = [...((s.state.actionLog as string[]) || []), act];

    if (act === "hit" || act === "double") {
      if (act === "double" && playerCards.length !== 2) throw new Error("Double only allowed as first action");
      playerCards.push(deck[cursor++]);
      if (act === "double") {
        addLedger(db, user.id, "bet_debit", -s.wager, s.id, "blackjack double wager");
        s.wager = roundMoney(s.wager * 2);
      }
    }

    let player = handValue(playerCards);
    if (player > 21) {
      s.status = "busted";
      s.payout = 0;
      s.profit = -s.wager;
      s.state = { ...s.state, playerCards, dealerCards, cursor, player, actionLog, result: "player_bust" };
      s.updatedAt = now();
      return s;
    }

    if (act === "stand" || act === "double") {
      let dealer = handValue(dealerCards);
      while (dealer < 17 && cursor < deck.length) {
        dealerCards.push(deck[cursor++]);
        dealer = handValue(dealerCards);
      }
      player = handValue(playerCards);
      let payout = 0;
      let result = "dealer_win";
      if (dealer > 21 || player > dealer) { payout = roundMoney(s.wager * 2); result = dealer > 21 ? "dealer_bust" : "player_win"; }
      else if (player === dealer) { payout = s.wager; result = "push"; }
      s.status = "complete";
      s.payout = payout;
      s.profit = roundMoney(payout - s.wager);
      if (payout > 0) addLedger(db, user.id, payout === s.wager ? "bet_refund" : "bet_win", payout, s.id, `blackjack ${result}`);
      s.state = { ...s.state, playerCards, dealerCards, cursor, player, dealer, actionLog, result };
      s.updatedAt = now();
      return s;
    }

    s.state = { ...s.state, playerCards, dealerCards, cursor, player, actionLog };
    s.updatedAt = now();
    return s;
  });
}

export function cashoutSession(user: User, sessionId: string) {
  return transact((db) => {
    const s = db.gameSessions.find((x) => x.id === sessionId && x.userId === user.id);
    if (!s || s.status !== "active") throw new Error("Active session not found");
    if (!["mines", "tower", "hilo"].includes(s.game)) throw new Error("This session cannot be cashed out manually");
    if (s.payout <= 0) throw new Error("Nothing to cash out yet");
    s.status = "cashed_out";
    s.updatedAt = now();
    addLedger(db, user.id, "bet_win", s.payout, s.id, `${s.game} cashout`);
    return s;
  });
}

export function setRisk(admin: User, userId: string, patch: Partial<{ frozen: boolean; selfExcludedUntil: string; coolOffUntil: string; wagerLimit: number; depositLimit: number; lossLimit: number; amlStatus: User["amlStatus"]; kycStatus: User["kycStatus"] }>) {
  return transact((db) => { const user = db.users.find((u) => u.id === userId); if (!user) throw new Error("User not found"); const risk = db.risks.find((r) => r.userId === userId); if (typeof patch.frozen === "boolean") user.frozen = patch.frozen; if (patch.amlStatus) user.amlStatus = patch.amlStatus; if (patch.kycStatus) user.kycStatus = patch.kycStatus; if (risk) Object.assign(risk, Object.fromEntries(Object.entries(patch).filter(([k,v]) => k in risk && v !== undefined))); db.auditLogs.unshift({ id: id("audit"), actorUserId: admin.id, action: "risk.update", target: userId, reason: JSON.stringify(patch), createdAt: now() }); return { user, risk }; });
}
