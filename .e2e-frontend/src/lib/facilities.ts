import type { Facility } from "@/types/facility";

export function isFacility(value: unknown): value is Facility {
  if (!value || typeof value !== "object") return false;
  const facility = value as Record<string, unknown>;
  return ["_id", "name", "category", "location", "description"].every(
    (field) => typeof facility[field] === "string",
  ) && ["pricePerHour", "capacity", "securityDeposit"].every(
    (field) => typeof facility[field] === "number" && Number.isFinite(facility[field]),
  ) && (typeof facility.image === "string" ||
    (Array.isArray(facility.image) && facility.image.every((image) => typeof image === "string")));
}

export async function fetchFacilities(signal?: AbortSignal): Promise<Facility[]> {
  const response = await fetch("/api/backend/facilities", { signal, cache: "no-store" });
  return readFacilitiesResponse(response);
}

export async function readFacilitiesResponse(response: Response): Promise<Facility[]> {
  if (!response.ok) {
    throw new Error(`Unable to load facilities (HTTP ${response.status}). Please try again. If this continues, contact support to check the API deployment.`);
  }
  if (!response.headers.get("content-type")?.includes("application/json")) {
    throw new Error("The API did not return JSON. Its deployment may require Vercel authentication.");
  }
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error("The API returned invalid JSON. Please try again later.");
  }
  if (!Array.isArray(data) || !data.every(isFacility)) {
    throw new Error("The API returned invalid facility data. Please contact support.");
  }
  return data;
}
