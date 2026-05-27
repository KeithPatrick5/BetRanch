export default function FairnessPage() {
  return (
    <main className="admin-page">
      <a className="btn" href="/">← Lobby</a>
      <section className="card doc-card">
        <div className="card-title"><h2>Provably Fair</h2><span className="label">server seed · client seed · nonce</span></div>
        <p>Each bet uses a committed server seed hash, a player client seed, and a nonce. After seed rotation, the old server seed can be revealed and checked against the original hash.</p>
        <div className="code-panel">HMAC_SHA256(serverSeed, clientSeed:nonce:cursor)</div>
        <p>Game outcomes use the shared fairness engine. Dice, Limbo, Mines, Plinko, Wheel, Keno, Hilo, Tower, Crash, Blackjack, RPS, and War all derive results from the same seed model.</p>
      </section>
    </main>
  );
}
