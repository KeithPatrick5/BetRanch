import fs from 'fs';

const required = [
  'lib/db.ts', 'lib/auth.ts', 'lib/money.ts', 'lib/store.ts',
  'app/api/auth/login/route.ts', 'app/api/bet/route.ts', 'app/api/wallet/nowpayments/webhook/route.ts',
  'app/api/games/mines/start/route.ts', 'app/api/games/tower/start/route.ts'
];
const missing = required.filter((file) => !fs.existsSync(file));
if (missing.length) throw new Error(`Missing required files: ${missing.join(', ')}`);
const store = fs.readFileSync('lib/store.ts', 'utf8');
for (const needle of ['function assertRisk', 'function verifyBet', 'function startMines', 'function startTower', 'function handlePaymentWebhook']) {
  if (!store.includes(needle)) throw new Error(`Missing ${needle}`);
}
const auth = fs.readFileSync('lib/auth.ts', 'utf8');
if (!auth.includes('httpOnly: true')) throw new Error('Session cookie must be httpOnly');
const db = fs.readFileSync('lib/db.ts', 'utf8');
if (!db.includes('pbkdf2Sync')) throw new Error('Password hashing not found');
console.log('Bet Ranch static security checks passed.');
