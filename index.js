import cors from "cors";
import "dotenv/config";
import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import { port, clientOrigin, authBaseUrl, authMode, jwtAudience } from "./config.js";

const app = express();
app.use(express.json());
let verifyApiJWT;
if (authMode === "jwt") {
  const { createRemoteJWKSet, jwtVerify } = await import("jose");
  const jwks = createRemoteJWKSet(new URL("/api/auth/jwks", authBaseUrl), { timeoutDuration: 10000 });
  verifyApiJWT = (token) => jwtVerify(token, jwks, {
    issuer: authBaseUrl,
    audience: jwtAudience,
    algorithms: ["EdDSA"],
    requiredClaims: ["sub", "sid", "exp", "iat"],
  });
}
app.use(cors({ origin: clientOrigin, credentials: true }));

const client = new MongoClient(process.env.MONGODB_URI);
export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}
const connectClient = await connectToMongoDB();
const db = connectClient.db("A08");
const facilitiesCollection = db.collection("facilities");
const facilitiesBookingCollection = db.collection("facilitiesBooking");

// Validate the session with the existing BetterAuth server, never with request identity fields.
async function requireAuth(req, res, next) {
  res.set("Cache-Control", "private, no-store");
  if (!req.headers.cookie) {
    return res.status(401).send({ message: "Please log in to continue." });
  }

  let jwtPayload;
  if (verifyApiJWT) {
    const authorization = req.headers.authorization;
    if (!authorization?.startsWith("Bearer ")) {
      return res.status(401).send({ message: "A valid API token is required." });
    }
    try {
      const verified = await verifyApiJWT(authorization.slice(7));
      jwtPayload = verified.payload;
      if (typeof jwtPayload.sub !== "string" || typeof jwtPayload.sid !== "string") {
        return res.status(401).send({ message: "Invalid API token." });
      }
    } catch (error) {
      if (["ERR_JWKS_TIMEOUT", "ERR_JOSE_GENERIC"].includes(error.code) || error.name === "TypeError") {
        return res.status(503).send({ message: "Unable to verify the API token. Please try again." });
      }
      return res.status(401).send({ message: "Invalid or expired API token." });
    }
  }

  try {
    const sessionUrl = new URL("/api/auth/get-session", authBaseUrl);
    sessionUrl.searchParams.set("disableCookieCache", "true");
    sessionUrl.searchParams.set("disableRefresh", "true");
    const response = await fetch(sessionUrl, {
      headers: { cookie: req.headers.cookie },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10000),
    });
    if (response.status === 401) {
      return res.status(401).send({ message: "Please log in to continue." });
    }
    if (!response.ok) throw new Error("Session verification failed");
    const session = await response.json();
    if (!session?.session || !session?.user?.id || !session?.user?.email) {
      return res.status(401).send({ message: "Please log in to continue." });
    }
    // The live session check also rejects JWTs belonging to a logged-out or different session.
    if (jwtPayload && (jwtPayload.sub !== session.user.id || jwtPayload.sid !== session.session.id)) {
      return res.status(401).send({ message: "The API token does not match your active session." });
    }
    req.authUser = session.user;
    next();
  } catch {
    res.status(503).send({ message: "Unable to verify your session. Please try again." });
  }
}

app.post("/facilities/booking", requireAuth, async (req, res) => {
  const { facilityId, date, startTime, endTime, guests } = req.body || {};
  if (
    typeof facilityId !== "string" || !/^[a-f0-9]{24}$/i.test(facilityId) ||
    typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    typeof startTime !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) ||
    typeof endTime !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime) ||
    endTime <= startTime || !Number.isInteger(guests) || guests < 1
  ) {
    return res.status(400).send({ message: "Please provide valid booking details." });
  }
  try {
    const bookingData = {
      facilityId,
      name: req.authUser.name,
      email: req.authUser.email.trim(),
      userId: req.authUser.id,
      date,
      startTime,
      endTime,
      guests,
    };
    const result = await facilitiesBookingCollection.insertOne(bookingData);
    res.send(result);
  } catch {
    res.status(500).send({ message: "Failed to save your booking." });
  }
});

app.get("/facilities/booking", requireAuth, async (req, res) => {
  try {
    const user = req.authUser;
    const result = await facilitiesBookingCollection.find({
      $or: [
        { userId: user.id },
        // Existing bookings have an email but no userId.
        { userId: { $exists: false }, email: user.email.trim() },
      ],
    }).toArray();
    res.send(result);
  } catch {
    res.status(500).send({ message: "Failed to fetch your bookings." });
  }
});

app.delete("/facilities/booking/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  if (!/^[a-f0-9]{24}$/i.test(id)) {
    return res.status(400).send({ message: "Invalid booking ID." });
  }

  try {
    const bookingId = new ObjectId(id);
    const booking = await facilitiesBookingCollection.findOne({ _id: bookingId });
    if (!booking) return res.status(404).send({ message: "Booking not found." });

    const user = req.authUser;
    // Match the existing GET ownership rules: use email only when userId is absent.
    const isOwner = Object.hasOwn(booking, "userId")
      ? booking.userId === user.id
      : booking.email === user.email.trim();
    if (!isOwner) {
      return res.status(403).send({ message: "You can only delete your own bookings." });
    }

    // Include ownership in the delete filter so only this owner's record can change.
    const result = await facilitiesBookingCollection.deleteOne({
      _id: bookingId,
      $or: [
        { userId: user.id },
        { userId: { $exists: false }, email: user.email.trim() },
      ],
    });
    if (result.deletedCount !== 1) return res.status(404).send({ message: "Booking not found." });
    res.send(result);
  } catch {
    res.status(500).send({ message: "Failed to delete your booking." });
  }
});

app.get("/facilities", async (req, res) => {
  const result = await facilitiesCollection.find().toArray();
  res.send(result);
});
// The old /my address uses the same secure ownership filter as /mine.
app.get(["/facilities/mine", "/facilities/my"], requireAuth, async (req, res) => {
  try {
    const result = await facilitiesCollection.find({ ownerId: req.authUser.id }).toArray();
    res.send(result);
  } catch {
    res.status(500).send({ message: "Failed to fetch your facilities." });
  }
});

// Only editable studio fields are accepted. Ownership cannot be changed by a request.
function getFacilityFields(body) {
  const fields = ["name", "category", "image", "location", "pricePerHour", "capacity", "securityDeposit", "description"];
  const data = {};
  for (const field of fields) {
    if (Object.hasOwn(body, field)) data[field] = body[field];
  }
  return data;
}

function hasValidFacilityFields(data, partial = false) {
  const textFields = ["name", "category", "image", "location", "description"];
  for (const field of textFields) {
    if (partial && !Object.hasOwn(data, field)) continue;
    if (typeof data[field] !== "string" || !data[field].trim()) return false;
  }
  for (const field of ["pricePerHour", "capacity", "securityDeposit"]) {
    if (partial && !Object.hasOwn(data, field)) continue;
    if (typeof data[field] !== "number" || !Number.isFinite(data[field])) return false;
    if (field === "securityDeposit" ? data[field] < 0 : data[field] <= 0) return false;
  }
  if (Object.hasOwn(data, "capacity") && !Number.isInteger(data.capacity)) return false;
  return Object.keys(data).length > 0;
}

app.post("/facilities", requireAuth, async (req, res) => {
  const fields = getFacilityFields(req.body || {});
  if (!hasValidFacilityFields(fields)) {
    return res.status(400).send({ message: "Please provide valid studio details." });
  }
  try {
    const result = await facilitiesCollection.insertOne({
      ...fields,
      ownerId: req.authUser.id,
      email: req.authUser.email.trim(),
    });
    res.send(result);
  } catch {
    res.status(500).send({ message: "Failed to add your facility." });
  }
});

async function requireFacilityOwner(req, res, next) {
  if (!/^[a-f0-9]{24}$/i.test(req.params.id)) {
    return res.status(400).send({ message: "Invalid facility ID." });
  }
  try {
    const facility = await facilitiesCollection.findOne({ _id: new ObjectId(req.params.id) });
    if (!facility) return res.status(404).send({ message: "Facility not found." });
    // Legacy records without ownerId are not claimed using email or other guesses.
    if (facility.ownerId !== req.authUser.id) {
      return res.status(403).send({ message: "You can only edit or delete facilities you added." });
    }
    req.facility = facility;
    next();
  } catch {
    res.status(500).send({ message: "Unable to verify facility ownership." });
  }
}

app.get("/facilities/:id", async (req, res) => {
  const id = req.params.id;
  console.log(id, "id");
  res.send(`your requested facility with id ${id}`);
});
app.patch("/facilities/:id", requireAuth, requireFacilityOwner, async (req, res) => {
  const updatedData = getFacilityFields(req.body || {});
  if (!hasValidFacilityFields(updatedData, true)) {
    return res.status(400).send({ message: "Please provide valid studio details." });
  }
  try {
    const result = await facilitiesCollection.updateOne(
      { _id: req.facility._id, ownerId: req.authUser.id },
      { $set: updatedData },
    );
    if (result.matchedCount !== 1) return res.status(404).send({ message: "Facility not found." });
    res.send(result);
  } catch {
    res.status(500).send({ message: "Failed to update your facility." });
  }
});

app.delete("/facilities/:id", requireAuth, requireFacilityOwner, async (req, res) => {
  try {
    const result = await facilitiesCollection.deleteOne({
      _id: req.facility._id,
      ownerId: req.authUser.id,
    });
    if (result.deletedCount !== 1) return res.status(404).send({ message: "Facility not found." });
    res.send(result);
  } catch {
    res.status(500).send({ message: "Failed to delete your facility." });
  }
});
app.get("/", (req, res) => {
  res.send("Hello World!");
});
export default app;

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  });
}
