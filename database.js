import { MongoClient } from "mongodb";
import { mongoUri, databaseName } from "./config.js";
export const client = new MongoClient(mongoUri, {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 10000,
});
let connection;
export async function connectToMongoDB() {
  connection ??= client.connect().catch((error) => {
    connection = undefined;
    throw error;
  });
  return connection;
}
export async function getDatabase() {
  await connectToMongoDB();
  return client.db(databaseName);
}
// A real write to a shared document forces concurrent transactions to retry
// before reading availability. An in-memory mutex cannot protect Vercel instances.
export async function withFacilityLock(db, facilityId, operation) {
  const locks = db.collection("bookingLocks");
  try {
    await locks.updateOne({ _id: facilityId }, { $setOnInsert: { revision: 0 } }, { upsert: true });
  } catch (error) {
    if (error.code !== 11000) throw error;
  }
  return client.withSession((session) => session.withTransaction(async () => {
    await locks.updateOne({ _id: facilityId }, { $inc: { revision: 1 } }, { session });
    return operation(session);
  }, {
    readConcern: { level: "snapshot" },
    writeConcern: { w: "majority" },
    readPreference: "primary",
    maxCommitTimeMS: 10000,
  }));
}
