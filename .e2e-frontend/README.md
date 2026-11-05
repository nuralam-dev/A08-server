# StudioSpace

The existing Next.js App Router frontend for creative studio listings and bookings.

Start the local Express backend, preserve existing secrets, add missing values from `.env.example`, and run `npm run dev`.

- [Deployment configuration and exact release checklist](DEPLOYMENT.md)
- [Audit findings and test coverage](AUDIT.md)

Checks: `npx tsc --noEmit`, `npm run lint`, `npm run build`.

Browser API calls use `/api/backend`; BetterAuth lives on `/api/auth`. Production domains and secrets belong in hosting environment settings. No deployment is performed by these checks.
