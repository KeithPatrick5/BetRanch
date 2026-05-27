import { NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { hashPassword, id, now, transact } from "@/lib/db";
import { publicState } from "@/lib/store";
import { createSeedPair } from "@/lib/fairness";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!email.includes("@")) throw new Error("Valid email required");
    if (password.length < 8) throw new Error("Password must be at least 8 characters");
    const user = transact((db) => {
      if (db.users.some((u) => u.email.toLowerCase() === email)) throw new Error("Email already exists");
      const user = { id: id("user"), email, passwordHash: hashPassword(password), displayName: String(body.displayName || email.split("@")[0]).slice(0, 24), role: "user" as const, frozen: false, privacyMode: false, termsAcceptedAt: now(), country: "MX", kycStatus: "approved" as const, amlStatus: "clear" as const, createdAt: now() };
      db.users.push(user);
      db.wallets.push({ userId: user.id, balance: 25, locked: 0, currency: "USD", wagered: 0, netProfit: 0, createdAt: now(), updatedAt: now() });
      db.ledgers.unshift({ id: id("ledger"), userId: user.id, type: "bonus_credit", amount: 25, balanceAfter: 25, lockedAfter: 0, ref: "signup_bonus", reason: "local launch credit", createdAt: now() });
      db.rewards.push({ userId: user.id, rakebackAccrued: 0, rakebackClaimed: 0, rank: "Dust" });
      db.risks.push({ userId: user.id, ageGateAccepted: true, depositLimit: 500, lossLimit: 250, wagerLimit: 1000, flags: [] });
      db.seeds[user.id] = createSeedPair("ranch-client-001");
      return user;
    });
    await createSession(user.id);
    return NextResponse.json({ state: publicState(user.id) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Signup failed" }, { status: 400 });
  }
}
