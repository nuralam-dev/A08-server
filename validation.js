import { ObjectId } from "mongodb";
export function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  throw error;
}
export function objectId(value, label = "facility") {
  if (typeof value !== "string" || !/^[a-f0-9]{24}$/i.test(value)) fail(400, `Invalid ${label} ID.`);
  return new ObjectId(value);
}
export function bodyObject(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) fail(400, "A JSON object body is required.");
  return body;
}
function validText(value) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 10000;
}
export function facilityFields(body, partial = false) {
  bodyObject(body);
  const data = {};
  for (const field of ["name", "category", "image", "location", "pricePerHour", "capacity", "securityDeposit", "description"]) {
    if (partial && !Object.hasOwn(body, field)) continue;
    const value = body[field];
    let valid;
    if (field === "image") {
      valid = validText(value) || (Array.isArray(value) && value.length > 0 && value.length <= 20 && value.every(validText));
    } else if (["pricePerHour", "capacity", "securityDeposit"].includes(field)) {
      valid = typeof value === "number" && Number.isFinite(value) &&
        (field === "securityDeposit" ? value >= 0 : value > 0) &&
        (field !== "capacity" || Number.isSafeInteger(value));
    } else valid = validText(value);
    if (!valid) fail(400, `Invalid or missing facility field: ${field}.`);
    data[field] = typeof value === "string" ? value.trim() : value;
  }
  if (!Object.keys(data).length) fail(400, "Provide at least one editable facility field.");
  return data;
}
// Facility wall-clock times use one explicit zone, independent of Vercel's TZ.
const bookingClock = new Intl.DateTimeFormat("sv-SE", {
  timeZone: process.env.BOOKING_TIME_ZONE || "Asia/Dhaka",
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});
export function bookingFields(body, now = new Date()) {
  bodyObject(body);
  const { facilityId, date, startTime, endTime, guests } = body;
  const id = objectId(facilityId);
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(Date.parse(`${date}T00:00:00Z`)) ||
      new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) fail(400, "Use a valid calendar date in YYYY-MM-DD format.");
  const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (typeof startTime !== "string" || typeof endTime !== "string" ||
      !timePattern.test(startTime) || !timePattern.test(endTime) || startTime >= endTime) {
    fail(400, "Use HH:mm times with endTime after startTime on the same date.");
  }
  if (!Number.isSafeInteger(guests) || guests < 1) fail(400, "Guests must be a positive integer.");
  const parts = Object.fromEntries(bookingClock.formatToParts(now).map(({ type, value }) => [type, value]));
  const currentMinute = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
  if (`${date}T${startTime}` <= currentMinute) fail(400, "Booking start must be in the future.");
  return { facilityId: id.toHexString(), date, startTime, endTime, guests };
}
// Missing status means confirmed for the original booking schema.
export const activeBooking = { $or: [{ status: { $exists: false } }, { status: "confirmed" }] };
export function facilityBookings(id) {
  // Accept historical string IDs (including uppercase hex) and ObjectIds.
  return { facilityId: { $in: [new ObjectId(id), new RegExp(`^${new ObjectId(id).toHexString()}$`, "i")] } };
}
export function bookingOwner(user) {
  const alternatives = [{ userId: user.id }];
  if (user.emailVerified === true && typeof user.email === "string") {
    alternatives.push({ userId: { $exists: false }, email: user.email.trim() });
  }
  return { $or: alternatives };
}
export function ownsBooking(booking, user) {
  return Object.hasOwn(booking, "userId") ? booking.userId === user.id :
    user.emailVerified === true && typeof user.email === "string" && booking.email === user.email.trim();
}
