# StudioSpace API contract

This describes the implemented Express API. Local base URL: `http://localhost:4000`.
Production base URL: the actual HTTPS backend origin assigned to the fresh deployment; no production URL is embedded in code.

## Authentication and headers

Public routes need no authentication. All private routes require BOTH:

- `Authorization: Bearer <JWT>` issued by the existing frontend BetterAuth JWT plugin.
- The matching active BetterAuth session `Cookie` forwarded by the frontend server.

This preserves the frontend's existing session-bound JWT architecture and immediate logout revocation. This is not a standalone bearer-only API. Browser requests should use the existing same-origin `/api/backend` proxy, which obtains JWTs on the server and forwards the HTTP-only cookie. Do not put signing keys or BetterAuth secrets in browser code.

Backend uses `jose` and trusted remote JWKS; accepts only EdDSA, validates issuer, audience, expiration and required `sub`, `sid`, `iat`, `exp` claims. It checks the live BetterAuth session with cookie cache and refresh disabled and requires the subject/session IDs to match. Unavailable auth/JWKS services return 503; invalid/missing credentials return 401.

JSON writes require `Content-Type: application/json`; body size is limited to 100kb. Browser `Origin`, when present, must exactly equal `CLIENT_URL`. Requests without Origin are permitted for server-to-server clients and still require authentication on private endpoints. Credentialed CORS permits only the configured origin. Preflight uses OPTIONS (204); Express also supports HEAD for GET routes.

## Endpoints

| Method | Path | Access | Success body/status |
| --- | --- | --- | --- |
| GET | `/` | Public | 200 `{ "message": "StudioSpace API", "status": "ok" }` |
| GET | `/health` | Public | 200 `{ "status": "ok", "database": "connected" }`; 503 if unavailable |
| GET | `/facilities` | Public | 200 array of all facilities |
| GET | `/facilities/featured` | Public | 200 array, latest six by descending `_id` (no featured flag in legacy schema) |
| GET | `/facilities/:id` | Public | 200 facility object; formerly a text placeholder, now implemented |
| GET | `/facilities/mine` | Private | 200 array where `ownerId` equals verified user ID |
| GET | `/facilities/my` | Private | Alias of `/facilities/mine` |
| POST | `/facilities` | Private | 201 `{ "acknowledged": true, "insertedId": "..." }` |
| PATCH | `/facilities/:id` | Owner | 200 MongoDB update result |
| PUT | `/facilities/:id` | Owner | 200 MongoDB update result; all editable fields required |
| DELETE | `/facilities/:id` | Owner | 200 `{ "acknowledged": true, "deletedCount": 1 }` |
| POST | `/facilities/booking` | Private | 201 `{ "acknowledged": true, "insertedId": "..." }` |
| GET | `/facilities/booking` | Private | 200 array of the authenticated user's bookings |
| GET | `/facilities/booking/:id` | Booking owner | 200 booking object |
| DELETE | `/facilities/booking/:id` | Booking owner | 200 `{ "acknowledged": true, "deletedCount": 1 }`; cancellation deletes that booking |

Static paths are registered before `:id`. No login, payment, booking-update, or admin ownership-transfer endpoint is implemented.

## Facility schema and writes

Example full POST/PUT body:

```json
{
  "name": "Photo studio",
  "category": "Photography",
  "image": ["/images/studio.jpg"],
  "location": "Dhaka",
  "pricePerHour": 500,
  "capacity": 10,
  "securityDeposit": 1000,
  "description": "Studio description"
}
```

`image` accepts a nonempty string OR an array of 1–20 nonempty strings. Other text fields are nonempty strings; each string is at most 10,000 characters. `pricePerHour` is a finite positive number; `capacity` is a positive safe integer; `securityDeposit` is a finite nonnegative number. Numeric strings are rejected. PATCH accepts any nonempty subset of editable fields. Unknown fields (including ownership) are ignored; a PATCH containing only unknown fields is rejected.

Reads return a facility object with its original fields and `_id` serialized as a 24-character hex string. New records also have server-assigned `ownerId` and BetterAuth-derived `email`. Existing images remain unchanged. Update success looks like:

```json
{ "acknowledged": true, "matchedCount": 1, "modifiedCount": 1, "upsertedCount": 0, "upsertedId": null }
```

`modifiedCount` can be zero for an unchanged update. Facilities with no `ownerId` remain publicly visible, but cannot be claimed by email or request identity fields. Existing records require a separately authorized ownership migration if owners need to edit them. Delete returns 409 if any confirmed/legacy booking exists, including historical bookings. Capacity reductions return 409 if they would invalidate an existing confirmed/legacy booking.

## Booking schema and writes

POST body:

```json
{
  "facilityId": "0123456789abcdef01234567",
  "date": "2035-05-10",
  "startTime": "09:00",
  "endTime": "10:00",
  "guests": 3
}
```

`facilityId` must identify an existing facility. `date` is a real calendar date in YYYY-MM-DD format. Times are zero-padded 24-hour HH:mm, on the same date, with end strictly after start. `guests` must be a positive safe integer at most the facility capacity. Times are facility wall-clock times in `BOOKING_TIME_ZONE` (default `Asia/Dhaka`), independent of the server timezone. The start must be after the current minute in that zone; past starts return 400. Overnight bookings are not supported.

Server sets `userId` from verified `sub`, takes `name`/`email` from the live BetterAuth user, and sets `status: "confirmed"`. Request `userId`, `name`, `email`, `ownerId`, or status cannot grant authority or override these values.

Booking reads return `_id`, `facilityId`, `name`, `email`, `date`, `startTime`, `endTime`, `guests`, and, for new records, `userId` and `status`. Existing records are not migrated. A missing status is treated as confirmed for availability. Legacy string facility IDs (including uppercase hex) and ObjectId facility references are matched.

An overlap exists when the same facility/date has a confirmed or legacy booking with `existing.startTime < requested.endTime` AND `existing.endTime > requested.startTime`. Adjacent bookings are allowed. Check and insert execute in a MongoDB transaction after writing the shared `bookingLocks` document for that facility. All API facility updates/deletions use the same lock. This requires a replica set/Atlas deployment, provides cross-instance concurrency protection, and does not rewrite legacy records. Other services writing directly to MongoDB must follow the same protocol. Existing duplicate bookings are not repaired automatically.

New bookings are owned by `userId`. A legacy booking without `userId` is accessible only through an exact email match from a live BetterAuth account with `emailVerified: true`. Unverified email accounts cannot claim legacy bookings. Explicit `userId` always takes precedence. New bookings work for both verified and unverified accounts because ownership is bound to the verified subject.

## Errors

All errors return JSON `{ "message": "Human-readable explanation." }`:

| Status | Meaning |
| --- | --- |
| 400 | Invalid ObjectId, missing/invalid fields, invalid dates/times, guest count/capacity, malformed JSON |
| 401 | Missing, invalid, expired JWT or missing/revoked/mismatched session |
| 403 | Wrong owner, unverified legacy-email ownership, disallowed Origin |
| 404 | Missing route, facility or booking |
| 409 | Overlap, facility with bookings, capacity reduction incompatible with bookings |
| 413 | Body larger than 100kb |
| 500 | Unexpected internal failure (details withheld) |
| 503 | Database or authentication service unavailable, including transaction failure |

Responses are not cached; private routes use `Cache-Control: private, no-store`.

## Frontend handoff

Set `API_AUTH_MODE=jwt` on the frontend; it currently defaults to session-only when omitted. Set identical `JWT_AUDIENCE` on both apps. BetterAuth's issuer is its canonical frontend origin; keep backend `AUTH_BASE_URL`/`JWT_ISSUER` aligned with frontend `BETTER_AUTH_URL`.

Existing frontend proxy supports the original paths, including PATCH and booking DELETE. Its allowlist/exports must be extended to forward GET `/facilities/featured`, GET `/facilities/booking/:id`, and PUT `/facilities/:id` if the frontend adopts these new capabilities. The frontend details page already requests the repaired single-record endpoint directly. The frontend `.env.example` still contains old deployment URLs in comments; replace those during frontend deployment preparation. Frontend files were not modified in this backend task.
