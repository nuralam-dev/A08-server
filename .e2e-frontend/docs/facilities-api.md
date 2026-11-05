# Facilities API connection

The browser requests `/api/backend/facilities` on the frontend origin. Next.js forwards it to `${BACKEND_URL}/facilities`, falling back to `NEXT_PUBLIC_API_URL` only when `BACKEND_URL` is unset. Public listings do not need a BetterAuth session. Protected routes retain their session, JWT, and origin checks.

## Live check on November 5, 2026

Unauthenticated GET requests to both supplied deployment URLs returned HTTP **302**, with a Location pointing to `https://vercel.com/sso-api` and a body saying `Protected by Vercel Authentication`:

- `https://studiospace-server-ndqc56sxs-nur-alam1.vercel.app/facilities`
- `https://studiospace-client-icm9qam2d-nur-alam1.vercel.app/api/backend/facilities`

A browser signed into Vercel may see JSON while a server request still encounters protection. The proxy rejects redirects and non-JSON responses with HTTP 502. Deployed environment values and the running application response could not be inspected behind this protection; a stale deployed variable is not confirmed.

## Deployment steps (manual)

1. In the backend Vercel project, find the stable **Production** domain under Settings → Domains. Verify that an unauthenticated request to `https://<backend-production-domain>/facilities` returns HTTP 200 and a JSON array. Use the public production endpoint intended for this public API; preserve protection on preview deployments and all application authentication checks. If the intended production API is protected, configure its deployment access deliberately in Vercel before testing again. A signed-in browser check alone is insufficient.
2. In the frontend project, set `BACKEND_URL` to that HTTPS origin with no path. Set `NEXT_PUBLIC_API_URL` to the same origin if retained. A stale `BACKEND_URL` overrides a correct `NEXT_PUBLIC_API_URL`. Do not use localhost in Production.
3. Set frontend `BETTER_AUTH_URL` to its stable frontend Production origin. Leave `NEXT_PUBLIC_AUTH_URL` unset or set it to that same origin. Keep existing private secrets and MongoDB settings.
4. Set backend `CLIENT_URL` and `AUTH_BASE_URL` to that same frontend origin. Keep the existing matching `API_AUTH_MODE` and `JWT_AUDIENCE` on both projects. Do not broaden CORS. The facilities proxy is server-to-server, so browser CORS is not the cause of the observed Vercel redirect.
5. Apply variables to the Vercel environment actually used (Production or Preview), then redeploy the backend if its settings changed and manually deploy the updated frontend. Public variables require a new build. No deployment was performed by this fix.
6. Check frontend `/api/backend/facilities` returns HTTP 200 JSON, then open `/facilities`: one heading, one description, one search input, a count, and every returned facility. Search should filter by name, category, and location.

## Local development

Use `BACKEND_URL=http://localhost:4000` (or `NEXT_PUBLIC_API_URL` with no override) and start the backend on port 4000. Use frontend `BETTER_AUTH_URL=http://localhost:3000`, with the public auth URL absent or matching. Set backend `CLIENT_URL` and `AUTH_BASE_URL` to `http://localhost:3000`. The checked-in backend code uses strict origin configuration; the local backend environment inspected during this task contained a placeholder `CLIENT_URL`, which must be corrected locally for authentication and direct browser requests. `.env.local` takes precedence over `.env`; process variables take precedence over both. Keep credentials private.

## Data and image verification

- Local `http://localhost:4000/facilities`: HTTP 200, 13 records.
- Local `http://localhost:3001/api/backend/facilities`: HTTP 200, the same 13 records. All current images are strings; rendering also supports arrays.
- Local `/facilities`: HTTP 200; Chrome confirmed one heading, 13 cards, and `Showing 13 of 13 facilities`. Searching `Carolyn` showed 1 of 13.
- All 10 distinct `i.ibb.co.com` URLs returned HTTP 200, `image/png`, and PNG file signatures. One URL is shared by two records. The `static.wixstatic.com` URL returned HTTP 200, `image/jpeg`, and a JPEG signature. Thus 12 records have verified image sources.
- `https://www.woxo.com.au` failed DNS resolution. The browser displayed the local placeholder for that record. No database record was changed.
- Chrome confirmed dynamic images render on Featured Facilities and the selected Facility Details page through the existing Next.js Image component. Image sources are normalized from a string or array; invalid sources and load failures use the placeholder.
- After allowing lazy images to load, Chrome confirmed all 12 valid facility images and the placeholder loaded successfully. Browser simulations of an empty array, HTTP 503, and an HTML response confirmed that only the successful empty array shows `No facilities found.`; failures show an alert without an empty state.
- `next.config.ts` now lists the two verified remote image hosts instead of allowing every HTTPS host. Static banner images remain local and unchanged. FacilityImage already used `unoptimized`; this behavior is preserved, so its browser requests use the actual external image URL rather than `/_next/image`. The previous hostname configuration was not the observed cause of the API failure.
- Featured listings intentionally retain their existing six-card preview; the All Facilities page displays all records. Featured and Details now share response validation, reject redirects, and have bounded fetch timeouts. Featured failures show an error rather than an empty state.
- TypeScript (`npx tsc --noEmit`), ESLint (`npm run lint`), and the final production build (`npm run build`) passed. The sandboxed build stalled; the permitted build outside the sandbox passed, including Next.js TypeScript and prerender checks. Validation tests covered image strings/arrays, more than six listings, empty arrays, HTTP failures, HTML, malformed JSON, and invalid data shapes.

The inspected live deployment remains protected, so these local results do not establish that the currently deployed frontend has the updated code or environment. Follow the manual deployment steps above.
