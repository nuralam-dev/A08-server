# StudioSpace Vercel environment setup

BetterAuth runs in the **Next.js frontend**, at `/api/auth`. Express serves facilities and bookings. Keep those two addresses separate.

Browser requests deliberately use the relative `/api/backend` route. The Next.js server reads the Express origin from `BACKEND_URL`, or from `NEXT_PUBLIC_API_URL` when that override is absent. It retrieves BetterAuth JWTs server-side and forwards them to Express in JWT mode. Changing browser calls to the remote Express URL would bypass this existing flow and would prevent the frontend's host-only session cookie from reaching the API on another domain.

## Local files

- Frontend: use `.env.local`. The existing `.env` remains a fallback and was not overwritten. Do not replace an existing secret with the example placeholder.
- Backend: keep the existing `.env`. Merge only missing variables from its `.env.example`.
- Both repositories ignore `.env*`, with an exception for the safe `.env.example` templates.
- The examples enable `API_AUTH_MODE=jwt`. Set the same mode and audience on both apps. Existing environment files were not changed to enable JWT automatically; installations using session mode continue to work.

Next.js gives `.env.local` priority over `.env`. Do not put contradictory URLs in those files. `BETTER_AUTH_URL` and `NEXT_PUBLIC_AUTH_URL`, when both present, must name the same frontend origin.

## Exact frontend Vercel variables

Set these in the **frontend Vercel project's Production environment**, then rebuild. Replace the domain and private-value placeholders with your own values:

```dotenv
NEXT_PUBLIC_API_URL=https://studiospace-server-ndqc56sxs-nur-alam1.vercel.app
BETTER_AUTH_URL=https://YOUR-ACTUAL-FRONTEND-DOMAIN.vercel.app
BETTER_AUTH_SECRET=your-existing-private-random-secret-at-least-32-characters
MONGODB_URI=your-private-production-auth-database-connection
API_AUTH_MODE=jwt
JWT_AUDIENCE=studiospace-api
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-private-google-client-secret
```

`BACKEND_URL` is an optional **server-only override**. If you already use it, set it to `https://studiospace-server-ndqc56sxs-nur-alam1.vercel.app` too, or remove it from Vercel so `NEXT_PUBLIC_API_URL` takes effect. Never leave a development override in Production. Google variables are required for Google login; both may remain unset only when Google login is not being used.

`NEXT_PUBLIC_AUTH_URL` is optional: the existing browser client uses the current origin when it is absent. Prefer leaving it unset in Vercel. If you set it, use exactly the same origin as `BETTER_AUTH_URL`; a stale localhost value is rejected. `NEXT_PUBLIC_API_URL` is public. MongoDB credentials, the BetterAuth secret, Google secrets, and signing keys must never use that prefix. Public values are normally baked into the client at build time, so redeploy/rebuild after changing them. [Next.js environment-variable documentation](https://nextjs.org/docs/app/guides/environment-variables)

## Exact backend Vercel variables

Set these in the **backend Vercel project's Production environment**:

```dotenv
CLIENT_URL=https://YOUR-ACTUAL-FRONTEND-DOMAIN.vercel.app
AUTH_BASE_URL=https://YOUR-ACTUAL-FRONTEND-DOMAIN.vercel.app
MONGODB_URI=your-private-production-studio-database-connection
API_AUTH_MODE=jwt
JWT_AUDIENCE=studiospace-api
```

`AUTH_BASE_URL` defaults to the configured frontend origin. It must point at Next.js, not Express. `CLIENT_ORIGIN` remains a legacy fallback when `CLIENT_URL` is missing. Prefer `CLIENT_URL` for new deployments. `PORT=4000` is a local-development setting; Vercel manages the deployed HTTP listener. Express exports its app, and the local listener runs only outside Vercel. The backend's existing `vercel.json` maps routes to `index.js`. [Express on Vercel](https://vercel.com/docs/frameworks/backend/express)

Do not copy the frontend's BetterAuth secret or Google secret into the backend: Express uses public JWKS and the existing session-verification endpoint. The JWT issuer and JWKS address are derived from `AUTH_BASE_URL`; no separate hardcoded issuer/JWKS URL is needed. `JWT_AUDIENCE` must match exactly on both projects. Use Node.js 22 or 24 in both Vercel projects; the installed Next.js and MongoDB packages require Node.js 20.9+ and 20.19+ respectively. [Vercel Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)

## Google callback

In the Google Cloud OAuth client, authorize:

```text
https://YOUR-ACTUAL-FRONTEND-DOMAIN.vercel.app/api/auth/callback/google
```

Keep the local callback `http://localhost:3000/api/auth/callback/google` for development. The production callback is derived from the configured BetterAuth frontend URL. It is not hardcoded into the login form.

## Intentional local and fixed addresses

- `http://localhost:3000`: development-only auth/frontend defaults and documentation.
- `http://localhost:4000`: development-only Express/JWT audience defaults and documentation.
- `mongodb://127.0.0.1:27017/...`: safe local database examples, never production credentials.
- Loopback names/IPs in validation code: used to reject them in production, not as request targets.
- `https://studiospace.local` in login redirect validation: a fixed parsing origin used to reject external redirects. No network request is sent there; making it deployment-dependent is unnecessary.
- Social links, documentation links, and image URL placeholders are not API/auth base URLs.

No WebSocket connection URLs were found. Page components contain no direct localhost API calls. Featured Facilities and Facility Details use the server URL utility; All Facilities, Add/Manage Facilities, Booking Form, My Bookings, and Delete Booking retain the same-origin API route.

## Remaining deployment setup

The deployed Express origin is configured above. The production frontend domain is still needed to finish BetterAuth, CORS, and OAuth configuration; deployed login has not been verified. Before deployment, supply the production variables above, configure Google credentials/callbacks, and allow the deployed services to connect to MongoDB. Do not use the example local MongoDB URI on Vercel. If Vercel Deployment Protection restricts the auth frontend, Express must still be able to reach `/api/auth/get-session` and `/api/auth/jwks`; otherwise authentication fails closed.

Use matching frontend URLs in BetterAuth, the public SDK configuration, and backend CORS/auth settings. Do not add wildcard trusted origins or a shared `.vercel.app` cookie domain. Existing HTTP-only, Secure production cookies and ownership checks are retained. Preview deployments need their own matching frontend URL configuration and OAuth redirect registration if Google login is tested there.

## Backend availability checked

Read-only requests to the supplied deployed backend returned:

| Request | Result |
| --- | --- |
| `GET /` | HTTP 302 to `https://vercel.com/sso-api` |
| `GET /facilities` | HTTP 302 to `https://vercel.com/sso-api` |

Public API JSON was not retrieved. The supplied deployment is behind Vercel SSO authentication. Make the intended API deployment public for application requests, or supply an accessible production API URL, before expecting the frontend to load facilities. A successful frontend build does not prove that the remote backend is accessible. No production account, facility, or booking record was created, edited, or deleted.

The existing Express source verifies JWT signatures through JWKS and checks issuer, audience, expiration, and the active session. Live deployed JWT validation, user-specific lists, and mutations could not be tested through the SSO redirect. BetterAuth and its Google provider configuration were preserved; complete Google OAuth login remains unverified without the real frontend domain and credentials.

## Frontend deployment steps

1. Resolve backend Deployment Protection so anonymous `GET /facilities` returns API JSON rather than Vercel SSO. No access-control settings were changed automatically.
2. In Vercel, import the existing frontend repository. This repository's root is `a-08-client`, so use Root Directory `.` when importing that repository by itself. Use `a-08-client` only if importing its parent directory as a monorepo.
3. Select the **Next.js** framework, `npm ci` as the install command, and `npm run build` as the build command. Keep the framework's default output directory. Use Node.js 22 or 24. No frontend `vercel.json` is required or was created.
4. Obtain the actual frontend HTTPS origin from the Vercel project's Domains settings. Enter the frontend environment variables listed above before the production build. Do not enter the frontend placeholder as a real auth origin. If an initial build ran before these variables were available, configure them and redeploy.
5. Set `BETTER_AUTH_URL` to that real frontend origin. Leave `NEXT_PUBLIC_AUTH_URL` unset, or set it to exactly the same origin. Preserve the existing private BetterAuth secret and auth MongoDB database. Rebuild after changing public variables.
6. In the backend Vercel project, update **both `CLIENT_URL` and `AUTH_BASE_URL`** to the real frontend HTTPS origin and redeploy the backend. Keep `API_AUTH_MODE=jwt` and `JWT_AUDIENCE=studiospace-api` aligned on both projects.
7. Register the real frontend's `/api/auth/callback/google` URL in Google Cloud and configure the existing Google provider credentials on the frontend server.
8. Redeploy the frontend after setting its final variables. Verify public facility pages, email/password and Google login, private dashboard lists, ownership checks, and facility/booking operations with your own test accounts. No deployment was performed as part of this preparation.

## Production build failure and fix

The local `.env` sets `BETTER_AUTH_URL=http://localhost:3000`. The local `.env.local` sets `NEXT_PUBLIC_AUTH_URL=http://localhost:3000`, `BACKEND_URL=http://localhost:4000`, and `NEXT_PUBLIC_API_URL=http://localhost:4000`. These files were not overwritten. Next.js loads `.env.local` before `.env`, including during `next build`, and process environment values take priority over both.

The first failure was specifically `BETTER_AUTH_URL` from `.env`, because it takes priority over `NEXT_PUBLIC_AUTH_URL` in the auth configuration. Correcting only that variable leaves the public auth URL mismatch and the localhost backend override to fix.

Previously importing `auth.ts` validated configuration, constructed the MongoDB client and initialized BetterAuth while Next.js collected route data. The server-only `getAuth()` now validates and initializes one cached instance on first use by a request. Auth handlers, the backend proxy, dashboard session helper and Next.js proxy all use this accessor. Importing a route no longer requires a live auth configuration. Production requests still reject HTTP/local origins, mismatched frontend origins, missing secrets/database configuration and missing JWT audience. No build-phase security bypass was added.

The actual production frontend domain is not recorded in this checkout. Obtain it from Vercel **Settings → Domains**; documentation placeholders are not deployable configuration. The production frontend `BETTER_AUTH_URL`, backend `CLIENT_URL` and backend `AUTH_BASE_URL` must all be that same origin. BetterAuth uses it for its base URL and JWT issuer; Express derives the expected issuer and `/api/auth/jwks` URL from `AUTH_BASE_URL`. Keep the existing shared JWT audience on both apps. MongoDB and BetterAuth secrets stay server-only.

For a local production build, supply process environment overrides for **all four** localhost URL variables (without editing `.env` or `.env.local`): `BETTER_AUTH_URL` and `NEXT_PUBLIC_AUTH_URL` must be the real frontend HTTPS origin; `BACKEND_URL` and `NEXT_PUBLIC_API_URL` must be `https://studiospace-server-ndqc56sxs-nur-alam1.vercel.app`. Use the existing private production MongoDB URI and BetterAuth secret, and matching `API_AUTH_MODE`/`JWT_AUDIENCE` when verifying JWT configuration. Do not put secrets in a public environment variable or commit them.

A successful build alone does not verify authentication or API availability. After manually configuring and deploying both projects, verify login, HTTP-only Secure cookies, private facility/booking requests and the public JWKS endpoint. No environment files, deployment settings, database records, commits or pushes are changed by this fix.

## Verification for this fix

- `npm run build`: passed, exit code 0; both API routes collected successfully and all 15 static pages generated. The sandboxed attempt stalled at compilation and was interrupted; the subsequent build outside the sandbox passed.
- The successful build used the unchanged local environment files. It verifies deferred initialization, **not a valid production deployment configuration**. A build using the actual frontend domain is pending because that domain has not been supplied or found in this checkout. No substitute frontend domain was used.
- TypeScript, ESLint and whitespace checks passed. Focused isolated checks verified that module import does not initialize BetterAuth/MongoDB, production still rejects HTTP/localhost origins, development accepts localhost, and the auth instance is cached.
- Live production authentication and JWT verification have not been tested.
