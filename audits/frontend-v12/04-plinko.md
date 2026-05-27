# Plinko Frontend QA

Status: Pass

Frontend mapping:
- Uses `/api/bet`.
- Sends `risk: plinkoRisk`.
- UI has Low/Medium/High risk controls.
- Visual stage uses Plinko board and payout buckets.

Backend match:
- Plinko engine expects risk and maps fair path to bucket/multiplier.
- Backend tests passed.
