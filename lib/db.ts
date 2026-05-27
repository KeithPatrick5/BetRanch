import fs from "fs";
import path from "path";
import crypto from "crypto";
import { createSeedPair } from "./fairness";

export type Role = "user" | "admin";
export type User = { id: string; email: string; passwordHash: string; displayName: string; role: Role; frozen: boolean; privacyMode: boolean; termsAcceptedAt?: string; country?: string; kycStatus: "none" | "required" | "pending" | "approved" | "rejected"; amlStatus: "clear" | "review" | "blocked"; createdAt: string };
export type Session = { id: string; userId: string; expiresAt: string; createdAt: string };
export type Wallet = { userId: string; balance: number; locked: number; currency: string; wagered: number; netProfit: number; createdAt: string; updatedAt: string };
export type LedgerEntry = { id: string; userId: string; type: string; amount: number; balanceAfter: number; lockedAfter: number; ref: string; reason?: string; idempotencyKey?: string; createdAt: string };
export type BetRecord = { id: string; userId: string; game: string; wager: number; multiplier: number; payout: number; profit: number; result: "win" | "loss" | "push" | "cashout"; detail: string; nonce: number; clientSeed: string; serverSeedHash: string; params?: Record<string, unknown>; proof: Record<string, unknown>; idempotencyKey: string; createdAt: string };
export type SeedPair = { serverSeed: string; serverSeedHash: string; clientSeed: string; nonce: number; rotatedAt?: string };
export type GameSession = { id: string; userId: string; game: "mines" | "tower" | "hilo" | "crash" | "blackjack"; status: "active" | "cashed_out" | "busted" | "complete"; wager: number; payout: number; profit: number; nonce: number; clientSeed: string; serverSeedHash: string; state: Record<string, unknown>; params?: Record<string, unknown>; proof: Record<string, unknown>; idempotencyKey: string; createdAt: string; updatedAt: string };
export type Deposit = { id: string; userId: string; amount: number; currency: string; status: "pending" | "confirmed" | "expired" | "underpaid" | "overpaid" | "failed"; provider: "nowpayments"; providerPaymentId?: string; checkoutUrl?: string; creditedLedgerId?: string; raw?: unknown; createdAt: string; updatedAt: string };
export type Withdrawal = { id: string; userId: string; amount: number; currency: string; address: string; status: "pending" | "approved" | "rejected" | "sent"; txHash?: string; reason?: string; lockLedgerId?: string; finalLedgerId?: string; createdAt: string; updatedAt: string };
export type RewardState = { userId: string; lastDailyClaimAt?: string; rakebackAccrued: number; rakebackClaimed: number; rank: string };
export type RiskProfile = { userId: string; ageGateAccepted: boolean; selfExcludedUntil?: string; coolOffUntil?: string; depositLimit: number; lossLimit: number; wagerLimit: number; flags: string[] };
export type CreatorCode = { code: string; ownerUserId: string; disabled: boolean; referredUserIds: string[]; wagered: number; commissionAccrued: number };
export type AuditLog = { id: string; actorUserId: string; action: string; target: string; reason?: string; createdAt: string };
export type IdempotencyEntry = { key: string; scope: string; refId: string; response: unknown; createdAt: string };
export type AppDb = { users: User[]; sessions: Session[]; wallets: Wallet[]; ledgers: LedgerEntry[]; bets: BetRecord[]; gameSessions: GameSession[]; seeds: Record<string, SeedPair>; revealedSeeds: Array<SeedPair & { userId: string }>; deposits: Deposit[]; withdrawals: Withdrawal[]; rewards: RewardState[]; risks: RiskProfile[]; creators: CreatorCode[]; auditLogs: AuditLog[]; idempotency: IdempotencyEntry[] };

const dir = path.join(process.cwd(), ".betranch");
const file = path.join(dir, "db.json");
export const now = () => new Date().toISOString();
export const id = (prefix: string) => `${prefix}_${crypto.randomBytes(6).toString("hex")}`;
export const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function hashPassword(password: string, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256").toString("hex");
  return `${salt}:${hash}`;
}
export function verifyPassword(password: string, stored: string) {
  const [salt] = stored.split(":");
  return hashPassword(password, salt) === stored;
}

function initialDb(): AppDb {
  const createdAt = now();
  const admin: User = { id: "user_admin", email: "admin@betranch.local", passwordHash: hashPassword("ChangeMe123!"), displayName: "ranch_admin", role: "admin", frozen: false, privacyMode: false, termsAcceptedAt: createdAt, country: "MX", kycStatus: "approved", amlStatus: "clear", createdAt };
  const user: User = { id: "user_demo", email: "rancher@betranch.local", passwordHash: hashPassword("ChangeMe123!"), displayName: "rancher_demo", role: "user", frozen: false, privacyMode: false, termsAcceptedAt: createdAt, country: "MX", kycStatus: "approved", amlStatus: "clear", createdAt };
  const seed = createSeedPair("ranch-client-001");
  return { users: [admin, user], sessions: [], wallets: [wallet(admin.id, 5000), wallet(user.id, 1248.42)], ledgers: [seedLedger(admin.id, 5000), seedLedger(user.id, 1248.42)], bets: [], gameSessions: [], seeds: { [admin.id]: createSeedPair("admin-client-001"), [user.id]: seed }, revealedSeeds: [], deposits: [], withdrawals: [], rewards: [reward(admin.id), reward(user.id)], risks: [risk(admin.id), risk(user.id)], creators: [{ code: "RANCH", ownerUserId: admin.id, disabled: false, referredUserIds: [], wagered: 0, commissionAccrued: 0 }], auditLogs: [], idempotency: [] };
}
function wallet(userId: string, balance: number): Wallet { return { userId, balance, locked: 0, currency: "USD", wagered: 0, netProfit: 0, createdAt: now(), updatedAt: now() }; }
function seedLedger(userId: string, amount: number): LedgerEntry { return { id: id("ledger"), userId, type: "deposit_confirmed", amount, balanceAfter: amount, lockedAfter: 0, ref: "seed_balance", reason: "local dev bankroll", createdAt: now() }; }
function reward(userId: string): RewardState { return { userId, rakebackAccrued: 0, rakebackClaimed: 0, rank: "Dust" }; }
function risk(userId: string): RiskProfile { return { userId, ageGateAccepted: true, depositLimit: 500, lossLimit: 250, wagerLimit: 1000, flags: [] }; }

function ensureDir() { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }
export function readDb(): AppDb { ensureDir(); if (!fs.existsSync(file)) writeDb(initialDb()); return JSON.parse(fs.readFileSync(file, "utf8")) as AppDb; }
export function writeDb(db: AppDb) { ensureDir(); const tmp = `${file}.${process.pid}.tmp`; fs.writeFileSync(tmp, JSON.stringify(db, null, 2)); fs.renameSync(tmp, file); }
export function transact<T>(fn: (db: AppDb) => T): T { const db = readDb(); const result = fn(db); writeDb(db); return result; }
export function resetLocalDb() { writeDb(initialDb()); }
