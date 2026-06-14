const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

dotenv.config();

const app = express();
const port = 5000;

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
}));

app.use(express.json());

const uri = process.env.DB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let roomsCollection;

async function run() {
  try {
    await client.connect();

    const db = client.db(process.env.AUTH_DB_NAME || "studyNook");

    roomsCollection = db.collection("rooms");

    console.log("MongoDB Connected Successfully");

  } catch (err) {
    console.log("DB Error:", err);
  }
}

run().catch(console.dir);


app.get("/", (req, res) => {
  res.send("StudyNook API Running fine");
});



app.post("/api/rooms", async (req, res) => {
  const room = req.body;

  room.createdAt = new Date();
  room.bookingCount = 0;

  const result = await roomsCollection.insertOne(room);

  res.send(result);
});


app.get("/api/rooms", async (req, res) => {
  const { search } = req.query;

  let query = {};

  if (search) {
    query.title = {
      $regex: search,
      $options: "i",
    };
  }

  const result = await roomsCollection
    .find(query)
    .sort({ createdAt: -1 })
    .toArray();

  res.send(result);
});


app.get("/api/rooms/:id", async (req, res) => {
  const id = req.params.id;

  const result = await roomsCollection.findOne({
    _id: new ObjectId(id),
  });

  res.send(result);
});

app.patch("/api/rooms/:id", async (req, res) => {
  const id = req.params.id;

  const updatedData = req.body;

  const result = await roomsCollection.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: updatedData,
    }
  );

  res.send(result);
});

app.delete("/api/rooms/:id", async (req, res) => {
  const id = req.params.id;

  const result = await roomsCollection.deleteOne({
    _id: new ObjectId(id),
  });

  res.send(result);
});



app.get("/api/my-listings/:email", async (req, res) => {
  const email = req.params.email;

  const result = await roomsCollection
    .find({ ownerEmail: email })
    .toArray();

  res.send(result);
});




app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});