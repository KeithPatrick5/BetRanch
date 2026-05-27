import fs from 'fs';

const component = fs.readFileSync('components/CasinoApp.tsx', 'utf8');
const checks = [
  ['Dice', 'diceTarget', 'direction: diceDirection', '/api/bet'],
  ['Limbo', 'limboTarget', 'target: limboTarget', '/api/bet'],
  ['Mines', '/api/games/mines/start', '/api/games/mines/reveal', '/api/games/session/cashout'],
  ['Plinko', 'plinkoRisk', 'risk: plinkoRisk', '/api/bet'],
  ['Wheel', 'game === "wheel"', '/api/bet'],
  ['Keno', 'selectedKeno', 'picks: selectedKeno', '/api/bet'],
  ['Hilo', '/api/games/hilo/start', '/api/games/hilo/pick', '/api/games/session/cashout'],
  ['Tower', '/api/games/tower/start', '/api/games/tower/pick', '/api/games/session/cashout'],
  ['Crash', '/api/games/crash/start', 'crashAutoCashout'],
  ['Blackjack', '/api/games/blackjack/start', '/api/games/blackjack/action', 'blackjackMove'],
  ['RPS', 'rpsPick', 'pick: rpsPick', '/api/bet'],
  ['War', 'game === "war"', '/api/bet'],
];

for (const [game, ...needles] of checks) {
  for (const needle of needles) {
    if (!component.includes(needle)) throw new Error(`${game} frontend mapping missing: ${needle}`);
  }
}

for (const api of [
  'app/api/games/mines/start/route.ts',
  'app/api/games/mines/reveal/route.ts',
  'app/api/games/tower/start/route.ts',
  'app/api/games/tower/pick/route.ts',
  'app/api/games/hilo/start/route.ts',
  'app/api/games/hilo/pick/route.ts',
  'app/api/games/crash/start/route.ts',
  'app/api/games/blackjack/start/route.ts',
  'app/api/games/blackjack/action/route.ts',
]) {
  if (!fs.existsSync(api)) throw new Error(`Missing API route: ${api}`);
}

if (!component.includes('activeSessions')) throw new Error('UI does not read activeSessions from /api/me');
if (!component.includes('renderGameVisual(activeGame')) throw new Error('Visual stage is not connected to active game state');
if (!component.includes('mainButtonText()')) throw new Error('Main bet button text is not game-aware');


const v13Needles = [
  'displayedSession',
  'lastSession',
  'Random tile',
  'keno-hit',
  'crash-cashout',
  'cardLabel',
  'numberFromProof',
];
for (const needle of v13Needles) {
  if (!component.includes(needle)) throw new Error(`V13 gameplay UI missing: ${needle}`);
}

const securityFiles = [
  ['next.config.ts', 'Content-Security-Policy'],
  ['next.config.ts', 'X-Frame-Options'],
  ['middleware.ts', 'bet_ranch_session'],
  ['lib/rateLimit.ts', 'rateLimit'],
  ['lib/nowpayments.ts', 'createNowPayment'],
  ['app/api/wallet/deposit/route.ts', 'createNowPayment'],
];
for (const [file, needle] of securityFiles) {
  const txt = fs.readFileSync(file, 'utf8');
  if (!txt.includes(needle)) throw new Error(`${file} missing ${needle}`);
}

console.log('Bet Ranch frontend game mapping checks passed.');
