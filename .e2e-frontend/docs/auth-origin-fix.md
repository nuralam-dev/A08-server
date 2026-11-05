# Production authentication origin fix

## Cause confirmed on November 5, 2026

Vercel's current Production environment had:

```text
BETTER_AUTH_URL=https://studiospace-client-6ra7owdjf-nur-alam1.vercel.app
NEXT_PUBLIC_AUTH_URL=(unset)
API_AUTH_MODE=(unset; existing default is session)
JWT_AUDIENCE=(unset)
```

The supplied browser page uses origin `https://studiospace-client-icm9qam2d-nur-alam1.vercel.app`. The original code configured `baseURL` from `BETTER_AUTH_URL` and `trustedOrigins: [baseURL]`, trusting the older deployment rather than the current page. BetterAuth rejects an untrusted signup/signin origin with `Invalid origin`. The current Production settings were read using the authenticated Vercel CLI; these do not independently prove what values were embedded in every historical build.

`vercel inspect` confirmed this is a Production deployment and lists these aliases:

- `https://studiospace-client-topaz.vercel.app` — use this stable project alias as canonical.
- `https://studiospace-client-nur-alam1.vercel.app` — another alias; not automatically trusted by this fix.

Read-only `/api/auth/get-session` on the stable topaz alias returned HTTP 200 with `null` (no session cookie supplied). The supplied deployment-specific domain returned HTTP 302 to Vercel Authentication without a Vercel login. That protection is separate from BetterAuth origin validation and was not changed.

## Exact manual Vercel changes

In the **studiospace-client** project → Settings → Environment Variables → **Production**:

```dotenv
BETTER_AUTH_URL=https://studiospace-client-topaz.vercel.app
AUTH_TRUSTED_ORIGINS=https://studiospace-client-icm9qam2d-nur-alam1.vercel.app
```

Keep `NEXT_PUBLIC_AUTH_URL` unset. If you retain it, it must equal `https://studiospace-client-topaz.vercel.app`. Do not point authentication at Express. Preserve `BETTER_AUTH_SECRET`, `MONGODB_URI`, and existing provider secrets. Do not change authentication mode as part of this origin correction.

The canonical origin is always trusted. `AUTH_TRUSTED_ORIGINS` is an optional, server-only, comma-separated list of exact additional frontend origins you deliberately approve. The setting above trusts the specific deployment requested in this task. Replace or remove obsolete entries when deployments change; no Vercel wildcard or request-header inference is used. In Production, localhost, HTTP, paths, credentials, query strings, and wildcard origins are rejected. Review Preview variables separately; Production settings should not be replaced by localhost values.

In the backend project, align `CLIENT_URL` and `AUTH_BASE_URL` with `https://studiospace-client-topaz.vercel.app`. Preserve the current authentication mode. If JWT mode is already used or enabled separately, keep both applications' `API_AUTH_MODE=jwt` and matching `JWT_AUDIENCE`; `AUTH_BASE_URL` must match the canonical issuer because the backend loads `/api/auth/jwks` there. Changing a JWT issuer can invalidate tokens issued under the previous issuer. Prefer using the canonical website for sign-in and dashboard use.

Manually redeploy the frontend with the updated code and settings; redeploy the backend if its settings change. No environment values were changed remotely and no deployment was performed in this task.

For Google login, retain the provider configuration and register the canonical callback `https://studiospace-client-topaz.vercel.app/api/auth/callback/google` in Google's authorized redirect URIs if that provider is enabled.

## Code changes

- `src/lib/auth-origins.ts`: validates the canonical origin and explicit additional origins, with separate development/production validation.
- `src/lib/auth.ts`: uses those validated origins; preserves MongoDB adapter, email/password, session lookup, HTTP-only cookies, and JWT configuration.
- `src/lib/auth-client.ts`: browser requests explicitly use the current page origin and `/api/auth`, so an old public URL cannot send login cookies to another host.
- `src/app/api/backend/[...path]/route.ts`: protected writes use the same exact allowlist as BetterAuth. Session/JWT checks remain mandatory; missing and untrusted origins are still rejected.
- `.env.example`: documents the optional allowlist and canonical Production settings.
- `scripts/check-auth.cjs`: exercises the real auth and dashboard guard configuration with isolated memory storage in place of the MongoDB adapter. Run `node scripts/check-auth.cjs`. No MongoDB connection or production account creation occurs.

Cookies remain host-only. A login on a deployment alias does not log the browser into the stable domain; use the same host for sign-in and the dashboard. Do not broaden cookie domains to work around this.

## Local development and verification

Keep local `BETTER_AUTH_URL=http://localhost:3000` and `NEXT_PUBLIC_AUTH_URL=http://localhost:3000` (or unset the public value). Leave `AUTH_TRUSTED_ORIGINS` empty unless you deliberately use another local frontend port. Do not copy the Production alias list into local settings.

The isolated checks cover signup, signin, secure HTTP-only session cookies, session retrieval, anonymous dashboard redirects, authenticated dashboard access, valid JWT signature/issuer/audience/session claims, disabled browser token endpoint, rejection of untrusted origins and wildcards, and separate localhost configuration. Actual production signup was not attempted because it would create a production database record. After manual redeployment, verify signup/signin yourself on the canonical domain, `/api/auth/get-session` with the resulting cookie, and `/dashboard/add-facility`.

BetterAuth documents its base URL and trusted-origin behavior in [Options](https://better-auth.com/docs/reference/options) and its CSRF/origin checks in [Security](https://better-auth.com/docs/reference/security). Origin validation and CSRF protection remain enabled.
