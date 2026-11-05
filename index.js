import cors from "cors";
import "dotenv/config";
import express from "express";
import { MongoClient } from "mongodb";

const app = express();
const port = 4000;
app.use(express.json());
app.use(cors());

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

app.post("/facilities", async (req, res) => {
  const facilitiesData = req.body;
  const result = await facilitiesCollection.insertOne(facilitiesData);
  res.send(result);
});

app.post("/facilities/booking", async (req, res) => {
  const bookingData = req.body;
  const result = await facilitiesBookingCollection.insertOne(bookingData);
  res.send(result);
});
app.get("/facilities/booking", async (req, res) => {
  const result = await facilitiesBookingCollection.find().toArray();
  res.send(result);
});

app.get("/facilities", async (req, res) => {
  const result = await facilitiesCollection.find().toArray();
  res.send(result);
});
app.get("/facilities/my", async (req, res) => {
  const { email } = req.query;

  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).send({ message: "A valid email query parameter is required." });
  }

  try {
    const result = await facilitiesCollection.find({ email: email.trim() }).toArray();
    res.send(result);
  } catch (err) {
    res.status(500).send({ message: "Failed to fetch your facilities." });
  }
});
app.get("/facilities/:id", async (req, res) => {
  const id = req.params.id;
  console.log(id, "id");
  res.send(`your requested facility with id ${id}`);
});
// PATCH API to update a facility by ID
app.patch("/facilities/:id", async (req, res) => {
  const id = req.params.id;
  const updatedData = req.body;
  const result = await facilitiesCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: updatedData },
  );
  res.send(result);
});

// DELETE API to remove a facility by ID
app.delete("/facilities/:id", async (req, res) => {
  const id = req.params.id;
  const result = await facilitiesCollection.deleteOne({
    _id: new ObjectId(id),
  });
  res.send(result);
});
app.get("/", (req, res) => {
  res.send("Hello World!");
});
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
