"use client";

import { useEffect, useMemo, useState } from "react";
import { formatMoney, gameCatalog, roundMoney, type GameKey } from "@/lib/catalog";

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
type ApiSession = {
  id: string;
  game: "mines" | "tower" | "hilo" | "crash" | "blackjack";
  status: "active" | "cashed_out" | "busted" | "complete";
  wager: number;
  payout: number;
  profit: number;
  state: Record<string, unknown>;
  proof?: Record<string, unknown>;
};
type ApiState = {
  user: { displayName: string; privacyMode: boolean; frozen: boolean };
  wallet: { balance: number; locked: number; wagered: number; netProfit: number };
  reward: { rank: string; rakebackAccrued: number; rakebackClaimed: number; lastDailyClaimAt?: string };
  seed: { serverSeedHash: string; clientSeed: string; nonce: number };
  bets: ApiBet[];
  ledger: ApiLedger[];
  deposits: Array<{ id: string; amount: number; status: string; currency: string; checkoutUrl?: string }>;
  withdrawals: Array<{ id: string; amount: number; status: string; currency: string; address: string }>;
  activeSessions: ApiSession[];
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
  activeSessions: [],
};

const thumbnails: Record<GameKey, string> = {
  dice: "/game-thumbnails/dice.png",
  limbo: "/game-thumbnails/limbo.png",
  mines: "/game-thumbnails/mines.png",
  plinko: "/game-thumbnails/plinko.png",
  wheel: "/game-thumbnails/wheel.png",
  keno: "/game-thumbnails/keno.png",
  hilo: "/game-thumbnails/hilo.png",
  tower: "/game-thumbnails/tower.png",
  crash: "/game-thumbnails/crash.png",
  blackjack: "/game-thumbnails/blackjack.png",
  rps: "/game-thumbnails/rps.png",
  war: "/game-thumbnails/war.png",
};

const sessionGames = new Set<GameKey>(["mines", "tower", "hilo", "blackjack"]);

const shortGameNames: Partial<Record<GameKey, string>> = {
  blackjack: "Blackjack",
  rps: "RPS",
};

function gameName(key: GameKey) {
  return shortGameNames[key] || gameCatalog.find((game) => game.key === key)?.name || key;
}

function safeJson(value: unknown) {
  try { return JSON.stringify(value, null, 2); } catch { return "{}"; }
}

function numbers(value: unknown): number[] {
  return Array.isArray(value) ? value.map(Number).filter(Number.isFinite) : [];
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}
function cardLabel(value: unknown) {
  if (typeof value === "string") return value;
  const card = Number(value);
  if (!Number.isInteger(card) || card < 0) return "?";
  const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const suits = ["♠", "♥", "♦", "♣"];
  return `${ranks[card % 13]}${suits[Math.floor(card / 13)] || "♠"}`;
}

function numberFromProof(proof: Record<string, unknown> | undefined, key: string) {
  const value = Number(proof?.[key]);
  return Number.isFinite(value) ? value : undefined;
}


export function CasinoApp() {
  const [state, setState] = useState<ApiState>(defaultState);
  const [activeGame, setActiveGame] = useState<GameKey>("mines");
  const [lastSession, setLastSession] = useState<ApiSession | undefined>();
  const [wager, setWager] = useState(10);
  const [clientSeed, setClientSeed] = useState("ranch-client-001");
  const [message, setMessage] = useState("Loading wallet...");
  const [busy, setBusy] = useState(false);
  const [selectedKeno, setSelectedKeno] = useState<number[]>([1, 7, 13, 21, 33]);
  const [diceTarget, setDiceTarget] = useState(50.5);
  const [diceDirection, setDiceDirection] = useState<"under" | "over">("under");
  const [limboTarget, setLimboTarget] = useState(2);
  const [mineCount, setMineCount] = useState(5);
  const [plinkoRisk, setPlinkoRisk] = useState<"low" | "medium" | "high">("medium");
  const [towerRows, setTowerRows] = useState(6);
  const [hiloChoice, setHiloChoice] = useState<"higher" | "lower">("higher");
  const [crashAutoCashout, setCrashAutoCashout] = useState(2);
  const [rpsPick, setRpsPick] = useState<"rock" | "paper" | "scissors">("rock");
  const [depositAmount, setDepositAmount] = useState(25);
  const [withdrawAmount, setWithdrawAmount] = useState(10);
  const [withdrawAddress, setWithdrawAddress] = useState("bc1qexamplemanualreviewaddress0000000000000");
  const [loginEmail, setLoginEmail] = useState("rancher@betranch.local");
  const [loginPassword, setLoginPassword] = useState("ChangeMe123!");

  const active = gameCatalog.find((game) => game.key === activeGame) ?? gameCatalog[0];
  const activeSession = state.activeSessions.find((session) => session.game === activeGame);
  const displayedSession = activeSession || (lastSession?.game === activeGame ? lastSession : undefined);
  const activeProof = latestBet?.game === activeGame ? latestBet.proof : undefined;
  const latestDeposit = state.deposits[0];
  const latestWithdrawal = state.withdrawals[0];
  const availableBalance = roundMoney(state.wallet.balance - state.wallet.locked);
  const rankProgress = Math.min(100, Math.round(((state.wallet.wagered % 500) / 500) * 100));
  const latestBet = state.bets[0];
  const liveBets = state.bets.length ? state.bets : sampleBets;
  const claimableRakeback = useMemo(() => roundMoney(state.reward.rakebackAccrued - state.reward.rakebackClaimed), [state.reward]);
  const liveWins = liveBets.filter((bet) => bet.result !== "loss").slice(0, 10);

  async function refresh(nextMessage?: string) {
    const response = await fetch("/api/me", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to load account");
    setState({ ...data, activeSessions: data.activeSessions ?? [] });
    setClientSeed(data.seed.clientSeed);
    setMessage(nextMessage ?? "Ready");
  }

  useEffect(() => { refresh().catch((error) => setMessage(error.message)); }, []);

  async function login(path = "/api/auth/login") {
    try {
      const response = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: loginEmail, password: loginPassword, displayName: loginEmail.split("@")[0] }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Login failed");
      if (data.state) setState({ ...data.state, activeSessions: data.state.activeSessions ?? [] });
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
      if (data.state) setState({ ...data.state, activeSessions: data.state.activeSessions ?? [] });
      return data;
    } finally { setBusy(false); }
  }

  async function postSession(path: string, body?: Record<string, unknown>) {
    const data = await postJson(path, body);
    if (data.session) setLastSession(data.session as ApiSession);
    await refresh();
    return data;
  }

  function paramsForGame(): Record<string, unknown> {
    if (activeGame === "dice") return { target: diceTarget, direction: diceDirection };
    if (activeGame === "limbo") return { target: limboTarget };
    if (activeGame === "plinko") return { risk: plinkoRisk };
    if (activeGame === "keno") return { picks: selectedKeno };
    if (activeGame === "crash") return { autoCashout: crashAutoCashout };
    if (activeGame === "rps") return { pick: rpsPick };
    return {};
  }

  async function play() {
    try {
      if (activeGame === "mines") {
        if (activeSession) return cashoutActiveSession();
        const data = await postSession("/api/games/mines/start", { wager, mineCount });
        setMessage(`Mines started · ${formatMoney(data.session.wager)}`);
        return;
      }
      if (activeGame === "tower") {
        if (activeSession) return cashoutActiveSession();
        const data = await postSession("/api/games/tower/start", { wager, rows: towerRows });
        setMessage(`Tower started · ${formatMoney(data.session.wager)}`);
        return;
      }
      if (activeGame === "hilo") {
        if (activeSession) return cashoutActiveSession();
        const data = await postSession("/api/games/hilo/start", { wager });
        setMessage(`Hilo started · ${formatMoney(data.session.wager)}`);
        return;
      }
      if (activeGame === "blackjack") {
        if (activeSession) return blackjackMove("stand");
        const data = await postSession("/api/games/blackjack/start", { wager });
        setMessage(`Blackjack dealt · ${data.session.status}`);
        return;
      }
      if (activeGame === "crash") {
        const data = await postSession("/api/games/crash/start", { wager, autoCashout: crashAutoCashout });
        setMessage(`Crash ${data.session.status} · ${formatMoney(data.session.profit)}`);
        return;
      }
      const data = await postJson("/api/bet", { game: activeGame, wager, params: paramsForGame(), idempotencyKey: `${activeGame}-${Date.now()}-${Math.random()}` });
      const bet = data.bet as ApiBet;
      setMessage(`${gameName(bet.game)} ${bet.profit >= 0 ? "+" : ""}${formatMoney(bet.profit)} · ${bet.multiplier.toFixed(2)}x`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Bet failed"); }
  }

  async function revealMines(tile: number) {
    if (!activeSession || activeGame !== "mines") return;
    try {
      const data = await postSession("/api/games/mines/reveal", { sessionId: activeSession.id, tile });
      setMessage(data.session.status === "busted" ? "Mine hit" : `Safe tile · cashout ${formatMoney(data.session.payout)}`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Mines reveal failed"); }
  }

  async function pickTower(col: number) {
    if (!activeSession || activeGame !== "tower") return;
    try {
      const data = await postSession("/api/games/tower/pick", { sessionId: activeSession.id, pick: col });
      setMessage(data.session.status === "busted" ? "Trap hit" : `Tower payout ${formatMoney(data.session.payout)}`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Tower pick failed"); }
  }

  async function pickHilo(choice: "higher" | "lower") {
    if (!activeSession || activeGame !== "hilo") return;
    try {
      const data = await postSession("/api/games/hilo/pick", { sessionId: activeSession.id, choice });
      setMessage(data.session.status === "busted" ? "Hilo busted" : `Hilo payout ${formatMoney(data.session.payout)}`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Hilo pick failed"); }
  }

  async function blackjackMove(action: "hit" | "stand" | "double") {
    if (!activeSession || activeGame !== "blackjack") return;
    try {
      const data = await postSession("/api/games/blackjack/action", { sessionId: activeSession.id, action });
      setMessage(`Blackjack ${data.session.status} · ${formatMoney(data.session.profit)}`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Blackjack action failed"); }
  }

  async function cashoutActiveSession() {
    if (!activeSession) return;
    try {
      const data = await postSession("/api/games/session/cashout", { sessionId: activeSession.id });
      setMessage(`${gameName(activeSession.game as GameKey)} cashout · ${formatMoney(data.session.payout)}`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Cashout failed"); }
  }

  async function rotateSeed() {
    try { const data = await postJson("/api/fairness/rotate", { clientSeed }); setMessage(`Seed ${data.rotation.next.serverSeedHash.slice(0, 12)}...`); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Seed rotation failed"); }
  }

  async function createDeposit() {
    try {
      const data = await postJson("/api/wallet/deposit", { amount: depositAmount, currency: "btc" });
      setState(data.state);
      const checkout = data.deposit.checkoutUrl;
      setMessage(checkout ? `Deposit ready · open payment link` : `Deposit ${data.deposit.id} · ${data.deposit.status}`);
      if (typeof checkout === "string" && checkout.startsWith("http")) window.open(checkout, "_blank", "noopener,noreferrer");
    }
    catch (error) { setMessage(error instanceof Error ? error.message : "Deposit failed"); }
  }

  async function requestWithdrawal() {
    try { const data = await postJson("/api/wallet/withdraw", { amount: withdrawAmount, currency: "btc", address: withdrawAddress }); setMessage(`Withdrawal ${data.withdrawal.id} queued`); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Withdrawal failed"); }
  }

  async function claimDaily() { try { await postJson("/api/rewards/daily"); setMessage("Daily claimed"); } catch (error) { setMessage(error instanceof Error ? error.message : "Daily claim failed"); } }
  async function claimRakeback() { try { await postJson("/api/rewards/rakeback"); setMessage("Rakeback claimed"); } catch (error) { setMessage(error instanceof Error ? error.message : "Rakeback failed"); } }

  function mainButtonText() {
    if (activeSession && ["mines", "tower", "hilo"].includes(activeGame)) return `Cash out ${formatMoney(activeSession.payout)}`;
    if (activeSession && activeGame === "blackjack") return "Stand";
    if (sessionGames.has(activeGame)) return `Start ${gameName(activeGame)}`;
    if (activeGame === "crash") return `Start Crash ${formatMoney(wager)}`;
    return `Bet ${formatMoney(wager)}`;
  }

  if (message === "Not signed in") {
    return <div className="login-wrap"><div className="login-card"><div className="wordmark"><img src="/brand/logo-horizontal.png" alt="Bet Ranch" /></div><h1>Sign in</h1><input value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} placeholder="Email" /><input value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} placeholder="Password" type="password" /><button className="btn blue" onClick={() => login()}>Login</button><button className="btn" onClick={() => login("/api/auth/signup")}>Register</button><div className="label">Local dev: rancher@betranch.local / ChangeMe123!</div></div></div>;
  }

  return (
    <div className="casino-shell v5-shell">
      <aside className="casino-rail v5-rail">
        <div className="rail-switch"><button className="active">Casino</button><button>Sports</button></div>
        <div className="rail-logo"><img src="/brand/logo-horizontal.png" alt="Bet Ranch" /></div>
        <div className="raffle-card"><span>$20,000</span><b>Weekly Raffle</b><em>3d</em></div>
        <nav className="rail-nav v5-nav">
          <a className="active" href="#lobby">⌂ Home</a>
          <a href="#play">♢ Originals</a>
          <a href="#live">◉ Live Wins</a>
          <a href="#wallet">◈ Wallet</a>
          <a href="#rewards">✦ Rewards</a>
          <a href="#fair">◎ Fairness</a>
          <a href="/admin">⚙ Admin</a>
        </nav>
        <div className="race-list">
          <div><b>$25K</b><span>Daily Race</span><em>19:10:54</em></div>
          <div><b>$100K</b><span>Weekly Race</span><em>2d</em></div>
          <div><b>$500K</b><span>Monthly Race</span><em>4d</em></div>
        </div>
      </aside>

      <main className="casino-main v5-main">
        <header className="casino-topbar v5-topbar">
          <button className="hamburger">☰</button>
          <div className="top-logo"><img src="/brand/logo-horizontal.png" alt="Bet Ranch" /></div>
          <div className="top-spacer" />
          <button className="icon-btn">⌕</button>
          <button className="icon-btn">🎁</button>
          <button className="login-btn" onClick={logout}>{state.user.displayName}</button>
          <button className="register-btn" onClick={createDeposit}>Deposit</button>
        </header>

        <section className="home-hero v5-hero" id="lobby">
          <h1>Originals, live.</h1>
          <div className="hero-actions"><button className="green-btn" onClick={createDeposit}>Deposit</button><button className="provider-btn">BTC · LTC · USDT</button></div>
          <div className="feature-cards">
            <button onClick={() => setActiveGame("mines")}><img src="/game-thumbnails/mines.png" alt="" /><b>Mines</b><span>856 playing</span></button>
            <button onClick={() => setActiveGame("plinko")}><img src="/game-thumbnails/plinko.png" alt="" /><b>Plinko</b><span>837 playing</span></button>
          </div>
        </section>

        <section className="live-carousel" id="live">
          <div className="live-label"><i />Live</div>
          <div className="live-scroll">{liveWins.map((bet) => <div className="win-card" key={bet.id}><img src={thumbnails[bet.game]} alt="" /><b>{gameName(bet.game)}</b><span>rancher_{bet.id.slice(-4)}</span><em>{formatMoney(bet.payout)}</em></div>)}</div>
        </section>

        <section className="lobby-section">
          <div className="section-head v5-head"><h2>Originals</h2><div className="tabs"><span className="active">All</span><span>Hot</span><span>Cards</span><span>Table</span></div></div>
          <div className="game-lobby-grid v5-game-grid">{gameCatalog.map((game, index) => <button className={`game-tile-v5 ${activeGame === game.key ? "selected" : ""}`} key={game.key} onClick={() => setActiveGame(game.key)}><img src={thumbnails[game.key]} alt="" /><div className="game-tile-overlay"><b>{game.name}</b><span>Original</span></div><em><i />{900 + index * 37}</em></button>)}</div>
        </section>

        <section className="play-machine v5-machine" id="play">
          <div className="game-stage-card">
            <div className="stage-header-v5"><img className="game-header-thumb" src={thumbnails[activeGame]} alt="" /><div><span>{active.risk} · {active.edge}</span><h2>{active.name}</h2></div><button className="fair-chip" onClick={rotateSeed}>Verify</button></div>
            <div className={`visual-stage v5-stage stage-${activeGame}`}>{renderGameVisual(activeGame, selectedKeno, setSelectedKeno, latestBet, displayedSession, { revealMines, pickTower })}</div>
            <div className="machine-status v5-status"><span>{busy ? "Settling..." : message}</span><b>{displayedSession ? `${displayedSession.status} · ${formatMoney(displayedSession.payout)}` : latestBet ? `${latestBet.multiplier.toFixed(2)}x` : active.edge}</b></div>
            {latestBet?.proof && <pre className="proof-card">{safeJson(latestBet.proof)}</pre>}
          </div>

          <aside className="bet-panel v5-bet-panel">
            <div className="bet-tabs"><button className="active">Manual</button><button>Auto</button></div>
            <label>Bet Amount</label>
            <div className="amount-box"><input value={wager} type="number" min="0" step="0.01" onChange={(event) => setWager(Number(event.target.value))} /><span>USD</span></div>
            <div className="quick-row"><button onClick={() => setWager(roundMoney(Math.max(0.1, wager / 2)))}>½</button><button onClick={() => setWager(roundMoney(wager * 2))}>2×</button><button onClick={() => setWager(10)}>$10</button><button onClick={() => setWager(Math.max(0.1, Math.floor(availableBalance)))}>Max</button></div>
            <GameControls game={activeGame} selectedKeno={selectedKeno} setSelectedKeno={setSelectedKeno} diceTarget={diceTarget} setDiceTarget={setDiceTarget} diceDirection={diceDirection} setDiceDirection={setDiceDirection} limboTarget={limboTarget} setLimboTarget={setLimboTarget} mineCount={mineCount} setMineCount={setMineCount} plinkoRisk={plinkoRisk} setPlinkoRisk={setPlinkoRisk} towerRows={towerRows} setTowerRows={setTowerRows} hiloChoice={hiloChoice} setHiloChoice={setHiloChoice} crashAutoCashout={crashAutoCashout} setCrashAutoCashout={setCrashAutoCashout} rpsPick={rpsPick} setRpsPick={setRpsPick} activeSession={activeSession} busy={busy} cashoutActiveSession={cashoutActiveSession} pickHilo={pickHilo} revealMines={revealMines} blackjackMove={blackjackMove} />
            <button className="bet-now v5-bet" onClick={play} disabled={busy || (!!activeSession && ["mines", "tower", "hilo"].includes(activeGame) && activeSession.payout <= 0)}>{mainButtonText()}</button>
            <div className="balance-mini"><span>Available</span><strong>{formatMoney(availableBalance)}</strong></div>
          </aside>
        </section>

        <section className="data-grid v5-data">
          <div className="casino-panel v5-panel"><div className="section-head v5-head"><h2>Live Bets</h2><div className="feed-tabs"><span className="active">All Bets</span><span>High Rollers</span><span>My Bets</span></div></div><div className="table-wrap"><table><thead><tr><th>User</th><th>Game</th><th>Bet</th><th>Multi</th><th>Payout</th></tr></thead><tbody>{liveBets.map((bet) => <tr key={bet.id}><td>rancher_{bet.id.slice(-4)}</td><td><span className="game-cell"><img src={thumbnails[bet.game]} alt="" />{gameName(bet.game)}</span></td><td>{formatMoney(bet.wager)}</td><td className={bet.result === "loss" ? "loss" : "win"}>{bet.multiplier.toFixed(2)}x</td><td className={bet.result === "loss" ? "loss" : "win"}>{formatMoney(bet.payout)}</td></tr>)}</tbody></table></div></div>
          <div className="casino-panel v5-panel" id="rewards"><div className="section-head v5-head"><h2>Rewards</h2><span className="muted">{state.reward.rank}</span></div><div className="race-meter"><b>{rankProgress}%</b><span>Next rank</span><i style={{ width: `${rankProgress}%` }} /></div><button className="btn green wide" onClick={claimDaily} disabled={busy}>Daily $2.50</button><button className="btn wide" onClick={claimRakeback} disabled={busy}>Rakeback {formatMoney(claimableRakeback)}</button></div>
        </section>

        <section className="data-grid v5-data">
          <div className="casino-panel v5-panel wallet-panel" id="wallet">
            <div className="section-head v5-head"><h2>Wallet</h2><span className="muted">One-time deposits</span></div>
            <div className="wallet-controls">
              <input type="number" value={depositAmount} onChange={(event) => setDepositAmount(Number(event.target.value))} />
              <button className="btn blue" onClick={createDeposit} disabled={busy}>Create Deposit</button>
              <input type="number" value={withdrawAmount} onChange={(event) => setWithdrawAmount(Number(event.target.value))} />
              <button className="btn" onClick={requestWithdrawal} disabled={busy}>Withdraw</button>
            </div>
            <input className="address-input" value={withdrawAddress} onChange={(event) => setWithdrawAddress(event.target.value)} />
            {latestDeposit && <div className="payment-card">
              <span>Latest deposit</span>
              <b>{formatMoney(latestDeposit.amount)} · {latestDeposit.currency.toUpperCase()} · {latestDeposit.status}</b>
              {latestDeposit.checkoutUrl && <a href={latestDeposit.checkoutUrl} target="_blank" rel="noreferrer">Open payment page</a>}
            </div>}
            {latestWithdrawal && <div className="payment-card">
              <span>Latest withdrawal</span>
              <b>{formatMoney(latestWithdrawal.amount)} · {latestWithdrawal.currency.toUpperCase()} · {latestWithdrawal.status}</b>
            </div>}
            <div className="wallet-summary"><span>Locked {formatMoney(state.wallet.locked)}</span><b>Available {formatMoney(availableBalance)}</b></div>
          </div>
          <div className="casino-panel v5-panel" id="fair"><div className="section-head v5-head"><h2>Fairness</h2><button className="btn compact" onClick={rotateSeed} disabled={busy}>Rotate</button></div><div className="fair-lines"><p><span>Hash</span><b>{state.seed.serverSeedHash}</b></p><p><span>Client</span><input value={clientSeed} onChange={(event) => setClientSeed(event.target.value)} /></p><p><span>Nonce</span><b>{state.seed.nonce}</b></p></div></div>
        </section>
      </main>

      <nav className="mobilebar v5-mobile"><a className="active" href="#lobby">Home</a><a href="#play">Play</a><a href="#live">Live</a><a href="#wallet">Wallet</a><a href="#rewards">VIP</a></nav>
    </div>
  );
}

type ControlProps = {
  game: GameKey;
  selectedKeno: number[];
  setSelectedKeno: (numbers: number[]) => void;
  diceTarget: number;
  setDiceTarget: (value: number) => void;
  diceDirection: "under" | "over";
  setDiceDirection: (value: "under" | "over") => void;
  limboTarget: number;
  setLimboTarget: (value: number) => void;
  mineCount: number;
  setMineCount: (value: number) => void;
  plinkoRisk: "low" | "medium" | "high";
  setPlinkoRisk: (value: "low" | "medium" | "high") => void;
  towerRows: number;
  setTowerRows: (value: number) => void;
  hiloChoice: "higher" | "lower";
  setHiloChoice: (value: "higher" | "lower") => void;
  crashAutoCashout: number;
  setCrashAutoCashout: (value: number) => void;
  rpsPick: "rock" | "paper" | "scissors";
  setRpsPick: (value: "rock" | "paper" | "scissors") => void;
  activeSession?: ApiSession;
  busy: boolean;
  cashoutActiveSession: () => void;
  pickHilo: (choice: "higher" | "lower") => void;
  revealMines: (tile: number) => void;
  blackjackMove: (action: "hit" | "stand" | "double") => void;
};

function GameControls(props: ControlProps) {
  const { game } = props;
  if (game === "dice") return <div className="control-pack"><div className="dice-slider"><i style={{ left: `${props.diceTarget}%` }} /></div><div className="control-stats"><span>Roll {props.diceDirection} {props.diceTarget.toFixed(2)}</span><b>{props.diceDirection === "under" ? ((99 / props.diceTarget)).toFixed(2) : (99 / (100 - props.diceTarget)).toFixed(2)}x</b></div><div className="segmented"><button className={props.diceDirection === "under" ? "active" : ""} onClick={() => props.setDiceDirection("under")}>Under</button><button className={props.diceDirection === "over" ? "active" : ""} onClick={() => props.setDiceDirection("over")}>Over</button></div><div className="amount-box"><input value={props.diceTarget} type="number" min="2" max="98" step="0.5" onChange={(event) => props.setDiceTarget(Number(event.target.value))} /><span>target</span></div></div>;
  if (game === "limbo") return <div className="control-pack"><label>Target</label><div className="amount-box"><input value={props.limboTarget} type="number" min="1.01" step="0.01" onChange={(event) => props.setLimboTarget(Number(event.target.value))} /><span>x</span></div></div>;
  if (game === "mines") return <div className="control-pack"><label>Mines</label><div className="segmented">{[3, 5, 10, 15].map((count) => <button key={count} className={props.mineCount === count ? "active" : ""} onClick={() => props.setMineCount(count)} disabled={!!props.activeSession}>{count}</button>)}</div>{props.activeSession && <button className="btn wide" onClick={() => { const revealed = numbers(props.activeSession?.state?.revealed); const choices = Array.from({ length: 25 }, (_, i) => i).filter((i) => !revealed.includes(i)); if (choices.length) props.revealMines(choices[Math.floor(Math.random() * choices.length)]); }} disabled={props.busy}>Random tile</button>}{props.activeSession && <button className="btn wide" onClick={props.cashoutActiveSession} disabled={props.busy || props.activeSession.payout <= 0}>Cash out {formatMoney(props.activeSession.payout)}</button>}</div>;
  if (game === "plinko") return <div className="control-pack"><label>Risk</label><div className="segmented">{(["low", "medium", "high"] as const).map((risk) => <button key={risk} className={props.plinkoRisk === risk ? "active" : ""} onClick={() => props.setPlinkoRisk(risk)}>{risk}</button>)}</div></div>;
  if (game === "keno") return <div className="control-pack"><label>Picks</label><span className="muted">{props.selectedKeno.length}/10 selected</span></div>;
  if (game === "hilo") return <div className="control-pack"><label>Next card</label><div className="segmented"><button className={props.hiloChoice === "lower" ? "active" : ""} onClick={() => props.activeSession ? props.pickHilo("lower") : props.setHiloChoice("lower")} disabled={props.busy}>Lower</button><button className={props.hiloChoice === "higher" ? "active" : ""} onClick={() => props.activeSession ? props.pickHilo("higher") : props.setHiloChoice("higher")} disabled={props.busy}>Higher</button></div>{props.activeSession && <button className="btn wide" onClick={props.cashoutActiveSession} disabled={props.busy || props.activeSession.payout <= 0}>Cash out {formatMoney(props.activeSession.payout)}</button>}</div>;
  if (game === "tower") return <div className="control-pack"><label>Rows</label><div className="segmented">{[4, 6, 8].map((rows) => <button key={rows} className={props.towerRows === rows ? "active" : ""} onClick={() => props.setTowerRows(rows)} disabled={!!props.activeSession}>{rows}</button>)}</div>{props.activeSession && <button className="btn wide" onClick={props.cashoutActiveSession} disabled={props.busy || props.activeSession.payout <= 0}>Cash out {formatMoney(props.activeSession.payout)}</button>}</div>;
  if (game === "crash") return <div className="control-pack"><label>Auto cashout</label><div className="amount-box"><input value={props.crashAutoCashout} type="number" min="1.01" step="0.01" onChange={(event) => props.setCrashAutoCashout(Number(event.target.value))} /><span>x</span></div></div>;
  if (game === "blackjack") return <div className="control-pack"><label>Actions</label>{props.activeSession ? <div className="segmented"><button onClick={() => props.blackjackMove("hit")} disabled={props.busy}>Hit</button><button className="active" onClick={() => props.blackjackMove("stand")} disabled={props.busy}>Stand</button><button onClick={() => props.blackjackMove("double")} disabled={props.busy}>Double</button></div> : <span className="muted">Deal a hand</span>}</div>;
  if (game === "rps") return <div className="control-pack"><label>Pick</label><div className="segmented">{(["rock", "paper", "scissors"] as const).map((pick) => <button key={pick} className={props.rpsPick === pick ? "active" : ""} onClick={() => props.setRpsPick(pick)}>{pick}</button>)}</div></div>;
  return <div className="control-pack"><label>Mode</label><div className="segmented"><button className="active">Classic</button><button>Fast</button></div></div>;
}

function renderGameVisual(game: GameKey, selectedKeno: number[], setSelectedKeno: (numbers: number[]) => void, latestBet: ApiBet | undefined, activeSession: ApiSession | undefined, actions: { revealMines: (tile: number) => void; pickTower: (col: number) => void }) {
  const proof = latestBet?.game === game ? latestBet.proof : undefined;

  if (game === "mines") {
    const revealed = numbers(activeSession?.state?.revealed);
    const mines = numbers(activeSession?.state?.finalMines || activeSession?.state?.mines);
    const bustedTile = Number(activeSession?.state?.bustedTile ?? -1);
    return <div className="mines-wrap">
      <div className="stage-stat-row"><span>Mines {String(activeSession?.state?.mineCount ?? 5)}</span><b>{activeSession ? formatMoney(activeSession.payout) : "Start to reveal"}</b></div>
      <div className="mines-machine v5-mines">{Array.from({ length: 25 }, (_, i) => {
        const safe = revealed.includes(i);
        const bomb = bustedTile === i || ((activeSession?.status === "busted" || activeSession?.status === "cashed_out" || activeSession?.status === "complete") && mines.includes(i));
        return <button key={i} disabled={!activeSession || activeSession.status !== "active" || safe || bomb} onClick={() => actions.revealMines(i)} className={safe ? "revealed" : bomb ? "bomb" : ""}>{safe ? "◆" : bomb ? "✹" : ""}</button>;
      })}</div>
    </div>;
  }

  if (game === "plinko") {
    const path = numbers(proof?.path);
    const bucket = numberFromProof(proof, "bucket");
    return <div className="plinko-machine v5-plinko">
      <div className="stage-stat-row"><span>Risk {String(proof?.risk ?? "medium")}</span><b>{bucket !== undefined ? `Bucket ${bucket + 1}` : "Drop ball"}</b></div>
      <div className="peg-board">{Array.from({ length: 91 }, (_, i) => <i key={i} className={path.includes(i % 15) || i % 13 === 0 ? "hot" : ""} />)}</div>
      <div className="plinko-buckets">{[0.2, 0.5, 1, 2, 5, 12, 25].map((x, i) => <span key={x} className={bucket === i ? "bucket-hit" : ""}>{x}x</span>)}</div>
    </div>;
  }

  if (game === "wheel") {
    const segment = numberFromProof(proof, "segment");
    return <div className="wheel-machine">
      <div className="pointer" />
      <div className="wheel-core" style={{ rotate: segment !== undefined ? `${segment * 36}deg` : "0deg" }}><strong>{latestBet?.game === "wheel" ? `${latestBet.multiplier.toFixed(2)}x` : "Spin"}</strong></div>
    </div>;
  }

  if (game === "keno") {
    const draw = numbers(proof?.draw);
    const hits = numbers(proof?.picks).filter((n) => draw.includes(n));
    return <div className="keno-machine">{Array.from({ length: 40 }, (_, i) => {
      const n = i + 1; const active = selectedKeno.includes(n); const drawn = draw.includes(n); const hit = hits.includes(n);
      return <button key={n} className={hit ? "keno-hit" : drawn ? "keno-drawn" : active ? "keno-picked" : ""} onClick={() => setSelectedKeno(active ? selectedKeno.filter((x) => x !== n) : selectedKeno.length < 10 ? [...selectedKeno, n] : selectedKeno)}>{n}</button>;
    })}</div>;
  }

  if (game === "hilo") {
    const history = strings(activeSession?.state?.history);
    const current = history.length ? history[history.length - 1] : "A♠";
    const last = String(activeSession?.state?.lastResult || "");
    return <div className="hilo-machine">
      <div className="card back">{last === "loss" ? "×" : "?"}</div>
      <div className="ladder"><span>1.21x</span><span>1.54x</span><span>2.10x</span><span>{activeSession ? formatMoney(activeSession.payout) : "3.62x"}</span></div>
      <div className="card face">{current}</div>
    </div>;
  }

  if (game === "blackjack") {
    const state = activeSession?.state || {};
    const player = Array.isArray(state.playerCards) ? (state.playerCards as unknown[]).map(cardLabel) : [];
    const dealerRaw = Array.isArray(state.dealerCards) ? (state.dealerCards as unknown[]) : [];
    const complete = activeSession?.status && activeSession.status !== "active";
    const dealer = dealerRaw.map((card, index) => index === 1 && activeSession && !complete ? "?" : cardLabel(card));
    return <div className="table-machine">
      <div className="dealer"><span>Dealer</span><div className="cards">{(dealer.length ? dealer : ["?", "K♥"]).map((card, index) => <i key={`${card}-${index}`}>{card}</i>)}</div></div>
      <div className="felt-logo">21</div>
      <div className="dealer"><span>You</span><div className="cards">{(player.length ? player : ["A♠", "Q♣"]).map((card, index) => <i key={`${card}-${index}`}>{card}</i>)}</div></div>
    </div>;
  }

  if (game === "tower") {
    const picks = numbers(activeSession?.state?.picks);
    const traps = numbers(activeSession?.state?.traps);
    const bustRow = Number(activeSession?.state?.bustRow ?? -1);
    const currentRow = Number(activeSession?.state?.currentRow ?? 0);
    const rows = Number(activeSession?.state?.rows ?? 7);
    return <div className="tower-machine">{Array.from({ length: rows }, (_, rawRow) => {
      const row = rows - rawRow - 1;
      return <div key={row}>{Array.from({ length: 3 }, (_, col) => {
        const picked = picks[row] === col;
        const trap = bustRow === row && traps[row] === col;
        return <button key={col} disabled={!activeSession || activeSession.status !== "active" || row !== currentRow} onClick={() => actions.pickTower(col)} className={trap ? "bomb" : picked ? "revealed" : ""}>{trap ? "✹" : picked ? "◆" : ""}</button>;
      })}</div>;
    })}</div>;
  }

  if (game === "crash") {
    const crashAt = Number(activeSession?.state?.crashAt ?? proof?.crashAt ?? 0);
    const cashed = Number(activeSession?.state?.cashedOutAt ?? proof?.autoCashout ?? 0);
    return <div className="crash-machine">
      <svg viewBox="0 0 500 260" role="img"><path d="M20 220 C120 215 190 190 260 145 S385 52 470 30" /><circle cx="410" cy="64" r="10" /></svg>
      <strong>{crashAt ? `${crashAt.toFixed(2)}x` : "2.00x"}</strong>
      {cashed ? <span className="crash-cashout">Auto {cashed.toFixed(2)}x</span> : null}
    </div>;
  }

  if (game === "rps") {
    const pick = String(proof?.pick || "rock");
    const house = String(proof?.house || "?");
    return <div className="rps-machine"><button className={pick === "rock" ? "active" : ""}>✊</button><button className={pick === "paper" ? "active" : ""}>✋</button><button className={pick === "scissors" ? "active" : ""}>✌</button><span>House: {house}</span></div>;
  }

  if (game === "war") {
    return <div className="war-machine"><div className="card face">{String(proof?.playerCard || "K♣")}</div><strong>VS</strong><div className="card face">{String(proof?.dealerCard || "8♦")}</div></div>;
  }

  if (game === "limbo") return <div className="limbo-machine"><span>Result</span><strong>{proof?.resultMultiplier ? `${Number(proof.resultMultiplier).toFixed(2)}x` : latestBet?.game === "limbo" ? `${latestBet.multiplier.toFixed(2)}x` : "2.00x"}</strong></div>;

  return <div className="dice-machine">
    <div className="dice-number">{proof?.roll ? Number(proof.roll).toFixed(2) : latestBet?.game === "dice" ? latestBet.detail.match(/[0-9.]+/)?.[0] ?? "50.50" : "50.50"}</div>
    <div className="dice-track"><i style={{ left: `${Math.min(98, Math.max(2, Number(proof?.roll ?? 50.5)))}%` }} /></div>
  </div>;
}

const sampleBets: ApiBet[] = [
  { id: "sample_1001", game: "mines", wager: 18, multiplier: 2.41, payout: 43.38, profit: 25.38, result: "win", detail: "Cashed out", nonce: 1, clientSeed: "sample", serverSeedHash: "sample", createdAt: new Date().toISOString() },
  { id: "sample_1002", game: "plinko", wager: 12, multiplier: 5, payout: 60, profit: 48, result: "win", detail: "5x bucket", nonce: 2, clientSeed: "sample", serverSeedHash: "sample", createdAt: new Date().toISOString() },
  { id: "sample_1003", game: "limbo", wager: 25, multiplier: 0, payout: 0, profit: -25, result: "loss", detail: "Bust", nonce: 3, clientSeed: "sample", serverSeedHash: "sample", createdAt: new Date().toISOString() },
  { id: "sample_1004", game: "wheel", wager: 8, multiplier: 12, payout: 96, profit: 88, result: "win", detail: "12x", nonce: 4, clientSeed: "sample", serverSeedHash: "sample", createdAt: new Date().toISOString() },
  { id: "sample_1005", game: "blackjack", wager: 35, multiplier: 2, payout: 70, profit: 35, result: "win", detail: "Blackjack", nonce: 5, clientSeed: "sample", serverSeedHash: "sample", createdAt: new Date().toISOString() },
  { id: "sample_1006", game: "dice", wager: 6, multiplier: 1.98, payout: 11.88, profit: 5.88, result: "win", detail: "Roll 38.2", nonce: 6, clientSeed: "sample", serverSeedHash: "sample", createdAt: new Date().toISOString() },
];
