import "server-only";

export function readOrigin(value: string, name: string) {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password ||
      url.pathname !== "/" || url.search || url.hash) {
    throw new Error(`${name} must be an HTTP(S) origin without credentials, paths, or query parameters.`);
  }
  const local = url.hostname === "localhost" || url.hostname.endsWith(".localhost") ||
    url.hostname.endsWith(".local") || url.hostname.startsWith("127.") ||
    ["[::1]", "0.0.0.0"].includes(url.hostname);
  if (process.env.NODE_ENV === "production" && (url.protocol !== "https:" || local)) {
    throw new Error(`${name} must use a public HTTPS origin in production.`);
  }
  return url.origin;
}

export function getBackendURL() {
  const configuredURL = process.env.BACKEND_URL?.trim() || process.env.NEXT_PUBLIC_API_URL?.trim();
  if (process.env.NODE_ENV === "production" && !configuredURL) {
    throw new Error("Set BACKEND_URL to your HTTPS Express API origin.");
  }
  return readOrigin(configuredURL || "http://localhost:4000", "BACKEND_URL / NEXT_PUBLIC_API_URL");
}
