const dns = require("dns")
dns.setServers(['8.8.8.8', '8.8.4.4'])
const express = require('express');
const app = express()
const port = 5000

const dotenv = require("dotenv")
dotenv.config()

app.use(express.json())


const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = process.env.DB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {

  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const db = client.db(process.env.AUTH_DB_NAME)

    roomsCollection = db.collection("rooms")

    console.log("Pinged your deployment. You successfully connected to MongoDB!");

  } finally {
    // await client.close();
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("StudyNook API Running Fine");
});


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})