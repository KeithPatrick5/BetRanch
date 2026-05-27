"use client";

import { useEffect, useState } from "react";
import { formatMoney, gameCatalog } from "@/lib/catalog";

type Summary = {
  users: Array<{ id: string; email: string; displayName: string; role: string; frozen: boolean }>;
  wallets: Array<{ userId: string; balance: number; locked: number; wagered: number; netProfit: number }>;
  deposits: Array<{ id: string; amount: number; currency: string; status: string }>;
  withdrawals: Array<{ id: string; userId: string; amount: number; currency: string; address: string; status: string }>;
  creators: Array<{ code: string; referredUserIds: string[]; commissionAccrued: number; disabled: boolean }>;
  auditLogs: Array<{ id: string; action: string; target: string; reason?: string; createdAt: string }>;
  totals: { users: number; bets: number; deposits: number; withdrawals: number; volume: number };
};

export default function AdminPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [message, setMessage] = useState("Loading control room...");

  async function load() {
    const check = await fetch("/api/admin/check", { cache: "no-store" });
    if (!check.ok) throw new Error("Admin access required");
    const response = await fetch("/api/admin/summary", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Admin failed");
    setSummary(data);
    setMessage("Ready");
  }
  useEffect(() => { load().catch((error) => setMessage(error.message)); }, []);

  async function decide(withdrawalId: string, decision: "approved" | "rejected" | "sent") {
    const txHash = decision === "sent" ? prompt("TX hash") || "" : undefined;
    const reason = prompt("Reason") || decision;
    const response = await fetch("/api/admin/withdrawals", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ withdrawalId, decision, reason, txHash }) });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error || "Decision failed");
    await load();
  }

  if (!summary) {
    return <main className="admin-page"><a className="btn" href="/">← Lobby</a><section className="card"><h1>Control room</h1><p>{message}</p><p className="muted-copy">Admin account: admin@betranch.local / ChangeMe123!</p></section></main>;
  }

  const openWithdrawals = summary.withdrawals.filter((item) => item.status === "pending" || item.status === "approved");
  const houseProfit = summary.wallets.reduce((sum, wallet) => sum - wallet.netProfit, 0);

  return (
    <main className="admin-page">
      <a className="btn" href="/">← Lobby</a>
      <section className="hero compact-hero">
        <div><div className="eyebrow">Control room</div><h1>Casino ops without the clutter.</h1><p>Ledger review, withdrawal holds, payment exceptions, risk flags, seed checks, game RTP, and creator controls.</p></div>
        <div className="stats">
          <div className="stat"><div className="label">Users</div><strong>{summary.totals.users}</strong></div>
          <div className="stat"><div className="label">Open Holds</div><strong>{openWithdrawals.length}</strong></div>
          <div className="stat"><div className="label">Wagered</div><strong>{formatMoney(summary.totals.volume)}</strong></div>
          <div className="stat"><div className="label">House</div><strong className={houseProfit >= 0 ? "win" : "loss"}>{formatMoney(houseProfit)}</strong></div>
        </div>
      </section>
      <section className="grid">
        <div className="card"><div className="card-title"><h2>Withdrawal Queue</h2><span className="label">manual approval</span></div>{openWithdrawals.length === 0 && <div className="notice">No pending withdrawals.</div>}{openWithdrawals.map((item) => <div className="wallet-row" key={item.id}><div><strong>{item.id}</strong><div className="label">{item.currency} · {item.address.slice(0, 18)}...</div></div><strong>{formatMoney(item.amount)} · {item.status}</strong><div className="mini-actions"><button onClick={() => decide(item.id, "approved")}>Approve</button><button onClick={() => decide(item.id, "rejected")}>Reject</button><button onClick={() => decide(item.id, "sent")}>Sent</button></div></div>)}</div>
        <div className="card"><div className="card-title"><h2>Deposits</h2><span className="label">NOWPayments</span></div>{summary.deposits.length === 0 && <div className="notice">No deposit invoices yet.</div>}{summary.deposits.map((item) => <div className="wallet-row" key={item.id}><div><strong>{item.id}</strong><div className="label">{item.currency} · {item.status}</div></div><strong>{formatMoney(item.amount)}</strong></div>)}</div>
      </section>
      <section className="grid">
        <div className="card"><div className="card-title"><h2>Game RTP</h2><span className="label">configured edge</span></div>{gameCatalog.map((game) => <div className="wallet-row" key={game.key}><div><strong>{game.name}</strong><div className="label">Edge {game.edge}</div></div><strong>{game.edge}</strong></div>)}</div>
        <div className="card"><div className="card-title"><h2>Users</h2><span className="label">roles and flags</span></div>{summary.users.map((user) => <div className="wallet-row" key={user.id}><div><strong>{user.displayName}</strong><div className="label">{user.email} · {user.role}</div></div><strong>{user.frozen ? "Frozen" : "Clear"}</strong></div>)}</div>
      </section>
      <section className="card"><div className="card-title"><h2>Creator Codes</h2><span className="label">attribution</span></div>{summary.creators.map((creator) => <div className="wallet-row" key={creator.code}><div><strong>{creator.code}</strong><div className="label">{creator.referredUserIds.length} users referred</div></div><strong>{formatMoney(creator.commissionAccrued)}</strong></div>)}</section>
      <section className="card"><div className="card-title"><h2>Audit Log</h2><span className="label">last actions</span></div>{summary.auditLogs.length === 0 && <div className="notice">No admin actions logged yet.</div>}{summary.auditLogs.map((log) => <div className="wallet-row" key={log.id}><div><strong>{log.action}</strong><div className="label">{log.target} {log.reason ? `· ${log.reason}` : ""}</div></div><span>{new Date(log.createdAt).toLocaleString()}</span></div>)}</section>
    </main>
  );
}
