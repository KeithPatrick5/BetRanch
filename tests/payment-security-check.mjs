import fs from 'fs';

const checks = [
  ['lib/nowpayments.ts', 'createNowPayment'],
  ['lib/nowpayments.ts', 'ipn_callback_url'],
  ['app/api/wallet/deposit/route.ts', 'attachDepositProvider'],
  ['app/api/wallet/nowpayments/webhook/route.ts', 'x-nowpayments-sig'],
  ['app/api/wallet/nowpayments/webhook/route.ts', 'rateLimit'],
  ['lib/store.ts', 'actually_paid'],
  ['lib/store.ts', 'overpaid'],
  ['next.config.ts', 'Content-Security-Policy'],
  ['next.config.ts', 'X-Frame-Options'],
  ['next.config.ts', 'Permissions-Policy'],
  ['middleware.ts', 'matcher'],
  ['lib/rateLimit.ts', 'Too many requests'],
];

for (const [file, needle] of checks) {
  const txt = fs.readFileSync(file, 'utf8');
  if (!txt.includes(needle)) throw new Error(`${file} missing ${needle}`);
}

console.log('Bet Ranch payment/security checks passed.');
