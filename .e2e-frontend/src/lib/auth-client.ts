import { createAuthClient } from "better-auth/react";
// BetterAuth lives at /api/auth on the current frontend domain, locally and on Vercel.
// Keep the session cookie on the host that serves the page, including approved aliases.
export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : undefined,
  basePath: "/api/auth",
});
export const { signIn, signUp, useSession } = authClient;
