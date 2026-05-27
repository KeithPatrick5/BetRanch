# V14 Phase 3: Wallet/Deposit Flow

Status: Pass

Changes:
- Deposit flow is treated as one-time wallet deposit.
- Frontend now opens a returned HTTP checkout URL in a new tab.
- Wallet panel shows latest deposit status and payment link.
- Wallet panel shows latest withdrawal status.
- Removed any subscription-style deposit implication.

Audit:
- NOWPayments provider-side details are intentionally left alone until merchant credentials are ready.
- Our side now exposes the payment URL/status better.
