export type GameKey = "dice" | "limbo" | "mines" | "plinko" | "wheel" | "keno" | "hilo" | "tower" | "crash" | "blackjack" | "rps" | "war";

export type CatalogGame = { key: GameKey; name: string; edge: string; status: string; note: string; risk: string };

export const gameCatalog: CatalogGame[] = [
  { key: "dice", name: "Dice", edge: "1.00%", status: "Live", note: "Roll under or over", risk: "Low" },
  { key: "limbo", name: "Limbo", edge: "1.00%", status: "Live", note: "Chase a target multiplier", risk: "Medium" },
  { key: "mines", name: "Mines", edge: "1.00%", status: "Live", note: "Pick safe tiles and cash out", risk: "Medium" },
  { key: "plinko", name: "Plinko", edge: "1.00%", status: "Live", note: "Drop through pink pegs", risk: "High" },
  { key: "wheel", name: "Wheel", edge: "1.50%", status: "Live", note: "Spin multiplier segments", risk: "Medium" },
  { key: "keno", name: "Keno", edge: "2.00%", status: "Live", note: "Pick numbers and hit matches", risk: "High" },
  { key: "hilo", name: "Hilo", edge: "1.50%", status: "Live", note: "Card ladder cashout", risk: "Medium" },
  { key: "tower", name: "Tower", edge: "1.50%", status: "Live", note: "Climb rows without a trap", risk: "High" },
  { key: "crash", name: "Crash", edge: "1.00%", status: "Live", note: "Solo crash point", risk: "High" },
  { key: "blackjack", name: "Blackjack", edge: "Rules", status: "Live", note: "Dealer stands on 17", risk: "Medium" },
  { key: "rps", name: "RPS", edge: "1.00%", status: "Live", note: "Fast three-way original", risk: "Low" },
  { key: "war", name: "War", edge: "1.00%", status: "Live", note: "High card showdown", risk: "Low" },
];

export const rankLadder = ["Dust", "Copper", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Ranch Boss"];

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatMoney(value: number) {
  return `${value < 0 ? "-" : ""}$${Math.abs(value).toFixed(2)}`;
}
