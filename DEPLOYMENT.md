# StudioSpace Vercel configuration

Deploy `a-08-client` as the Next.js project and `A-08-server` as the Express project. Do not deploy the older `studio-space-client` / `studio-space-server` folders for this app. Express exports its app from `index.js`; the local listener only runs outside Vercel. The existing `vercel.json` maps incoming routes to `index.js`; no additional dependency is needed.

## Frontend Vercel environment

Set these in the frontend project, replacing the domain placeholders with your actual domains:

```dotenv
NEXT_PUBLIC_API_URL=https://YOUR-BACKEND.vercel.app
NEXT_PUBLIC_AUTH_URL=https://YOUR-FRONTEND.vercel.app
BACKEND_URL=https://YOUR-BACKEND.vercel.app
BETTER_AUTH_URL=https://YOUR-FRONTEND.vercel.app
BETTER_AUTH_SECRET=YOUR_EXISTING_PRIVATE_RANDOM_SECRET
MONGODB_URI=YOUR_PRIVATE_AUTH_DATABASE_CONNECTION_STRING
API_AUTH_MODE=jwt
JWT_AUDIENCE=studiospace-api
# Optional Google provider (configure both to enable):
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_PRIVATE_GOOGLE_CLIENT_SECRET
```

Keep the existing BetterAuth secret stable. BetterAuth stores signing keys in MongoDB; do not add JWT private keys or secrets to public variables. Use the existing auth database selected by your frontend MongoDB URI. `NEXT_PUBLIC_` variables are public and require a rebuild when changed.

`BACKEND_URL` is the private server-side override; `NEXT_PUBLIC_API_URL` is the fallback. Set both to the same backend origin. `BETTER_AUTH_URL` and `NEXT_PUBLIC_AUTH_URL` must identify the same frontend origin. No trailing path or `/api/auth` suffix belongs in these origin values.

Browser facility and booking requests intentionally keep using `/api/backend`. Next.js reads the configured backend origin and forwards the active HTTP-only session cookie plus a fresh Bearer token in JWT mode. Featured Facilities and Facility Details use the existing server-side URL utility. BetterAuth client calls stay on the frontend origin. Direct browser requests to a separate backend domain would lose the existing first-party cookie flow.

## Backend Vercel environment

```dotenv
CLIENT_URL=https://YOUR-FRONTEND.vercel.app
AUTH_BASE_URL=https://YOUR-FRONTEND.vercel.app
MONGODB_URI=YOUR_PRIVATE_FACILITIES_DATABASE_CONNECTION_STRING
API_AUTH_MODE=jwt
JWT_AUDIENCE=studiospace-api
```

`AUTH_BASE_URL` defaults to `CLIENT_URL`. `CLIENT_ORIGIN` remains supported for existing installations when `CLIENT_URL` is absent. CORS permits the configured frontend origin and credentials. Express derives the JWT issuer, `/api/auth/jwks`, and live session verification URL from `AUTH_BASE_URL`. The JWT audience must match the frontend exactly. Express keeps using database `A08`.

Vercel supplies runtime configuration; `PORT=4000` is only needed for local development. Neither BetterAuth nor Google secrets belong on the backend. Existing installations default to session mode; these production examples explicitly enable the existing JWT plugin on both apps.

## Local development

Keep backend credentials in `.env` and frontend credentials in `.env.local` (Next.js also continues loading the existing `.env`). Use each app's `.env.example` to discover variable names; copy only missing values rather than replacing existing secrets. The newly created frontend `.env.local` contains URL overrides only; existing secrets remain in `.env`. If using custom development ports, update the corresponding environment values. Start Express with `node index.js` and Next.js with `npm run dev`.

Intentional local references remain in development-only defaults, example environment files, README instructions, and Google callback documentation. `https://studiospace.local` in AuthForm is an inert base for validating relative redirect destinations; it is never requested. There are no WebSocket URLs. Production rejects local or HTTP auth/API origins. Production JWT mode requires an explicit audience.

## Before deployment

- Replace placeholders and set variables in both Vercel projects before building. Production builds intentionally reject local auth origins.
- Enable MongoDB access from the deployed apps and use the existing correct databases. Both apps require their own `MONGODB_URI` setting.
- For Google sign-in, register `https://YOUR-FRONTEND.vercel.app/api/auth/callback/google` in your OAuth client's authorized redirect URIs. Keep the localhost callback for local development.
- Use matching frontend domains across auth, CORS, and OAuth. Preview domains require matching configuration and OAuth registration; arbitrary origins are not trusted.
- Ensure backend-to-frontend session/JWKS requests are permitted by any Vercel deployment protection settings.
- After deployment, verify public listings and details, sign-in/out, facility ownership, booking creation/list/deletion, rejection of invalid Bearer tokens, and Secure/HttpOnly/SameSite=Lax cookies. Actual production domains and OAuth credentials have not been tested here.
- `GET /facilities/:id` still returns its existing placeholder. Facility Details continues resolving the record through `GET /facilities`.

References: [Express on Vercel](https://vercel.com/docs/frameworks/backend/express), [BetterAuth JWT plugin](https://github.com/better-auth/better-auth/blob/main/docs/content/docs/plugins/jwt.mdx). Next.js environment behavior was checked against the installed Next.js documentation.
