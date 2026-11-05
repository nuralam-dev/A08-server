# Fresh StudioSpace backend deployment preparation

No deployment, Vercel project creation/deletion, Git commit or push is part of this preparation. Choose the real frontend and backend production domains before configuring either app. Do not reuse old preview/deployment IDs as configuration.

## Runtime

The root `vercel.json` uses the requested legacy version 2 configuration: `@vercel/node` builds `index.js`, and `/(.*)` routes to that entry point. Set the Vercel project root to A-08-server. The existing `export default app` is the function handler; the local listener is guarded and does not start on Vercel. Use Node.js 24.x (locally tested with 24.14.1). This is JavaScript with no compilation step. Legacy `builds` overrides Vercel's dashboard build/development settings; leave custom build/output overrides unset. `npm start` is for local runtime.

All runtime modules (`config.js`, `database.js`, `auth.js`, `validation.js`) use static imports reachable from `index.js`. Runtime packages (`cors`, `dotenv`, `express`, `jose`, `mongodb`) are declared in `dependencies` and recorded in `package-lock.json`. There are no application templates, local signing keys, or dynamically loaded data files requiring `includeFiles`. Vercel traces imported dependencies into the function. `.env` is ignored; supply production variables through Vercel rather than bundling it. No frontend build or integration-test fixture is required at runtime.

The MongoClient and connection promise are reused per warm instance, with a bounded pool and failed-connection retry. There is no top-level network connection during app import. Local startup verifies MongoDB before listening; `/health` checks database reachability in either runtime. API data always uses database `A08` unless explicitly overridden. Booking transactions require a MongoDB replica set/Atlas cluster; the inspected existing cluster supports this. Grant normal read/write permissions for `facilities`, `facilitiesBooking`, and the new `bookingLocks` collection in the selected API database. Lock documents are coordination metadata, not changes to legacy facilities/bookings. They are retained during normal operation.

## Exact backend production environment checklist

| Variable | Production value |
| --- | --- |
| `MONGODB_URI` | Existing private MongoDB connection string; never expose publicly |
| `MONGODB_DB_NAME` | `A08`, or omit to use `A08` |
| `CLIENT_URL` | Actual canonical HTTPS frontend origin, without a path/query/fragment |
| `AUTH_BASE_URL` | Actual canonical HTTPS BetterAuth frontend origin; omit only when identical to CLIENT_URL |
| `API_AUTH_MODE` | `jwt` (also the backend default) |
| `JWT_AUDIENCE` | Explicit identifier matching frontend JWT_AUDIENCE exactly; `studiospace-api` is suitable if configured on both |
| `JWT_ISSUER` | Frontend BetterAuth issuer origin; omit to inherit AUTH_BASE_URL |
| `JWT_JWKS_URL` | Full trusted HTTPS JWKS endpoint; omit to derive AUTH_BASE_URL + `/api/auth/jwks` |
| `NODE_ENV` | `production` (normally provided by Vercel) |
| `BOOKING_TIME_ZONE` | `Asia/Dhaka`, or omit to use the existing default; keep booking times consistent across environments |
| `PORT` | Omit on Vercel; local default is 4000 |

Remove obsolete `CLIENT_ORIGIN` when setting CLIENT_URL. The legacy name remains a fallback, but a conflict fails startup rather than silently selecting the wrong origin. Remove unused old URL overrides from each environment scope, including branch overrides. HTTPS production validation remains enforced. Do not set fake domains or localhost to bypass startup errors. Validation checks origin shape and common loopback names; it does not establish domain ownership or DNS reachability.

No API self/base URL is needed on the backend. No BetterAuth secret, Google secret, or JWT private key belongs on this backend: authentication is still owned by the existing frontend. JWT verification uses its trusted public JWKS plus its live session endpoint. Both endpoints must be reachable from Vercel without interactive deployment-protection redirects. Configure Production and Preview separately; previews require their own explicit trusted frontend/auth pairing, not wildcard CORS.

## Frontend alignment required

In `a-08-client`, configure `API_AUTH_MODE=jwt` and the same JWT audience. Set `BETTER_AUTH_URL` to the actual HTTPS frontend origin; if NEXT_PUBLIC_AUTH_URL is set, it must match. Set BACKEND_URL and NEXT_PUBLIC_API_URL to the actual fresh HTTPS backend origin. Preserve BETTER_AUTH_SECRET, auth database credentials, and signing keys. The existing same-origin `/api/backend` proxy forwards both the active cookie and a server-issued JWT. A direct browser request to another domain does not replace that session-bound flow.

There are old deployment URL comments in the frontend `.env.example`; they are not backend defaults and should be replaced by the frontend agent. New route forwarding needs are listed in [API_CONTRACT.md](API_CONTRACT.md). OAuth callback URLs, when used, need the actual frontend domain; keep their configuration in the frontend project.

## Local operation and verification

Preserve existing `.env` secrets. Merge missing keys from `.env.example`; do not overwrite `.env`. The existing local frontend origin is http://localhost:3000 and API port is 4000. Enable frontend JWT mode and align audience before making private requests. Do not copy local origins into Production.

- `npm ci`: install the lockfile dependencies when needed; no new packages were introduced here.
- `npm start` / `npm run dev`: local API, with MongoDB startup check.
- `npm run check`: syntax validation of runtime modules (no build step).
- `npm test`: offline Node tests in `tests/` for input validation, legacy ownership and environment rules.
- `npm run test:integration`: actual HTTP API and adjacent frontend BetterAuth/JWKS integration; requires network/database access and the existing frontend dependencies. Optional FRONTEND_DIR points to a different frontend folder.

Integration verification creates uniquely named disposable users and facilities/bookings. It cleans up those users, sessions, accounts, bookings, facilities and explicitly tracked lock documents only. Original facility/booking documents are hashed before and after to check preservation. It does not drop databases/collections or rewrite existing records. BetterAuth-managed signing keys are retained. Avoid concurrent writes to existing records during this preservation check.

See [VERIFICATION.md](VERIFICATION.md) for actual results and [API_CONTRACT.md](API_CONTRACT.md) for implemented endpoints. Local tests cannot prove Vercel domain routing, deployment protection, or actual production environment values. After an explicitly authorized future deployment, check `/health`, public reads, allowed/disallowed origins, BetterAuth JWT issuance, ownership rejection, booking conflicts and logout revocation against the real domains.

References: [Vercel Express support](https://vercel.com/docs/frameworks/backend/express), [BetterAuth JWT plugin](https://better-auth.com/docs/plugins/jwt), [MongoDB transaction concurrency](https://www.mongodb.com/docs/manual/core/transactions-production-consideration/).

## Legacy configuration verification (2026-11-05)

- Read root `AGENTS.md` first. Its placeholder-route/test descriptions are older than the current code: facility detail reads MongoDB, and `npm test` now runs real tests. Existing application code was preserved.
- Added the exact requested legacy `vercel.json`; parsed it and asserted its complete structure. Root `index.js` already exports the Express app and guards local startup.
- `npm run check`: passed for all five runtime modules. `npm test`: 6 passed, 0 failed. `npm ls --depth=0`: all declared dependencies installed without missing/invalid packages. `git diff --check`: passed.
- Ran the installed Vercel CLI's `@vercel/nft` tracer against `index.js`: 432 files, including every runtime module and all five runtime packages; no `.env` or frontend files. Eight warnings concern optional packages: `kerberos`, `snappy`, `socks`, `gcp-metadata`, `mongodb-client-encryption`, `@aws-sdk/credential-providers`, `@mongodb-js/zstd`, and `supports-color`. These require attention only if the corresponding optional authentication, proxy, encryption, compression, or terminal-color features are needed. No mandatory import was missing. See [Vercel file tracing](https://vercel.com/kb/guide/how-can-i-use-files-in-serverless-functions).
- Local HTTP checks against the exported app passed: root 200, allowed-origin root 200 with CORS header, disallowed origin 403, preflight 204, unauthenticated facility ownership and booking reads 401, invalid facility ID 400, unknown route 404. The sandbox initially blocked localhost binding; the approved retry passed. These checks performed no database operations.
- Production import using the existing local `.env` failed as expected: `CLIENT_URL must use a public HTTPS origin in production.` Local `CLIENT_URL` and `AUTH_BASE_URL` are `http://localhost:3000`; `JWT_AUDIENCE` is unset. Production needs the real HTTPS frontend/auth origins and an explicit audience matching the frontend. The existing tests confirm that a valid production configuration imports successfully. `.env` was not changed.
- The integration script was intentionally not run: it creates and deletes database fixtures, conflicting with this request's no-data-deletion constraint. Live MongoDB, authenticated JWT/session round trips, and booking transactions were not exercised in this preparation.
- This was dependency tracing and local verification, not a complete `@vercel/node` build or deployment. Remote Vercel variables, MongoDB network access/permissions, frontend JWKS/session reachability, and real-domain routing remain unverified. Configure these before deployment. No commit, push, deployment, remote settings change, or data deletion was performed.
