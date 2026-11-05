# Fresh StudioSpace backend deployment preparation

No deployment, Vercel project creation/deletion, Git commit or push is part of this preparation. Choose the real frontend and backend production domains before configuring either app. Do not reuse old preview/deployment IDs as configuration.

## Runtime

Vercel's current Express support detects the root `index.js` default app export from the Express dependency. The old `builds`/catch-all `routes` vercel.json has been removed; no replacement is needed. The ignored old CLI link was archived locally at `/tmp/studiospace-audit/vercel-project.previous.json`; a future deployment will need an explicit fresh project link. No remote project was changed. Select Express automatic detection and the A-08-server root for the future project. Use Node.js 24.x (the locally tested version is 24.14.1). This is JavaScript with no compilation/build step. Leave custom build/output overrides unset. `npm start` is for local runtime; Vercel invokes the exported app without the local listener.

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
