# StudioSpace pre-deployment test report

Date: 2026-11-05. Backend: `A-08-server`; frontend: adjacent `a-08-client`. No deployment, commit, or push performed. Secrets and tokens intentionally omitted.

## Readiness

Local API and core browser journeys passed after fixes. Fresh production readiness is **conditional**, not certified: configure the actual HTTPS origins and production variables, resolve the content/configuration follow-ups below, and repeat hosted smoke tests after deployment is separately authorized.

## Test totals

75 report cases: 67 PASS, 2 FAIL, 6 NOT TESTED. Performed cases: 69. Counts refer to table rows, not individual assertions. The backend additionally reports 6 unit tests and 11 integration groups; those overlap this table and are not added twice.

| Test | Expected Result | Actual Result | Status |
|---|---|---|---|
| Local environment | Required local settings available without printing secrets | Both MongoDB URIs and auth secret set; origins localhost:3000/4000; JWT defaults align | PASS |
| MongoDB connection | Ping succeeds | Real Atlas ping and transactional writes succeeded | PASS |
| Backend startup | CLI listens after DB ping | Actual node index.js child served health 200 | PASS |
| Frontend startup | Next.js serves application | Dedicated Next.js server started and browser routes rendered | PASS |
| Backend selection/proxy | Same records through frontend and Express | Identical JSON arrays; 13 baseline facilities | PASS |
| Old deployment URLs | No obsolete URLs in active source/env configuration | No vercel.app matches in application source, next.config.ts, or env examples; local origins inspected | PASS |
| GET / | 200 JSON API identity | 200 StudioSpace API/status ok | PASS |
| GET /health | 200 connected | 200 database connected | PASS |
| GET /facilities | 200 array | Real records returned | PASS |
| GET /facilities/:id | 200 actual record | Response matched a real list record | PASS |
| GET /facilities/featured | Latest six | 200; min(6, record count); homepage rendered six | PASS |
| Invalid/missing facility ID | 400 / 404 JSON | 400 invalid ID; 404 nonexistent ObjectId | PASS |
| POST /facilities | 201 acknowledged insertion | Disposable facility inserted; DB identity verified | PASS |
| GET /facilities/mine and /my | Only current owner records | A saw own; B initially empty, then saw own newly created facility | PASS |
| PATCH /facilities/:id | Owner update 200 | A and B each updated own record | PASS |
| PUT /facilities/:id | Full owner update 200 | Full update accepted; partial PUT 400 | PASS |
| DELETE /facilities/:id | Owner deletion 200 | Disposable records deleted; repeated public lookup 404 | PASS |
| Facility validation | Invalid bodies 400 | Numeric strings, empty PATCH, malformed ID rejected | PASS |
| Ownership spoofing | Ignore client identity fields | Stored ownerId/email from live BetterAuth identity | PASS |
| Cross-account facility mutation | 403 for PATCH/PUT/DELETE | B rejected against A; A rejected against B deletion | PASS |
| POST /facilities/booking | 201 for valid booking | Real transactional insertion succeeded | PASS |
| GET /facilities/booking | Only current user bookings | Winner saw booking; other account empty | PASS |
| GET /facilities/booking/:id | Owner record 200 | Owner 200, other account 403 | PASS |
| DELETE /facilities/booking/:id | Owner deletion only | Owner 200; other account 403; repeat 404 | PASS |
| Booking identity spoofing | Use verified user identity | Request userId/email ignored; database values verified | PASS |
| Invalid calendar dates/times | 400 | Impossible date, 24:00, reversed/equal times rejected | PASS |
| Past bookings | 400 from backend | Initially accepted; fixed; real HTTP 400 and regression tests pass | PASS |
| Missing booking fields | 400 | Missing date/endTime/guests rejected over HTTP | PASS |
| Guest validation/capacity | 400 | Zero, fractional, string, and above-capacity guests rejected | PASS |
| Nonexistent booked facility | 404 | Valid nonexistent ObjectId returned 404 | PASS |
| Concurrent duplicate reservation | One creation, one conflict | Simultaneous requests returned [201,409] | PASS |
| Overlap versus adjacency | 409 overlap; 201 adjacent | Nested overlap rejected; adjacent booking created | PASS |
| Booked facility delete/capacity reduction | 409 | Both guarded against active bookings | PASS |
| Legacy booking compatibility | Preserve secure legacy behavior | Uppercase legacy facility ID blocked overlap; verified email required for legacy ownership | PASS |
| Signup/session creation | Real BetterAuth account/session | Two disposable accounts created through real auth handler | PASS |
| JWT retrieval | Server issues short-lived token | Actual frontend plugin issued EdDSA token with matching sub/sid and 300s lifetime | PASS |
| JWT signature/algorithm/claims | Reject tampered or mismatched tokens | Signature, HS256, issuer, audience, expiry, future nbf, subject/session mismatch all 401 | PASS |
| Missing authentication | 401 on all private routes | All ten private method/path cases rejected | PASS |
| Cookie/session binding | JWT alone insufficient | Missing cookie and mixed-account token/cookie rejected | PASS |
| Signout revocation | Old JWT no longer grants access | 401 immediately after real BetterAuth logout | PASS |
| CORS/origin security | Exact origin only | Allowed credentialed origin; hostile origin 403; OPTIONS 204 | PASS |
| Auth origin validation | Reject hostile signup origin | Isolated real auth configuration returned 403 | PASS |
| Production cookie configuration | Secure, HttpOnly, SameSite=Lax | Real auth configuration tested using memory adapter with HTTPS origins; not deployed transport | PASS |
| Browser token endpoint | No browser token issuance | /api/auth/token returned 404 in isolated auth test | PASS |
| Private cache policy | No private response caching | Source uses private, no-store on auth/proxy; no-store API middleware | PASS |
| Malformed/oversized JSON | 400 / 413 JSON | Malformed JSON 400; payload over 100kb 413 | PASS |
| Database unavailable | Sanitized 503 | Unreachable DB health returned sanitized JSON 503 | PASS |
| Existing data preservation | No original records altered | Before/after BSON hashes identical; isolated browser DB removed | PASS |
| Homepage/banner/category sections | Render live home content | Homepage rendered and six real featured cards displayed | PASS |
| Search and category filter | Correct record counts | Name/category/location searches and category URL filter matched actual records | PASS |
| Login/register/details/privacy/terms | Render intended pages | Browser headings present on all five routes | PASS |
| Protected page redirects | Anonymous redirected to login | Dashboard root, add/manage/my-facility/my-booking/edit and /my-facility redirected | PASS |
| Not Found | Missing pages/records display Not Found | Unknown page, invalid facility ID, nonexistent facility ID tested | PASS |
| Loading skeleton | Visible while API pending | Delayed browser API interception showed animate-pulse skeleton | PASS |
| Empty/error/invalid response states | Clear feedback | Empty array, 503, and HTML response displayed appropriate empty/alert states | PASS |
| Homepage responsive layout | No horizontal overflow | 390/768/1440px viewport checks passed | PASS |
| Facilities responsive layout | No horizontal overflow | 390/768/1440px viewport checks passed | PASS |
| Dashboard responsive layout | No horizontal overflow | Owner manage screen checked at 390/768/1440px | PASS |
| Facility images/fallback | Cards display image or clear fallback | 12 supplied images loaded; one local fallback loaded; none pending | PASS |
| Original facility image validity | Every stored image is valid | One existing listing points to website/non-image content; owner correction required | FAIL |
| Browser facility CRUD | Create, list, edit, delete | Isolated browser journey succeeded using actual forms and confirmation dialogs | PASS |
| Browser booking/account isolation | Book, list, cancel; other user private list empty | Isolated browser journey passed | PASS |
| Browser sign-in/sign-out | Authenticate and revoke session | Actual form signin and account-menu logout passed | PASS |
| Backend unit suite | All tests pass | npm test: 6 passed, 0 failed | PASS |
| Backend syntax | All modules valid | npm run check and integration-script node --check passed | PASS |
| Backend real integration suite | All groups pass | 11 groups passed after final backend changes, including User B own-facility management | PASS |
| Frontend build | Production compilation succeeds | npm run build passed before last auth-form fix; final rerun tracked below | PASS |
| Frontend lint/TypeScript | No errors | Both passed before last auth-form fix; final rerun tracked below | PASS |
| Backend npm run build | Configured build command | Command exits with Missing script: build; plain JS backend has no compilation step | FAIL |
| Deployed production env | Actual fresh origins/secrets configured | No deployment or hosting environment mutation performed | NOT TESTED |
| Deployed HTTPS/JWKS/CORS/cookies | Cross-server production flow works | Local integration and config checks passed; fresh deployment transport unavailable | NOT TESTED |
| Vercel runtime execution | Hosted endpoints run correctly | Express default export and VERCEL import tested locally; no hosted execution | NOT TESTED |
| Every page at every viewport | Complete responsive matrix | Home/list/manage covered; full all-page visual matrix not performed | NOT TESTED |
| Full accessibility/browser compatibility | Keyboard/screen-reader and other browsers | Headless Chrome only; no full accessibility audit | NOT TESTED |
| Hosted dependency/security/load audit | Production vulnerability and load assessment | Not performed; functional security checks are not penetration/load testing | NOT TESTED |

## Fixes made during this run

- Backend `validation.js`: reject past booking starts in an explicit facility timezone, independent of Vercel server timezone. Default is Asia/Dhaka.
- Backend `tests/validation.test.js`: regression cases for past dates, current/past minute, next minute, and timezone date rollover.
- Backend `scripts/verify-local.mjs`: real HTTP past/missing-field/guest/time cases, plus User B creating, listing, updating, and deleting their own facility.
- Backend `.env.example` and `API_CONTRACT.md`: document `BOOKING_TIME_ZONE` and future-only starts.
- Frontend `src/app/api/backend/[...path]/route.ts`: forward documented owner PUT, booking-by-ID GET, and explicit HEAD while preserving origin/session/JWT checks.
- Frontend `BookingForm.tsx` and `.env.example`: use matching `NEXT_PUBLIC_BOOKING_TIME_ZONE` for date/start validation and show the studio timezone.
- Frontend `AuthForm.tsx`: block submission until hydrated and use native POST to prevent credentials appearing in a GET URL before React loads.

No database ownership migration or original record/image rewriting was performed. Other pre-existing/concurrently added frontend files were preserved; dashboard root and the additional frontend verification script were not authored in this run.

## Remaining issues and production release gates

1. Configure actual fresh frontend/backend HTTPS origins on the intended Vercel projects. Local .env values are appropriate only for local development. Explicitly align frontend `JWT_AUDIENCE` with backend; the current local defaults agree, while example files use a custom audience and must be applied consistently.
2. Frontend requires private BetterAuth secret/auth MongoDB URI, canonical `BETTER_AUTH_URL`, backend HTTPS `BACKEND_URL`, and JWT mode/audience. Backend requires its MongoDB URI/database, exact `CLIENT_URL`, auth origin, and matching issuer/audience/JWKS. No secrets belong in public variables. Set both booking timezone settings identically; frontend public timezone is baked in at build time.
3. Ensure production Atlas network access and replica-set transaction support, and backend access to frontend JWKS/live session endpoints without interactive deployment protection. Real Atlas transactions passed locally.
4. One stored facility image is not a valid image URL. The fallback works; changing a real listing was intentionally excluded. The owner should supply a valid HTTPS image.
5. Backend has no `build` script because it runs plain JavaScript. The requested command failed; use the existing syntax/test checks and confirm the chosen Express hosting preset does not require a nonexistent build command.
6. Existing frontend `DEPLOYMENT.md` records a credential-exposure incident from earlier work and recommends rotation. This run cannot confirm whether that rotation happened. Confirm resolution privately before release; this report does not reproduce the credential.
7. Google OAuth is optional and not locally configured. No real provider login was tested. Newsletter UI explicitly says subscriptions are unavailable; there is no implemented newsletter backend to test.
8. Legacy facilities without ownerId cannot be managed by new accounts; verified-email fallback exists only for legacy bookings. This is intentional contract behavior, not an ownership bypass to remove.
9. Full-page visual/accessibility/browser/load/security coverage and hosted HTTPS behavior remain outside the completed evidence. A passing build is not proof that hosting settings are correct.

## Test method and limits

Read both AGENTS files and the actual API contract before editing. Backend integration used the actual frontend BetterAuth configuration, real EdDSA/JWKS/live sessions, real HTTP requests, and real MongoDB transactions. Disposable accounts/resources were removed and original facility/booking hashes checked. Browser tests used isolated contexts and a uniquely named disposable database; original public facilities were copied into that database for read-only visual coverage. Only the disposable database was removed.

Some initial browser harness attempts failed because of an existing Next.js dev lock, broad temporary-file watching, external-resource network-idle waits, or screenshot waits. Those runs were not treated as product passes. Stable isolated browser runs supply the functional evidence. Injected API failures test UI handling only and do not claim the backend failed naturally.

Production cookie attributes were tested using the actual auth configuration with an isolated memory adapter and HTTPS origins, not an actual deployed TLS connection. Unexpected runtime exceptions were absent in completed stable browser suites. Next.js emitted an image LCP performance warning; that warning is not an authentication or functional failure.
