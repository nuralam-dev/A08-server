import test from "node:test";
import assert from "node:assert/strict";
import { bookingFields, facilityFields, objectId, ownsBooking, bookingOwner } from "../validation.js";
const studio = { name: "Studio", category: "Photo", image: ["image.jpg"], location: "Dhaka", pricePerHour: 50, capacity: 5, securityDeposit: 0, description: "Studio description" };
const booking = { facilityId: "0123456789abcdef01234567", date: "2030-02-28", startTime: "09:00", endTime: "10:00", guests: 2 };

test("facility supports both historical image representations and rejects invalid numeric fields", () => {
  assert.deepEqual(facilityFields(studio), studio);
  assert.equal(facilityFields({ ...studio, image: "image.jpg" }).image, "image.jpg");
  for (const change of [{ capacity: 1.5 }, { capacity: "5" }, { pricePerHour: Infinity }, { securityDeposit: -1 }, { image: [] }, { image: [null] }, { name: " " }]) {
    assert.throws(() => facilityFields({ ...studio, ...change }), { status: 400 });
  }
  assert.deepEqual(facilityFields({ name: "Edited", ownerId: "forged" }, true), { name: "Edited" });
  assert.throws(() => facilityFields({}, true), { status: 400 });
  assert.throws(() => facilityFields([]), { status: 400 });
});
test("booking validates real dates, same-day time ranges, guests, and canonical IDs", () => {
  assert.deepEqual(bookingFields(booking), booking);
  assert.equal(bookingFields({ ...booking, facilityId: booking.facilityId.toUpperCase() }).facilityId, booking.facilityId);
  for (const change of [{ date: "2030-02-30" }, { date: "invalid" }, { date: "2030-13-01" }, { startTime: "24:00" }, { endTime: "09:00" }, { endTime: "08:00" }, { guests: 0 }, { guests: "2" }, { guests: 1.5 }, { facilityId: "bad" }]) {
    assert.throws(() => bookingFields({ ...booking, ...change }), { status: 400 });
  }
  assert.throws(() => objectId("123"), { status: 400 });
});
test("legacy ownership needs verified email; explicit userId always takes precedence", () => {
  const user = { id: "user-a", email: "a@example.test", emailVerified: true };
  assert.equal(ownsBooking({ userId: user.id }, user), true);
  assert.equal(ownsBooking({ email: user.email }, user), true);
  assert.equal(ownsBooking({ email: user.email }, { ...user, emailVerified: false }), false);
  assert.equal(ownsBooking({ userId: "other", email: user.email }, user), false);
  assert.equal(bookingOwner({ ...user, emailVerified: false }).$or.length, 1);
});
