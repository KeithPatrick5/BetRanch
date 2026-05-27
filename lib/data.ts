export const games = [
  { name: "Dice", status: "Phase 4", edge: "1.00%", note: "Fast roll" },
  { name: "Limbo", status: "Phase 5", edge: "1.00%", note: "Multiplier hunt" },
  { name: "Mines", status: "Phase 7", edge: "1.00%", note: "Grid risk" },
  { name: "Plinko", status: "Phase 11", edge: "1.00%", note: "Visual drop" },
  { name: "Wheel", status: "Phase 12", edge: "1.50%", note: "Spin table" },
  { name: "Keno", status: "Phase 13", edge: "2.00%", note: "Number draw" },
  { name: "Hilo", status: "Phase 14", edge: "1.50%", note: "Card run" },
  { name: "Tower", status: "Phase 15", edge: "1.50%", note: "Climb or cash" },
];

export const liveBets = [
  { user: "rancher_77", game: "Limbo", wager: "$12.50", multi: "4.20x", payout: "$52.50", result: "win" },
  { user: "satslinger", game: "Dice", wager: "$8.00", multi: "1.98x", payout: "$15.84", result: "win" },
  { user: "pinkdust", game: "Mines", wager: "$22.00", multi: "0.00x", payout: "$0.00", result: "loss" },
  { user: "neoncalf", game: "Plinko", wager: "$4.00", multi: "9.00x", payout: "$36.00", result: "win" },
  { user: "rangeboss", game: "Wheel", wager: "$35.00", multi: "0.00x", payout: "$0.00", result: "loss" },
];

export const ledgerRows = [
  { type: "deposit_confirmed", amount: "+$100.00", ref: "BR-DEP-1001" },
  { type: "bet_debit", amount: "-$12.50", ref: "BR-BET-9812" },
  { type: "bet_win", amount: "+$52.50", ref: "BR-BET-9812" },
  { type: "rakeback_credit", amount: "+$0.18", ref: "BR-RB-0314" },
];
