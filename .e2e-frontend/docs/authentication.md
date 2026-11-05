# StudioSpace authentication

Current frontend deployment settings and backend availability results: [Vercel environment setup](vercel-environment.md).

The assignment rubric and production deployment URLs were not present in either repository. JWT cannot be confirmed as a rubric requirement yet. The existing BetterAuth session login remains the default. Set `API_AUTH_MODE=jwt` on both servers if the assignment requires JWT verification for protected API requests.

## Sessions and JWTs

Email/password and Google login use the same BetterAuth session. Its browser cookie is HTTP-only, host-only, and SameSite=Lax. HTTPS and production use Secure cookies. Do not set a shared cookie domain for unrelated Vercel deployments.

The browser calls `/api/backend/...` on the frontend domain. That Next.js handler checks the session and forwards only supported facility/booking operations to the configured Express server. This keeps cookies first-party across separate frontend/backend domains. Mutating requests require the configured frontend Origin. Browser-supplied authorization headers are not forwarded.

In optional JWT mode, the official BetterAuth JWT plugin issues an API credential on the Next.js server. Its payload contains the user subject (`sub`), session ID (`sid`), issuer, audience, issue time, and five-minute expiration. It contains no password, session token, OAuth credential, or signing secret. JWTs are not saved in browser storage or a second login cookie. HTTP `/api/auth/token` is disabled; internal `auth.api.getToken()` issues tokens. Only public signing keys are exposed at `/api/auth/jwks`.

Express verifies the JWT signature using those public keys and checks the issuer, audience, required claims, algorithm, and expiry. It also verifies the live BetterAuth session and compares its user and session IDs with the JWT. Logging out or expiring the session therefore rejects subsequent requests even if a JWT has not expired. The JWT augments the existing session; it does not create another login system. No custom refresh-token system is needed: the Next.js server issues a fresh short-lived API token from an active session for each protected request.

## Ownership and public pages

- Facilities store the session user's ID as `ownerId`. Ownerless records are never guessed or assigned.
- Bookings store the session user's ID as `userId`. Existing email-only records retain the established session-email fallback only when `userId` is absent.
- Express ignores frontend ownership fields, filters private lists, and checks ownership before updates/deletes.
- Missing/expired/invalid authentication returns 401. Another owner's resource returns 403. Missing resources return 404. Authentication infrastructure failures return 503 without allowing access.
- All Facilities, Featured Facilities, and Facility Details remain public. Creating a booking requires login.

## Frontend server environment

Configure these in the **frontend Vercel project**, using its exact canonical production domain:

```dotenv
BETTER_AUTH_URL=https://YOUR-ACTUAL-FRONTEND-DOMAIN.vercel.app
BETTER_AUTH_SECRET=GENERATE_A_PRIVATE_RANDOM_SECRET_OF_AT_LEAST_32_CHARACTERS
MONGODB_URI=YOUR_PRIVATE_AUTH_DATABASE_CONNECTION
BACKEND_URL=https://studiospace-server-ndqc56sxs-nur-alam1.vercel.app
API_AUTH_MODE=session
# Required on both servers when API_AUTH_MODE=jwt; values must match exactly:
JWT_AUDIENCE=studiospace-api
# Configure these to enable the existing Google sign-in button:
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_PRIVATE_GOOGLE_CLIENT_SECRET
```

None of the secrets above should have a `NEXT_PUBLIC_` prefix. `NEXT_PUBLIC_API_URL` remains a legacy fallback for the server's public API address; browser API requests now use the same-origin handler. Prefer `BACKEND_URL` for deployment configuration.

## Express server environment

Configure these in the **backend Vercel project**:

```dotenv
MONGODB_URI=YOUR_PRIVATE_STUDIO_DATABASE_CONNECTION
CLIENT_ORIGIN=https://YOUR-ACTUAL-FRONTEND-DOMAIN.vercel.app
AUTH_BASE_URL=https://YOUR-ACTUAL-FRONTEND-DOMAIN.vercel.app
API_AUTH_MODE=session
JWT_AUDIENCE=studiospace-api
```

The backend does not need the BetterAuth signing secret or Google secret. Keep its existing `A08` facility/booking database. BetterAuth continues using the database selected by the frontend's existing MongoDB URI. MongoDB creates the JWT plugin's `jwks` collection when a signing key is first needed. Its private keys are encrypted using the BetterAuth secret; keep that secret stable between deployments.

For local development, use `http://localhost:3000` for the auth/frontend origins and `http://localhost:4000` for `BACKEND_URL`. HTTP localhost uses non-Secure HTTP-only cookies. Production refuses HTTP origins. Set the same auth mode and JWT audience on both deployments and redeploy them together; mismatched modes fail closed.

## Google configuration

Keep the current Google button and BetterAuth sign-in flow. Add these authorized redirect URIs in the Google Cloud OAuth client:

- `http://localhost:3000/api/auth/callback/google`
- `https://YOUR-ACTUAL-FRONTEND-DOMAIN.vercel.app/api/auth/callback/google`

Use the corresponding Google client ID and secret on the frontend server. No Google provider credentials were configured in the inspected local environment, so an actual Google account login cannot be verified until they are supplied. Never paste secrets into frontend code or this document.

## Deployment verification

The backend URL is configured above. The production frontend domain has not been supplied; production login has not been verified. After setting the actual domains and redeploying:

1. Sign in with email/password and Google. Inspect the browser cookie for HttpOnly, Secure, SameSite=Lax, and a host-only frontend scope.
2. Verify anonymous public facility pages load and private dashboard visits redirect to login.
3. Use two accounts to create facilities/bookings. Check private lists and attempt cross-account changes through the backend; expect 403.
4. Verify anonymous and logged-out API requests return 401, and unknown IDs return 404.
5. In JWT mode, missing, tampered, expired, wrong-issuer, and wrong-audience API tokens must fail. Browser network requests must not contain API bearer tokens.
6. Confirm no localhost requests, secrets, or tokens appear in frontend code, browser storage, or production client network calls.

Official references: [BetterAuth cookies](https://better-auth.com/docs/concepts/cookies), [JWT plugin](https://better-auth.com/docs/plugins/jwt), [Google provider](https://better-auth.com/docs/authentication/google), [Express on Vercel](https://vercel.com/docs/frameworks/backend/express).

## Completed local verification — November 5, 2026

| Verification | Actual result |
| --- | --- |
| Session-mode API and desktop/mobile booking browser tests | 12 grouped checks passed, including confirmation, cancellation, loading, errors, deletion, and unchanged pre-existing bookings |
| Session-mode facility ownership regression tests | 15 grouped checks passed with three disposable accounts |
| JWT-mode integration tests | 11 grouped checks passed using the actual auth configuration, Next.js forwarding handler, and Express backend on isolated local ports |
| Production configuration tests | 3 checks passed for cookie flags, configurable HTTPS origins/provider wiring, and rejection of an HTTP backend URL |
| TypeScript, ESLint for changed source files, Express syntax | Passed |
| Production build with JWT mode and placeholder HTTPS domains | Passed after moving aside a build cache containing sandbox port-permission errors |
| Actual Google OAuth login and production Vercel authentication | Not verified: Google credentials and production domains were not supplied |
| Assignment JWT requirement | Not confirmed: assignment rubric was not supplied or found in the repositories |

JWT tests included valid signatures, tampered and expired tokens, wrong issuer/audience/algorithm, future activation, session/account mismatches, logout revocation, expired sessions, CSRF-origin rejection, safe proxy routes, owner-only facility/booking operations, and public Facility Details. Test-created accounts and facility/booking records were cleaned up. No pre-existing bookings were deleted. Tests did not deploy either project, change the running app's default session mode, or create Git commits/pushes.
