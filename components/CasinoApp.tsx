"use client";

import { useEffect, useMemo, useState } from "react";
import { formatMoney, gameCatalog, rankLadder, roundMoney, type GameKey } from "@/lib/catalog";

type ApiBet = {
  id: string;
  game: GameKey;
  wager: number;
  multiplier: number;
  payout: number;
  profit: number;
  result: "win" | "loss" | "push" | "cashout";
  detail: string;
  nonce: number;
  clientSeed: string;
  serverSeedHash: string;
  createdAt: string;
  proof?: Record<string, unknown>;
};

type ApiLedger = { id: string; type: string; amount: number; balanceAfter: number; lockedAfter: number; ref: string; createdAt: string };
type ApiState = {
  user: { displayName: string; privacyMode: boolean; frozen: boolean };
  wallet: { balance: number; locked: number; wagered: number; netProfit: number };
  reward: { rank: string; rakebackAccrued: number; rakebackClaimed: number; lastDailyClaimAt?: string };
  seed: { serverSeedHash: string; clientSeed: string; nonce: number };
  bets: ApiBet[];
  ledger: ApiLedger[];
  deposits: Array<{ id: string; amount: number; status: string; currency: string; checkoutUrl?: string }>;
  withdrawals: Array<{ id: string; amount: number; status: string; currency: string; address: string }>;
};

const defaultState: ApiState = {
  user: { displayName: "rancher_demo", privacyMode: false, frozen: false },
  wallet: { balance: 0, locked: 0, wagered: 0, netProfit: 0 },
  reward: { rank: "Dust", rakebackAccrued: 0, rakebackClaimed: 0 },
  seed: { serverSeedHash: "loading", clientSeed: "ranch-client-001", nonce: 0 },
  bets: [],
  ledger: [],
  deposits: [],
  withdrawals: [],
};

const icons: Record<GameKey, string> = {
  dice: "◆◆",
  limbo: "∞x",
  mines: "✦",
  plinko: "●",
  wheel: "◉",
  keno: "7",
  hilo: "A↑",
  tower: "▴",
  crash: "↗",
  blackjack: "A♠",
  rps: "✊",
  war: "K♣",
};

const accents: Record<GameKey, string> = {
  dice: "tile-pink",
  limbo: "tile-gold",
  mines: "tile-green",
  plinko: "tile-purple",
  wheel: "tile-rose",
  keno: "tile-blue",
  hilo: "tile-orange",
  tower: "tile-violet",
  crash: "tile-red",
  blackjack: "tile-white",
  rps: "tile-cyan",
  war: "tile-smoke",
};

function gameName(key: GameKey) {
  return gameCatalog.find((game) => game.key === key)?.name || key;
}

function safeJson(value: unknown) {
  try { return JSON.stringify(value, null, 2); } catch { return "{}"; }
}

export function CasinoApp() {
  const [state, setState] = useState<ApiState>(defaultState);
  const [activeGame, setActiveGame] = useState<GameKey>("mines");
  const [wager, setWager] = useState(10);
  const [clientSeed, setClientSeed] = useState("ranch-client-001");
  const [message, setMessage] = useState("Loading ranch wallet...");
  const [busy, setBusy] = useState(false);
  const [selectedKeno, setSelectedKeno] = useState<number[]>([1, 7, 13, 21, 33]);
  const [depositAmount, setDepositAmount] = useState(25);
  const [withdrawAmount, setWithdrawAmount] = useState(10);
  const [withdrawAddress, setWithdrawAddress] = useState("bc1qexamplemanualreviewaddress0000000000000");
  const [loginEmail, setLoginEmail] = useState("rancher@betranch.local");
  const [loginPassword, setLoginPassword] = useState("ChangeMe123!");

  const active = gameCatalog.find((game) => game.key === activeGame) ?? gameCatalog[0];
  const availableBalance = roundMoney(state.wallet.balance - state.wallet.locked);
  const rankProgress = Math.min(100, Math.round(((state.wallet.wagered % 500) / 500) * 100));
  const latestBet = state.bets[0];
  const liveBets = state.bets.length ? state.bets : sampleBets;
  const claimableRakeback = useMemo(() => roundMoney(state.reward.rakebackAccrued - state.reward.rakebackClaimed), [state.reward]);

  async function refresh() {
    const response = await fetch("/api/me", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to load account");
    setState(data);
    setClientSeed(data.seed.clientSeed);
    setMessage("Ready");
  }

  useEffect(() => { refresh().catch((error) => setMessage(error.message)); }, []);

  async function login(path = "/api/auth/login") {
    try {
      const response = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: loginEmail, password: loginPassword, displayName: loginEmail.split("@")[0] }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Login failed");
      if (data.state) setState(data.state);
      setMessage("Ready");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Login failed"); }
  }

  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); setMessage("Not signed in"); }

  async function postJson(path: string, body?: Record<string, unknown>) {
    setBusy(true);
    try {
      const response = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body ?? {}) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Request failed");
      if (data.state) setState(data.state);
      return data;
    } finally { setBusy(false); }
  }

  function paramsForGame(): Record<string, unknown> {
    if (activeGame === "dice") return { target: 50.5, direction: "under" };
    if (activeGame === "limbo") return { target: 2 };
    if (activeGame === "mines") return { mineCount: 3, picks: 4 };
    if (activeGame === "plinko") return { risk: "medium" };
    if (activeGame === "keno") return { picks: selectedKeno };
    if (activeGame === "hilo") return { choice: "higher" };
    if (activeGame === "tower") return { rows: 4 };
    if (activeGame === "crash") return { autoCashout: 2 };
    if (activeGame === "blackjack") return { action: "stand" };
    if (activeGame === "rps") return { pick: "rock" };
    return {};
  }

  async function play() {
    try {
      const data = await postJson("/api/bet", { game: activeGame, wager, params: paramsForGame(), idempotencyKey: `${activeGame}-${Date.now()}-${Math.random()}` });
      const bet = data.bet as ApiBet;
      setMessage(`${gameName(bet.game)}: ${bet.detail}. ${bet.profit >= 0 ? "+" : ""}${formatMoney(bet.profit)}`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Bet failed"); }
  }

  async function rotateSeed() {
    try { const data = await postJson("/api/fairness/rotate", { clientSeed }); setMessage(`Seed rotated. New hash ${data.rotation.next.serverSeedHash.slice(0, 12)}...`); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Seed rotation failed"); }
  }

  async function createDeposit() {
    try { const data = await postJson("/api/wallet/deposit", { amount: depositAmount, currency: "btc" }); setMessage(`Deposit invoice ${data.deposit.id} is ${data.deposit.status}.`); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Deposit failed"); }
  }

  async function requestWithdrawal() {
    try { const data = await postJson("/api/wallet/withdraw", { amount: withdrawAmount, currency: "btc", address: withdrawAddress }); setMessage(`Withdrawal ${data.withdrawal.id} queued for manual review.`); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Withdrawal failed"); }
  }

  async function claimDaily() { try { await postJson("/api/rewards/daily"); setMessage("Daily bonus claimed."); } catch (error) { setMessage(error instanceof Error ? error.message : "Daily claim failed"); } }
  async function claimRakeback() { try { await postJson("/api/rewards/rakeback"); setMessage("Rakeback claimed."); } catch (error) { setMessage(error instanceof Error ? error.message : "Rakeback failed"); } }

  if (message === "Not signed in") {
    return <div className="login-wrap"><div className="login-card casino-auth"><div className="brand login-brand"><div className="mark">BR</div><span>Bet Ranch</span></div><h1>Sign in</h1><p>Original games, live bets, rewards, and verified results.</p><input value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} placeholder="Email" /><input value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} placeholder="Password" type="password" /><button className="btn primary" onClick={() => login()}>Sign in</button><button className="btn" onClick={() => login("/api/auth/signup")}>Create account</button><div className="label">Local dev account: rancher@betranch.local / ChangeMe123!</div></div></div>;
  }

  return (
    <div className="casino-shell">
      <aside className="casino-rail">
        <div className="brand rail-brand"><div className="mark">BR</div><span>Bet Ranch</span></div>
        <nav className="rail-nav">
          <a className="active" href="#lobby">Lobby</a><a href="#play">Originals</a><a href="#wallet">Wallet</a><a href="#live">Live</a><a href="#rewards">Rewards</a><a href="#fair">Fairness</a><a href="/admin">Admin</a>
        </nav>
        <div className="rail-wallet"><span>Balance</span><strong>{formatMoney(availableBalance)}</strong><button onClick={createDeposit} disabled={busy}>Deposit</button></div>
        <div className="rail-rank"><div><span>{state.reward.rank}</span><strong>{rankProgress}%</strong></div><div className="rank-bar"><i style={{ width: `${rankProgress}%` }} /></div></div>
      </aside>

      <main className="casino-main">
        <header className="casino-topbar">
          <div className="search-wrap"><span>⌕</span><input placeholder="Search originals" /></div>
          <div className="top-actions"><button className="top-wallet" onClick={createDeposit}>{formatMoney(availableBalance)}<b>Deposit</b></button><button className="profile-pill" onClick={logout}>{state.user.displayName}</button></div>
        </header>

        <section className="casino-hero" id="lobby">
          <div className="hero-copy"><div className="eyebrow">Bet Ranch Originals</div><h1>Fast originals. Clean wallet. Pink heat.</h1><p>Dice, Mines, Plinko, Limbo, Wheel, Keno, Hilo, Tower, Crash, Blackjack, RPS, and War in one stripped-down crypto arcade.</p><div className="hero-actions"><a href="#play" className="btn primary">Play originals</a><a href="#wallet" className="btn ghost">Wallet</a></div></div>
          <div className="hero-machine"><div className="machine-top"><span>Hot now</span><strong>Mines</strong></div><div className="mini-mines">{Array.from({ length: 25 }, (_, i) => <i key={i}>{[1, 6, 18].includes(i) ? "✦" : ""}</i>)}</div><div className="machine-foot"><span>Cashout</span><strong>2.41x</strong></div></div>
        </section>

        <section className="casino-strip"><div><span>Live wins</span><strong>{formatMoney(liveBets[0]?.payout ?? 127.2)}</strong></div><div><span>High roller</span><strong>{formatMoney(Math.max(...liveBets.map((bet) => bet.wager), 50))}</strong></div><div><span>Rakeback</span><strong>{formatMoney(claimableRakeback)}</strong></div><div><span>Nonce</span><strong>{state.seed.nonce}</strong></div></section>

        <section className="lobby-card">
          <div className="section-head"><h2>Originals</h2><div className="tabs"><span className="active">All</span><span>Hot</span><span>New</span><span>Cards</span></div></div>
          <div className="game-lobby-grid">{gameCatalog.map((game, index) => <button className={`casino-tile ${accents[game.key]} ${activeGame === game.key ? "selected" : ""}`} key={game.key} onClick={() => setActiveGame(game.key)}><div className="tile-glow" /><div className="tile-icon">{icons[game.key]}</div><div className="tile-meta"><strong>{game.name}</strong><span>{900 + index * 37} playing</span></div><small>{game.edge}</small></button>)}</div>
        </section>

        <section className="play-machine" id="play">
          <div className="machine-stage-panel">
            <div className="stage-header"><div><span>{active.risk} risk</span><h2>{active.name}</h2></div><button className="fair-chip" onClick={rotateSeed}>Provably fair</button></div>
            <div className={`visual-stage stage-${activeGame}`}>{renderGameVisual(activeGame, selectedKeno, setSelectedKeno, latestBet)}</div>
            <div className="machine-status"><span>{busy ? "Settling..." : message}</span><b>{latestBet ? `${latestBet.multiplier.toFixed(2)}x` : active.edge}</b></div>
            {latestBet?.proof && <pre className="proof-card">{safeJson(latestBet.proof)}</pre>}
          </div>

          <aside className="bet-panel">
            <div className="bet-tabs"><button className="active">Manual</button><button>Auto</button></div>
            <label>Bet amount</label>
            <div className="amount-box"><input value={wager} type="number" min="0" step="0.01" onChange={(event) => setWager(Number(event.target.value))} /><span>USD</span></div>
            <div className="quick-row"><button onClick={() => setWager(roundMoney(Math.max(0.1, wager / 2)))}>1/2</button><button onClick={() => setWager(roundMoney(wager * 2))}>2x</button><button onClick={() => setWager(10)}>$10</button><button onClick={() => setWager(Math.max(0.1, Math.floor(availableBalance)))}>Max</button></div>
            <GameControls game={activeGame} selectedKeno={selectedKeno} setSelectedKeno={setSelectedKeno} />
            <button className="bet-now" onClick={play} disabled={busy}>{activeGame === "mines" || activeGame === "tower" ? "Start Game" : `Bet ${formatMoney(wager)}`}</button>
            <div className="seed-mini"><span>Client seed</span><input value={clientSeed} onChange={(event) => setClientSeed(event.target.value)} /></div>
            <div className="balance-mini"><span>Available</span><strong>{formatMoney(availableBalance)}</strong></div>
          </aside>
        </section>

        <section className="data-grid">
          <div className="casino-panel" id="live"><div className="section-head"><h2>Live bets</h2><span className="muted">Across the ranch</span></div><div className="table-wrap"><table><thead><tr><th>User</th><th>Game</th><th>Bet</th><th>Multi</th><th>Payout</th></tr></thead><tbody>{liveBets.map((bet) => <tr key={bet.id}><td>rancher_{bet.id.slice(-4)}</td><td>{gameName(bet.game)}</td><td>{formatMoney(bet.wager)}</td><td className={bet.result === "loss" ? "loss" : "win"}>{bet.multiplier.toFixed(2)}x</td><td className={bet.result === "loss" ? "loss" : "win"}>{formatMoney(bet.payout)}</td></tr>)}</tbody></table></div></div>
          <div className="casino-panel" id="rewards"><div className="section-head"><h2>Rewards</h2><span className="muted">Ranked play</span></div><div className="reward-ring"><strong>{state.reward.rank}</strong><span>{rankProgress}% to next rank</span></div><button className="btn primary wide" onClick={claimDaily} disabled={busy}>Daily $2.50</button><button className="btn wide" onClick={claimRakeback} disabled={busy}>Claim {formatMoney(claimableRakeback)}</button></div>
        </section>

        <section className="data-grid">
          <div className="casino-panel" id="wallet"><div className="section-head"><h2>Wallet</h2><span className="muted">Ledger-backed</span></div><div className="wallet-controls"><input type="number" value={depositAmount} onChange={(event) => setDepositAmount(Number(event.target.value))} /><button className="btn primary" onClick={createDeposit} disabled={busy}>Deposit</button><input type="number" value={withdrawAmount} onChange={(event) => setWithdrawAmount(Number(event.target.value))} /><button className="btn" onClick={requestWithdrawal} disabled={busy}>Withdraw</button></div><input className="address-input" value={withdrawAddress} onChange={(event) => setWithdrawAddress(event.target.value)} /><div className="wallet-summary"><span>Locked {formatMoney(state.wallet.locked)}</span><b>Available {formatMoney(availableBalance)}</b></div></div>
          <div className="casino-panel" id="fair"><div className="section-head"><h2>Fairness</h2><button className="btn compact" onClick={rotateSeed} disabled={busy}>Rotate</button></div><div className="fair-lines"><p><span>Hash</span><b>{state.seed.serverSeedHash}</b></p><p><span>Client</span><b>{state.seed.clientSeed}</b></p><p><span>Nonce</span><b>{state.seed.nonce}</b></p></div></div>
        </section>
      </main>

      <nav className="mobilebar"><a className="active" href="#lobby">Lobby</a><a href="#play">Play</a><a href="#wallet">Wallet</a><a href="#live">Live</a><a href="#rewards">Rewards</a></nav>
    </div>
  );
}

function GameControls({ game, selectedKeno, setSelectedKeno }: { game: GameKey; selectedKeno: number[]; setSelectedKeno: (numbers: number[]) => void }) {
  if (game === "dice") return <div className="control-pack"><div className="dice-slider"><i style={{ left: "50%" }} /></div><div className="control-stats"><span>Roll under 50.50</span><b>1.98x</b></div></div>;
  if (game === "limbo") return <div className="control-pack"><label>Target multiplier</label><div className="amount-box"><input value="2.00" readOnly /><span>x</span></div></div>;
  if (game === "mines") return <div className="control-pack"><label>Mines</label><div className="segmented"><button>3</button><button className="active">5</button><button>10</button><button>15</button></div></div>;
  if (game === "plinko") return <div className="control-pack"><label>Risk</label><div className="segmented"><button>Low</button><button className="active">Med</button><button>High</button></div></div>;
  if (game === "keno") return <div className="control-pack"><label>Picks</label><span className="muted">{selectedKeno.length}/10 selected</span></div>;
  if (game === "hilo") return <div className="control-pack"><label>Next card</label><div className="segmented"><button>Lower</button><button className="active">Higher</button></div></div>;
  if (game === "crash") return <div className="control-pack"><label>Auto cashout</label><div className="amount-box"><input value="2.00" readOnly /><span>x</span></div></div>;
  return <div className="control-pack"><label>Mode</label><div className="segmented"><button className="active">Classic</button><button>Fast</button></div></div>;
}

function renderGameVisual(game: GameKey, selectedKeno: number[], setSelectedKeno: (numbers: number[]) => void, latestBet?: ApiBet) {
  if (game === "mines") return <div className="mines-machine">{Array.from({ length: 25 }, (_, i) => { const picked = Array.isArray(latestBet?.proof?.selected) && (latestBet?.proof?.selected as number[]).includes(i); return <button key={i} className={picked ? "revealed" : ""}>{picked ? "✦" : ""}</button>; })}</div>;
  if (game === "plinko") return <div className="plinko-machine"><div className="peg-board">{Array.from({ length: 91 }, (_, i) => <i key={i} className={i % 13 === 0 ? "hot" : ""} />)}</div><div className="plinko-buckets">{[0.2, 0.5, 1, 2, 5, 12, 25].map((x) => <span key={x}>{x}x</span>)}</div></div>;
  if (game === "wheel") return <div className="wheel-machine"><div className="pointer" /><div className="wheel-core"><strong>{latestBet?.game === "wheel" ? `${latestBet.multiplier.toFixed(2)}x` : "20x"}</strong></div></div>;
  if (game === "keno") return <div className="keno-machine">{Array.from({ length: 40 }, (_, i) => { const n = i + 1; const active = selectedKeno.includes(n); return <button key={n} className={active ? "keno-picked" : ""} onClick={() => setSelectedKeno(active ? selectedKeno.filter((x) => x !== n) : selectedKeno.length < 10 ? [...selectedKeno, n] : selectedKeno)}>{n}</button>; })}</div>;
  if (game === "hilo") return <div className="hilo-machine"><div className="card back">?</div><div className="ladder"><span>1.21x</span><span>1.54x</span><span>2.10x</span><span>3.62x</span></div><div className="card face">A♠</div></div>;
  if (game === "blackjack") return <div className="table-machine"><div className="dealer"><span>Dealer</span><div className="cards"><i>?</i><i>K♥</i></div></div><div className="felt-logo">21</div><div className="dealer"><span>You</span><div className="cards"><i>A♠</i><i>Q♣</i></div></div></div>;
  if (game === "tower") return <div className="tower-machine">{Array.from({ length: 7 }, (_, row) => <div key={row}>{Array.from({ length: 3 }, (_, col) => <button key={col}>{row === 6 && col === 1 ? "✦" : ""}</button>)}</div>)}</div>;
  if (game === "crash") return <div className="crash-machine"><svg viewBox="0 0 500 260" role="img"><path d="M20 220 C120 215 190 190 260 145 S385 52 470 30" /><circle cx="410" cy="64" r="10" /></svg><strong>{latestBet?.game === "crash" ? `${latestBet.multiplier.toFixed(2)}x` : "2.00x"}</strong></div>;
  if (game === "rps") return <div className="rps-machine"><button>✊</button><button>✋</button><button>✌</button></div>;
  if (game === "war") return <div className="war-machine"><div className="card face">K♣</div><strong>VS</strong><div className="card face">8♦</div></div>;
  if (game === "limbo") return <div className="limbo-machine"><span>Target</span><strong>{latestBet?.game === "limbo" ? `${latestBet.multiplier.toFixed(2)}x` : "2.00x"}</strong><i>RANCH LIMBO</i></div>;
  return <div className="dice-machine"><div className="dice-number">{latestBet?.game === "dice" ? latestBet.detail.match(/[0-9.]+/)?.[0] ?? "50.50" : "50.50"}</div><div className="dice-track"><i style={{ left: "50%" }} /></div><span>Roll under</span></div>;
}

const sampleBets: ApiBet[] = [
  { id: "sample_1001", game: "mines", wager: 18, multiplier: 2.41, payout: 43.38, profit: 25.38, result: "win", detail: "Cashed out", nonce: 1, clientSeed: "sample", serverSeedHash: "sample", createdAt: new Date().toISOString() },
  { id: "sample_1002", game: "plinko", wager: 12, multiplier: 5, payout: 60, profit: 48, result: "win", detail: "5x bucket", nonce: 2, clientSeed: "sample", serverSeedHash: "sample", createdAt: new Date().toISOString() },
  { id: "sample_1003", game: "limbo", wager: 25, multiplier: 0, payout: 0, profit: -25, result: "loss", detail: "Bust", nonce: 3, clientSeed: "sample", serverSeedHash: "sample", createdAt: new Date().toISOString() },
  { id: "sample_1004", game: "wheel", wager: 8, multiplier: 12, payout: 96, profit: 88, result: "win", detail: "12x", nonce: 4, clientSeed: "sample", serverSeedHash: "sample", createdAt: new Date().toISOString() },
];
