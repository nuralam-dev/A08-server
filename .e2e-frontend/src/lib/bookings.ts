import type { Booking } from "@/types/booking";

export function isBooking(value: unknown): value is Booking {
  if (!value || typeof value !== "object") return false;
  const booking = value as Record<string, unknown>;
  return ["_id", "facilityId", "name", "email", "date", "startTime", "endTime"].every(
    (field) => typeof booking[field] === "string",
  ) && typeof booking.guests === "number" && Number.isSafeInteger(booking.guests) && booking.guests > 0;
}
