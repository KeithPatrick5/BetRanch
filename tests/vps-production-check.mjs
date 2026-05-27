import fs from 'fs';

const checks = [
  ['lib/auth.ts', 'BET_RANCH_ALLOW_DEMO_FALLBACK'],
  ['lib/auth.ts', 'process.env.NODE_ENV !== "production"'],
  ['lib/db.ts', 'BET_RANCH_DATA_DIR'],
  ['lib/db.ts', 'acquireFileLock'],
  ['lib/db.ts', 'Database lock timeout'],
  ['app/api/admin/check/route.ts', 'requireAdmin'],
  ['app/admin/page.tsx', '/api/admin/check'],
  ['components/CasinoApp.tsx', 'Open payment page'],
  ['components/CasinoApp.tsx', 'One-time deposits'],
  ['docs/vps-deploy-notes.md', 'BET_RANCH_DATA_DIR=/var/lib/betranch'],
];

for (const [file, needle] of checks) {
  const txt = fs.readFileSync(file, 'utf8');
  if (!txt.includes(needle)) throw new Error(`${file} missing ${needle}`);
}

console.log('Bet Ranch VPS production checks passed.');
