import { rollFloat, rollInt, sampleWithoutReplacement, type FairInput } from "./fairness";

export type GameKey = "dice" | "limbo" | "mines" | "plinko" | "wheel" | "keno" | "hilo" | "tower" | "crash" | "blackjack" | "rps" | "war";
export type BetOutcomeStatus = "win" | "loss" | "push" | "cashout";

export type GameOutcome = {
  multiplier: number;
  payout: number;
  profit: number;
  result: BetOutcomeStatus;
  detail: string;
  proof: Record<string, unknown>;
};

export type BetRequest = {
  game: GameKey;
  wager: number;
  params?: Record<string, unknown>;
};

export const HOUSE_EDGE: Record<GameKey, number> = {
  dice: 0.01,
  limbo: 0.01,
  mines: 0.01,
  plinko: 0.01,
  wheel: 0.015,
  keno: 0.02,
  hilo: 0.015,
  tower: 0.015,
  crash: 0.01,
  blackjack: 0.012,
  rps: 0.01,
  war: 0.01,
};

export const BET_LIMITS = {
  min: 0.1,
  max: 100,
  maxPayout: 10000,
};

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatMoney(value: number) {
  return `${value < 0 ? "-" : ""}$${Math.abs(value).toFixed(2)}`;
}

function capPayout(wager: number, multiplier: number) {
  return roundMoney(Math.min(wager * multiplier, BET_LIMITS.maxPayout));
}

function outcome(wager: number, multiplier: number, result: BetOutcomeStatus, detail: string, proof: Record<string, unknown>): GameOutcome {
  const payout = result === "loss" ? 0 : capPayout(wager, multiplier);
  return {
    multiplier: roundMoney(payout / wager),
    payout,
    profit: roundMoney(payout - wager),
    result,
    detail,
    proof,
  };
}

function numberParam(params: Record<string, unknown> | undefined, key: string, fallback: number, min: number, max: number) {
  const raw = Number(params?.[key] ?? fallback);
  if (!Number.isFinite(raw)) return fallback;
  return Math.min(max, Math.max(min, raw));
}

function stringParam<T extends string>(params: Record<string, unknown> | undefined, key: string, fallback: T, allowed: readonly T[]) {
  const raw = String(params?.[key] ?? fallback) as T;
  return allowed.includes(raw) ? raw : fallback;
}

function handValue(cards: number[]) {
  let total = 0;
  let aces = 0;
  for (const card of cards) {
    const rank = (card % 13) + 1;
    if (rank === 1) {
      aces += 1;
      total += 11;
    } else {
      total += Math.min(rank, 10);
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return total;
}

function cardName(card: number) {
  const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const suits = ["♠", "♥", "♦", "♣"];
  return `${ranks[card % 13]}${suits[Math.floor(card / 13)]}`;
}

export function runGame(game: GameKey, wager: number, fair: FairInput, params?: Record<string, unknown>): GameOutcome {
  if (game === "dice") return dice(wager, fair, params);
  if (game === "limbo") return limbo(wager, fair, params);
  if (game === "mines") return minesInstant(wager, fair, params);
  if (game === "plinko") return plinko(wager, fair, params);
  if (game === "wheel") return wheel(wager, fair);
  if (game === "keno") return keno(wager, fair, params);
  if (game === "hilo") return hilo(wager, fair, params);
  if (game === "tower") return towerInstant(wager, fair, params);
  if (game === "crash") return crash(wager, fair, params);
  if (game === "blackjack") return blackjack(wager, fair, params);
  if (game === "rps") return rps(wager, fair, params);
  return war(wager, fair);
}

export function dice(wager: number, fair: FairInput, params?: Record<string, unknown>) {
  const target = numberParam(params, "target", 50.5, 2, 98);
  const direction = stringParam(params, "direction", "under", ["under", "over"] as const);
  const roll = roundMoney(rollFloat(fair) * 100);
  const chance = direction === "under" ? target : 100 - target;
  const multiplier = roundMoney((1 - HOUSE_EDGE.dice) * 100 / chance);
  const won = direction === "under" ? roll < target : roll > target;
  return outcome(wager, won ? multiplier : 0, won ? "win" : "loss", `${roll.toFixed(2)} rolled ${direction} ${target}`, { roll, target, direction });
}

export function limbo(wager: number, fair: FairInput, params?: Record<string, unknown>) {
  const target = numberParam(params, "target", 2, 1.01, 10000);
  const raw = Math.max(rollFloat(fair), 0.000001);
  const resultMultiplier = Math.min(1000000, Math.floor(((1 - HOUSE_EDGE.limbo) / raw) * 100) / 100);
  const won = resultMultiplier >= target;
  return outcome(wager, won ? target : 0, won ? "win" : "loss", `${resultMultiplier.toFixed(2)}x result`, { target, resultMultiplier });
}

export function minesLayout(fair: FairInput, mineCount: number) {
  return sampleWithoutReplacement(fair, 25, mineCount);
}

export function minesMultiplier(mineCount: number, safePicks: number) {
  let probability = 1;
  for (let i = 0; i < safePicks; i += 1) probability *= (25 - mineCount - i) / (25 - i);
  return roundMoney((1 - HOUSE_EDGE.mines) / probability);
}

export function minesInstant(wager: number, fair: FairInput, params?: Record<string, unknown>) {
  const mineCount = Math.round(numberParam(params, "mineCount", 3, 1, 24));
  const picks = Math.round(numberParam(params, "picks", 3, 1, 24 - mineCount));
  const mines = minesLayout(fair, mineCount);
  const selected = sampleWithoutReplacement({ ...fair, cursor: 100 }, 25, picks);
  const busted = selected.some((tile) => mines.includes(tile));
  const safe = selected.filter((tile) => !mines.includes(tile)).length;
  const multi = busted ? 0 : minesMultiplier(mineCount, safe);
  return outcome(wager, multi, busted ? "loss" : "cashout", busted ? `Mine hit after ${safe} safe picks` : `${safe} safe picks cashed out`, { mineCount, mines, selected, safe });
}

export function towerLayout(fair: FairInput, rows: number, width = 3) {
  return Array.from({ length: rows }, (_, row) => rollInt({ ...fair, cursor: row }, width));
}

export function towerMultiplier(rowsCleared: number, width = 3) {
  const probability = Math.pow((width - 1) / width, rowsCleared);
  return roundMoney((1 - HOUSE_EDGE.tower) / probability);
}

export function towerInstant(wager: number, fair: FairInput, params?: Record<string, unknown>) {
  const rows = Math.round(numberParam(params, "rows", 4, 1, 8));
  const traps = towerLayout(fair, rows);
  const picks = Array.from({ length: rows }, (_, row) => rollInt({ ...fair, cursor: row + 200 }, 3));
  const bustRow = picks.findIndex((pick, row) => pick === traps[row]);
  const cleared = bustRow === -1 ? rows : bustRow;
  const multi = bustRow === -1 ? towerMultiplier(cleared) : 0;
  return outcome(wager, multi, bustRow === -1 ? "cashout" : "loss", bustRow === -1 ? `Cleared ${rows} rows` : `Trap on row ${bustRow + 1}`, { rows, traps, picks, cleared });
}

export function plinko(wager: number, fair: FairInput, params?: Record<string, unknown>) {
  const risk = stringParam(params, "risk", "medium", ["low", "medium", "high"] as const);
  const tables = {
    low: [0.4, 0.6, 0.8, 1, 1.2, 1.5, 2, 4, 2, 1.5, 1.2, 1, 0.8, 0.6, 0.4, 8],
    medium: [0.1, 0.4, 0.7, 1, 1.5, 3, 8, 20, 8, 3, 1.5, 1, 0.7, 0.4, 0.1, 45],
    high: [0, 0.2, 0.5, 1.1, 2, 5, 15, 50, 15, 5, 2, 1.1, 0.5, 0.2, 0, 120],
  } as const;
  const multipliers = tables[risk];
  const path = Array.from({ length: 15 }, (_, cursor) => rollInt({ ...fair, cursor }, 2));
  const bucket = path.reduce((sum, step) => sum + step, 0);
  const multi = multipliers[bucket];
  return outcome(wager, multi, multi >= 1 ? "win" : "loss", `Bucket ${bucket + 1} paid ${multi}x`, { risk, path, bucket });
}

export function wheel(wager: number, fair: FairInput) {
  const segments = [0, 0, 0.5, 1.2, 1.5, 2, 3, 5, 10, 20];
  const segment = rollInt(fair, segments.length);
  const multi = segments[segment];
  return outcome(wager, multi, multi > 1 ? "win" : "loss", `Segment ${segment + 1} paid ${multi}x`, { segment, segments });
}

export function keno(wager: number, fair: FairInput, params?: Record<string, unknown>) {
  const raw = Array.isArray(params?.picks) ? params?.picks as unknown[] : [1, 7, 13, 21, 33];
  const picks = Array.from(new Set(raw.map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= 40))).slice(0, 10);
  if (picks.length < 1) return outcome(wager, 0, "loss", "No valid picks", { picks });
  const draw = sampleWithoutReplacement(fair, 40, 10).map((n) => n + 1);
  const hits = picks.filter((pick) => draw.includes(pick)).length;
  const tables: Record<number, number[]> = {
    1: [0, 3.8],
    2: [0, 1.8, 5],
    3: [0, 0, 2.5, 25],
    4: [0, 0, 1.2, 5, 80],
    5: [0, 0, 0.6, 3, 20, 300],
    6: [0, 0, 0.5, 2, 10, 80, 700],
    7: [0, 0, 0.4, 1.5, 6, 30, 200, 1500],
    8: [0, 0, 0.3, 1.2, 4, 18, 100, 800, 5000],
    9: [0, 0, 0.2, 1.1, 3, 12, 60, 400, 2500, 10000],
    10: [0, 0, 0.2, 1, 2, 8, 40, 200, 1200, 5000, 10000],
  };
  const table = tables[picks.length];
  const multi = table[Math.min(hits, table.length - 1)] ?? 0;
  return outcome(wager, multi, multi > 1 ? "win" : "loss", `${hits} hits from ${picks.length} picks`, { picks, draw, hits });
}

export function hilo(wager: number, fair: FairInput, params?: Record<string, unknown>) {
  const choice = stringParam(params, "choice", "higher", ["higher", "lower"] as const);
  const first = rollInt(fair, 13) + 1;
  const second = rollInt({ ...fair, cursor: 1 }, 13) + 1;
  const won = choice === "higher" ? second > first : second < first;
  const push = second === first;
  if (push) return outcome(wager, 1, "push", `Push: ${first} to ${second}`, { first, second, choice });
  return outcome(wager, won ? 1.94 : 0, won ? "win" : "loss", `${first} to ${second}, picked ${choice}`, { first, second, choice });
}

export function crash(wager: number, fair: FairInput, params?: Record<string, unknown>) {
  const autoCashout = numberParam(params, "autoCashout", 2, 1.01, 1000);
  const raw = Math.max(rollFloat(fair), 0.000001);
  const crashAt = Math.min(10000, Math.floor(((1 - HOUSE_EDGE.crash) / raw) * 100) / 100);
  const won = crashAt >= autoCashout;
  return outcome(wager, won ? autoCashout : 0, won ? "cashout" : "loss", `Crash point ${crashAt.toFixed(2)}x`, { autoCashout, crashAt });
}

export function blackjack(wager: number, fair: FairInput, params?: Record<string, unknown>) {
  const action = stringParam(params, "action", "stand", ["stand", "hit", "double"] as const);
  const deck = sampleWithoutReplacement(fair, 52, 12);
  const playerCards = [deck[0], deck[2]];
  const dealerCards = [deck[1], deck[3]];
  let cursor = 4;
  if (action === "hit" || action === "double") playerCards.push(deck[cursor++]);
  let player = handValue(playerCards);
  if (player > 21) return outcome(wager, 0, "loss", `Bust ${player}`, { playerCards: playerCards.map(cardName), dealerCards: dealerCards.map(cardName), action });
  let dealer = handValue(dealerCards);
  while (dealer < 17 && cursor < deck.length) {
    dealerCards.push(deck[cursor++]);
    dealer = handValue(dealerCards);
  }
  player = handValue(playerCards);
  const natural = playerCards.length === 2 && player === 21;
  if (dealer > 21) return outcome(wager, natural ? 2.5 : action === "double" ? 4 : 2, "win", `Dealer bust ${dealer}`, { playerCards: playerCards.map(cardName), dealerCards: dealerCards.map(cardName), player, dealer, action });
  if (player === dealer) return outcome(wager, 1, "push", `Push ${player}`, { playerCards: playerCards.map(cardName), dealerCards: dealerCards.map(cardName), player, dealer, action });
  const won = player > dealer;
  const winMulti = natural ? 2.5 : action === "double" ? 4 : 2;
  return outcome(wager, won ? winMulti : 0, won ? "win" : "loss", `Player ${player}, dealer ${dealer}`, { playerCards: playerCards.map(cardName), dealerCards: dealerCards.map(cardName), player, dealer, action });
}

export function rps(wager: number, fair: FairInput, params?: Record<string, unknown>) {
  const pick = stringParam(params, "pick", "rock", ["rock", "paper", "scissors"] as const);
  const options = ["rock", "paper", "scissors"] as const;
  const house = options[rollInt(fair, 3)];
  const win = (pick === "rock" && house === "scissors") || (pick === "paper" && house === "rock") || (pick === "scissors" && house === "paper");
  if (pick === house) return outcome(wager, 1, "push", `Both picked ${pick}`, { pick, house });
  return outcome(wager, win ? 1.98 : 0, win ? "win" : "loss", `${pick} against ${house}`, { pick, house });
}

export function war(wager: number, fair: FairInput) {
  const player = rollInt(fair, 13) + 2;
  const dealer = rollInt({ ...fair, cursor: 1 }, 13) + 2;
  if (player === dealer) return outcome(wager, 1, "push", `Tie at ${player}`, { player, dealer });
  const won = player > dealer;
  return outcome(wager, won ? 1.98 : 0, won ? "win" : "loss", `Player ${player}, dealer ${dealer}`, { player, dealer });
}
