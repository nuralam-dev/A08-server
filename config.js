import "dotenv/config";
const isProduction = process.env.NODE_ENV === "production";
function readOrigin(value, name) {
  let url;
  try { url = new URL(value); } catch { throw new Error(`${name} must be a valid HTTP(S) origin.`); }
  if (value.includes("*") || !["http:", "https:"].includes(url.protocol) || url.username || url.password ||
      url.pathname !== "/" || url.search || url.hash) {
    throw new Error(`${name} must be an exact HTTP(S) origin without credentials, paths, or query parameters.`);
  }
  const local = url.hostname === "localhost" || url.hostname.endsWith(".localhost") ||
    url.hostname.endsWith(".local") || url.hostname.startsWith("127.") ||
    ["[::1]", "0.0.0.0"].includes(url.hostname);
  if (isProduction && (url.protocol !== "https:" || local)) throw new Error(`${name} must use a public HTTPS origin in production.`);
  return url.origin;
}
const configuredClient = process.env.CLIENT_URL?.trim();
const legacyClient = process.env.CLIENT_ORIGIN?.trim();
if (configuredClient && legacyClient && readOrigin(configuredClient, "CLIENT_URL") !== readOrigin(legacyClient, "CLIENT_ORIGIN")) {
  throw new Error("CLIENT_URL conflicts with CLIENT_ORIGIN. Remove the obsolete CLIENT_ORIGIN value.");
}
if (isProduction && !configuredClient && !legacyClient) throw new Error("Set CLIENT_URL to your actual HTTPS frontend origin.");
export const clientOrigin = readOrigin(configuredClient || legacyClient || "http://localhost:3000", "CLIENT_URL");
export const authBaseUrl = readOrigin(process.env.AUTH_BASE_URL?.trim() || clientOrigin, "AUTH_BASE_URL");
export const jwtIssuer = readOrigin(process.env.JWT_ISSUER?.trim() || authBaseUrl, "JWT_ISSUER");
export const jwksUrl = process.env.JWT_JWKS_URL?.trim() || `${authBaseUrl}/api/auth/jwks`;
const jwks = new URL(jwksUrl);
readOrigin(jwks.origin, "JWT_JWKS_URL");
if (jwks.username || jwks.password || jwks.search || jwks.hash) throw new Error("JWT_JWKS_URL must not contain credentials, a query, or fragment.");
if ((process.env.API_AUTH_MODE?.trim() || "jwt") !== "jwt") throw new Error("API_AUTH_MODE must be jwt; enable JWT in the existing frontend BetterAuth setup.");
if (isProduction && !process.env.JWT_AUDIENCE?.trim()) throw new Error("Set JWT_AUDIENCE to the same value on both servers.");
const audience = process.env.JWT_AUDIENCE?.trim() || "http://localhost:4000";
export const jwtAudience = /^https?:\/\//i.test(audience) ? readOrigin(audience, "JWT_AUDIENCE") : audience;
export const port = Number(process.env.PORT || 4000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be an integer between 1 and 65535.");
export const mongoUri = process.env.MONGODB_URI?.trim();
if (!mongoUri) throw new Error("Set MONGODB_URI for the facilities database.");
export const databaseName = process.env.MONGODB_DB_NAME?.trim() || "A08";
