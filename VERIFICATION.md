# StudioSpace backend audit and verification

Verified locally on 2026-11-05 with Node.js 24.14.1. No deploy, commit, push, database drop, collection drop or legacy-data migration was performed. Local `.env` was preserved.

## Audit findings and repairs

- GET `/facilities/:id` was a text placeholder, breaking clients expecting a facility object. It now returns the actual record with ObjectId validation and JSON 400/404 errors.
- No featured endpoint existed. Added GET `/facilities/featured` with a hard limit of six (latest ObjectIds; no legacy featured flag exists).
- Facility writes rejected image arrays. Both string and nonempty array forms are now supported, with strict numeric and required-field validation.
- Booking creation did not check facility existence, capacity, overlapping reservations, or real calendar dates. Added these checks and a MongoDB transaction/shared-lock protocol for concurrency.
- Capacity updates and facility deletes could invalidate bookings. They now share the booking transaction lock and reject incompatible changes with 409.
- Legacy bookings were claimable using an unverified session email. Legacy email fallback now requires the live BetterAuth account's emailVerified flag; new records always use the verified JWT subject as userId.
- Authentication defaulted to session-only. Backend now requires the existing BetterAuth JWT flow, validates EdDSA signatures through trusted JWKS, issuer, audience, expiration, subject/session claims, and checks the matching live session for revocation. It does not create a login system.
- MongoDB connection errors were swallowed and then dereferenced during module initialization. Connections are now lazy, cached per instance, retriable, and errors are sanitized. Local startup checks the database before listening.
- No global JSON error handler existed. Added consistent errors for malformed/oversized JSON, unknown paths, and unavailable services. Strict CORS now rejects disallowed origins explicitly.
- Conflicting CLIENT_URL/CLIENT_ORIGIN previously silently selected one value. Conflicts now fail configuration validation. Actual HTTPS production origins and an explicit audience remain required.
- Legacy Vercel build/routes configuration was unnecessary for current Express auto-detection. Removed vercel.json, preserved the root default app export, and archived the ignored local project binding at `/tmp/studiospace-audit/vercel-project.previous.json`. This did not change any remote Vercel project.
- Package testing was a failing placeholder. Added working built-in Node tests, local integration verification and syntax/start scripts, without adding packages. Dependency versions and lockfile remain unchanged.

## Existing and new API paths

Existing paths preserved: GET `/`; GET/POST `/facilities`; GET `/facilities/mine` and `/facilities/my`; GET/PATCH/DELETE `/facilities/:id`; POST/GET `/facilities/booking`; DELETE `/facilities/booking/:id`.

The old GET facility-details route was only a placeholder; its database behavior is newly implemented. New endpoints are GET `/health`, GET `/facilities/featured`, PUT `/facilities/:id`, and GET `/facilities/booking/:id`. Creation now returns 201 rather than 200; MongoDB result shapes remain compatible with existing frontend success handling. Full implemented contract: [API_CONTRACT.md](API_CONTRACT.md).

## Actual results

| Check | Result |
| --- | --- |
| `npm run check` | Passed syntax checks for all five runtime modules |
| `npm test` | Passed 5 offline tests covering input validation, legacy authorization and configuration rules |
| `npm run test:integration` | Passed 11 integration groups against the real adjacent frontend BetterAuth code and MongoDB |
| Actual CLI startup | `node index.js` started on an isolated port, connected to MongoDB, served `/health` |
| Serverless import/export | Exported app served the API with VERCEL mode enabled; no import-time DB connection |
| MongoDB schema inspection | Database A08, replica set, 13 facilities and 3 legacy bookings |
| Public APIs | Root, all facilities, real single facility, featured max six, invalid/missing IDs, unknown route |
| Private rejection | All private routes rejected missing authentication with 401 |
| JWT | Real frontend EdDSA token verified via HTTP JWKS; invalid signature/algorithm/issuer/audience/expiry/future nbf/subject/session rejected |
| Sessions | Cookie required, token bound to matching session; logout immediately rejected the previously valid JWT |
| Facility writes | Disposable POST, own lists/alias, string and array images, PATCH, full PUT, DELETE; forged identity ignored and other users rejected with 403 |
| Booking writes | Date/time/guest/capacity/facility validation, own list/detail, cancellation and cross-user 403 |
| Concurrent reservations | Two simultaneous overlapping requests returned exactly one 201 and one 409; adjacent slots succeeded |
| Legacy compatibility | Disposable missing-status booking blocked overlaps; uppercase string facility ID matched; legacy ownership required verified email |
| CORS/errors | Allowed credentialed origin, disallowed origin 403, OPTIONS 204, malformed JSON 400, oversized JSON 413 |
| Database failure | Unreachable MongoDB produced sanitized JSON 503, with no module-import crash |
| Preservation/cleanup | Original facility and booking document hashes unchanged; all disposable users/resources and tracked locks removed |
| `npm audit --omit=dev --json` | Passed: zero reported vulnerabilities in production dependencies |
| Dependency consistency | package.json and lockfile dependency entries match; no new packages |
| `git diff --check` | Passed |
| Build | No compilation/build script exists or is needed for this JavaScript Express backend; syntax validation passed |

Integration tests use disposable fixtures and accounts in existing databases. They never mutate existing facility/booking records. BetterAuth-managed signing keys are retained. No browser end-to-end build or deployed Vercel invocation was tested.

## Remaining integration/deployment requirements

1. Actual production frontend/backend domains and Vercel environment scopes must be configured later. No imaginary production domain has been inserted. Production routing, deployment protection and network reachability still require verification after an authorized deployment.
2. Frontend must enable API_AUTH_MODE=jwt and use the same JWT_AUDIENCE as this backend. Its existing proxy provides both JWT and session cookie. Frontend source was inspected, not changed.
3. Extend the frontend proxy allowlist/exports if using the new featured, booking-detail or PUT routes. Its existing details page already fetches the now-repaired GET `/facilities/:id` route directly. Replace old frontend `.env.example` deployment URL comments.
4. All 13 pre-existing facilities lack ownerId. They remain public, but cannot be edited/deleted or shown as owned without an explicitly authorized ownership mapping/migration. No ownership was guessed.
5. The 3 pre-existing bookings have email but no userId/status. They remain untouched; email-only access requires a verified matching BetterAuth email. Pre-existing overlapping bookings, if any, are not automatically repaired.
6. Keep the database as a transaction-capable replica set/Atlas cluster. Direct database writers must honor the same per-facility lock protocol. No new payment system was introduced.

Exact production variable checklist and frontend alignment: [DEPLOYMENT.md](DEPLOYMENT.md).
