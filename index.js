import "dotenv/config";
import express from "express";
import { MongoClient } from "mongodb";

const app = express();
const port = 4000;
app.use(express.json());

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

app.get("/facilities",async (req,res)=>{
const result = await facilitiesCollection.find().toArray()
res.send(result)
})

app.get("/", (req, res) => {
  res.send("Hello World!");
});
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
