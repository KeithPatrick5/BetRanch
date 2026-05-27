# V13 Phase 3: Security Hardening Audit

Status: Pass for project hardening, not a guarantee of total security

Fixes:
- Added Next.js security headers in `next.config.ts`.
- Added CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, and COOP.
- Added basic middleware gate for `/admin` requiring a session cookie.
- Added simple rate limiting helper and applied it to auth, bet, deposit, withdrawal, and NOWPayments webhook routes.
- Existing HTTP-only session cookie and password hashing remain in place.
- Existing admin APIs still require admin role.

Audit:
- Static security check passed.
- Payment/security check passed.
- This is not a claim that the site is impossible to hack. Real production needs hosted transactional DB, external security review, dependency audit, Playwright QA, and provider sandbox/live tests.
