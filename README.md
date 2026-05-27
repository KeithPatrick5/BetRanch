# Bet Ranch

Compact crypto-originals casino foundation with server-settled games, provably fair results, wallet ledger, rewards, manual withdrawals, admin controls, premium game art, and a dark pink ranch casino theme.

## Current status

The build is basically parked at the point where the main remaining work is:

```text
1. Browser QA
2. NOWPayments merchant testing
3. Final environment variables
4. VPS deployment
```

The game engines, frontend/API mapping, wallet ledger, manual withdrawals, admin routes, VPS data path support, and basic security hardening are already in place.

## Run locally

```bash
npm install --package-lock=false
npm run dev
```

Then open the local Next.js URL.

## Dev accounts

```text
User:  rancher@betranch.local / ChangeMe123!
Admin: admin@betranch.local   / ChangeMe123!
```

## Test

```bash
npm test
```

The current test chain covers:

```text
static security checks
frontend game/API mapping checks
payment/security checks
VPS production checks
backend/game engine tests
```

## VPS deployment environment

Use these on the VPS when ready:

```bash
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_SITE_URL=https://your-domain.example

BET_RANCH_DATA_DIR=/var/lib/betranch
BET_RANCH_ALLOW_DEMO_FALLBACK=false

NOWPAYMENTS_API_KEY=replace_me
NOWPAYMENTS_IPN_SECRET=replace_me
NOWPAYMENTS_IPN_CALLBACK_URL=https://your-domain.example/api/wallet/nowpayments/webhook
```

## Environment variable notes

### `NODE_ENV`

Use:

```bash
NODE_ENV=production
```

This disables the local demo fallback behavior.

### `PORT`

Use whatever port your process manager/reverse proxy expects.

```bash
PORT=3000
```

### `NEXT_PUBLIC_SITE_URL`

The public site URL.

```bash
NEXT_PUBLIC_SITE_URL=https://your-domain.example
```

Used for callback URL fallback and production links.

### `BET_RANCH_DATA_DIR`

VPS data directory for the local JSON database.

```bash
BET_RANCH_DATA_DIR=/var/lib/betranch
```

The app stores the database file here unless `BET_RANCH_DB_FILE` is set.

### `BET_RANCH_DB_FILE`

Optional. Only use this if you want a specific DB file path.

```bash
BET_RANCH_DB_FILE=/var/lib/betranch/db.json
```

Usually you can skip this and just set `BET_RANCH_DATA_DIR`.

### `BET_RANCH_ALLOW_DEMO_FALLBACK`

Use:

```bash
BET_RANCH_ALLOW_DEMO_FALLBACK=false
```

Do not enable this in production. The demo fallback only exists for local development.

### `NOWPAYMENTS_API_KEY`

Provided by NOWPayments.

```bash
NOWPAYMENTS_API_KEY=replace_me
```

Required before live deposits can create real payment requests.

### `NOWPAYMENTS_IPN_SECRET`

Provided/configured through NOWPayments IPN settings.

```bash
NOWPAYMENTS_IPN_SECRET=replace_me
```

Used to verify webhook callbacks.

### `NOWPAYMENTS_IPN_CALLBACK_URL`

Set this to the public webhook URL.

```bash
NOWPAYMENTS_IPN_CALLBACK_URL=https://your-domain.example/api/wallet/nowpayments/webhook
```

This is what NOWPayments calls when a payment status changes.

### `NOWPAYMENTS_API_BASE`

Optional. Defaults to:

```bash
https://api.nowpayments.io/v1
```

Only set it if NOWPayments gives you a different endpoint.

## VPS data

Local development data is stored in:

```text
.betranch/db.json
```

On the VPS, set:

```bash
BET_RANCH_DATA_DIR=/var/lib/betranch
```

Recommended:

```bash
sudo mkdir -p /var/lib/betranch
sudo chown -R <your-user>:<your-user> /var/lib/betranch
```

The current file database has a simple lock for a single VPS process. Do not run multiple app processes against the same JSON file. If traffic grows or real money volume increases, move the database layer to Postgres.

## NOWPayments status

The app is wired for normal one-time wallet deposits, not recurring subscriptions.

Flow:

```text
user enters deposit amount
backend creates local pending deposit
backend calls NOWPayments create payment if API key exists
frontend opens/shows the payment page if checkout URL exists
NOWPayments calls webhook
webhook verifies signature if secret is configured
wallet is credited once after confirmed payment status
```

Remaining before live deposits:

```text
get merchant account ready
add NOWPAYMENTS_API_KEY
add NOWPAYMENTS_IPN_SECRET
set NOWPAYMENTS_IPN_CALLBACK_URL
run a real small deposit test
verify webhook hits the VPS
verify wallet credits exactly once
```

## Browser QA still needed

Before pushing this as live/live-ish, run browser QA for:

```text
login/logout
homepage/lobby
mobile lobby
Dice bet
Limbo bet
Mines start/reveal/cashout
Plinko bet
Wheel bet
Keno picks/bet
Hilo start/higher/lower/cashout
Tower start/pick/cashout
Crash start
Blackjack deal/hit/stand/double
RPS pick/bet
War bet
wallet deposit flow
withdrawal request
admin withdrawal approve/reject/sent
fairness seed rotation
```

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run typecheck
npm test
```

## Clean package rules

Do not commit or zip:

```text
node_modules
.next
package-lock.json
tsconfig.tsbuildinfo
.betranch
```

## Production caveat

This is now a strong VPS-ready local foundation. It is still not something to treat as fully live-real-money-complete until browser QA, merchant testing, domain/HTTPS, backups, and final VPS env setup are done.
