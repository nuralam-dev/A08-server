import "server-only";

import { readOrigin } from "@/lib/backend";

function exactOrigin(value: string, name: string) {
  if (value.includes("*")) throw new Error(`${name} must contain exact origins, without wildcards.`);
  return readOrigin(value, name);
}

export function getAuthOrigins() {
  const privateURL = process.env.BETTER_AUTH_URL?.trim();
  const publicURL = process.env.NEXT_PUBLIC_AUTH_URL?.trim();
  const configuredURL = privateURL || publicURL;
  if (process.env.NODE_ENV === "production" && !configuredURL) {
    throw new Error("Set BETTER_AUTH_URL to your canonical HTTPS frontend origin.");
  }
  const authBaseURL = exactOrigin(configuredURL || "http://localhost:3000", "BETTER_AUTH_URL / NEXT_PUBLIC_AUTH_URL");
  if (publicURL && exactOrigin(publicURL, "NEXT_PUBLIC_AUTH_URL") !== authBaseURL) {
    throw new Error("BETTER_AUTH_URL and NEXT_PUBLIC_AUTH_URL must use the same frontend origin.");
  }
  const additionalOrigins = (process.env.AUTH_TRUSTED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => exactOrigin(origin, "AUTH_TRUSTED_ORIGINS"));

  return { authBaseURL, trustedOrigins: [...new Set([authBaseURL, ...additionalOrigins])] };
}
