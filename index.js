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
app.get("/facilities/:id", async (req, res) => {
  const id = req.params.id;
  console.log(id, "id");
  res.send(`your requested facility with id ${id}`);
});
app.get("/", (req, res) => {
  res.send("Hello World!");
});
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
