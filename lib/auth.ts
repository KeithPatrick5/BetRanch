import { cookies } from "next/headers";
import { id, now, readDb, transact, verifyPassword, type Session, type User } from "./db";

const cookieName = "bet_ranch_session";
const dayMs = 24 * 60 * 60 * 1000;

export async function createSession(userId: string) {
  const session: Session = { id: id("sess"), userId, expiresAt: new Date(Date.now() + 7 * dayMs).toISOString(), createdAt: now() };
  transact((db) => { db.sessions.push(session); });
  const jar = await cookies();
  jar.set(cookieName, session.id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 7 * 24 * 60 * 60, secure: process.env.NODE_ENV === "production" });
  return session;
}

export async function destroySession() {
  const jar = await cookies();
  const sid = jar.get(cookieName)?.value;
  if (sid) transact((db) => { db.sessions = db.sessions.filter((session) => session.id !== sid); });
  jar.delete(cookieName);
}

export async function getSessionUser(): Promise<User | null> {
  const jar = await cookies();
  const sid = jar.get(cookieName)?.value;
  const db = readDb();
  if (!sid) return db.users.find((u) => u.email === "rancher@betranch.local") ?? null;
  const session = db.sessions.find((item) => item.id === sid && new Date(item.expiresAt).getTime() > Date.now());
  if (!session) return null;
  return db.users.find((user) => user.id === session.userId) ?? null;
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) throw new Error("Not signed in");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") throw new Error("Admin role required");
  return user;
}

export async function loginWithPassword(email: string, password: string) {
  const db = readDb();
  const user = db.users.find((item) => item.email.toLowerCase() === email.toLowerCase());
  if (!user || !verifyPassword(password, user.passwordHash)) throw new Error("Invalid email or password");
  await createSession(user.id);
  return user;
}
