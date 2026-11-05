# StudioSpace deployment preparation

No deployment, project creation, project deletion, commit, push, secret replacement, or `.vercel` linkage change was performed.

## Local development

Preserve existing `.env` / `.env.local` secrets. Add only missing variables from `.env.example`. `.env.local` overrides `.env`.

Frontend URL settings for local development:

```dotenv
BACKEND_URL=http://localhost:4000
BETTER_AUTH_URL=http://localhost:3000
API_AUTH_MODE=jwt
JWT_AUDIENCE=studiospace-api
```

Keep the existing `BETTER_AUTH_SECRET` and auth `MONGODB_URI`. The default API auth mode is now JWT, matching the current Express server. An explicit legacy `API_AUTH_MODE=session` is incompatible with that backend. Restart Next.js after changing server variables.

In `../A-08-server`, use `CLIENT_URL=http://localhost:3000`, `AUTH_BASE_URL=http://localhost:3000`, `API_AUTH_MODE=jwt`, and the exact same `JWT_AUDIENCE`. Preserve its facilities database credentials. Start the backend with its existing start script and the frontend with `npm run dev`. Verify `http://localhost:4000/health` reports the database connected.

## Required frontend hosting variables

| Variable | Value / purpose |
| --- | --- |
| `BACKEND_URL` | Actual Express HTTPS origin, without a path or query. Required for API access. |
| `BETTER_AUTH_URL` | Actual canonical frontend HTTPS origin, without `/api/auth`. Required for auth. |
| `BETTER_AUTH_SECRET` | Existing private stable BetterAuth secret; at least 32 characters. |
| `MONGODB_URI` | Existing private BetterAuth database connection, including the intended database. |
| `API_AUTH_MODE` | `jwt`. |
| `JWT_AUDIENCE` | Same explicit value as backend; e.g. `studiospace-api`. |
| `AUTH_TRUSTED_ORIGINS` | Optional comma-separated exact additional approved frontend HTTPS origins; no wildcards. |
| `GOOGLE_CLIENT_ID` | Optional, paired with the private Google secret. |
| `GOOGLE_CLIENT_SECRET` | Optional private Google secret. |

The browser derives auth origin from its current host. `NEXT_PUBLIC_AUTH_URL` is unnecessary; if retained, it must exactly match `BETTER_AUTH_URL`. `NEXT_PUBLIC_API_URL` is a supported legacy fallback for `BACKEND_URL`; prefer the private variable. Never place MongoDB credentials, auth secrets, Google secrets, or private JWT material in `NEXT_PUBLIC_` variables.

There is no fake production domain in application configuration. Copy the actual origin from the eventual frontend project's Domains settings. Local HTTP values must not be copied into Production or hosted Preview settings. Configure each environment separately.

## Backend hosting configuration

Set these on the existing backend when deployment is authorized:

- `CLIENT_URL`: exact canonical frontend HTTPS origin for credentialed CORS.
- `AUTH_BASE_URL`: same frontend origin for live session verification.
- `API_AUTH_MODE=jwt`.
- `JWT_AUDIENCE`: identical to frontend.
- `JWT_ISSUER`: frontend canonical origin, or omit to inherit `AUTH_BASE_URL`.
- `JWT_JWKS_URL`: frontend origin followed by `/api/auth/jwks`, or omit to derive it.
- Existing private facilities `MONGODB_URI` and `MONGODB_DB_NAME` (`A08` by default).

Remove conflicting old `CLIENT_ORIGIN` values from hosting settings, or make them identical to `CLIENT_URL`. An additional trusted frontend alias alone does not configure backend CORS or Google OAuth. Prefer one canonical production frontend domain.

MongoDB must permit connections from both deployed servers. Backend-to-frontend requests to `/api/auth/jwks` and `/api/auth/get-session` must be reachable under hosting access controls. The Express API must return JSON rather than a hosting login/redirect page.

## API / auth architecture

Browser facility and booking calls use `/api/backend/...` on the frontend host. The restricted Next.js route forwards only approved API paths. Private operations verify the actual BetterAuth session and attach a short-lived server-issued JWT plus the session cookie. Express verifies JWT signature, issuer, audience, expiry, and matching live session. Browser-provided bearer headers are not trusted. The browser token endpoint remains disabled.

Public Server Components (featured facilities and details) fetch Express directly with `getBackendURL()`; a server calling its own proxy would add an unnecessary hop. Both paths use the same backend setting. No private data is cached.

CSRF protection, exact trusted origins, and HTTP-only cookies remain enabled. Production cookies are Secure and SameSite=Lax. Do not disable these checks to fix a domain mismatch.

Current routes verified from `../A-08-server/index.js`:

| Method / path | Response |
| --- | --- |
| `GET /facilities` | All facility records as an array. |
| `GET /facilities/featured` | Latest six facilities as an array. |
| `GET /facilities/:id` | One facility; 404 if absent. |
| `GET /facilities/mine` | Signed-in owner's facilities as an array. |
| `POST /facilities` | MongoDB acknowledged insertion, HTTP 201. |
| `PATCH /facilities/:id` | Owner-only update with `matchedCount`. |
| `DELETE /facilities/:id` | Owner-only deletion with `deletedCount`. |
| `POST /facilities/booking` | Insertion of verified user's booking, HTTP 201. |
| `GET /facilities/booking` | Signed-in user's bookings as an array. |
| `DELETE /facilities/booking/:id` | Own booking deletion with `deletedCount`. |

`API_CONTRACT.md` was not present in either adjacent backend or the wider local project search. The table documents implemented routes, not a claim to have read the missing contract. Reconcile it with the actual contract when supplied.

## Images

`FacilityImage` accepts a string or array, tries subsequent valid image candidates if loading fails, and shows a local unavailable placeholder if none work. Database-provided external images load directly in the browser; they do not use Next.js image optimization or depend on an optimizer host allowlist. This avoids broadening the image optimizer to arbitrary hosts. Existing static images remain optimized. Known image host remote patterns are preserved.

A record currently points to `https://www.woxo.com.au`, which is a website rather than a direct image. Its placeholder is intentional; the stored value was not rewritten. Owners should replace invalid URLs explicitly. External HTTP images can be blocked as mixed content on HTTPS pages; use valid public HTTPS image files. External hosts may also block hotlinking or become unavailable.

## Vercel settings and release steps (do not execute until authorized)

1. Use this existing `a-08-client` directory as the frontend root. Select **Next.js**, install with `npm ci`, build with `npm run build`, and keep the default framework output directory. Use a Node version satisfying the installed Next.js package engines (tested locally with Node 24.14.1).
2. Confirm the intended frontend domain and backend origin. Set the variables above in the correct Production scope before the release. Preserve existing secrets. Do not import obsolete project IDs or old aliases from earlier deployment attempts.
3. Coordinate backend environment settings with that exact frontend origin. Do not leave previous deployment domains in `AUTH_BASE_URL`, `JWT_ISSUER`, `JWT_JWKS_URL`, or CORS settings. A backend redeployment is required for its changed environment to apply.
4. If Google is enabled, register the exact frontend origin plus `/api/auth/callback/google` as an authorized redirect URI in the existing OAuth client. Keep the local callback if needed.
5. Run `npx tsc --noEmit`, `npm run lint`, and `npm run build`. No `vercel.json` is needed for this frontend. No new Vercel project is required by the source changes; project selection/creation remains the owner's decision.
6. Only after authorization, release using the intended Vercel project workflow. Do not run `vercel`, link projects, or push merely to validate this preparation.

## Pre-release credential follow-up

A test-runner parsing error printed a MongoDB connection string into this session tool output. Rotate that database credential before deployment, update its private consumers together, and recheck connectivity. Existing secrets were deliberately not overwritten during this task.

## After an authorized deployment

Verify the backend health endpoint, homepage's six real records, all facilities count, category links and search, detail route, image loading/fallback, and sign-in prompt for visitors. Verify sign-in/out and production cookie attributes. Use disposable test accounts and dedicated test records for add/edit/delete, booking creation/deletion, account separation, and rejected unauthorized mutations. Never modify existing production listings or bookings for a smoke test.

A frontend build passing does not validate hosting variables, OAuth credentials, remote access policies, or production MongoDB networking. Diagnose failures by layer: proxy configuration, auth/database/JWKS/session verification, and upstream API/database. Proxy errors now identify which layer is unavailable without exposing credentials.
