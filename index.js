import cors from "cors";
import express from "express";
import { pathToFileURL } from "node:url";
import { port, clientOrigin } from "./config.js";
import { getDatabase, withFacilityLock } from "./database.js";
import { requireAuth } from "./auth.js";
import { fail, objectId, facilityFields, bookingFields, activeBooking, facilityBookings, bookingOwner, ownsBooking } from "./validation.js";
export { connectToMongoDB } from "./database.js";

const app = express();
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  if (req.headers.origin && req.headers.origin !== clientOrigin) return res.status(403).json({ message: "This request origin is not allowed." });
  next();
});
app.use(cors({
  origin: clientOrigin, credentials: true,
  methods: ["GET", "HEAD", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json({ limit: "100kb" }));
app.get("/", (req, res) => res.json({ message: "StudioSpace API", status: "ok" }));
app.get("/health", async (req, res) => {
  const db = await getDatabase();
  await db.command({ ping: 1 });
  res.json({ status: "ok", database: "connected" });
});
app.get("/facilities", async (req, res) => {
  const db = await getDatabase();
  res.json(await db.collection("facilities").find().toArray());
});
// No historical featured flag exists. Return the latest six by ObjectId.
app.get("/facilities/featured", async (req, res) => {
  const db = await getDatabase();
  res.json(await db.collection("facilities").find().sort({ _id: -1 }).limit(6).toArray());
});
app.get(["/facilities/mine", "/facilities/my"], requireAuth, async (req, res) => {
  const db = await getDatabase();
  res.json(await db.collection("facilities").find({ ownerId: req.authUser.id }).toArray());
});
app.post("/facilities/booking", requireAuth, async (req, res) => {
  const fields = bookingFields(req.body);
  const db = await getDatabase();
  const result = await withFacilityLock(db, fields.facilityId, async (session) => {
    const facility = await db.collection("facilities").findOne({ _id: objectId(fields.facilityId) }, { session });
    if (!facility) fail(404, "Facility not found.");
    if (!Number.isSafeInteger(facility.capacity) || fields.guests > facility.capacity) fail(400, "Guest count exceeds facility capacity.");
    const overlap = await db.collection("facilitiesBooking").findOne({
      ...facilityBookings(fields.facilityId), ...activeBooking,
      date: fields.date, startTime: { $lt: fields.endTime }, endTime: { $gt: fields.startTime },
    }, { session });
    if (overlap) fail(409, "This facility is already booked during that time.");
    return db.collection("facilitiesBooking").insertOne({
      ...fields, userId: req.authUser.id,
      name: req.authUser.name || "", email: req.authUser.email?.trim() || "", status: "confirmed",
    }, { session });
  });
  res.status(201).json(result);
});
app.get("/facilities/booking", requireAuth, async (req, res) => {
  const db = await getDatabase();
  res.json(await db.collection("facilitiesBooking").find(bookingOwner(req.authUser)).toArray());
});
async function ownBooking(req) {
  const id = objectId(req.params.id, "booking");
  const db = await getDatabase();
  const booking = await db.collection("facilitiesBooking").findOne({ _id: id });
  if (!booking) fail(404, "Booking not found.");
  if (!ownsBooking(booking, req.authUser)) fail(403, "You can only access your own bookings.");
  return { db, booking };
}
app.get("/facilities/booking/:id", requireAuth, async (req, res) => {
  const { booking } = await ownBooking(req);
  res.json(booking);
});
app.delete("/facilities/booking/:id", requireAuth, async (req, res) => {
  const { db, booking } = await ownBooking(req);
  const result = await db.collection("facilitiesBooking").deleteOne({ _id: booking._id, ...bookingOwner(req.authUser) });
  if (!result.deletedCount) fail(404, "Booking not found.");
  res.json(result);
});
app.get("/facilities/:id", async (req, res) => {
  const id = objectId(req.params.id);
  const db = await getDatabase();
  const facility = await db.collection("facilities").findOne({ _id: id });
  if (!facility) fail(404, "Facility not found.");
  res.json(facility);
});
app.post("/facilities", requireAuth, async (req, res) => {
  const fields = facilityFields(req.body);
  const db = await getDatabase();
  const result = await db.collection("facilities").insertOne({
    ...fields, ownerId: req.authUser.id, email: req.authUser.email?.trim() || "",
  });
  res.status(201).json(result);
});
async function mutateFacility(req, remove = false) {
  const id = objectId(req.params.id);
  const fields = remove ? undefined : facilityFields(req.body, req.method === "PATCH");
  const db = await getDatabase();
  return withFacilityLock(db, id.toHexString(), async (session) => {
    const facilities = db.collection("facilities");
    const facility = await facilities.findOne({ _id: id }, { session });
    if (!facility) fail(404, "Facility not found.");
    if (facility.ownerId !== req.authUser.id) fail(403, "You can only modify facilities you added.");
    const bookings = db.collection("facilitiesBooking");
    const filter = { ...facilityBookings(id.toHexString()), ...activeBooking };
    if (remove && await bookings.findOne(filter, { session })) fail(409, "This facility has confirmed bookings and cannot be deleted.");
    if (!remove && fields.capacity !== undefined && await bookings.findOne({ ...filter, guests: { $gt: fields.capacity } }, { session })) {
      fail(409, "Capacity cannot be lower than an existing confirmed booking's guest count.");
    }
    const ownerFilter = { _id: id, ownerId: req.authUser.id };
    return remove ? facilities.deleteOne(ownerFilter, { session }) : facilities.updateOne(ownerFilter, { $set: fields }, { session });
  });
}
app.patch("/facilities/:id", requireAuth, async (req, res) => res.json(await mutateFacility(req)));
app.put("/facilities/:id", requireAuth, async (req, res) => res.json(await mutateFacility(req)));
app.delete("/facilities/:id", requireAuth, async (req, res) => res.json(await mutateFacility(req, true)));
app.use((req, res) => res.status(404).json({ message: "Route not found." }));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  let status = error.status || 500;
  let message = error.message;
  if (error.type === "entity.parse.failed") { status = 400; message = "Malformed JSON body."; }
  if (error.type === "entity.too.large") { status = 413; message = "JSON body exceeds the 100kb limit."; }
  if (error.name?.startsWith("Mongo")) { status = 503; message = "Database operation is temporarily unavailable."; }
  if (status >= 500 && status !== 503) message = "An unexpected server error occurred.";
  if (status >= 500) console.error("API request failed", { method: req.method, type: error.name, code: error.code });
  res.status(status).json({ message });
});
export default app;
if (!process.env.VERCEL && process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const db = await getDatabase();
    await db.command({ ping: 1 });
    app.listen(port, () => console.log(`StudioSpace API listening on port ${port}`));
  } catch {
    console.error("Startup failed: unable to connect to MongoDB. Check MONGODB_URI and network access.");
    process.exitCode = 1;
  }
}
