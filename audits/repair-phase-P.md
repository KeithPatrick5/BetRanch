# Repair Phase P: Compliance and jurisdiction controls

Status: **PARTIAL PASS**

## Audit result

User/country/terms/KYC/AML-ready fields and config surfaces exist. Real IP country lookup, KYC provider, AML checks, and legal review are not implemented.

## Files/areas checked

- Server store and ledger authority
- API routes touched by this phase
- Client-facing UI copy and behavior
- Fairness, balance, and audit implications

## Next production concern

Real-money launch still requires persistent database transactions, real authentication, production rate limits, operational monitoring, and legal/compliance review before public use.
