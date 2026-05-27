# V14 Phase 1: Production Auth/Admin Safety

Status: Pass

Changes:
- Removed unconditional demo-user fallback.
- Demo fallback now requires `BET_RANCH_ALLOW_DEMO_FALLBACK=true` and non-production mode.
- Added `/api/admin/check`.
- Admin page now confirms admin role before loading summary.

Audit:
- Production no longer silently treats anonymous users as the demo rancher.
- Admin API role checks still remain the real protection layer.
