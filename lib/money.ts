import { id, now, roundMoney, type AppDb, type LedgerEntry, type Wallet } from "./db";

export function getWallet(db: AppDb, userId: string): Wallet {
  const wallet = db.wallets.find((item) => item.userId === userId);
  if (!wallet) throw new Error("Wallet not found");
  return wallet;
}
export function availableBalance(wallet: Wallet) { return roundMoney(wallet.balance - wallet.locked); }

export function addLedger(db: AppDb, userId: string, type: string, amount: number, ref: string, reason?: string, idempotencyKey?: string) {
  const wallet = getWallet(db, userId);
  const rounded = roundMoney(amount);
  wallet.balance = roundMoney(wallet.balance + rounded);
  wallet.updatedAt = now();
  if (wallet.balance < -0.00001 || wallet.locked < -0.00001 || wallet.locked - wallet.balance > 0.00001) throw new Error("Wallet invariant failed");
  const entry: LedgerEntry = { id: id("ledger"), userId, type, amount: rounded, balanceAfter: wallet.balance, lockedAfter: wallet.locked, ref, reason, idempotencyKey, createdAt: now() };
  db.ledgers.unshift(entry);
  return entry;
}

export function lockFunds(db: AppDb, userId: string, amount: number, ref: string, reason?: string) {
  const wallet = getWallet(db, userId);
  const rounded = roundMoney(amount);
  if (availableBalance(wallet) < rounded) throw new Error("Insufficient unlocked balance");
  wallet.locked = roundMoney(wallet.locked + rounded);
  wallet.updatedAt = now();
  const entry: LedgerEntry = { id: id("ledger"), userId, type: "withdrawal_lock", amount: 0, balanceAfter: wallet.balance, lockedAfter: wallet.locked, ref, reason, createdAt: now() };
  db.ledgers.unshift(entry);
  return entry;
}

export function unlockFunds(db: AppDb, userId: string, amount: number, ref: string, reason?: string) {
  const wallet = getWallet(db, userId);
  const rounded = roundMoney(amount);
  wallet.locked = roundMoney(Math.max(0, wallet.locked - rounded));
  wallet.updatedAt = now();
  const entry: LedgerEntry = { id: id("ledger"), userId, type: "withdrawal_unlock", amount: 0, balanceAfter: wallet.balance, lockedAfter: wallet.locked, ref, reason, createdAt: now() };
  db.ledgers.unshift(entry);
  return entry;
}

export function finalizeLockedWithdrawal(db: AppDb, userId: string, amount: number, ref: string, reason?: string) {
  const wallet = getWallet(db, userId);
  const rounded = roundMoney(amount);
  if (wallet.locked < rounded) throw new Error("Withdrawal lock missing");
  wallet.locked = roundMoney(wallet.locked - rounded);
  wallet.balance = roundMoney(wallet.balance - rounded);
  wallet.updatedAt = now();
  const entry: LedgerEntry = { id: id("ledger"), userId, type: "withdrawal_sent", amount: -rounded, balanceAfter: wallet.balance, lockedAfter: wallet.locked, ref, reason, createdAt: now() };
  db.ledgers.unshift(entry);
  return entry;
}
