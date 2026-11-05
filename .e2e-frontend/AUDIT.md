# StudioSpace audit and validation

## Scope and findings

Read repository `AGENTS.md` and the installed Next.js 16.4.5 guides for routes, Proxy, Image, search parameters, and build output before changes. Audited App Router groups, pages/layouts, dashboard components, auth forms, shared cards/images, types, data utilities, environment variable names, auth origins, API proxy, Next config, and adjacent Express source/config/validation/auth modules. Existing secrets were not changed.

- The existing design already included responsive navigation, a three-slide banner, Shadcn components, dashboard CRUD forms, and BetterAuth/JWT plumbing. These were retained and refined rather than replacing the application.
- Category homepage links previously supplied a query parameter that All Facilities ignored. Added category chips driven by the URL and combined with name/category/location search. All records remain visible without a six-record limit.
- Detail loading still assumed an obsolete placeholder endpoint. Updated to the actual individual facility endpoint, with ID validation and genuine 404 handling. Featured uses the actual latest-six endpoint.
- Dashboard forms previously edited inline. Added a protected `/dashboard/edit-facility/[id]` page based on the owner's collection, with state isolated by user. Existing My Facilities routes remain compatible, while duplicate navigation entries were removed.
- Managed listings lacked images. All four listing/detail contexts now share `FacilityImage`. Image arrays now try later candidates after failures. Editing other fields preserves multi-image arrays. A website URL in existing data cannot render as an image and receives a placeholder without database mutation.
- Facility and booking responses now receive runtime shape checks rather than unchecked type assertions. API failures remain errors, never successful empty arrays.
- The frontend defaulted to session mode while current Express requires both JWT and a live cookie session. JWT is now the frontend default; explicit production settings remain documented. Cookies, server-only JWT issuance, trusted-origin checks, protected pages, and backend ownership enforcement are preserved.
- Google sign-in was displayed even without configuration. It is now shown only when both server-side provider variables exist, without exposing their values.
- Previous 503s cannot be conclusively attributed without historic hosting logs. Current code can produce them from backend connectivity, MongoDB availability, auth configuration, JWKS fetches, or live session verification. Proxy messages now distinguish configuration, auth, and API transport failures.
- Invalid Origin is consistent with mismatched canonical/trusted origins. Exact environment-driven checks remain enabled; no CSRF bypass or wildcard trust was added.
- Removed obsolete Vercel domains from `.env.example`. `.vercel` linkage and ignored secret files remain unchanged. No Vercel configuration file was added.
- Demo reviews were only labeled in a source comment. A visible demo disclaimer now accompanies them. Newsletter submission now explicitly reports that registration is unavailable instead of silently clearing the form. Generic existing social links remain; real brand profile URLs have not been supplied.
- Fixed the self-referencing font token; applied green defaults, consistent footer color, modern icon category cards, subtle card hover effects, app metadata, and correct link semantics. Existing working banner/static images are preserved.
- The large Shadcn UI collection contains many primitives not currently imported by application pages. These are retained to avoid unrelated deletions. Existing highlighting hooks/utilities are likewise outside the requested functional fixes.

## Missing source

The specifically requested backend `API_CONTRACT.md` was absent. A question was raised before integration changes; routes and response shapes were verified against the running local API and actual `../A-08-server` source. No endpoint was invented. Contract-file verification remains pending its availability.

## Validation

Validation uses existing local records read-only for the visitor journey. Two-user write checks use uniquely named `studiospace_audit_<timestamp>` databases, isolated ports, and the actual frontend proxy/auth modules and Express app; only those disposable databases are removed afterward.

Final checks on 2026-11-05:

- `npm run lint`: passed.
- `npx tsc --noEmit`: passed.
- `git diff --check`: passed.
- `npm run build`: passed with Turbopack, TypeScript, static generation, and partial prerender checks enabled, including the new dynamic edit page. The sandbox initially blocked worker ports; the final successful build ran with approved execution outside that restriction. A generated cached sandbox failure was moved aside. The new dynamic route required a real Suspense boundary around dashboard pathname navigation; this was fixed without disabling prerender checks.
- Visitor browser journey: passed at 390, 768, and 1440 pixels; no runtime errors.
- Every original facility image inspected in Chrome: 12 direct images loaded, one known website URL used the local placeholder.
- Browser fixtures: image-array retry, true empty response, 503 error, and malformed JSON response shape passed.
- Two-user API/auth integration: passed using actual BetterAuth, JWT proxy, Express, and MongoDB transactions on isolated databases.
- Full private browser journey: passed sign-in, add studio, managed listing with image, dedicated edit/save, other-account private-list separation and edit denial, booking another user's studio, own booking visibility, booking deletion, facility deletion, sign-out, and subsequent 401/private-page redirects. Dashboard layout widths 390/768/1440 passed; no browser runtime errors. Sign-out may land on the login page because protected pages immediately redirect once their session disappears.

The private browser run used a temporary copy of this exact app and its installed dependencies, with separate test ports and databases. It did not scaffold or replace the project. All disposable databases were removed and audit servers stopped. The original local servers were left running.

A test-runner URI parsing error printed a MongoDB connection string into session tool output. The test parser was corrected; no secret file was changed. Rotate that database credential before deployment because it appeared in the session output.

 Browser screenshots and test harnesses are under `/tmp/studiospace-audit/`; they contain no committed credentials. The API harness verifies registration/sign-in, HTTP-only cookies, JWT validation, forged token rejection, owner-only facility lists/mutations, another user's booking, private booking lists/deletion, 400 validation, 409 conflicts, and sign-out revocation. Visitor browser checks cover all 13 original records, six featured, search/category links, empty state, details/image, booking auth prompt, password visibility, dashboard redirects, and widths 390/768/1440 with no runtime errors.

Google OAuth completion and live production hosting behavior require configured credentials and an authorized deployment. No deployment was attempted.
