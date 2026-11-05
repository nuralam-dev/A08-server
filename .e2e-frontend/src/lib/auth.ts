import "server-only";

import { betterAuth } from "better-auth";
import { MongoClient } from "mongodb";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { jwt } from "better-auth/plugins";
import { readOrigin } from "@/lib/backend";
import { getAuthOrigins } from "@/lib/auth-origins";

// Route modules are imported during next build. Initialize auth only when a request needs it.
function createAuth() {
  const isProduction = process.env.NODE_ENV === "production";
  const { authBaseURL, trustedOrigins } = getAuthOrigins();
  if (isProduction && !process.env.BETTER_AUTH_SECRET) throw new Error("Set a private BETTER_AUTH_SECRET in the frontend server environment.");

  const authMode = process.env.API_AUTH_MODE || "jwt";
  if (!["session", "jwt"].includes(authMode)) throw new Error("API_AUTH_MODE must be session or jwt.");
  const jwtEnabled = authMode === "jwt";
  if (isProduction && jwtEnabled && !process.env.JWT_AUDIENCE?.trim()) throw new Error("Set JWT_AUDIENCE to the same value on both servers.");
  const configuredAudience = process.env.JWT_AUDIENCE?.trim();
  const jwtAudienceValue = configuredAudience || process.env.BACKEND_URL?.trim() || process.env.NEXT_PUBLIC_API_URL?.trim() || "http://localhost:4000";
  const jwtAudience = jwtEnabled && /^https?:\/\//i.test(jwtAudienceValue)
    ? readOrigin(jwtAudienceValue, "JWT_AUDIENCE")
    : jwtAudienceValue;
  const secureCookies = isProduction || authBaseURL.startsWith("https://");

  if (!process.env.MONGODB_URI?.trim()) throw new Error("Set MONGODB_URI for the BetterAuth database.");
  const client = new MongoClient(process.env.MONGODB_URI);
  const db = client.db();

  const auth = betterAuth({
    baseURL: authBaseURL,
    trustedOrigins,
    database: mongodbAdapter(db, {
      client,
    }),
    emailAndPassword: { enabled: true },
    socialProviders: process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      },
    } : {},
    session: { cookieCache: { enabled: false } },
    advanced: {
      useSecureCookies: secureCookies,
      defaultCookieAttributes: {
        httpOnly: true,
        secure: secureCookies,
        sameSite: "lax",
        path: "/",
      },
    },
    // JWTs are optional API credentials issued from the existing session, never a second login.
    plugins: jwtEnabled ? [jwt({
      disableSettingJwtHeader: true,
      jwt: {
        issuer: authBaseURL,
        audience: jwtAudience,
        expirationTime: "5m",
        definePayload: ({ session }) => ({ sid: session.id }),
      },
    })] : [],
    // Only server-side auth.api.getToken() may issue API JWTs; the browser keeps its session cookie.
    disabledPaths: jwtEnabled ? ["/token"] : [],
  });

  return { auth, authBaseURL, trustedOrigins, jwtEnabled };
}

let instance: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  return instance ??= createAuth();
}
