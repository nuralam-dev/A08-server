import { createRemoteJWKSet, jwtVerify } from "jose";
import { authBaseUrl, jwtIssuer, jwtAudience, jwksUrl } from "./config.js";
const jwks = createRemoteJWKSet(new URL(jwksUrl), { timeoutDuration: 5000 });
export async function requireAuth(req, res, next) {
  res.set("Cache-Control", "private, no-store");
  const match = /^Bearer ([^\s]+)$/i.exec(req.headers.authorization || "");
  if (!match || !req.headers.cookie) return res.status(401).json({ message: "A Bearer JWT and active BetterAuth session cookie are required." });
  let payload;
  try {
    ({ payload } = await jwtVerify(match[1], jwks, {
      issuer: jwtIssuer, audience: jwtAudience, algorithms: ["EdDSA"],
      requiredClaims: ["sub", "sid", "exp", "iat"],
    }));
    if (typeof payload.sub !== "string" || !payload.sub || typeof payload.sid !== "string" || !payload.sid) {
      return res.status(401).json({ message: "Invalid API token identity." });
    }
  } catch (error) {
    const unavailable = ["ERR_JWKS_TIMEOUT", "ERR_JOSE_GENERIC"].includes(error.code) || error.name === "TypeError";
    return res.status(unavailable ? 503 : 401).json({ message: unavailable ? "Token verification is temporarily unavailable." : "Invalid or expired API token." });
  }
  try {
    const url = new URL("/api/auth/get-session", authBaseUrl);
    url.searchParams.set("disableCookieCache", "true");
    url.searchParams.set("disableRefresh", "true");
    const response = await fetch(url, {
      headers: { cookie: req.headers.cookie }, cache: "no-store", redirect: "error",
      signal: AbortSignal.timeout(5000),
    });
    if (response.status === 401) return res.status(401).json({ message: "Please log in to continue." });
    if (!response.ok) throw new Error("Session service unavailable");
    const session = await response.json();
    if (!session?.user?.id || !session?.session?.id ||
        !Number.isFinite(Date.parse(session.session.expiresAt)) || Date.parse(session.session.expiresAt) <= Date.now() ||
        payload.sub !== session.user.id || payload.sid !== session.session.id) {
      return res.status(401).json({ message: "The token does not match an active session." });
    }
    req.authUser = { ...session.user, id: payload.sub };
    return next();
  } catch {
    return res.status(503).json({ message: "Session verification is temporarily unavailable." });
  }
}
