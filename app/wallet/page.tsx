export default function WalletPage() {
  return (
    <main className="admin-page">
      <a className="btn" href="/">← Lobby</a>
      <section className="grid">
        <div className="card">
          <div className="card-title"><h2>Deposit</h2><span className="label">Crypto invoice</span></div>
          <p className="muted-copy">Choose an amount, pay the invoice, and your balance updates after confirmation.</p>
          <a className="btn primary" href="/#wallet">Open Wallet</a>
        </div>
        <div className="card">
          <div className="card-title"><h2>Withdraw</h2><span className="label">Manual review</span></div>
          <p className="muted-copy">Submit a withdrawal request, keep the balance locked, and track the status from your wallet.</p>
          <a className="btn" href="/#wallet">Request Withdrawal</a>
        </div>
      </section>
    </main>
  );
}
