import fs from 'fs';

const required = [
  'lib/db.ts', 'lib/auth.ts', 'lib/money.ts', 'lib/store.ts', 'lib/gameEngine.ts', 'lib/fairness.ts',
  'app/api/auth/login/route.ts', 'app/api/admin/check/route.ts', 'app/api/bet/route.ts', 'app/api/wallet/nowpayments/webhook/route.ts',
  'app/api/games/mines/start/route.ts', 'app/api/games/mines/reveal/route.ts',
  'app/api/games/tower/start/route.ts', 'app/api/games/tower/pick/route.ts',
  'app/api/games/hilo/start/route.ts', 'app/api/games/hilo/pick/route.ts',
  'app/api/games/crash/start/route.ts',
  'app/api/games/blackjack/start/route.ts', 'app/api/games/blackjack/action/route.ts'
];
const missing = required.filter((file) => !fs.existsSync(file));
if (missing.length) throw new Error(`Missing required files: ${missing.join(', ')}`);

const store = fs.readFileSync('lib/store.ts', 'utf8');
for (const needle of [
  'function assertRisk', 'function verifyBet', 'function startMines', 'function revealMinesTile',
  'function startTower', 'function pickTower', 'function startHilo', 'function pickHilo',
  'function startCrash', 'function startBlackjack', 'function blackjackAction',
  'function handlePaymentWebhook', 'function decideWithdrawal', 'function setRisk'
]) {
  if (!store.includes(needle)) throw new Error(`Missing ${needle}`);
}

const engine = fs.readFileSync('lib/gameEngine.ts', 'utf8');
for (const game of ['dice', 'limbo', 'mines', 'plinko', 'wheel', 'keno', 'hilo', 'tower', 'crash', 'blackjack', 'rps', 'war']) {
  if (!engine.includes(`"${game}"`)) throw new Error(`Game key missing: ${game}`);
}
for (const needle of ['compareOutcome', 'minesMultiplier', 'towerMultiplier', 'crashPoint', 'blackjackDeck', 'hiloDeck']) {
  if (!engine.includes(needle)) throw new Error(`Engine helper missing: ${needle}`);
}

const auth = fs.readFileSync('lib/auth.ts', 'utf8');
if (!auth.includes('httpOnly: true')) throw new Error('Session cookie must be httpOnly');
const db = fs.readFileSync('lib/db.ts', 'utf8');
if (!db.includes('pbkdf2Sync')) throw new Error('Password hashing not found');
console.log('Bet Ranch static security checks passed.');
