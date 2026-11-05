const isProduction = process.env.NODE_ENV === "production";

function readOrigin(value, name) {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password ||
      url.pathname !== "/" || url.search || url.hash) {
    throw new Error(`${name} must be an HTTP(S) origin without credentials, paths, or query parameters.`);
  }
  const local = url.hostname === "localhost" || url.hostname.endsWith(".localhost") ||
    url.hostname.endsWith(".local") || url.hostname.startsWith("127.") ||
    ["[::1]", "0.0.0.0"].includes(url.hostname);
  if (isProduction && (url.protocol !== "https:" || local)) {
    throw new Error(`${name} must use a public HTTPS origin in production.`);
  }
  return url.origin;
}

// Keep CLIENT_ORIGIN working for existing installations.
const configuredClient = process.env.CLIENT_URL?.trim() || process.env.CLIENT_ORIGIN?.trim();
if (isProduction && !configuredClient) throw new Error("Set CLIENT_URL to your HTTPS frontend origin.");
export const clientOrigin = readOrigin(configuredClient || "http://localhost:3000", "CLIENT_URL");
export const authBaseUrl = readOrigin(process.env.AUTH_BASE_URL?.trim() || clientOrigin, "AUTH_BASE_URL");

export const authMode = process.env.API_AUTH_MODE || "session";
if (!["session", "jwt"].includes(authMode)) throw new Error("API_AUTH_MODE must be session or jwt.");
if (isProduction && authMode === "jwt" && !process.env.JWT_AUDIENCE?.trim()) {
  throw new Error("Set JWT_AUDIENCE to the same value on both servers.");
}
const jwtAudienceValue = process.env.JWT_AUDIENCE?.trim() || "http://localhost:4000";
export const jwtAudience = authMode === "jwt" && /^https?:\/\//i.test(jwtAudienceValue)
  ? readOrigin(jwtAudienceValue, "JWT_AUDIENCE")
  : jwtAudienceValue;
export const port = Number(process.env.PORT || 4000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be an integer between 1 and 65535.");
if (!process.env.MONGODB_URI?.trim()) throw new Error("Set MONGODB_URI for the facilities database.");
